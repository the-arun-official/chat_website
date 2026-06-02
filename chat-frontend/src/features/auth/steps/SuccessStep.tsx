import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  onNext: () => void;
  message?: string;
  subtitle?: string;
  buttonText?: string;
  autoRedirectMs?: number;
}

const variants = {
  hidden: { opacity: 0, scale: 0.95 },
  show:   { opacity: 1, scale: 1, transition: { duration: 0.4, ease: 'easeOut' as const } },
  exit:   { opacity: 0, scale: 1.05, transition: { duration: 0.25 } },
};

const tickVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  show: { 
    pathLength: 1, 
    opacity: 1, 
    transition: { duration: 0.6, ease: "easeOut" as const, delay: 0.2 } 
  }
};

const SuccessStep: React.FC<Props> = ({ 
  onNext, 
  message = "Successfully Verified!", 
  subtitle = "Your account is now fully set up and verified. You are ready to enter your workspace.",
  buttonText = "Continue to Dashboard",
  autoRedirectMs
}) => {
  React.useEffect(() => {
    if (autoRedirectMs) {
      const timer = setTimeout(() => {
        onNext();
      }, autoRedirectMs);
      return () => clearTimeout(timer);
    }
  }, [autoRedirectMs, onNext]);

  return (
    <motion.div 
      variants={variants} 
      initial="hidden" 
      animate="show" 
      exit="exit"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
    >
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'rgba(52, 199, 89, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px'
      }}>
        <svg viewBox="0 0 24 24" fill="none" style={{ width: '48px', height: '48px', color: '#34c759' }}>
          <motion.path 
            d="M5 13l4 4L19 7" 
            stroke="currentColor" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            variants={tickVariants}
            initial="hidden"
            animate="show"
          />
        </svg>
      </div>

      <h2 className="step-title">{message}</h2>
      <p className="step-subtitle">
        {subtitle}
      </p>

      {autoRedirectMs ? (
        <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div className="spinner" style={{ width: 24, height: 24, borderWidth: 3, borderColor: 'rgba(255,255,255,0.1)', borderTopColor: 'var(--accent)' }} />
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Redirecting to dashboard...</span>
        </div>
      ) : (
        <button 
          type="button" 
          className="btn-primary" 
          onClick={onNext}
          style={{ marginTop: '24px' }}
        >
          {buttonText}
        </button>
      )}
    </motion.div>
  );
};

export default SuccessStep;
