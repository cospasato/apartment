const { getDb, setCors, dbError } = require('./_db.js');

// PUT /api/staff?me=1  → update own profile / change PIN
async function handleMe(req, res, sql) {
  const { id, name, phone, email, current_pin, new_pin } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id required' });

  if (new_pin) {
    if (!current_pin) return res.status(400).json({ error: 'Current PIN required to set a new PIN' });
    const check = await sql`SELECT pin_hash FROM staff WHERE id = ${id}`;
    if (!check.length) return res.status(404).json({ error: 'Account not found' });
    if (check[0].pin_hash !== current_pin)
      return res.status(401).json({ error: 'Current PIN is incorrect' });
  }

  if (email) {
    const existing = await sql`SELECT id FROM staff WHERE lower(email) = lower(${email}) AND id != ${id}`;
    if (existing.length) return res.status(400).json({ error: 'That email is already in use' });
  }

  const rows = new_pin
    ? await sql`UPDATE staff SET
        name     = COALESCE(${name  ?? null}, name),
        phone    = COALESCE(${phone ?? null}, phone),
        email    = COALESCE(${email ?? null}, email),
        pin_hash = ${new_pin}
        WHERE id = ${id}
        RETURNING id, name, email, phone, role, location_id, active`
    : await sql`UPDATE staff SET
        name  = COALESCE(${name  ?? null}, name),
        phone = COALESCE(${phone ?? null}, phone),
        email = COALESCE(${email ?? null}, email)
        WHERE id = ${id}
        RETURNING id, name, email, phone, role, location_id, active`;

  if (!rows.length) return res.status(404).json({ error: 'Account not found' });
  return res.status(200).json(rows[0]);
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  let sql;
  try { sql = getDb(); } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const { id, me } = req.query;

  try {
    // PUT /api/staff?me=1 — own profile update
    if (req.method === 'PUT' && me) {
      return handleMe(req, res, sql);
    }

    // GET /api/staff — list all (admin only)
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT id, name, email, phone, role, location_id, active, created_at
        FROM staff ORDER BY created_at ASC
      `;
      return res.status(200).json(rows);
    }

    // POST /api/staff — create account
    if (req.method === 'POST') {
      const { name, email, phone, role, location_id, pin } = req.body || {};
      if (!name || !email || !pin) return res.status(400).json({ error: 'name, email, pin required' });
      const rows = await sql`
        INSERT INTO staff (name, email, phone, role, location_id, pin_hash)
        VALUES (${name}, ${email}, ${phone || null}, ${role || 'Receptionist'}, ${location_id || null}, ${pin})
        RETURNING id, name, email, phone, role, location_id, active, created_at
      `;
      return res.status(201).json(rows[0]);
    }

    // PUT /api/staff?id=X — admin update staff member
    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'id required' });
      const { name, phone, role, location_id, pin, active } = req.body || {};
      const rows = pin
        ? await sql`UPDATE staff SET
            name        = COALESCE(${name        ?? null}, name),
            phone       = COALESCE(${phone       ?? null}, phone),
            role        = COALESCE(${role        ?? null}, role),
            location_id = COALESCE(${location_id ?? null}, location_id),
            pin_hash    = ${pin},
            active      = COALESCE(${active      ?? null}, active)
            WHERE id = ${id}
            RETURNING id, name, email, phone, role, location_id, active, created_at`
        : await sql`UPDATE staff SET
            name        = COALESCE(${name        ?? null}, name),
            phone       = COALESCE(${phone       ?? null}, phone),
            role        = COALESCE(${role        ?? null}, role),
            location_id = COALESCE(${location_id ?? null}, location_id),
            active      = COALESCE(${active      ?? null}, active)
            WHERE id = ${id}
            RETURNING id, name, email, phone, role, location_id, active, created_at`;
      if (!rows.length) return res.status(404).json({ error: `Staff '${id}' not found` });
      return res.status(200).json(rows[0]);
    }

    // Payment methods (GET all, POST create, PUT toggle active)
    if (req.query.resource === 'payment_methods') {
      if (req.method === 'GET') {
        const rows = await sql`SELECT * FROM payment_methods ORDER BY sort_order ASC, name ASC`;
        return res.status(200).json(rows);
      }
      if (req.method === 'POST') {
        const { name } = req.body || {};
        if (!name) return res.status(400).json({ error: 'name required' });
        const rows = await sql`
          INSERT INTO payment_methods (name, sort_order)
          VALUES (${name}, (SELECT COALESCE(MAX(sort_order),0)+1 FROM payment_methods))
          RETURNING *
        `;
        return res.status(201).json(rows[0]);
      }
      if (req.method === 'PUT') {
        const { pmId, active, name } = req.body || {};
        if (!pmId) return res.status(400).json({ error: 'pmId required' });
        const rows = await sql`
          UPDATE payment_methods SET
            active = COALESCE(${active ?? null}, active),
            name   = COALESCE(${name   ?? null}, name)
          WHERE id = ${pmId} RETURNING *
        `;
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        return res.status(200).json(rows[0]);
      }
      if (req.method === 'DELETE') {
        const { pmId } = req.body || {};
        if (!pmId) return res.status(400).json({ error: 'pmId required' });
        await sql`DELETE FROM payment_methods WHERE id = ${pmId}`;
        return res.status(200).json({ success: true });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('staff error:', err.message);
    return res.status(500).json({ error: dbError(err) });
  }
};

// Payment methods handled via staff.js (admin only, resource=paymentmethods)
// Appended at bottom - same handler checks query param
