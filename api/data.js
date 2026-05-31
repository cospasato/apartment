// api/data.js — single endpoint for all tenant lodge data (locations, rooms, bookings, expenses, staff, customers, reports)
// Routes by ?resource= query param to stay under Vercel's 12-function limit
const { getDb, setCors, dbErr } = require('./_db.js');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  let sql;
  try { sql = getDb(); } catch (e) { return res.status(500).json({ error: e.message }); }

  const tid = req.query.tenant_id || req.headers['x-tenant-id'];
  if (!tid) return res.status(400).json({ error: 'tenant_id required' });

  const { resource, id, location_id, status: sf, action, customer_id, me } = req.query;

  try {
    // ── LOCATIONS ──
    if (resource === 'locations') {
      if (req.method === 'GET') {
        const rows = await sql`
          SELECT l.*, COUNT(DISTINCT r.id)::int AS room_count, COUNT(DISTINCT b.id)::int AS booking_count
          FROM locations l
          LEFT JOIN rooms r ON r.location_id = l.id
          LEFT JOIN bookings b ON b.location_id = l.id
          WHERE l.tenant_id = ${tid} AND l.active = true
          GROUP BY l.id ORDER BY l.created_at ASC`;
        return res.status(200).json(rows);
      }
      if (req.method === 'POST') {
        const { name, city, address, icon, description } = req.body || {};
        if (!name || !city) return res.status(400).json({ error: 'name and city required' });
        const rows = await sql`INSERT INTO locations (tenant_id,name,city,address,icon,description) VALUES (${tid},${name},${city},${address||''},${icon||'🏙️'},${description||''}) RETURNING *`;
        return res.status(201).json(rows[0]);
      }
      if (req.method === 'PUT' && id) {
        const { name, city, address, icon, description, active } = req.body || {};
        const rows = await sql`UPDATE locations SET name=COALESCE(${name??null},name),city=COALESCE(${city??null},city),address=COALESCE(${address??null},address),icon=COALESCE(${icon??null},icon),description=COALESCE(${description??null},description),active=COALESCE(${active??null},active) WHERE id=${id} AND tenant_id=${tid} RETURNING *`;
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        return res.status(200).json(rows[0]);
      }
      if (req.method === 'DELETE' && id) {
        const active = await sql`SELECT COUNT(*)::int AS n FROM bookings WHERE location_id=${id} AND tenant_id=${tid} AND status='checkedIn'`;
        if (active[0].n > 0) return res.status(400).json({ error: 'Cannot delete: has guests checked in.' });
        const rows = await sql`UPDATE locations SET active=false WHERE id=${id} AND tenant_id=${tid} RETURNING id,name`;
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        return res.status(200).json({ success: true, deleted: rows[0] });
      }
    }

    // ── ROOMS ──
    if (resource === 'rooms') {
      if (req.method === 'GET') {
        const rows = location_id
          ? await sql`SELECT * FROM rooms WHERE tenant_id=${tid} AND location_id=${location_id} ORDER BY name ASC`
          : await sql`SELECT * FROM rooms WHERE tenant_id=${tid} ORDER BY location_id,name ASC`;
        return res.status(200).json(rows);
      }
      if (req.method === 'POST') {
        const { location_id: loc, name, type, beds, max_guests, price_per_night, status, amenities, photos } = req.body || {};
        if (!loc || !name || !price_per_night) return res.status(400).json({ error: 'location_id, name, price_per_night required' });
        const rows = await sql`INSERT INTO rooms (tenant_id,location_id,name,type,beds,max_guests,price_per_night,status,amenities,photos) VALUES (${tid},${loc},${name},${type||'Standard'},${beds||1},${max_guests||2},${price_per_night},${status||'available'},${amenities||[]},${photos||[]}) RETURNING *`;
        return res.status(201).json(rows[0]);
      }
      if (req.method === 'PUT' && id) {
        const { name, type, beds, max_guests, price_per_night, status, amenities, photos } = req.body || {};
        const rows = await sql`UPDATE rooms SET name=COALESCE(${name??null},name),type=COALESCE(${type??null},type),beds=COALESCE(${beds??null},beds),max_guests=COALESCE(${max_guests??null},max_guests),price_per_night=COALESCE(${price_per_night??null},price_per_night),status=COALESCE(${status??null},status),amenities=COALESCE(${amenities??null},amenities),photos=COALESCE(${photos??null},photos) WHERE id=${id} AND tenant_id=${tid} RETURNING *`;
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        return res.status(200).json(rows[0]);
      }
      if (req.method === 'DELETE' && id) {
        const active = await sql`SELECT COUNT(*)::int AS n FROM bookings WHERE room_id=${id} AND tenant_id=${tid} AND status IN ('pending','confirmed','checkedIn')`;
        if (active[0].n > 0) return res.status(400).json({ error: 'Room has active bookings.' });
        await sql`DELETE FROM rooms WHERE id=${id} AND tenant_id=${tid}`;
        return res.status(200).json({ success: true });
      }
    }

    // ── BOOKINGS ──
    if (resource === 'bookings') {
      if (req.method === 'GET') {
        let rows;
        if (location_id && sf) rows = await sql`SELECT * FROM bookings WHERE tenant_id=${tid} AND location_id=${location_id} AND status=${sf} ORDER BY created_at DESC`;
        else if (location_id) rows = await sql`SELECT * FROM bookings WHERE tenant_id=${tid} AND location_id=${location_id} ORDER BY created_at DESC`;
        else if (sf) rows = await sql`SELECT * FROM bookings WHERE tenant_id=${tid} AND status=${sf} ORDER BY created_at DESC`;
        else rows = await sql`SELECT * FROM bookings WHERE tenant_id=${tid} ORDER BY created_at DESC`;
        return res.status(200).json(rows);
      }
      if (req.method === 'POST') {
        const { room_id, location_id: loc, guest_name, guest_phone, guest_email, guest_nationality, check_in, check_out, nights, base_amount, discount, discount_type, total_amount, paid_amount, payment_method, notes, staff_id, customer_id: cid } = req.body || {};
        if (!guest_name || !guest_phone || !check_in || !check_out) return res.status(400).json({ error: 'guest_name, guest_phone, check_in, check_out required' });
        const rows = await sql`INSERT INTO bookings (tenant_id,room_id,location_id,guest_name,guest_phone,guest_email,guest_nationality,check_in,check_out,nights,base_amount,discount,discount_type,total_amount,paid_amount,status,payment_method,notes,staff_id,customer_id) VALUES (${tid},${room_id||null},${loc||null},${guest_name},${guest_phone},${guest_email||null},${guest_nationality||null},${check_in},${check_out},${nights||1},${base_amount||0},${discount||0},${discount_type||'pct'},${total_amount||0},${paid_amount||0},'pending',${payment_method||'Cash'},${notes||null},${staff_id||null},${cid||null}) RETURNING *`;
        return res.status(201).json(rows[0]);
      }
      if (req.method === 'PUT' && id) {
        const { status, paid_amount, add_payment, extra_nights, new_checkout, extra_amount, customer_cancel, customer_id: cid } = req.body || {};
        let rows;
        if (customer_cancel) {
          const check = await sql`SELECT status,customer_id FROM bookings WHERE id=${id} AND tenant_id=${tid}`;
          if (!check.length) return res.status(404).json({ error: 'Not found' });
          if (check[0].customer_id !== cid) return res.status(403).json({ error: 'Not your booking' });
          if (!['pending','confirmed'].includes(check[0].status)) return res.status(400).json({ error: 'Cannot cancel at this stage' });
          rows = await sql`UPDATE bookings SET status='cancelled',total_amount=paid_amount WHERE id=${id} AND tenant_id=${tid} RETURNING *`;
          await sql`UPDATE rooms SET status='available' WHERE id=(SELECT room_id FROM bookings WHERE id=${id})`;
        } else if (extra_nights) {
          const curr = await sql`SELECT * FROM bookings WHERE id=${id} AND tenant_id=${tid}`;
          if (!curr.length) return res.status(404).json({ error: 'Not found' });
          const b = curr[0];
          rows = await sql`UPDATE bookings SET check_out=${new_checkout},nights=${Number(b.nights)+Number(extra_nights)},base_amount=${Number(b.base_amount)+Number(extra_amount)},total_amount=${Number(b.total_amount)+Number(extra_amount)} WHERE id=${id} AND tenant_id=${tid} RETURNING *`;
        } else if (add_payment !== undefined) {
          rows = await sql`UPDATE bookings SET paid_amount=LEAST(total_amount,paid_amount+${Number(add_payment)}) WHERE id=${id} AND tenant_id=${tid} RETURNING *`;
        } else if (status === 'cancelled') {
          rows = await sql`UPDATE bookings SET status='cancelled',total_amount=paid_amount WHERE id=${id} AND tenant_id=${tid} RETURNING *`;
        } else {
          rows = await sql`UPDATE bookings SET status=COALESCE(${status??null},status),paid_amount=COALESCE(${paid_amount??null},paid_amount) WHERE id=${id} AND tenant_id=${tid} RETURNING *`;
        }
        if (!rows || !rows.length) return res.status(404).json({ error: 'Not found' });
        const b = rows[0];
        if (b.status === 'checkedIn') await sql`UPDATE rooms SET status='occupied' WHERE id=${b.room_id} AND tenant_id=${tid}`;
        if (b.status === 'checkedOut' || b.status === 'cancelled') await sql`UPDATE rooms SET status='available' WHERE id=${b.room_id} AND tenant_id=${tid}`;
        return res.status(200).json(b);
      }
      if (req.method === 'DELETE' && id) {
        const check = await sql`SELECT status,guest_name FROM bookings WHERE id=${id} AND tenant_id=${tid}`;
        if (!check.length) return res.status(404).json({ error: 'Not found' });
        if (check[0].status !== 'cancelled') return res.status(400).json({ error: 'Only cancelled bookings can be deleted' });
        await sql`DELETE FROM bookings WHERE id=${id} AND tenant_id=${tid}`;
        return res.status(200).json({ success: true });
      }
    }

    // ── EXPENSES ──
    if (resource === 'expenses') {
      if (req.method === 'GET') {
        const rows = location_id
          ? await sql`SELECT * FROM expenses WHERE tenant_id=${tid} AND location_id=${location_id} ORDER BY expense_date DESC`
          : await sql`SELECT * FROM expenses WHERE tenant_id=${tid} ORDER BY expense_date DESC`;
        return res.status(200).json(rows);
      }
      if (req.method === 'POST') {
        const { location_id: loc, category, description, amount, expense_date, staff_id } = req.body || {};
        if (!loc || !category || !description || !amount) return res.status(400).json({ error: 'location_id, category, description, amount required' });
        const rows = await sql`INSERT INTO expenses (tenant_id,location_id,category,description,amount,expense_date,staff_id) VALUES (${tid},${loc},${category},${description},${amount},${expense_date||new Date().toISOString().split('T')[0]},${staff_id||null}) RETURNING *`;
        return res.status(201).json(rows[0]);
      }
    }

    // ── STAFF ──
    if (resource === 'staff') {
      if (req.method === 'GET' && !me) {
        const rows = await sql`SELECT id,name,email,phone,role,location_id,active,created_at FROM staff WHERE tenant_id=${tid} ORDER BY created_at ASC`;
        return res.status(200).json(rows);
      }
      if (req.method === 'POST' && action === 'login') {
        const { email, pin } = req.body || {};
        const rows = await sql`SELECT id,name,email,role,location_id,active FROM staff WHERE tenant_id=${tid} AND lower(email)=lower(${email}) AND pin_hash=${pin} AND active=true LIMIT 1`;
        if (!rows.length) return res.status(401).json({ error: 'Invalid email or PIN' });
        return res.status(200).json(rows[0]);
      }
      if (req.method === 'POST') {
        const { name, email, phone, role, location_id: loc, pin } = req.body || {};
        if (!name || !email || !pin) return res.status(400).json({ error: 'name, email, pin required' });
        const rows = await sql`INSERT INTO staff (tenant_id,name,email,phone,role,location_id,pin_hash) VALUES (${tid},${name},${email},${phone||null},${role||'Receptionist'},${loc||null},${pin}) RETURNING id,name,email,phone,role,location_id,active,created_at`;
        return res.status(201).json(rows[0]);
      }
      if (req.method === 'PUT' && me) {
        const { staff_id, name, phone, email: semail, current_pin, new_pin } = req.body || {};
        if (new_pin) {
          const check = await sql`SELECT pin_hash FROM staff WHERE id=${staff_id} AND tenant_id=${tid}`;
          if (!check.length) return res.status(404).json({ error: 'Not found' });
          if (check[0].pin_hash !== current_pin) return res.status(401).json({ error: 'Current PIN incorrect' });
          await sql`UPDATE staff SET pin_hash=${new_pin} WHERE id=${staff_id} AND tenant_id=${tid}`;
        }
        const rows = await sql`UPDATE staff SET name=COALESCE(${name??null},name),phone=COALESCE(${phone??null},phone),email=COALESCE(${semail??null},email) WHERE id=${staff_id} AND tenant_id=${tid} RETURNING id,name,email,phone,role,location_id,active`;
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        return res.status(200).json(rows[0]);
      }
      if (req.method === 'PUT' && id) {
        const { name, phone, role, location_id: loc, pin, active } = req.body || {};
        const rows = pin
          ? await sql`UPDATE staff SET name=COALESCE(${name??null},name),phone=COALESCE(${phone??null},phone),role=COALESCE(${role??null},role),location_id=COALESCE(${loc??null},location_id),pin_hash=${pin},active=COALESCE(${active??null},active) WHERE id=${id} AND tenant_id=${tid} RETURNING id,name,email,phone,role,location_id,active`
          : await sql`UPDATE staff SET name=COALESCE(${name??null},name),phone=COALESCE(${phone??null},phone),role=COALESCE(${role??null},role),location_id=COALESCE(${loc??null},location_id),active=COALESCE(${active??null},active) WHERE id=${id} AND tenant_id=${tid} RETURNING id,name,email,phone,role,location_id,active`;
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        return res.status(200).json(rows[0]);
      }
    }

    // ── CUSTOMERS ──
    if (resource === 'customers') {
      if (req.method === 'POST' && action === 'register') {
        const { name, email, phone, nationality, password } = req.body || {};
        if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
        if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
        const ex = await sql`SELECT id FROM customers WHERE tenant_id=${tid} AND lower(email)=lower(${email})`;
        if (ex.length) return res.status(400).json({ error: 'Email already registered' });
        const rows = await sql`INSERT INTO customers (tenant_id,name,email,phone,nationality,password_hash) VALUES (${tid},${name},${email},${phone||null},${nationality||null},${password}) RETURNING id,name,email,phone,nationality,created_at`;
        return res.status(201).json(rows[0]);
      }
      if (req.method === 'POST' && action === 'login') {
        const { email, password } = req.body || {};
        const rows = await sql`SELECT id,name,email,phone,nationality,created_at FROM customers WHERE tenant_id=${tid} AND lower(email)=lower(${email}) AND password_hash=${password} LIMIT 1`;
        if (!rows.length) return res.status(401).json({ error: 'Incorrect email or password' });
        return res.status(200).json(rows[0]);
      }
      if (req.method === 'GET' && customer_id) {
        const bookings = await sql`SELECT b.*,r.name AS room_name,r.type AS room_type,r.price_per_night,r.photos AS room_photos,l.name AS location_name,l.city AS location_city,l.icon AS location_icon FROM bookings b LEFT JOIN rooms r ON r.id=b.room_id LEFT JOIN locations l ON l.id=b.location_id WHERE b.tenant_id=${tid} AND b.customer_id=${customer_id} ORDER BY b.created_at DESC`;
        return res.status(200).json(bookings);
      }
      if (req.method === 'PUT' && customer_id) {
        const { name, phone, nationality, current_password, new_password } = req.body || {};
        if (new_password) {
          const check = await sql`SELECT password_hash FROM customers WHERE id=${customer_id} AND tenant_id=${tid}`;
          if (!check.length) return res.status(404).json({ error: 'Not found' });
          if (check[0].password_hash !== current_password) return res.status(401).json({ error: 'Current password incorrect' });
        }
        const rows = new_password
          ? await sql`UPDATE customers SET name=COALESCE(${name??null},name),phone=COALESCE(${phone??null},phone),nationality=COALESCE(${nationality??null},nationality),password_hash=${new_password} WHERE id=${customer_id} AND tenant_id=${tid} RETURNING id,name,email,phone,nationality`
          : await sql`UPDATE customers SET name=COALESCE(${name??null},name),phone=COALESCE(${phone??null},phone),nationality=COALESCE(${nationality??null},nationality) WHERE id=${customer_id} AND tenant_id=${tid} RETURNING id,name,email,phone,nationality`;
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        return res.status(200).json(rows[0]);
      }
    }

    // ── REPORTS ──
    if (resource === 'reports') {
      const [rev, expRows, byLoc, byMethod] = await Promise.all([
        location_id
          ? sql`SELECT COALESCE(SUM(paid_amount),0) AS collected,COALESCE(SUM(total_amount-paid_amount),0) AS pending,COALESCE(SUM(base_amount-total_amount),0) AS discounts,COALESCE(SUM(total_amount),0) AS invoiced,COUNT(*)::int AS total,COUNT(*) FILTER(WHERE status='checkedIn')::int AS active,COUNT(*) FILTER(WHERE status='checkedOut')::int AS completed,COUNT(*) FILTER(WHERE status='cancelled')::int AS cancelled FROM bookings WHERE tenant_id=${tid} AND location_id=${location_id}`
          : sql`SELECT COALESCE(SUM(paid_amount),0) AS collected,COALESCE(SUM(total_amount-paid_amount),0) AS pending,COALESCE(SUM(base_amount-total_amount),0) AS discounts,COALESCE(SUM(total_amount),0) AS invoiced,COUNT(*)::int AS total,COUNT(*) FILTER(WHERE status='checkedIn')::int AS active,COUNT(*) FILTER(WHERE status='checkedOut')::int AS completed,COUNT(*) FILTER(WHERE status='cancelled')::int AS cancelled FROM bookings WHERE tenant_id=${tid}`,
        location_id
          ? sql`SELECT category,COALESCE(SUM(amount),0) AS total FROM expenses WHERE tenant_id=${tid} AND location_id=${location_id} GROUP BY category`
          : sql`SELECT category,COALESCE(SUM(amount),0) AS total FROM expenses WHERE tenant_id=${tid} GROUP BY category`,
        sql`SELECT l.id,l.name,l.icon,l.city,COALESCE(SUM(b.paid_amount),0) AS revenue,COALESCE(SUM(b.total_amount-b.paid_amount),0) AS pending,COUNT(b.id)::int AS bookings,COALESCE(SUM(e.amount),0) AS expenses FROM locations l LEFT JOIN bookings b ON b.location_id=l.id AND b.tenant_id=${tid} LEFT JOIN expenses e ON e.location_id=l.id AND e.tenant_id=${tid} WHERE l.tenant_id=${tid} GROUP BY l.id,l.name,l.icon,l.city ORDER BY revenue DESC`,
        sql`SELECT payment_method,COALESCE(SUM(paid_amount),0) AS total FROM bookings WHERE tenant_id=${tid} AND paid_amount>0 GROUP BY payment_method`,
      ]);
      const totalExp = expRows.reduce((s, e) => s + Number(e.total), 0);
      const r = rev[0];
      return res.status(200).json({
        revenue: { collected: Number(r.collected), pending: Number(r.pending), discounts: Number(r.discounts), invoiced: Number(r.invoiced), net_profit: Number(r.collected) - totalExp },
        bookings: { total: r.total, active: r.active, completed: r.completed, cancelled: r.cancelled },
        expenses: { total: totalExp, by_category: expRows.map(e => ({ category: e.category, total: Number(e.total) })) },
        by_location: byLoc.map(l => ({ ...l, revenue: Number(l.revenue), pending: Number(l.pending), expenses: Number(l.expenses) })),
        by_method: byMethod.map(m => ({ method: m.payment_method, total: Number(m.total) })),
      });
    }

    return res.status(400).json({ error: 'Unknown resource' });
  } catch (err) {
    console.error('data error:', err.message);
    return res.status(500).json({ error: dbErr(err) });
  }
};
