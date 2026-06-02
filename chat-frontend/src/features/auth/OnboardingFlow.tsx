import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Shield, Zap, Layout } from 'lucide-react';
import './Onboarding.css';

import CredentialsStep from './steps/CredentialsStep';
import ProfileSetupStep from './steps/ProfileSetupStep';
import OtpStep from './steps/OtpStep';
import SuccessStep from './steps/SuccessStep';
import CreatingStep from './steps/CreatingStep';

import api from '../../services/api';
import { useAppDispatch } from '../../store/store';
import { setUser } from './authSlice';
import { useTheme } from '../../contexts/ThemeContext';

const extractErrorMessage = (err: any, fallback: string) => {
  if (err.response?.data?.error) return err.response.data.error;
  if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
    return err.response.data.errors.map((e: any) => e.message).join(', ');
  }
  if (err.response?.data?.message) return err.response.data.message;
  return fallback;
};

// ── Step constants ─────────────────────────────────────────────────────────
// Register:  CREDS(0) → OTP(1) → OTP_DONE(2) → PROFILE(3) → CREATING(4)
// Login:     CREDS(0) → LOGIN_SUCCESS(5)
const STEP_CREDS = 0;
const STEP_OTP = 1;
const STEP_OTP_DONE = 2;  // "Email Verified!" brief screen → auto→ PROFILE
const STEP_PROFILE = 3;
const STEP_CREATING = 4;  // Loading spinner → tick animation
const STEP_LOGIN_SUCCESS = 5;  // Login: success → auto-redirect dashboard

const slide = {
  enter: (dir: number) => ({ x: dir > 0 ? 30 : -30, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.35, ease: 'easeOut' as const } },
  shake: {
    x: [0, -10, 10, -10, 10, -5, 5, 0],
    transition: { duration: 0.4 },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -30 : 30,
    opacity: 0,
    transition: { duration: 0.25 },
  }),
};

