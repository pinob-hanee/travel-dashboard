# ✈️ TravelDash — Travel Booking Admin Dashboard

A full-stack admin dashboard for managing travel bookings, agents, and analytics.

**Stack:** React 18 · Vite · Node.js · Express · PostgreSQL · Recharts · JWT Auth

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL (running locally)

### 1. Clone & Setup
```bash
git clone https://github.com/YOUR_USERNAME/travel-dashboard.git
cd travel-dashboard
```

### 2. Configure the Server
```bash
cd server
cp .env.example .env
# Edit .env — set your DB_PASSWORD
```

### 3. Create Database & Run Migrations
```bash
# Create the database first (in psql):
psql -U postgres -c "CREATE DATABASE travel_dashboard;"

# Run schema migration:
npm run db:init

# Seed demo data (45 bookings, 3 users):
npm run db:seed
```

**Demo Credentials after seed:**
| Role  | Email | Password |
|-------|-------|----------|
| Admin | admin@traveldash.com | admin123 |
| Agent | sarah@traveldash.com | agent123 |
| Agent | james@traveldash.com | agent123 |

### 4. Install & Run

**Backend (port 5000):**
```bash
cd server
npm install
npm run dev
```

**Frontend (port 5173):**
```bash
cd client
npm install
npm run dev
```

Open **http://localhost:5173**

---

## 📋 Features

### Authentication
- JWT-based login / register
- Role-based access: **Admin** vs **Agent**
- Persistent sessions (localStorage)

### Bookings
- Filterable table: status, airline, passenger, date range
- Sortable columns with pagination
- Booking detail page with full info
- Cancel booking (with confirmation modal)
- Process refund (admin only, confirmation modal)
- **CSV export** of all bookings (admin only)

### Dashboard
- Live stat cards: total bookings, revenue, confirmed, pending, cancelled, unique passengers
- Revenue area chart (last 6 months)
- Booking status donut chart
- Top airlines horizontal bar chart

### Activity Log (Admin only)
- Full audit trail of all actions
- Timeline view with colour-coded action types
- Relative timestamps, filterable by action type

---

## 🗄️ Database Schema

```
users           → id, name, email, password_hash, role, created_at
bookings        → id, passenger_*, airline, flight_number, departure, destination,
                   departure_date, return_date, status, amount, agent_id, notes
activity_logs   → id, user_id, action, target_id, details, created_at
```

---

## 🛣️ API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/register` | — | Register |
| POST | `/api/v1/auth/login` | — | Login → JWT |
| GET  | `/api/v1/auth/me` | ✅ | Current user |
| GET  | `/api/v1/bookings` | ✅ | List + filters + pagination |
| GET  | `/api/v1/bookings/export` | Admin | CSV export |
| GET  | `/api/v1/bookings/:id` | ✅ | Detail |
| POST | `/api/v1/bookings` | ✅ | Create |
| PATCH | `/api/v1/bookings/:id/cancel` | ✅ | Cancel |
| PATCH | `/api/v1/bookings/:id/refund` | Admin | Refund |
| GET  | `/api/v1/stats` | ✅ | Dashboard stats |
| GET  | `/api/v1/logs` | Admin | Activity log |
| GET  | `/api/v1/health` | — | Health check |

---

## 📁 Project Structure

```
travel-dashboard/
├── client/                 # React + Vite frontend
│   └── src/
│       ├── api/            # Axios instance
│       ├── components/     # Reusable components
│       │   └── layout/     # AppLayout (sidebar + topbar)
│       ├── context/        # AuthContext
│       └── pages/          # LoginPage, DashboardPage, BookingsPage, ...
│
└── server/                 # Node.js + Express backend
    └── src/
        ├── db/             # schema.sql, init.js, seed.js
        ├── middleware/     # auth.js, roleGuard.js
        └── routes/         # auth, bookings, stats, logs
```

---

## 🎨 Design

- Dark GitHub-inspired theme (`#0d1117` background)
- CSS design tokens (no framework)
- Inter font (Google Fonts)
- Status badges, micro-animations, hover effects
- Glassmorphism topbar with backdrop blur
