import React, { useEffect, useState } from 'react';

interface Toast {
  id: string;
  message: string;
  duration?: number;
}

// Singleton toast queue
let toastQueue: Toast[] = [];
let toastSetState: React.Dispatch<React.SetStateAction<Toast[]>> | null = null;

export const AutoToast: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    toastSetState = setToasts;
  }, []);

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 99999,
      pointerEvents: 'none'
    }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            background: 'rgba(50, 50, 50, 0.95)',
            color: 'white',
            padding: '10px 16px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '500',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            marginBottom: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            textAlign: 'center',
            maxWidth: '280px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            animation: 'fadeInOut 1s ease-in-out'
          }}
        >
          {toast.message}
        </div>
      ))}
      
      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(10px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
};

export const useAutoToast = () => {
  const showToast = (message: string, duration = 1000) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const toast: Toast = { id, message, duration };

    if (toastSetState) {
      toastQueue.push(toast);
      toastSetState([...toastQueue]);

      // Auto-remove after duration
      setTimeout(() => {
        toastQueue = toastQueue.filter(t => t.id !== id);
        if (toastSetState) {
          toastSetState([...toastQueue]);
        }
      }, duration);
    }
  };

  return { showToast };
};
