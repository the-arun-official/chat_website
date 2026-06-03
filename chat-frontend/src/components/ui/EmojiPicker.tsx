import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😌', '😔', '😑', '😐', '😶', '😏', '😒', '🙁', '😲', '😞', '😖', '😢', '😭', '😤', '😠', '😡', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖'],
  'Hand': ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🤜', '🤛', '🫱', '🫲', '🫳', '🫴'],
  'Love': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💌', '💋', '💯', '💢', '💥', '💫', '💦', '💨'],
  'Gestures': ['👐', '🙌', '👏', '🤲', '🤝', '👂', '👃', '🧠', '🦷', '🦴', '🌳', '🌲', '🌴', '🌱', '🌿', '☘️', '🍀', '🎍', '🎎', '🎏', '🎐', '🎑', '🀄', '💐', '🌾', '💮', '🌷', '🌹', '🥀', '🌺', '🌻', '🌞', '🌝', '🌛', '🌜', '⭐', '🌟', '✨'],
  'Popular': ['👍', '❤️', '😂', '😘', '🔥', '💯', '😍', '🎉', '😎', '😭', '😂', '👏', '🙌', '🔔', '⚡', '🎊'],
};

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, onClose, position = { top: 0, left: 0 } }) => {
  const [activeCategory, setActiveCategory] = useState('Popular');
  const pickerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Adjust position to keep picker on-screen
  useEffect(() => {
    if (pickerRef.current) {
      const rect = pickerRef.current.getBoundingClientRect();
      const pickerWidth = 320;
      const pickerHeight = 420;
      const padding = 10;

      let adjustedTop = position.top;
      let adjustedLeft = position.left;

      // Check right boundary
      if (adjustedLeft + pickerWidth > window.innerWidth - padding) {
        adjustedLeft = window.innerWidth - pickerWidth - padding;
      }

      // Check bottom boundary
      if (adjustedTop + pickerHeight > window.innerHeight - padding) {
        adjustedTop = position.top - pickerHeight - 8; // Show above the button
      }

      // Check left boundary
      if (adjustedLeft < padding) {
        adjustedLeft = padding;
      }

      // Check top boundary
      if (adjustedTop < padding) {
        adjustedTop = padding;
      }

      setAdjustedPosition({ top: adjustedTop, left: adjustedLeft });
    }
  }, [position]);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const getDisplayEmojis = () => {
    if (searchQuery.trim() === '') {
      return EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES] || [];
    }
    
    // Search across all categories
    let results: string[] = [];
    for (const category of Object.values(EMOJI_CATEGORIES)) {
      results = results.concat(category);
    }
    return results;
  };

  const displayEmojis = getDisplayEmojis();

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    onClose();
  };

  return (
    <div
      ref={pickerRef}
      style={{
        position: 'fixed',
        top: `${adjustedPosition.top}px`,
        left: `${adjustedPosition.left}px`,
        zIndex: 10000,
      }}
      className="emoji-picker"
    >
      <div style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        width: '320px',
        maxHeight: '420px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg-secondary)',
        }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
            Pick an Emoji
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-secondary)',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Box */}
        <div style={{ padding: '10px', borderBottom: '1px solid var(--border)' }}>
          <input
            type="text"
            placeholder="Search emojis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              background: 'var(--bg-primary)',
              color: 'var(--color-text)',
              fontSize: '12px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Emoji Grid */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gap: '4px',
        }}>
          {displayEmojis.map((emoji, idx) => (
            <button
              key={`${emoji}-${idx}`}
              onClick={() => handleEmojiClick(emoji)}
              title={emoji}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                transition: 'background-color 0.15s, transform 0.1s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                e.currentTarget.style.transform = 'scale(1.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Category Tabs */}
        <div style={{
          display: 'flex',
          borderTop: '1px solid var(--border)',
          backgroundColor: 'var(--bg-secondary)',
          overflowX: 'auto',
          padding: '0',
        }}>
          {Object.keys(EMOJI_CATEGORIES).map((category) => (
            <button
              key={category}
              onClick={() => {
                setActiveCategory(category);
                setSearchQuery('');
              }}
              style={{
                flex: '1',
                minWidth: '50px',
                padding: '8px 4px',
                background: activeCategory === category ? 'var(--accent)' : 'transparent',
                border: 'none',
                color: activeCategory === category ? 'white' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: activeCategory === category ? 600 : 400,
                transition: 'all 0.2s',
                borderBottom: activeCategory === category ? '2px solid var(--accent)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (activeCategory !== category) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeCategory !== category) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {category.charAt(0)}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        .emoji-picker {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }
        
        .emoji-picker div:has(> input)::-webkit-scrollbar {
          width: 6px;
        }
        
        .emoji-picker div:has(> button)::-webkit-scrollbar {
          width: 6px;
        }
        
        .emoji-picker ::-webkit-scrollbar {
          width: 6px;
        }
        
        .emoji-picker ::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .emoji-picker ::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 3px;
        }
        
        .emoji-picker ::-webkit-scrollbar-thumb:hover {
          background: var(--color-text-secondary);
        }
      `}</style>
    </div>
  );
};
