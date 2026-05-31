const { getDb, setCors, dbError } = require('./_db.js');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  let sql;
  try { sql = getDb(); } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const { location_id } = req.query;

  try {
    if (req.method === 'GET') {
      const rows = location_id
        ? await sql`SELECT * FROM expenses WHERE location_id = ${location_id} ORDER BY expense_date DESC`
        : await sql`SELECT * FROM expenses ORDER BY expense_date DESC`;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { location_id: loc, category, description, amount, expense_date, staff_id } = req.body || {};
      if (!loc || !category || !description || !amount)
        return res.status(400).json({ error: 'location_id, category, description, amount required' });
      const rows = await sql`
        INSERT INTO expenses (location_id, category, description, amount, expense_date, staff_id)
        VALUES (${loc}, ${category}, ${description}, ${amount},
                ${expense_date || new Date().toISOString().split('T')[0]}, ${staff_id || null})
        RETURNING *
      `;
      return res.status(201).json(rows[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('expenses error:', err.message);
    return res.status(500).json({ error: dbError(err) });
  }
};
