import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import API from "../../utils/api";
import {
  MdPeople,
  MdTask,
  MdGroup,
  MdWarning,
  MdArrowForward,
} from "react-icons/md";
import { format } from "date-fns";

const COLORS = ["#f59e0b", "#3b82f6", "#a855f7", "#10b981", "#94a3b8"];

// ===== ADMIN DASHBOARD =====
export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/analytics/dashboard/admin")
      .then((r) => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="stat-grid">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 120 }} />
        ))}
      </div>
    );

  const stats = data?.stats || {};
  const statusColors = {
    pending: "#f59e0b",
    in_progress: "#3b82f6",
    review: "#a855f7",
    completed: "#10b981",
    cancelled: "#94a3b8",
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Monitor your own assigned tasks and performance.</p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/users")}
          >
            Manage Users
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/tasks/create")}
          >
            New Task
          </button>
        </div>
      </div>

      <div className="stat-grid">
        {[
          {
            icon: <MdPeople />,
            label: "Total Users",
            value: stats.totalUsers || 0,
            color: "#4f46e5",
            bg: "rgba(79,70,229,0.1)",
          },
          {
            icon: <MdPeople />,
            label: "Active Users",
            value: stats.activeUsers || 0,
            color: "#10b981",
            bg: "rgba(16,185,129,0.1)",
          },
          {
            icon: <MdTask />,
            label: "My Total Tasks",
            value: stats.totalTasks || 0,
            color: "#3b82f6",
            bg: "rgba(59,130,246,0.1)",
          },
          {
            icon: <MdTask />,
            label: "My Completed Tasks",
            value: stats.completedTasks || 0,
            color: "#10b981",
            bg: "rgba(16,185,129,0.1)",
          },
          {
            icon: <MdGroup />,
            label: "Teams",
            value: stats.totalTeams || 0,
            color: "#a855f7",
            bg: "rgba(168,85,247,0.1)",
          },
          {
            icon: <MdWarning />,
            label: "My Overdue Tasks",
            value: stats.overdueTasks || 0,
            color: "#ef4444",
            bg: "rgba(239,68,68,0.1)",
          },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div
              className="stat-icon"
              style={{ background: s.bg, color: s.color }}
            >
              {s.icon}
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Monthly Trend</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data?.monthlyTrend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="created"
                stroke="#4f46e5"
                name="Created"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="completed"
                stroke="#10b981"
                name="Completed"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Tasks by Status</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={
                  data?.tasksByStatus?.map((s) => ({
                    name: s._id,
                    value: s.count,
                  })) || []
                }
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {data?.tasksByStatus?.map((s, i) => (
                  <Cell
                    key={i}
                    fill={statusColors[s._id] || COLORS[i % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Top Performers (Last 30 Days)</span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate("/reports")}
          >
            <MdArrowForward />
          </button>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Tasks Completed</th>
                <th>Rate</th>
              </tr>
            </thead>
            <tbody>
              {data?.topPerformers?.map((p, i) => (
                <tr key={i}>
                  <td>
                    <div
                      className="flex gap-2"
                      style={{ alignItems: "center" }}
                    >
                      <div
                        className="avatar avatar-sm"
                        style={{ background: "#4f46e5" }}
                      >
                        {p.user?.name?.[0]}
                      </div>
                      <span>{p.user?.name}</span>
                    </div>
                  </td>
                  <td>
                    <strong>{p.count}</strong>
                  </td>
                  <td>
                    <div className="progress-bar" style={{ width: 100 }}>
                      <div
                        className="progress"
                        style={{ width: `${Math.min(p.count * 5, 100)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ===== SUPER ADMIN DASHBOARD =====
export const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/analytics/dashboard/superadmin")
      .then((r) => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="stat-grid">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 120 }} />
        ))}
      </div>
    );

  const stats = data?.stats || {};
  const roleColors = {
    user: "#4f46e5",
    admin: "#10b981",
    superadmin: "#a855f7",
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Super Admin Dashboard</h1>
          <p>Full platform control and monitoring.</p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/audit-logs")}
          >
            Audit Logs
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/users/create")}
          >
            Add User
          </button>
        </div>
      </div>

      <div className="stat-grid">
        {[
          {
            label: "Total Users",
            value: stats.totalUsers || 0,
            color: "#4f46e5",
            bg: "rgba(79,70,229,0.1)",
          },
          {
            label: "Total Tasks",
            value: stats.totalTasks || 0,
            color: "#3b82f6",
            bg: "rgba(59,130,246,0.1)",
          },
          {
            label: "Total Teams",
            value: stats.totalTeams || 0,
            color: "#10b981",
            bg: "rgba(16,185,129,0.1)",
          },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div
              className="stat-value"
              style={{ color: s.color, fontSize: 36 }}
            >
              {s.value}
            </div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Users by Role</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={
                  data?.usersByRole?.map((r) => ({
                    name: r._id,
                    value: r.count,
                  })) || []
                }
                cx="50%"
                cy="50%"
                outerRadius={70}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {data?.usersByRole?.map((r, i) => (
                  <Cell key={i} fill={roleColors[r._id] || COLORS[i]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Quick Actions</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Manage Users", to: "/users", icon: <MdPeople /> },
              { label: "View Audit Logs", to: "/audit-logs", icon: <MdTask /> },
              {
                label: "System Settings",
                to: "/system-settings",
                icon: <MdGroup />,
              },
              { label: "View Reports", to: "/reports", icon: <MdWarning /> },
            ].map((a, i) => (
              <button
                key={i}
                className="btn btn-secondary"
                onClick={() => navigate(a.to)}
                style={{ justifyContent: "flex-start", gap: 8 }}
              >
                {a.icon} {a.label}{" "}
                <MdArrowForward style={{ marginLeft: "auto" }} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Users</span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate("/users")}
          >
            <MdArrowForward />
          </button>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {data?.recentUsers
                ?.filter(
                  (u) =>
                    !["superadmin"].includes(
                      u.role?.toLowerCase(),
                    ),
                )
                .map((u) => (
                  <tr
                    key={u._id}
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/users/${u._id}`)}
                  >
                    <td>
                      <div
                        className="flex gap-2"
                        style={{ alignItems: "center" }}
                      >
                        <div
                          className="avatar avatar-sm"
                          style={{ background: "#4f46e5" }}
                        >
                          {u.name?.[0]}
                        </div>
                        <span>{u.name}</span>
                      </div>
                    </td>

                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      {u.email}
                    </td>

                    <td>
                      <span
                        className={`badge badge-${
                          u.role === "admin" ? "warning" : "primary"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          u.isActive ? "badge-success" : "badge-gray"
                        }`}
                      >
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      {format(new Date(u.createdAt), "MMM d, yyyy")}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
