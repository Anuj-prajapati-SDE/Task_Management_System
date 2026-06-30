import React, { useState, useEffect, useCallback } from 'react';
import API from '../../utils/api';
import { format } from 'date-fns';
import { MdSearch } from 'react-icons/md';

// ===== AUDIT LOGS =====
export const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [filters, setFilters] = useState({ action: '', resource: '', startDate: '', endDate: '' });
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 50, ...filters };
      if (selectedUser) params.user = selectedUser;
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const { data } = await API.get('/audit/logs', { params });
      setLogs(data.data);
      setPagination(data.pagination);
    } catch {}
    finally { setLoading(false); }
  }, [filters, selectedUser]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { API.get('/users').then(r => setUsers(r.data.data)).catch(() => {}); }, []);

  const statusColor = (status) => status === 'success' ? 'var(--success)' : 'var(--danger)';

  return (
    <div>
      <div className="page-header"><div><h1>Audit Logs</h1><p>Track all system activity.</p></div></div>
      <div className="card">
        <div className="filter-bar">
          <select className="form-control" style={{ width: 140, fontSize: '13px', padding: '6px 10px' }} value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
            <option value="">All Users</option>
            {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
          <input className="form-control" style={{ width: 140, fontSize: '13px', padding: '6px 10px' }} placeholder="Action filter..." value={filters.action} onChange={e => setFilters({ ...filters, action: e.target.value })} />
          <select className="form-control" style={{ width: 130, fontSize: '13px', padding: '6px 10px' }} value={filters.resource} onChange={e => setFilters({ ...filters, resource: e.target.value })}>
            <option value="">All Resources</option>
            {['Tasks', 'Users', 'Teams', 'Auth', 'Notifications'].map(r => <option key={r} value={r.toLowerCase()}>{r}</option>)}
          </select>
          <input type="date" className="form-control" style={{ width: 130, fontSize: '13px', padding: '6px 10px' }} value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
          <input type="date" className="form-control" style={{ width: 130, fontSize: '13px', padding: '6px 10px' }} value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
        </div>

        {loading ? (
          <div>{[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ height: 48, marginBottom: 6 }} />)}</div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>User</th><th>Action</th><th>Resource</th><th>Status</th><th>IP</th><th>Time</th></tr></thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={6}><div className="empty-state" style={{ padding: '20px 0' }}><p>No audit logs found.</p></div></td></tr>
                ) : logs.map(log => (
                  <tr key={log._id}>
                    <td>
                      <div className="flex gap-2" style={{ alignItems: 'center' }}>
                        <div className="avatar avatar-sm" style={{ background: '#4f46e5' }}>{log.user?.name?.[0] || '?'}</div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>{log.user?.name || 'System'}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{log.user?.role}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--primary)' }}>{log.action}</td>
                    <td><span className="badge badge-gray" style={{ fontSize: 10 }}>{log.resource}</span></td>
                    <td><span style={{ fontSize: 11, color: statusColor(log.status), fontWeight: 600 }}>● {log.status}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{log.ip}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{format(new Date(log.createdAt), 'MMM d, h:mm:ss a')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination.pages > 1 && (
          <div className="pagination">
            <button className="page-btn" onClick={() => fetchLogs(pagination.page - 1)} disabled={pagination.page === 1}>‹</button>
            {[...Array(Math.min(pagination.pages, 7))].map((_, i) => (
              <button key={i} className={`page-btn ${pagination.page === i + 1 ? 'active' : ''}`} onClick={() => fetchLogs(i + 1)}>{i + 1}</button>
            ))}
            <button className="page-btn" onClick={() => fetchLogs(pagination.page + 1)} disabled={pagination.page === pagination.pages}>›</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ===== SYSTEM SETTINGS =====
export const SystemSettingsPage = () => {
  return (
    <div>
      <div className="page-header"><h1>System Settings</h1><p>Platform-wide configuration.</p></div>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        {[
          {
            title: 'Platform Info',
            items: [
              { label: 'Application Name', value: 'TaskFlow' },
              { label: 'Version', value: '1.0.0' },
              { label: 'Environment', value: import.meta.env.MODE || 'development' },
              { label: 'API URL', value: import.meta.env.VITE_API_URL },
            ]
          },
          {
            title: 'Access Control',
            items: [
              { label: 'User Registration', value: 'Enabled' },
              { label: 'Email Verification', value: 'Optional' },
              { label: 'Max Login Attempts', value: '5' },
              { label: 'Session Timeout', value: '15 minutes (JWT)' },
            ]
          },
          {
            title: 'Storage',
            items: [
              { label: 'Upload Directory', value: '/uploads' },
              { label: 'Max File Size', value: '10 MB' },
              { label: 'Allowed Types', value: 'Images, PDF, Word, Excel, ZIP' },
              { label: 'Max Files per Task', value: '5' },
            ]
          },
        ].map(section => (
          <div key={section.title} className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><span className="card-title">{section.title}</span></div>
            {section.items.map(item => (
              <div key={item.label} className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{item.value}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AuditLogsPage;
