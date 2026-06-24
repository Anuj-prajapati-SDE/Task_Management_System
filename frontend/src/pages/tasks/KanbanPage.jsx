import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext, closestCenter, DragOverlay, useDroppable, useDraggable,
  PointerSensor, useSensor, useSensors
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import API from '../../utils/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { MdAdd, MdPerson, MdCalendarToday } from 'react-icons/md';
import { useAuth } from '../../context/AuthContext';

const COLUMNS = [
  { id: 'pending', label: 'Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  { id: 'in_progress', label: 'In Progress', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
  { id: 'review', label: 'In Review', color: '#a855f7', bg: 'rgba(168,85,247,0.08)' },
  { id: 'completed', label: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
  { id: 'cancelled', label: 'Cancelled', color: '#94a3b8', bg: 'rgba(148,163,184,0.08)' },
];

const TaskCard = ({ task, isDragging }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: sortableDragging } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: sortableDragging ? 0.5 : 1,
  };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className="kanban-card" onClick={() => navigate(`/tasks/${task._id}`)}>
      <div className="task-title">{task.title}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        <span className={`badge priority-${task.priority}`} style={{ fontSize: 10 }}>{task.priority}</span>
        {task.tags?.slice(0, 2).map((t, i) => <span key={i} className="tag" style={{ fontSize: 10 }}>{t}</span>)}
      </div>
      {/* Subtask progress */}
      {task.subtasks?.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div className="progress-bar"><div className="progress" style={{ width: `${(task.subtasks.filter(s => s.isCompleted).length / task.subtasks.length) * 100}%` }} /></div>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length} subtasks
          </span>
        </div>
      )}
      <div className="task-meta">
        <div className="flex gap-1" style={{ alignItems: 'center' }}>
          {task.assignee && (
            <div className="avatar avatar-sm" style={{ background: '#4f46e5', width: 24, height: 24, fontSize: 10 }}>
              {task.assignee.avatar
                ? <img src={`http://localhost:5000${task.assignee.avatar}`} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                : getInitials(task.assignee.name)}
            </div>
          )}
          {task.comments?.length > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>💬 {task.comments.length}</span>}
          {task.attachments?.length > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>📎 {task.attachments.length}</span>}
        </div>
        {task.dueDate && (
          <span style={{ fontSize: 11, color: new Date(task.dueDate) < new Date() ? 'var(--danger)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 2 }}>
            <MdCalendarToday style={{ fontSize: 11 }} />{format(new Date(task.dueDate), 'MMM d')}
          </span>
        )}
      </div>
    </div>
  );
};

const DroppableColumn = ({ column, tasks, navigate }) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <div className="kanban-column">
      <div className="kanban-column-header" style={{ background: column.bg, color: column.color }}>
        <span>{column.label}</span>
        <span style={{ background: 'rgba(0,0,0,0.12)', color: 'inherit', padding: '2px 8px', borderRadius: 12, fontSize: 12 }}>
          {tasks.length}
        </span>
      </div>
      <div ref={setNodeRef} className="kanban-column-body" style={{ background: isOver ? 'var(--bg-card)' : 'var(--bg)', transition: 'background 0.15s', minHeight: 120 }}>
        <SortableContext items={tasks.map(t => t._id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => <TaskCard key={task._id} task={task} navigate={navigate} />)}
        </SortableContext>
        <button className="kanban-add-btn" onClick={() => navigate('/tasks/create')}>
          <MdAdd /> Add Task
        </button>
      </div>
    </div>
  );
};

const KanbanPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [columns, setColumns] = useState({ pending: [], in_progress: [], review: [], completed: [], cancelled: [] });
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState(null);
  const [teamFilter, setTeamFilter] = useState('');
  const [teams, setTeams] = useState([]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [kanbanRes, teamsRes] = await Promise.all([
          API.get('/tasks/kanban', { params: teamFilter ? { team: teamFilter } : {} }),
          API.get('/teams'),
        ]);
        setColumns(kanbanRes.data.data);
        setTeams(teamsRes.data.data);
      } catch { toast.error('Failed to load board'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [teamFilter]);

  const findColumn = (taskId) => {
    for (const [colId, tasks] of Object.entries(columns)) {
      if (tasks.find(t => t._id === taskId)) return colId;
    }
    return null;
  };

  const handleDragStart = ({ active }) => {
    const colId = findColumn(active.id);
    if (colId) setActiveTask(columns[colId].find(t => t._id === active.id));
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveTask(null);
    if (!over) return;

    const sourceCol = findColumn(active.id);
    const destCol = COLUMNS.find(c => c.id === over.id)?.id || findColumn(over.id);

    if (!sourceCol || !destCol) return;

    if (sourceCol === destCol) {
      // Reorder within column
      const oldIdx = columns[sourceCol].findIndex(t => t._id === active.id);
      const newIdx = columns[sourceCol].findIndex(t => t._id === over.id);
      if (oldIdx !== newIdx) {
        const reordered = arrayMove(columns[sourceCol], oldIdx, newIdx);
        setColumns(prev => ({ ...prev, [sourceCol]: reordered }));
        try {
          await API.put('/tasks/order', { tasks: reordered.map((t, i) => ({ id: t._id, order: i, status: sourceCol })) });
        } catch { toast.error('Failed to save order'); }
      }
    } else {
      // Move to different column
      const task = columns[sourceCol].find(t => t._id === active.id);
      if (user.role === 'admin' && task?.assignedBy?.role === 'superadmin') {
        toast.error('Admins cannot update status on tasks assigned by a superadmin');
        return;
      }
      setColumns(prev => ({
        ...prev,
        [sourceCol]: prev[sourceCol].filter(t => t._id !== active.id),
        [destCol]: [...prev[destCol], { ...task, status: destCol }],
      }));
      try {
        await API.put(`/tasks/${active.id}`, { status: destCol });
        toast.success(`Moved to ${COLUMNS.find(c => c.id === destCol)?.label}`);
      } catch { toast.error('Failed to update status'); }
    }
  };

  if (loading) return (
    <div>
      <div className="page-header"><h1>Kanban Board</h1></div>
      <div className="kanban-board">
        {COLUMNS.map(col => (
          <div key={col.id} className="kanban-column">
            <div className="skeleton" style={{ height: 44, borderRadius: '12px 12px 0 0' }} />
            <div style={{ background: 'var(--bg)', padding: 8, borderRadius: '0 0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 8 }} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div><h1>Kanban Board</h1><p>Drag and drop tasks to update their status.</p></div>
        <div className="header-actions">
          {user.role !== 'user' && (
            <>
              <select
                className="form-control"
                style={{ width: 160, fontSize: '13px', padding: '6px 10px' }}
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
              >
                <option value="">All Teams</option>
                {teams.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>

              <button
                className="btn btn-primary"
                onClick={() => navigate('/tasks/create')}
              >
                <MdAdd /> New Task
              </button>
            </>
          )}

        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="kanban-board">
          {COLUMNS.map(col => (
            <DroppableColumn key={col.id} column={col} tasks={columns[col.id] || []} navigate={navigate} />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="kanban-card" style={{ opacity: 0.95, boxShadow: 'var(--shadow-lg)', transform: 'rotate(2deg)' }}>
              <div className="task-title">{activeTask.title}</div>
              <span className={`badge priority-${activeTask.priority}`}>{activeTask.priority}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default KanbanPage;
