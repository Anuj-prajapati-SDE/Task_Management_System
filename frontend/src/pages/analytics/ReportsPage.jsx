import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import API from '../../utils/api';
import { format, subDays, subMonths } from 'date-fns';
import { MdDownload } from 'react-icons/md';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7'];

const ReportsPage = () => {
  const [dashboard, setDashboard] = useState(null);
  const [productivity, setProductivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prodFilter, setProdFilter] = useState({ startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'), endDate: format(new Date(), 'yyyy-MM-dd') });
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, usersRes] = await Promise.all([API.get('/analytics/dashboard/admin'), API.get('/users')]);
        setDashboard(dashRes.data.data);
        setUsers(usersRes.data.data);
      } catch {}
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchProd = async () => {
      try {
        const params = { ...prodFilter };
        if (selectedUser) params.userId = selectedUser;
        const { data } = await API.get('/analytics/productivity', { params });
        setProductivity(data.data);
      } catch {}
    };
    fetchProd();
  }, [prodFilter, selectedUser]);

  const handleExport = () => {
    if (!productivity?.tasks?.length) return;

    const headers = ['Task Title', 'Assignee', 'Priority', 'Completed Date', 'Time Spent (Mins)'];
    const csvRows = [headers.join(',')];

    productivity.tasks.forEach(t => {
      const title = `"${(t.title || '').replace(/"/g, '""')}"`;
      const assignee = `"${t.assignee?.name || 'Unassigned'}"`;
      const priority = t.priority || 'medium';
      const completedDate = t.completedAt ? format(new Date(t.completedAt), 'yyyy-MM-dd') : '—';
      const timeSpent = t.totalTimeSpent || 0;
      csvRows.push([title, assignee, priority, completedDate, timeSpent].join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `productivity_report_${prodFilter.startDate}_to_${prodFilter.endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statusColors = { pending: '#f59e0b', in_progress: '#3b82f6', review: '#a855f7', completed: '#10b981', cancelled: '#94a3b8' };

  if (loading) return <div className="skeleton" style={{ height: 400, borderRadius: 12 }} />;

  return (
    <div>
      <div className="page-header">
        <div><h1>Reports & Analytics</h1><p>Insights into team performance and task trends.</p></div>
      </div>

      {/* Overview Stats */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Users', value: dashboard?.stats?.totalUsers || 0, color: '#4f46e5' },
          { label: 'Total Tasks', value: dashboard?.stats?.totalTasks || 0, color: '#3b82f6' },
          { label: 'Completed', value: dashboard?.stats?.completedTasks || 0, color: '#10b981' },
          { label: 'Overdue', value: dashboard?.stats?.overdueTasks || 0, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Monthly Trend */}
        <div className="card">
          <div className="card-header"><span className="card-title">Monthly Trend (6 Months)</span></div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={dashboard?.monthlyTrend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="created" stroke="#4f46e5" name="Created" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="completed" stroke="#10b981" name="Completed" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Tasks by Status Pie */}
        <div className="card">
          <div className="card-header"><span className="card-title">Task Distribution</span></div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={dashboard?.tasksByStatus?.map(s => ({ name: s._id.replace('_', ' '), value: s.count })) || []}
                cx="50%" cy="50%" outerRadius={90} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {dashboard?.tasksByStatus?.map((s, i) => <Cell key={i} fill={statusColors[s._id] || COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Priority Distribution */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Tasks by Priority</span></div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dashboard?.tasksByPriority?.map(p => ({ name: p._id, value: p.count })) || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {dashboard?.tasksByPriority?.map((p, i) => (
                  <Cell key={i} fill={p._id === 'urgent' ? '#ef4444' : p._id === 'high' ? '#f59e0b' : p._id === 'medium' ? '#3b82f6' : '#10b981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Performers */}
        <div className="card">
          <div className="card-header"><span className="card-title">Top Performers (30 Days)</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {dashboard?.topPerformers?.filter(p => p.user?.role !== 'superadmin').map((p, i) => (
              <div key={i} className="flex-between" style={{ flexWrap: 'wrap', gap: '8px' }}>
                <div className="flex gap-2" style={{ alignItems: 'center' }}>
                  <div style={{ width: 24, fontWeight: 700, color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#92400e' : 'var(--text-muted)', fontSize: 14 }}>#{i + 1}</div>
                  <div className="avatar avatar-sm" style={{ background: '#4f46e5' }}>{p.user?.name?.[0]}</div>
                  <span style={{ fontSize: 13 }}>{p.user?.name}</span>
                </div>
                <div className="flex gap-2" style={{ alignItems: 'center' }}>
                  <div className="progress-bar" style={{ width: 80 }}>
                    <div className="progress" style={{ width: `${Math.min(p.count * 5, 100)}%` }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, minWidth: 24 }}>{p.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Productivity Report */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
          <span className="card-title">Productivity Report</span>
          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            <input type="date" className="form-control" style={{ width: 130, fontSize: '13px', padding: '6px 10px' }} value={prodFilter.startDate}
              onChange={e => setProdFilter({ ...prodFilter, startDate: e.target.value })} />
            <span style={{ alignSelf: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>to</span>
            <input type="date" className="form-control" style={{ width: 130, fontSize: '13px', padding: '6px 10px' }} value={prodFilter.endDate}
              onChange={e => setProdFilter({ ...prodFilter, endDate: e.target.value })} />
            <select className="form-control" style={{ width: 150, fontSize: '13px', padding: '6px 10px' }} value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
              <option value="">All Users</option>
              {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
            <button type="button" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 12px' }} onClick={handleExport} disabled={!productivity?.tasks?.length}>
              <MdDownload /> Export CSV
            </button>
          </div>
        </div>
        <div className="flex gap-4" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px', textAlign: 'center', padding: '12px 20px', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)' }}>{productivity?.totalCompleted || 0}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tasks Completed</div>
          </div>
          <div style={{ flex: '1 1 200px', textAlign: 'center', padding: '12px 20px', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--success)' }}>
              {Math.floor((productivity?.totalTimeSpent || 0) / 60)}h {(productivity?.totalTimeSpent || 0) % 60}m
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Time Spent</div>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Task</th><th>Assignee</th><th>Priority</th><th>Completed</th><th>Time Spent</th></tr></thead>
            <tbody>
              {productivity?.tasks?.length === 0 ? (
                <tr><td colSpan={5}><div className="empty-state" style={{ padding: '20px 0' }}><p>No data for selected period.</p></div></td></tr>
              ) : productivity?.tasks?.map(t => (
                <tr key={t._id}>
                  <td style={{ fontWeight: 500 }}>{t.title}</td>
                  <td style={{ fontSize: 12 }}>{t.assignee?.name || '—'}</td>
                  <td><span className={`badge priority-${t.priority}`}>{t.priority}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.completedAt ? format(new Date(t.completedAt), 'MMM d, yyyy') : '—'}</td>
                  <td style={{ fontSize: 12 }}>{t.totalTimeSpent ? `${Math.floor(t.totalTimeSpent / 60)}h ${t.totalTimeSpent % 60}m` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
