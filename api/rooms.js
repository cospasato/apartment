const { getDb, setCors, dbError } = require('./_db.js');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  let sql;
  try { sql = getDb(); } catch (err) { return res.status(500).json({ error: err.message }); }

  const { id, location_id, store_id } = req.query;

  const { action } = req.query;
  try {
    // ── PUBLIC: All marketplace rooms (for landing page) ──
    if (req.method === 'GET' && action === 'marketplace_rooms') {
      // Fast query: no RANDOM() (done client-side), no heavy review aggregation
      const rows = await sql`
        SELECT r.id, r.name, r.type, r.beds, r.max_guests, r.price_per_night AS price,
               r.photos, r.amenities, r.status, r.is_featured, r.description,
               l.name AS location_name, l.city AS location_city,
               s.id AS store_id, s.name AS store_name, s.slug AS store_slug
        FROM rooms r
        JOIN locations l ON l.id = r.location_id AND l.active = true
        JOIN stores s ON s.id = r.store_id AND s.status IN ('active','trial')
        WHERE r.status != 'maintenance' AND array_length(r.photos, 1) > 0
        ORDER BY r.is_featured DESC, r.created_at DESC
      `;
      return res.status(200).json(rows);
    }

    // ── SUPER ADMIN: Toggle room featured status ──
    if (req.method === 'PUT' && action === 'toggle_featured') {
      const { verifyToken } = require('./_db.js');
      const token = verifyToken(req);
      if (!token || token.type !== 'super') return res.status(401).json({ error: 'Super admin required' });
      const { id: rid } = req.query;
      if (!rid) return res.status(400).json({ error: 'id required' });
      const rows = await sql`
        UPDATE rooms SET is_featured = NOT is_featured WHERE id = ${rid} RETURNING id, name, is_featured
      `;
      return res.status(200).json(rows[0]);
    }

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
