// api/subscriptions.js — subscription plans + billing management
const { getDb, setCors, dbError, verifyToken } = require('../lib/_db.js');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  let sql;
  try { sql = getDb(); } catch (err) { return res.status(500).json({ error: err.message }); }

  const { id, store_id, action } = req.query;

  try {
    // ── PUBLIC: Get all active plans ──
    if (req.method === 'GET' && action === 'plans') {
      const rows = await sql`SELECT * FROM subscription_plans WHERE is_active = true ORDER BY sort_order ASC`;
      return res.status(200).json(rows);
    }

    // ── SUPER ADMIN: Manage plans ──
    if (req.method === 'POST' && action === 'plans') {
      const token = verifyToken(req);
      if (!token || token.type !== 'super') return res.status(401).json({ error: 'Super admin required' });
      const { name, price_monthly, price_yearly, max_locations, max_rooms, max_staff, features } = req.body || {};
      if (!name) return res.status(400).json({ error: 'name required' });
      const rows = await sql`
        INSERT INTO subscription_plans (name, price_monthly, price_yearly, max_locations, max_rooms, max_staff, features)
        VALUES (${name}, ${price_monthly || 0}, ${price_yearly || 0}, ${max_locations || 1},
                ${max_rooms || 10}, ${max_staff || 2}, ${features || []})
        RETURNING *
      `;
      return res.status(201).json(rows[0]);
    }

    if (req.method === 'PUT' && action === 'plans') {
      const token = verifyToken(req);
      if (!token || token.type !== 'super') return res.status(401).json({ error: 'Super admin required' });
      if (!id) return res.status(400).json({ error: 'id required' });
      const { name, price_monthly, price_yearly, max_locations, max_rooms, max_staff, features, is_active } = req.body || {};
      const rows = await sql`
        UPDATE subscription_plans SET
          name          = COALESCE(${name          ?? null}, name),
          price_monthly = COALESCE(${price_monthly ?? null}, price_monthly),
          price_yearly  = COALESCE(${price_yearly  ?? null}, price_yearly),
          max_locations = COALESCE(${max_locations ?? null}, max_locations),
          max_rooms     = COALESCE(${max_rooms     ?? null}, max_rooms),
          max_staff     = COALESCE(${max_staff     ?? null}, max_staff),
          features      = COALESCE(${features      ?? null}, features),
          is_active     = COALESCE(${is_active     ?? null}, is_active)
        WHERE id = ${id} RETURNING *
      `;
      if (!rows.length) return res.status(404).json({ error: 'Plan not found' });
      return res.status(200).json(rows[0]);
    }

    // ── SUPER ADMIN: Record subscription payment ──
    if (req.method === 'POST' && action === 'payment') {
      const token = verifyToken(req);
      if (!token || token.type !== 'super') return res.status(401).json({ error: 'Super admin required' });
      const { store_id: sid, amount, method, reference, notes, plan_id, billing_cycle } = req.body || {};
      if (!sid || !amount) return res.status(400).json({ error: 'store_id and amount required' });

      // Upsert subscription record
      const existing = await sql`SELECT id FROM subscriptions WHERE store_id = ${sid} AND status != 'cancelled' LIMIT 1`;
      let subId;
      if (existing.length) {
        const end_date = billing_cycle === 'yearly'
          ? new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]
          : new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0];
        await sql`
          UPDATE subscriptions SET status = 'active', current_period_end = ${end_date}
          WHERE id = ${existing[0].id}
        `;
        subId = existing[0].id;
      } else {
        const end_date = billing_cycle === 'yearly'
          ? new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]
          : new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0];
        const newSub = await sql`
          INSERT INTO subscriptions (store_id, plan_id, billing_cycle, amount, status, current_period_end)
          VALUES (${sid}, ${plan_id}, ${billing_cycle || 'monthly'}, ${amount}, 'active', ${end_date})
          RETURNING id
        `;
        subId = newSub[0].id;
      }

      // Record payment
      const payment = await sql`
        INSERT INTO subscription_payments (store_id, subscription_id, amount, method, reference, notes, recorded_by)
        VALUES (${sid}, ${subId}, ${amount}, ${method || 'Manual'}, ${reference || null}, ${notes || null}, ${token.id})
        RETURNING *
      `;

      // Activate store
      if (plan_id) {
        await sql`UPDATE stores SET status = 'active', plan_id = ${plan_id} WHERE id = ${sid}`;
      } else {
        await sql`UPDATE stores SET status = 'active' WHERE id = ${sid}`;
      }

      return res.status(201).json(payment[0]);
    }

    // ── SUPER ADMIN: Get payments for a store ──
    if (req.method === 'GET' && store_id) {
      const token = verifyToken(req);
      if (!token || token.type !== 'super') return res.status(401).json({ error: 'Super admin required' });
      const payments = await sql`
        SELECT sp.*, s.name AS store_name, p.name AS plan_name
        FROM subscription_payments sp
        JOIN stores s ON s.id = sp.store_id
        LEFT JOIN subscriptions sub ON sub.id = sp.subscription_id
        LEFT JOIN subscription_plans p ON p.id = sub.plan_id
        WHERE sp.store_id = ${store_id}
        ORDER BY sp.paid_at DESC
      `;
      return res.status(200).json(payments);
    }

    // ── SUPER ADMIN: Get all payments ──
    if (req.method === 'GET') {
      const token = verifyToken(req);
      if (!token || token.type !== 'super') return res.status(401).json({ error: 'Super admin required' });
      const payments = await sql`
        SELECT sp.*, s.name AS store_name
        FROM subscription_payments sp
        JOIN stores s ON s.id = sp.store_id
        ORDER BY sp.paid_at DESC LIMIT 200
      `;
      return res.status(200).json(payments);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('subscriptions error:', err.message);
    return res.status(500).json({ error: dbError(err) });
  }
};
