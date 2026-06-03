import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MiniaturePresence, useMiniaturePresence } from './MiniaturePresence';
import { X } from 'lucide-react';

interface ChatParticipant {
  userId: string;
  username: string;
  avatarColor?: string;
  isTyping?: boolean;
  isRecording?: boolean;
  isSending?: boolean;
  isOnline?: boolean;
}

interface MiniatureChatPanelProps {
  participants: ChatParticipant[];
  currentUserId?: string;
  onClose?: () => void;
  position?: 'right' | 'left';
}

/**
 * Miniature Chat Panel
 * Displays 3D miniature avatars of chat participants
 * Shows their current activity (typing, recording, etc.)
 * Lightweight and performant with visibility culling
 */
export const MiniatureChatPanel: React.FC<MiniatureChatPanelProps> = ({
  participants,
  currentUserId,
  onClose,
  position = 'right'
}) => {
  const { miniatures, updateMiniature, removeMiniature } = useMiniaturePresence();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Update miniature states based on participant activity
  useEffect(() => {
    participants.forEach((participant) => {
      if (!participant.isOnline) {
        removeMiniature(participant.userId);
        return;
      }

      let state: 'idle' | 'typing' | 'reading' | 'recording' | 'sending' = 'idle';
      
      if (participant.isTyping) state = 'typing';
      else if (participant.isRecording) state = 'recording';
      else if (participant.isSending) state = 'sending';
      else state = 'idle';

      updateMiniature(participant.userId, state);
    });
  }, [participants, updateMiniature, removeMiniature]);

  const activeMiniatures = Array.from(miniatures.entries())
    .filter(([userId]) => participants.some((p) => p.userId === userId && p.isOnline))
    .map(([userId, data]) => {
      const participant = participants.find((p) => p.userId === userId);
      return { userId, participant, state: data.state };
    });

  const containerVariants = {
    initial: { x: position === 'right' ? 400 : -400, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: position === 'right' ? 400 : -400, opacity: 0 }
  };

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    [position]: 16,
    bottom: 20,
    width: 140,
    maxHeight: '70vh',
    background: 'linear-gradient(135deg, rgba(26, 35, 126, 0.95), rgba(79, 39, 131, 0.95))',
    backdropFilter: 'blur(10px)',
    borderRadius: 12,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000,
    pointerEvents: 'auto'
  };

  const headerStyle: React.CSSProperties = {
    padding: '12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer'
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  };

  const miniatureItemStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '8px',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(5px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    transition: 'all 0.2s ease'
  };

  const usernameStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 500,
    color: '#E0E0E0',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    width: '100%'
  };

  const stateIndicatorStyle: React.CSSProperties = {
    fontSize: '10px',
    color: '#FFD700',
    fontStyle: 'italic',
    textAlign: 'center'
  };

  if (activeMiniatures.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      {!isCollapsed && (
        <motion.div
          style={panelStyle}
          variants={containerVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Header */}
          <div
            style={headerStyle}
            onClick={() => setIsCollapsed(true)}
            title="Collapse miniature panel"
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#FFF' }}>
              Presence ({activeMiniatures.length})
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose?.();
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#FFF',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Close panel"
            >
              <X size={14} />
            </button>
          </div>

          {/* Content */}
          <div style={contentStyle}>
            {activeMiniatures.map(({ userId, participant, state }) => (
              <motion.div
                key={userId}
                style={miniatureItemStyle}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* 3D Miniature */}
                <div style={{ width: 100, height: 100 }}>
                  {participant && (
                    <MiniaturePresence
                      userId={userId}
                      username={participant.username}
                      avatarColor={participant.avatarColor || '#FFD700'}
                      state={state}
                      size={100}
                    />
                  )}
                </div>

                {/* Username */}
                <div style={usernameStyle}>{participant?.username || 'User'}</div>

                {/* State Indicator */}
                <div style={stateIndicatorStyle}>
                  {state === 'typing' && '✍️ Typing'}
                  {state === 'recording' && '🎙️ Recording'}
                  {state === 'sending' && '📤 Sending'}
                  {state === 'reading' && '👀 Reading'}
                  {state === 'idle' && '😎 Idle'}
                </div>

                {/* Activity Dot */}
                <motion.div
                  animate={{
                    opacity: [1, 0.4, 1],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity
                  }}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: state === 'typing' ? '#4FFF00' : '#FFD700',
                    marginTop: '4px'
                  }}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Collapsed State */}
      {isCollapsed && (
        <motion.button
          style={{
            position: 'fixed',
            [position]: 16,
            bottom: 20,
            width: 50,
            height: 50,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FFD700, #FFA500)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            color: '#000',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            zIndex: 1000,
            boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)'
          }}
          onClick={() => setIsCollapsed(false)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          animate={{
            boxShadow: [
              '0 4px 15px rgba(255, 215, 0, 0.4)',
              '0 6px 25px rgba(255, 215, 0, 0.6)',
              '0 4px 15px rgba(255, 215, 0, 0.4)'
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          🧍
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default MiniatureChatPanel;
