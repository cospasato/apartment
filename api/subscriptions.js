const { getDb, setCors, dbErr } = require('./_db.js');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  let sql;
  try { sql = getDb(); } catch (e) { return res.status(500).json({ error: e.message }); }

  const { tenant_id } = req.query;

  try {
    // GET /api/subscriptions?tenant_id=X — subscription history
    if (req.method === 'GET' && tenant_id) {
      const rows = await sql`
        SELECT s.*, p.name AS plan_name
        FROM subscriptions s
        JOIN plans p ON p.id = s.plan_id
        WHERE s.tenant_id = ${tenant_id}
        ORDER BY s.created_at DESC
      `;
      return res.status(200).json(rows);
    }

    // POST /api/subscriptions — subscribe or upgrade
    if (req.method === 'POST') {
      const { tenant_id: tid, plan_id, cycle, payment_ref, payment_method } = req.body || {};
      if (!tid || !plan_id) return res.status(400).json({ error: 'tenant_id and plan_id required' });

      const plan = await sql`SELECT * FROM plans WHERE id = ${plan_id} AND active = true`;
      if (!plan.length) return res.status(404).json({ error: 'Plan not found' });
      const p = plan[0];

      const billingCycle = cycle || 'monthly';
      const amount = billingCycle === 'yearly' ? p.price_yearly : p.price_monthly;
      const expires = new Date();
      expires.setMonth(expires.getMonth() + (billingCycle === 'yearly' ? 12 : 1));

      // Expire old active subscriptions
      await sql`UPDATE subscriptions SET status = 'expired' WHERE tenant_id = ${tid} AND status = 'active'`;

      // Create new subscription
      const sub = await sql`
        INSERT INTO subscriptions (tenant_id, plan_id, cycle, amount, expires_at, payment_ref, payment_method)
        VALUES (${tid}, ${plan_id}, ${billingCycle}, ${amount}, ${expires.toISOString()}, ${payment_ref||null}, ${payment_method||'Mobile Money'})
        RETURNING *
      `;

      // Update tenant's plan
      await sql`UPDATE tenants SET plan_id = ${plan_id}, status = 'active' WHERE id = ${tid}`;

      return res.status(201).json(sub[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('subscriptions error:', err.message);
    return res.status(500).json({ error: dbErr(err) });
  }
};
