import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  MdDashboard, MdAssignment, MdCalendarMonth,
  MdPeople, MdGroup, MdBarChart,
  MdSecurity, MdMenu,
  MdLogout, MdClose, MdTask, MdNotifications, MdAccountTree,
  MdRateReview
} from 'react-icons/md';
import io from 'socket.io-client';
import api from '../../utils/api';
import './DashboardLayout.css';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  useEffect(() => {
    if (user) {
      const fetchNotifications = async () => {
        try {
          const res = await api.get('/notifications');
          if (res.data.success) {
            setNotifications(res.data.data);
          }
        } catch (err) {
          console.error('Failed to fetch notifications:', err);
        }
      };
      fetchNotifications();

      const socket = io(import.meta.env.VITE_SOCKET_URL);
      socket.emit('join_room', user._id);

      socket.on('new_notification', (notification) => {
        setNotifications((prev) => [notification, ...prev]);
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await api.put(`/notifications/${notif._id}/read`);
        setNotifications((prev) => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
      } catch (err) {
        console.error('Failed to mark as read', err);
      }
    }
    setShowNotifications(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleLogout = async () => { await logout(); navigate('/login'); };
 
  const navItems = [
    { icon: <MdDashboard />, label: 'Dashboard', to: '/dashboard', roles: ['user', 'admin', 'superadmin'] },
    { icon: <MdRateReview />, label: 'Daily Update', to: '/daily-update', roles: ['user', 'admin', 'superadmin'] },
    { icon: <MdAssignment />, label: 'My Tasks', to: '/tasks', roles: ['user', 'admin', 'superadmin'] },
    { icon: <MdAccountTree />, label: 'Task Workflow', to: '/workflow', roles: ['admin', 'superadmin'] },
    { icon: <MdCalendarMonth />, label: 'Calendar', to: '/calendar', roles: ['user', 'admin', 'superadmin'] },
    { icon: <MdGroup />, label: 'Teams', to: '/teams', roles: ['user', 'admin', 'superadmin'] },
    { icon: <MdPeople />, label: 'Users', to: '/users', roles: ['admin', 'superadmin'] },
    { icon: <MdBarChart />, label: 'Reports', to: '/reports', roles: ['admin', 'superadmin'] },
    { icon: <MdSecurity />, label: 'System Settings', to: '/system-settings', roles: ['superadmin'] },
  ];

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';


  return (
    <div className="layout">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-icon"><MdTask /></div>
          <span className="brand-name">TaskFlow</span>
          {/* Close button for mobile sidebar */}
          <button className="mobile-only-btn close-sidebar" onClick={() => setSidebarOpen(false)}>
            <MdClose size={24} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item, idx) => {
            if (!item.roles.includes(user?.role)) return null;
            if (item.divider) return (
              <div key={idx} className="nav-section">
                <div className="nav-section-label">{item.label}</div>
              </div>
            );
            return (
              <NavLink
                key={idx}
                to={item.to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label-text">{item.label}</span>
                {item.badge > 0 && <span className="nav-badge">{item.badge > 99 ? '99+' : item.badge}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={() => navigate('/settings/profile')}>
            {user?.avatar
              ? <img src={`${import.meta.env.VITE_SOCKET_URL}${user.avatar}?t=${new Date(user.updatedAt || Date.now()).getTime()}`} alt={user.name} className="avatar" style={{ objectFit: 'cover' }} />
              : <div className="avatar" style={{ background: '#4f46e5' }}>{getInitials(user?.name)}</div>
            }
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        <header className="topbar">
          {/* Hamburger Icon for Mobile */}
          <button className="mobile-only-btn hamburger-menu" onClick={() => setSidebarOpen(true)}>
            <MdMenu size={24} />
          </button>



          <div className="topbar-actions">
            {/* Notification Bell */}
            <div className="notification-wrapper" ref={notificationRef} style={{ position: 'relative', marginRight: '16px', display: 'flex', alignItems: 'center' }}>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => setShowNotifications(!showNotifications)}
                style={{ position: 'relative', padding: '8px' }}
              >
                <MdNotifications size={24} color="#64748b" />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 4, right: 4, background: 'var(--danger)', color: 'white',
                    fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '10px', border: '2px solid white'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, width: '320px', background: 'white',
                  borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 1000, overflow: 'hidden', marginTop: '10px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text-color)' }}>Notifications</h4>
                    {unreadCount > 0 && (
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: '12px', padding: '4px 8px', color: 'var(--primary)' }} onClick={handleMarkAllRead}>
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>No notifications yet</div>
                    ) : (
                      notifications.map(notif => (
                        <div 
                          key={notif._id} 
                          onClick={() => handleNotificationClick(notif)}
                          style={{
                            padding: '16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                            background: notif.isRead ? 'white' : '#f0f9ff',
                            transition: 'background 0.2s',
                            display: 'flex', flexDirection: 'column', gap: '4px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = notif.isRead ? '#f8fafc' : '#e0f2fe'}
                          onMouseLeave={(e) => e.currentTarget.style.background = notif.isRead ? 'white' : '#f0f9ff'}
                        >
                          <div style={{ fontSize: '14px', fontWeight: notif.isRead ? '500' : '600', color: 'var(--text-color)' }}>{notif.title}</div>
                          <div style={{ fontSize: '13px', color: '#64748b' }}>{notif.message}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                            {new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Standardized Avatar Trigger */}
            <div className="topbar-user-trigger" onClick={() => navigate('/settings/profile')}>
              {user?.avatar
                ? <img src={`${import.meta.env.VITE_SOCKET_URL}${user.avatar}?t=${new Date(user.updatedAt || Date.now()).getTime()}`} alt={user.name} className="topbar-avatar" style={{ objectFit: 'cover' }} />
                : <div className="avatar mini-initials">{getInitials(user?.name)}</div>
              }
            </div>

            <button className="btn btn-ghost btn-sm topbar-logout" onClick={handleLogout} title="Logout">
              <MdLogout />
            </button>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;