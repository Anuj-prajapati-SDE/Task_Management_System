import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import API from './utils/api';

// Layout
import DashboardLayout from './components/layout/DashboardLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import UnauthorizedPage from './pages/auth/UnauthorizedPage';
import WaitingVerificationPage from './pages/auth/WaitingVerificationPage';

// User Pages
import UserDashboard from './pages/dashboard/UserDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import SuperAdminDashboard from './pages/dashboard/SuperAdminDashboard';

// Task Pages
import TaskListPage from './pages/tasks/TaskListPage';
import TaskDetailPage from './pages/tasks/TaskDetailPage';
import CreateTaskPage from './pages/tasks/CreateTaskPage';
import EditTaskPage from './pages/tasks/EditTaskPage';
import KanbanPage from './pages/tasks/KanbanPage';
import CalendarPage from './pages/tasks/CalendarPage';

// User Management
import UserListPage from './pages/users/UserListPage';
import UserDetailPage from './pages/users/UserDetailPage';
import CreateUserPage from './pages/users/CreateUserPage';

// Team Pages
import TeamsPage from './pages/teams/TeamsPage';
import TeamDetailPage from './pages/teams/TeamDetailPage';

// Other Pages
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/settings/ProfilePage'; 
import AccountSettingsPage from './pages/settings/AccountSettingsPage';
import NotificationSettingsPage from './pages/settings/NotificationSettingsPage';
import SecuritySettingsPage from './pages/settings/SecuritySettingsPage';
import ReportsPage from './pages/analytics/ReportsPage';
import AuditLogsPage from './pages/admin/AuditLogsPage';
import SystemSettingsPage from './pages/admin/SystemSettingsPage';

// Guards
const ProtectedRoute = ({ children, roles, requireVerification = true }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (requireVerification && !user.isEmailVerified) return <Navigate to="/waiting-verification" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (user) return <Navigate to={user.isEmailVerified ? "/dashboard" : "/waiting-verification"} replace />;
  return children;
};

const RegisterRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const [canRegister, setCanRegister] = React.useState(null);

  React.useEffect(() => {
    API.get('/auth/can-register')
      .then(res => setCanRegister(res.data.canRegister))
      .catch(() => setCanRegister(false));
  }, []);

  if (loading || canRegister === null) return <div className="loading-screen"><div className="spinner" /></div>;
  if (user) return <Navigate to={user.isEmailVerified ? "/dashboard" : "/waiting-verification"} replace />;
  if (!canRegister) return <Navigate to="/login" replace />;
  
  return children;
};

const DashboardRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'superadmin') return <SuperAdminDashboard />;
  if (user?.role === 'admin') return <AdminDashboard />;
  return <UserDashboard />;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<RegisterRoute><RegisterPage /></RegisterRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/waiting-verification" element={<ProtectedRoute requireVerification={false}><WaitingVerificationPage /></ProtectedRoute>} />

      {/* Protected */}
      <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardRedirect />} />

        {/* Tasks */}
        <Route path="tasks" element={<TaskListPage />} />
        <Route path="tasks/create" element={<CreateTaskPage />} />
        <Route path="tasks/kanban" element={<KanbanPage />} />
        <Route path="tasks/calendar" element={<CalendarPage />} />
        <Route path="tasks/:id" element={<TaskDetailPage />} />
        <Route path="tasks/:id/edit" element={<EditTaskPage />} />

        {/* Teams */}
        <Route path="teams" element={<TeamsPage />} />
        <Route path="teams/:id" element={<TeamDetailPage />} />

        {/* Notifications */}
        <Route path="notifications" element={<NotificationsPage />} />

        {/* Settings */}
        <Route path="settings/profile" element={<ProfilePage />} />
        <Route path="settings/account" element={<AccountSettingsPage />} />
        <Route path="settings/notifications" element={<NotificationSettingsPage />} />
        <Route path="settings/security" element={<SecuritySettingsPage />} />

        {/* Admin */}
        <Route path="users" element={<ProtectedRoute roles={['admin', 'superadmin']}><UserListPage /></ProtectedRoute>} />
        <Route path="users/create" element={<ProtectedRoute roles={['admin', 'superadmin']}><CreateUserPage /></ProtectedRoute>} />
        <Route path="users/:id" element={<ProtectedRoute roles={['admin', 'superadmin']}><UserDetailPage /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute roles={['admin', 'superadmin']}><ReportsPage /></ProtectedRoute>} />

        {/* Super Admin */}
        <Route path="audit-logs" element={<ProtectedRoute roles={['superadmin']}><AuditLogsPage /></ProtectedRoute>} />
        <Route path="system-settings" element={<ProtectedRoute roles={['superadmin']}><SystemSettingsPage /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter 
    future={{v7_relativeSplatPath: true,
      v7_startTransition: true,
    }}>
      <AuthProvider>
        <SocketProvider>
          <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
          <AppRoutes />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
