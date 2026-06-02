import React, { useState, useEffect } from 'react';
import { X, UserPlus, Settings, Shield, ShieldOff, Trash2, LogOut, Check, Search } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { fetchChats } from '../../features/chat/chatSlice';
import api, { getMediaUrl } from '../../services/api';
import type { Chat } from '../../features/chat/chatSlice';
import { useAlert } from '../../contexts/AlertContext';
import './Modals.css';

interface GroupDetailsModalProps {
  chat: Chat;
  onClose: () => void;
}

interface UserSearchResult {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
}

export const GroupDetailsModal: React.FC<GroupDetailsModalProps> = ({ chat, onClose }) => {
  const dispatch = useAppDispatch();
  const { showAlert } = useAlert();
  const { user } = useAppSelector(state => state.auth);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(chat.groupDetails?.name || '');
  const [description, setDescription] = useState(chat.groupDetails?.description || '');
  
  // Member Adding State
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const myParticipant = chat.participants.find(p => p.userId === user?.id);
  const isAdmin = myParticipant?.role === 'ADMIN';

  // Search users for adding to group
  useEffect(() => {
    const searchUsers = async () => {
      if (query.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
        // Filter out users already in the group
        const existingIds = chat.participants.map(p => p.userId);
        const filtered = res.data.filter((u: UserSearchResult) => !existingIds.includes(u.id));
        setSearchResults(filtered);
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [query, chat.participants]);

  const handleAddMember = async (newUserId: string) => {
    try {
      await api.post(`/chats/${chat.id}/participants`, { userIds: [newUserId] });
      setQuery('');
      setSearchResults([]);
      setIsAddingMember(false);
      dispatch(fetchChats() as any);
    } catch (error: any) {
      showAlert(error.response?.data?.error || 'Failed to add member', 'error');
    }
  };

  const [confirmAction, setConfirmAction] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const confirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmAction({ isOpen: true, title, message, onConfirm });
  };

  const executeConfirm = async () => {
    await confirmAction.onConfirm();
    setConfirmAction({ ...confirmAction, isOpen: false });
  };

  const handleUpdateGroup = async () => {
    if (!name.trim()) return;
    try {
      await api.put(`/chats/${chat.id}/group`, { name, description });
      setIsEditing(false);
      dispatch(fetchChats() as any);
    } catch (error) {
      console.error(error);
    }
  };

  const handleRemoveMember = (userId: string, username: string) => {
    confirm("Remove Member", `Are you sure you want to remove ${username} from the group?`, async () => {
      try {
        await api.delete(`/chats/${chat.id}/participants/${userId}`);
        dispatch(fetchChats() as any);
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleLeaveGroup = () => {
    if (isAdmin) {
      showAlert("Admins cannot leave the group. Please promote another member to Admin and demote yourself first.", 'error');
      return;
    }
    confirm("Leave Group", "Are you sure you want to leave this group? You won't be able to send or receive messages anymore.", async () => {
      try {
        await api.delete(`/chats/${chat.id}/participants/${user?.id}`);
        dispatch(fetchChats() as any);
        onClose();
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleRoleChange = (userId: string, username: string, role: 'ADMIN' | 'MEMBER') => {
    if (role === 'ADMIN') {
      confirm("Promote to Admin", `Are you sure you want to make ${username} an Admin? They will be able to manage the group and its members.`, async () => {
        try {
          await api.put(`/chats/${chat.id}/participants/${userId}/role`, { role });
          dispatch(fetchChats() as any);
        } catch (error) {
          console.error(error);
        }
      });
    } else {
      confirm("Demote from Admin", `Are you sure you want to remove Admin privileges from ${username}?`, async () => {
        try {
          await api.put(`/chats/${chat.id}/participants/${userId}/role`, { role });
          dispatch(fetchChats() as any);
        } catch (error) {
          console.error(error);
        }
      });
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="search-modal-container group-modal" onClick={e => e.stopPropagation()} style={{ width: '450px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="search-modal-header">
          <span style={{ color: 'var(--color-text-base)', fontSize: '15px', fontWeight: 500, flex: 1 }}>
            Group Info
          </span>
          <button className="search-modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        
        <div style={{ padding: '24px', overflowY: 'auto' }}>
          {/* Header Info */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ width: '90px', height: '90px', borderRadius: '50%', backgroundColor: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              {chat.groupDetails?.avatarUrl ? (
                <img src={getMediaUrl(chat.groupDetails.avatarUrl)!} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '36px', color: '#fff' }}>{(chat.groupDetails?.name || 'G').substring(0, 2).toUpperCase()}</span>
              )}
            </div>
            
            {isEditing ? (
              <div className="group-form" style={{ width: '100%' }}>
                <div className="form-group">
                  <label>Group Name</label>
                  <input className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="Group Name" />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea className="input-field" value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" rows={3} style={{ resize: 'none' }} />
                </div>
                <div className="modal-footer" style={{ marginTop: '16px', padding: 0 }}>
                  <button className="btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                  <button className="btn-primary" onClick={handleUpdateGroup}>Save Details</button>
                </div>
              </div>
            ) : (
              <>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: 'var(--color-text)' }}>{chat.groupDetails?.name}</h2>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)', textAlign: 'center', fontSize: '14px', lineHeight: '1.5' }}>
                  {chat.groupDetails?.description || 'No description provided.'}
                </p>
                {isAdmin && (
                  <button className="btn-secondary" style={{ marginTop: '16px', padding: '8px 16px', fontSize: '13px' }} onClick={() => setIsEditing(true)}>
                    <Settings size={14} style={{ marginRight: '6px' }} /> Edit Details
                  </button>
                )}
              </>
            )}
          </div>

          <div className="divider" style={{ borderTop: '1px solid var(--border)', margin: '24px 0' }}></div>

          {/* Members List */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--color-text)' }}>Members ({chat.participants.filter(p => p.hasAccepted).length})</h4>
            {isAdmin && !isAddingMember && (
              <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setIsAddingMember(true)}>
                <UserPlus size={14} style={{ marginRight: '6px' }} /> Add Member
              </button>
            )}
          </div>

          {isAddingMember && (
            <div className="group-form" style={{ marginBottom: '20px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>Search Users</span>
                <button className="icon-btn" onClick={() => { setIsAddingMember(false); setQuery(''); }}><X size={14} /></button>
              </div>
              <div className="member-search-box">
                <Search size={14} className="search-icon-small" />
                <input
                  type="text"
                  placeholder="Type username..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--color-text)', outline: 'none', fontSize: '13px' }}
                />
              </div>

              {query.length >= 2 && (
                <div className="member-search-results" style={{ marginTop: '12px', maxHeight: '150px' }}>
                  {isSearching ? (
                    <div className="search-status">Searching...</div>
                  ) : searchResults.length === 0 ? (
                    <div className="search-status">No users found outside group</div>
                  ) : (
                    searchResults.map(u => (
                      <div key={u.id} className="search-result-item" style={{ padding: '8px' }}>
                        <div className="search-result-avatar" style={{ width: 28, height: 28, fontSize: 12 }}>
                          {u.avatarUrl ? <img src={getMediaUrl(u.avatarUrl)!} alt={u.username} /> : u.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="search-result-info">
                          <span className="search-result-name">{u.fullName || u.username}</span>
                          <span className="search-result-username">@{u.username}</span>
                        </div>
                        <button className="icon-btn" style={{ color: 'var(--accent)' }} onClick={() => handleAddMember(u.id)}>
                          <UserPlus size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {chat.participants.filter(p => p.hasAccepted).map(p => (
              <div key={p.userId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {p.user.avatarUrl ? (
                      <img src={getMediaUrl(p.user.avatarUrl)!} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ color: '#fff', fontSize: '16px' }}>{p.user.username.substring(0,2).toUpperCase()}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-text)' }}>
                      {p.user.username} {p.userId === user?.id && <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>(You)</span>}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: p.role === 'ADMIN' ? 'var(--accent)' : 'var(--color-text-tertiary)' }}>
                      {p.role}
                    </span>
                  </div>
                </div>
                
                {isAdmin && p.userId !== user?.id && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {p.role === 'ADMIN' ? (
                      <button className="icon-btn" title="Demote to Member" onClick={() => handleRoleChange(p.userId, p.user.username, 'MEMBER')}><ShieldOff size={18} /></button>
                    ) : (
                      <button className="icon-btn" title="Promote to Admin" onClick={() => handleRoleChange(p.userId, p.user.username, 'ADMIN')}><Shield size={18} /></button>
                    )}
                    <button className="icon-btn danger" title="Remove Member" onClick={() => handleRemoveMember(p.userId, p.user.username)}><Trash2 size={18} color="var(--danger)" /></button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="divider" style={{ borderTop: '1px solid var(--border)', margin: '24px 0' }}></div>
          
          <button className="btn-primary" style={{ width: '100%', backgroundColor: 'var(--danger)', color: '#fff', border: 'none', padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, opacity: isAdmin ? 0.5 : 1, cursor: isAdmin ? 'not-allowed' : 'pointer' }} onClick={handleLeaveGroup}>
            <LogOut size={16} style={{ marginRight: '8px' }} /> Leave Group
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmAction.isOpen && (
        <div className="modal-backdrop" onClick={(e) => e.stopPropagation()} style={{ zIndex: 1100, backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="search-modal-container confirm-modal" onClick={e => e.stopPropagation()} style={{ width: '360px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', color: 'var(--color-text)' }}>{confirmAction.title}</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              {confirmAction.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn-secondary" onClick={() => setConfirmAction({ ...confirmAction, isOpen: false })}>Cancel</button>
              <button className="btn-primary" style={{ backgroundColor: 'var(--accent)' }} onClick={executeConfirm}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
