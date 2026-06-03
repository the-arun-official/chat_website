import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

type MiniatureState = 'idle' | 'typing' | 'reading' | 'recording' | 'sending' | 'entering' | 'leaving';

interface MiniaturePresenceLightProps {
  userId: string;
  username: string;
  avatarColor?: string;
  state?: MiniatureState;
  size?: number;
}

/**
 * Lightweight 2D Miniature Avatar (CSS-based fallback)
 * Used when Three.js unavailable or for maximum performance
 * Still provides smooth animations and great visuals
 * Zero performance impact with CSS animations
 */
export const MiniaturePresenceLight: React.FC<MiniaturePresenceLightProps> = ({
  userId,
  username,
  avatarColor = '#FFD700',
  state = 'idle',
  size = 100
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for visibility culling
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const getStateAnimation = () => {
    switch (state) {
      case 'typing':
        return {
          animation: 'miniature-typing 0.6s ease-in-out infinite',
          transform: 'translateY(-4px)'
        };
      case 'recording':
        return {
          animation: 'miniature-recording 1s ease-in-out infinite',
          transform: 'scale(1.05)'
        };
      case 'sending':
        return {
          animation: 'miniature-sending 0.8s ease-out',
          transform: 'scaleY(0.95)'
        };
      case 'reading':
        return {
          animation: 'miniature-reading 2s ease-in-out infinite',
          transform: 'rotateY(5deg)'
        };
      case 'entering':
        return {
          animation: 'miniature-entering 1s ease-out forwards'
        };
      case 'leaving':
        return {
          animation: 'miniature-leaving 1s ease-out forwards'
        };
      default:
        return {
          animation: 'miniature-idle 3s ease-in-out infinite'
        };
    }
  };

  const stateAnimation = getStateAnimation();

  return (
    <div
      ref={containerRef}
      style={{
        width: size,
        height: size,
        position: 'relative',
        pointerEvents: 'none',
        opacity: isVisible ? 1 : 0.5,
        transition: 'opacity 0.3s ease'
      }}
    >
      {/* Head */}
      <motion.div
        style={{
          position: 'absolute',
          width: size * 0.4,
          height: size * 0.4,
          borderRadius: '50%',
          background: avatarColor,
          left: '30%',
          top: '15%',
          boxShadow: `0 4px 15px ${avatarColor}40`
        }}
        animate={
          state === 'idle'
            ? { rotateZ: [-2, 2, -2] }
            : state === 'typing'
            ? { y: [-3, 0, -3] }
            : {}
        }
        transition={state === 'idle' ? { duration: 3, repeat: Infinity } : { duration: 0.5, repeat: Infinity }}
      >
        {/* Eyes */}
        <div
          style={{
            position: 'absolute',
            width: '8px',
            height: '8px',
            background: '#000',
            borderRadius: '50%',
            left: '25%',
            top: '35%'
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: '8px',
            height: '8px',
            background: '#000',
            borderRadius: '50%',
            right: '25%',
            top: '35%'
          }}
        />
      </motion.div>

      {/* Body */}
      <div
        style={{
          position: 'absolute',
          width: size * 0.3,
          height: size * 0.45,
          background: '#4A90E2',
          left: '35%',
          top: '50%',
          borderRadius: '8px',
          boxShadow: '0 4px 10px rgba(74, 144, 226, 0.3)'
        }}
      />

      {/* Left Arm */}
      <motion.div
        style={{
          position: 'absolute',
          width: size * 0.12,
          height: size * 0.45,
          background: avatarColor,
          left: '10%',
          top: '45%',
          borderRadius: '6px',
          originX: 0.5,
          originY: 0,
          transformOrigin: 'top center'
        }}
        animate={
          state === 'typing'
            ? { rotateZ: [-15, 15, -15] }
            : state === 'recording'
            ? { rotateZ: -60 }
            : state === 'sending'
            ? { rotateZ: -45 }
            : { rotateZ: [-5, 5, -5] }
        }
        transition={
          state === 'idle'
            ? { duration: 2.5, repeat: Infinity }
            : { duration: 0.4, repeat: Infinity }
        }
      />

      {/* Right Arm */}
      <motion.div
        style={{
          position: 'absolute',
          width: size * 0.12,
          height: size * 0.45,
          background: avatarColor,
          right: '10%',
          top: '45%',
          borderRadius: '6px',
          transformOrigin: 'top center'
        }}
        animate={
          state === 'typing'
            ? { rotateZ: [15, -15, 15] }
            : state === 'recording'
            ? { rotateZ: -40 }
            : state === 'sending'
            ? { rotateZ: 45 }
            : { rotateZ: [5, -5, 5] }
        }
        transition={
          state === 'idle'
            ? { duration: 2.5, repeat: Infinity, delay: 0.2 }
            : { duration: 0.4, repeat: Infinity }
        }
      />

      {/* Left Leg */}
      <motion.div
        style={{
          position: 'absolute',
          width: size * 0.12,
          height: size * 0.4,
          background: '#2C2C2C',
          left: '35%',
          bottom: '5%',
          borderRadius: '4px'
        }}
        animate={
          state === 'reading'
            ? { rotateZ: [-8, 8, -8] }
            : state === 'entering'
            ? { rotateZ: [-20, 20, -20] }
            : { rotateZ: 0 }
        }
        transition={{ duration: 1.5, repeat: Infinity }}
      />

      {/* Right Leg */}
      <motion.div
        style={{
          position: 'absolute',
          width: size * 0.12,
          height: size * 0.4,
          background: '#2C2C2C',
          right: '35%',
          bottom: '5%',
          borderRadius: '4px'
        }}
        animate={
          state === 'reading'
            ? { rotateZ: [8, -8, 8] }
            : state === 'entering'
            ? { rotateZ: [20, -20, 20] }
            : { rotateZ: 0 }
        }
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
      />

      {/* Typing Phone (conditional) */}
      {state === 'typing' && (
        <motion.div
          style={{
            position: 'absolute',
            width: size * 0.15,
            height: size * 0.25,
            background: '#333',
            right: '5%',
            bottom: '30%',
            borderRadius: '4px',
            boxShadow: '0 0 10px rgba(51, 51, 51, 0.8)'
          }}
          animate={{ rotateZ: [-5, 5, -5] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        >
          <motion.div
            style={{
              width: '100%',
              height: '30%',
              background: '#111',
              borderRadius: '2px 2px 0 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: '#00FF00',
              fontWeight: 'bold'
            }}
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            ✍️
          </motion.div>
        </motion.div>
      )}

      {/* Recording Microphone (conditional) */}
      {state === 'recording' && (
        <motion.div
          style={{
            position: 'absolute',
            width: size * 0.1,
            height: size * 0.35,
            background: '#FF6B9D',
            left: '10%',
            top: '20%',
            borderRadius: '50% 50% 4px 4px',
            boxShadow: '0 0 15px rgba(255, 107, 157, 0.6)'
          }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        >
          {/* Sound waves */}
          <motion.div
            style={{
              position: 'absolute',
              width: '120%',
              height: '120%',
              border: '2px solid rgba(255, 107, 157, 0.6)',
              borderRadius: '50%',
              left: '-10%',
              top: '-10%'
            }}
            animate={{ scale: [1, 1.3], opacity: [1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        </motion.div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes miniature-typing {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes miniature-recording {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes miniature-sending {
          0% { transform: scaleY(1); }
          50% { transform: scaleY(0.92); }
          100% { transform: scaleY(1); }
        }
        @keyframes miniature-reading {
          0%, 100% { transform: rotateY(0deg); }
          50% { transform: rotateY(8deg); }
        }
        @keyframes miniature-entering {
          0% { transform: translateX(-50px) rotateY(-90deg) scaleX(0); }
          100% { transform: translateX(0) rotateY(0deg) scaleX(1); }
        }
        @keyframes miniature-leaving {
          0% { transform: translateX(0) rotateY(0deg); }
          100% { transform: translateX(60px) rotateY(-90deg) scaleX(0); }
        }
        @keyframes miniature-idle {
          0%, 100% { transform: translateY(0px) rotateZ(0deg); }
          25% { transform: translateY(-2px) rotateZ(-1deg); }
          75% { transform: translateY(-2px) rotateZ(1deg); }
        }
      `}</style>
    </div>
  );
};

// Hook for managing multiple miniatures (lightweight version)
export const useMiniaturePresenceLight = () => {
  const [miniatures, setMiniatures] = useState<
    Map<string, { state: MiniatureState; lastActive: number }>
  >(new Map());

  const updateMiniature = (userId: string, state: MiniatureState) => {
    setMiniatures((prev) => {
      const next = new Map(prev);
      next.set(userId, { state, lastActive: Date.now() });
      return next;
    });
  };

  const removeMiniature = (userId: string) => {
    setMiniatures((prev) => {
      const next = new Map(prev);
      next.delete(userId);
      return next;
    });
  };

  // Auto-idle after 5 seconds of inactivity
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setMiniatures((prev) => {
        const next = new Map(prev);
        prev.forEach((value, key) => {
          if (now - value.lastActive > 5000 && value.state !== 'idle') {
            next.set(key, { ...value, state: 'idle' });
          }
        });
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return { miniatures, updateMiniature, removeMiniature };
};
