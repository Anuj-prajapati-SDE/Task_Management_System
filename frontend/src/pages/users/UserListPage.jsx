import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { format } from "date-fns";
import toast from "react-hot-toast";
import {
  MdAdd,
  MdSearch,
  MdEdit,
  MdBlock,
  MdCheckCircle,
  MdDelete,
  MdArrowBack,
  MdMail,
} from "react-icons/md";

// ===== USER LIST =====
export const UserListPage = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [filters, setFilters] = useState({
    search: "",
    role: "",
    isActive: "",
  });
  const [selected, setSelected] = useState([]);

  const fetchUsers = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = { page, limit: 20, ...filters };
        Object.keys(params).forEach(
          (k) => params[k] === "" && delete params[k],
        );
        const { data } = await API.get("/users", { params });
        setUsers(data.data);
        setPagination(data.pagination);
      } catch {
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggle = async (userId) => {
    try {
      await API.patch(`/users/${userId}/toggle-status`);
      toast.success("Status updated");
      fetchUsers();
    } catch {
      toast.error("Failed");
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Permanently delete this user?")) return;
    try {
      await API.delete(`/users/${userId}`);
      toast.success("User deleted");
      fetchUsers();
    } catch {
      toast.error("Failed");
    }
  };

  const handleBulkAction = async (action) => {
    if (!window.confirm(`${action} ${selected.length} users?`)) return;
    try {
      await API.post("/users/bulk-action", { action, userIds: selected });
      toast.success("Done");
      setSelected([]);
      fetchUsers();
    } catch {
      toast.error("Failed");
    }
  };

  const displayedUsers = users.filter((u) => {
    if (u.role === "superadmin") return false;
    if (currentUser.role === "admin" && u.role !== "user") return false;
    return true;
  });

  const toggleSelect = (id) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const selectAll = () =>
    setSelected(
      selected.length === displayedUsers.length ? [] : displayedUsers.map((u) => u._id),
    );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Users</h1>
          <p>Manage all users in the system.</p>
        </div>
        <div className="header-actions">
          {selected.length > 0 && currentUser.role === "superadmin" && (
            <>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleBulkAction("activate")}
              >
                Activate ({selected.length})
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleBulkAction("deactivate")}
              >
                Deactivate
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleBulkAction("delete")}
              >
                Delete
              </button>
            </>
          )}
          <button
            className="btn btn-primary"
            onClick={() => navigate("/users/create")}
          >
            <MdAdd /> Add User
          </button>
        </div>
      </div>

      <div className="card">
        <div className="filter-bar">
          <div style={{ flex: 1, position: "relative", minWidth: 200 }}>
            <MdSearch
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              style={{
                width: "100%",
                padding: "8px 12px 8px 34px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                background: "var(--bg-card)",
                color: "var(--text)",
                fontSize: 14,
              }}
              placeholder="Search users..."
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
            />
          </div>
          {currentUser.role === "superadmin" && (
            <select
              className="form-control"
              style={{ width: 130, fontSize: "13px", padding: "6px 10px" }}
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
            >
              <option value="">All Roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          )}
          <select
            className="form-control"
            style={{ width: 130, fontSize: "13px", padding: "6px 10px" }}
            value={filters.isActive}
            onChange={(e) =>
              setFilters({ ...filters, isActive: e.target.value })
            }
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        {loading ? (
          <div>
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="skeleton"
                style={{ height: 56, marginBottom: 8 }}
              />
            ))}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      onChange={selectAll}
                      checked={
                        selected.length === displayedUsers.length && displayedUsers.length > 0
                      }
                    />
                  </th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedUsers.map((u) => (
                    <tr key={u._id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.includes(u._id)}
                          onChange={() => toggleSelect(u._id)}
                        />
                      </td>

                      <td>
                        <div
                          className="flex gap-2"
                          style={{ alignItems: "center", cursor: "pointer" }}
                          onClick={() => navigate(`/users/${u._id}`)}
                        >
                          {u.avatar ? (
                            <img
                              src={`http://localhost:5000${u.avatar}`}
                              alt=""
                              className="avatar avatar-sm"
                            />
                          ) : (
                            <div
                              className="avatar avatar-sm"
                              style={{ background: "#4f46e5" }}
                            >
                              {u.name?.[0]}
                            </div>
                          )}

                          <div>
                            <div style={{ fontWeight: 500, fontSize: 13 }}>
                              {u.name}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--text-muted)",
                              }}
                            >
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`badge badge-${
                            u.role === "superadmin"
                              ? "danger"
                              : u.role === "admin"
                                ? "warning"
                                : "primary"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {u.department || "—"}
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

                      <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {u.lastLogin
                          ? format(new Date(u.lastLogin), "MMM d, yyyy")
                          : "Never"}
                      </td>

                      <td>
                        <div className="flex gap-1">
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => navigate(`/users/${u._id}`)}
                            title="View"
                          >
                            <MdEdit />
                          </button>

                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => handleToggle(u._id)}
                            title={u.isActive ? "Deactivate" : "Activate"}
                          >
                            {u.isActive ? (
                              <MdBlock style={{ color: "var(--warning)" }} />
                            ) : (
                              <MdCheckCircle
                                style={{ color: "var(--success)" }}
                              />
                            )}
                          </button>

                          {currentUser.role === "superadmin" &&
                            u._id !== currentUser._id && (
                              <button
                                className="btn btn-ghost btn-sm btn-icon"
                                onClick={() => handleDelete(u._id)}
                                title="Delete"
                              >
                                <MdDelete style={{ color: "var(--danger)" }} />
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination.pages > 1 && (
          <div className="pagination">
            <button
              className="page-btn"
              onClick={() => fetchUsers(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              ‹
            </button>
            {[...Array(Math.min(pagination.pages, 7))].map((_, i) => (
              <button
                key={i}
                className={`page-btn ${pagination.page === i + 1 ? "active" : ""}`}
                onClick={() => fetchUsers(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button
              className="page-btn"
              onClick={() => fetchUsers(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
            >
              ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ===== USER DETAIL =====
export const UserDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    role: "",
    department: "",
    position: "",
    phone: "",
    isActive: true,
  });

  useEffect(() => {
    API.get(`/users/${id}`)
      .then(({ data }) => {
        setUser(data.data);
        setForm({
          name: data.data.name,
          role: data.data.role,
          department: data.data.department || "",
          position: data.data.position || "",
          phone: data.data.phone || "",
          isActive: data.data.isActive,
        });
      })
      .catch(() => navigate("/users"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const { data } = await API.put(`/users/${id}`, form);
      setUser(data.data);
      setEditing(false);
      toast.success("Updated");
    } catch {
      toast.error("Failed");
    }
  };

  const handleToggle = async () => {
    try {
      const { data } = await API.patch(`/users/${id}/toggle-status`);
      setUser(data.data);
      toast.success("Status updated");
    } catch {
      toast.error("Failed");
    }
  };

  if (loading)
    return (
      <div className="skeleton" style={{ height: 400, borderRadius: 12 }} />
    );
  if (!user) return null;

  return (
    <div>
      <div className="page-header">
        <div className="flex gap-3" style={{ alignItems: "center" }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate("/users")}
          >
            <MdArrowBack /> Back
          </button>
          <h1>User Profile</h1>
        </div>
        <div className="header-actions">
          <button
            className={`btn ${user.isActive ? "btn-warning" : "btn-success"} btn-sm`}
            onClick={handleToggle}
          >
            {user.isActive ? (
              <>
                <MdBlock /> Deactivate
              </>
            ) : (
              <>
                <MdCheckCircle /> Activate
              </>
            )}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setEditing(!editing)}
          >
            <MdEdit /> {editing ? "Cancel" : "Edit"}
          </button>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div
              className="avatar avatar-xl"
              style={{ background: "#4f46e5", margin: "0 auto 12px" }}
            >
              {user.avatar ? (
                <img
                  src={`http://localhost:5000${user.avatar}`}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                user.name?.[0]
              )}
            </div>
            <h2>{user.name}</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
              {user.email}
            </p>
            <div
              className="flex gap-2"
              style={{ justifyContent: "center", marginTop: 8 }}
            >
              <span
                className={`badge badge-${user.role === "superadmin" ? "danger" : user.role === "admin" ? "warning" : "primary"}`}
              >
                {user.role}
              </span>
              <span
                className={`badge ${user.isActive ? "badge-success" : "badge-gray"}`}
              >
                {user.isActive ? "Active" : "Inactive"}
              </span>
              {user.isEmailVerified && (
                <span className="badge badge-success">Verified</span>
              )}
            </div>
          </div>
          {!editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Department", value: user.department },
                { label: "Position", value: user.position },
                { label: "Phone", value: user.phone },
                {
                  label: "Last Login",
                  value: user.lastLogin
                    ? format(new Date(user.lastLogin), "MMM d, yyyy h:mm a")
                    : "Never",
                },
                {
                  label: "Joined",
                  value: format(new Date(user.createdAt), "MMM d, yyyy"),
                },
              ].map((f) => (
                <div
                  key={f.label}
                  className="flex-between"
                  style={{
                    padding: "6px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {f.label}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>
                    {f.value || "—"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  className="form-control"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              {currentUser.role === "superadmin" && (
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    className="form-control"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Department</label>
                <input
                  className="form-control"
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Position</label>
                <input
                  className="form-control"
                  value={form.position}
                  onChange={(e) =>
                    setForm({ ...form, position: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  className="form-control"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <button className="btn btn-primary w-full" type="submit">
                Save Changes
              </button>
            </form>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Tasks</span>
          </div>
          <UserActivitySection userId={id} />
        </div>
      </div>
    </div>
  );
};

const UserActivitySection = ({ userId }) => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  useEffect(() => {
    API.get(`/users/${userId}/activity`)
      .then(({ data }) => setTasks(data.data))
      .catch(() => {});
  }, [userId]);
  if (tasks.length === 0)
    return (
      <div className="empty-state" style={{ padding: "24px 0" }}>
        <p>No tasks assigned.</p>
      </div>
    );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {tasks.slice(0, 10).map((t) => (
        <div
          key={t._id}
          className="flex-between"
          style={{
            padding: "8px 0",
            borderBottom: "1px solid var(--border)",
            cursor: "pointer",
          }}
          onClick={() => navigate(`/tasks/${t._id}`)}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</div>
            <div
              style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}
            >
              {format(new Date(t.updatedAt), "MMM d, yyyy")}
            </div>
          </div>
          <span className={`badge status-${t.status}`}>
            {t.status.replace("_", " ")}
          </span>
        </div>
      ))}
    </div>
  );
};

// ===== CREATE USER =====
export const CreateUserPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
    department: "",
    position: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post("/users", form);
      toast.success("User created!");
      navigate("/users");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex gap-3" style={{ alignItems: "center" }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate("/users")}
          >
            <MdArrowBack /> Back
          </button>
          <div>
            <h1>Create User</h1>
            <p>Add a new user to the system.</p>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Full Name</label>
                <input
                  className="form-control"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label required">Email</label>
                <input
                  className="form-control"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Password</label>
                <input
                  className="form-control"
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  required
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="form-control"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Department</label>
                <input
                  className="form-control"
                  placeholder="Engineering"
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Position</label>
                <input
                  className="form-control"
                  placeholder="Senior Developer"
                  value={form.position}
                  onChange={(e) =>
                    setForm({ ...form, position: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex gap-3" style={{ justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate("/users")}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create User"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserListPage;
