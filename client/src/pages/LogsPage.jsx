import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';

const ACTION_ICONS = {
  CREATE_BOOKING: '➕',
  CANCEL_BOOKING: '✕',
  REFUND_BOOKING: '↩',
};
const ACTION_COLORS = {
  CREATE_BOOKING: 'var(--success)',
  CANCEL_BOOKING: 'var(--danger)',
  REFUND_BOOKING: 'var(--info)',
};

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (actionFilter) params.set('action', actionFilter);
      const res = await api.get(`/logs?${params}`);
      setLogs(res.data.data);
      setPagination(res.data.pagination);
    } finally {
      setLoading(false);
    }
  }, [actionFilter]);

  useEffect(() => { fetchLogs(1); }, [actionFilter]);

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)   return 'just now';
    if (mins < 60)  return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Activity Log</h1>
          <p>Full audit trail of all admin and agent actions</p>
        </div>
        <select
          className="form-select"
          style={{ width: 'auto', minWidth: 180 }}
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
        >
          <option value="">All Actions</option>
          <option value="CREATE_BOOKING">Create Booking</option>
          <option value="CANCEL_BOOKING">Cancel Booking</option>
          <option value="REFUND_BOOKING">Refund Booking</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="loading-wrapper"><div className="spinner" /><span>Loading logs…</span></div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-text">No activity logs yet</div>
          </div>
        ) : (
          <div>
            {logs.map((log, idx) => (
              <div key={log.id} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                padding: '16px 24px',
                borderBottom: idx < logs.length - 1 ? '1px solid var(--border-light)' : 'none',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                {/* Icon */}
                <div style={{
                  width: 36, height: 36, flexShrink: 0,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.9rem',
                  color: ACTION_COLORS[log.action] || 'var(--text-muted)',
                }}>
                  {ACTION_ICONS[log.action] || '•'}
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: ACTION_COLORS[log.action] || 'var(--text-primary)' }}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      {log.target_id && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                          — Booking #{log.target_id}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                      {timeAgo(log.created_at)}
                    </span>
                  </div>
                  {log.details && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 3 }}>{log.details}</p>
                  )}
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-faint)', marginTop: 2 }}>
                    by {log.user_name || 'Unknown'} ({log.user_role || '—'})
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="pagination">
          <span className="pagination-info">{pagination.total} total entries</span>
          <div className="pagination-controls">
            <button className="btn btn-secondary btn-sm" onClick={() => fetchLogs(pagination.page - 1)} disabled={pagination.page <= 1}>← Prev</button>
            <span style={{ padding: '5px 12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Page {pagination.page} / {pagination.totalPages}
            </span>
            <button className="btn btn-secondary btn-sm" onClick={() => fetchLogs(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>Next →</button>
          </div>
        </div>
      )}
    </>
  );
}
