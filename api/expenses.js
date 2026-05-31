const { getDb, setCors, dbError } = require('./_db.js');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  let sql;
  try { sql = getDb(); } catch (err) { return res.status(500).json({ error: err.message }); }
  const { store_id, location_id } = req.query;

  try {
    if (req.method === 'GET') {
      let rows;
      if (store_id && location_id)
        rows = await sql`SELECT * FROM expenses WHERE store_id=${store_id} AND location_id=${location_id} ORDER BY expense_date DESC`;
      else if (store_id)
        rows = await sql`SELECT * FROM expenses WHERE store_id=${store_id} ORDER BY expense_date DESC`;
      else if (location_id)
        rows = await sql`SELECT * FROM expenses WHERE location_id=${location_id} ORDER BY expense_date DESC`;
      else
        rows = await sql`SELECT * FROM expenses ORDER BY expense_date DESC`;
      return res.status(200).json(rows);
    }
    if (req.method === 'POST') {
      const { store_id: sid, location_id: loc, category, description, amount, expense_date, staff_id } = req.body || {};
      if (!loc || !category || !description || !amount) return res.status(400).json({ error: 'location_id, category, description, amount required' });
      const rows = await sql`
        INSERT INTO expenses (store_id, location_id, category, description, amount, expense_date, staff_id)
        VALUES (${sid||null}, ${loc}, ${category}, ${description}, ${amount},
                ${expense_date || new Date().toISOString().split('T')[0]}, ${staff_id||null})
        RETURNING *
      `;
      return res.status(201).json(rows[0]);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: dbError(err) });
  }
};
