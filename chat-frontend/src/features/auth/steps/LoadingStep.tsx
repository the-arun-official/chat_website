import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const steps = [
  'Creating your account…',
  'Uploading your photo…',
  'Setting up your space…',
  'Almost there…',
];

const LoadingStep: React.FC = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex(i => (i < steps.length - 1 ? i + 1 : i));
    }, 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      className="step-panel"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ alignItems: 'center', justifyContent: 'center', minHeight: 280, textAlign: 'center', gap: 28 }}
    >
      {/* Rings */}
      <div style={{ position: 'relative', width: 80, height: 80 }}>
        {/* Outer ring */}
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '1px solid #e5e5e5',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
        {/* Middle ring */}
        <motion.div
          style={{
            position: 'absolute',
            inset: 8,
            borderRadius: '50%',
            border: '1.5px solid transparent',
            borderTopColor: '#000000',
            borderRightColor: '#000000',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        />
        {/* Inner ring */}
        <motion.div
          style={{
            position: 'absolute',
            inset: 18,
            borderRadius: '50%',
            border: '1px solid transparent',
            borderTopColor: '#666666',
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
        />
        {/* Center dot */}
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#000000',
          }} />
        </motion.div>
      </div>

      {/* Status text */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 24 }}>
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            style={{ fontSize: 13, color: '#000000', fontWeight: 300 }}
          >
            {steps[index]}
          </motion.p>
        </AnimatePresence>
        <p style={{ fontSize: 11, color: '#999999', fontWeight: 300 }}>This only takes a moment</p>
      </div>
    </motion.div>
  );
};

export default LoadingStep;
