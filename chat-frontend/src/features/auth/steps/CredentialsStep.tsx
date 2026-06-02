import React, { useState } from 'react';
import { motion } from 'framer-motion';
import api from '../../../services/api';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';

interface Props {
  mode: 'register' | 'login';
  onNext: (data: { email: string; username?: string; password: string }) => void;
  onToggleMode: () => void;
  isSubmitting?: boolean;
}

const variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.25 } },
};

const CredentialsStep: React.FC<Props> = ({ mode, onNext, onToggleMode, isSubmitting = false }) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email.includes('@')) e.email = 'Valid email is required';
    if (mode === 'register' && username.trim().length < 3) e.username = 'Minimum 3 characters';
    if (password.length < 6) e.password = 'Minimum 6 characters';
    if (mode === 'register' && !agreeTerms) e.terms = 'You must agree to the Terms and Conditions';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onNext({ email: email.trim(), username: username.trim() || undefined, password });
  };

  const handleForgotPassword = () => {
    if (!email.includes('@')) {
      setAlertModal({ isOpen: true, title: 'Invalid Email', message: 'Please enter a valid email address first.' });
      return;
    }
    setShowForgotModal(true);
  };

  const confirmForgotPassword = async () => {
    setShowForgotModal(false);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setAlertModal({ isOpen: true, title: 'Email Sent', message: 'If that email exists, a reset link was sent.' });
    } catch (err: any) {
      setAlertModal({ isOpen: true, title: 'Error', message: err.response?.data?.error || err.response?.data?.message || 'Failed to send reset link' });
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      variants={variants}
      initial="hidden"
      animate="show"
      exit="exit"
    >
      <div style={{ marginBottom: 32 }}>
        <h3 className="step-title">{mode === 'register' ? 'Create an account' : 'Sign in'}</h3>
        <p className="step-subtitle">
          {mode === 'register' ? 'Enter your details to get started.' : 'Welcome back! Please enter your details.'}
        </p>
      </div>

      <div className="input-group">
        <label className="step-label">Email address</label>
        <div className="input-wrapper">
          <input
            className={`split-input${errors.email ? ' error' : ''}`}
            type="email"
            placeholder="name@company.com"
            autoComplete="email"
            value={email}
            onChange={e => { setEmail(e.target.value); delete errors.email; setErrors({ ...errors }); }}
          />
        </div>
        {errors.email && <span className="field-error">{errors.email}</span>}
      </div>

      {mode === 'register' && (
        <div className="input-group">
          <label className="step-label">Username</label>
          <div className="input-wrapper">
            <input
              className={`split-input${errors.username ? ' error' : ''}`}
              type="text"
              placeholder="@username"
              autoComplete="username"
              value={username}
              onChange={e => { setUsername(e.target.value); delete errors.username; setErrors({ ...errors }); }}
            />
          </div>
          {errors.username && <span className="field-error">{errors.username}</span>}
        </div>
      )}

      <div className="input-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label className="step-label" style={{ marginBottom: 0 }}>Password</label>
          {mode === 'login' && (
            <button type="button" className="btn-link" onClick={handleForgotPassword} style={{ fontSize: 10 }}>Forgot password?</button>
          )}
        </div>
        <div className="input-wrapper">
          <input
            className={`split-input${errors.password ? ' error' : ''}`}
            type={showPw ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            value={password}
            onChange={e => { setPassword(e.target.value); delete errors.password; setErrors({ ...errors }); }}
          />
          <button
            type="button"
            className="input-toggle"
            onClick={() => setShowPw(p => !p)}
            aria-label={showPw ? "Hide password" : "Show password"}
          >
            {showPw ? (
              <svg viewBox="0 0 24 24" fill="none" style={{ width: 14, height: 14 }}>
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" style={{ width: 14, height: 14 }}>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
        {errors.password && <span className="field-error">{errors.password}</span>}
      </div>

      {mode === 'register' && (
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={e => { setAgreeTerms(e.target.checked); delete errors.terms; setErrors({ ...errors }); }}
              style={{ accentColor: 'var(--primary-color)', width: 14, height: 14 }}
            />
            I agree to the Terms and Conditions
          </label>
          {errors.terms && <div className="field-error" style={{ marginTop: 4 }}>{errors.terms}</div>}
        </div>
      )}

      <button type="submit" className="btn-primary" disabled={isSubmitting}>
        {isSubmitting ? (
          <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', borderTopColor: '#fff' }} />
        ) : (
          mode === 'register' ? 'Create account' : 'Sign in'
        )}
      </button>

      <div style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: '#666666ff' }}>
        {mode === 'register' ? "Already have an account?" : "Don't have an account?"}{' '}
        <button type="button" className="btn-link" onClick={onToggleMode} style={{ fontSize: 11, fontWeight: 400, color: '#6d6d6dff' }}>
          {mode === 'register' ? 'Sign in' : 'Create one'}
        </button>
      </div>

      <ConfirmModal
        isOpen={showForgotModal}
        title="Reset Password"
        message={`Send password reset link to ${email}?`}
        confirmText="Send Link"
        onCancel={() => setShowForgotModal(false)}
        onConfirm={confirmForgotPassword}
      />

      <ConfirmModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="OK"
        cancelText=""
        onCancel={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
      />
    </motion.form>
  );
};

export default CredentialsStep;
