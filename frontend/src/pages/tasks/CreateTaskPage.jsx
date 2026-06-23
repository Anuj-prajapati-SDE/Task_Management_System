import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { MdAdd, MdClose, MdAttachFile } from 'react-icons/md';
import { useAuth } from '../../context/AuthContext';

const formatDateTimeLocal = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const pad = (num) => String(num).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const TaskForm = ({ isEdit = false }) => {
  const {user} = useAuth();
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
    assignee: '', team: '', dueDate: '', startDate: '', tags: [], labels: [],
    isRecurring: false, recurringPattern: { frequency: 'weekly', interval: 1 },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, teamsRes] = await Promise.all([API.get('/users'), API.get('/teams')]);
        setUsers(usersRes.data.data);
        setTeams(teamsRes.data.data);
      } catch {}
    };
    fetchData();

    if (isEdit && id) {
      API.get(`/tasks/${id}`).then(({ data }) => {
        const t = data.data;
        setTaskAssignedByRole(t.assignedBy?.role || null);
        setForm({
          title: t.title, description: t.description, status: t.status, priority: t.priority,
          assignee: t.assignee?._id || '', team: t.team?._id || '',
          dueDate: t.dueDate ? formatDateTimeLocal(t.dueDate) : '',
          startDate: t.startDate ? formatDateTimeLocal(t.startDate) : '',
          tags: t.tags || [], labels: t.labels || [],
          isRecurring: t.isRecurring, recurringPattern: t.recurringPattern || { frequency: 'weekly', interval: 1 },
        });
      }).catch(() => toast.error('Failed to load task'));
    }
  }, [isEdit, id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v === '' && (k === 'team' || k === 'assignee')) {
          // don't append empty string for ObjectId fields to avoid Cast error
        } else if (Array.isArray(v)) {
          formData.append(k, JSON.stringify(v));
        } else if (typeof v === 'object' && v !== null) {
          formData.append(k, JSON.stringify(v));
        } else {
          formData.append(k, v);
        }
      });
      if (isEdit) {
        if (form.team === '') formData.append('team', ''); // some backends handle empty string to unset, or need custom handling
        // actually if backend fails on empty string we should send null
      }
      files.forEach(f => formData.append('attachments', f));

      if (isEdit) {
        await API.put(`/tasks/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Task updated!');
        navigate(`/tasks/${id}`);
      } else {
        const res = await API.post('/tasks', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Task created!');
        navigate(`/tasks/${res.data.data._id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
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

  const isReadOnly = isEdit && user.role === 'admin' && taskAssignedByRole === 'superadmin';

  const filteredUsers = users.filter((u) => {
  if (user.role === "superadmin") {
    return u.role === "admin" || u.role === "user";
  }

  if (user.role === "admin") {
    return u.role === "user";
  }

  
  return false;
});

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{isEdit ? 'Edit Task' : 'Create New Task'}</h1>
          <p>{isEdit ? 'Update task details.' : 'Fill in the details to create a new task.'}</p>
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
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-control" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} disabled={isReadOnly}>
                  {['pending', 'in_progress', 'review', 'completed', 'cancelled'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="form-group">
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
                   <select
                    className="form-control"
                    value={form.assignee}
                    onChange={(e) =>
                    setForm({ ...form, assignee: e.target.value })
                    }>
                      <option value="">Unassigned</option>

                        {filteredUsers.map((u) => (
                         <option key={u._id} value={u._id}>
                       {u.name} ({u.email})
                         </option>
                        ))}
                      </select>
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
            <div className="card-header"><span className="card-title">Tags</span></div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input className="form-control" placeholder="Add a tag..." value={tagInput}
                onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), !isReadOnly && addTag())} disabled={isReadOnly} />
              <button type="button" className="btn btn-secondary" onClick={addTag} disabled={isReadOnly}><MdAdd /></button>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {form.tags.map((tag, i) => (
                <span key={i} className="tag">{tag} {!isReadOnly && <button type="button" className="tag-remove" onClick={() => removeTag(tag)}><MdClose /></button>}</span>
              ))}
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
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : isEdit ? 'Update Task' : 'Create Task'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const CreateTaskPage = () => <TaskForm isEdit={false} />;
export const EditTaskPage = () => <TaskForm isEdit={true} />;

export default CreateTaskPage;
