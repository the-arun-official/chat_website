import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

interface Props {
  fullName: string;
  onContinue: () => void;
}

const WelcomeDoneStep: React.FC<Props> = ({ fullName, onContinue }) => {
  // Auto-redirect after 2.6s
  useEffect(() => {
    const id = setTimeout(onContinue, 2600);
    return () => clearTimeout(id);
  }, [onContinue]);

  const firstName = fullName.split(' ')[0] || 'there';

  return (
    <motion.div
      className="step-panel"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ alignItems: 'center', textAlign: 'center', gap: 20, paddingTop: 16 }}
    >
      {/* Checkmark */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
      >
        <div className="checkmark-circle">
          <svg className="checkmark-svg" viewBox="0 0 24 24">
            <path className="checkmark-path" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
      >
        <p className="step-title">You're in, {firstName}!</p>
        <p className="step-subtitle">Your account is ready. Taking you to Aura Messenger…</p>
      </motion.div>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{ width: '100%', marginTop: 8 }}
      >
        <div style={{
          height: 2,
          background: 'var(--border)',
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2.2, delay: 0.5, ease: 'easeInOut' }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, var(--accent), #5856d6)',
              borderRadius: 2,
            }}
          />
        </div>
      </motion.div>

      {/* Manual CTA */}
      <motion.button
        className="btn-link"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        onClick={onContinue}
        style={{ fontSize: 12 }}
      >
        Continue now
      </motion.button>
    </motion.div>
  );
};

export default WelcomeDoneStep;
