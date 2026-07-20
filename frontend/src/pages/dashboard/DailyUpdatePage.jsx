import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '../../components/common/SEO';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { MdOutlineRateReview, MdErrorOutline, MdCalendarToday, MdLink, MdFilterList, MdClear } from 'react-icons/md';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const DailyUpdatePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTasks, setActiveTasks] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedTaskStatus, setSelectedTaskStatus] = useState('');
  const [workDone, setWorkDone] = useState('');
  const [blockers, setBlockers] = useState('');

  // Filter states for admin/superadmin
  const [usersList, setUsersList] = useState([]);
  const [userFilter, setUserFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const fetchActiveTasks = async () => {
    try {
      const res = await API.get('/tasks', { params: { limit: 100 } });
      if (res.data.success) {
        // Filter tasks that are not completed, cancelled, or rejected
        const active = res.data.data.filter(t => !['completed', 'cancelled', 'rejected'].includes(t.status));
        setActiveTasks(active);
      }
    } catch (err) {
      console.error('Failed to fetch user tasks:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await API.get('/daily-updates');
      if (res.data.success) {
        setHistory(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch daily updates history:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await API.get('/users', { params: { limit: 100 } });
      if (res.data.success) {
        setUsersList(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const initData = async () => {
    setLoading(true);
    const promises = [fetchActiveTasks(), fetchHistory()];
    if (['admin', 'superadmin'].includes(user?.role)) {
      promises.push(fetchUsers());
    }
    await Promise.all(promises);
    setLoading(false);
  };

  useEffect(() => {
    initData();
  }, []);

  const handleTaskChange = (taskId) => {
    setSelectedTaskId(taskId);
    const selectedTask = activeTasks.find(t => t._id === taskId);
    if (selectedTask) {
      setSelectedTaskStatus(selectedTask.status);
    } else {
      setSelectedTaskStatus('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!workDone.trim()) {
      toast.error('Please describe what you accomplished today.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        workDone,
        blockers: blockers.trim() || undefined,
        task: selectedTaskId || undefined,
        status: selectedTaskId ? selectedTaskStatus : undefined
      };

      const res = await API.post('/daily-updates', payload);
      if (res.data.success) {
        toast.success('Daily update posted successfully!');
        setWorkDone('');
        setBlockers('');
        setSelectedTaskId('');
        setSelectedTaskStatus('');
        
        // Refresh task list and history list
        await Promise.all([fetchActiveTasks(), fetchHistory()]);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit daily update');
    } finally {
      setSubmitting(false);
    }
  };

  const getFilteredHistory = () => {
    return history.filter(item => {
      // User filter
      if (userFilter && item.user?._id !== userFilter) return false;

      // Date filter
      if (dateFilter) {
        const itemDateStr = format(new Date(item.date), 'yyyy-MM-dd');
        if (itemDateStr !== dateFilter) return false;
      }

      return true;
    });
  };

  const getGroupedUpdates = (updates) => {
    const groups = {};
    updates.forEach(item => {
      const dateKey = format(new Date(item.date), 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
    });
    return groups;
  };

  const formatDateHeader = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const dateKey = format(d, 'yyyy-MM-dd');
    const todayKey = format(today, 'yyyy-MM-dd');
    const yesterdayKey = format(yesterday, 'yyyy-MM-dd');

    if (dateKey === todayKey) return 'Today';
    if (dateKey === yesterdayKey) return 'Yesterday';
    return format(d, 'MMMM d, yyyy');
  };

  if (loading) return (
    <div>
      <div className="skeleton" style={{ height: 60, marginBottom: 20 }} />
      <div className="dashboard-grid">
        <div className="skeleton" style={{ height: 350 }} />
        <div className="skeleton" style={{ height: 350 }} />
      </div>
    </div>
  );

  return (
    <div>
      <SEO title="Daily Update" description="Update your daily progress and blockers for assigned tasks or general project work." robots="noindex, nofollow" />
      
      <div className="page-header">
        <div>
          <h1>Daily Updates</h1>
          <p>
            {['admin', 'superadmin'].includes(user?.role) 
              ? "Track daily standups, accomplishments, and blockers submitted by team members."
              : "Submit your daily standup, log work accomplishments, and highlight any blockers."
            }
          </p>
        </div>
      </div>

      <div className={['admin', 'superadmin'].includes(user?.role) ? "" : "dashboard-grid"}>
        {/* Left Column - Form (Only for non-admin/superadmin) */}
        {!['admin', 'superadmin'].includes(user?.role) && (
          <div className="card" style={{ alignSelf: 'start' }}>
            <div className="card-header" style={{ marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MdOutlineRateReview size={20} color="var(--primary)" /> Write Daily Update
              </span>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Related Task (Optional)</label>
                <select 
                  className="form-control"
                  value={selectedTaskId}
                  onChange={(e) => handleTaskChange(e.target.value)}
                >
                  <option value="">-- General / No Assigned Task --</option>
                  {activeTasks.map(t => (
                    <option key={t._id} value={t._id}>
                      {t.title}
                    </option>
                  ))}
                </select>
                <span className="form-hint">Choose an assigned task to post this update as a comment and update its status.</span>
              </div>

              {selectedTaskId && (
                <div className="form-group">
                  <label className="form-label">Update Task Status</label>
                  <select 
                    className="form-control"
                    value={selectedTaskStatus}
                    onChange={(e) => setSelectedTaskStatus(e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">In Review</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label required">What did you accomplish today?</label>
                <textarea 
                  className="form-control"
                  rows={4}
                  placeholder="Describe your progress, tasks completed, or design milestones..."
                  value={workDone}
                  onChange={(e) => setWorkDone(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Blockers & Issues (Optional)</label>
                <textarea 
                  className="form-control"
                  rows={2}
                  placeholder="Any technical issues, missing specs, or blockers delaying progress?"
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary w-full flex-center"
                disabled={submitting || !workDone.trim()}
                style={{ marginTop: 8 }}
              >
                {submitting ? 'Submitting...' : 'Post Daily Update'}
              </button>
            </form>
          </div>
        )}

        {/* Right Column - History */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 450 }}>
          <div className="card-header" style={{ marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="flex-between w-full" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MdFilterList size={18} /> Updates History
              </span>
              {['admin', 'superadmin'].includes(user?.role) && (
                <span className="badge status-in_progress" style={{ fontSize: 10, padding: '2px 8px' }}>
                  Admin Track Mode
                </span>
              )}
            </div>

            {/* Admin and Superadmin filters */}
            {['admin', 'superadmin'].includes(user?.role) && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', width: '100%', marginTop: 6 }}>
                <div style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Filter by Member</span>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <select
                      className="form-control"
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value)}
                      style={{ fontSize: 12, paddingRight: 30, height: 34, width: '100%' }}
                    >
                      <option value="">All Members</option>
                      {usersList.map(u => (
                        <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                    {userFilter && (
                      <button 
                        onClick={() => setUserFilter('')} 
                        style={{ position: 'absolute', right: 8, background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                        title="Clear filter"
                      >
                        <MdClear size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Filter by Date</span>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="date"
                      className="form-control"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      style={{ fontSize: 12, height: 34, width: '100%' }}
                    />
                    {dateFilter && (
                      <button 
                        onClick={() => setDateFilter('')} 
                        style={{ position: 'absolute', right: 26, background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                        title="Clear filter"
                      >
                        <MdClear size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {getFilteredHistory().length === 0 ? (
            <div className="empty-state" style={{ margin: 'auto', textAlign: 'center', padding: '40px 20px' }}>
              <div className="empty-icon">📝</div>
              <h3>No updates found</h3>
              <p>No matching daily updates logged. Adjust filters or post a new update.</p>
            </div>
          ) : (() => {
            const filtered = getFilteredHistory();
            const grouped = getGroupedUpdates(filtered);
            const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
            
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', maxHeight: '550px', paddingRight: 4 }}>
                {sortedDates.map((dateStr) => (
                  <div key={dateStr} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Sticky/Styled Date Header */}
                    <div style={{ 
                      position: 'sticky', 
                      top: 0, 
                      background: 'var(--card-bg, #fff)', 
                      padding: '6px 0', 
                      borderBottom: '1.5px solid var(--primary)', 
                      fontWeight: 700, 
                      fontSize: 13, 
                      color: 'var(--primary)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 6,
                      zIndex: 2
                    }}>
                      <MdCalendarToday size={14} /> {formatDateHeader(dateStr)}
                      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                        {grouped[dateStr].length} {grouped[dateStr].length === 1 ? 'update' : 'updates'}
                      </span>
                    </div>

                    {/* List of updates for this date */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingLeft: 4 }}>
                      {grouped[dateStr].map((item) => (
                        <div key={item._id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
                          {/* User details for admin/superadmin */}
                          {['admin', 'superadmin'].includes(user?.role) && item.user && (
                            <div className="flex gap-2" style={{ alignItems: 'center', marginBottom: 10, background: 'var(--bg-light, rgba(0,0,0,0.02))', padding: '6px 10px', borderRadius: 'var(--radius)' }}>
                              {item.user?.avatar ? (
                                <img 
                                  src={`${import.meta.env.VITE_SOCKET_URL}${item.user.avatar}`} 
                                  alt={item.user.name} 
                                  className="avatar avatar-sm" 
                                  style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} 
                                />
                              ) : (
                                <div 
                                  className="avatar avatar-sm" 
                                  style={{ background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', width: 22, height: 22, fontSize: 10, borderRadius: '50%' }}
                                >
                                  {item.user?.name?.[0] || '?'}
                                </div>
                              )}
                              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)' }}>
                                {item.user?.name || 'Unknown User'}
                                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>
                                  ({item.user?.role})
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Title / Task Header */}
                          <div className="flex-between" style={{ alignItems: 'flex-start', marginBottom: 6 }}>
                            <div>
                              {item.task ? (
                                <div 
                                  className="flex gap-1" 
                                  style={{ fontWeight: 600, fontSize: 13, color: 'var(--primary)', cursor: 'pointer', alignItems: 'center' }}
                                  onClick={() => navigate(`/tasks/${item.task._id || item.task}`)}
                                >
                                  <MdLink /> {item.taskTitle || item.task?.title}
                                </div>
                              ) : (
                                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-muted)' }}>
                                  General Update
                                </div>
                              )}
                              <div style={{ fontSize: 10, color: 'var(--text-light)', marginTop: 2 }}>
                                Logged at {format(new Date(item.date), 'h:mm a')}
                              </div>
                            </div>

                            {item.task && (
                              <span className={`badge status-${item.status}`} style={{ fontSize: 10, padding: '2px 6px' }}>
                                {item.status.replace('_', ' ')}
                              </span>
                            )}
                          </div>

                          {/* Work Done Details */}
                          <div style={{ background: 'var(--bg)', padding: '8px 12px', borderRadius: 'var(--radius)', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                            {item.workDone}
                          </div>

                          {/* Blockers Details */}
                          {item.blockers && (
                            <div className="flex gap-2" style={{ marginTop: 6, background: 'rgba(239, 68, 68, 0.05)', padding: '6px 10px', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--danger)', fontSize: 11.5, color: 'var(--danger)', alignItems: 'flex-start' }}>
                              <MdErrorOutline size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                              <div>
                                <strong>Blockers:</strong> {item.blockers}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default DailyUpdatePage;
