const { getDb, setCors, dbError } = require('./_db.js');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  let sql;
  try { sql = getDb(); } catch (err) { return res.status(500).json({ error: err.message }); }

  const { id, location_id, store_id } = req.query;

  try {
    if (req.method === 'GET') {
      let rows;
      if (location_id)
        rows = await sql`SELECT * FROM rooms WHERE location_id = ${location_id} ORDER BY name ASC`;
      else if (store_id)
        rows = await sql`SELECT * FROM rooms WHERE store_id = ${store_id} ORDER BY location_id, name ASC`;
      else
        rows = await sql`SELECT * FROM rooms ORDER BY store_id, location_id, name ASC`;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { location_id: loc, store_id: sid, name, type, beds, max_guests, price_per_night, status, amenities, photos, video_url } = req.body || {};
      if (!loc || !sid || !name || !price_per_night) return res.status(400).json({ error: 'location_id, store_id, name, price_per_night required' });
      const rows = await sql`
        INSERT INTO rooms (location_id, store_id, name, type, beds, max_guests, price_per_night, status, amenities, photos, video_url)
        VALUES (${loc}, ${sid}, ${name}, ${type || 'Standard'}, ${beds || 1}, ${max_guests || 2},
                ${price_per_night}, ${status || 'available'}, ${amenities || []}, ${photos || []}, ${video_url || null})
        RETURNING *
      `;
      return res.status(201).json(rows[0]);
    }

    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'id required' });
      const { name, type, beds, max_guests, price_per_night, status, amenities, photos, video_url, location_id } = req.body || {};
      const rows = await sql`
        UPDATE rooms SET
          name            = COALESCE(${name            ?? null}, name),
          type            = COALESCE(${type            ?? null}, type),
          beds            = COALESCE(${beds            ?? null}, beds),
          max_guests      = COALESCE(${max_guests      ?? null}, max_guests),
          price_per_night = COALESCE(${price_per_night ?? null}, price_per_night),
          status          = COALESCE(${status          ?? null}, status),
          amenities       = COALESCE(${amenities       ?? null}, amenities),
          photos          = COALESCE(${photos          ?? null}, photos),
          video_url       = COALESCE(${video_url       ?? null}, video_url),
          location_id     = COALESCE(${location_id     ?? null}, location_id)
        WHERE id = ${id} RETURNING *
      `;
      if (!rows.length) return res.status(404).json({ error: 'Room not found' });
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'id required' });
      const active = await sql`
        SELECT COUNT(*)::int AS n FROM bookings
        WHERE room_id = ${id} AND status IN ('pending','confirmed','checkedIn')
      `;
      if (active[0].n > 0)
        return res.status(400).json({ error: 'Cannot delete: room has active bookings.' });
      const check = await sql`SELECT name FROM rooms WHERE id = ${id}`;
      if (!check.length) return res.status(404).json({ error: 'Room not found' });
      await sql`DELETE FROM rooms WHERE id = ${id}`;
      return res.status(200).json({ success: true, name: check[0].name });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: dbError(err) });
  }
};
