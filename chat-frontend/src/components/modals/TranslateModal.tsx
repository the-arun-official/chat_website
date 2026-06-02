import React, { useState, useMemo } from 'react';
import { X, Search, Languages } from 'lucide-react';
import './Modals.css';

interface TranslateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLanguage: (langCode: string) => void;
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ta', name: 'Tamil' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ru', name: 'Russian' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'nl', name: 'Dutch' },
  { code: 'sv', name: 'Swedish' },
];

export const TranslateModal = ({ isOpen, onClose, onSelectLanguage }: TranslateModalProps) => {
  const [search, setSearch] = useState('');

  const filteredLanguages = useMemo(() => {
    return LANGUAGES.filter(l => l.name.toLowerCase().includes(search.toLowerCase()) || l.code.includes(search.toLowerCase()));
  }, [search]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="search-modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', padding: 0 }}>
        <div className="search-modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Languages size={18} color="var(--accent)" />
            <h3 style={{ margin: 0, color: 'var(--color-text)', fontSize: '16px' }}>Translate Message</h3>
          </div>
          <button className="search-modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '16px 20px' }}>
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <Search size={16} color="var(--color-text-dim)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search language..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              style={{ 
                width: '100%', 
                boxSizing: 'border-box',
                padding: '12px 16px 12px 40px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid transparent',
                borderRadius: '12px',
                color: 'var(--color-text)',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
              onFocus={e => {
                e.target.style.borderColor = 'var(--accent)';
                e.target.style.boxShadow = '0 0 0 3px var(--accent-soft)';
              }}
              onBlur={e => {
                e.target.style.borderColor = 'transparent';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {filteredLanguages.map(lang => (
              <button
                key={lang.code}
                onClick={() => {
                  onSelectLanguage(lang.code);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: 'var(--color-text)',
                  textAlign: 'left',
                  transition: 'background-color 0.2s, transform 0.1s'
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <span style={{ fontWeight: 500, fontSize: '14px' }}>{lang.name}</span>
                <span style={{ color: 'var(--color-text-dim)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{lang.code}</span>
              </button>
            ))}
            {filteredLanguages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-dim)' }}>
                No languages found matching "{search}"
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
