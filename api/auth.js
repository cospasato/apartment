const { getDb, setCors, dbError } = require('./_db.js');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { email, pin } = req.body || {};
    if (!email || !pin) return res.status(400).json({ error: 'Email and PIN required' });
    const sql = getDb();
    const rows = await sql`
      SELECT id, name, email, role, location_id, active
      FROM staff
      WHERE lower(email) = lower(${email}) AND pin_hash = ${pin} AND active = true
      LIMIT 1
    `;
    if (!rows.length) return res.status(401).json({ error: 'Invalid email or PIN' });
    const u = rows[0];
    return res.status(200).json({ id: u.id, name: u.name, email: u.email, role: u.role, locId: u.location_id });
  } catch (err) {
    return res.status(500).json({ error: dbError(err) });
  }
};
