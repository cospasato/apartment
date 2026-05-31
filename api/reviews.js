const { getDb, setCors, dbError } = require('./_db.js');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  let sql;
  try { sql = getDb(); } catch (err) { return res.status(500).json({ error: err.message }); }
  const { store_id, room_id } = req.query;

  try {
    if (req.method === 'GET') {
      let rows;
      if (room_id)
        rows = await sql`SELECT r.*, c.name AS customer_name FROM reviews r JOIN customers c ON c.id=r.customer_id WHERE r.room_id=${room_id} ORDER BY r.created_at DESC`;
      else if (store_id)
        rows = await sql`SELECT r.*, c.name AS customer_name, rm.name AS room_name FROM reviews r JOIN customers c ON c.id=r.customer_id LEFT JOIN rooms rm ON rm.id=r.room_id WHERE r.store_id=${store_id} ORDER BY r.created_at DESC`;
      else
        rows = [];
      return res.status(200).json(rows);
    }
    if (req.method === 'POST') {
      const { store_id: sid, room_id: rid, booking_id, customer_id, rating, comment } = req.body || {};
      if (!sid || !customer_id || !rating) return res.status(400).json({ error: 'store_id, customer_id, rating required' });
      const rows = await sql`
        INSERT INTO reviews (store_id, room_id, booking_id, customer_id, rating, comment)
        VALUES (${sid}, ${rid||null}, ${booking_id||null}, ${customer_id}, ${rating}, ${comment||null})
        RETURNING *
      `;
      return res.status(201).json(rows[0]);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: dbError(err) });
  }
};
