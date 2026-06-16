import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { MdNotifications, MdMarkEmailRead, MdDelete, MdCheckCircle, MdTask, MdEdit, MdTimer, MdCelebration } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { GoAlert, GoMention } from "react-icons/go";
import { RiTeamFill } from "react-icons/ri";

const typeIcons = {
  task_assigned: <MdTask />, task_updated: <MdEdit />, task_completed: <MdCheckCircle />,
  task_due: <MdTimer />, task_overdue: <GoAlert />, comment_added: '💬',
  mention: <GoMention />, team_invite: <RiTeamFill />, team_joined: <MdCelebration />, system: <MdNotifications />,
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });

  const fetchNotifications = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filter === 'unread') params.isRead = false;
      const { data } = await API.get('/notifications', { params });
      setNotifications(data.data);
      setUnreadCount(data.unreadCount);
      setPagination(data.pagination);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchNotifications(); }, [filter]);

  const handleMarkRead = async (id) => {
    try {
      await API.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try { await API.patch('/notifications/mark-all-read'); setNotifications(prev => prev.map(n => ({ ...n, isRead: true }))); setUnreadCount(0); toast.success('All marked as read'); }
    catch { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    try { await API.delete(`/notifications/${id}`); setNotifications(prev => prev.filter(n => n._id !== id)); }
    catch {}
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Delete all notifications?')) return;
    try { await API.delete('/notifications/all'); setNotifications([]); setUnreadCount(0); toast.success('Cleared'); }
    catch { toast.error('Failed'); }
  };

  const handleClick = (notification) => {
    if (!notification.isRead) handleMarkRead(notification._id);
    if (notification.link) navigate(notification.link);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Notifications</h1>
          {unreadCount > 0 && <p>{unreadCount} unread notification{unreadCount > 1 ? 's' : ''}</p>}
        </div>
        <div className="header-actions">
          {unreadCount > 0 && <button className="btn btn-secondary" onClick={handleMarkAllRead}><MdMarkEmailRead /> Mark All Read</button>}
          {notifications.length > 0 && <button className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={handleDeleteAll}><MdDelete /> Clear All</button>}
        </div>
      </div>

      <div className="card">
        <div className="tabs" style={{ marginBottom: 16 }}>
          {['all', 'unread'].map(f => (
            <div key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === 'unread' && unreadCount > 0 && <span className="badge badge-danger" style={{ marginLeft: 6 }}>{unreadCount}</span>}
            </div>
          ))}
        </div>

        {loading ? (
          <div>{[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 72, marginBottom: 8, borderRadius: 8 }} />)}</div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><MdNotifications /></div>
            <h3>No notifications</h3>
            <p>You're all caught up!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {notifications.map(n => (
              <div key={n._id}
                style={{ display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 'var(--radius)', background: n.isRead ? 'transparent' : 'rgba(79,70,229,0.05)', cursor: n.link ? 'pointer' : 'default', transition: 'background 0.15s', border: '1px solid transparent', alignItems: 'flex-start' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background = n.isRead ? 'transparent' : 'rgba(79,70,229,0.05)'}
                onClick={() => handleClick(n)}>
                <div style={{ fontSize: 24, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{typeIcons[n.type] || <MdNotifications />}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex-between" style={{ marginBottom: 2 }}>
                    <span style={{ fontWeight: n.isRead ? 400 : 600, fontSize: 14 }}>{n.title}</span>
                    <div className="flex gap-2" style={{ alignItems: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{format(new Date(n.createdAt), 'MMM d, h:mm a')}</span>
                      {!n.isRead && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }} />}
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{n.message}</p>
                  {n.sender && <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>from {n.sender.name}</div>}
                </div>
                <div className="flex gap-1" style={{ flexShrink: 0 }}>
                  {!n.isRead && (
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={e => { e.stopPropagation(); handleMarkRead(n._id); }} title="Mark as read">
                      <MdCheckCircle style={{ color: 'var(--success)', fontSize: 16 }} />
                    </button>
                  )}
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={e => { e.stopPropagation(); handleDelete(n._id); }} title="Delete">
                    <MdDelete style={{ color: 'var(--danger)', fontSize: 16 }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="pagination">
            <button className="page-btn" onClick={() => fetchNotifications(pagination.page - 1)} disabled={pagination.page === 1}>‹</button>
            {[...Array(pagination.pages)].map((_, i) => (
              <button key={i} className={`page-btn ${pagination.page === i + 1 ? 'active' : ''}`} onClick={() => fetchNotifications(i + 1)}>{i + 1}</button>
            ))}
            <button className="page-btn" onClick={() => fetchNotifications(pagination.page + 1)} disabled={pagination.page === pagination.pages}>›</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
