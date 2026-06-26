import React from 'react';
import { Handle, Position } from 'reactflow';
import { MdCheckCircle, MdPending, MdRunningWithErrors } from 'react-icons/md';
import { format } from 'date-fns';

const TaskNode = ({ data }) => {
  const { title, status, priority, assignees, dueDate } = data;
  const firstAssignee = assignees && assignees.length > 0 ? assignees[0] : null;

  const getStatusIcon = () => {
    switch (status) {
      case 'completed': return <MdCheckCircle color="var(--success)" />;
      case 'in_progress': return <MdRunningWithErrors color="var(--primary)" />;
      default: return <MdPending color="var(--warning)" />;
    }
  };

  const getPriorityColor = () => {
    switch (priority) {
      case 'urgent': return 'var(--danger)';
      case 'high': return 'var(--warning)';
      case 'low': return 'var(--info)';
      default: return 'var(--primary)';
    }
  };

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `2px solid ${getPriorityColor()}`,
      borderRadius: '8px',
      padding: '12px',
      width: '250px',
      boxShadow: 'var(--shadow-md)',
      position: 'relative',
      fontFamily: 'Inter, sans-serif'
    }}>
      <Handle type="target" position={Position.Left} style={{ background: 'var(--text-muted)' }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text)', flex: 1, paddingRight: '8px' }}>
          {title}
        </h4>
        <span style={{ fontSize: '18px', flexShrink: 0 }}>{getStatusIcon()}</span>
      </div>

      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
        Priority: <strong style={{ color: getPriorityColor(), textTransform: 'capitalize' }}>{priority}</strong>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {firstAssignee?.avatar ? (
            <img src={`http://localhost:5000${firstAssignee.avatar}`} alt="avatar" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>
              {firstAssignee?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          )}
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{firstAssignee?.name || 'Unassigned'}</span>
        </div>
        {dueDate && (
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>
            {format(new Date(dueDate), 'MMM dd')}
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Right} style={{ background: 'var(--text-muted)' }} />
    </div>
  );
};

export default TaskNode;
