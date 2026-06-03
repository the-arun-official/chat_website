import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface MessageRippleProps {
  messageId: string;
  trigger: boolean;
}

interface Ripple {
  id: string;
  x: number;
  y: number;
}

export const MessageRipple: React.FC<MessageRippleProps> = ({ messageId, trigger }) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  useEffect(() => {
    if (!trigger) return;

    // Create ripples from multiple points
    const newRipples: Ripple[] = [];
    for (let i = 0; i < 3; i++) {
      newRipples.push({
        id: `${messageId}-ripple-${i}-${Date.now()}`,
        x: Math.random() * 100 - 50,
        y: Math.random() * 100 - 50
      });
    }

    setRipples(newRipples);

    // Cleanup after animation
    const timer = setTimeout(() => {
      setRipples([]);
    }, 1500);

    return () => clearTimeout(timer);
  }, [trigger, messageId]);

  return (
    <>
      {ripples.map((ripple) => (
        <motion.div
          key={ripple.id}
          initial={{
            x: ripple.x,
            y: ripple.y,
            scale: 0,
            opacity: 1
          }}
          animate={{
            x: ripple.x * 3,
            y: ripple.y * 3,
            scale: 1,
            opacity: 0
          }}
          transition={{
            duration: 1.2,
            ease: 'easeOut'
          }}
          style={{
            position: 'fixed',
            pointerEvents: 'none',
            zIndex: 100
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '2px solid rgba(0, 150, 255, 0.8)',
              boxShadow: '0 0 10px rgba(0, 150, 255, 0.6)'
            }}
          />
        </motion.div>
      ))}
    </>
  );
};

export const useMessageRipple = () => {
  const [ripples, setRipples] = useState<Map<string, { trigger: boolean }>>(new Map());

  const triggerRipple = (messageId: string) => {
    setRipples((prev) => {
      const newMap = new Map(prev);
      newMap.set(messageId, { trigger: true });
      return newMap;
    });

    setTimeout(() => {
      setRipples((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(messageId);
        if (existing) {
          newMap.set(messageId, { trigger: false });
        }
        return newMap;
      });
    }, 1500);
  };

  const renderRipples = () => {
    return Array.from(ripples.entries()).map(([messageId, data]) => (
      <MessageRipple
        key={messageId}
        messageId={messageId}
        trigger={data.trigger}
      />
    ));
  };

  return { triggerRipple, renderRipples };
};
