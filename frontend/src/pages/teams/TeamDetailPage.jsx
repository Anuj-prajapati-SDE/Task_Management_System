import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { MdArrowBack, MdPersonAdd, MdDelete, MdSend, MdEmojiEmotions, MdAccountTree } from 'react-icons/md';
import { io } from 'socket.io-client';
import EmojiPicker from 'emoji-picker-react';
import TaskWorkflowPage from '../dashboard/TaskWorkflowPage';

const TeamDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('members');
  const [chatInput, setChatInput] = useState('');
  const [editingChatId, setEditingChatId] = useState(null);
  const [editChatInput, setEditChatInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const chatEndRef = React.useRef(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [users, setUsers] = useState([]);
  const [addForm, setAddForm] = useState({ userIds: [], role: 'member' });
  const [teamTasks, setTeamTasks] = useState([]);

  const fetchData = async () => {
    try {
      const reqs = [
        API.get(`/teams/${id}`),
        API.get(`/teams/${id}/stats`),
        API.get('/tasks', { params: { team: id } }),
      ];
      
      if (user.role !== 'user') {
        reqs.push(API.get('/users'));
      }

      const results = await Promise.all(reqs);
      
      setTeam(results[0].data.data);
      setStats(results[1].data.data);
      setTeamTasks(results[2].data.data);
      
      if (user.role !== 'user') {
        setUsers(results[3].data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load team details');
      navigate('/teams');
    }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000');
    socket.emit('join_team', id);

    socket.on('new_team_chat', (newChat) => {
      setTeam((prev) => {
        if (!prev) return prev;
        const exists = prev.chats?.find(c => c._id === newChat._id);
        if (exists) return prev;
        return { ...prev, chats: [...(prev.chats || []), newChat] };
      });
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    socket.on('team_chat_updated', (updatedChat) => {
      setTeam((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          chats: prev.chats?.map(c => c._id === updatedChat._id ? updatedChat : c)
        };
      });
    });

    socket.on('team_chat_deleted', (deletedChatId) => {
      setTeam((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          chats: prev.chats?.filter(c => c._id !== deletedChatId)
        };
      });
    });

    return () => socket.disconnect();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'chats') {
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'auto' }), 100);
    }
  }, [activeTab]);

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    try {
      await API.post(`/teams/${id}/chats`, { message: chatInput });
      setChatInput('');
    } catch {
      toast.error('Failed to send message');
    }
  };

  const handleEditChat = async (chatId) => {
    if (!editChatInput.trim()) return;
    try {
      await API.put(`/teams/${id}/chats/${chatId}`, { message: editChatInput });
      setEditingChatId(null);
      setEditChatInput('');
    } catch {
      toast.error('Failed to edit message');
    }
  };

  const handleDeleteChat = async (chatId) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await API.delete(`/teams/${id}/chats/${chatId}`);
    } catch {
      toast.error('Failed to delete message');
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (addForm.userIds.length === 0) return toast.error('Please select at least one user');
    try { 
      await Promise.all(addForm.userIds.map(userId => 
        API.post(`/teams/${id}/members`, { userId, role: addForm.role })
      ));
      toast.success('Members added'); 
      setShowAddMember(false); 
      setAddForm({ userIds: [], role: 'member' });
      fetchData(); 
    }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to add some members'); }
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
          {['members', 'tasks', 'chats', 'workflow'].map(tab => (
            <div key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </div>
          ))}
        </div>

        {activeTab === 'members' && (
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Member</th><th>Department</th><th>Position</th><th>Role</th><th>Joined</th>{isOwnerOrAdmin && <th>Actions</th>}</tr></thead>
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
                    <td><div style={{ fontSize: 13 }}>{m.user?.department || '—'}</div></td>
                    <td><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{m.user?.position || '—'}</div></td>
                    <td>
                      <div className="flex gap-2" style={{ alignItems: 'center' }}>
                        <span className="badge badge-primary">
                          {m.role === 'leader' ? 'Leader' : m.role === 'member' ? 'Member' : 'Viewer'}
                        </span>
                      </div>
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

        {activeTab === 'chats' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '400px', position: 'relative' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {team.chats?.length === 0 ? (
                <div className="empty-state" style={{ margin: 'auto' }}><p>No messages yet. Start the conversation!</p></div>
              ) : (
                team.chats?.map((chat, i) => {
                  const isMe = chat.user?._id === user._id;
                  const isEditing = editingChatId === chat._id;

                  return (
                    <div key={chat._id || i} style={{ display: 'flex', gap: '10px', alignSelf: isMe ? 'flex-end' : 'flex-start', flexDirection: isMe ? 'row-reverse' : 'row', maxWidth: '80%' }}>
                      <div className="avatar avatar-sm" style={{ background: isMe ? '#4f46e5' : '#06b6d4', flexShrink: 0 }}>
                        {getInitials(chat.user?.name)}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', width: '100%' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{chat.user?.name} • {format(new Date(chat.createdAt), 'h:mm a')}</span>
                          {isMe && !isEditing && (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button className="btn-ghost" style={{ fontSize: '11px', padding: 0, color: 'var(--primary)', cursor: 'pointer', border: 'none', background: 'transparent' }} onClick={() => { setEditingChatId(chat._id); setEditChatInput(chat.message); }}>Edit</button>
                              <button className="btn-ghost" style={{ fontSize: '11px', padding: 0, color: 'var(--danger)', cursor: 'pointer', border: 'none', background: 'transparent' }} onClick={() => handleDeleteChat(chat._id)}>Delete</button>
                            </div>
                          )}
                        </span>
                        
                        {isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', minWidth: '200px' }}>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={editChatInput} 
                              onChange={e => setEditChatInput(e.target.value)} 
                              autoFocus 
                            />
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button className="btn btn-sm btn-ghost" onClick={() => setEditingChatId(null)}>Cancel</button>
                              <button className="btn btn-sm btn-primary" onClick={() => handleEditChat(chat._id)}>Save</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ background: isMe ? '#4f46e5' : 'var(--bg)', color: isMe ? '#fff' : 'var(--text-color)', padding: '8px 12px', borderRadius: '12px', border: isMe ? 'none' : '1px solid var(--border)', wordBreak: 'break-word' }}>
                            {chat.message}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>
            {showEmojiPicker && (
              <div style={{ position: 'absolute', bottom: '60px', left: '10px', zIndex: 100 }}>
                <EmojiPicker onEmojiClick={(emojiObject) => setChatInput(prev => prev + emojiObject.emoji)} />
              </div>
            )}
            <form onSubmit={handleSendChat} style={{ display: 'flex', gap: '10px', marginTop: '10px', borderTop: '1px solid var(--border)', paddingTop: '10px', alignItems: 'center' }}>
              <button type="button" className="btn-icon" onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <MdEmojiEmotions />
              </button>
              <input
                type="text"
                className="form-control"
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary" disabled={!chatInput.trim()}>
                <MdSend /> Send
              </button>
            </form>
          </div>
        )}

        {activeTab === 'workflow' && (
          <div style={{ marginTop: '20px' }}>
            <TaskWorkflowPage teamId={team._id} />
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
                <div className="form-group">
                  <label className="form-label required">Select Users</label>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px' }}>
                    {Object.entries(
                      users
                        .filter(u => !team.members?.find(m => m.user?._id === u._id))
                        .filter(u => user.role === 'admin' ? u.role === 'user' : true)
                        .reduce((acc, u) => {
                          const dept = u.department || 'Unassigned';
                          if (!acc[dept]) acc[dept] = [];
                          acc[dept].push(u);
                          return acc;
                        }, {})
                    ).map(([dept, deptUsers]) => (
                      <div key={dept} style={{ marginBottom: '10px' }}>
                        <div style={{ fontWeight: '600', marginBottom: '5px', color: 'var(--primary)', fontSize: '13px' }}>{dept}</div>
                        {deptUsers.map(u => (
                          <div key={`add-member-${u._id}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                            <input 
                              type="checkbox" 
                              id={`add-member-checkbox-${u._id}`}
                              checked={addForm.userIds.includes(u._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAddForm(prev => ({ ...prev, userIds: [...prev.userIds, u._id] }));
                                } else {
                                  setAddForm(prev => ({ ...prev, userIds: prev.userIds.filter(id => id !== u._id) }));
                                }
                              }}
                              style={{ marginRight: '8px', cursor: 'pointer' }}
                            />
                            <label htmlFor={`add-member-checkbox-${u._id}`} style={{ fontSize: '14px', margin: 0, cursor: 'pointer' }}>
                              {u.name} <span style={{fontSize: '12px', color: 'var(--text-muted)'}}>({u.role}) - {u.position || 'No Position'}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    ))}
                    {users.filter(u => !team.members?.find(m => m.user?._id === u._id)).length === 0 && (
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>No available users to add.</div>
                    )}
                  </div>
                </div>
                <div className="form-group"><label className="form-label">Role to Assign</label>
                  <select className="form-control" value={addForm.role} onChange={e => setAddForm({ ...addForm, role: e.target.value })}>
                    <option value="leader">Leader</option><option value="member">Member</option>
                  </select>
                </div>
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

export default TeamDetailPage;
