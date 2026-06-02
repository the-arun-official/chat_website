import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';

type Phase = 'form' | 'loading' | 'success' | 'invalid';

const ResetPasswordPage: React.FC = () => {
  const [searchParams]   = useSearchParams();
  const navigate         = useNavigate();
  const token            = searchParams.get('token') ?? '';

  const [phase, setPhase]         = useState<Phase>('loading');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setPhase('invalid');
      return;
    }

    const validateToken = async () => {
      try {
        await api.get(`/auth/reset-password/validate/${token}`);
        setPhase('form');
      } catch (err) {
        setPhase('invalid');
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setError(null);
    setPhase('loading');
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setPhase('success');
      setTimeout(() => navigate('/onboarding?mode=login'), 3000);
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Something went wrong. Please try again.'
      );
      setPhase('form');
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-color, #0a0a0a)', padding: 24,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } }}
        style={{
          width: '100%', maxWidth: 420,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20, padding: 40,
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff',
            background: 'linear-gradient(135deg,#5b5cff,#7c7dff)',
          }}>A</div>
          <span style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>Aura Messenger</span>
        </div>

        {/* Invalid token */}
        {phase === 'invalid' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🔗</div>
              <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600, color: '#fff' }}>Invalid link</h2>
              <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                This password reset link is invalid or has expired. Reset links are valid for 1 hour.
              </p>
            </div>
            <Link to="/onboarding?mode=login" style={{
              display: 'block', textAlign: 'center', padding: '13px 0',
              background: 'linear-gradient(135deg,#5b5cff,#7c7dff)',
              borderRadius: 12, color: '#fff', fontWeight: 600, fontSize: 15, textDecoration: 'none',
            }}>
              Back to Login
            </Link>
          </>
        )}

        {/* Loading */}
        {phase === 'loading' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div className="spinner" style={{
              width: 44, height: 44, margin: '0 auto 20px',
              borderWidth: 3, borderColor: 'rgba(255,255,255,0.1)', borderTopColor: '#5b5cff',
            }} />
            <p style={{ margin: 0, fontSize: 15, color: 'rgba(255,255,255,0.6)' }}>Updating your password...</p>
          </div>
        )}

        {/* Success */}
        {phase === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
              style={{
                width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
                background: 'rgba(52,199,89,0.12)', border: '2px solid rgba(52,199,89,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" style={{ width: 40, height: 40, color: '#34c759' }}>
                <motion.path
                  d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1, transition: { duration: 0.6, delay: 0.2, ease: 'easeOut' as const } }}
                />
              </svg>
            </motion.div>
            <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600, color: '#fff' }}>Password updated!</h2>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
              Your password has been changed successfully. Redirecting to login...
            </p>
            <div className="spinner" style={{
              width: 22, height: 22, margin: '0 auto',
              borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', borderTopColor: '#5b5cff',
            }} />
          </div>
        )}

        {/* Form */}
        {phase === 'form' && (
          <form onSubmit={handleSubmit}>
            <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 600, color: '#fff' }}>Reset your password</h2>
            <p style={{ margin: '0 0 28px', fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
              Enter your new password below. Must be at least 6 characters.
            </p>

            {error && (
              <div style={{
                padding: '12px 16px', background: 'rgba(255,50,50,0.1)', color: '#ff5f57',
                borderRadius: 10, marginBottom: 20, fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  className="split-input"
                  placeholder="••••••••"
                  autoFocus
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null); }}
                />
                <button type="button" className="input-toggle" onClick={() => setShowPw(p => !p)} aria-label="Toggle password">
                  {showPw
                    ? <svg viewBox="0 0 24 24" fill="none" style={{ width: 14, height: 14 }}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    : <svg viewBox="0 0 24 24" fill="none" style={{ width: 14, height: 14 }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/></svg>
                  }
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Confirm Password
              </label>
              <input
                type={showPw ? 'text' : 'password'}
                className="split-input"
                placeholder="••••••••"
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setError(null); }}
              />
            </div>

            <button type="submit" className="btn-primary">Reset Password</button>

            <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              Remember your password?{' '}
              <Link to="/onboarding?mode=login" style={{ color: '#5b5cff', textDecoration: 'none', fontWeight: 500 }}>
                Sign in
              </Link>
            </p>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
