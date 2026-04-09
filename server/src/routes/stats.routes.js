const express = require('express');
const db = require('../db');
const authenticate = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

const router = express.Router();

// ── GET /api/v1/stats ───────────────────────────────────────────────────────
router.get('/', authenticate, roleGuard('admin', 'agent'), async (_req, res) => {
  try {
    const [totals, byStatus, byAirline, revenueByMonth] = await Promise.all([
      // Overall totals
      db.query(`
        SELECT
          COUNT(*)                                           AS total_bookings,
          COUNT(*) FILTER (WHERE status = 'confirmed')      AS confirmed,
          COUNT(*) FILTER (WHERE status = 'pending')        AS pending,
          COUNT(*) FILTER (WHERE status = 'cancelled')      AS cancelled,
          COUNT(*) FILTER (WHERE status = 'refunded')       AS refunded,
          COALESCE(SUM(amount) FILTER (WHERE status = 'confirmed'), 0) AS total_revenue,
          COALESCE(SUM(amount) FILTER (WHERE status = 'refunded'), 0)  AS refunded_amount,
          COUNT(DISTINCT passenger_email)                   AS unique_passengers
        FROM bookings
      `),

      // Count by status (for doughnut chart)
      db.query(`
        SELECT status, COUNT(*) AS count
        FROM bookings
        GROUP BY status
        ORDER BY count DESC
      `),

      // Top airlines by booking count
      db.query(`
        SELECT airline, COUNT(*) AS count,
               ROUND(SUM(amount)::numeric, 2) AS revenue
        FROM bookings
        GROUP BY airline
        ORDER BY count DESC
        LIMIT 6
      `),

      // Revenue per month (last 6 months)
      db.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
          DATE_TRUNC('month', created_at) AS month_date,
          ROUND(SUM(amount)::numeric, 2) AS revenue,
          COUNT(*) AS bookings
        FROM bookings
        WHERE created_at >= NOW() - INTERVAL '6 months'
          AND status IN ('confirmed', 'refunded')
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month_date ASC
      `),
    ]);

    res.json({
      totals: totals.rows[0],
      byStatus: byStatus.rows,
      byAirline: byAirline.rows,
      revenueByMonth: revenueByMonth.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
