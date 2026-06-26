import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

import toast from 'react-hot-toast';
import { MdAdd, MdDelete } from 'react-icons/md';

// ===== TEAMS LIST =====
export const TeamsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [users, setUsers] = useState([]);
  const [selectedLeader, setSelectedLeader] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);

  const fetchTeams = async () => {
    try { const { data } = await API.get('/teams'); setTeams(data.data); }
    catch {} finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    try { const { data } = await API.get('/users'); setUsers(data.data); }
    catch {}
  };

  useEffect(() => { 
    fetchTeams(); 
    if (user.role !== 'user') fetchUsers();
  }, [user.role]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try { 
      const membersPayload = [];
      if (selectedLeader) membersPayload.push({ user: selectedLeader, role: 'leader' });
      selectedMembers.forEach(m => {
        if (m !== selectedLeader) membersPayload.push({ user: m, role: 'member' });
      });

      const payload = { ...form, members: membersPayload };
      await API.post('/teams', payload); 
      toast.success('Team created!'); 
      setShowCreate(false); 
      setForm({ name: '', description: '' }); 
      setSelectedLeader('');
      setSelectedMembers([]);
      fetchTeams(); 
    }
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
                
                <div className="form-group"><label className="form-label">Team Leader</label>
                  <select className="form-control" value={selectedLeader} onChange={e => setSelectedLeader(e.target.value)}>
                    <option value="">Select a Leader</option>
                    {users.map(u => <option key={`leader-${u._id}`} value={u._id}>{u.name} - {u.department || 'No Dept'}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Team Members</label>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px' }}>
                    {Object.entries(
                      users.reduce((acc, u) => {
                        const dept = u.department || 'Unassigned';
                        if (!acc[dept]) acc[dept] = [];
                        acc[dept].push(u);
                        return acc;
                      }, {})
                    ).map(([dept, deptUsers]) => (
                      <div key={dept} style={{ marginBottom: '10px' }}>
                        <div style={{ fontWeight: '600', marginBottom: '5px', color: 'var(--primary)', fontSize: '13px' }}>{dept}</div>
                        {deptUsers.map(u => (
                          <div key={`member-${u._id}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                            <input 
                              type="checkbox" 
                              id={`member-checkbox-${u._id}`}
                              checked={selectedMembers.includes(u._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedMembers([...selectedMembers, u._id]);
                                } else {
                                  setSelectedMembers(selectedMembers.filter(id => id !== u._id));
                                }
                              }}
                              style={{ marginRight: '8px', cursor: 'pointer' }}
                            />
                            <label htmlFor={`member-checkbox-${u._id}`} style={{ fontSize: '14px', margin: 0, cursor: 'pointer' }}>{u.name} <span style={{fontSize: '12px', color: 'var(--text-muted)'}}>({u.role})</span></label>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
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
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: '4px' }}>{team.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      <div><span style={{fontWeight: 500}}>Creator:</span> {team.owner?.name || 'Unknown'}</div>
                      <div style={{marginTop: '2px'}}><span style={{fontWeight: 500}}>Leader:</span> {team.members?.find(m => m.role === 'leader')?.user?.name || 'Not Assigned'}</div>
                    </div>
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

export default TeamsPage;