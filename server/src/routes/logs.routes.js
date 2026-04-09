const express = require('express');
const db = require('../db');
const authenticate = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

const router = express.Router();

// ── GET /api/v1/logs ────────────────────────────────────────────────────────
router.get('/', authenticate, roleGuard('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, action } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (action) {
      conditions.push(`al.action = $${paramIdx++}`);
      params.push(action.toUpperCase());
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countResult, dataResult] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM activity_logs al ${whereClause}`, params),
      db.query(
        `SELECT al.*, u.name AS user_name, u.email AS user_email, u.role AS user_role
         FROM activity_logs al
         LEFT JOIN users u ON al.user_id = u.id
         ${whereClause}
         ORDER BY al.created_at DESC
         LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
        [...params, parseInt(limit), offset]
      ),
    ]);

    res.json({
      data: dataResult.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit)),
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

module.exports = router;
