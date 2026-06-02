import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { X, AlertCircle, Info, CheckCircle } from 'lucide-react';
import '../components/modals/Modals.css';

interface AlertContextType {
  showAlert: (message: string, type?: 'error' | 'success' | 'info') => void;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'error' | 'success' | 'info' | 'confirm'>('error');
  const [confirmResolver, setConfirmResolver] = useState<((value: boolean) => void) | null>(null);

  const showAlert = (msg: string, t: 'error' | 'success' | 'info' = 'error') => {
    setMessage(msg);
    setType(t);
    setIsOpen(true);
  };

  const showConfirm = (msg: string, t: string = 'Confirm Action') => {
    setMessage(msg);
    setTitle(t);
    setType('confirm');
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setConfirmResolver(() => resolve);
    });
  };

  const handleClose = (result: boolean = false) => {
    setIsOpen(false);
    if (type === 'confirm' && confirmResolver) {
      confirmResolver(result);
      setConfirmResolver(null);
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {isOpen && (
        <div className="modal-backdrop" onClick={() => handleClose(false)} style={{ zIndex: 9999 }}>
          <div className="search-modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '350px', padding: 0 }}>
            <div className="search-modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {type === 'error' && <AlertCircle size={18} color="var(--danger)" />}
                {type === 'success' && <CheckCircle size={18} color="var(--success)" />}
                {type === 'info' && <Info size={18} color="var(--accent)" />}
                {type === 'confirm' && <AlertCircle size={18} color="var(--accent)" />}
                <h3 style={{ margin: 0, color: 'var(--color-text)', fontSize: '16px' }}>
                  {type === 'confirm' ? title : type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Notice'}
                </h3>
              </div>
              <button className="search-modal-close" onClick={() => handleClose(false)}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '20px', fontSize: '14px', color: 'var(--color-text)', lineHeight: 1.5, wordBreak: 'break-word' }}>
              {message}
            </div>
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              {type === 'confirm' && (
                <button className="btn-secondary" onClick={() => handleClose(false)}>
                  Cancel
                </button>
              )}
              <button className="btn-primary" style={type === 'confirm' ? { backgroundColor: 'var(--danger)' } : {}} onClick={() => handleClose(true)}>
                {type === 'confirm' ? 'Confirm' : 'Okay'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) throw new Error('useAlert must be used within AlertProvider');
  return context;
};
