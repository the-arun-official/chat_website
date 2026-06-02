import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  task: () => Promise<void>;
  onDone: () => void;
  onError: (msg: string) => void;
}

const tickVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  show: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.7, ease: 'easeOut' as const, delay: 0.15 },
  },
};

const CreatingStep: React.FC<Props> = ({ task, onDone, onError }) => {
  const [phase, setPhase] = useState<'loading' | 'success'>('loading');

  useEffect(() => {
    task()
      .then(() => setPhase('success'))
      .catch((err: any) => {
        const msg =
          err?.response?.data?.error ||
          (Array.isArray(err?.response?.data?.errors)
            ? err.response.data.errors.map((e: any) => e.message).join(', ')
            : null) ||
          err?.message ||
          'Something went wrong';
        onError(msg);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <AnimatePresence mode="wait">
        {phase === 'loading' ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 0.3 } }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}
          >
            {/* Animated ring */}
            <div style={{ position: 'relative', width: 80, height: 80 }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                border: '3px solid rgba(255,255,255,0.08)',
                position: 'absolute',
              }} />
              <div className="spinner" style={{
                width: 80, height: 80, borderWidth: 3,
                borderColor: 'transparent',
                borderTopColor: 'var(--accent)',
                position: 'absolute',
              }} />
            </div>
            <div>
              <h2 className="step-title" style={{ marginBottom: 8 }}>Creating your account</h2>
              <p className="step-subtitle">Hang tight, we're setting everything up...</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 0.4, ease: 'easeOut' as const } }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
          >
            {/* Green tick circle */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
              style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'rgba(52, 199, 89, 0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
                border: '2px solid rgba(52, 199, 89, 0.3)',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" style={{ width: 44, height: 44, color: '#34c759' }}>
                <motion.path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  variants={tickVariants}
                  initial="hidden"
                  animate="show"
                />
              </svg>
            </motion.div>

            <motion.h2
              className="step-title"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.4, duration: 0.3 } }}
              style={{ marginBottom: 8 }}
            >
              Successfully Created!
            </motion.h2>
            <motion.p
              className="step-subtitle"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.55, duration: 0.3 } }}
            >
              Your account is ready. Log in to start messaging.
            </motion.p>

            <motion.button
              type="button"
              className="btn-primary"
              onClick={onDone}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.7, duration: 0.3 } }}
              style={{ marginTop: 28 }}
            >
              Go to Login
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CreatingStep;
