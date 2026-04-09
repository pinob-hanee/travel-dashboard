const express = require('express');
const { Parser } = require('json2csv');
const db = require('../db');
const authenticate = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

const router = express.Router();

// ── Helper: log activity ────────────────────────────────────────────────────
async function logActivity(userId, action, targetId, details) {
  try {
    await db.query(
      'INSERT INTO activity_logs (user_id, action, target_id, details) VALUES ($1,$2,$3,$4)',
      [userId, action, targetId, details]
    );
  } catch (_) { /* non-critical */ }
}

// ── GET /api/v1/bookings ────────────────────────────────────────────────────
// Query params: status, airline, passenger, date_from, date_to, page, limit, sort, order
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      status, airline, passenger,
      date_from, date_to,
      page = 1, limit = 10,
      sort = 'created_at', order = 'desc'
    } = req.query;

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (status)     { conditions.push(`b.status = $${paramIdx++}`);               params.push(status); }
    if (airline)    { conditions.push(`LOWER(b.airline) LIKE $${paramIdx++}`);     params.push(`%${airline.toLowerCase()}%`); }
    if (passenger)  { conditions.push(`LOWER(b.passenger_name) LIKE $${paramIdx++}`); params.push(`%${passenger.toLowerCase()}%`); }
    if (date_from)  { conditions.push(`b.departure_date >= $${paramIdx++}`);       params.push(date_from); }
    if (date_to)    { conditions.push(`b.departure_date <= $${paramIdx++}`);        params.push(date_to); }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Whitelist sort columns
    const sortableColumns = ['created_at', 'departure_date', 'amount', 'passenger_name', 'airline', 'status'];
    const safeSort = sortableColumns.includes(sort) ? `b.${sort}` : 'b.created_at';
    const safeOrder = order === 'asc' ? 'ASC' : 'DESC';

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const countResult = await db.query(
      `SELECT COUNT(*) FROM bookings b ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const dataResult = await db.query(
      `SELECT b.*, u.name AS agent_name, u.email AS agent_email
       FROM bookings b
       LEFT JOIN users u ON b.agent_id = u.id
       ${whereClause}
       ORDER BY ${safeSort} ${safeOrder}
       LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      data: dataResult.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// ── GET /api/v1/bookings/export ─────────────────────────────────────────────
router.get('/export', authenticate, roleGuard('admin'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT b.id, b.passenger_name, b.passenger_email, b.airline, b.flight_number,
              b.departure, b.destination, b.departure_date, b.return_date,
              b.status, b.amount, u.name AS agent_name, b.created_at
       FROM bookings b
       LEFT JOIN users u ON b.agent_id = u.id
       ORDER BY b.created_at DESC`
    );

    const fields = [
      'id','passenger_name','passenger_email','airline','flight_number',
      'departure','destination','departure_date','return_date','status',
      'amount','agent_name','created_at'
    ];
    const parser = new Parser({ fields });
    const csv = parser.parse(result.rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=bookings_${Date.now()}.csv`);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'CSV export failed' });
  }
});

// ── GET /api/v1/bookings/:id ────────────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT b.*, u.name AS agent_name, u.email AS agent_email
       FROM bookings b
       LEFT JOIN users u ON b.agent_id = u.id
       WHERE b.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// ── POST /api/v1/bookings ───────────────────────────────────────────────────
router.post('/', authenticate, async (req, res) => {
  const {
    passenger_name, passenger_email, airline, flight_number,
    departure, destination, departure_date, return_date,
    status = 'pending', amount, notes
  } = req.body;

  if (!passenger_name || !passenger_email || !airline || !flight_number ||
      !departure || !destination || !departure_date || !amount) {
    return res.status(400).json({ error: 'Missing required booking fields' });
  }

  try {
    const result = await db.query(
      `INSERT INTO bookings
         (passenger_name, passenger_email, airline, flight_number,
          departure, destination, departure_date, return_date,
          status, amount, agent_id, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [passenger_name, passenger_email, airline, flight_number,
       departure, destination, departure_date, return_date || null,
       status, amount, req.user.id, notes || null]
    );

    const booking = result.rows[0];
    await logActivity(req.user.id, 'CREATE_BOOKING', booking.id, `Created booking for ${passenger_name}`);

    res.status(201).json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// ── PATCH /api/v1/bookings/:id/cancel ──────────────────────────────────────
router.patch('/:id/cancel', authenticate, async (req, res) => {
  try {
    const booking = await db.query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
    if (booking.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (['cancelled','refunded'].includes(booking.rows[0].status)) {
      return res.status(400).json({ error: 'Booking is already cancelled or refunded' });
    }

    const result = await db.query(
      `UPDATE bookings SET status = 'cancelled' WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    await logActivity(req.user.id, 'CANCEL_BOOKING', parseInt(req.params.id), `Booking #${req.params.id} cancelled`);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// ── PATCH /api/v1/bookings/:id/refund ──────────────────────────────────────
router.patch('/:id/refund', authenticate, roleGuard('admin'), async (req, res) => {
  try {
    const booking = await db.query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
    if (booking.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.rows[0].status !== 'cancelled') {
      return res.status(400).json({ error: 'Only cancelled bookings can be refunded' });
    }

    const result = await db.query(
      `UPDATE bookings SET status = 'refunded' WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    await logActivity(req.user.id, 'REFUND_BOOKING', parseInt(req.params.id), `Booking #${req.params.id} refunded`);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

module.exports = router;
