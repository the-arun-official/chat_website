import React from 'react';
import { motion } from 'framer-motion';

interface AuroraHeaderProps {
  children?: React.ReactNode;
}

export const AuroraHeader: React.FC<AuroraHeaderProps> = ({ children }) => {
  return (
    <div
      style={{
        position: 'relative',
        background: 'linear-gradient(180deg, #0a1e2e 0%, #16213e 50%, #0f3460 100%)',
        overflow: 'hidden',
        height: '100%'
      }}
    >
      {/* Northern Lights Animation - Top Layer */}
      <motion.div
        animate={{
          opacity: [0.3, 0.8, 0.3],
          x: [-100, 100, -100]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(0, 255, 150, 0.4), transparent)',
          filter: 'blur(40px)',
          pointerEvents: 'none'
        }}
      />

      {/* Northern Lights Animation - Purple */}
      <motion.div
        animate={{
          opacity: [0.2, 0.6, 0.2],
          x: [100, -100, 100]
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1
        }}
        style={{
          position: 'absolute',
          top: '10%',
          left: 0,
          right: 0,
          height: '40%',
          background: 'linear-gradient(90deg, transparent, rgba(138, 43, 226, 0.3), transparent)',
          filter: 'blur(50px)',
          pointerEvents: 'none'
        }}
      />

      {/* Northern Lights Animation - Cyan */}
      <motion.div
        animate={{
          opacity: [0.15, 0.5, 0.15],
          x: [-100, 100, -100]
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2
        }}
        style={{
          position: 'absolute',
          top: '20%',
          left: 0,
          right: 0,
          height: '50%',
          background: 'linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.25), transparent)',
          filter: 'blur(60px)',
          pointerEvents: 'none'
        }}
      />

      {/* Glow Pulse - Center */}
      <motion.div
        animate={{
          opacity: [0.2, 0.5, 0.2]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '300px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 255, 200, 0.3), transparent)',
          filter: 'blur(40px)',
          pointerEvents: 'none'
        }}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        {children}
      </div>

      <style>{`
        @keyframes aurora-wave {
          0% {
            background-position: 0% center;
          }
          100% {
            background-position: 200% center;
          }
        }
      `}</style>
    </div>
  );
};
