import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  MdEdit, MdDelete, MdAttachFile,
  MdComment,
  MdCalendarToday, MdFlag, MdArrowBack, MdCheck, MdClose
} from 'react-icons/md';

const TaskDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('attachments');
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submissionFiles, setSubmissionFiles] = useState([]);
  const [submittingTask, setSubmittingTask] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewingTask, setReviewingTask] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [confirmingTask, setConfirmingTask] = useState(false);

  const fetchTask = async () => {
    try {
      const { data } = await API.get(`/tasks/${id}`);
      setTask(data.data);

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

  const handleUpdateAssigneeFlags = async (field, value) => {
    try {
      await API.put(`/tasks/${id}`, { [field]: value });
      setTask(prev => ({ ...prev, [field]: value }));
      toast.success('Progress updated');
    } catch (err) {
      toast.error('Failed to update progress');
    }
  };

  const handleAcceptTask = async () => {
    setConfirmingTask(true);
    try {
      await API.put(`/tasks/${id}`, { status: 'in_progress' });
      setTask(prev => ({ ...prev, status: 'in_progress' }));
      toast.success('Task accepted and moved to In Progress');
    } catch (err) {
      toast.error('Failed to accept task');
    } finally {
      setConfirmingTask(false);
    }
  };

  const handleRejectTask = async (e) => {
    e.preventDefault();
    if (!rejectReasonInput.trim()) {
      toast.error('Please provide a reason for rejecting the task');
      return;
    }
    setConfirmingTask(true);
    try {
      await API.put(`/tasks/${id}`, { status: 'rejected', rejectReason: rejectReasonInput });
      setTask(prev => ({ ...prev, status: 'rejected', rejectReason: rejectReasonInput }));
      setShowRejectInput(false);
      toast.success('Task rejected');
    } catch (err) {
      toast.error('Failed to reject task');
    } finally {
      setConfirmingTask(false);
    }
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


  const handleSubmitTask = async (e) => {
    e.preventDefault();
    if (!submissionNotes.trim() && submissionFiles.length === 0) {
      toast.error('Please add some notes or attachments to submit.');
      return;
    }
    setSubmittingTask(true);
    const formData = new FormData();
    formData.append('notes', submissionNotes);
    submissionFiles.forEach(f => formData.append('attachments', f));
    try {
      const { data } = await API.post(`/tasks/${id}/submit`, formData);
      setTask(data.data);
      setSubmissionNotes('');
      setSubmissionFiles([]);
      toast.success('Task submitted successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit task');
    } finally {
      setSubmittingTask(false);
    }
  };

  const handleReviewSubmission = async (status) => {
    setReviewingTask(true);
    try {
      const { data } = await API.post(`/tasks/${id}/review`, { status, reviewNotes });
      setTask(data.data);
      setReviewNotes('');
      toast.success(`Submission ${status}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to review submission');
    } finally {
      setReviewingTask(false);
    }
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
          {/* <button className={`btn ${tracking ? 'btn-danger' : 'btn-secondary'}`} onClick={handleTimeTracking}>
            {tracking ? <><MdStop /> Stop Timer</> : <><MdPlayArrow /> Start Timer</>}
          </button> */}
          {user.role !== 'user' && (
            <button className="btn btn-secondary" onClick={() => navigate(`/tasks/${id}/edit`)}>
              <MdEdit /> {isReadOnlyExceptAssignee ? 'Reassign Task' : 'Edit'}
            </button>
          )}
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

          {/* Working Confirmation Section */}
          {task.status === 'pending' && task.assignee?._id === user._id && (
            <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid var(--primary)' }}>
              <div className="card-header"><span className="card-title">Task Confirmation</span></div>
              <p style={{ fontSize: 14, marginBottom: 16 }}>You have been assigned this task. Do you accept it?</p>
              
              {!showRejectInput ? (
                <div className="flex gap-2">
                  <button className="btn btn-sm" style={{ background: 'var(--success)', color: 'white' }} onClick={handleAcceptTask} disabled={confirmingTask}>
                    <MdCheck /> Accept Task
                  </button>
                  <button className="btn btn-sm" style={{ background: 'var(--danger)', color: 'white' }} onClick={() => setShowRejectInput(true)} disabled={confirmingTask}>
                    <MdClose /> Reject Task
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRejectTask}>
                  <div className="form-group">
                    <label className="form-label">Reason for Rejection</label>
                    <textarea className="form-control" rows={3} placeholder="Please explain why you cannot work on this task..." value={rejectReasonInput} onChange={e => setRejectReasonInput(e.target.value)} autoFocus />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="btn btn-primary btn-sm" disabled={confirmingTask}>Submit Rejection</button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowRejectInput(false)} disabled={confirmingTask}>Cancel</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Reject Reason Display */}
          {task.status === 'rejected' && task.rejectReason && (
            <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid var(--danger)', background: 'rgba(239, 68, 68, 0.05)' }}>
              <div className="card-header"><span className="card-title" style={{ color: 'var(--danger)' }}>Task Rejected</span></div>
              <p style={{ fontSize: 14 }}><strong>Reason:</strong> {task.rejectReason}</p>
            </div>
          )}

          {/* Status Update Removed per user request */}


         

          {/* Tabs: Comments | Attachments | Activity | Time */}
          <div className="card">
            <div className="tabs">
              {['attachments' , 'activity'].map(tab => (
                <div key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === 'comments' && task.comments?.length > 0 && <span className="badge badge-primary" style={{ marginLeft: 6 }}>{task.comments.length}</span>}
                </div>
              ))}
            </div>

            {/* Comments */}
            {/* {activeTab === 'comments' && (
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
            )} */}

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
           {/* Task Submission Section */}
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header"><span className="card-title">Task Submission</span></div>
            {!task.submission?.isSubmitted ? (
              // Not submitted yet
              (task.assignee?._id === user._id) ? (
                task.status === 'in_progress' ? (
                  <form onSubmit={handleSubmitTask}>
                    <div className="form-group">
                      <label className="form-label">Submission Notes</label>
                      <textarea className="form-control" rows={3} placeholder="Describe what you did..." value={submissionNotes} onChange={e => setSubmissionNotes(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Attachments (Optional)</label>
                      <input type="file" className="form-control" multiple onChange={e => setSubmissionFiles(Array.from(e.target.files))} />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={submittingTask}>
                      {submittingTask ? 'Submitting...' : 'Submit Task'}
                    </button>
                  </form>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Please accept the task to start working on it before submitting.</p>
                )
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Waiting for the assignee to submit their work.</p>
              )
            ) : (
              // Submitted
              <div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Submission Status</div>
                  <span className={`badge ${task.submission.status === 'pending' ? 'status-pending' : task.submission.status === 'approved' ? 'status-completed' : 'status-cancelled'}`}>
                    {task.submission.status.toUpperCase()}
                  </span>
                </div>
                {task.submission.notes && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Notes</div>
                    <p style={{ fontSize: 13, background: 'var(--bg-secondary)', padding: 10, borderRadius: 'var(--radius)' }}>{task.submission.notes}</p>
                  </div>
                )}
                {task.submission.attachments?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Attachments</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {task.submission.attachments.map((file, i) => (
                        <a key={i} href={`http://localhost:5000${file.path}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4 }}><MdAttachFile /> {file.originalName}</a>
                      ))}
                    </div>
                  </div>
                )}
                {task.submission.status === 'pending' && (task.assignedBy?._id === user._id || user.role === 'superadmin') && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
                    <div className="form-group">
                      <label className="form-label">Review Notes (Optional)</label>
                      <textarea className="form-control" rows={2} value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Add feedback..." />
                    </div>
                    <div className="flex gap-2">
                      <button className="btn" style={{ background: 'var(--success)', color: 'white' }} onClick={() => handleReviewSubmission('approved')} disabled={reviewingTask}>Approve</button>
                      <button className="btn" style={{ background: 'var(--danger)', color: 'white' }} onClick={() => handleReviewSubmission('rejected')} disabled={reviewingTask}>Reject</button>
                    </div>
                  </div>
                )}
                {task.submission.reviewNotes && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Review Feedback</div>
                    <p style={{ fontSize: 13 }}>{task.submission.reviewNotes}</p>
                  </div>
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
          {/* {task.tags?.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><span className="card-title"><MdLabel style={{ verticalAlign: 'middle', marginRight: 4 }} />Tags</span></div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {task.tags.map((tag, i) => <span key={i} className="tag">{tag}</span>)}
              </div>
            </div>
          )} */}

        </div>
      </div>
    </div>
  );
};

export default TaskDetailPage;
