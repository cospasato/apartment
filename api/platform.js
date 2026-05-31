// api/platform.js — platform settings + super admin profile
const { getDb, setCors, dbError, verifyToken } = require('./_db.js');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  let sql;
  try { sql = getDb(); } catch (err) { return res.status(500).json({ error: err.message }); }

  try {
    if (req.method === 'GET') {
      const token = verifyToken(req);
      if (!token || token.type !== 'super') return res.status(401).json({ error: 'Super admin required' });
      const rows = await sql`SELECT key, value FROM platform_settings ORDER BY key`;
      const settings = {};
      rows.forEach(r => { settings[r.key] = r.value; });
      return res.status(200).json(settings);
    }

    if (req.method === 'PUT') {
      const token = verifyToken(req);
      if (!token || token.type !== 'super') return res.status(401).json({ error: 'Super admin required' });
      const updates = req.body || {};
      for (const [key, value] of Object.entries(updates)) {
        await sql`
          INSERT INTO platform_settings (key, value, updated_at) VALUES (${key}, ${String(value)}, NOW())
          ON CONFLICT (key) DO UPDATE SET value = ${String(value)}, updated_at = NOW()
        `;
      }
      return res.status(200).json({ success: true });
    }

    // Change super admin password
    if (req.method === 'POST') {
      const token = verifyToken(req);
      if (!token || token.type !== 'super') return res.status(401).json({ error: 'Super admin required' });
      const { current_password, new_password } = req.body || {};
      if (!current_password || !new_password) return res.status(400).json({ error: 'current_password and new_password required' });
      if (new_password.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
      const check = await sql`SELECT password_hash FROM super_admins WHERE id = ${token.id}`;
      if (!check.length || check[0].password_hash !== current_password)
        return res.status(401).json({ error: 'Current password is incorrect' });
      await sql`UPDATE super_admins SET password_hash = ${new_password} WHERE id = ${token.id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: dbError(err) });
  }
};
