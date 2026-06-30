import React from 'react';
import { Handle, Position } from 'reactflow';

const UserNode = ({ data }) => {
  const { name, role, avatar } = data;

  return (
    <div style={{
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      borderRadius: '30px',
      padding: '4px 12px 4px 4px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      boxShadow: 'var(--shadow-sm)',
      fontFamily: 'Inter, sans-serif',
      position: 'relative'
    }}>
      <Handle type="target" position={Position.Left} style={{ background: 'var(--text-muted)' }} />
      
      {avatar ? (
        <img src={`${import.meta.env.VITE_SOCKET_URL}${avatar}`} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
          {name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
      )}
      
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{name}</span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{role}</span>
      </div>

      <Handle type="source" position={Position.Right} style={{ background: 'var(--text-muted)' }} />
    </div>
  );
};

export default UserNode;
