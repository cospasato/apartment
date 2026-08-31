// api/subscriptions.js — subscription plans + billing + auto-suspension
const { getDb, setCors, dbError, verifyToken } = require('./_db.js');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  let sql;
  try { sql = getDb(); } catch (err) { return res.status(500).json({ error: err.message }); }

  const { id, store_id, action } = req.query;

  try {

    // ── AUTO-SUSPEND: runs on every request to keep statuses current ──
    // Suspend stores whose trial has expired and are still on trial
    await sql`
      UPDATE stores SET status = 'suspended'
      WHERE status = 'trial'
        AND trial_ends IS NOT NULL
        AND trial_ends < CURRENT_DATE
    `;
    // Suspend stores whose subscription period has ended
    await sql`
      UPDATE stores SET status = 'suspended'
      WHERE status = 'active'
        AND id IN (
          SELECT store_id FROM subscriptions
          WHERE status = 'active'
            AND current_period_end IS NOT NULL
            AND current_period_end < CURRENT_DATE
        )
        AND plan_id != 'PLN001'
    `;
    // Mark subscriptions as expired
    await sql`
      UPDATE subscriptions SET status = 'expired'
      WHERE status = 'active'
        AND current_period_end IS NOT NULL
        AND current_period_end < CURRENT_DATE
    `;

    // ── PUBLIC: Get all active plans ──
    if (req.method === 'GET' && action === 'plans') {
      const rows = await sql`SELECT * FROM subscription_plans WHERE is_active = true ORDER BY price_monthly ASC`;
      return res.status(200).json(rows);
    }

    // ── SUPER ADMIN: Create plan ──
    if (req.method === 'POST' && action === 'plans') {
      const token = verifyToken(req);
      if (!token || token.type !== 'super') return res.status(401).json({ error: 'Super admin required' });
      const { name, price_monthly, price_yearly, max_locations, max_rooms, max_staff, features } = req.body || {};
      if (!name) return res.status(400).json({ error: 'name required' });
      const rows = await sql`
        INSERT INTO subscription_plans (name, price_monthly, price_yearly, max_locations, max_rooms, max_staff, features)
        VALUES (${name}, ${price_monthly||0}, ${price_yearly||0}, ${max_locations||1},
                ${max_rooms||10}, ${max_staff||2}, ${features||[]})
        RETURNING *
      `;
      return res.status(201).json(rows[0]);
    }

    // ── SUPER ADMIN: Update plan ──
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

      const cycle = billing_cycle || 'monthly';
      const days  = cycle === 'yearly' ? 365 : 30;
      const end_date = new Date(Date.now() + days*24*60*60*1000).toISOString().split('T')[0];

      // Upsert subscription
      const existing = await sql`SELECT id FROM subscriptions WHERE store_id=${sid} AND status NOT IN ('cancelled','expired') LIMIT 1`;
      let subId;
      if (existing.length) {
        // Extend from today if expired, or extend from current end date
        const cur = await sql`SELECT current_period_end FROM subscriptions WHERE id=${existing[0].id}`;
        const base = cur[0]?.current_period_end && cur[0].current_period_end > new Date().toISOString().split('T')[0]
          ? new Date(cur[0].current_period_end)
          : new Date();
        const new_end = new Date(base.getTime() + days*24*60*60*1000).toISOString().split('T')[0];
        await sql`
          UPDATE subscriptions SET status='active', current_period_end=${new_end}, billing_cycle=${cycle},
            amount=${amount}${plan_id ? sql`, plan_id=${plan_id}` : sql``}
          WHERE id=${existing[0].id}
        `;
        subId = existing[0].id;
      } else {
        const newSub = await sql`
          INSERT INTO subscriptions (store_id, plan_id, billing_cycle, amount, status, current_period_end)
          VALUES (${sid}, ${plan_id||null}, ${cycle}, ${amount}, 'active', ${end_date})
          RETURNING id
        `;
        subId = newSub[0].id;
      }

      // Record payment
      const payment = await sql`
        INSERT INTO subscription_payments (store_id, subscription_id, amount, method, reference, notes, recorded_by, billing_cycle)
        VALUES (${sid}, ${subId}, ${amount}, ${method||'Manual'}, ${reference||null}, ${notes||null}, ${token.id}, ${cycle})
        RETURNING *
      `;

      // Activate store + update plan if provided
      await sql`
        UPDATE stores SET status='active'
        ${plan_id ? sql`, plan_id=${plan_id}` : sql``}
        WHERE id=${sid}
      `;

      return res.status(201).json(payment[0]);
    }

    // ── SUPER ADMIN: Get subscription status for a store ──
    if (req.method === 'GET' && action === 'status' && store_id) {
      const token = verifyToken(req);
      if (!token) return res.status(401).json({ error: 'Auth required' });
      const sub = await sql`
        SELECT sub.*, p.name AS plan_name, p.price_monthly, p.price_yearly,
               s.status AS store_status, s.trial_ends, s.name AS store_name
        FROM subscriptions sub
        JOIN stores s ON s.id = sub.store_id
        LEFT JOIN subscription_plans p ON p.id = sub.plan_id
        WHERE sub.store_id = ${store_id}
        ORDER BY sub.created_at DESC LIMIT 1
      `;
      return res.status(200).json(sub[0] || null);
    }

    // ── OWNER or SUPER: Get payments for a store ──
    if (req.method === 'GET' && store_id) {
      const token = verifyToken(req);
      if (!token) return res.status(401).json({ error: 'Auth required' });
      if (token.type !== 'super' && !(token.type === 'owner' && token.storeId === store_id))
        return res.status(403).json({ error: 'Access denied' });
      const payments = await sql`
        SELECT sp.*, s.name AS store_name, p.name AS plan_name
        FROM subscription_payments sp
        JOIN stores s ON s.id = sp.store_id
        LEFT JOIN subscriptions sub ON sub.id = sp.subscription_id
        LEFT JOIN subscription_plans p ON p.id = sub.plan_id
        WHERE sp.store_id = ${store_id}
        ORDER BY sp.paid_at DESC
      `;
      // Also return subscription info
      const sub = await sql`
        SELECT sub.*, p.name AS plan_name, p.price_monthly, p.price_yearly
        FROM subscriptions sub
        LEFT JOIN subscription_plans p ON p.id = sub.plan_id
        WHERE sub.store_id = ${store_id}
        ORDER BY sub.created_at DESC LIMIT 1
      `;
      return res.status(200).json({ payments, subscription: sub[0] || null });
    }

    // ── SUPER ADMIN: Get all payments ──
    if (req.method === 'GET') {
      const token = verifyToken(req);
      if (!token || token.type !== 'super') return res.status(401).json({ error: 'Super admin required' });
      const payments = await sql`
        SELECT sp.*, s.name AS store_name, sub.current_period_end, p.name AS plan_name
        FROM subscription_payments sp
        JOIN stores s ON s.id = sp.store_id
        LEFT JOIN subscriptions sub ON sub.id = sp.subscription_id
        LEFT JOIN subscription_plans p ON p.id = sub.plan_id
        ORDER BY sp.paid_at DESC LIMIT 200
      `;
      return res.status(200).json(payments);
    }

    // ── SUPER ADMIN: Manually suspend/activate a store ──
    if (req.method === 'PATCH' && action === 'suspend') {
      const token = verifyToken(req);
      if (!token || token.type !== 'super') return res.status(401).json({ error: 'Super admin required' });
      const { store_id: sid, status, reason } = req.body || {};
      if (!sid || !status) return res.status(400).json({ error: 'store_id and status required' });
      await sql`UPDATE stores SET status=${status}, notes=COALESCE(${reason||null},notes) WHERE id=${sid}`;
      return res.status(200).json({ ok: true, status });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('subscriptions error:', err.message);
    return res.status(500).json({ error: dbError(err) });
  }
};
