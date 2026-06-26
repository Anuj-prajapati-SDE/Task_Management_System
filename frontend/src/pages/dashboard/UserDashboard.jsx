import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { MdAdd, MdCheckCircle, MdPending, MdRunningWithErrors, MdWarning, MdArrowForward } from 'react-icons/md';
import { format, isToday, isTomorrow } from 'date-fns';

const UserDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await API.get('/analytics/dashboard/user');
        setData(res.data.data);
      } catch {}
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const getDueDateLabel = (date) => {
    if (!date) return null;
    const d = new Date(date);
    if (isToday(d)) return <span className="badge badge-warning">Today</span>;
    if (isTomorrow(d)) return <span className="badge badge-info">Tomorrow</span>;
    if (d < new Date()) return <span className="badge badge-danger">Overdue</span>;
    return <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{format(d, 'MMM d')}</span>;
  };

  if (loading) return (
    <div>
      <div className="stat-grid">{[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 120 }} />)}</div>
    </div>
  );

  const stats = data?.stats || {};

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Good morning, {user?.name?.split(' ')[0]} </h1>
          <p>Here's what's happening with your tasks today.</p>
        </div>
        
      </div>

      {/* Stats */}
      <div className="stat-grid">
        {[
          { icon: <MdCheckCircle />, label: 'Total Tasks', value: stats.total || 0, color: '#4f46e5', bg: 'rgba(79,70,229,0.1)' },
          { icon: <MdCheckCircle />, label: 'Completed', value: stats.completed || 0, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
          { icon: <MdPending />, label: 'Pending', value: stats.pending || 0, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
          { icon: <MdRunningWithErrors />, label: 'In Progress', value: stats.inProgress || 0, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
          { icon: <MdWarning />, label: 'Overdue', value: stats.overdue || 0, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Weekly Chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Weekly Productivity</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data?.weeklyData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tickFormatter={d => format(new Date(d), 'EEE')} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="completed" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Upcoming Deadlines */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Upcoming Deadlines</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks')}><MdArrowForward /></button>
          </div>
          {data?.upcomingDeadlines?.length === 0 ? (
            <div className="empty-state"><p>No upcoming deadlines </p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data?.upcomingDeadlines?.map(task => (
                <div key={task._id} className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => navigate(`/tasks/${task._id}`)}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{task.title}</div>
                    <div style={{ marginTop: 4 }}><span className={`badge priority-${task.priority}`}>{task.priority}</span></div>
                  </div>
                  <div>{getDueDateLabel(task.dueDate)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Activity</span>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks')}>View All <MdArrowForward /></button>
        </div>
        {data?.recentTasks?.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No tasks yet</h3>
            <p>You have no assigned tasks yet.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Task</th><th>Status</th><th>Priority</th><th>Updated</th></tr></thead>
              <tbody>
                {data?.recentTasks?.map(task => (
                  <tr key={task._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/tasks/${task._id}`)}>
                    <td style={{ fontWeight: 500 }}>{task.title}</td>
                    <td><span className={`badge status-${task.status}`}>{task.status.replace('_', ' ')}</span></td>
                    <td><span className={`badge priority-${task.priority}`}>{task.priority}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{format(new Date(task.updatedAt), 'MMM d, h:mm a')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
