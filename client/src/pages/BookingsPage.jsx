import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const STATUSES = ['', 'confirmed', 'pending', 'cancelled', 'refunded'];
const AIRLINES = ['', 'Emirates', 'Qatar Airways', 'Turkish Airlines', 'Lufthansa', 'British Airways', 'Air France', 'EgyptAir', 'Etihad'];

const StatusBadge = ({ status }) => (
  <span className={`badge badge-${status}`}>
    {status === 'confirmed' ? '●' : status === 'pending' ? '◐' : status === 'cancelled' ? '✕' : '↩'} {status}
  </span>
);

export default function BookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', airline: '', passenger: '', date_from: '', date_to: '' });
  const [sort, setSort] = useState({ col: 'created_at', order: 'desc' });
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchBookings = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page, limit: pagination.limit,
        sort: sort.col, order: sort.order,
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
      });
      const res = await api.get(`/bookings?${params}`);
      setBookings(res.data.data);
      setPagination(res.data.pagination);
    } catch {
      showToast('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [filters, sort, pagination.limit]);

  useEffect(() => { fetchBookings(1); }, [filters, sort]);

  const handleFilterChange = e => {
    setFilters(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSort = (col) => {
    setSort(s => ({ col, order: s.col === col && s.order === 'asc' ? 'desc' : 'asc' }));
  };

  const sortIcon = (col) => sort.col === col ? (sort.order === 'asc' ? ' ↑' : ' ↓') : '';

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/bookings/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a   = document.createElement('a');
      a.href = url;
      a.download = `bookings_${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('✅ CSV exported successfully');
    } catch {
      showToast('CSV export failed');
    } finally { setExporting(false); }
  };

  const clearFilters = () => setFilters({ status: '', airline: '', passenger: '', date_from: '', date_to: '' });

  return (
    <>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Bookings</h1>
          <p>{pagination.total} total booking{pagination.total !== 1 ? 's' : ''} found</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {user?.role === 'admin' && (
            <button id="export-csv-btn" className="btn btn-secondary" onClick={handleExport} disabled={exporting}>
              {exporting ? '⏳' : '📥'} Export CSV
            </button>
          )}
          <Link to="/bookings/new" id="new-booking-btn" className="btn btn-primary" style={{ display: 'none' }}>+ New Booking</Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <input className="form-input" name="passenger" placeholder="🔍 Passenger name" value={filters.passenger} onChange={handleFilterChange} />
        <select className="form-select" name="status" value={filters.status} onChange={handleFilterChange}>
          {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
        <select className="form-select" name="airline" value={filters.airline} onChange={handleFilterChange}>
          {AIRLINES.map(a => <option key={a} value={a}>{a || 'All Airlines'}</option>)}
        </select>
        <input className="form-input" type="date" name="date_from" value={filters.date_from} onChange={handleFilterChange} title="Departure from" />
        <input className="form-input" type="date" name="date_to" value={filters.date_to} onChange={handleFilterChange} title="Departure to" />
        <button className="btn btn-secondary btn-sm" onClick={clearFilters}>✕ Clear</button>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        {loading ? (
          <div className="loading-wrapper"><div className="spinner" /><span>Loading…</span></div>
        ) : bookings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✈️</div>
            <div className="empty-state-text">No bookings found</div>
            <div className="empty-state-sub">Try adjusting your filters</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('id')}>#ID{sortIcon('id')}</th>
                <th onClick={() => handleSort('passenger_name')}>Passenger{sortIcon('passenger_name')}</th>
                <th onClick={() => handleSort('airline')}>Airline{sortIcon('airline')}</th>
                <th>Flight</th>
                <th>Route</th>
                <th onClick={() => handleSort('departure_date')}>Departure{sortIcon('departure_date')}</th>
                <th onClick={() => handleSort('status')}>Status{sortIcon('status')}</th>
                <th onClick={() => handleSort('amount')}>Amount{sortIcon('amount')}</th>
                <th>Agent</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>#{b.id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{b.passenger_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.passenger_email}</div>
                  </td>
                  <td>{b.airline}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--accent-light)' }}>{b.flight_number}</td>
                  <td style={{ fontSize: '0.85rem' }}>{b.departure} → {b.destination}</td>
                  <td style={{ fontSize: '0.85rem' }}>{new Date(b.departure_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td style={{ fontWeight: 600, color: 'var(--success)' }}>${Number(b.amount).toLocaleString()}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{b.agent_name || '—'}</td>
                  <td>
                    <Link to={`/bookings/${b.id}`} className="btn btn-secondary btn-sm">View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && bookings.length > 0 && (
        <div className="pagination">
          <span className="pagination-info">
            Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <div className="pagination-controls">
            <button className="btn btn-secondary btn-sm" onClick={() => fetchBookings(pagination.page - 1)} disabled={pagination.page <= 1}>← Prev</button>
            {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
              const p = i + 1;
              return (
                <button key={p} className={`btn btn-sm ${p === pagination.page ? 'btn-primary' : 'btn-secondary'}`} onClick={() => fetchBookings(p)}>{p}</button>
              );
            })}
            <button className="btn btn-secondary btn-sm" onClick={() => fetchBookings(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>Next →</button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className="toast info">{toast}</div>
        </div>
      )}
    </>
  );
}
