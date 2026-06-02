import { useState, useEffect } from 'react';
import { Search, X, Users, Check } from 'lucide-react';
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
}

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateGroupModal = ({ isOpen, onClose }: CreateGroupModalProps) => {
  const dispatch = useAppDispatch();
  const { showAlert } = useAlert();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setQuery('');
      setSearchResults([]);
      setSelectedUsers([]);
    }
  }, [isOpen]);

  // Search users
  useEffect(() => {
    const searchUsers = async () => {
      if (query.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
        // Filter out already selected users
        const filtered = res.data.filter((u: UserSearchResult) => !selectedUsers.find(su => su.id === u.id));
        setSearchResults(filtered);
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [query, selectedUsers]);

  const toggleSelectUser = (user: UserSearchResult) => {
    setSelectedUsers(prev => [...prev, user]);
    setQuery('');
    setSearchResults([]);
  };

  const removeSelectedUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleCreateGroup = async () => {
    if (!name.trim()) return showAlert('Group name is required', 'error');
    if (selectedUsers.length === 0) return showAlert('Please select at least one member', 'error');

    setIsCreating(true);
    try {
      const res = await api.post('/chats/group', {
        name,
        description,
        userIds: selectedUsers.map(u => u.id)
      });

      dispatch(addChat(res.data));
      dispatch(setActiveChat(res.data.id));
      onClose();
    } catch (err: any) {
      showAlert(err.response?.data?.error || 'Failed to create group', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="search-modal-container group-modal" onClick={e => e.stopPropagation()}>
        <div className="search-modal-header">
          <Users size={16} className="search-icon" />
          <span style={{ color: 'var(--color-text-base)', fontSize: '15px', fontWeight: 500, flex: 1 }}>
            Create New Group
          </span>
          <button className="search-modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="group-form">
          <div className="form-group">
            <label>Group Name *</label>
            <input
              type="text"
              placeholder="e.g. Development Team"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label>Description (Optional)</label>
            <input
              type="text"
              placeholder="What is this group about?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={150}
            />
          </div>

          <div className="form-group">
            <label>Add Members</label>

            {/* Selected Users Pills */}
            {selectedUsers.length > 0 && (
              <div className="selected-users-container">
                {selectedUsers.map(u => (
                  <div key={u.id} className="selected-user-pill">
                    <span>{u.fullName || u.username}</span>
                    <button onClick={() => removeSelectedUser(u.id)}><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}

            <div className="member-search-box">
              <Search size={14} className="search-icon-small" />
              <input
                type="text"
                placeholder="Search users to add..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>

            {/* Search Results */}
            {query.length >= 2 && (
              <div className="member-search-results">
                {isSearching ? (
                  <div className="search-status">Searching...</div>
                ) : searchResults.length === 0 ? (
                  <div className="search-status">No users found</div>
                ) : (
                  searchResults.map(user => (
                    <div key={user.id} className="search-result-item" onClick={() => toggleSelectUser(user)}>
                      <div className="search-result-avatar" style={{ width: 28, height: 28, fontSize: 12 }}>
                        {user.avatarUrl ? <img src={user.avatarUrl} alt={user.username} /> : user.username.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="search-result-info">
                        <span className="search-result-name">{user.fullName}</span>
                        <span className="search-result-username">@{user.username}</span>
                      </div>
                      <div className="action-btn icon-btn"><Check size={14} /></div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleCreateGroup}
            disabled={!name.trim() || selectedUsers.length === 0 || isCreating} style={{ marginTop: "23px" }}
          >
            {isCreating ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
};