export const OnboardingFlow: React.FC = () => {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { theme, toggle } = useTheme();

  const initialMode = location.state?.mode || new URLSearchParams(location.search).get('mode') || 'register';
  const [mode, setMode] = useState<'register' | 'login'>(initialMode as 'register' | 'login');

  const [step, setStep] = useState(STEP_CREDS);
  const [dir, setDir] = useState(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Aggregated data across steps
  const [onboardingData, setOnboardingData] = useState<Record<string, any>>({});

  const go = (target: number) => {
    setDir(target > step ? 1 : -1);
    setErrorMsg(null);
    setStep(target);
  };

  const shake = (msg: string) => {
    setErrorMsg(msg);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
  };


  const onCredsNext = async (data: { email: string; username?: string; password: string }) => {
    setOnboardingData(prev => ({ ...prev, ...data }));

    if (mode === 'login') {
      setIsSubmitting(true);
      try {
        const res = await api.post('/auth/login', { email: data.email, password: data.password });
        setOnboardingData(prev => ({
          ...prev,
          finalUserPayload: {
            ...res.data.user,
            token: res.data.accessToken,
            refreshToken: res.data.refreshToken,
          },
        }));
        go(STEP_LOGIN_SUCCESS);
      } catch (err: any) {
        shake(extractErrorMessage(err, 'Login failed'));
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // REGISTER: create account (without fullName) → OTP sent → go to OTP step
      setIsSubmitting(true);
      try {
        const res = await api.post('/auth/register', {
          email: data.email,
          username: data.username,
          password: data.password,
        });
        const { accessToken, refreshToken } = res.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        setOnboardingData(prev => ({
          ...prev,
          accessToken,
          refreshToken,
          userResponse: res.data.user,
        }));
        go(STEP_OTP);
      } catch (err: any) {
        shake(extractErrorMessage(err, 'Registration failed'));
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // ── STEP 1: OTP verification ────────────────────────────────────────────
  const onOtpNext = async (otpCode: string) => {
    setIsSubmitting(true);
    try {
      // verifyOtp now creates the user in DB and returns tokens
      const res = await api.post('/auth/verify-otp', { email: onboardingData.email, otpCode });
      const { user, accessToken, refreshToken } = res.data;

      // Store tokens so profile step can call authenticated endpoints
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setOnboardingData(prev => ({
        ...prev,
        userResponse: user,
        accessToken,
        refreshToken,
      }));

      // Show "Email Verified!" celebration screen → auto-advances to PROFILE
      go(STEP_OTP_DONE);
    } catch (err: any) {
      shake(extractErrorMessage(err, 'Verification failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    await api.post('/auth/send-otp', { email: onboardingData.email });
  };

  // ── STEP 2: OTP_DONE — auto-advance to PROFILE ─────────────────────────
  // Handled inline via SuccessStep's autoRedirectMs

  // ── STEP 3: Profile setup — stores data then goes to CREATING ──────────
  const onProfileNext = (data: { fullName: string; avatarFile: File | null }) => {
    // Just store the data and navigate — actual API call runs inside CreatingStep
    setOnboardingData(prev => ({ ...prev, ...data }));
    go(STEP_CREATING);
  };

  // ── STEP 4: CREATING — the task CreatingStep runs ──────────────────────
  const profileTask = async () => {
    // Update fullName
    await api.patch('/users/me', { fullName: onboardingData.fullName });

    // Upload avatar if provided
    if (onboardingData.avatarFile) {
      const form = new FormData();
      form.append('avatar', onboardingData.avatarFile);
      await api.post('/users/me/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
  };

  const onCreatingDone = () => {
    // Clear temp tokens, reset state, redirect user to login
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setOnboardingData({});
    setMode('login');
    setDir(-1);
    setStep(STEP_CREDS);
  };

  const onCreatingError = (msg: string) => {
    shake(msg);
    go(STEP_PROFILE);
  };

  // ── STEP 5: Login success — auto-redirect dispatch ─────────────────────
  const onLoginSuccessNext = () => {
    const { finalUserPayload } = onboardingData;
    if (finalUserPayload) dispatch(setUser(finalUserPayload));
  };

  const handleToggleMode = () => {
    setErrorMsg(null);
    setOnboardingData({});
    setMode(prev => (prev === 'register' ? 'login' : 'register'));
    setStep(STEP_CREDS);
  };

  // ── Which steps show the back arrow ────────────────────────────────────
  const showBackArrow = step === STEP_OTP || step === STEP_PROFILE;
  const backTarget = step === STEP_PROFILE ? STEP_OTP_DONE : STEP_CREDS;

  return (
    <div className="onboarding-split-root">

      {/* Left Pane */}
      <div className="split-left">
        <div className="split-left-bg" />
        <div className="split-left-grain" />
        <div className="split-left-content">
          <div className="split-logo">
            <div className="split-logo-mark">
              <svg viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2z" /></svg>
            </div>
            Aura Messenger
          </div>

          <h2 className="split-title">
            {mode === 'register' ? (
              <>Join the new standard of<br /><span>communication.</span></>
            ) : (
              <>Welcome back to<br /><span>your workspace.</span></>
            )}
          </h2>

          <p className="split-subtitle">
            {mode === 'register'
              ? 'Set up your account in seconds and experience real-time, encrypted messaging designed for focus.'
              : 'Sign in to pick up right where you left off. All your messages, perfectly synced.'}
          </p>

          {mode === 'register' && (
            <div className="split-feats">
              <div className="split-feat"><Shield size={16} /> End-to-end encrypted by default</div>
              <div className="split-feat"><Zap size={16} /> Sub-millisecond message delivery</div>
              <div className="split-feat"><Layout size={16} /> Distraction-free minimalist interface</div>
            </div>
          )}
        </div>
      </div>

      {/* Right Pane */}
      <div className="split-right">
        {/* Theme Toggle */}
        <button
          onClick={toggle}
          className="split-back"
          style={{ left: 'auto', right: 32 }}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <span style={{ fontSize: '14px' }}>☀</span> : <span style={{ fontSize: '14px' }}>🌙</span>}
        </button>

        {/* Back arrow */}
        {showBackArrow && (
          <button className="split-back" onClick={() => go(backTarget)} aria-label="Go back">
            <svg viewBox="0 0 24 24" fill="none" style={{ width: 16, height: 16 }}>
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        {step === STEP_CREDS && (
          <Link to="/" className="split-back" aria-label="Back to Home">
            <svg viewBox="0 0 24 24" fill="none" style={{ width: 16, height: 16 }}>
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        )}

        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={slide}
            initial="enter"
            animate={isShaking ? 'shake' : 'center'}
            exit="exit"
            className="step-motion-wrap"
          >
            {errorMsg && (
              <div style={{ padding: '12px', background: 'rgba(255,50,50,0.1)', color: '#ff5f57', borderRadius: '12px', marginBottom: '16px', fontSize: '13px', textAlign: 'center' }}>
                {errorMsg}
              </div>
            )}

            {/* Step 0: Credentials */}
            {step === STEP_CREDS && (
              <CredentialsStep
                mode={mode}
                onNext={onCredsNext}
                onToggleMode={handleToggleMode}
                isSubmitting={isSubmitting}
              />
            )}

            {/* Step 1: OTP Entry (register only) */}
            {step === STEP_OTP && (
              <OtpStep
                onNext={onOtpNext}
                onResend={handleResendOtp}
                isSubmitting={isSubmitting}
              />
            )}

            {/* Step 2: OTP Verified celebration (register only) — auto-advances to PROFILE */}
            {step === STEP_OTP_DONE && (
              <SuccessStep
                onNext={() => go(STEP_PROFILE)}
                message="Email Verified!"
                subtitle="Your email has been confirmed. Now let's personalise your profile."
                autoRedirectMs={2200}
              />
            )}

            {/* Step 3: Profile setup (register only) */}
            {step === STEP_PROFILE && (
              <ProfileSetupStep
                onNext={onProfileNext}
                isSubmitting={isSubmitting}
              />
            )}

            {/* Step 4: Creating account — loading spinner → tick animation */}
            {step === STEP_CREATING && (
              <CreatingStep
                task={profileTask}
                onDone={onCreatingDone}
                onError={onCreatingError}
              />
            )}

            {/* Step 5: Login success — auto-redirects to dashboard */}
            {step === STEP_LOGIN_SUCCESS && (
              <SuccessStep
                onNext={onLoginSuccessNext}
                message="Successfully Logged In!"
                subtitle="Welcome back! Connecting to your workspace..."
                autoRedirectMs={2500}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OnboardingFlow;
