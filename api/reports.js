const { getDb, setCors, dbError } = require('./_db.js');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  let sql;
  try { sql = getDb(); } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const { location_id, date_from, date_to } = req.query;

  try {
    // Build date filters for bookings and expenses
    // Bookings: filter by check_in date range
    // Expenses: filter by expense_date range
    const hasDateFilter = date_from || date_to;

    let rev, expRows, byLoc, byMethod;

    if (hasDateFilter) {
      const df = date_from || '2000-01-01';
      const dt = date_to   || new Date().toISOString().split('T')[0];

      if (location_id) {
        [rev, expRows, byLoc, byMethod] = await Promise.all([
          sql`SELECT
            COALESCE(SUM(paid_amount),0)              AS collected,
            COALESCE(SUM(total_amount-paid_amount),0) AS pending,
            COALESCE(SUM(base_amount-total_amount),0) AS discounts,
            COALESCE(SUM(total_amount),0)             AS invoiced,
            COUNT(*)::int                             AS total,
            COUNT(*) FILTER(WHERE status='checkedIn')::int  AS active,
            COUNT(*) FILTER(WHERE status='checkedOut')::int AS completed,
            COUNT(*) FILTER(WHERE status='cancelled')::int  AS cancelled
          FROM bookings WHERE location_id=${location_id} AND check_in BETWEEN ${df} AND ${dt}`,
          sql`SELECT category, COALESCE(SUM(amount),0) AS total FROM expenses
              WHERE location_id=${location_id} AND expense_date BETWEEN ${df} AND ${dt} GROUP BY category`,
          sql`SELECT l.id, l.name, l.icon, l.city,
              COALESCE(SUM(b.paid_amount),0)              AS revenue,
              COALESCE(SUM(b.total_amount-b.paid_amount),0) AS pending,
              COUNT(b.id)::int                            AS bookings,
              COALESCE(SUM(e.amount),0)                   AS expenses
              FROM locations l
              LEFT JOIN bookings b ON b.location_id=l.id AND b.check_in BETWEEN ${df} AND ${dt}
              LEFT JOIN expenses e ON e.location_id=l.id AND e.expense_date BETWEEN ${df} AND ${dt}
              WHERE l.id = ${location_id}
              GROUP BY l.id, l.name, l.icon, l.city ORDER BY revenue DESC`,
          sql`SELECT payment_method, COALESCE(SUM(paid_amount),0) AS total
              FROM bookings WHERE location_id=${location_id} AND paid_amount>0 AND check_in BETWEEN ${df} AND ${dt}
              GROUP BY payment_method`,
        ]);
      } else {
        [rev, expRows, byLoc, byMethod] = await Promise.all([
          sql`SELECT
            COALESCE(SUM(paid_amount),0)              AS collected,
            COALESCE(SUM(total_amount-paid_amount),0) AS pending,
            COALESCE(SUM(base_amount-total_amount),0) AS discounts,
            COALESCE(SUM(total_amount),0)             AS invoiced,
            COUNT(*)::int                             AS total,
            COUNT(*) FILTER(WHERE status='checkedIn')::int  AS active,
            COUNT(*) FILTER(WHERE status='checkedOut')::int AS completed,
            COUNT(*) FILTER(WHERE status='cancelled')::int  AS cancelled
          FROM bookings WHERE check_in BETWEEN ${df} AND ${dt}`,
          sql`SELECT category, COALESCE(SUM(amount),0) AS total FROM expenses
              WHERE expense_date BETWEEN ${df} AND ${dt} GROUP BY category`,
          sql`SELECT l.id, l.name, l.icon, l.city,
              COALESCE(SUM(b.paid_amount),0)              AS revenue,
              COALESCE(SUM(b.total_amount-b.paid_amount),0) AS pending,
              COUNT(b.id)::int                            AS bookings,
              COALESCE(SUM(e.amount),0)                   AS expenses
              FROM locations l
              LEFT JOIN bookings b ON b.location_id=l.id AND b.check_in BETWEEN ${df} AND ${dt}
              LEFT JOIN expenses e ON e.location_id=l.id AND e.expense_date BETWEEN ${df} AND ${dt}
              GROUP BY l.id, l.name, l.icon, l.city ORDER BY revenue DESC`,
          sql`SELECT payment_method, COALESCE(SUM(paid_amount),0) AS total
              FROM bookings WHERE paid_amount>0 AND check_in BETWEEN ${df} AND ${dt}
              GROUP BY payment_method`,
        ]);
      }
    } else {
      // No date filter - original behaviour
      if (location_id) {
        [rev, expRows, byLoc, byMethod] = await Promise.all([
          sql`SELECT COALESCE(SUM(paid_amount),0) AS collected,COALESCE(SUM(total_amount-paid_amount),0) AS pending,COALESCE(SUM(base_amount-total_amount),0) AS discounts,COALESCE(SUM(total_amount),0) AS invoiced,COUNT(*)::int AS total,COUNT(*) FILTER(WHERE status='checkedIn')::int AS active,COUNT(*) FILTER(WHERE status='checkedOut')::int AS completed,COUNT(*) FILTER(WHERE status='cancelled')::int AS cancelled FROM bookings WHERE location_id=${location_id}`,
          sql`SELECT category,COALESCE(SUM(amount),0) AS total FROM expenses WHERE location_id=${location_id} GROUP BY category`,
          sql`SELECT l.id,l.name,l.icon,l.city,COALESCE(SUM(b.paid_amount),0) AS revenue,COALESCE(SUM(b.total_amount-b.paid_amount),0) AS pending,COUNT(b.id)::int AS bookings,COALESCE(SUM(e.amount),0) AS expenses FROM locations l LEFT JOIN bookings b ON b.location_id=l.id LEFT JOIN expenses e ON e.location_id=l.id WHERE l.id=${location_id} GROUP BY l.id,l.name,l.icon,l.city ORDER BY revenue DESC`,
          sql`SELECT payment_method,COALESCE(SUM(paid_amount),0) AS total FROM bookings WHERE location_id=${location_id} AND paid_amount>0 GROUP BY payment_method`,
        ]);
      } else {
        [rev, expRows, byLoc, byMethod] = await Promise.all([
          sql`SELECT COALESCE(SUM(paid_amount),0) AS collected,COALESCE(SUM(total_amount-paid_amount),0) AS pending,COALESCE(SUM(base_amount-total_amount),0) AS discounts,COALESCE(SUM(total_amount),0) AS invoiced,COUNT(*)::int AS total,COUNT(*) FILTER(WHERE status='checkedIn')::int AS active,COUNT(*) FILTER(WHERE status='checkedOut')::int AS completed,COUNT(*) FILTER(WHERE status='cancelled')::int AS cancelled FROM bookings`,
          sql`SELECT category,COALESCE(SUM(amount),0) AS total FROM expenses GROUP BY category`,
          sql`SELECT l.id,l.name,l.icon,l.city,COALESCE(SUM(b.paid_amount),0) AS revenue,COALESCE(SUM(b.total_amount-b.paid_amount),0) AS pending,COUNT(b.id)::int AS bookings,COALESCE(SUM(e.amount),0) AS expenses FROM locations l LEFT JOIN bookings b ON b.location_id=l.id LEFT JOIN expenses e ON e.location_id=l.id GROUP BY l.id,l.name,l.icon,l.city ORDER BY revenue DESC`,
          sql`SELECT payment_method,COALESCE(SUM(paid_amount),0) AS total FROM bookings WHERE paid_amount>0 GROUP BY payment_method`,
        ]);
      }
    }

    const totalExp = expRows.reduce((s, e) => s + Number(e.total), 0);
    const r = rev[0];
    return res.status(200).json({
      revenue: {
        collected:  Number(r.collected),
        pending:    Number(r.pending),
        discounts:  Number(r.discounts),
        invoiced:   Number(r.invoiced),
        net_profit: Number(r.collected) - totalExp,
      },
      bookings: {
        total: r.total, active: r.active,
        completed: r.completed, cancelled: r.cancelled,
      },
      expenses: {
        total: totalExp,
        by_category: expRows.map(e => ({ category: e.category, total: Number(e.total) })),
      },
      by_location: byLoc.map(l => ({
        ...l,
        revenue:  Number(l.revenue),
        pending:  Number(l.pending),
        expenses: Number(l.expenses),
      })),
      by_method: byMethod.map(m => ({ method: m.payment_method, total: Number(m.total) })),
      date_filter: hasDateFilter ? { from: date_from, to: date_to } : null,
    });
  } catch (err) {
    console.error('reports error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
