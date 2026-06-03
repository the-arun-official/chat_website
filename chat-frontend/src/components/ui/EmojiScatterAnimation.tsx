import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface EmojiParticle {
  id: string;
  emoji: string;
  x: number;
  y: number;
  delay: number;
  duration: number;
  angle: number;
  distance: number;
}

interface EmojiScatterAnimationProps {
  emoji: string;
  trigger: boolean;
  messageId?: string;
}

export const EmojiScatterAnimation: React.FC<EmojiScatterAnimationProps> = ({ 
  emoji, 
  trigger,
  messageId 
}) => {
  const [particles, setParticles] = useState<EmojiParticle[]>([]);
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (!trigger) return;

    setShowAnimation(true);

    // Create fewer particles for better performance
    const particleCount = 6; // Fixed count (much less)
    const newParticles: EmojiParticle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const distance = 100 + Math.random() * 80; // Reduced distance
      
      newParticles.push({
        id: `${messageId}-particle-${i}-${Date.now()}`,
        emoji: emoji,
        x: 0,
        y: 0,
        delay: 0, // No delay for instant start
        duration: 0.8, // Much faster
        angle: angle,
        distance: distance
      });
    }

    setParticles(newParticles);

    // Auto cleanup after animation
    const timer = setTimeout(() => {
      setShowAnimation(false);
      setParticles([]);
    }, 900);

    return () => clearTimeout(timer);
  }, [trigger, emoji, messageId]);

  if (!showAnimation || particles.length === 0) return null;

  return (
    <>
      {particles.map((particle) => {
        const endX = Math.cos(particle.angle) * particle.distance;
        const endY = Math.sin(particle.angle) * particle.distance;

        return (
          <motion.div
            key={particle.id}
            initial={{
              position: 'fixed',
              left: '50%',
              top: '50%',
              x: -12,
              y: -12,
              scale: 1,
              opacity: 1,
              pointerEvents: 'none',
              zIndex: 10000
            }}
            animate={{
              x: endX,
              y: endY,
              scale: 0,
              opacity: 0,
              rotate: Math.random() * 360
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              ease: 'easeOut'
            }}
            style={{
              position: 'fixed',
              left: '50%',
              top: '50%',
              pointerEvents: 'none',
              zIndex: 10000,
              fontSize: '24px',
              lineHeight: '1'
            }}
          >
            {particle.emoji}
          </motion.div>
        );
      })}
    </>
  );
};

export const useEmojiScatter = () => {
  const [reactions, setReactions] = useState<Map<string, { emoji: string; trigger: boolean }>>(
    new Map()
  );

  const triggerScatter = (messageId: string, emoji: string) => {
    setReactions(prev => {
      const newMap = new Map(prev);
      newMap.set(messageId, { emoji, trigger: true });
      return newMap;
    });

    // Reset trigger after animation
    setTimeout(() => {
      setReactions(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(messageId);
        if (existing) {
          newMap.set(messageId, { ...existing, trigger: false });
        }
        return newMap;
      });
    }, 2500);
  };

  const renderAnimations = () => {
    return Array.from(reactions.entries()).map(([messageId, data]) => (
      <EmojiScatterAnimation
        key={messageId}
        emoji={data.emoji}
        trigger={data.trigger}
        messageId={messageId}
      />
    ));
  };

  return {
    triggerScatter,
    renderAnimations
  };
};
