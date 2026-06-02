import React, { useRef, useState } from 'react';
import { X, Upload, LogOut, User as UserIcon } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { logoutUser } from '../../features/auth/authSlice';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import './Modals.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const dispatch = useAppDispatch();
  const { showAlert, showConfirm } = useAlert();
  const { user } = useAppSelector(state => state.auth);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'translation'>('profile');

  React.useEffect(() => {
    if (user) setFullName(user.fullName || '');
  }, [user]);

  if (!isOpen || !user) return null;

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    setIsUploading(true);
    try {
      // Endpoint is /users/me/avatar
      const res = await api.post('/users/me/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      // The backend will return the updated user object or URL.
      // A clean way to reflect the change is simply to reload the page or update the auth store.
      window.location.reload(); 
    } catch (err: any) {
      showAlert(err.response?.data?.error || 'Failed to upload avatar', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = async () => {
    const confirmed = await showConfirm("Are you sure you want to log out of Aura Messenger?", "Logout");
    if (confirmed) {
      dispatch(logoutUser());
      onClose();
    }
  };

  const getMediaUrl = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `http://localhost:3000${url.startsWith('/') ? '' : '/'}${url}`;
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="settings-modal-container" onClick={e => e.stopPropagation()}>
        <div className="search-modal-header" style={{ paddingBottom: 0, borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: '24px' }}>
            <button 
              onClick={() => setActiveTab('profile')}
              style={{ background: 'none', border: 'none', padding: '12px 0', cursor: 'pointer', borderBottom: activeTab === 'profile' ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === 'profile' ? 'var(--accent)' : 'var(--color-text-dim)', fontWeight: 600, fontSize: '14px', marginBottom: '-1px' }}
            >
              My Profile
            </button>
            <button 
              onClick={() => setActiveTab('translation')}
              style={{ background: 'none', border: 'none', padding: '12px 0', cursor: 'pointer', borderBottom: activeTab === 'translation' ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === 'translation' ? 'var(--accent)' : 'var(--color-text-dim)', fontWeight: 600, fontSize: '14px', marginBottom: '-1px' }}
            >
              Translation Settings
            </button>
          </div>
          <button className="search-modal-close" onClick={onClose} style={{ alignSelf: 'flex-start', marginTop: '8px' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '24px', overflowY: 'auto', maxHeight: '70vh' }}>
          {activeTab === 'profile' ? (
            <>
          
          <div className="avatar-upload-container" onClick={handleAvatarClick} style={{ cursor: 'pointer', position: 'relative' }}>
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              position: 'relative'
            }}>
              {user.avatarUrl ? (
                <img src={getMediaUrl(user.avatarUrl)!} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '36px', color: '#fff' }}>{user.username.substring(0, 2).toUpperCase()}</span>
              )}

              <div className="avatar-overlay" style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0,
                transition: 'opacity 0.2s',
                color: '#fff'
              }}>
                <Upload size={24} />
              </div>
            </div>
            {isUploading && <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '12px', color: 'var(--accent)' }}>Uploading...</div>}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
          </div>

          <div style={{ width: '100%' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-dim)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                style={{ flex: 1, backgroundColor: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', color: 'var(--color-text)', border: '1px solid var(--border)', outline: 'none' }}
              />
              {fullName !== user.fullName && (
                <button 
                  onClick={async () => {
                    if (!fullName.trim() || isSaving) return;
                    setIsSaving(true);
                    try {
                      await api.put('/users/me', { fullName });
                      window.location.reload();
                    } catch (err) {
                      console.error(err);
                      showAlert('Failed to update profile', 'error');
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  style={{ padding: '0 16px', borderRadius: '8px', background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  disabled={isSaving}
                >
                  {isSaving ? '...' : 'Save'}
                </button>
              )}
            </div>
          </div>

          <div style={{ width: '100%' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-dim)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Username (Read Only)</label>
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', color: 'var(--color-text)', opacity: 0.7 }}>
              @{user.username}
            </div>
          </div>

          <div style={{ width: '100%' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-dim)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</label>
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', color: 'var(--color-text)' }}>
              {user.email}
            </div>
          </div>

          <button 
            onClick={handleLogout}
            style={{ 
              marginTop: 'auto', 
              width: '100%', 
              padding: '12px', 
              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
              color: '#ef4444', 
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
          >
            <LogOut size={16} /> Logout
          </button>
          </>
          ) : (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ width: '100%' }}>
                <label style={{ display: 'block', fontSize: '14px', color: 'var(--color-text)', marginBottom: '8px', fontWeight: 600 }}>Preferred Translation Language</label>
                <p style={{ fontSize: '12px', color: 'var(--color-text-dim)', margin: '0 0 12px 0' }}>Select preferred language to auto translate the message whether there is new languages is present in other languages.</p>
                <select
                  value={user.preferredLanguage || 'en'}
                  onChange={async (e) => {
                    try {
                      await api.put('/users/me', { preferredLanguage: e.target.value });
                      window.location.reload();
                    } catch (err) {}
                  }}
                  style={{ width: '100%', backgroundColor: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', color: 'var(--color-text)', border: '1px solid var(--border)', outline: 'none' }}
                >
                  <option value="en">English (en)</option>
                  <option value="es">Spanish (es)</option>
                  <option value="fr">French (fr)</option>
                  <option value="de">German (de)</option>
                  <option value="hi">Hindi (hi)</option>
                  <option value="ta">Tamil (ta)</option>
                  <option value="zh">Chinese (zh)</option>
                  <option value="ja">Japanese (ja)</option>
                  <option value="ru">Russian (ru)</option>
                </select>
              </div>

              <div style={{ width: '100%' }}>
                <label style={{ display: 'block', fontSize: '14px', color: 'var(--color-text)', marginBottom: '8px', fontWeight: 600 }}>Native / Known Languages</label>
                <p style={{ fontSize: '12px', color: 'var(--color-text-dim)', margin: '0 0 12px 0' }}>If they select English and Tamil as native language, other than that any languages detected it should automatically translate.</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {[
                    { code: 'en', label: 'English' },
                    { code: 'es', label: 'Spanish' },
                    { code: 'fr', label: 'French' },
                    { code: 'de', label: 'German' },
                    { code: 'hi', label: 'Hindi' },
                    { code: 'ta', label: 'Tamil' },
                    { code: 'zh', label: 'Chinese' },
                    { code: 'ja', label: 'Japanese' },
                    { code: 'ru', label: 'Russian' }
                  ].map(lang => (
                    <label key={lang.code} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: '16px', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '13px', color: 'var(--color-text)' }}>
                      <input 
                        type="checkbox"
                        defaultChecked={(user.knownLanguages || ['en']).includes(lang.code)}
                        onChange={async (e) => {
                          const currentLangs = user.knownLanguages || ['en'];
                          let newLangs;
                          if (e.target.checked) {
                            newLangs = Array.from(new Set([...currentLangs, lang.code]));
                          } else {
                            newLangs = currentLangs.filter(c => c !== lang.code);
                          }
                          try {
                            await api.put('/users/me', { knownLanguages: newLangs });
                          } catch (err) {}
                        }}
                      />
                      {lang.label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div>
                  <label style={{ fontSize: '14px', color: 'var(--color-text)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Auto-Translate Incoming Messages</label>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-dim)' }}>Automatically detect and translate foreign messages.</span>
                </div>
                <input 
                  type="checkbox" 
                  defaultChecked={user.autoTranslate || false}
                  onChange={async (e) => {
                    try {
                      await api.put('/users/me', { autoTranslate: e.target.checked });
                    } catch (err) {}
                  }}
                  style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--accent)' }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
