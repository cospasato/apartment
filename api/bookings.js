const { getDb, setCors, dbError } = require('./_db.js');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  let sql;
  try { sql = getDb(); } catch (err) { return res.status(500).json({ error: err.message }); }

  const { id, store_id, location_id, customer_cancel } = req.query;

  try {
    if (req.method === 'GET' && req.query.check_room) {
      const { check_room, ci, co } = req.query;
      const conflicts = await sql`
        SELECT id, check_in, check_out, status FROM bookings
        WHERE room_id = ${check_room}
          AND status NOT IN ('cancelled','checkedOut')
          AND check_in < ${co} AND check_out > ${ci}
      `;
      return res.status(200).json({ available: conflicts.length === 0, conflicts });
    }

    if (req.method === 'GET' && req.query.get_booked_dates) {
      const rows = await sql`
        SELECT room_id, check_in, check_out FROM bookings
        WHERE location_id = ${req.query.get_booked_dates}
          AND status NOT IN ('cancelled','checkedOut')
        ORDER BY room_id, check_in ASC
      `;
      const byRoom = {};
      rows.forEach(r => {
        if (!byRoom[r.room_id]) byRoom[r.room_id] = [];
        byRoom[r.room_id].push({ ci: r.check_in?.split?.('T')[0] || r.check_in, co: r.check_out?.split?.('T')[0] || r.check_out });
      });
      return res.status(200).json(byRoom);
    }

    if (req.method === 'GET') {
      let rows;
      if (store_id && location_id)
        rows = await sql`SELECT * FROM bookings WHERE store_id=${store_id} AND location_id=${location_id} ORDER BY created_at DESC`;
      else if (store_id)
        rows = await sql`SELECT * FROM bookings WHERE store_id=${store_id} ORDER BY created_at DESC`;
      else if (location_id)
        rows = await sql`SELECT * FROM bookings WHERE location_id=${location_id} ORDER BY created_at DESC`;
      else
        rows = await sql`SELECT * FROM bookings ORDER BY created_at DESC`;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { store_id: sid, room_id, location_id: loc, guest_name, guest_phone, guest_email,
              guest_nationality, check_in, check_out, nights, base_amount,
              discount, discount_type, total_amount, paid_amount,
              payment_method, notes, staff_id, customer_id } = req.body || {};
      if (!guest_name || !guest_phone || !check_in || !check_out)
        return res.status(400).json({ error: 'guest_name, guest_phone, check_in, check_out required' });
      const rows = await sql`
        INSERT INTO bookings (
          store_id, room_id, location_id, guest_name, guest_phone, guest_email,
          guest_nationality, check_in, check_out, nights, base_amount,
          discount, discount_type, total_amount, paid_amount,
          status, payment_method, notes, staff_id, customer_id
        ) VALUES (
          ${sid || null}, ${room_id || null}, ${loc || null},
          ${guest_name}, ${guest_phone}, ${guest_email || null},
          ${guest_nationality || null}, ${check_in}, ${check_out},
          ${nights || 1}, ${base_amount || 0}, ${discount || 0},
          ${discount_type || 'pct'}, ${total_amount || 0}, ${paid_amount || 0},
          'pending', ${payment_method || 'Cash'}, ${notes || null},
          ${staff_id || null}, ${customer_id || null}
        ) RETURNING *
      `;
      return res.status(201).json(rows[0]);
    }

    if (req.method === 'PUT' && req.query.action === 'extend') {
      const { extra_nights, extra_amount, new_checkout } = req.body || {};
      if (!id || !extra_nights || !new_checkout) return res.status(400).json({ error: 'id, extra_nights, new_checkout required' });
      const curr = await sql`SELECT * FROM bookings WHERE id = ${id}`;
      if (!curr.length) return res.status(404).json({ error: 'Booking not found' });
      if (curr[0].status !== 'checkedIn') return res.status(400).json({ error: 'Can only extend a checked-in booking' });
      const rows = await sql`
        UPDATE bookings SET
          check_out   = ${new_checkout},
          nights      = ${Number(curr[0].nights) + Number(extra_nights)},
          base_amount = ${Number(curr[0].base_amount) + Number(extra_amount)},
          total_amount= ${Number(curr[0].total_amount) + Number(extra_amount)}
        WHERE id = ${id} RETURNING *
      `;
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'PUT' && customer_cancel) {
      const { customer_id: cid } = req.body || {};
      if (!id || !cid) return res.status(400).json({ error: 'id and customer_id required' });
      const check = await sql`SELECT status, customer_id FROM bookings WHERE id = ${id}`;
      if (!check.length) return res.status(404).json({ error: 'Booking not found' });
      if (check[0].customer_id !== cid) return res.status(403).json({ error: 'Not your booking' });
      if (!['pending','confirmed'].includes(check[0].status))
        return res.status(400).json({ error: 'Only pending or confirmed bookings can be cancelled' });
      const rows = await sql`UPDATE bookings SET status = 'cancelled' WHERE id = ${id} RETURNING *`;
      await sql`UPDATE rooms SET status = 'available' WHERE id = (SELECT room_id FROM bookings WHERE id = ${id})`;
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'id required' });
      const { status, paid_amount, add_payment, payment_method: pm } = req.body || {};
      let rows;
      if (add_payment !== undefined) {
        rows = pm
          ? await sql`UPDATE bookings SET paid_amount=LEAST(total_amount,paid_amount+${Number(add_payment)}), payment_method=${pm} WHERE id=${id} RETURNING *`
          : await sql`UPDATE bookings SET paid_amount=LEAST(total_amount,paid_amount+${Number(add_payment)}) WHERE id=${id} RETURNING *`;
      } else if (status === 'cancelled') {
        rows = await sql`UPDATE bookings SET status='cancelled', total_amount=paid_amount WHERE id=${id} RETURNING *`;
      } else {
        rows = await sql`
          UPDATE bookings SET
            status      = COALESCE(${status      ?? null}, status),
            paid_amount = COALESCE(${paid_amount ?? null}, paid_amount)
          WHERE id = ${id} RETURNING *
        `;
      }
      if (!rows.length) return res.status(404).json({ error: 'Booking not found' });
      const b = rows[0];
      if (b.status === 'checkedIn')  await sql`UPDATE rooms SET status='occupied'  WHERE id=${b.room_id}`;
      if (['checkedOut','cancelled'].includes(b.status)) await sql`UPDATE rooms SET status='available' WHERE id=${b.room_id}`;
      return res.status(200).json(b);
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'id required' });
      const check = await sql`SELECT status, guest_name FROM bookings WHERE id = ${id}`;
      if (!check.length) return res.status(404).json({ error: 'Booking not found' });
      if (check[0].status !== 'cancelled') return res.status(400).json({ error: 'Only cancelled bookings can be deleted.' });
      await sql`DELETE FROM bookings WHERE id = ${id}`;
      return res.status(200).json({ success: true, guest: check[0].guest_name });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: dbError(err) });
  }
};
