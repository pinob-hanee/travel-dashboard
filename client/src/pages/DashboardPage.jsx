import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend
} from 'recharts';

const STATUS_COLORS = {
  confirmed: '#3fb950',
  pending:   '#d29922',
  cancelled: '#f85149',
  refunded:  '#58a6ff',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem' }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || 'var(--accent-light)', fontWeight: 600 }}>
          {p.name}: {typeof p.value === 'number' && p.name?.toLowerCase().includes('revenue') ? `$${p.value.toLocaleString()}` : p.value}
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/stats')
      .then(r => setStats(r.data))
      .catch(() => setError('Failed to load stats'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-wrapper"><div className="spinner" /><span>Loading dashboard...</span></div>;
  if (error)   return <p style={{ color: 'var(--danger)' }}>{error}</p>;

  const { totals, byStatus, byAirline, revenueByMonth } = stats;

  const statCards = [
    { label: 'Total Bookings',     value: totals.total_bookings,                  icon: '🎫', color: 'accent' },
    { label: 'Total Revenue',      value: `$${Number(totals.total_revenue).toLocaleString()}`, icon: '💰', color: 'success' },
    { label: 'Confirmed',          value: totals.confirmed,                        icon: '✅', color: 'success' },
    { label: 'Pending',            value: totals.pending,                          icon: '⏳', color: 'warning' },
    { label: 'Cancelled',          value: totals.cancelled,                        icon: '❌', color: 'danger' },
    { label: 'Unique Passengers',  value: totals.unique_passengers,               icon: '👤', color: 'info' },
  ];

  return (
    <>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
          <p>Here's what's happening across all bookings today.</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        {statCards.map(card => (
          <div key={card.label} className={`stat-card ${card.color}`}>
            <div className={`stat-icon ${card.color}`}>{card.icon}</div>
            <div>
              <div className="stat-value">{card.value}</div>
              <div className="stat-label">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Revenue Area Chart */}
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>💹 Revenue — Last 6 Months</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueByMonth}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={v => `$${v.toLocaleString()}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#2563eb" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status Pie */}
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>🥧 Booking Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {byStatus.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#8b949e'} />
                ))}
              </Pie>
              <Tooltip formatter={(v, name) => [v, name.charAt(0).toUpperCase() + name.slice(1)]} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.82rem' }} />
              <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'capitalize' }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Airlines Bar */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ marginBottom: 20 }}>✈️ Top Airlines by Bookings</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byAirline} layout="vertical" margin={{ left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis type="category" dataKey="airline" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} width={120} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Bookings" fill="#2563eb" radius={[0, 4, 4, 0]}>
                {byAirline.map((_, i) => (
                  <Cell key={i} fill={`hsl(${216 + i * 12}, 70%, ${55 - i * 3}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
