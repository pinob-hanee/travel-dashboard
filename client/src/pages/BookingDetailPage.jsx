import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const StatusBadge = ({ status }) => (
  <span className={`badge badge-${status}`} style={{ fontSize: '0.9rem', padding: '5px 14px' }}>
    {status}
  </span>
);

const ConfirmModal = ({ title, message, onConfirm, onCancel, confirmLabel, confirmClass = 'btn-danger' }) => (
  <div className="modal-overlay" onClick={onCancel}>
    <div className="modal" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <div className="modal-title">{title}</div>
      </div>
      <div className="modal-body">{message}</div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className={`btn ${confirmClass}`} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </div>
  </div>
);

export default function BookingDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'cancel' | 'refund' | null
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null); // { msg, type }

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    api.get(`/bookings/${id}`)
      .then(r => setBooking(r.data))
      .catch(() => navigate('/bookings'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      const res = await api.patch(`/bookings/${id}/cancel`);
      setBooking(res.data);
      showToast('✅ Booking cancelled successfully', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Cancel failed', 'error');
    } finally { setActionLoading(false); setModal(null); }
  };

  const handleRefund = async () => {
    setActionLoading(true);
    try {
      const res = await api.patch(`/bookings/${id}/refund`);
      setBooking(res.data);
      showToast('✅ Refund processed successfully', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Refund failed', 'error');
    } finally { setActionLoading(false); setModal(null); }
  };

  if (loading) return <div className="loading-wrapper"><div className="spinner" /><span>Loading booking...</span></div>;
  if (!booking) return null;

  const fields = [
    { key: 'Passenger',        value: booking.passenger_name },
    { key: 'Email',            value: booking.passenger_email },
    { key: 'Airline',          value: booking.airline },
    { key: 'Flight Number',    value: <code style={{ color: 'var(--accent-light)', fontFamily: 'monospace' }}>{booking.flight_number}</code> },
    { key: 'From',             value: booking.departure },
    { key: 'To',               value: booking.destination },
    { key: 'Departure Date',   value: new Date(booking.departure_date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' }) },
    { key: 'Return Date',      value: booking.return_date ? new Date(booking.return_date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' }) : '— One-way' },
    { key: 'Amount',           value: <strong style={{ color: 'var(--success)', fontSize: '1.1rem' }}>${Number(booking.amount).toLocaleString()}</strong> },
    { key: 'Status',           value: <StatusBadge status={booking.status} /> },
    { key: 'Booked by Agent',  value: booking.agent_name || '—' },
    { key: 'Agent Email',      value: booking.agent_email || '—' },
    { key: 'Booking Date',     value: new Date(booking.created_at).toLocaleString('en-GB') },
    { key: 'Last Updated',     value: new Date(booking.updated_at).toLocaleString('en-GB') },
  ];

  if (booking.notes) {
    fields.push({ key: 'Notes', value: booking.notes });
  }

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-text">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            Booking #{booking.id}
            <StatusBadge status={booking.status} />
          </h1>
          <p>{booking.passenger_name} · {booking.airline} {booking.flight_number} · {booking.departure} → {booking.destination}</p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/bookings" className="btn btn-secondary">← Back</Link>
          {!['cancelled','refunded'].includes(booking.status) && (
            <button id="cancel-booking-btn" className="btn btn-danger" onClick={() => setModal('cancel')}>
              ✕ Cancel Booking
            </button>
          )}
          {user?.role === 'admin' && booking.status === 'cancelled' && (
            <button id="refund-booking-btn" className="btn btn-success" onClick={() => setModal('refund')}>
              ↩ Process Refund
            </button>
          )}
        </div>
      </div>

      {/* Details Card */}
      <div className="card">
        <h3 style={{ marginBottom: 16 }}>📋 Booking Details</h3>
        {fields.map(({ key, value }) => (
          <div key={key} className="detail-row">
            <span className="detail-key">{key}</span>
            <span className="detail-value">{value}</span>
          </div>
        ))}
      </div>

      {/* Modals */}
      {modal === 'cancel' && (
        <ConfirmModal
          title="Cancel Booking"
          message={`Are you sure you want to cancel booking #${booking.id} for ${booking.passenger_name}? This action can be reversed with a refund later.`}
          confirmLabel={actionLoading ? 'Cancelling…' : 'Yes, Cancel'}
          onConfirm={handleCancel}
          onCancel={() => setModal(null)}
        />
      )}

      {modal === 'refund' && (
        <ConfirmModal
          title="Process Refund"
          message={`Issue a refund of $${Number(booking.amount).toLocaleString()} for booking #${booking.id}? The booking status will be updated to Refunded.`}
          confirmLabel={actionLoading ? 'Processing…' : 'Yes, Refund'}
          confirmClass="btn-success"
          onConfirm={handleRefund}
          onCancel={() => setModal(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>{toast.msg}</div>
        </div>
      )}
    </>
  );
}
