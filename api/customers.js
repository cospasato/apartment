const { getDb, setCors, dbError } = require('./_db.js');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  let sql;
  try { sql = getDb(); } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const { action, customer_id } = req.query;

  try {
    // POST /api/customers?action=register
    if (req.method === 'POST' && action === 'register') {
      const { name, email, phone, nationality, password } = req.body || {};
      if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password required' });
      if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

      const existing = await sql`SELECT id FROM customers WHERE lower(email) = lower(${email})`;
      if (existing.length) return res.status(400).json({ error: 'An account with this email already exists' });

      const rows = await sql`
        INSERT INTO customers (name, email, phone, nationality, password_hash)
        VALUES (${name}, ${email}, ${phone || null}, ${nationality || null}, ${password})
        RETURNING id, name, email, phone, nationality, created_at
      `;
      return res.status(201).json(rows[0]);
    }

    // POST /api/customers?action=login
    if (req.method === 'POST' && action === 'login') {
      const { email, password } = req.body || {};
      if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

      const rows = await sql`
        SELECT id, name, email, phone, nationality, created_at
        FROM customers
        WHERE lower(email) = lower(${email}) AND password_hash = ${password}
        LIMIT 1
      `;
      if (!rows.length) return res.status(401).json({ error: 'Incorrect email or password' });
      return res.status(200).json(rows[0]);
    }

    // GET /api/customers?customer_id=X — get customer's bookings with room + location info
    if (req.method === 'GET' && customer_id) {
      const bookings = await sql`
        SELECT
          b.*,
          r.name  AS room_name,
          r.type  AS room_type,
          r.price_per_night,
          r.photos AS room_photos,
          l.name  AS location_name,
          l.city  AS location_city,
          l.icon  AS location_icon
        FROM bookings b
        LEFT JOIN rooms r ON r.id = b.room_id
        LEFT JOIN locations l ON l.id = b.location_id
        WHERE b.customer_id = ${customer_id}
        ORDER BY b.created_at DESC
      `;
      return res.status(200).json(bookings);
    }

    // PUT /api/customers?customer_id=X — update profile or password
    if (req.method === 'PUT' && customer_id) {
      const { name, phone, nationality, current_password, new_password } = req.body || {};

      if (new_password) {
        if (!current_password) return res.status(400).json({ error: 'Current password required' });
        if (new_password.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
        const check = await sql`SELECT password_hash FROM customers WHERE id = ${customer_id}`;
        if (!check.length) return res.status(404).json({ error: 'Account not found' });
        if (check[0].password_hash !== current_password) return res.status(401).json({ error: 'Current password is incorrect' });

        const rows = await sql`
          UPDATE customers SET
            name        = COALESCE(${name        ?? null}, name),
            phone       = COALESCE(${phone       ?? null}, phone),
            nationality = COALESCE(${nationality ?? null}, nationality),
            password_hash = ${new_password}
          WHERE id = ${customer_id}
          RETURNING id, name, email, phone, nationality
        `;
        return res.status(200).json(rows[0]);
      }

      const rows = await sql`
        UPDATE customers SET
          name        = COALESCE(${name        ?? null}, name),
          phone       = COALESCE(${phone       ?? null}, phone),
          nationality = COALESCE(${nationality ?? null}, nationality)
        WHERE id = ${customer_id}
        RETURNING id, name, email, phone, nationality
      `;
      if (!rows.length) return res.status(404).json({ error: 'Account not found' });
      return res.status(200).json(rows[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('customers error:', err.message);
    return res.status(500).json({ error: dbError(err) });
  }
};
