import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface Props {
  onNext: (otpCode: string) => void;
  onResend: () => Promise<void>;
  isSubmitting?: boolean;
}

const variants = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
  exit:   { opacity: 0, y: -10, transition: { duration: 0.25 } },
};

const RESEND_COOLDOWN = 60; // seconds

const OtpStep: React.FC<Props> = ({ onNext, onResend, isSubmitting = false }) => {
  const [otpCode, setOtpCode]     = useState('');
  const [error, setError]         = useState<string | null>(null);
  const [cooldown, setCooldown]   = useState(RESEND_COOLDOWN); // starts counting immediately
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start countdown on mount (first OTP was just sent when this step mounted)
  useEffect(() => {
    startCountdown();
    return () => stopCountdown();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCountdown = () => {
    setCooldown(RESEND_COOLDOWN);
    stopCountdown();
    intervalRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          stopCountdown();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopCountdown = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendMsg(null);
    try {
      await onResend();
      setResendMsg('A new code has been sent to your email.');
      startCountdown();
    } catch {
      setResendMsg('Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }
    setError(null);
    onNext(otpCode);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <motion.form
      onSubmit={handleSubmit}
      variants={variants}
      initial="hidden"
      animate="show"
      exit="exit"
    >
      <h2 className="step-title">Verify your email</h2>
      <p className="step-subtitle">
        We sent a 6-digit verification code to your email address. Please enter it below.
      </p>

      <div className="input-group">
        <label className="step-label">Verification Code</label>
        <div className="input-wrapper">
          <input
            className={`split-input${error ? ' error' : ''}`}
            type="text"
            placeholder="000000"
            maxLength={6}
            value={otpCode}
            autoFocus
            onChange={e => {
              const val = e.target.value.replace(/[^0-9]/g, '');
              setOtpCode(val);
              setError(null);
            }}
            style={{ letterSpacing: '0.5em', textAlign: 'center', fontSize: '20px', fontWeight: 600 }}
          />
        </div>
        {error && <span className="field-error">{error}</span>}
      </div>

      <button type="submit" className="btn-primary" disabled={isSubmitting}>
        {isSubmitting ? (
          <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', borderTopColor: '#fff' }} />
        ) : 'Verify Account'}
      </button>

      {/* Resend section */}
      <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
        Didn't receive the code?{' '}

        {cooldown > 0 ? (
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
            Resend in{' '}
            <span style={{
              display: 'inline-block',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              padding: '1px 8px',
              fontFamily: 'monospace',
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontSize: 13,
              minWidth: 36,
              textAlign: 'center',
            }}>
              {formatTime(cooldown)}
            </span>
          </span>
        ) : (
          <button
            type="button"
            className="btn-link"
            onClick={handleResend}
            disabled={resending}
            style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}
          >
            {resending ? 'Sending...' : 'Resend code'}
          </button>
        )}
      </div>

      {resendMsg && (
        <p style={{
          marginTop: 10,
          textAlign: 'center',
          fontSize: 12,
          color: resendMsg.includes('Failed') ? '#ff5f57' : '#34c759',
        }}>
          {resendMsg}
        </p>
      )}
    </motion.form>
  );
};

export default OtpStep;
