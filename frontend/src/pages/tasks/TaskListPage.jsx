import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '../../components/common/SEO';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { MdAdd, MdSearch, MdFilterList, MdEdit, MdDelete, MdVisibility, MdViewKanban } from 'react-icons/md';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const TaskListPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [filters, setFilters] = useState({ search: '', status: '', priority: '', sortBy: 'createdAt', sortOrder: 'desc' });

  const fetchTasks = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 15, ...filters };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const { data } = await API.get('/tasks', { params });
      setTasks(data.data);
      setPagination(data.pagination);
    } catch { }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleDelete = async (task) => {
    if (user.role === 'admin' && task.assignedBy?.role === 'superadmin') {
      toast.error('Admins cannot delete tasks assigned by a superadmin');
      return;
    }
    if (!window.confirm('Delete this task?')) return;
    try {
      await API.delete(`/tasks/${task._id}`);
      toast.success('Task deleted');
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const statusOptions = ['', 'pending', 'in_progress', 'review', 'completed', 'cancelled', 'rejected'];
  const priorityOptions = ['', 'low', 'medium', 'high', 'urgent'];

  return (
    <div>
      <SEO title="My Tasks" description="View and manage all your tasks, filter assignments, search projects, and delegate responsibilities on TaskFlow." robots="noindex, nofollow" />
      <div className="page-header">
        <div>
          <h1>Tasks</h1>
          <p>
            {user?.role === 'admin'
              ? 'Manage and track tasks you assigned.'
              : user?.role === 'superadmin'
              ? 'Manage and track all tasks in the system.'
              : 'Manage and track all your tasks.'}
          </p>
        </div>
        <div className="header-actions">
          {/* <button className="btn btn-secondary" onClick={() => navigate('/tasks/kanban')}><MdViewKanban /> Kanban</button> */}
          {user.role !== 'user' ? (<button className="btn btn-primary" onClick={() => navigate('/tasks/create')}><MdAdd /> New Task</button>) : ('')}

        </div>
      </div>

      <div className="card">
        {/* Filters */}
        <div className="filter-bar">
          <div className="search-box" style={{ flex: 1, position: 'relative', minWidth: 200 }}>
            <MdSearch className="si" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input placeholder="Search tasks..." style={{ width: '100%', paddingLeft: 34, padding: '8px 12px 8px 34px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 14 }}
              value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} />
          </div>
          <select className="form-control" style={{ width: 140, fontSize: '13px', padding: '6px 10px' }} value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Status</option>
            {statusOptions.filter(Boolean).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <select className="form-control" style={{ width: 140, fontSize: '13px', padding: '6px 10px' }} value={filters.priority} onChange={e => setFilters({ ...filters, priority: e.target.value })}>
            <option value="">All Priority</option>
            {priorityOptions.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="form-control" style={{ width: 160, fontSize: '13px', padding: '6px 10px' }} value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={e => { const [sb, so] = e.target.value.split('-'); setFilters({ ...filters, sortBy: sb, sortOrder: so }); }}>
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="dueDate-asc">Due Date ↑</option>
            <option value="dueDate-desc">Due Date ↓</option>
            <option value="priority-desc">Priority ↓</option>
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ padding: 20 }}>{[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 50, marginBottom: 8 }} />)}</div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <h3>No tasks found</h3>
            <p>{user.role !== 'user' ? 'Create a new task to get started.' : 'You have no assigned tasks.'}</p>
            {user.role !== 'user' && (
              <button className="btn btn-primary" onClick={() => navigate('/tasks/create')}><MdAdd /> Create Task</button>
            )}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Assigned To</th>
                  <th>Assigned By</th>
                
                  <th>Start Date</th>
                  <th>Due Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task._id}>
                    <td>
                      <div style={{ fontWeight: 500, cursor: 'pointer', color: 'var(--primary)' }} onClick={() => navigate(`/tasks/${task._id}`)}>{task.title}</div>
                   
                    </td>
                    <td><span className={`badge status-${task.status}`}>{task.status.replace('_', ' ')}</span></td>
                    <td><span className={`badge priority-${task.priority}`}>{task.priority}</span></td>
                    <td>
                      {task.assignees && task.assignees.length > 0 ? (
                        <div className="flex gap-2" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                          {task.assignees.slice(0, 3).map((assignee, index) => (
                            <div key={index} className="flex gap-2" style={{ alignItems: 'center' }}>
                              <div className="avatar avatar-sm" style={{ background: '#4f46e5', title: assignee.name }}>{assignee.name?.[0]}</div>
                              <span style={{ fontSize: 12 }}>{assignee.name}</span>
                            </div>
                          ))}
                          {task.assignees.length > 3 && (
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>+{task.assignees.length - 3} more</span>
                          )}
                        </div>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Unassigned</span>}
                    </td>
                    <td>
                      {task.assignedBy ? (
                        <div className="flex gap-2" style={{ alignItems: 'center' }}>
                          <div className="avatar avatar-sm" style={{ background: '#06b6d4' }}>{task.assignedBy.name?.[0]}</div>
                          <span style={{ fontSize: 12 }}>{task.assignedBy.name}</span>
                        </div>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                    </td>

                    <td>
                      {task.startDate ? (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {format(new Date(task.startDate), 'MMM d, yyyy h:mm a')}
                        </span>
                      ) : <span style={{ color: 'var(--text-light)', fontSize: 12 }}>—</span>}
                    </td>
                    <td>
                      {task.dueDate ? (
                        <span style={{ fontSize: 12, color: new Date(task.dueDate) < new Date() && task.status !== 'completed' ? 'var(--danger)' : 'var(--text-muted)' }}>
                          {format(new Date(task.dueDate), 'MMM d, yyyy h:mm a')}
                        </span>
                      ) : <span style={{ color: 'var(--text-light)', fontSize: 12 }}>—</span>}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn-icon btn btn-ghost btn-sm" onClick={() => navigate(`/tasks/${task._id}`)} title="View"><MdVisibility /></button>
                        {user.role !== 'user' && (
                          <button className="btn-icon btn btn-ghost btn-sm" onClick={() => navigate(`/tasks/${task._id}/edit`)} title="Edit"><MdEdit /></button>
                        )}
                        {(user.role === 'superadmin' || (user.role === 'admin' && task.assignedBy?.role !== 'superadmin')) &&
                          <button className="btn-icon btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(task)} title="Delete"><MdDelete /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="pagination">
            <button className="page-btn" onClick={() => fetchTasks(pagination.page - 1)} disabled={pagination.page === 1}>‹</button>
            {[...Array(pagination.pages)].map((_, i) => (
              <button key={i} className={`page-btn ${pagination.page === i + 1 ? 'active' : ''}`} onClick={() => fetchTasks(i + 1)}>{i + 1}</button>
            ))}
            <button className="page-btn" onClick={() => fetchTasks(pagination.page + 1)} disabled={pagination.page === pagination.pages}>›</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskListPage;
