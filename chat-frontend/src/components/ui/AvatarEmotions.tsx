import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

type EmotionType = 'laugh' | 'love' | 'celebrate' | 'surprise' | 'wave' | 'sleep' | 'idle';

interface AvatarEmotionsProps {
  avatarUrl?: string;
  initials?: string;
  emotion?: EmotionType;
  duration?: number;
  size?: number;
}

export const AvatarEmotions: React.FC<AvatarEmotionsProps> = ({
  avatarUrl,
  initials,
  emotion = 'idle',
  duration = 2,
  size = 48
}) => {
  const [showEmotion, setShowEmotion] = useState(emotion !== 'idle');

  useEffect(() => {
    if (emotion === 'idle') return;

    setShowEmotion(true);
    const timer = setTimeout(() => {
      setShowEmotion(false);
    }, duration * 1000);

    return () => clearTimeout(timer);
  }, [emotion, duration]);

  const getEmotionAnimation = () => {
    switch (emotion) {
      case 'laugh':
        return {
          animate: { scale: [1, 1.2, 1], rotateZ: [0, 5, -5, 0] },
          transition: { duration: 0.6, repeat: 3 }
        };
      case 'love':
        return {
          animate: { scale: [1, 1.15, 1] },
          transition: { duration: 0.8, repeat: 2 }
        };
      case 'celebrate':
        return {
          animate: { y: [-5, -15, -5], rotateZ: [0, 10, -10, 0] },
          transition: { duration: 0.8, repeat: 2 }
        };
      case 'surprise':
        return {
          animate: { scale: [1, 1.1, 1], y: [-2, 2, -2] },
          transition: { duration: 0.5, repeat: 2 }
        };
      case 'wave':
        return {
          animate: { rotateZ: [0, 20, 0] },
          transition: { duration: 0.6, repeat: 2 }
        };
      case 'sleep':
        return {
          animate: { y: [0, -2, 0], opacity: [1, 0.8, 1] },
          transition: { duration: 2, repeat: Infinity }
        };
      default:
        return {};
    }
  };

  const emotionData = getEmotionAnimation();

  return (
    <motion.div
      {...emotionData}
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden'
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'white' }}>
            {initials || '👤'}
          </span>
        )}
      </div>

      {/* Emotion Indicator */}
      {showEmotion && emotion !== 'idle' && (
        <motion.div
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: [1, 1.2, 1], opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            position: 'absolute',
            bottom: '-2px',
            right: '-2px',
            fontSize: '20px',
            background: 'white',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
          {emotion === 'laugh' && '😂'}
          {emotion === 'love' && '❤️'}
          {emotion === 'celebrate' && '🎉'}
          {emotion === 'surprise' && '😮'}
          {emotion === 'wave' && '👋'}
          {emotion === 'sleep' && '😴'}
        </motion.div>
      )}

      {/* Sleep ZZZ Particles */}
      {emotion === 'sleep' && (
        <>
          {[0, 1, 2].map((idx) => (
            <motion.div
              key={`zzz-${idx}`}
              animate={{
                y: [-10, 10, -10],
                x: [10, 20, 10],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: idx * 0.3
              }}
              style={{
                position: 'absolute',
                top: '30%',
                right: '-20px',
                fontSize: '12px',
                fontWeight: 'bold',
                color: 'rgba(0, 150, 200, 0.6)',
                pointerEvents: 'none'
              }}
            >
              z
            </motion.div>
          ))}
        </>
      )}
    </motion.div>
  );
};

// Hook to trigger emotions
export const useAvatarEmotion = () => {
  const [emotion, setEmotion] = useState<EmotionType>('idle');

  const triggerEmotion = (type: EmotionType, duration: number = 2) => {
    setEmotion(type);
    setTimeout(() => setEmotion('idle'), duration * 1000);
  };

  return { emotion, triggerEmotion };
};
