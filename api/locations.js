const { getDb, setCors, dbError } = require('./_db.js');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  let sql;
  try { sql = getDb(); } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const { id } = req.query;

  try {
    // GET /api/locations — list all
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT l.*,
          COUNT(DISTINCT r.id)::int AS room_count,
          COUNT(DISTINCT b.id)::int AS booking_count
        FROM locations l
        LEFT JOIN rooms r ON r.location_id = l.id
        LEFT JOIN bookings b ON b.location_id = l.id
        WHERE l.active = true
        GROUP BY l.id
        ORDER BY l.created_at ASC
      `;
      return res.status(200).json(rows);
    }

    // POST /api/locations — create
    if (req.method === 'POST') {
      const { name, city, address, icon, description } = req.body || {};
      if (!name || !city) return res.status(400).json({ error: 'name and city are required' });
      const rows = await sql`
        INSERT INTO locations (name, city, address, icon, description)
        VALUES (${name}, ${city}, ${address || ''}, ${icon || '🏙️'}, ${description || ''})
        RETURNING *
      `;
      return res.status(201).json(rows[0]);
    }

    // PUT /api/locations?id=X — update
    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'id required' });
      const { name, city, address, icon, description, active } = req.body || {};
      const rows = await sql`
        UPDATE locations SET
          name        = COALESCE(${name        ?? null}, name),
          city        = COALESCE(${city        ?? null}, city),
          address     = COALESCE(${address     ?? null}, address),
          icon        = COALESCE(${icon        ?? null}, icon),
          description = COALESCE(${description ?? null}, description),
          active      = COALESCE(${active      ?? null}, active)
        WHERE id = ${id}
        RETURNING *
      `;
      if (!rows.length) return res.status(404).json({ error: `Location '${id}' not found` });
      return res.status(200).json(rows[0]);
    }

    // DELETE /api/locations?id=X — soft delete
    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'id required' });
      const active = await sql`
        SELECT COUNT(*)::int AS n FROM bookings
        WHERE location_id = ${id} AND status = 'checkedIn'
      `;
      if (active[0].n > 0)
        return res.status(400).json({ error: 'Cannot delete: location has guests currently checked in.' });
      const rows = await sql`
        UPDATE locations SET active = false WHERE id = ${id} RETURNING id, name
      `;
      if (!rows.length) return res.status(404).json({ error: `Location '${id}' not found` });
      return res.status(200).json({ success: true, deleted: rows[0] });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('locations error:', err.message);
    return res.status(500).json({ error: dbError(err) });
  }
};
