const { getDb, setCors, dbErr } = require('./_db.js');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  let sql;
  try { sql = getDb(); } catch (e) { return res.status(500).json({ error: e.message }); }

  const { action, tenant_id } = req.query;

  try {
    // POST /api/tenants?action=register
    if (req.method === 'POST' && action === 'register') {
      const { business_name, slug, email, phone, country, city, owner_name, password, plan_id } = req.body || {};
      if (!business_name || !email || !password || !owner_name)
        return res.status(400).json({ error: 'business_name, owner_name, email and password required' });
      if (password.length < 6)
        return res.status(400).json({ error: 'Password must be at least 6 characters' });

      const cleanSlug = (slug || business_name).toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30);

      // Check uniqueness
      const exists = await sql`SELECT id FROM tenants WHERE lower(email)=lower(${email}) OR slug=${cleanSlug}`;
      if (exists.length) return res.status(400).json({ error: 'Email or business slug already taken' });

      const rows = await sql`
        INSERT INTO tenants (business_name, slug, email, phone, country, city, owner_name, password_hash, plan_id)
        VALUES (${business_name}, ${cleanSlug}, ${email}, ${phone||null}, ${country||'Tanzania'}, ${city||null}, ${owner_name}, ${password}, ${plan_id||'free'})
        RETURNING id, business_name, slug, email, owner_name, plan_id, status, created_at, trial_ends_at
      `;
      const tenant = rows[0];

      // Create subscription record for paid plans
      if (plan_id && plan_id !== 'free') {
        const plan = await sql`SELECT * FROM plans WHERE id = ${plan_id}`;
        if (plan.length) {
          const p = plan[0];
          const cycle = req.body.cycle || 'monthly';
          const amount = cycle === 'yearly' ? p.price_yearly : p.price_monthly;
          const expires = new Date();
          expires.setMonth(expires.getMonth() + (cycle === 'yearly' ? 12 : 1));
          await sql`
            INSERT INTO subscriptions (tenant_id, plan_id, cycle, amount, expires_at, payment_method)
            VALUES (${tenant.id}, ${plan_id}, ${cycle}, ${amount}, ${expires.toISOString()}, ${req.body.payment_method||'Mobile Money'})
          `;
        }
      }

      // Create default admin staff account for the tenant
      await sql`
        INSERT INTO staff (tenant_id, name, email, phone, role, pin_hash)
        VALUES (${tenant.id}, ${owner_name}, ${email}, ${phone||null}, 'Admin', ${password})
      `;

      return res.status(201).json(tenant);
    }

    // POST /api/tenants?action=login
    if (req.method === 'POST' && action === 'login') {
      const { email, password } = req.body || {};
      if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

      const rows = await sql`
        SELECT t.*, p.name AS plan_name, p.max_locations, p.max_rooms, p.max_staff, p.features
        FROM tenants t
        JOIN plans p ON p.id = t.plan_id
        WHERE lower(t.email) = lower(${email}) AND t.password_hash = ${password}
        LIMIT 1
      `;
      if (!rows.length) return res.status(401).json({ error: 'Incorrect email or password' });
      const t = rows[0];
      if (t.status === 'suspended') return res.status(403).json({ error: 'Account suspended. Contact support.' });

      // Get active subscription
      const sub = await sql`
        SELECT * FROM subscriptions WHERE tenant_id = ${t.id} AND status = 'active' ORDER BY expires_at DESC LIMIT 1
      `;

      return res.status(200).json({ ...t, subscription: sub[0] || null });
    }

    // GET /api/tenants?tenant_id=X — profile + usage
    if (req.method === 'GET' && tenant_id) {
      const rows = await sql`
        SELECT t.*, p.name AS plan_name, p.max_locations, p.max_rooms, p.max_staff, p.features
        FROM tenants t JOIN plans p ON p.id = t.plan_id
        WHERE t.id = ${tenant_id}
      `;
      if (!rows.length) return res.status(404).json({ error: 'Tenant not found' });
      const t = rows[0];

      const [locCount, roomCount, staffCount, bookCount, sub] = await Promise.all([
        sql`SELECT COUNT(*)::int AS n FROM locations WHERE tenant_id = ${tenant_id} AND active = true`,
        sql`SELECT COUNT(*)::int AS n FROM rooms WHERE tenant_id = ${tenant_id}`,
        sql`SELECT COUNT(*)::int AS n FROM staff WHERE tenant_id = ${tenant_id} AND active = true`,
        sql`SELECT COUNT(*)::int AS n FROM bookings WHERE tenant_id = ${tenant_id}`,
        sql`SELECT * FROM subscriptions WHERE tenant_id = ${tenant_id} AND status = 'active' ORDER BY expires_at DESC LIMIT 1`,
      ]);

      return res.status(200).json({
        ...t, subscription: sub[0] || null,
        usage: { locations: locCount[0].n, rooms: roomCount[0].n, staff: staffCount[0].n, bookings: bookCount[0].n },
      });
    }

    // PUT /api/tenants?tenant_id=X — update profile or password
    if (req.method === 'PUT' && tenant_id) {
      const { business_name, phone, city, country, current_password, new_password } = req.body || {};
      if (new_password) {
        const check = await sql`SELECT password_hash FROM tenants WHERE id = ${tenant_id}`;
        if (!check.length) return res.status(404).json({ error: 'Not found' });
        if (check[0].password_hash !== current_password) return res.status(401).json({ error: 'Current password incorrect' });
        await sql`UPDATE tenants SET password_hash = ${new_password} WHERE id = ${tenant_id}`;
      }
      const rows = await sql`
        UPDATE tenants SET
          business_name = COALESCE(${business_name ?? null}, business_name),
          phone         = COALESCE(${phone         ?? null}, phone),
          city          = COALESCE(${city          ?? null}, city),
          country       = COALESCE(${country       ?? null}, country)
        WHERE id = ${tenant_id} RETURNING id, business_name, slug, email, owner_name, plan_id, status
      `;
      return res.status(200).json(rows[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('tenants error:', err.message);
    return res.status(500).json({ error: dbErr(err) });
  }
};
