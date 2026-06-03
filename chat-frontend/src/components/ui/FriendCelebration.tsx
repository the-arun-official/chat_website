import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Star, Sparkles } from 'lucide-react';

interface Particle {
  id: string;
  type: 'heart' | 'star' | 'sparkle';
  x: number;
  y: number;
  delay: number;
  duration: number;
}

interface FriendCelebrationProps {
  userName: string;
  userAvatar?: string;
  trigger: boolean;
  onComplete?: () => void;
}

export const FriendCelebration: React.FC<FriendCelebrationProps> = ({
  userName,
  userAvatar,
  trigger,
  onComplete
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!trigger) return;

    setShow(true);

    // Create minimal celebration particles - Gold theme
    const particleCount = 15;  // Reduced from 30 to 15 for minimal design
    const newParticles: Particle[] = [];
    const types: ('heart' | 'star' | 'sparkle')[] = ['star', 'sparkle', 'sparkle'];  // Mostly sparkles

    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: `particle-${i}-${Date.now()}`,
        type: types[i % types.length],
        x: Math.random() * 80 - 40,
        y: Math.random() * 80 - 40,
        delay: Math.random() * 0.15,
        duration: 1.8 + Math.random() * 0.3
      });
    }

    setParticles(newParticles);

    // Auto cleanup - FIXED: Now closes after animation
    const timer = setTimeout(() => {
      setShow(false);
      setParticles([]);
      onComplete?.();
    }, 2800);  // Reduced from 3500 to 2800 for faster close

    return () => clearTimeout(timer);
  }, [trigger, onComplete]);

  if (!show) return null;

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        overflow: 'hidden'
      }}>
        {/* Confetti particles */}
        {particles.map((particle) => {
          return (
            <motion.div
              key={particle.id}
              initial={{
                position: 'fixed',
                left: '50%',
                top: '50%',
                x: particle.x,
                y: particle.y - 100,
                opacity: 1,
                scale: 1,
                rotate: 0
              }}
              animate={{
                y: particle.y + 300,
                opacity: 0,
                scale: 0,
                rotate: 360 + Math.random() * 360
              }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                ease: 'easeIn'
              }}
              style={{
                position: 'fixed',
                left: '50%',
                top: '50%',
                pointerEvents: 'none',
                zIndex: 9999
              }}
            >
              <Sparkles 
                size={16}
                color='#FFD700'
              />
            </motion.div>
          );
        })}

        {/* Center celebration card - Minimal Gold Design */}
        <motion.div
          initial={{
            position: 'fixed',
            left: '50%',
            top: '50%',
            x: '-50%',
            y: '-50%',
            scale: 0,
            opacity: 0
          }}
          animate={{
            scale: 1,
            opacity: 1
          }}
          exit={{
            scale: 0,
            opacity: 0,
            y: -50
          }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 15,
            duration: 0.5
          }}
          style={{
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10000,
            pointerEvents: 'none'
          }}
        >
          <div style={{
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.98), rgba(255, 215, 0, 0.95))',
            backdropFilter: 'blur(15px)',
            borderRadius: '16px',
            padding: '32px 40px',
            textAlign: 'center',
            border: '2px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0 15px 50px rgba(212, 175, 55, 0.35)',
            minWidth: '300px'
          }}>
            {/* Avatar with pulse */}
            {userAvatar && (
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 0.6,
                  repeat: 3,
                  repeatType: 'reverse'
                }}
                style={{
                  marginBottom: '16px'
                }}
              >
                <img
                  src={userAvatar}
                  alt={userName}
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    border: '3px solid white',
                    boxShadow: '0 0 16px rgba(212, 175, 55, 0.5)',
                    objectFit: 'cover'
                  }}
                />
              </motion.div>
            )}

            {/* Celebration text - Minimal */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{
                margin: '0 0 6px 0',
                fontSize: '22px',
                fontWeight: '600',
                color: 'white',
                textShadow: '0 1px 4px rgba(0, 0, 0, 0.15)'
              }}
            >
              ✨ Friends Now! ✨
            </motion.h2>

            {/* User name */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              style={{
                margin: '0',
                fontSize: '14px',
                color: 'white',
                textShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                fontWeight: '500'
              }}
            >
              You and <strong>{userName}</strong> are now connected!
            </motion.p>

            {/* Animated hearts around text - Removed for minimal design */}

          </div>
        </motion.div>

        {/* Minimal gold background flash */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0.2, 0, 0.2, 0]
          }}
          transition={{
            duration: 2.5,
            times: [0, 0.3, 0.6, 1]
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(circle at 50% 50%, rgba(212, 175, 55, 0.25), rgba(255, 215, 0, 0.05))',
            pointerEvents: 'none',
            zIndex: 9998
          }}
        />

        <style>{`
          /* Minimal gold theme - no decorative elements */
        `}</style>
      </div>
    </AnimatePresence>
  );
};

export const useFriendCelebration = () => {
  const [celebrations, setCelebrations] = useState<Map<string, {
    userName: string;
    userAvatar?: string;
    trigger: boolean;
  }>>(new Map());

  const celebrate = (userId: string, userName: string, userAvatar?: string) => {
    setCelebrations(prev => {
      const newMap = new Map(prev);
      newMap.set(userId, { userName, userAvatar, trigger: true });
      return newMap;
    });

    setTimeout(() => {
      setCelebrations(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(userId);
        if (existing) {
          newMap.set(userId, { ...existing, trigger: false });
        }
        return newMap;
      });
    }, 3500);
  };

  const renderCelebrations = () => {
    return Array.from(celebrations.entries()).map(([userId, data]) => (
      <FriendCelebration
        key={userId}
        userName={data.userName}
        userAvatar={data.userAvatar}
        trigger={data.trigger}
      />
    ));
  };

  return {
    celebrate,
    renderCelebrations
  };
};
