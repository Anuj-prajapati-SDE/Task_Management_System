import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { MdAdd, MdGroup, MdPeople, MdSettings, MdArrowBack, MdPersonAdd, MdDelete, MdEdit } from 'react-icons/md';

// ===== TEAMS LIST =====
export const TeamsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  const fetchTeams = async () => {
    try { const { data } = await API.get('/teams'); setTeams(data.data); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchTeams(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try { await API.post('/teams', form); toast.success('Team created!'); setShowCreate(false); setForm({ name: '', description: '' }); fetchTeams(); }
    catch { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this team?')) return;
    try { await API.delete(`/teams/${id}`); toast.success('Team deleted'); fetchTeams(); }
    catch { toast.error('Failed'); }
  };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'T';

  return (
    <div>
      <div className="page-header">
        <div><h1>Teams</h1><p>Collaborate with your team members.</p></div>
        {user.role !== 'user' && (<button className="btn btn-primary" onClick={() => setShowCreate(true)}><MdAdd /> New Team</button>)}
        
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Create Team</span>
              <button className="modal-close" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label required">Team Name</label>
                  <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Description</label>
                  <textarea className="form-control" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Team</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid-3">{[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 12 }} />)}</div>
      ) : teams.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>No teams yet</h3>
            <p>Create a team to collaborate with others.</p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}><MdAdd /> Create Team</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {teams.map(team => (
            <div key={team._id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/teams/${team._id}`)}>
              <div className="flex-between" style={{ marginBottom: 12 }}>
                <div className="flex gap-2" style={{ alignItems: 'center' }}>
                  <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                    {getInitials(team.name)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{team.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>by {team.owner?.name}</div>
                  </div>
                </div>
                {(user.role !== 'user' || team.owner?._id === user._id) && (
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={e => { e.stopPropagation(); handleDelete(team._id); }}
                    style={{ color: 'var(--danger)' }}><MdDelete /></button>
                )}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, minHeight: 36 }}>
                {team.description || 'No description.'}
              </p>
              <div className="flex-between">
                <div className="avatar-group">
                  {team.members?.slice(0, 4).map((m, i) => (
                    <div key={i} className="avatar avatar-sm" style={{ background: '#4f46e5' }}>{m.user?.name?.[0]}</div>
                  ))}
                  {team.members?.length > 4 && <div className="avatar avatar-sm" style={{ background: 'var(--text-muted)', fontSize: 10 }}>+{team.members.length - 4}</div>}
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{team.members?.length || 0} members</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ===== TEAM DETAIL =====
export const TeamDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('members');
  const [showAddMember, setShowAddMember] = useState(false);
  const [users, setUsers] = useState([]);
  const [addForm, setAddForm] = useState({ userId: '', role: 'member' });
  const [teamTasks, setTeamTasks] = useState([]);

  const fetchData = async () => {
    try {
      const [teamRes, statsRes, usersRes, tasksRes] = await Promise.all([
        API.get(`/teams/${id}`),
        API.get(`/teams/${id}/stats`),
        API.get('/users'),
        API.get('/tasks', { params: { team: id } }),
      ]);
      setTeam(teamRes.data.data);
      setStats(statsRes.data.data);
      setUsers(usersRes.data.data);
      setTeamTasks(tasksRes.data.data);
    } catch { navigate('/teams'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    try { await API.post(`/teams/${id}/members`, addForm); toast.success('Member added'); setShowAddMember(false); fetchData(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    try { await API.delete(`/teams/${id}/members/${userId}`); toast.success('Removed'); fetchData(); }
    catch { toast.error('Failed'); }
  };

  const handleRoleChange = async (userId, role) => {
    try { await API.patch(`/teams/${id}/members/${userId}/role`, { role }); fetchData(); }
    catch { toast.error('Failed'); }
  };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  if (loading) return <div className="skeleton" style={{ height: 400, borderRadius: 12 }} />;
  if (!team) return null;

  const isOwnerOrAdmin = team.owner?._id === user._id || user.role !== 'user';

  return (
    <div>
      <div className="page-header">
        <div className="flex gap-3" style={{ alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/teams')}><MdArrowBack /> Back</button>
          <div>
            <h1>{team.name}</h1>
            <p>{team.description || 'No description'}</p>
          </div>
        </div>
        {isOwnerOrAdmin && (
          <button className="btn btn-primary" onClick={() => setShowAddMember(true)}><MdPersonAdd /> Add Member</button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="stat-grid" style={{ marginBottom: 20 }}>
          {[
            { label: 'Total', value: stats.total, color: '#4f46e5' },
            { label: 'In Progress', value: stats.in_progress, color: '#3b82f6' },
            { label: 'Completed', value: stats.completed, color: '#10b981' },
            { label: 'Overdue', value: stats.overdue, color: '#ef4444' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label} Tasks</div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="tabs">
          {['members', 'tasks'].map(tab => (
            <div key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </div>
          ))}
        </div>

        {activeTab === 'members' && (
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Member</th><th>Role</th><th>Joined</th>{isOwnerOrAdmin && <th>Actions</th>}</tr></thead>
              <tbody>
                {team.members?.map(m => (
                  <tr key={m.user?._id}>
                    <td><div className="flex gap-2" style={{ alignItems: 'center' }}>
                      <div className="avatar avatar-sm" style={{ background: '#4f46e5' }}>
                        {m.user?.avatar ? <img src={`http://localhost:5000${m.user.avatar}`} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : getInitials(m.user?.name)}
                      </div>
                      <div><div style={{ fontWeight: 500, fontSize: 13 }}>{m.user?.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.user?.email}</div></div>
                    </div></td>
                    <td>
                      {isOwnerOrAdmin && m.user?._id !== team.owner?._id ? (
                        <select className="form-control" style={{ width: 120, padding: '4px 8px', fontSize: '13px'}} value={m.role}
                          onChange={e => handleRoleChange(m.user._id, e.target.value)}>
                          <option value="leader">Leader</option>
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      ) : <span className="badge badge-primary">{m.role}</span>}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{format(new Date(m.joinedAt), 'MMM d, yyyy')}</td>
                    {isOwnerOrAdmin && (
                      <td>
                        {m.user?._id !== team.owner?._id && m.user?._id !== user._id && (
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleRemoveMember(m.user._id)}>
                            <MdDelete />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Task</th><th>Status</th><th>Priority</th><th>Assignee</th><th>Due Date</th></tr></thead>
              <tbody>
                {teamTasks.length === 0 ? (
                  <tr><td colSpan={5}><div className="empty-state"><p>No tasks for this team.</p></div></td></tr>
                ) : teamTasks.map(task => (
                  <tr key={task._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/tasks/${task._id}`)}>
                    <td style={{ fontWeight: 500 }}>{task.title}</td>
                    <td><span className={`badge status-${task.status}`}>{task.status.replace('_', ' ')}</span></td>
                    <td><span className={`badge priority-${task.priority}`}>{task.priority}</span></td>
                    <td style={{ fontSize: 12 }}>{task.assignee?.name || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{task.dueDate ? format(new Date(task.dueDate), 'MMM d') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddMember(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Add Team Member</span>
              <button className="modal-close" onClick={() => setShowAddMember(false)}>✕</button>
            </div>
            <form onSubmit={handleAddMember}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label required">Select User</label>
                  <select className="form-control" value={addForm.userId} onChange={e => setAddForm({ ...addForm, userId: e.target.value })} required>
                    <option value="">Choose a user...</option>
                    {users
                      .filter(u => !team.members?.find(m => m.user?._id === u._id))
                      .filter(u => user.role === 'admin' ? u.role === 'user' : true)
                      .map(u => (
                        <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                      ))}
                  </select></div>
                <div className="form-group"><label className="form-label">Role</label>
                  <select className="form-control" value={addForm.role} onChange={e => setAddForm({ ...addForm, role: e.target.value })}>
                    <option value="leader">Leader</option><option value="member">Member</option><option value="viewer">Viewer</option>
                  </select></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddMember(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Member</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamsPage;
