import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../utils/api';
import { LuSun, LuMoon } from "react-icons/lu";
import {
  MdDashboard, MdAssignment, MdViewKanban, MdCalendarMonth,
  MdPeople, MdGroup, MdBarChart, MdNotifications, MdSettings,
  MdSecurity, MdHistory, MdSearch, MdMenu,
  MdLogout, MdClose, MdTask
} from 'react-icons/md';
import './DashboardLayout.css';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(user?.theme || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleLogout = async () => { await logout(); navigate('/login'); };
 
  const navItems = [
    { icon: <MdDashboard />, label: 'Dashboard', to: '/dashboard', roles: ['user', 'admin', 'superadmin'] },
    { icon: <MdAssignment />, label: 'My Tasks', to: '/tasks', roles: ['user', 'admin', 'superadmin'] },
    // { icon: <MdViewKanban />, label: 'Kanban Board', to: '/tasks/kanban', roles: ['user', 'admin', 'superadmin'] },
    { icon: <MdCalendarMonth />, label: 'Calendar', to: '/calendar', roles: ['user', 'admin', 'superadmin'] },
    { icon: <MdGroup />, label: 'Teams', to: '/teams', roles: ['user', 'admin', 'superadmin'] },

    // { divider: true, label: 'Administration', roles: ['admin', 'superadmin'] },
    { icon: <MdPeople />, label: 'Users', to: '/users', roles: ['admin', 'superadmin'] },
    { icon: <MdBarChart />, label: 'Reports', to: '/reports', roles: ['admin', 'superadmin'] },
    // { divider: true, label: 'Super Admin', roles: ['superadmin'] },
    // { icon: <MdHistory />, label: 'Audit Logs', to: '/audit-logs', roles: ['superadmin'] },
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
              ? <img src={`http://localhost:5000${user.avatar}?t=${new Date(user.updatedAt || Date.now()).getTime()}`} alt={user.name} className="avatar" style={{ objectFit: 'cover' }} />
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
            <button className="topbar-btn" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
              {theme === 'light' ? <LuMoon /> : <LuSun />}
            </button>


            {/* Standardized Avatar Trigger */}
            <div className="topbar-user-trigger" onClick={() => navigate('/settings/profile')}>
              {user?.avatar
                ? <img src={`http://localhost:5000${user.avatar}?t=${new Date(user.updatedAt || Date.now()).getTime()}`} alt={user.name} className="topbar-avatar" style={{ objectFit: 'cover' }} />
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