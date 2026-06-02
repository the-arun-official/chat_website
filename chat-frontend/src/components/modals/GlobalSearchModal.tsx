import { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, MessageSquare, X } from 'lucide-react';
import { useAppDispatch } from '../../store/store';
import { addChat, setActiveChat } from '../../features/chat/chatSlice';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import './Modals.css';

interface UserSearchResult {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  status: string;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal = ({ isOpen, onClose }: GlobalSearchModalProps) => {
  const dispatch = useAppDispatch();
  const { showAlert } = useAlert();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const searchUsers = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
        setResults(res.data);
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleAddFriend = async (userId: string) => {
    try {
      await api.post('/contacts', { contactId: userId });
      showAlert('Added as friend!', 'success');
    } catch (err: any) {
      showAlert(err.response?.data?.error || 'Failed to add contact', 'error');
    }
  };

  const handleMessage = async (userId: string) => {
    try {
      const res = await api.post('/chats/private', { userId });
      // The API returns the chat object. Add it to our Redux store.
      // We check if it exists in store by trying to add it (or our reducer can handle duplicates)
      dispatch(addChat(res.data));
      dispatch(setActiveChat(res.data.id));
      onClose();
    } catch (err: any) {
      showAlert(err.response?.data?.error || 'Failed to create chat', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="search-modal-container" onClick={e => e.stopPropagation()}>
        <div className="search-modal-header">
          <Search size={16} className="search-icon" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search for users..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-modal-input"
          />
          <button className="search-modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="search-modal-results">
          {isSearching && <div className="search-status">Searching...</div>}
          {!isSearching && query.length >= 2 && results.length === 0 && (
            <div className="search-status">No users found.</div>
          )}
          {results.map((user) => (
            <div key={user.id} className="search-result-item">
              <div className="search-result-avatar">
                {user.avatarUrl ? <img src={user.avatarUrl} alt={user.username} /> : user.username.substring(0, 2).toUpperCase()}
              </div>
              <div className="search-result-info">
                <span className="search-result-name">{user.fullName}</span>
                <span className="search-result-username">@{user.username}</span>
                <div className="search-result-actions">
                  <button 
                    className="action-btn icon-btn" 
                    onClick={() => handleAddFriend(user.id)} 
                    title="Add Friend"
                  >
                    <UserPlus size={14} />
                  </button>
                  <button className="action-btn icon-btn" onClick={() => handleMessage(user.id)} title="Send Message">
                    <MessageSquare size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
