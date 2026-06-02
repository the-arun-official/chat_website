import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  onRegister: () => void;
  onLogin: () => void;
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

const WelcomeStep: React.FC<Props> = ({ onRegister, onLogin }) => (
  <motion.div
    className="step-panel"
    initial="hidden"
    animate="show"
    variants={{ show: { transition: { staggerChildren: 0.07 } } }}
  >
    {/* Logo mark */}
    <motion.div variants={item} style={{ marginBottom: 4 }}>
      <div style={{
        width: 56,
        height: 56,
        borderRadius: 18,
        background: 'linear-gradient(135deg, #007aff 0%, #5856d6 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(0,122,255,0.35)',
      }}>
        <svg viewBox="0 0 24 24" fill="none" style={{ width: 28, height: 28, color: '#fff' }}>
          <path
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </motion.div>

    {/* Heading */}
    <motion.div variants={item}>
      <p className="step-title">Welcome to Aura Messenger</p>
      <p className="step-subtitle" style={{ marginTop: 6 }}>
        Private, fast, and beautifully simple messaging.
      </p>
    </motion.div>

    {/* Feature pills */}
    <motion.div variants={item} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
      {[
        { icon: '🔒', label: 'End-to-end' },
        { icon: '⚡', label: 'Instant' },
        { icon: '✨', label: 'Minimal' },
      ].map(f => (
        <span
          key={f.label}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 10px',
            borderRadius: 100,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            fontSize: 11,
            color: 'var(--text-secondary)',
          }}
        >
          <span>{f.icon}</span>
          {f.label}
        </span>
      ))}
    </motion.div>

    {/* Spacer */}
    <motion.div variants={item} style={{ height: 12 }} />

    {/* CTA */}
    <motion.div variants={item}>
      <button className="btn-primary" onClick={onRegister}>
        Create account
        <svg viewBox="0 0 24 24" fill="none" style={{ width: 14, height: 14, color: 'var(--bg-chat)' }}>
          <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </motion.div>

    <motion.div variants={item}>
      <button className="btn-ghost" onClick={onLogin}>
        <svg viewBox="0 0 24 24" fill="none" style={{ width: 14, height: 14, color: 'var(--text-tertiary)' }}>
          <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Sign in to existing account
      </button>
    </motion.div>

    <motion.div variants={item} style={{ textAlign: 'center', paddingTop: 4 }}>
      <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
        By continuing you agree to our{' '}
        <button className="btn-link" style={{ fontSize: 10 }}>Terms</button>
        {' '}&amp;{' '}
        <button className="btn-link" style={{ fontSize: 10 }}>Privacy Policy</button>
      </span>
    </motion.div>
  </motion.div>
);

export default WelcomeStep;
