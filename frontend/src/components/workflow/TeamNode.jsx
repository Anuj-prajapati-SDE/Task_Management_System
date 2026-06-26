import React from 'react';
import { Handle, Position } from 'reactflow';
import { MdGroup } from 'react-icons/md';

const TeamNode = ({ data }) => {
  const { name } = data;

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--primary)',
      borderRadius: '8px',
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      boxShadow: 'var(--shadow-md)',
      fontFamily: 'Inter, sans-serif',
      position: 'relative'
    }}>
      <Handle type="target" position={Position.Left} style={{ background: 'var(--text-muted)' }} />
      
      <div style={{ width: 28, height: 28, borderRadius: '4px', background: 'rgba(79,70,229,0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
        <MdGroup />
      </div>
      
      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{name}</span>

      <Handle type="source" position={Position.Right} style={{ background: 'var(--text-muted)' }} />
    </div>
  );
};

export default TeamNode;
