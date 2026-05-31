const { getDb, setCors, dbErr } = require('./_db.js');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  let sql;
  try { sql = getDb(); } catch (e) { return res.status(500).json({ error: e.message }); }

  const { action, tenant_id } = req.query;

  try {
    // POST /api/super?action=login
    if (req.method === 'POST' && action === 'login') {
      const { email, password } = req.body || {};
      const rows = await sql`
        SELECT id, name, email FROM super_admins
        WHERE lower(email) = lower(${email}) AND password_hash = ${password}
        LIMIT 1
      `;
      if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
      return res.status(200).json({ ...rows[0], role: 'super' });
    }

    // GET /api/super?action=stats — platform overview
    if (req.method === 'GET' && action === 'stats') {
      const [tenants, plans, subs, revenue] = await Promise.all([
        sql`SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER(WHERE status='active')::int AS active,
              COUNT(*) FILTER(WHERE status='suspended')::int AS suspended,
              COUNT(*) FILTER(WHERE created_at > NOW() - INTERVAL '30 days')::int AS new_this_month
            FROM tenants`,
        sql`SELECT p.id, p.name, COUNT(t.id)::int AS tenant_count
            FROM plans p LEFT JOIN tenants t ON t.plan_id = p.id
            GROUP BY p.id, p.name ORDER BY p.price_monthly ASC`,
        sql`SELECT COUNT(*) FILTER(WHERE status='active')::int AS active,
              COUNT(*) FILTER(WHERE status='expired')::int AS expired
            FROM subscriptions`,
        sql`SELECT COALESCE(SUM(amount),0) AS total_revenue,
              COALESCE(SUM(amount) FILTER(WHERE created_at > NOW() - INTERVAL '30 days'), 0) AS monthly_revenue
            FROM subscriptions WHERE status = 'active'`,
      ]);
      return res.status(200).json({
        tenants: tenants[0], plans, subscriptions: subs[0], revenue: revenue[0],
      });
    }

    // GET /api/super?action=tenants — all tenants list
    if (req.method === 'GET' && action === 'tenants') {
      const rows = await sql`
        SELECT t.*,
          p.name AS plan_name, p.price_monthly,
          (SELECT COUNT(*)::int FROM locations WHERE tenant_id = t.id) AS location_count,
          (SELECT COUNT(*)::int FROM rooms WHERE tenant_id = t.id) AS room_count,
          (SELECT COUNT(*)::int FROM bookings WHERE tenant_id = t.id) AS booking_count,
          (SELECT COUNT(*)::int FROM staff WHERE tenant_id = t.id) AS staff_count,
          (SELECT expires_at FROM subscriptions WHERE tenant_id = t.id AND status='active' ORDER BY expires_at DESC LIMIT 1) AS sub_expires
        FROM tenants t
        JOIN plans p ON p.id = t.plan_id
        ORDER BY t.created_at DESC
      `;
      return res.status(200).json(rows);
    }

    // PUT /api/super?tenant_id=X — update tenant (suspend, change plan, etc.)
    if (req.method === 'PUT' && tenant_id) {
      const { status, plan_id, notes } = req.body || {};
      const rows = await sql`
        UPDATE tenants SET
          status  = COALESCE(${status  ?? null}, status),
          plan_id = COALESCE(${plan_id ?? null}, plan_id)
        WHERE id = ${tenant_id}
        RETURNING id, business_name, email, status, plan_id
      `;
      if (!rows.length) return res.status(404).json({ error: 'Tenant not found' });
      return res.status(200).json(rows[0]);
    }

    // DELETE /api/super?tenant_id=X — delete tenant and all data
    if (req.method === 'DELETE' && tenant_id) {
      // Cascading deletes handle all child records
      const check = await sql`SELECT business_name FROM tenants WHERE id = ${tenant_id}`;
      if (!check.length) return res.status(404).json({ error: 'Tenant not found' });
      await sql`DELETE FROM tenants WHERE id = ${tenant_id}`;
      return res.status(200).json({ success: true, deleted: check[0].business_name });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('super error:', err.message);
    return res.status(500).json({ error: dbErr(err) });
  }
};
