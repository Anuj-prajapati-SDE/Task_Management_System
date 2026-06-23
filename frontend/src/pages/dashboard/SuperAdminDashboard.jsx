import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import API from '../../utils/api';
import { format, subDays } from 'date-fns';
import {
  MdPeople, MdAssignment, MdGroup, MdSecurity, MdHistory,
  MdArrowForward, MdTrendingUp, MdTrendingDown, MdPersonAdd,
  MdCheckCircle, MdCancel, MdWarning, MdBarChart, MdSettings,
  MdRefresh, MdAdminPanelSettings
} from 'react-icons/md';

const ROLE_COLORS = { user: '#4f46e5', admin: '#10b981', superadmin: '#a855f7' };
const STATUS_COLORS = { pending: '#f59e0b', in_progress: '#3b82f6', review: '#a855f7', completed: '#10b981', cancelled: '#94a3b8' };

// ---- Mini stat card ----
const StatCard = ({ icon, label, value, sub, color, bg, trend, onClick }) => (
  <div className="stat-card" style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
    <div className="stat-icon" style={{ background: bg, color }}>{icon}</div>
    <div className="stat-value">{value}</div>
    <div className="stat-label">{label}</div>
    {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    {trend !== undefined && (
      <div className={`stat-change ${trend >= 0 ? 'up' : 'down'}`}>
        {trend >= 0 ? <MdTrendingUp /> : <MdTrendingDown />}
        {Math.abs(trend)}% vs last month
      </div>
    )}
  </div>
);

// ---- Role badge ----
const RoleBadge = ({ role }) => {
  const map = { superadmin: 'danger', admin: 'warning', user: 'primary' };
  return <span className={`badge badge-${map[role] || 'gray'}`}>{role}</span>;
};

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [adminData, setAdminData] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  const fetchAll = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [overviewRes, adminRes, usersRes, tasksRes] = await Promise.all([
        API.get('/analytics/dashboard/superadmin'),
        API.get('/analytics/dashboard/admin'),
        API.get('/users?limit=100'),
        API.get('/tasks?limit=100&sortBy=createdAt&sortOrder=desc'),
      ]);
      setOverview(overviewRes.data.data);
      setAdminData(adminRes.data.data);
      setAllUsers(usersRes.data.data || []);
      setAllTasks(tasksRes.data.data || []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ---- Derived stats ----
  const stats = overview?.stats || {};
  const adminStats = adminData?.stats || {};

  const activeUsers = allUsers.filter(u => u.isActive).length;
  const inactiveUsers = allUsers.filter(u => !u.isActive).length;
  const verifiedUsers = allUsers.filter(u => u.isEmailVerified).length;
  const usersByRole = overview?.usersByRole || [];
  const recentUsers = (overview?.recentUsers || []).filter(u => u.role !== 'superadmin').slice(0, 8);

  const overdueTasks = allTasks.filter(t =>
    t.dueDate && new Date(t.dueDate) < new Date() && !['completed', 'cancelled'].includes(t.status)
  ).length;

  const completionRate = stats.totalTasks > 0
    ? Math.round((adminStats.completedTasks / stats.totalTasks) * 100)
    : 0;

  // Registration trend – group recent users by day (last 7 days)
  const registrationTrend = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    const dateStr = format(day, 'yyyy-MM-dd');
    const count = allUsers.filter(u =>
      format(new Date(u.createdAt), 'yyyy-MM-dd') === dateStr
    ).length;
    return { date: format(day, 'EEE'), count };
  });

  // Department breakdown
  const deptMap = {};
  allUsers.forEach(u => {
    const dept = u.department || 'Unassigned';
    deptMap[dept] = (deptMap[dept] || 0) + 1;
  });
  const departmentData = Object.entries(deptMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Task status breakdown for pie
  const taskStatusData = (adminData?.tasksByStatus || []).map(s => ({
    name: s._id.replace('_', ' '),
    value: s.count,
  }));

  if (loading) return (
    <div>
      <div className="page-header">
        <div><h1>Super Admin Dashboard</h1><p>Loading platform data…</p></div>
      </div>
      <div className="stat-grid">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 130, borderRadius: 12 }} />
        ))}
      </div>
      <div className="grid-2" style={{ marginTop: 20 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 260, borderRadius: 12 }} />
        ))}
      </div>
    </div>
  );

  return (
    <div>
      {/* ===== HEADER ===== */}
      <div className="page-header">
        <div>
          <div className="flex gap-2" style={{ alignItems: 'center', marginBottom: 4 }}>
            <MdAdminPanelSettings style={{ fontSize: 28, color: 'var(--primary)' }} />
            <h1 style={{ margin: 0 }}>Super Admin Dashboard</h1>
          </div>
          <p>Full platform control — {format(new Date(), 'EEEE, MMMM d yyyy')}</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => fetchAll(true)} disabled={refreshing}
            style={{ gap: 6 }}>
            <MdRefresh style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/audit-logs')}>
            <MdHistory /> Audit Logs
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/reports')}>
            <MdBarChart /> Reports
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/users/create')}>
            <MdPersonAdd /> Add User
          </button>
        </div>
      </div>

      {/* ===== SECTION TABS ===== */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'users', label: 'Users' },
          { id: 'tasks', label: 'Tasks' },
          { id: 'system', label: 'System' },
        ].map(tab => (
          <div key={tab.id} className={`tab ${activeSection === tab.id ? 'active' : ''}`}
            onClick={() => setActiveSection(tab.id)}>
            {tab.label}
          </div>
        ))}
      </div>

      {/* ============================= OVERVIEW ============================= */}
      {activeSection === 'overview' && (
        <>
          {/* Stat Grid */}
          <div className="stat-grid" style={{ marginBottom: 24 }}>
            <StatCard icon={<MdPeople />} label="Total Users" value={stats.totalUsers || 0}
              sub={`${activeUsers} active · ${inactiveUsers} inactive`}
              color="#4f46e5" bg="rgba(79,70,229,0.1)" onClick={() => navigate('/users')} />
            <StatCard icon={<MdAssignment />} label="Total Tasks" value={stats.totalTasks || 0}
              sub={`${completionRate}% completion rate`}
              color="#3b82f6" bg="rgba(59,130,246,0.1)" onClick={() => navigate('/tasks')} />
            <StatCard icon={<MdCheckCircle />} label="Completed Tasks" value={adminStats.completedTasks || 0}
              color="#10b981" bg="rgba(16,185,129,0.1)" />
            <StatCard icon={<MdGroup />} label="Teams" value={stats.totalTeams || 0}
              color="#a855f7" bg="rgba(168,85,247,0.1)" onClick={() => navigate('/teams')} />
            <StatCard icon={<MdWarning />} label="Overdue Tasks" value={overdueTasks}
              color="#ef4444" bg="rgba(239,68,68,0.1)" />
            <StatCard icon={<MdCheckCircle />} label="Verified Users" value={verifiedUsers}
              sub={`${Math.round((verifiedUsers / (stats.totalUsers || 1)) * 100)}% of total`}
              color="#06b6d4" bg="rgba(6,182,212,0.1)" />
            <StatCard icon={<MdPeople />} label="Active Users" value={activeUsers}
              color="#10b981" bg="rgba(16,185,129,0.1)" />
            <StatCard icon={<MdCancel />} label="Inactive Users" value={inactiveUsers}
              color="#94a3b8" bg="rgba(148,163,184,0.1)" />
          </div>

          {/* Charts Row 1 */}
          <div className="grid-2" style={{ marginBottom: 20 }}>
            {/* Monthly Task Trend */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Monthly Task Trend (6 Months)</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={adminData?.monthlyTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Legend />
                  <Line type="monotone" dataKey="created" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} name="Created" />
                  <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Completed" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Task Status Pie */}
            <div className="card">
              <div className="card-header"><span className="card-title">Task Status Distribution</span></div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={taskStatusData} cx="50%" cy="50%" outerRadius={85} innerRadius={40}
                    dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}>
                    {taskStatusData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name.replace(' ', '_')] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid-2" style={{ marginBottom: 20 }}>
            {/* Users by Role Pie */}
            <div className="card">
              <div className="card-header"><span className="card-title">Users by Role</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <ResponsiveContainer width="60%" height={200}>
                  <PieChart>
                    <Pie data={usersByRole.map(r => ({ name: r._id, value: r.count }))}
                      cx="50%" cy="50%" outerRadius={80} dataKey="value">
                      {usersByRole.map((r, i) => <Cell key={i} fill={ROLE_COLORS[r._id] || '#94a3b8'} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {usersByRole.map((r, i) => (
                    <div key={i} className="flex-between">
                      <div className="flex gap-2" style={{ alignItems: 'center' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: ROLE_COLORS[r._id] || '#94a3b8' }} />
                        <span style={{ fontSize: 13, textTransform: 'capitalize' }}>{r._id}</span>
                      </div>
                      <div className="flex gap-2" style={{ alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{r.count}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          ({Math.round((r.count / (stats.totalUsers || 1)) * 100)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* New Registrations (7 days) */}
            <div className="card">
              <div className="card-header"><span className="card-title">New Registrations (Last 7 Days)</span></div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={registrationTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Registrations" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Performers */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <span className="card-title">Top Performers (Last 30 Days)</span>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/reports')}>
                Full Report <MdArrowForward />
              </button>
            </div>
            {adminData?.topPerformers?.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <p>No completed tasks in the last 30 days.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr><th>#</th><th>User</th><th>Department</th><th>Tasks Completed</th><th>Progress</th></tr>
                  </thead>
                  <tbody>
                    {adminData?.topPerformers?.map((p, i) => (
                      <tr key={i} style={{ cursor: 'pointer' }} onClick={() => navigate(`/users/${p._id}`)}>
                        <td>
                          <span style={{ fontWeight: 700, color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#92400e' : 'var(--text-muted)' }}>
                            #{i + 1}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-2" style={{ alignItems: 'center' }}>
                            <div className="avatar avatar-sm" style={{ background: '#4f46e5' }}>{p.user?.name?.[0]}</div>
                            <div>
                              <div style={{ fontWeight: 500, fontSize: 13 }}>{p.user?.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.user?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {allUsers.find(u => u._id === p._id?.toString())?.department || '—'}
                        </td>
                        <td><strong style={{ color: 'var(--primary)', fontSize: 16 }}>{p.count}</strong></td>
                        <td style={{ width: 160 }}>
                          <div className="flex gap-2" style={{ alignItems: 'center' }}>
                            <div className="progress-bar" style={{ flex: 1 }}>
                              <div className="progress" style={{ width: `${Math.min(p.count * 8, 100)}%` }} />
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 28 }}>{p.count}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ============================= USERS ============================= */}
      {activeSection === 'users' && (
        <>
          <div className="stat-grid" style={{ marginBottom: 20 }}>
            {[
              { label: 'Total Users', value: stats.totalUsers || 0, color: '#4f46e5' },
              { label: 'Super Admins', value: usersByRole.find(r => r._id === 'superadmin')?.count || 0, color: '#a855f7' },
              { label: 'Admins', value: usersByRole.find(r => r._id === 'admin')?.count || 0, color: '#10b981' },
              { label: 'Regular Users', value: usersByRole.find(r => r._id === 'user')?.count || 0, color: '#3b82f6' },
              { label: 'Active', value: activeUsers, color: '#10b981' },
              { label: 'Inactive', value: inactiveUsers, color: '#94a3b8' },
            ].map((s, i) => (
              <div key={i} className="stat-card">
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="grid-2" style={{ marginBottom: 20 }}>
            {/* Department breakdown */}
            <div className="card">
              <div className="card-header"><span className="card-title">Users by Department</span></div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={departmentData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Bar dataKey="value" fill="#4f46e5" radius={[0, 4, 4, 0]} name="Users" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Registration trend */}
            <div className="card">
              <div className="card-header"><span className="card-title">Registration Trend (7 Days)</span></div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={registrationTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4, fill: '#4f46e5' }} name="New Users" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Users Table */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Recent Users</span>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/users')}>
                View All Users <MdArrowForward />
              </button>
            </div>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>User</th><th>Role</th><th>Department</th><th>Status</th><th>Verified</th><th>Joined</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {recentUsers.map(u => (
                    <tr key={u._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/users/${u._id}`)}>
                      <td>
                        <div className="flex gap-2" style={{ alignItems: 'center' }}>
                          <div className="avatar avatar-sm" style={{ background: '#4f46e5' }}>
                            {u.avatar
                              ? <img src={`http://localhost:5000${u.avatar}`} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                              : u.name?.[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500, fontSize: 13 }}>{u.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><RoleBadge role={u.role} /></td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.department || '—'}</td>
                      <td>
                        <span className={`badge ${u.isActive ? 'badge-success' : 'badge-gray'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        {u.isEmailVerified
                          ? <MdCheckCircle style={{ color: 'var(--success)', fontSize: 18 }} />
                          : <MdCancel style={{ color: 'var(--text-light)', fontSize: 18 }} />}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {format(new Date(u.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); navigate(`/users/${u._id}`); }}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ============================= TASKS ============================= */}
      {activeSection === 'tasks' && (
        <>
          <div className="stat-grid" style={{ marginBottom: 20 }}>
            {[
              { label: 'Total Tasks', value: stats.totalTasks || 0, color: '#4f46e5' },
              { label: 'Pending', value: adminData?.tasksByStatus?.find(s => s._id === 'pending')?.count || 0, color: '#f59e0b' },
              { label: 'In Progress', value: adminData?.tasksByStatus?.find(s => s._id === 'in_progress')?.count || 0, color: '#3b82f6' },
              { label: 'In Review', value: adminData?.tasksByStatus?.find(s => s._id === 'review')?.count || 0, color: '#a855f7' },
              { label: 'Completed', value: adminStats.completedTasks || 0, color: '#10b981' },
              { label: 'Overdue', value: overdueTasks, color: '#ef4444' },
            ].map((s, i) => (
              <div key={i} className="stat-card">
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="grid-2" style={{ marginBottom: 20 }}>
            <div className="card">
              <div className="card-header"><span className="card-title">Tasks by Priority</span></div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={(adminData?.tasksByPriority || []).map(p => ({ name: p._id, value: p.count }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Tasks">
                    {(adminData?.tasksByPriority || []).map((p, i) => (
                      <Cell key={i} fill={
                        p._id === 'urgent' ? '#ef4444' : p._id === 'high' ? '#f59e0b' :
                        p._id === 'medium' ? '#3b82f6' : '#10b981'
                      } />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">Task Status Breakdown</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
                {(adminData?.tasksByStatus || []).map((s, i) => {
                  const pct = stats.totalTasks > 0 ? Math.round((s.count / stats.totalTasks) * 100) : 0;
                  return (
                    <div key={i}>
                      <div className="flex-between" style={{ marginBottom: 4 }}>
                        <div className="flex gap-2" style={{ alignItems: 'center' }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLORS[s._id] || '#94a3b8' }} />
                          <span style={{ fontSize: 13, textTransform: 'capitalize' }}>{s._id.replace('_', ' ')}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{s.count} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({pct}%)</span></span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress" style={{ width: `${pct}%`, background: STATUS_COLORS[s._id] || '#94a3b8' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent tasks */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Recent Tasks</span>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/tasks')}>
                View All <MdArrowForward />
              </button>
            </div>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Title</th><th>Status</th><th>Priority</th><th>Assignee</th><th>Due Date</th><th>Created</th></tr>
                </thead>
                <tbody>
                  {allTasks.slice(0, 10).map(task => (
                    <tr key={task._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/tasks/${task._id}`)}>
                      <td style={{ fontWeight: 500, maxWidth: 220 }} className="truncate">{task.title}</td>
                      <td><span className={`badge status-${task.status}`}>{task.status.replace('_', ' ')}</span></td>
                      <td><span className={`badge priority-${task.priority}`}>{task.priority}</span></td>
                      <td>
                        {task.assignee
                          ? <div className="flex gap-1" style={{ alignItems: 'center' }}>
                              <div className="avatar avatar-sm" style={{ background: '#4f46e5', width: 22, height: 22, fontSize: 10 }}>{task.assignee.name?.[0]}</div>
                              <span style={{ fontSize: 12 }}>{task.assignee.name}</span>
                            </div>
                          : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Unassigned</span>}
                      </td>
                      <td style={{ fontSize: 12, color: task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed' ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : '—'}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {format(new Date(task.createdAt), 'MMM d')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ============================= SYSTEM ============================= */}
      {activeSection === 'system' && (
        <>
          <div className="grid-2" style={{ marginBottom: 20 }}>
            {/* Platform health */}
            <div className="card">
              <div className="card-header"><span className="card-title">Platform Health</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'API Status', value: 'Operational', ok: true },
                  { label: 'Database', value: 'Connected', ok: true },
                  { label: 'Socket.IO', value: 'Running', ok: true },
                  { label: 'File Storage', value: 'Available', ok: true },
                  { label: 'Email Service', value: import.meta.env.VITE_SMTP_USER ? 'Configured' : 'Not configured', ok: !!import.meta.env.VITE_SMTP_USER },
                  { label: 'Environment', value: import.meta.env.MODE || 'development', ok: true },
                ].map(item => (
                  <div key={item.label} className="flex-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{item.label}</span>
                    <div className="flex gap-2" style={{ alignItems: 'center' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.ok ? 'var(--success)' : 'var(--warning)' }} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="card">
              <div className="card-header"><span className="card-title">Admin Quick Actions</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { icon: <MdPeople />, label: 'Manage All Users', desc: 'View, edit, deactivate users', to: '/users', color: '#4f46e5' },
                  { icon: <MdHistory />, label: 'Audit Logs', desc: 'Track all system activity', to: '/audit-logs', color: '#f59e0b' },
                  { icon: <MdBarChart />, label: 'Reports & Analytics', desc: 'Productivity and task insights', to: '/reports', color: '#10b981' },
                  { icon: <MdGroup />, label: 'Manage Teams', desc: 'View and configure all teams', to: '/teams', color: '#a855f7' },
                  { icon: <MdAssignment />, label: 'All Tasks', desc: 'View and manage every task', to: '/tasks', color: '#3b82f6' },
                  { icon: <MdSettings />, label: 'System Settings', desc: 'Platform configuration', to: '/system-settings', color: '#94a3b8' },
                ].map((action, i) => (
                  <button key={i} className="btn btn-secondary" onClick={() => navigate(action.to)}
                    style={{ justifyContent: 'flex-start', gap: 12, padding: '10px 14px', textAlign: 'left' }}>
                    <span style={{ color: action.color, fontSize: 20 }}>{action.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{action.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{action.desc}</div>
                    </div>
                    <MdArrowForward style={{ color: 'var(--text-muted)' }} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Platform Summary */}
          <div className="card">
            <div className="card-header"><span className="card-title">Platform Summary</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { label: 'Total Users', value: stats.totalUsers || 0 },
                { label: 'Total Tasks', value: stats.totalTasks || 0 },
                { label: 'Total Teams', value: stats.totalTeams || 0 },
                { label: 'Completion Rate', value: `${completionRate}%` },
                { label: 'Overdue Tasks', value: overdueTasks },
                { label: 'Verified Emails', value: `${verifiedUsers}/${stats.totalUsers || 0}` },
                { label: 'Active Users', value: activeUsers },
                { label: 'Super Admins', value: usersByRole.find(r => r._id === 'superadmin')?.count || 0 },
              ].map((item, i) => (
                <div key={i} style={{ padding: '14px 16px', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)' }}>{item.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
