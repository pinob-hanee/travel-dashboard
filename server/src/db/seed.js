require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { pool } = require('../db');

// ── Seed Users ─────────────────────────────────────────────────────────────
const users = [
  { name: 'Admin User',    email: 'admin@traveldash.com',  password: 'admin123',  role: 'admin' },
  { name: 'Sarah Mitchell', email: 'sarah@traveldash.com',  password: 'agent123',  role: 'agent' },
  { name: 'James Okafor',   email: 'james@traveldash.com',  password: 'agent123',  role: 'agent' },
];

// ── Seed Bookings ──────────────────────────────────────────────────────────
const airlines = ['Emirates', 'Qatar Airways', 'Turkish Airlines', 'Lufthansa', 'British Airways', 'Air France', 'EgyptAir', 'Etihad'];
const routes = [
  ['Cairo', 'Dubai'],       ['London', 'New York'],    ['Paris', 'Tokyo'],
  ['Dubai', 'Singapore'],   ['Istanbul', 'Berlin'],    ['Cairo', 'London'],
  ['New York', 'Los Angeles'], ['Sydney', 'Singapore'], ['Toronto', 'Dubai'],
  ['Frankfurt', 'Cape Town'],
];
const statuses = ['confirmed', 'pending', 'cancelled', 'refunded'];
const passengers = [
  ['Ahmed Hassan', 'ahmed.hassan@email.com'],
  ['Mia Johnson', 'mia.j@email.com'],
  ['Carlos Rivera', 'carlos.r@email.com'],
  ['Yuki Tanaka', 'yuki.t@email.com'],
  ['Fatima Al-Rashid', 'fatima.ar@email.com'],
  ['Liam O\'Brien', 'liam.ob@email.com'],
  ['Priya Sharma', 'priya.s@email.com'],
  ['Mohammed Al-Farsi', 'moh.alfarsi@email.com'],
  ['Sofia Müller', 'sofia.m@email.com'],
  ['David Chen', 'david.chen@email.com'],
  ['Amira Benali', 'amira.b@email.com'],
  ['Lucas Petit', 'lucas.p@email.com'],
];

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomDate(daysFromNow, spread = 120) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow + randomBetween(0, spread));
  return d.toISOString().split('T')[0];
}
function randomAmount() {
  return (randomBetween(150, 2800) + 0.99).toFixed(2);
}
function flightNumber(airline) {
  const codes = { Emirates: 'EK', 'Qatar Airways': 'QR', 'Turkish Airlines': 'TK', Lufthansa: 'LH', 'British Airways': 'BA', 'Air France': 'AF', EgyptAir: 'MS', Etihad: 'EY' };
  return (codes[airline] || 'XX') + randomBetween(100, 999);
}

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Starting seed...\n');

    // ── Insert users ──────────────────────────────────────────────────────
    const userIds = [];
    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 10);
      const result = await client.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [u.name, u.email, hash, u.role]
      );
      userIds.push(result.rows[0].id);
      console.log(`✅ User: ${u.email} (${u.role})`);
    }

    const agentIds = userIds.slice(1); // Sarah + James

    // ── Insert 45 bookings ────────────────────────────────────────────────
    const statusWeights = [
      ...Array(20).fill('confirmed'),
      ...Array(12).fill('pending'),
      ...Array(8).fill('cancelled'),
      ...Array(5).fill('refunded'),
    ];

    for (let i = 0; i < 45; i++) {
      const airline = randomChoice(airlines);
      const [departure, destination] = randomChoice(routes);
      const passenger = randomChoice(passengers);
      const status = randomChoice(statusWeights);
      const depDate = randomDate(-90, 180);
      const hasReturn = Math.random() > 0.4;
      const returnDate = hasReturn ? randomDate(7, 14) : null;
      const agentId = randomChoice(agentIds);

      await client.query(
        `INSERT INTO bookings
           (passenger_name, passenger_email, airline, flight_number,
            departure, destination, departure_date, return_date,
            status, amount, agent_id, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
                 NOW() - INTERVAL '1 day' * $12)`,
        [
          passenger[0], passenger[1], airline,
          flightNumber(airline), departure, destination,
          depDate, returnDate, status,
          randomAmount(), agentId,
          randomBetween(0, 180),
        ]
      );
    }
    console.log('✅ 45 bookings inserted\n');

    // ── Activity logs ─────────────────────────────────────────────────────
    const bookingRows = await client.query('SELECT id, status FROM bookings LIMIT 20');
    for (const b of bookingRows.rows) {
      const userId = randomChoice(userIds);
      const action = b.status === 'cancelled'
        ? 'CANCEL_BOOKING'
        : b.status === 'refunded'
          ? 'REFUND_BOOKING'
          : 'CREATE_BOOKING';

      await client.query(
        `INSERT INTO activity_logs (user_id, action, target_id, details, created_at)
         VALUES ($1, $2, $3, $4, NOW() - INTERVAL '1 hour' * $5)`,
        [userId, action, b.id, `Booking #${b.id} — ${action.replace('_', ' ').toLowerCase()}`, randomBetween(1, 720)]
      );
    }
    console.log('✅ Activity logs inserted\n');

    console.log('──────────────────────────────────────────');
    console.log('🎉 Seed complete!\n');
    console.log('Login credentials:');
    console.log('  Admin  → admin@traveldash.com  / admin123');
    console.log('  Agent  → sarah@traveldash.com  / agent123');
    console.log('  Agent  → james@traveldash.com  / agent123');
    console.log('──────────────────────────────────────────\n');
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
