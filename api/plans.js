const { getDb, setCors, dbErr } = require('./_db.js');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const sql = getDb();
    const rows = await sql`SELECT * FROM plans WHERE active = true ORDER BY price_monthly ASC`;
    return res.status(200).json(rows);
  } catch (err) {
    return res.status(500).json({ error: dbErr(err) });
  }
};
