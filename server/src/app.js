const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const bookingRoutes = require('./routes/bookings.routes');
const statsRoutes = require('./routes/stats.routes');
const logRoutes = require('./routes/logs.routes');

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, cb) => {
    const allowed = [
      process.env.CLIENT_URL || 'http://localhost:5173',
      'http://localhost:5173',
      'http://localhost:3000',
    ];
    // Allow any Vercel preview / production URL
    if (!origin || allowed.includes(origin) || /\.vercel\.app$/.test(origin)) {
      return cb(null, true);
    }
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Request logger (dev) ────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ── Routes — mounted at both /v1/* and /api/v1/* ─────────────────────────────
// Vercel may or may not strip the /api prefix depending on routing config.
// Dual mounting guarantees it works in both cases.
app.use('/v1/auth',         authRoutes);
app.use('/v1/bookings',     bookingRoutes);
app.use('/v1/stats',        statsRoutes);
app.use('/v1/logs',         logRoutes);

app.use('/api/v1/auth',     authRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/stats',    statsRoutes);
app.use('/api/v1/logs',     logRoutes);

// ── Health / root ─────────────────────────────────────────────────────────────
const healthHandler = (_req, res) => {
  res.json({ status: 'ok', service: 'TravelDash API', timestamp: new Date().toISOString() });
};
app.get('/',          healthHandler);
app.get('/v1/health', healthHandler);
app.get('/api/v1/health', healthHandler);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

module.exports = app;
