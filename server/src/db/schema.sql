-- ============================================================
-- Travel Booking Admin Dashboard — PostgreSQL Schema
-- ============================================================

-- Drop in reverse dependency order (for safe re-runs)
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Custom ENUM types
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;

CREATE TYPE user_role AS ENUM ('admin', 'agent');
CREATE TYPE booking_status AS ENUM ('confirmed', 'pending', 'cancelled', 'refunded');

-- ── users ─────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  email        VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role         user_role NOT NULL DEFAULT 'agent',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── bookings ──────────────────────────────────────────────────────────────
CREATE TABLE bookings (
  id               SERIAL PRIMARY KEY,
  passenger_name   VARCHAR(150) NOT NULL,
  passenger_email  VARCHAR(150) NOT NULL,
  airline          VARCHAR(100) NOT NULL,
  flight_number    VARCHAR(20)  NOT NULL,
  departure        VARCHAR(100) NOT NULL,
  destination      VARCHAR(100) NOT NULL,
  departure_date   DATE         NOT NULL,
  return_date      DATE,
  status           booking_status NOT NULL DEFAULT 'pending',
  amount           DECIMAL(10, 2) NOT NULL,
  agent_id         INT REFERENCES users(id) ON DELETE SET NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── activity_logs ─────────────────────────────────────────────────────────
CREATE TABLE activity_logs (
  id         SERIAL PRIMARY KEY,
  user_id    INT REFERENCES users(id) ON DELETE SET NULL,
  action     VARCHAR(100) NOT NULL,
  target_id  INT,
  details    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX idx_bookings_status       ON bookings(status);
CREATE INDEX idx_bookings_airline      ON bookings(airline);
CREATE INDEX idx_bookings_departure_date ON bookings(departure_date);
CREATE INDEX idx_bookings_agent_id     ON bookings(agent_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);

-- ── updated_at trigger ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
