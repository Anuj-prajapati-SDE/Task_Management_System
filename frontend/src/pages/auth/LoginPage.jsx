import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  MdTask,
  MdEmail,
  MdLock,
  MdVisibility,
  MdVisibilityOff
} from 'react-icons/md';
import API from '../../utils/api';
import './Auth.css';
import SEO from '../../components/common/SEO';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    password: ''
  });

  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Register link show/hide
  const [canRegister, setCanRegister] = useState(false);

  // Check total users count
  useEffect(() => {
    const checkCanRegister = async () => {
      try {
        const res = await API.get('/auth/can-register');
        setCanRegister(res.data.canRegister);
      } catch (err) {
        console.error('Error checking registration status:', err);
        setCanRegister(false);
      }
    };

    checkCanRegister();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const loginSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "TaskFlow",
    "operatingSystem": "All",
    "applicationCategory": "BusinessApplication",
    "description": "Streamline task delegation, track real-time progress, and boost productivity with TaskFlow role-based task management.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  return (
    <div className="login-page">
      <SEO 
        title="Login" 
        description="Sign in to TaskFlow to manage projects, delegate roles, track progress, and coordinate with your team." 
        schema={loginSchema} 
      />
      {/* Left Section */}
      <div className="left-panel">
        <div className="shape-1" />
        <div className="shape-2" />

        <div className="left-content">
          <div className="logo-container">
            <MdTask className="logo-icon" />
            <span className="logo-text">TaskFlow</span>
          </div>

          <h1 className="hero-title">
            Manage Projects
            <br />
            With Ease.
          </h1>

          <p className="hero-desc">
            The complete workflow solution for modern teams. Streamline task
            delegation, track real-time progress, and boost productivity from a
            single, intuitive interface.
          </p>
        </div>
      </div>

      {/* Right Section */}
      <div className="right-panel">
        <div className="form-card">
          <h2 className="form-title">Welcome back</h2>
          <p className="form-subtitle">
            Sign in to your account to continue.
          </p>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-wrapper">
                {/* <MdEmail className="input-icon" /> */}
                <input
                  className="form-control"
                  type="email" 
                  placeholder="name@company.com"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrapper">
                {/* <MdLock className="input-icon" /> */}
                <input
                  className="form-control"
                  style={{ paddingRight: '48px' }}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={
                    showPass ? 'Hide password' : 'Show password'
                  }
                >
                  {showPass ? (
                    <MdVisibilityOff size={20} />
                  ) : (
                    <MdVisibility size={20} />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div style={{ textAlign: 'right', marginBottom: '24px' }}>
              <Link to="/forgot-password" className="auth-link">
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              className="submit-btn"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Register Link - Only if canRegister is true */}
          {canRegister && (
            <div className="footer-links">
              <span>Don't have an account?</span>
              <Link to="/register" className="auth-link">
                Create one
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;