import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface Props {
  onNext: (data: { fullName: string; avatarFile: File | null }) => void;
  isSubmitting?: boolean;
}

import imageCompression from 'browser-image-compression';

const variants = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
  exit:   { opacity: 0, y: -10, transition: { duration: 0.25 } },
};

const ProfileSetupStep: React.FC<Props> = ({ onNext, isSubmitting = false }) => {
  const [fullName, setFullName]     = useState('');
  const [preview, setPreview]       = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [error, setError]           = useState('');
  const fileRef                     = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    try {
      // Compress the image before uploading to save bandwidth and storage
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 512,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(f, options);
      
      setAvatarFile(compressedFile);
      const reader = new FileReader();
      reader.onload = ev => setPreview(ev.target?.result as string);
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error('Error compressing image:', error);
      setError('Error processing image. Please try another one.');
    }
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim().length < 2) {
      setError('Please enter a valid full name');
      return;
    }
    setError('');
    onNext({ fullName: fullName.trim(), avatarFile });
  };

  return (
    <motion.form 
      className="step-panel" 
      onSubmit={handleNext}
      variants={variants} 
      initial="hidden" 
      animate="show" 
      exit="exit"
    >
      <div style={{ marginBottom: 32 }}>
        <h3 className="step-title">Complete your profile</h3>
        <p className="step-subtitle">Add a photo and your full name to help others recognize you.</p>
      </div>

      {/* Avatar Upload */}
      <div className="avatar-upload-area">
        <div
          className="avatar-ring"
          onClick={() => fileRef.current?.click()}
        >
          {preview ? (
            <img src={preview} alt="Avatar preview" />
          ) : (
            <div className="avatar-placeholder">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              <span>Upload</span>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFile}
          />
        </div>
        <div>
          <button
            type="button"
            className="btn-link"
            onClick={() => fileRef.current?.click()}
            style={{ fontWeight: 400, color: '#000', marginBottom: 4, display: 'block' }}
          >
            {preview ? 'Change photo' : 'Upload profile photo'}
          </button>
          <span style={{ fontSize: 10, color: '#999' }}>Recommended size: 256x256px</span>
        </div>
      </div>

      {/* Full name */}
      <div className="input-group">
        <label className="step-label">Full name</label>
        <div className="input-wrapper">
          <input
            className={`split-input${error ? ' error' : ''}`}
            type="text"
            placeholder="John Doe"
            autoComplete="name"
            value={fullName}
            onChange={e => { setFullName(e.target.value); setError(''); }}
          />
        </div>
        {error && <span className="field-error">{error}</span>}
      </div>

      <button type="submit" className="btn-primary" disabled={isSubmitting}>
        {isSubmitting ? (
          <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', borderTopColor: '#fff' }} />
        ) : (
          'Complete setup'
        )}
      </button>

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <button type="button" className="btn-link" onClick={() => onNext({ fullName: 'Anonymous User', avatarFile: null })} style={{ fontSize: 11 }}>
          Skip for now
        </button>
      </div>
    </motion.form>
  );
};

export default ProfileSetupStep;
