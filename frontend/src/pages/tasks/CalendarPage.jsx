import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import API from '../../utils/api';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { MdAdd, MdFlag } from 'react-icons/md';
import { useAuth } from '../../context/AuthContext';

const CalendarPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [selectedDateTasks, setSelectedDateTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = async (d) => {
    setLoading(true);
    try {
      const { data } = await API.get('/tasks/calendar', {
        params: { startDate: startOfMonth(d).toISOString(), endDate: endOfMonth(d).toISOString() },
      });
      setTasks(data.data);
      filterByDate(d, data.data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTasks(date); }, []);

  const filterByDate = (d, taskList = tasks) => {
    const dateStr = format(d, 'yyyy-MM-dd');
    const filtered = taskList.filter(t => t.dueDate && format(new Date(t.dueDate), 'yyyy-MM-dd') === dateStr);
    setSelectedDateTasks(filtered);
  };

  const handleDateChange = (d) => {
    setDate(d);
    filterByDate(d);
  };

  const handleActiveStartDateChange = ({ activeStartDate }) => fetchTasks(activeStartDate);

  const tileContent = ({ date: tileDate, view }) => {
    if (view !== 'month') return null;
    const dateStr = format(tileDate, 'yyyy-MM-dd');
    const dayTasks = tasks.filter(t => t.dueDate && format(new Date(t.dueDate), 'yyyy-MM-dd') === dateStr);
    if (dayTasks.length === 0) return null;
    return (
      <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 2 }}>
        {dayTasks.slice(0, 3).map((t, i) => (
          <div key={i} className="task-dot" style={{
            background: t.priority === 'urgent' ? '#ef4444' : t.priority === 'high' ? '#f59e0b' : t.priority === 'medium' ? '#3b82f6' : '#10b981'
          }} />
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div><h1>Calendar</h1><p>View your tasks by due date.</p></div>
        {user.role !== 'user' && (
          <button className="btn btn-primary" onClick={() => navigate('/tasks/create')}><MdAdd /> New Task</button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        <div className="card calendar-wrapper">
          <Calendar
            onChange={handleDateChange}
            value={date}
            tileContent={tileContent}
            onActiveStartDateChange={handleActiveStartDateChange}
            minDetail="month"
          />
          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 16, padding: '12px 0', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
            {[
              { color: '#ef4444', label: 'Urgent' },
              { color: '#f59e0b', label: 'High' },
              { color: '#3b82f6', label: 'Medium' },
              { color: '#10b981', label: 'Low' },
            ].map(l => (
              <div key={l.label} className="flex gap-1" style={{ alignItems: 'center', fontSize: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
                <span style={{ color: 'var(--text-muted)' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">{format(date, 'MMMM d, yyyy')}</span>
              <span className="badge badge-primary">{selectedDateTasks.length}</span>
            </div>
            {loading ? (
              <div>{[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 60, marginBottom: 8, borderRadius: 8 }} />)}</div>
            ) : selectedDateTasks.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <p style={{ fontSize: 13 }}>No tasks due on this date.</p>
                
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedDateTasks.map(task => (
                  <div key={task._id} style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => navigate(`/tasks/${task._id}`)}>
                    <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 6 }}>{task.title}</div>
                    <div className="flex gap-2">
                      <span className={`badge status-${task.status}`} style={{ fontSize: 10 }}>{task.status.replace('_', ' ')}</span>
                      <span className={`badge priority-${task.priority}`} style={{ fontSize: 10 }}>{task.priority}</span>
                    </div>
                    {task.assignee && (
                      <div className="flex gap-1" style={{ alignItems: 'center', marginTop: 6 }}>
                        <div className="avatar avatar-sm" style={{ background: '#4f46e5', width: 20, height: 20, fontSize: 9 }}>
                          {task.assignee.name?.[0]}
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{task.assignee.name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Monthly summary */}
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header"><span className="card-title">Month Summary</span></div>
            {[
              { label: 'Total Due', value: tasks.length, color: 'var(--primary)' },
              { label: 'Completed', value: tasks.filter(t => t.status === 'completed').length, color: 'var(--success)' },
              { label: 'Pending', value: tasks.filter(t => t.status === 'pending').length, color: 'var(--warning)' },
              { label: 'Overdue', value: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed').length, color: 'var(--danger)' },
            ].map(s => (
              <div key={s.label} className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13 }}>{s.label}</span>
                <span style={{ fontWeight: 700, color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
