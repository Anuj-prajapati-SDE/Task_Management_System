import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import { MdTask, MdCheckCircle, MdError } from 'react-icons/md';
import toast from 'react-hot-toast';

// ===== Forgot Password =====
export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await API.post('/auth/forgot-password', { email }); setSent(true); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo"><div className="logo-icon"><MdTask /></div><span className="logo-text">TaskFlow</span></div>
        {sent ? (
          <div className="text-center">
            <MdCheckCircle style={{ fontSize: 48, color: 'var(--success)', marginBottom: 16 }} />
            <h2 style={{ marginBottom: 8 }}>Check your email</h2>
            <p className="text-muted">We've sent a password reset link to <strong>{email}</strong></p>
            <Link to="/login" className="btn btn-primary" style={{ marginTop: 20 }}>Back to Login</Link>
          </div>
        ) : (
          <>
            <h1 className="auth-title">Forgot Password?</h1>
            <p className="auth-subtitle">Enter your email and we'll send you a reset link</p>
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label className="form-label required">Email Address</label>
                <input className="form-control" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required /></div>
              <button className="btn btn-primary w-full" style={{display: "flex", justifyContent: "center"}} type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send Reset Link'}</button>
            </form>
            <p className="auth-footer"><Link to="/login">← Back to Login</Link></p>
          </>
        )}
      </div>
    </div>
  );
};

// ===== Reset Password =====
export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const token = searchParams.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await API.post('/auth/reset-password', { token, password: form.password });
      toast.success('Password reset successfully'); navigate('/login');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo"><div className="logo-icon"><MdTask /></div><span className="logo-text">TaskFlow</span></div>
        <h1 className="auth-title">Reset Password</h1>
        <p className="auth-subtitle">Enter your new password below</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label className="form-label required">New Password</label>
            <input className="form-control" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} /></div>
          <div className="form-group"><label className="form-label required">Confirm Password</label>
            <input className="form-control" type="password" placeholder="••••••••" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} required /></div>
          <button className="btn btn-primary w-full" type="submit" disabled={loading}>{loading ? 'Resetting...' : 'Reset Password'}</button>
        </form>
      </div>
    </div>
  );
};

// ===== Verify Email =====
export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      API.get(`/auth/verify-email?token=${token}`)
        .then(() => setStatus('success'))
        .catch(() => setStatus('error'));
    } else setStatus('error');
  }, [token]);

  return (
    <div className="auth-page">
      <div className="auth-card text-center">
        <div className="auth-logo" style={{ justifyContent: 'center' }}><div className="logo-icon"><MdTask /></div><span className="logo-text">TaskFlow</span></div>
        {status === 'loading' && <><div className="spinner" style={{ margin: '20px auto' }} /><p>Verifying your email...</p></>}
        {status === 'success' && <><MdCheckCircle style={{ fontSize: 52, color: 'var(--success)', marginBottom: 16 }} /><h2>Email Verified!</h2><p className="text-muted" style={{ marginTop: 8 }}>Your email has been verified successfully. You can safely close this tab and return to your original tab, or continue below.</p><Link to="/dashboard" className="btn btn-primary" style={{ marginTop: 20 }}>Continue to Dashboard</Link></>}
        {status === 'error' && <><MdError style={{ fontSize: 52, color: 'var(--danger)', marginBottom: 16 }} /><h2>Verification Failed</h2><p className="text-muted" style={{ marginTop: 8 }}>The link is invalid or expired.</p><Link to="/login" className="btn btn-secondary" style={{ marginTop: 20 }}>Back to Login</Link></>}
      </div>
    </div>
  );
};

// ===== Unauthorized =====
export const UnauthorizedPage = () => (
  <div className="auth-page">
    <div className="auth-card text-center">
      <div style={{ fontSize: 64, marginBottom: 16 }}>🔒</div>
      <h1 style={{ marginBottom: 8 }}>Access Denied</h1>
      <p className="text-muted">You don't have permission to access this page.</p>
      <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: 20 }}>Go to Dashboard</Link>
    </div>
  </div>
);

export default ForgotPasswordPage;
