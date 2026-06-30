import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { MdClose, MdAttachFile, MdArrowBack } from 'react-icons/md';
import { useAuth } from '../../context/AuthContext';
import SEO from '../../components/common/SEO';

const formatDateTimeLocal = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const pad = (num) => String(num).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const EditTaskPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [files, setFiles] = useState([]);
  const [taskAssignedByRole, setTaskAssignedByRole] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', status: 'pending', priority: 'medium',
    assignees: [], team: '', dueDate: '', startDate: '', tags: [], labels: [],
    isRecurring: false, recurringPattern: { frequency: 'weekly', interval: 1 },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, teamsRes] = await Promise.all([API.get('/users'), API.get('/teams')]);
        setUsers(usersRes.data.data);
        setTeams(teamsRes.data.data);
      } catch { }
    };
    fetchData();

    if (id) {
      API.get(`/tasks/${id}`).then(({ data }) => {
        const t = data.data;
        setTaskAssignedByRole(t.assignedBy?.role || null);
        setForm({
          title: t.title, description: t.description, status: t.status, priority: t.priority,
          assignees: t.assignees ? t.assignees.map(a => a._id || a) : [], team: t.team?._id || '',
          dueDate: t.dueDate ? formatDateTimeLocal(t.dueDate) : '',
          startDate: t.startDate ? formatDateTimeLocal(t.startDate) : '',
          tags: t.tags || [], labels: t.labels || [],
          isRecurring: t.isRecurring, recurringPattern: t.recurringPattern || { frequency: 'weekly', interval: 1 },
        });
      }).catch(() => toast.error('Failed to load task'));
    }
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v === '' && k === 'team') {
          // don't append empty string for ObjectId fields to avoid Cast error
        } else if (Array.isArray(v)) {
          formData.append(k, JSON.stringify(v));
        } else if (typeof v === 'object' && v !== null) {
          formData.append(k, JSON.stringify(v));
        } else {
          formData.append(k, v);
        }
      });
      if (form.team === '') formData.append('team', '');
      files.forEach(f => formData.append('attachments', f));

      await API.put(`/tasks/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Task updated!');
      navigate(`/tasks/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update task');
    } finally { setLoading(false); }
  };

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm({ ...form, tags: [...form.tags, tagInput.trim()] });
      setTagInput('');
    }
  };
  const removeTag = (tag) => setForm({ ...form, tags: form.tags.filter(t => t !== tag) });
  const removeFile = (index) => setFiles(files.filter((_, i) => i !== index));

  const isReadOnly = user.role === 'admin' && taskAssignedByRole === 'superadmin';

  let filteredUsers = users.filter((u) => {
    if (user.role === "superadmin") {
      return u.role === "admin" || u.role === "user";
    }
    if (user.role === "admin") {
      return u.role === "user";
    }
    return false;
  });

  if (form.team) {
    const selectedTeam = teams.find(t => t._id === form.team);
    if (selectedTeam && selectedTeam.members) {
      const memberIds = selectedTeam.members.map(m => m.user?._id || m.user);
      filteredUsers = filteredUsers.filter(u => memberIds.includes(u._id));
    }
  }

  return (
    <div>
      <SEO title="Edit Task" description="Update and modify task attributes and assignments on TaskFlow." robots="noindex, nofollow" />
      <div className="page-header">
        <div className="flex gap-3" style={{ alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => navigate(-1)}>
            <MdArrowBack /> Back
          </button>
          <div>
            <h1>Edit Task</h1>
            <p>Update task details.</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          {isReadOnly && (
            <div style={{
              background: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              color: 'var(--warning-text, #a16207)',
              padding: '12px 16px',
              borderRadius: 'var(--radius)',
              marginBottom: 20,
              fontSize: 14,
              fontWeight: 500
            }}>
              ⚠️ This task was created/assigned by a superadmin. As an admin, you can only reassign this task to another user.
            </div>
          )}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header"><span className="card-title">Task Details</span></div>
            <div className="form-group">
              <label className="form-label required">Title</label>
              <input className="form-control" placeholder="Task title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required disabled={isReadOnly} />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-control" rows={4} placeholder="Describe the task..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} disabled={isReadOnly} />
            </div>
            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Priority</label>
                <select className="form-control" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} disabled={isReadOnly}>
                  {['low', 'medium', 'high', 'urgent'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Date & Time</label>
                <input className="form-control" type="datetime-local" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} disabled={isReadOnly} />
              </div>
              <div className="form-group">
                <label className="form-label">Due Date & Time</label>
                <input className="form-control" type="datetime-local" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} disabled={isReadOnly} />
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header"><span className="card-title">Assignment</span></div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Assignee</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px', background: 'var(--bg)' }}>
                  {filteredUsers.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 12, textAlign: 'center' }}>No users available for this team</div>}
                  {filteredUsers.map((u) => {
                    const isSelected = form.assignees.includes(u._id);
                    return (
                      <div 
                        key={u._id} 
                        onClick={() => {
                          if (isSelected) {
                            setForm({ ...form, assignees: form.assignees.filter(id => id !== u._id) });
                          } else {
                            setForm({ ...form, assignees: [...form.assignees, u._id] });
                          }
                        }}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 12, 
                          padding: '8px 12px', 
                          cursor: 'pointer', 
                          borderRadius: '6px',
                          background: isSelected ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => !isSelected && (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={(e) => !isSelected && (e.currentTarget.style.background = 'transparent')}
                      >
                        <div className="avatar avatar-sm" style={{ background: isSelected ? 'var(--primary)' : '#9ca3af', width: 32, height: 32, fontSize: 13, flexShrink: 0, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {u.name?.[0]?.toUpperCase()}
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: 14, fontWeight: isSelected ? 600 : 500, color: isSelected ? 'var(--primary)' : 'var(--text)' }}>{u.name}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</span>
                        </div>
                        {isSelected && <div style={{ color: 'var(--primary)', fontSize: 18, fontWeight: 'bold' }}>✓</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Team (Optional)</label>
                <select className="form-control" value={form.team} onChange={e => setForm({ ...form, team: e.target.value })} disabled={isReadOnly}>
                  <option value="">No Team</option>
                  {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header"><span className="card-title">Attachments</span></div>
            <div style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius)', padding: 20, textAlign: 'center', cursor: isReadOnly ? 'not-allowed' : 'pointer', opacity: isReadOnly ? 0.6 : 1 }}
              onClick={() => !isReadOnly && document.getElementById('file-input').click()}>
              <MdAttachFile style={{ fontSize: 32, color: 'var(--text-muted)', marginBottom: 8 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Click to upload files (max 5, 10MB each)</p>
              <p style={{ color: 'var(--text-light)', fontSize: 11 }}>PDF, DOC, XLS, Images, ZIP</p>
              <input id="file-input" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip,.txt" style={{ display: 'none' }}
                onChange={e => {
                  const selectedFiles = Array.from(e.target.files);
                  const validFiles = [];
                  selectedFiles.forEach(file => {
                    if (file.size > 10 * 1024 * 1024) {
                      toast.error(`File "${file.name}" is too large. Max size is 10MB.`);
                    } else {
                      validFiles.push(file);
                    }
                  });
                  if (validFiles.length > 0) {
                    setFiles(prev => {
                      const combined = [...prev, ...validFiles];
                      if (combined.length > 5) {
                        toast.error('You can upload a maximum of 5 attachments.');
                      }
                      return combined.slice(0, 5);
                    });
                  }
                }} disabled={isReadOnly} />
            </div>
            {files.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {files.map((f, i) => (
                  <div key={i} className="flex-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span>{f.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: 'var(--text-muted)' }}>{(f.size / 1024).toFixed(1)} KB</span>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(i);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: 2,
                          }}
                          title="Remove attachment"
                        >
                          <MdClose style={{ fontSize: 16 }} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Update Task'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTaskPage;
