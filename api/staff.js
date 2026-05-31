const { getDb, setCors, dbError } = require('./_db.js');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  let sql;
  try { sql = getDb(); } catch (err) { return res.status(500).json({ error: err.message }); }

  const { id, store_id, me } = req.query;

  try {
    if (req.method === 'PUT' && me) {
      const { id: uid, name, phone, email, current_pin, new_pin } = req.body || {};
      if (!uid) return res.status(400).json({ error: 'id required' });
      if (new_pin) {
        if (!current_pin) return res.status(400).json({ error: 'Current PIN required' });
        const check = await sql`SELECT pin_hash FROM staff WHERE id = ${uid}`;
        if (!check.length || check[0].pin_hash !== current_pin) return res.status(401).json({ error: 'Current PIN is incorrect' });
      }
      const rows = new_pin
        ? await sql`UPDATE staff SET name=COALESCE(${name??null},name), phone=COALESCE(${phone??null},phone), email=COALESCE(${email??null},email), pin_hash=${new_pin} WHERE id=${uid} RETURNING id,name,email,phone,role,location_id,active`
        : await sql`UPDATE staff SET name=COALESCE(${name??null},name), phone=COALESCE(${phone??null},phone), email=COALESCE(${email??null},email) WHERE id=${uid} RETURNING id,name,email,phone,role,location_id,active`;
      if (!rows.length) return res.status(404).json({ error: 'Account not found' });
      return res.status(200).json(rows[0]);
    }

    if (req.query.resource === 'payment_methods') {
      if (req.method === 'GET') {
        if (!store_id) return res.status(400).json({ error: 'store_id required' });
        const rows = await sql`SELECT * FROM payment_methods WHERE store_id=${store_id} AND active=true ORDER BY sort_order ASC, name ASC`;
        return res.status(200).json(rows);
      }
      if (req.method === 'POST') {
        const { name, store_id: sid } = req.body || {};
        if (!name || !sid) return res.status(400).json({ error: 'name and store_id required' });
        const rows = await sql`
          INSERT INTO payment_methods (store_id, name, sort_order)
          VALUES (${sid}, ${name}, (SELECT COALESCE(MAX(sort_order),0)+1 FROM payment_methods WHERE store_id=${sid}))
          RETURNING *
        `;
        return res.status(201).json(rows[0]);
      }
      if (req.method === 'PUT') {
        const { pmId, active: act, name } = req.body || {};
        if (!pmId) return res.status(400).json({ error: 'pmId required' });
        const rows = await sql`UPDATE payment_methods SET active=COALESCE(${act??null},active), name=COALESCE(${name??null},name) WHERE id=${pmId} RETURNING *`;
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        return res.status(200).json(rows[0]);
      }
      if (req.method === 'DELETE') {
        const { pmId } = req.body || {};
        if (!pmId) return res.status(400).json({ error: 'pmId required' });
        await sql`DELETE FROM payment_methods WHERE id=${pmId}`;
        return res.status(200).json({ success: true });
      }
    }

    if (req.method === 'GET') {
      if (!store_id) return res.status(400).json({ error: 'store_id required' });
      const rows = await sql`SELECT id,name,email,phone,role,location_id,active,created_at FROM staff WHERE store_id=${store_id} ORDER BY created_at ASC`;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { name, email, phone, role, location_id, pin, store_id: sid } = req.body || {};
      if (!name || !email || !pin || !sid) return res.status(400).json({ error: 'name, email, pin, store_id required' });
      const rows = await sql`
        INSERT INTO staff (store_id, name, email, phone, role, location_id, pin_hash)
        VALUES (${sid}, ${name}, ${email}, ${phone||null}, ${role||'Receptionist'}, ${location_id||null}, ${pin})
        RETURNING id,name,email,phone,role,location_id,active,created_at
      `;
      return res.status(201).json(rows[0]);
    }

    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'id required' });
      const { name, phone, role, location_id, pin, active } = req.body || {};
      const rows = pin
        ? await sql`UPDATE staff SET name=COALESCE(${name??null},name), phone=COALESCE(${phone??null},phone), role=COALESCE(${role??null},role), location_id=COALESCE(${location_id??null},location_id), pin_hash=${pin}, active=COALESCE(${active??null},active) WHERE id=${id} RETURNING id,name,email,phone,role,location_id,active`
        : await sql`UPDATE staff SET name=COALESCE(${name??null},name), phone=COALESCE(${phone??null},phone), role=COALESCE(${role??null},role), location_id=COALESCE(${location_id??null},location_id), active=COALESCE(${active??null},active) WHERE id=${id} RETURNING id,name,email,phone,role,location_id,active`;
      if (!rows.length) return res.status(404).json({ error: 'Staff not found' });
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'id required' });
      await sql`DELETE FROM staff WHERE id=${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: dbError(err) });
  }
};
