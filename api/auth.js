// api/auth.js — all authentication + customer/guest accounts
// POST /api/auth?type=super        — super admin login
// POST /api/auth?type=owner        — store owner login
// POST /api/auth?type=staff        — staff PIN login
// POST /api/auth?type=guest&action=register  — guest register
// POST /api/auth?type=guest&action=login     — guest login
// GET  /api/auth?type=guest&customer_id=X   — guest bookings
// PUT  /api/auth?type=guest&customer_id=X   — guest profile update
const { getDb, setCors, dbError, makeToken } = require('./_db.js');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { type } = req.query;
  let sql;
  try { sql = getDb(); } catch (err) { return res.status(500).json({ error: err.message }); }

  try {
    // ── SUPER ADMIN LOGIN ──────────────────────────────────
    if (type === 'super' && req.method === 'POST') {
      const { email, password } = req.body || {};
      if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
      const rows = await sql`
        SELECT id, name, email FROM super_admins
        WHERE lower(email) = lower(${email}) AND password_hash = ${password} AND active = true
        LIMIT 1
      `;
      if (!rows.length) return res.status(401).json({ error: 'Invalid email or password' });
      const u = rows[0];
      return res.status(200).json({
        id: u.id, name: u.name, email: u.email,
        role: 'super_admin', token: makeToken('super', u.id)
      });
    }

    // ── STORE OWNER LOGIN ──────────────────────────────────
    if (type === 'owner' && req.method === 'POST') {
      const { email, password } = req.body || {};
      if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
      const rows = await sql`
        SELECT o.id, o.name, o.email, o.phone,
               s.id AS store_id, s.name AS store_name, s.slug, s.status AS store_status, s.plan_id,
               p.name AS plan_name
        FROM store_owners o
        JOIN stores s ON s.owner_id = o.id
        LEFT JOIN subscription_plans p ON p.id = s.plan_id
        WHERE lower(o.email) = lower(${email}) AND o.password_hash = ${password} AND o.active = true
        LIMIT 1
      `;
      if (!rows.length) return res.status(401).json({ error: 'Invalid email or password' });
      const u = rows[0];
      return res.status(200).json({
        id: u.id, name: u.name, email: u.email, phone: u.phone,
        role: 'store_owner',
        store: { id: u.store_id, name: u.store_name, slug: u.slug, status: u.store_status, planName: u.plan_name },
        token: makeToken('owner', u.id, u.store_id)
      });
    }

    // ── STAFF LOGIN ────────────────────────────────────────
    if (type === 'staff' && req.method === 'POST') {
      const { email, pin, store_id } = req.body || {};
      if (!email || !pin || !store_id) return res.status(400).json({ error: 'Email, PIN and store_id required' });
      const rows = await sql`
        SELECT id, name, email, role, location_id, store_id
        FROM staff
        WHERE lower(email) = lower(${email}) AND pin_hash = ${pin}
          AND store_id = ${store_id} AND active = true
        LIMIT 1
      `;
      if (!rows.length) return res.status(401).json({ error: 'Invalid email or PIN' });
      const u = rows[0];
      return res.status(200).json({
        id: u.id, name: u.name, email: u.email,
        role: u.role, locId: u.location_id, storeId: u.store_id,
        token: makeToken('staff', u.id, u.store_id)
      });
    }

    // ── GUEST / CUSTOMER ───────────────────────────────────
    if (type === 'guest') {
      const { action, customer_id } = req.query;

      // Register
      if (req.method === 'POST' && action === 'register') {
        const { name, email, phone, nationality, password } = req.body || {};
        if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password required' });
        if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
        const existing = await sql`SELECT id FROM customers WHERE lower(email)=lower(${email})`;
        if (existing.length) return res.status(400).json({ error: 'Email already registered' });
        const rows = await sql`
          INSERT INTO customers (name, email, phone, nationality, password_hash)
          VALUES (${name}, ${email}, ${phone||null}, ${nationality||null}, ${password})
          RETURNING id, name, email, phone, nationality, created_at
        `;
        return res.status(201).json(rows[0]);
      }

      // Login
      if (req.method === 'POST' && action === 'login') {
        const { email, password } = req.body || {};
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
        const rows = await sql`
          SELECT id, name, email, phone, nationality, created_at FROM customers
          WHERE lower(email)=lower(${email}) AND password_hash=${password} LIMIT 1
        `;
        if (!rows.length) return res.status(401).json({ error: 'Incorrect email or password' });
        return res.status(200).json(rows[0]);
      }

      // Get bookings
      if (req.method === 'GET' && customer_id) {
        const bookings = await sql`
          SELECT b.*, r.name AS room_name, r.type AS room_type, r.price_per_night,
                 l.name AS location_name, l.city AS location_city, l.icon AS location_icon,
                 s.name AS store_name, s.slug AS store_slug
          FROM bookings b
          LEFT JOIN rooms r ON r.id = b.room_id
          LEFT JOIN locations l ON l.id = b.location_id
          LEFT JOIN stores s ON s.id = b.store_id
          WHERE b.customer_id = ${customer_id}
          ORDER BY b.created_at DESC
        `;
        return res.status(200).json(bookings);
      }

      // Update profile
      if (req.method === 'PUT' && customer_id) {
        const { name, phone, nationality, current_password, new_password } = req.body || {};
        if (new_password) {
          if (!current_password) return res.status(400).json({ error: 'Current password required' });
          const check = await sql`SELECT password_hash FROM customers WHERE id=${customer_id}`;
          if (!check.length || check[0].password_hash !== current_password)
            return res.status(401).json({ error: 'Current password is incorrect' });
          const rows = await sql`UPDATE customers SET name=COALESCE(${name??null},name), phone=COALESCE(${phone??null},phone), nationality=COALESCE(${nationality??null},nationality), password_hash=${new_password} WHERE id=${customer_id} RETURNING id,name,email,phone,nationality`;
          return res.status(200).json(rows[0]);
        }
        const rows = await sql`UPDATE customers SET name=COALESCE(${name??null},name), phone=COALESCE(${phone??null},phone), nationality=COALESCE(${nationality??null},nationality) WHERE id=${customer_id} RETURNING id,name,email,phone,nationality`;
        if (!rows.length) return res.status(404).json({ error: 'Account not found' });
        return res.status(200).json(rows[0]);
      }
    }

    // ── OWNER PASSWORD CHANGE ──────────────────────────────────
    if (type === 'owner_password' && req.method === 'POST') {
      const { owner_id, current_password, new_password } = req.body || {};
      if (!owner_id || !current_password || !new_password)
        return res.status(400).json({ error: 'owner_id, current_password, new_password required' });
      if (new_password.length < 6)
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      const check = await sql`SELECT password_hash FROM store_owners WHERE id = ${owner_id}`;
      if (!check.length || check[0].password_hash !== current_password)
        return res.status(401).json({ error: 'Current password is incorrect' });
      await sql`UPDATE store_owners SET password_hash = ${new_password} WHERE id = ${owner_id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Invalid request. type must be: super | owner | staff | guest | owner_password' });
  } catch (err) {
    return res.status(500).json({ error: dbError(err) });
  }
};
