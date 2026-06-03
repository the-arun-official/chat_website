import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface EnergyTransferProps {
  messageId?: string;
  trigger: boolean;
  fromX?: number;
  fromY?: number;
  toX?: number;
  toY?: number;
}

export const EnergyTransfer: React.FC<EnergyTransferProps> = ({
  messageId,
  trigger,
  fromX = window.innerWidth * 0.1,
  fromY = window.innerHeight * 0.5,
  toX = window.innerWidth * 0.9,
  toY = window.innerHeight * 0.5
}) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!trigger) return;

    setShow(true);
    const timer = setTimeout(() => setShow(false), 800);
    return () => clearTimeout(timer);
  }, [trigger]);

  if (!show) return null;

  return (
    <>
      {/* Main energy pulse traveling */}
      <motion.div
        initial={{
          x: fromX,
          y: fromY,
          scale: 1,
          opacity: 1
        }}
        animate={{
          x: toX,
          y: toY,
          scale: 0.3,
          opacity: 0
        }}
        transition={{
          duration: 0.8,
          ease: 'easeInOut'
        }}
        style={{
          position: 'fixed',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 215, 0, 1), rgba(255, 140, 0, 0.8))',
          boxShadow: '0 0 20px rgba(255, 215, 0, 0.9), 0 0 40px rgba(255, 140, 0, 0.6)',
          pointerEvents: 'none',
          zIndex: 5000
        }}
      />

      {/* Energy trail - multiple particles */}
      {[0, 1, 2, 3, 4].map((idx) => (
        <motion.div
          key={`trail-${idx}`}
          initial={{
            x: fromX,
            y: fromY,
            scale: 1,
            opacity: 1
          }}
          animate={{
            x: toX,
            y: toY,
            scale: 0,
            opacity: 0
          }}
          transition={{
            duration: 0.8,
            delay: -idx * 0.1,
            ease: 'easeInOut'
          }}
          style={{
            position: 'fixed',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: 'rgba(255, 215, 0, 0.7)',
            boxShadow: '0 0 15px rgba(255, 215, 0, 0.7)',
            pointerEvents: 'none',
            zIndex: 4999 - idx
          }}
        />
      ))}

      {/* Glow rings at both ends */}
      {/* From Ring */}
      <motion.div
        initial={{
          x: fromX - 15,
          y: fromY - 15,
          scale: 1,
          opacity: 0.8
        }}
        animate={{
          scale: 1.8,
          opacity: 0
        }}
        transition={{
          duration: 0.8,
          ease: 'easeOut'
        }}
        style={{
          position: 'fixed',
          width: '30px',
          height: '30px',
          borderRadius: '50%',
          border: '2px solid rgba(255, 215, 0, 0.8)',
          boxShadow: '0 0 20px rgba(255, 215, 0, 0.8)',
          pointerEvents: 'none',
          zIndex: 4998
        }}
      />

      {/* To Ring */}
      <motion.div
        initial={{
          x: toX - 15,
          y: toY - 15,
          scale: 0.5,
          opacity: 0
        }}
        animate={{
          scale: 1.5,
          opacity: 0.8
        }}
        transition={{
          duration: 0.8,
          ease: 'easeIn',
          times: [0, 0.5, 1]
        }}
        style={{
          position: 'fixed',
          width: '30px',
          height: '30px',
          borderRadius: '50%',
          border: '2px solid rgba(255, 215, 0, 0.8)',
          boxShadow: '0 0 20px rgba(255, 215, 0, 0.8), inset 0 0 15px rgba(255, 215, 0, 0.5)',
          pointerEvents: 'none',
          zIndex: 4997
        }}
      />
    </>
  );
};

export const useEnergyTransfer = () => {
  const [transfers, setTransfers] = useState<Map<string, EnergyTransferProps & { trigger: boolean }>>(
    new Map()
  );

  const triggerTransfer = (
    messageId: string,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ) => {
    setTransfers((prev) => {
      const newMap = new Map(prev);
      newMap.set(messageId, { messageId, trigger: true, fromX, fromY, toX, toY });
      return newMap;
    });

    setTimeout(() => {
      setTransfers((prev) => {
        const newMap = new Map(prev);
        newMap.delete(messageId);
        return newMap;
      });
    }, 800);
  };

  const renderTransfers = () => {
    return Array.from(transfers.entries()).map(([messageId, data]) => (
      <EnergyTransfer key={messageId} {...data} />
    ));
  };

  return { triggerTransfer, renderTransfers };
};
