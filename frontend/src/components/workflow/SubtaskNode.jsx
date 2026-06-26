import React from 'react';
import { Handle, Position } from 'reactflow';
import { MdCheckCircle, MdRadioButtonUnchecked } from 'react-icons/md';

const SubtaskNode = ({ data }) => {
  const { title, isCompleted } = data;

  return (
    <div style={{
      background: 'var(--bg)',
      border: `1px solid ${isCompleted ? 'var(--success)' : 'var(--border)'}`,
      borderRadius: '4px',
      padding: '6px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      boxShadow: 'var(--shadow-sm)',
      fontFamily: 'Inter, sans-serif',
      position: 'relative'
    }}>
      <Handle type="target" position={Position.Left} style={{ background: 'var(--text-muted)' }} />
      
      <span style={{ fontSize: '14px', color: isCompleted ? 'var(--success)' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
        {isCompleted ? <MdCheckCircle /> : <MdRadioButtonUnchecked />}
      </span>
      
      <span style={{ fontSize: '12px', color: 'var(--text)', whiteSpace: 'nowrap', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {title}
      </span>

      <Handle type="source" position={Position.Right} style={{ background: 'var(--text-muted)' }} />
    </div>
  );
};

export default SubtaskNode;
