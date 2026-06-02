import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Wifi } from 'lucide-react';

export const EmptyChatState = () => {
  return (
    <div className="empty-state-wrapper" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-chat)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background animated gradients */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.05, 0.1, 0.05],
          rotate: [0, 90, 0]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        style={{
          position: 'absolute',
          width: '800px',
          height: '800px',
          background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)',
          filter: 'blur(80px)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 0
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Animated Devices Illustration */}
        <div style={{ position: 'relative', width: '280px', height: '180px', marginBottom: '40px' }}>
          {/* Laptop */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            style={{
              position: 'absolute',
              left: '20px',
              bottom: '0',
              width: '180px',
              height: '120px',
              backgroundColor: 'var(--surface)',
              borderRadius: '12px',
              border: '2px solid var(--border)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <div style={{ flex: 1, backgroundColor: 'var(--bg-secondary)', padding: '12px' }}>
              {/* Skeletons inside laptop */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '60%' }}
                transition={{ duration: 1, delay: 1, ease: "easeOut" }}
                style={{ height: '8px', backgroundColor: 'var(--accent)', borderRadius: '4px', marginBottom: '10px' }}
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '40%' }}
                transition={{ duration: 1, delay: 1.2, ease: "easeOut" }}
                style={{ height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', marginBottom: '10px' }}
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '80%' }}
                transition={{ duration: 1, delay: 1.4, ease: "easeOut" }}
                style={{ height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px' }}
              />
            </div>
            <div style={{ height: '14px', backgroundColor: 'var(--border)' }}></div>
          </motion.div>

          {/* Connection Waves */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
            style={{
              position: 'absolute',
              right: '90px',
              top: '60px',
              color: 'var(--accent)'
            }}
          >
            <Wifi size={24} />
          </motion.div>

          {/* Phone */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
            style={{
              position: 'absolute',
              right: '20px',
              bottom: '-10px',
              width: '64px',
              height: '130px',
              backgroundColor: 'var(--surface)',
              borderRadius: '16px',
              border: '3px solid var(--border)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 2
            }}
          >
            <div style={{ width: '20px', height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px', margin: '0 auto 8px' }}></div>
            <div style={{ flex: 1, backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', padding: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 1.5 }}
                style={{ width: '16px', height: '16px', backgroundColor: 'var(--accent)', borderRadius: '8px', borderBottomRightRadius: '2px', alignSelf: 'flex-end', marginBottom: '6px' }}
              />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 1.8 }}
                style={{ width: '16px', height: '16px', backgroundColor: 'var(--border)', borderRadius: '8px', borderBottomLeftRadius: '2px', alignSelf: 'flex-start' }}
              />
            </div>
          </motion.div>

          {/* Floating Bubble 1 */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: 'absolute', top: '10px', left: '0px', width: '32px', height: '32px', backgroundColor: 'var(--accent)', borderRadius: '50%', borderBottomLeftRadius: '4px', opacity: 0.8, boxShadow: '0 8px 16px rgba(109, 40, 217, 0.2)' }}
          />
          {/* Floating Bubble 2 */}
          <motion.div
            animate={{ y: [0, 15, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            style={{ position: 'absolute', top: '-20px', right: '40px', width: '24px', height: '24px', backgroundColor: '#10B981', borderRadius: '50%', borderBottomRightRadius: '4px', opacity: 0.6, boxShadow: '0 8px 16px rgba(16, 185, 129, 0.2)' }}
          />
        </div>

        {/* Text Content */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          style={{ textAlign: 'center' }}
        >
          <h2 style={{ fontFamily: 'var(--font-ios)', fontSize: '32px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '16px', letterSpacing: '-0.5px' }}>
            Aura Messenger
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', maxWidth: '460px', textAlign: 'center', lineHeight: '1.6', fontWeight: 300 }}>
            Send and receive messages without keeping your phone online.<br />
            Use Aura Messenger on up to 4 linked devices and 1 phone at the same time.
          </p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'absolute', bottom: '40px', color: 'var(--text-tertiary)', fontSize: '12px' }}
      >
        <Lock size={12} /> End-to-end encrypted
      </motion.div>
    </div>
  );
};
