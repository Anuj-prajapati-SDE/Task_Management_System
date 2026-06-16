import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../utils/api';
import { MdEmail, MdLogout, MdRefresh } from 'react-icons/md';

const WaitingVerificationPage = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  const checkVerificationStatus = useCallback(async () => {
    if (checking) return;
    setChecking(true);
    try {
      const { data } = await API.get('/auth/me');
      if (data.data?.isEmailVerified) {
        updateUser(data.data);
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Failed to check status');
    } finally {
      setChecking(false);
    }
  }, [checking, updateUser, navigate]);

  useEffect(() => {
    // If already verified, move them directly to the dashboard
    if (user?.isEmailVerified) {
      navigate('/dashboard');
      return;
    }

    // 1. Immediately check status if the user switches focus back to this browser tab
    window.addEventListener('focus', checkVerificationStatus);
    
    // 2. Poll every 10 seconds silently in the background
    const interval = setInterval(checkVerificationStatus, 10000);

    return () => {
      window.removeEventListener('focus', checkVerificationStatus);
      clearInterval(interval);
    };
  }, [user, checkVerificationStatus, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="auth-page">
      <div className="auth-card text-center">
        <MdEmail style={{ fontSize: 64, color: 'var(--primary)', marginBottom: 16 }} />
        <h1 className="auth-title">Verify Your Email</h1>
        <p className="auth-subtitle" style={{ marginTop: 8 }}>
          We've sent a verification link to <strong>{user?.email}</strong>.
        </p>
        <p className="text-muted" style={{ marginBottom: 24 }}>
          Please click the link in your email to activate your account. 
          This page will automatically update once you verify your email.
        </p>
        
        <div className="spinner" style={{ margin: '0 auto 24px auto' }} />
        
        <div className="flex gap-2" style={{ flexDirection: 'column' }}>
          <button className="btn btn-secondary w-full" onClick={handleLogout}>
            <MdLogout style={{ marginRight: 8, verticalAlign: 'middle' }} /> Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default WaitingVerificationPage;