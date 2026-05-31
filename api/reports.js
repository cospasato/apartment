// api/reports.js — financial reports + expenses
// Routes: /api/reports  AND  /api/reports?resource=expenses
const { getDb, setCors, dbError } = require('../lib/_db.js');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  let sql;
  try { sql = getDb(); } catch (err) { return res.status(500).json({ error: err.message }); }

  const { resource, store_id, location_id } = req.query;

  try {
    // ── EXPENSES (resource=expenses) ────────────────────────
    if (resource === 'expenses') {
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
        if (!loc || !category || !description || !amount)
          return res.status(400).json({ error: 'location_id, category, description, amount required' });
        const rows = await sql`
          INSERT INTO expenses (store_id, location_id, category, description, amount, expense_date, staff_id)
          VALUES (${sid||null}, ${loc}, ${category}, ${description}, ${amount},
                  ${expense_date || new Date().toISOString().split('T')[0]}, ${staff_id||null})
          RETURNING *
        `;
        return res.status(201).json(rows[0]);
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ── REPORTS ────────────────────────────────────────────
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    if (!store_id) return res.status(400).json({ error: 'store_id required' });

    const { date_from, date_to } = req.query;
    const df = date_from || '2000-01-01';
    const dt = date_to   || new Date().toISOString().split('T')[0];

    const [rev, expRows, byLoc, byMethod] = await Promise.all([
      location_id
        ? sql`SELECT COALESCE(SUM(paid_amount),0) AS collected,COALESCE(SUM(total_amount-paid_amount),0) AS pending,COALESCE(SUM(base_amount-total_amount),0) AS discounts,COALESCE(SUM(total_amount),0) AS invoiced,COUNT(*)::int AS total,COUNT(*) FILTER(WHERE status='checkedIn')::int AS active,COUNT(*) FILTER(WHERE status='checkedOut')::int AS completed,COUNT(*) FILTER(WHERE status='cancelled')::int AS cancelled FROM bookings WHERE store_id=${store_id} AND location_id=${location_id} AND check_in BETWEEN ${df} AND ${dt}`
        : sql`SELECT COALESCE(SUM(paid_amount),0) AS collected,COALESCE(SUM(total_amount-paid_amount),0) AS pending,COALESCE(SUM(base_amount-total_amount),0) AS discounts,COALESCE(SUM(total_amount),0) AS invoiced,COUNT(*)::int AS total,COUNT(*) FILTER(WHERE status='checkedIn')::int AS active,COUNT(*) FILTER(WHERE status='checkedOut')::int AS completed,COUNT(*) FILTER(WHERE status='cancelled')::int AS cancelled FROM bookings WHERE store_id=${store_id} AND check_in BETWEEN ${df} AND ${dt}`,
      location_id
        ? sql`SELECT category,COALESCE(SUM(amount),0) AS total FROM expenses WHERE store_id=${store_id} AND location_id=${location_id} AND expense_date BETWEEN ${df} AND ${dt} GROUP BY category`
        : sql`SELECT category,COALESCE(SUM(amount),0) AS total FROM expenses WHERE store_id=${store_id} AND expense_date BETWEEN ${df} AND ${dt} GROUP BY category`,
      sql`SELECT l.id,l.name,l.icon,l.city,COALESCE(SUM(b.paid_amount),0) AS revenue,COALESCE(SUM(b.total_amount-b.paid_amount),0) AS pending,COUNT(b.id)::int AS bookings,COALESCE(SUM(e.amount),0) AS expenses FROM locations l LEFT JOIN bookings b ON b.location_id=l.id AND b.check_in BETWEEN ${df} AND ${dt} LEFT JOIN expenses e ON e.location_id=l.id AND e.expense_date BETWEEN ${df} AND ${dt} WHERE l.store_id=${store_id} GROUP BY l.id,l.name,l.icon,l.city ORDER BY revenue DESC`,
      sql`SELECT payment_method,COALESCE(SUM(paid_amount),0) AS total FROM bookings WHERE store_id=${store_id} AND paid_amount>0 AND check_in BETWEEN ${df} AND ${dt} GROUP BY payment_method`
    ]);

    const totalExp = expRows.reduce((s,e) => s+Number(e.total), 0);
    const r = rev[0];
    return res.status(200).json({
      revenue: {
        collected: Number(r.collected), pending: Number(r.pending),
        discounts: Number(r.discounts), invoiced: Number(r.invoiced),
        net_profit: Number(r.collected) - totalExp,
      },
      bookings: { total: r.total, active: r.active, completed: r.completed, cancelled: r.cancelled },
      expenses: { total: totalExp, by_category: expRows.map(e=>({category:e.category,total:Number(e.total)})) },
      by_location: byLoc.map(l=>({...l,revenue:Number(l.revenue),pending:Number(l.pending),expenses:Number(l.expenses)})),
      by_method: byMethod.map(m=>({method:m.payment_method,total:Number(m.total)})),
      date_filter: { from: df, to: dt }
    });
  } catch (err) {
    return res.status(500).json({ error: dbError(err) });
  }
};
