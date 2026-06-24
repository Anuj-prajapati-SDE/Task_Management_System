import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { MdCameraAlt, MdSave } from 'react-icons/md';

// ===== PROFILE SETTINGS =====
export const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '', department: user?.department || '',
    position: user?.position || '', phone: user?.phone || '',
  });
  const [avatar, setAvatar] = useState(null);
  const [preview, setPreview] = useState(user?.avatar ? `http://localhost:5000${user.avatar}?t=${new Date(user?.updatedAt || Date.now()).getTime()}` : null);
  const [loading, setLoading] = useState(false);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) { setAvatar(file); setPreview(URL.createObjectURL(file)); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      if (avatar) formData.append('avatar', avatar);
      const { data } = await API.put('/users/profile', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateUser(data.data); toast.success('Profile updated!');
    } catch { toast.error('Failed to update'); }
    finally { setLoading(false); }
  };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <div>
      <div className="page-header"><h1>Profile Settings</h1><p>Update your personal information.</p></div>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div className="profile-avatar-wrapper" style={{ display: 'inline-block' }}>
                {preview
                  ? <img src={preview} alt="Avatar" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--border)' }} />
                  : <div className="avatar avatar-xl" style={{ background: '#4f46e5', margin: '0 auto' }}>{getInitials(form.name)}</div>
                }
                <label htmlFor="avatar-input" className="avatar-edit"><MdCameraAlt style={{ fontSize: 14 }} /></label>
                <input id="avatar-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>Click camera to change photo</div>
            </div>

            <div className="form-row">
              <div className="form-group"><label className="form-label required">Full Name</label>
                <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="form-group"><label className="form-label">Email</label>
                <input className="form-control" value={user?.email} disabled style={{ opacity: 0.6 }} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Department</label>
                <input className="form-control" placeholder="Engineering" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Position</label>
                <input className="form-control" placeholder="Senior Developer" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} /></div>
            </div>
            <div className="form-group"><label className="form-label">Phone</label>
              <input className="form-control" placeholder="+1 234 567 890" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={loading}><MdSave /> {loading ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ===== ACCOUNT SETTINGS =====
export const AccountSettingsPage = () => {
  const { user, updateUser } = useAuth();
  const [theme, setTheme] = useState(user?.theme || 'light');
  const [loading, setLoading] = useState(false);

  const handleThemeChange = async (newTheme) => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    try {
      const { data } = await API.put('/users/profile', { theme: newTheme });
      updateUser(data.data);
      toast.success('Theme updated');
    } catch {}
  };

  return (
    <div>
      <div className="page-header"><h1>Account Settings</h1></div>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Appearance</span></div>
          <div className="flex gap-3">
            {['light', 'dark'].map(t => (
              <div key={t} onClick={() => handleThemeChange(t)}
                style={{ flex: 1, padding: 16, border: `2px solid ${theme === t ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', cursor: 'pointer', textAlign: 'center', transition: 'border-color 0.2s' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{t === 'light' ? '☀️' : '🌙'}</div>
                <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>{t} Mode</div>
              </div>
            ))}
          </div>

          <div className="divider" />
          <div className="card-header"><span className="card-title">Account Info</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Account ID', value: user?._id },
              { label: 'Role', value: user?.role },
              { label: 'Email Verified', value: user?.isEmailVerified ? '✅ Verified' : '❌ Not verified' },
              { label: 'Member Since', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—' },
            ].map(f => (
              <div key={f.label} className="flex-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{f.label}</span>
                <span style={{ fontWeight: 500, fontFamily: f.label === 'Account ID' ? 'monospace' : 'inherit', fontSize: f.label === 'Account ID' ? 11 : 13 }}>{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};



// ===== SECURITY SETTINGS =====
export const SecuritySettingsPage = () => {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (form.newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await API.put('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Password changed!');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header"><h1>Security Settings</h1><p>Manage your account security.</p></div>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Change Password</span></div>
          <form onSubmit={handleSubmit}>
            <div className="form-group"><label className="form-label required">Current Password</label>
              <input className="form-control" type="password" value={form.currentPassword} onChange={e => setForm({ ...form, currentPassword: e.target.value })} required /></div>
            <div className="form-group"><label className="form-label required">New Password</label>
              <input className="form-control" type="password" value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })} required minLength={6} />
              <div className="form-hint">At least 6 characters</div></div>
            <div className="form-group"><label className="form-label required">Confirm New Password</label>
              <input className="form-control" type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} required /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Updating...' : 'Update Password'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
