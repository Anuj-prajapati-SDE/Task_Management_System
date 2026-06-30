import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  MdTask, 
  MdEmail, 
  MdLock, 
  MdPerson, 
  MdBadge, 
  MdVisibility, 
  MdVisibilityOff 
} from 'react-icons/md';
import './Auth.css'; // Renamed from LoginPage.css to share across auth pages
import SEO from '../../components/common/SEO';

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); 
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.role);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="login-page"> {/* Reusing the layout class */}
      <SEO 
        title="Create an Account" 
        description="Register for TaskFlow's advanced task management platform to collaborate, manage projects, and streamline workflows." 
      />
      
      {/* Left Section - Professional Branding */}
      <div className="left-panel">
        {/* Animated Shapes */}
        <div className="shape-1" />
        <div className="shape-2" />
        
        <div className="left-content">
          <div className="logo-container">
            <MdTask className="logo-icon" />
            <span className="logo-text">TaskFlow</span>
          </div>
          <h1 className="hero-title">Start Your<br />Journey Here.</h1>
          <p className="hero-desc">
            Join thousands of teams already using TaskFlow to streamline their workflows, 
            delegate tasks efficiently, and hit their deadlines with confidence.
          </p>
        </div>
      </div>

      {/* Right Section - Registration Form */}
      <div className="right-panel">
        <div className="form-card">
          <h2 className="form-title">Create your account</h2>
          <p className="form-subtitle">Get started with TaskFlow today.</p>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            
            {/* Full Name Input */}
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div className="input-wrapper">
                <MdPerson className="input-icon" />
                <input 
                  className="form-control" 
                  type="text"
                  placeholder="John Doe" 
                  value={form.name} 
                  onChange={e => setForm({ ...form, name: e.target.value })} 
                  required 
                />
              </div>
            </div>

            {/* Email Input */}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-wrapper">
                <MdEmail className="input-icon" />
                <input 
                  className="form-control" 
                  type="email" 
                  placeholder="you@example.com" 
                  value={form.email} 
                  onChange={e => setForm({ ...form, email: e.target.value })} 
                  required 
                />
              </div>
            </div>

            {/* Password Input with Toggle */}
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrapper">
                <MdLock className="input-icon" />
                <input 
                  className="form-control" 
                  style={{ paddingRight: '48px' }}
                  type={showPass ? 'text' : 'password'} 
                  placeholder="••••••••" 
                  value={form.password} 
                  onChange={e => setForm({ ...form, password: e.target.value })} 
                  required 
                  minLength={6} 
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
                </button>
              </div>
            </div>

            {/* Account Type Select */}
            <div className="form-group">
              <label className="form-label">Account Type</label>
              <div className="input-wrapper">
                <MdBadge className="input-icon" />
                <select 
                  className="form-control" 
                  value={form.role} 
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  style={{ cursor: 'pointer', appearance: 'none' }} /* Removes default browser dropdown arrow for a cleaner look */
                >
                  <option value="superadmin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                </select>
                {/* Custom dropdown indicator to replace the default one */}
                <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9ca3af', fontSize: '12px' }}>
                  ▼
                </div>
              </div>
            </div>

            <button className="submit-btn" type="submit" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="footer-links" style={{ justifyContent: 'center', gap: '8px' }}>
            <span>Already have an account?</span>
            <Link to="/login" className="auth-link">Sign in</Link>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;