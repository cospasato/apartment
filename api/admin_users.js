// api/admin_users.js — Platform admin users (BNBMIS internal team)
const { getDb, setCors, dbError, verifyToken, makeToken } = require('./_db.js');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  let sql;
  try { sql = getDb(); } catch (e) { return res.status(500).json({ error: e.message }); }

  // All routes require super admin
  const token = verifyToken(req);
  if (!token || token.type !== 'super') return res.status(401).json({ error: 'Super admin required' });

  const { id } = req.query;

  try {
    // ── GET: List all admin users ──
    if (req.method === 'GET' && !id) {
      const rows = await sql`
        SELECT id, name, email, role, permissions, active, last_login, created_at
        FROM admin_users ORDER BY created_at DESC
      `;
      return res.status(200).json(rows);
    }

    // ── POST: Create admin user ──
    if (req.method === 'POST') {
      const { name, email, password, role, permissions } = req.body || {};
      if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password required' });
      const exists = await sql`SELECT id FROM admin_users WHERE lower(email)=lower(${email})`;
      if (exists.length) return res.status(400).json({ error: 'Email already exists' });
      const rows = await sql`
        INSERT INTO admin_users (name, email, password_hash, role, permissions, active)
        VALUES (${name}, ${email}, ${password}, ${role||'Support'}, ${permissions||['stores','billing']}, true)
        RETURNING id, name, email, role, permissions, active, created_at
      `;
      return res.status(201).json(rows[0]);
    }

    // ── PUT: Update admin user ──
    if (req.method === 'PUT' && id) {
      const { name, email, password, role, permissions, active } = req.body || {};
      const rows = await sql`
        UPDATE admin_users SET
          name        = COALESCE(${name        ?? null}, name),
          email       = COALESCE(${email       ?? null}, email),
          password_hash = COALESCE(${password  ?? null}, password_hash),
          role        = COALESCE(${role        ?? null}, role),
          permissions = COALESCE(${permissions ?? null}, permissions),
          active      = COALESCE(${active      ?? null}, active)
        WHERE id = ${id}
        RETURNING id, name, email, role, permissions, active, created_at
      `;
      if (!rows.length) return res.status(404).json({ error: 'User not found' });
      return res.status(200).json(rows[0]);
    }

    // ── DELETE: Remove admin user ──
    if (req.method === 'DELETE' && id) {
      await sql`DELETE FROM admin_users WHERE id=${id}`;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('admin_users error:', err.message);
    return res.status(500).json({ error: dbError(err) });
  }
};
