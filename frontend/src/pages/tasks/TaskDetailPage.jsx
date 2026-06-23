import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  MdEdit, MdDelete, MdAdd, MdPlayArrow, MdStop, MdAttachFile,
  MdComment, MdCheckBox, MdCheckBoxOutlineBlank, MdPerson,
  MdCalendarToday, MdFlag, MdLabel, MdTimer, MdArrowBack
} from 'react-icons/md';

const TaskDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('comments');
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchTask = async () => {
    try {
      const { data } = await API.get(`/tasks/${id}`);
      setTask(data.data);
      // Check if user has active time entry
      const activeEntry = data.data.timeEntries?.find(e => e.user?._id === user._id && !e.endTime);
      setTracking(!!activeEntry);
    } catch { toast.error('Task not found'); navigate('/tasks'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTask(); }, [id]);

  const handleStatusChange = async (status) => {
    if (user.role === 'admin' && task.assignedBy?.role === 'superadmin') {
      toast.error('Admins cannot update status on tasks assigned by a superadmin');
      return;
    }
    setStatusUpdating(true);
    try {
      await API.put(`/tasks/${id}`, { status });
      setTask(prev => ({ ...prev, status }));
      toast.success('Status updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
    finally { setStatusUpdating(false); }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmittingComment(true);
    try {
      const { data } = await API.post(`/tasks/${id}/comments`, { content: comment });
      setTask(data.data);
      setComment('');
      toast.success('Comment added');
    } catch { toast.error('Failed to add comment'); }
    finally { setSubmittingComment(false); }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await API.delete(`/tasks/${id}/comments/${commentId}`);
      setTask(prev => ({ ...prev, comments: prev.comments.filter(c => c._id !== commentId) }));
    } catch { toast.error('Failed to delete comment'); }
  };

  const handleAddSubtask = async () => {
    if (user.role === 'admin' && task.assignedBy?.role === 'superadmin') {
      toast.error('Admins cannot modify subtasks on tasks assigned by a superadmin');
      return;
    }
    if (!newSubtask.trim()) return;
    setAddingSubtask(true);
    try {
      const { data } = await API.post(`/tasks/${id}/subtasks`, { title: newSubtask });
      setTask(data.data);
      setNewSubtask('');
    } catch { toast.error('Failed to add subtask'); }
    finally { setAddingSubtask(false); }
  };

  const handleToggleSubtask = async (subtask) => {
    if (user.role === 'admin' && task.assignedBy?.role === 'superadmin') {
      toast.error('Admins cannot modify subtasks on tasks assigned by a superadmin');
      return;
    }
    try {
      const { data } = await API.put(`/tasks/${id}/subtasks/${subtask._id}`, {
        title: subtask.title, isCompleted: !subtask.isCompleted
      });
      setTask(data.data);
    } catch { toast.error('Failed to update subtask'); }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    if (user.role === 'admin' && task.assignedBy?.role === 'superadmin') {
      toast.error('Admins cannot modify subtasks on tasks assigned by a superadmin');
      return;
    }
    try {
      await API.delete(`/tasks/${id}/subtasks/${subtaskId}`);
      setTask(prev => ({ ...prev, subtasks: prev.subtasks.filter(s => s._id !== subtaskId) }));
    } catch { toast.error('Failed to delete subtask'); }
  };

  const handleTimeTracking = async () => {
    try {
      if (tracking) {
        await API.post(`/tasks/${id}/time/stop`);
        toast.success('Timer stopped');
        setTracking(false);
      } else {
        await API.post(`/tasks/${id}/time/start`, { note: '' });
        toast.success('Timer started');
        setTracking(true);
      }
      fetchTask();
    } catch { toast.error('Failed to toggle timer'); }
  };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  if (loading) return (
    <div>
      <div className="skeleton" style={{ height: 200, marginBottom: 16, borderRadius: 12 }} />
      <div className="grid-2">
        <div className="skeleton" style={{ height: 300, borderRadius: 12 }} />
        <div className="skeleton" style={{ height: 300, borderRadius: 12 }} />
      </div>
    </div>
  );

  if (!task) return null;

  const isReadOnlyExceptAssignee = user.role === 'admin' && task.assignedBy?.role === 'superadmin';

  const completedSubtasks = task.subtasks?.filter(s => s.isCompleted).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
  const totalHours = Math.floor((task.totalTimeSpent || 0) / 60);
  const totalMins = (task.totalTimeSpent || 0) % 60;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="flex gap-3" style={{ alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks')}>
            <MdArrowBack /> Back
          </button>
          <div>
            <h1 style={{ fontSize: 20 }}>{task.title}</h1>
            <div className="flex gap-2" style={{ marginTop: 4 }}>
              <span className={`badge status-${task.status}`}>{task.status.replace('_', ' ')}</span>
              <span className={`badge priority-${task.priority}`}>{task.priority}</span>
            </div>
          </div>
        </div>
        <div className="header-actions">
          <button className={`btn ${tracking ? 'btn-danger' : 'btn-secondary'}`} onClick={handleTimeTracking}>
            {tracking ? <><MdStop /> Stop Timer</> : <><MdPlayArrow /> Start Timer</>}
          </button>
          <button className="btn btn-secondary" onClick={() => navigate(`/tasks/${id}/edit`)}>
            <MdEdit /> {isReadOnlyExceptAssignee ? 'Reassign Task' : 'Edit'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        {/* Left Column */}
        <div>
          {/* Description */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><span className="card-title">Description</span></div>
            <p style={{ color: task.description ? 'var(--text)' : 'var(--text-muted)', fontSize: 14, lineHeight: 1.7 }}>
              {task.description || 'No description provided.'}
            </p>
          </div>

          {/* Status Update */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><span className="card-title">Update Status</span></div>
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              {['pending', 'in_progress', 'review', 'completed', 'cancelled'].map(s => (
                <button key={s} className={`btn btn-sm ${task.status === s ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleStatusChange(s)} disabled={statusUpdating || isReadOnlyExceptAssignee}>
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Subtasks */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <span className="card-title">Subtasks ({completedSubtasks}/{totalSubtasks})</span>
            </div>
            {totalSubtasks > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div className="progress-bar"><div className="progress" style={{ width: `${subtaskProgress}%` }} /></div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                  {Math.round(subtaskProgress)}% complete
                </span>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {task.subtasks?.map(subtask => (
                <div key={subtask._id} className="flex-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <div className="flex gap-2" style={{ alignItems: 'center' }}>
                    <button onClick={() => !isReadOnlyExceptAssignee && handleToggleSubtask(subtask)} style={{ color: subtask.isCompleted ? 'var(--success)' : 'var(--text-muted)', fontSize: 20, lineHeight: 1, cursor: isReadOnlyExceptAssignee ? 'not-allowed' : 'pointer', background: 'none', border: 'none', padding: 0 }}>
                      {subtask.isCompleted ? <MdCheckBox /> : <MdCheckBoxOutlineBlank />}
                    </button>
                    <span style={{ fontSize: 13, textDecoration: subtask.isCompleted ? 'line-through' : 'none', color: subtask.isCompleted ? 'var(--text-muted)' : 'var(--text)' }}>
                      {subtask.title}
                    </span>
                  </div>
                  {!isReadOnlyExceptAssignee && (
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteSubtask(subtask._id)}>
                      <MdDelete />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="form-control" placeholder="Add subtask..." value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), !isReadOnlyExceptAssignee && handleAddSubtask())} disabled={isReadOnlyExceptAssignee} />
              <button className="btn btn-secondary" onClick={handleAddSubtask} disabled={addingSubtask || isReadOnlyExceptAssignee}><MdAdd /></button>
            </div>
          </div>

          {/* Tabs: Comments | Attachments | Activity | Time */}
          <div className="card">
            <div className="tabs">
              {['comments', 'attachments', 'time', 'activity'].map(tab => (
                <div key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === 'comments' && task.comments?.length > 0 && <span className="badge badge-primary" style={{ marginLeft: 6 }}>{task.comments.length}</span>}
                </div>
              ))}
            </div>

            {/* Comments */}
            {activeTab === 'comments' && (
              <div>
                <form onSubmit={handleAddComment} style={{ marginBottom: 20 }}>
                  <div className="flex gap-2">
                    <div className="avatar avatar-sm" style={{ background: '#4f46e5', flexShrink: 0 }}>{getInitials(user.name)}</div>
                    <div style={{ flex: 1 }}>
                      <textarea className="form-control" rows={3} placeholder="Write a comment..." value={comment}
                        onChange={e => setComment(e.target.value)} style={{ resize: 'none' }} />
                      <button className="btn btn-primary btn-sm" type="submit" style={{ marginTop: 8 }} disabled={submittingComment || !comment.trim()}>
                        {submittingComment ? 'Posting...' : 'Post Comment'}
                      </button>
                    </div>
                  </div>
                </form>
                {task.comments?.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px 0' }}>
                    <MdComment style={{ fontSize: 40, opacity: 0.3, marginBottom: 8 }} />
                    <p>No comments yet. Be the first to comment!</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {[...task.comments].reverse().map(c => (
                      <div key={c._id} className="flex gap-3">
                        <div className="avatar avatar-sm" style={{ background: '#4f46e5', flexShrink: 0 }}>
                          {c.user?.avatar ? <img src={`http://localhost:5000${c.user.avatar}`} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : getInitials(c.user?.name)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="flex-between" style={{ marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{c.user?.name}</span>
                            <div className="flex gap-2" style={{ alignItems: 'center' }}>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{format(new Date(c.createdAt), 'MMM d, h:mm a')}</span>
                              {(user._id === c.user?._id || user.role !== 'user') && (
                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', padding: '2px 4px' }} onClick={() => handleDeleteComment(c._id)}>
                                  <MdDelete style={{ fontSize: 14 }} />
                                </button>
                              )}
                            </div>
                          </div>
                          <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, background: 'var(--bg)', padding: '8px 12px', borderRadius: 8 }}>{c.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Attachments */}
            {activeTab === 'attachments' && (
              <div>
                {task.attachments?.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px 0' }}>
                    <MdAttachFile style={{ fontSize: 40, opacity: 0.3, marginBottom: 8 }} />
                    <p>No attachments.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {task.attachments?.map((a, i) => (
                      <div key={i} className="flex-between" style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                        <div className="flex gap-2" style={{ alignItems: 'center' }}>
                          <MdAttachFile style={{ color: 'var(--primary)', fontSize: 20 }} />
                          <div>
                            <div style={{ fontWeight: 500, fontSize: 13 }}>{a.originalName}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(a.size / 1024).toFixed(1)} KB</div>
                          </div>
                        </div>
                        <a href={`http://localhost:5000${a.path}`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">Download</a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Time Tracking */}
            {activeTab === 'time' && (
              <div>
                <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: 16, textAlign: 'center' }}>
                  <MdTimer style={{ fontSize: 36, color: 'var(--primary)', marginBottom: 8 }} />
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{totalHours}h {totalMins}m</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Total time spent</div>
                  <button className={`btn ${tracking ? 'btn-danger' : 'btn-primary'} btn-sm`} style={{ marginTop: 12 }} onClick={handleTimeTracking}>
                    {tracking ? <><MdStop /> Stop Timer</> : <><MdPlayArrow /> Start Timer</>}
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {task.timeEntries?.filter(e => e.endTime).slice(-10).reverse().map((entry, i) => (
                    <div key={i} className="flex-between" style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: 'var(--radius)', fontSize: 12 }}>
                      <span style={{ color: 'var(--text-muted)' }}>{format(new Date(entry.startTime), 'MMM d, h:mm a')}</span>
                      <span style={{ fontWeight: 600 }}>{Math.floor(entry.duration / 60)}h {entry.duration % 60}m</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activity */}
            {activeTab === 'activity' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {task.activityHistory?.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px 0' }}><p>No activity recorded.</p></div>
                ) : (
                  [...task.activityHistory].reverse().map((act, i) => (
                    <div key={i} className="flex gap-3" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <div className="avatar avatar-sm" style={{ background: '#4f46e5', flexShrink: 0 }}>
                        {getInitials(act.user?.name || 'U')}
                      </div>
                      <div>
                        <span style={{ fontSize: 13 }}><strong>{act.user?.name || 'Someone'}</strong> {act.action}</span>
                        {act.oldValue && act.newValue && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}> ({String(act.oldValue)} → {String(act.newValue)})</span>
                        )}
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{format(new Date(act.timestamp), 'MMM d, h:mm a')}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Meta */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><span className="card-title">Details</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Assignee</div>
                {task.assignee ? (
                  <div className="flex gap-2" style={{ alignItems: 'center' }}>
                    <div className="avatar avatar-sm" style={{ background: '#4f46e5' }}>{getInitials(task.assignee.name)}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{task.assignee.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{task.assignee.email}</div>
                    </div>
                  </div>
                ) : <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Unassigned</span>}
              </div>

              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Assigned By</div>
                {task.assignedBy ? (
                  <div className="flex gap-2" style={{ alignItems: 'center' }}>
                    <div className="avatar avatar-sm" style={{ background: '#06b6d4' }}>{getInitials(task.assignedBy.name)}</div>
                    <span style={{ fontSize: 13 }}>{task.assignedBy.name}</span>
                  </div>
                ) : <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>—</span>}
              </div>

              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                  <MdCalendarToday style={{ verticalAlign: 'middle', marginRight: 4 }} />Due Date
                </div>
                {task.dueDate ? (
                  <span style={{ fontSize: 13, color: new Date(task.dueDate) < new Date() && task.status !== 'completed' ? 'var(--danger)' : 'var(--text)' }}>
                    {format(new Date(task.dueDate), 'MMM d, yyyy')}
                  </span>
                ) : <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Not set</span>}
              </div>

              {task.startDate && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Start Date</div>
                  <span style={{ fontSize: 13 }}>{format(new Date(task.startDate), 'MMM d, yyyy')}</span>
                </div>
              )}

              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                  <MdFlag style={{ verticalAlign: 'middle', marginRight: 4 }} />Team
                </div>
                <span style={{ fontSize: 13 }}>{task.team?.name || 'No team'}</span>
              </div>

              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Created</div>
                <span style={{ fontSize: 13 }}>{format(new Date(task.createdAt), 'MMM d, yyyy')}</span>
              </div>
            </div>
          </div>

          {/* Tags */}
          {task.tags?.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><span className="card-title"><MdLabel style={{ verticalAlign: 'middle', marginRight: 4 }} />Tags</span></div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {task.tags.map((tag, i) => <span key={i} className="tag">{tag}</span>)}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default TaskDetailPage;
