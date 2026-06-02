import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { useAppDispatch, useAppSelector } from '../store/store';
import { fetchChats, setActiveChat, fetchMessages, markChatAsRead, addMessage, updateMessage as updateMessageInStore, deleteMessage as deleteMessageInStore, updateChat, translateMessage, setAiModeStatus } from '../features/chat/chatSlice';
import { logoutUser } from '../features/auth/authSlice';
import type { Chat, Message } from '../features/chat/chatSlice';
import { useSocket } from '../hooks/useSocket';
import { GlobalSearchModal } from '../components/modals/GlobalSearchModal';
import { CreateGroupModal } from '../components/modals/CreateGroupModal';
import { GroupDetailsModal } from '../components/modals/GroupDetailsModal';
import { SettingsModal } from '../components/modals/SettingsModal';
import { TranslateModal } from '../components/modals/TranslateModal';
import { EmptyChatState } from '../components/ui/EmptyChatState';
import { useAlert } from '../contexts/AlertContext';
import api, { getMediaUrl } from '../services/api';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import AutoMessengerPanel from '../features/autoMessenger/AutoMessengerPanel';
import './Dashboard.css';
import {
  Menu, Search, Home, Plus, MessageSquare, Users, Hash,
  Clock, Pin, Mail, Bell, Bot, Settings, User, LogOut,
  Archive, Bookmark, UserPlus, BookUser, Radio, BellRing,
  PanelLeftClose, PanelLeftOpen, Command, CheckSquare,
  MoreVertical, Paperclip, Image, Smile, Send,
  ShieldCheck, Trash2, Ban, Flag, ChevronDown, ChevronRight,
  Check, CheckCheck, Edit3, Reply, X, ArrowLeft, BellOff, Languages
} from 'lucide-react';

export const HomePage = () => {
  const dispatch = useAppDispatch();
  const { theme, toggle } = useTheme();
  const { showAlert, showConfirm } = useAlert();
  const { user } = useAppSelector(state => state.auth);
  const { chats, activeChatId, isMessagesLoading, typingUsers } = useAppSelector(state => state.chat);

  const activeChatTypingUsers = (activeChatId ? typingUsers[activeChatId] : []) || [];
  const otherTypingUsers = activeChatTypingUsers.filter(id => id !== user?.id);
  const isTyping = otherTypingUsers.length > 0;

  let typingText = '';
  if (isTyping) {
    const activeChatData = chats.find(c => c.id === activeChatId);
    if (activeChatData?.type === 'PRIVATE') typingText = 'Typing...';
    else if (otherTypingUsers.length === 1) typingText = '1 person is typing...';
    else typingText = `${otherTypingUsers.length} people are typing...`;
  }

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('direct');
  const [showAISettings, setShowAISettings] = useState(false);
  const [isSavingAIMode, setIsSavingAIMode] = useState(false);
  const [showOptionsPopup, setShowOptionsPopup] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isGroupDetailsModalOpen, setIsGroupDetailsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [translateMessageId, setTranslateMessageId] = useState<string | null>(null);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isChatSearchOpen, setIsChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    direct: true,
    requests: true,
    group: true,
    channels: true
  });

  // Modals state
  // Modals state
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [userToBlock, setUserToBlock] = useState<string | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [showNewMessageIndicator, setShowNewMessageIndicator] = useState(false);

  // Translation States
  const [showOriginalForMsg, setShowOriginalForMsg] = useState<Record<string, boolean>>({});
  const [isLiveTranslateActive, setIsLiveTranslateActive] = useState(false);
  const [liveTranslateTargetLang, setLiveTranslateTargetLang] = useState('en');
  const [isTranslatingLive, setIsTranslatingLive] = useState(false);
  const [liveTranslateError, setLiveTranslateError] = useState<string | null>(null);
  const liveTranslateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveTranslateVersionRef = useRef(0);
  const [translatingMsgId, setTranslatingMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use Socket
  const socket = useSocket(activeChatId);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setMessageText(newText);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';

    if (socket && activeChatId) {
      socket.emit('typing_start', activeChatId);

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing_stop', activeChatId);
      }, 2000);
    }
  };

  const handleManualTranslateDraft = async () => {
    if (!messageText.trim() || isTranslatingLive) return;

    setIsTranslatingLive(true);
    setLiveTranslateError(null);
    try {
      const res = await api.post('/messages/translate-draft', { text: messageText, targetLanguage: liveTranslateTargetLang });
      if (res.data.translatedText) {
        setMessageText(res.data.translatedText);
      }
    } catch (err: any) {
      if (err.response?.status === 429) {
        setLiveTranslateError('Rate limit exceeded. Wait a bit.');
      } else {
        setLiveTranslateError('Failed to translate draft.');
      }
      console.error('Failed to translate draft', err);
    } finally {
      setIsTranslatingLive(false);
    }
  };

  useEffect(() => {
    dispatch(fetchChats());

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch]);

  // Update document title with global unread count
  useEffect(() => {
    const totalUnread = chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) Aura Messenger`;
    } else {
      document.title = 'Aura Messenger';
    }
  }, [chats]);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Derived state for chats
  const directChats = chats.filter(c => c.type === 'PRIVATE');

  // Fetch messages when chat changes
  useEffect(() => {
    if (activeChatId) {
      dispatch(fetchMessages(activeChatId));
      dispatch(markChatAsRead(activeChatId));
    }
  }, [activeChatId, dispatch]);

  // Auto-scroll to bottom when messages change
  const currentMessages = useAppSelector(state => activeChatId ? state.chat.messages[activeChatId] : []);

  const filteredMessages = useMemo(() => {
    if (!chatSearchQuery.trim()) return currentMessages || [];
    return (currentMessages || []).filter((msg: Message) =>
      msg.content && msg.content.toLowerCase().includes(chatSearchQuery.toLowerCase())
    );
  }, [currentMessages, chatSearchQuery]);

  const chatFeedRef = useRef<HTMLDivElement>(null);

  const [savedMessages, setSavedMessages] = useState<any[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [savedMessageIds, setSavedMessageIds] = useState<Set<string>>(new Set());

  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [isLoadingBlocked, setIsLoadingBlocked] = useState(false);

  const [dropdownConfig, setDropdownConfig] = useState<{ id: string, x: number, y: number, itemType: string } | null>(null);

  useEffect(() => {
    // Always fetch saved messages to know which ones are saved
    setIsLoadingSaved(true);
    api.get('/messages/saved').then(res => {
      setSavedMessages(res.data);
      setSavedMessageIds(new Set(res.data.map((sm: any) => sm.messageId)));
    }).catch(err => console.error(err))
      .finally(() => setIsLoadingSaved(false));

    // Fetch blocked users and contacts on mount to filter/style chat lists globally
    api.get('/users/blocked').then(res => setBlockedUsers(res.data)).catch(console.error);

    setIsLoadingContacts(true);
    api.get('/contacts').then(res => setContacts(res.data))
      .catch(err => console.error(err))
      .finally(() => setIsLoadingContacts(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'blocked') {
      setIsLoadingBlocked(true);
      api.get('/users/blocked').then(res => {
        setBlockedUsers(res.data);
      }).catch(err => console.error(err))
        .finally(() => setIsLoadingBlocked(false));
    }
  }, [activeTab]);

  const previousChatIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (chatFeedRef.current && messagesEndRef.current) {
      const feed = chatFeedRef.current;
      const isChatChanged = previousChatIdRef.current !== activeChatId;
      const isNearBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 150;
      const lastMessage = currentMessages?.[currentMessages.length - 1];
      const isMyMessage = lastMessage?.senderId === user?.id;

      if (isChatChanged || isNearBottom || isMyMessage) {
        messagesEndRef.current.scrollIntoView({ behavior: isChatChanged ? 'auto' : 'smooth' });
        setShowNewMessageIndicator(false);
      } else {
        setShowNewMessageIndicator(true);
      }

      previousChatIdRef.current = activeChatId;
    }
  }, [currentMessages, activeChatId, user?.id]);

  const handleScroll = () => {
    if (chatFeedRef.current) {
      const feed = chatFeedRef.current;
      const isNearBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 50;
      if (isNearBottom) {
        setShowNewMessageIndicator(false);
      }
    }
  };

  // Mark latest message as read when entering a chat
  useEffect(() => {
    if (activeChatId && currentMessages && currentMessages.length > 0 && socket) {
      const lastMsg = currentMessages[currentMessages.length - 1];
      if (lastMsg.senderId !== user?.id && lastMsg.status !== 'READ') {
        socket.emit('mark_read', { messageId: lastMsg.id, chatId: activeChatId });
      }
    }
  }, [activeChatId, currentMessages, socket, user?.id]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeChatId || !user) return;

    const sentText = messageText;
    const isEditing = !!editingMessageId;
    const isReplying = !!replyingToMessage;
    const editId = editingMessageId;

    setMessageText('');
    setShowEmojiPicker(false);
    setEditingMessageId(null);
    setReplyingToMessage(null);

    if (socket && activeChatId) {
      socket.emit('typing_stop', activeChatId);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }

    if (isEditing) {
      try {
        const { data: updatedMsg } = await api.put(`/chats/${activeChatId}/messages/${editId}`, { content: sentText });
        dispatch(updateMessageInStore(updatedMsg));
      } catch (err) {
        console.error('Failed to edit message', err);
      }
      return;
    }

    // Optimistic UI Update for send/reply
    const tempId = `temp-${Date.now()}`;
    dispatch(addMessage({
      id: tempId,
      chatId: activeChatId,
      senderId: user.id,
      content: sentText,
      type: 'TEXT',
      status: 'SENT',
      createdAt: new Date().toISOString(),
      isEdited: false,
      isDeleted: false,
      parentMessageId: isReplying ? replyingToMessage.id : undefined,
      parentMessage: isReplying ? {
        id: replyingToMessage.id,
        content: replyingToMessage.content,
        senderId: replyingToMessage.senderId,
        sender: { username: replyingToMessage.sender?.username || 'user' }
      } : undefined,
      sender: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl || null
      }
    }));

    try {
      await api.post(`/chats/${activeChatId}/messages`, {
        content: sentText,
        type: 'TEXT',
        parentMessageId: isReplying ? replyingToMessage.id : undefined
      });
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    setMessageToDelete(messageId);
  };

  const confirmDeleteMessage = async () => {
    if (!messageToDelete || !activeChatId) return;
    const id = messageToDelete;
    setMessageToDelete(null);
    // Optimistic update immediately
    dispatch(deleteMessageInStore({ chatId: activeChatId, messageId: id }));
    try {
      await api.delete(`/chats/${activeChatId}/messages/${id}`);
    } catch (err) {
      console.error('Failed to delete message', err);
      // Revert on failure
      dispatch(fetchMessages({ chatId: activeChatId } as any));
    }
  };

  const toggleChatPin = async (chatId: string, currentPinStatus: boolean) => {
    try {
      // Optimistic update
      dispatch(updateChat({ chatId, updates: { isPinned: !currentPinStatus } }));
      await api.put(`/chats/${chatId}/pin`);
      dispatch(fetchChats() as any); // Refresh to make sure sorting is perfect
    } catch (err) {
      // Revert
      dispatch(updateChat({ chatId, updates: { isPinned: currentPinStatus } }));
    }
  };

  const toggleChatArchive = async (chatId: string, currentArchiveStatus: boolean) => {
    // Optimistic update
    dispatch(updateChat({ chatId, updates: { isArchived: !currentArchiveStatus } }));
    try {
      if (activeChatId === chatId && !currentArchiveStatus) {
        dispatch(setActiveChat(null));
      }
      await api.put(`/chats/${chatId}/archive`);
      dispatch(fetchChats() as any); // Refresh lists properly
    } catch (err) {
      // Revert
      dispatch(updateChat({ chatId, updates: { isArchived: currentArchiveStatus } }));
    }
  };

  const toggleChatMute = async (chatId: string, currentMuteStatus: boolean) => {
    // Optimistic update
    dispatch(updateChat({ chatId, updates: { isMuted: !currentMuteStatus } }));
    try {
      await api.put(`/chats/${chatId}/mute`);
      dispatch(fetchChats() as any);
    } catch (err) {
      dispatch(updateChat({ chatId, updates: { isMuted: currentMuteStatus } }));
    }
  };

  const sortChats = (chatsToSort: Chat[]) => {
    return [...chatsToSort].sort((a, b) => {
      // Pinned chats first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      // Then by updatedAt
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  };

  // Filter accepted vs pending requests
  const acceptedChats = sortChats(directChats.filter(c => {
    if (c.isArchived) return false;
    const otherUserId = c.participants.find(p => p.userId !== user?.id)?.userId;
    if (otherUserId && blockedUsers.some(bu => bu.blockedId === otherUserId)) return false;

    const myParticipant = c.participants.find(p => p.userId === user?.id);
    return myParticipant?.hasAccepted === true;
  }));

  const messageRequests = sortChats(chats.filter(c => {
    if (c.type === 'PRIVATE') {
      const otherUserId = c.participants.find(p => p.userId !== user?.id)?.userId;
      if (otherUserId && blockedUsers.some(bu => bu.blockedId === otherUserId)) return false;
    }

    const myParticipant = c.participants.find(p => p.userId === user?.id);
    return myParticipant?.hasAccepted === false;
  }));

  const groupChats = sortChats(chats.filter(c => {
    if (c.type !== 'GROUP' || c.isArchived) return false;
    const myParticipant = c.participants.find(p => p.userId === user?.id);
    return myParticipant?.hasAccepted === true;
  }));
  const channels = sortChats(chats.filter(c => c.type === 'CHANNEL' && !c.isArchived));

  const getChatName = (chat: Chat) => {
    if (chat.type === 'PRIVATE') {
      const otherParticipant = chat.participants.find(p => p.userId !== user?.id);
      return otherParticipant ? (otherParticipant.user.fullName || otherParticipant.user.username) : 'Unknown User';
    }
    return chat.groupDetails?.name || 'Unnamed Group';
  };

  const getChatAvatarUrl = (chat: Chat) => {
    if (chat.type === 'PRIVATE') {
      const otherParticipant = chat.participants.find(p => p.userId !== user?.id);
      return getMediaUrl(otherParticipant?.user?.avatarUrl);
    }
    return getMediaUrl(chat.groupDetails?.avatarUrl || chat.avatarUrl);
  };

  const getChatAvatar = (chat: Chat) => {
    const name = getChatName(chat);
    return name.substring(0, 2).toUpperCase();
  };

  const activeChatData = chats.find(c => c.id === activeChatId);
  const aiModeUsers = activeChatData?.aiModeUsers || [];
  const currentUserAiModeEnabled = !!user?.id && aiModeUsers.includes(user.id);
  const otherPrivateParticipant = activeChatData?.type === 'PRIVATE'
    ? activeChatData.participants.find(p => p.userId !== user?.id)
    : null;
  const otherUserAiModeEnabled = !!otherPrivateParticipant?.userId && aiModeUsers.includes(otherPrivateParticipant.userId);

  const toggleActiveChatAIMode = async () => {
    if (!activeChatId || !user?.id || activeChatData?.type !== 'PRIVATE' || isSavingAIMode) return;

    const nextEnabled = !currentUserAiModeEnabled;
    dispatch(setAiModeStatus({ chatId: activeChatId, userId: user.id, isEnabled: nextEnabled }));
    setIsSavingAIMode(true);

    try {
      await api.put(`/auto-messenger/${activeChatId}`, { isEnabled: nextEnabled });
    } catch (err) {
      dispatch(setAiModeStatus({ chatId: activeChatId, userId: user.id, isEnabled: !nextEnabled }));
      console.error('Failed to toggle AI mode', err);
      showAlert('Failed to update AI mode. Try again.', 'error');
    } finally {
      setIsSavingAIMode(false);
    }
  };

  const amIBlockedOrBlockedBy = useMemo(() => {
    if (!activeChatData || activeChatData.type !== 'PRIVATE') return false;
    const otherUserId = activeChatData.participants.find((p: any) => p.userId !== user?.id)?.userId;
    return blockedUsers.some(bu => bu.blockedId === otherUserId);
  }, [activeChatData, blockedUsers, user?.id]);

  const navGroups: { title: string, items: { id: string, icon: React.ElementType, label: string, isDanger?: boolean, action?: () => void }[] }[] = [
    {
      title: 'Main',
      items: [
        { id: 'home', icon: Home, label: 'Home' },
        { id: 'search', icon: Search, label: 'Search', action: () => setIsSearchModalOpen(true) },
        { id: 'new-chat', icon: MessageSquare, label: 'New Chat', action: () => setIsSearchModalOpen(true) },
        { id: 'new-group', icon: Plus, label: 'New Group Chat', action: () => setIsGroupModalOpen(true) },
      ]
    },
    {
      title: 'Conversations',
      items: [
        { id: 'direct', icon: MessageSquare, label: 'Direct Messages' },
        { id: 'requests', icon: UserPlus, label: 'Message Requests' },
        { id: 'group', icon: Users, label: 'Group Chats' },
      ]
    },
    {
      title: 'Filters',
      items: [
        { id: 'recent', icon: Clock, label: 'Recent Chats' },
        { id: 'pinned', icon: Pin, label: 'Pinned Chats' },
        { id: 'unread', icon: Mail, label: 'Unread Chats' },
      ]
    },
    {
      title: 'System',
      items: [
        { id: 'notifications', icon: Bell, label: 'Notifications' },
      ]
    },
    {
      title: 'Important',
      items: [
        { id: 'archived', icon: Archive, label: 'Archived Chats' },
        { id: 'saved', icon: Bookmark, label: 'Saved Messages' },
        { id: 'friends', icon: UserPlus, label: 'Friends' },
        { id: 'blocked', icon: Ban, label: 'Blocked Users' },
      ]
    },
    {
      title: 'Account',
      items: [
        { id: 'profile', icon: User, label: 'Profile', action: () => setIsSettingsModalOpen(true) },
        { id: 'logout', icon: LogOut, label: 'Logout', isDanger: true, action: () => setIsLogoutConfirmOpen(true) },
      ]
    }
  ];

  const renderDateDivider = (currentDate: string, prevDate: string | null) => {
    const current = new Date(currentDate);
    const prev = prevDate ? new Date(prevDate) : null;

    if (!prev || current.toDateString() !== prev.toDateString()) {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let label = current.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
      if (current.toDateString() === today.toDateString()) label = 'Today';
      else if (current.toDateString() === yesterday.toDateString()) label = 'Yesterday';

      return (
        <div className="date-divider">
          <span>{label}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="v2-dashboard">
      {/* ── TOP NAVBAR ── */}
      <nav className="v2-navbar">
        <div className="nav-left">
          <button className="nav-icon-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <Menu size={18} strokeWidth={1.5} />
          </button>
          <div className="nav-context">
            <h1 className="nav-title">Workspace</h1>
            <span className={`nav-status-indicator ${user?.status === 'ONLINE' ? 'online' : 'offline'}`}></span>
          </div>
        </div>

        <div className="nav-center">
          <div className="nav-search" onClick={() => setIsSearchModalOpen(true)} style={{ cursor: 'pointer' }}>
            <Search size={14} strokeWidth={1.5} />
            <span className="nav-search-text" style={{ color: 'var(--color-text-dim)', fontSize: '13px' }}>Global Search (Cmd+K)</span>
          </div>
        </div>

        <div className="nav-right">
          <button className="nav-icon-btn" onClick={toggle} title="Toggle Theme">
            {theme === 'dark' ? <span style={{ fontSize: '14px' }}>☀</span> : <span style={{ fontSize: '14px' }}>🌙</span>}
          </button>
          <div className="nav-user-profile" onClick={() => setIsSettingsModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '4px 8px', borderRadius: '8px', transition: 'background-color 0.2s' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>{user?.fullName || user?.username}</span>
            <div className="nav-avatar" style={{ overflow: 'hidden', padding: 0 }}>
              {user?.avatarUrl ? (
                <img src={getMediaUrl(user.avatarUrl)!} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '13px' }}>{user?.username?.substring(0, 1).toUpperCase() || 'U'}</span>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className={`v2-main-layout ${Boolean(activeChatData || ['friends', 'blocked', 'saved'].includes(activeTab)) ? 'mobile-chat-active' : ''}`}>
        {/* ── SIDEBAR ── */}
        <aside className={`v2-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-scroll">
            {navGroups.map((group, idx) => (
              <div key={idx} className="sidebar-group">
                <h3 className="sidebar-group-title">{group.title}</h3>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isChatCategory = ['direct', 'requests', 'group', 'channels', 'pinned', 'unread', 'archived'].includes(item.id);
                  const isExpanded = expandedSections[item.id];

                  let categoryChats: Chat[] = [];
                  if (item.id === 'direct') categoryChats = acceptedChats;
                  if (item.id === 'requests') categoryChats = messageRequests;
                  if (item.id === 'group') categoryChats = groupChats;
                  if (item.id === 'channels') categoryChats = channels;
                  if (item.id === 'pinned') categoryChats = chats.filter(c => c.isPinned);
                  if (item.id === 'unread') categoryChats = chats.filter(c => (c.unreadCount || 0) > 0);
                  if (item.id === 'archived') categoryChats = chats.filter(c => c.isArchived);

                  return (
                    <div key={item.id}>
                      <button
                        className={`sidebar-item ${activeTab === item.id ? 'active' : ''} ${item.isDanger ? 'danger' : ''}`}
                        onClick={() => {
                          if (item.action) {
                            item.action();
                          } else {
                            setActiveTab(item.id);
                            dispatch(setActiveChat(null));
                            if (isChatCategory) toggleSection(item.id);
                          }
                        }}
                      >
                        <Icon size={14} strokeWidth={1.5} className="sidebar-item-icon" />
                        <span className="sidebar-item-label">{item.label}</span>
                        {isChatCategory && (
                          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {categoryChats.reduce((sum, c) => sum + (c.unreadCount || 0), 0) > 0 && (
                              <span style={{
                                backgroundColor: 'var(--accent)',
                                color: '#fff',
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '10px',
                                fontWeight: 'bold'
                              }}>
                                {categoryChats.reduce((sum, c) => sum + (c.unreadCount || 0), 0)}
                              </span>
                            )}
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </div>
                        )}
                      </button>

                      {/* Render fetched chats if this is an expanded category */}
                      {isChatCategory && isExpanded && categoryChats.length > 0 && (
                        <div className="sidebar-sublist">
                          {categoryChats.map(chat => {
                            return (
                              <div
                                key={chat.id}
                                style={{ position: 'relative' }}
                                className={`sidebar-subitem ${activeChatId === chat.id ? 'active' : ''}`}
                                onClick={() => dispatch(setActiveChat(chat.id))}
                              >
                                {(() => {
                                  const isPrivate = chat.type === 'PRIVATE';
                                  const otherUserId = isPrivate ? chat.participants.find(p => p.userId !== user?.id)?.userId : null;
                                  const isFriend = otherUserId ? contacts.some(c => c.contactId === otherUserId) : false;

                                  return (
                                    <div className="subitem-avatar" style={{
                                      overflow: 'hidden',
                                      padding: 0,
                                      backgroundColor: 'var(--accent)',
                                      border: isFriend ? '2px solid lightpink' : 'none'
                                    }}>
                                      {getChatAvatarUrl(chat) ? (
                                        <img src={getChatAvatarUrl(chat)!} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      ) : (
                                        getChatAvatar(chat)
                                      )}
                                    </div>
                                  );
                                })()}
                                <div className="subitem-content" style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                                    <span className="subitem-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {getChatName(chat)}
                                    </span>
                                    {chat.isMuted && <BellOff size={12} strokeWidth={2} style={{ flexShrink: 0, opacity: 0.5, color: 'var(--text-secondary)' }} />}
                                    {chat.type === 'PRIVATE' && <ShieldCheck size={12} className="verified-badge" />}
                                    {chat.isPinned && <Pin size={10} fill="currentColor" color="var(--color-text-dim)" style={{ flexShrink: 0 }} />}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {item.id === 'requests' && <span className="subitem-badge new">New</span>}
                                    {chat.unreadCount ? (
                                      <span style={{
                                        backgroundColor: 'var(--accent)',
                                        color: '#fff',
                                        fontSize: '10px',
                                        padding: '2px 6px',
                                        borderRadius: '10px',
                                        fontWeight: 'bold'
                                      }}>
                                        {chat.unreadCount}
                                      </span>
                                    ) : null}
                                    <div className="chat-hover-actions" style={{ position: 'relative', display: 'flex', gap: '4px' }}>
                                      <button
                                        className="chat-hover-actions-btn"
                                        style={{ background: dropdownConfig?.id === chat.id ? 'var(--surface)' : 'none', border: 'none', cursor: 'pointer', padding: '2px', borderRadius: '4px', color: 'var(--color-text-dim)' }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          setDropdownConfig(dropdownConfig?.id === chat.id ? null : { id: chat.id, x: rect.right, y: rect.bottom, itemType: item.id });
                                        }}
                                      >
                                        <MoreVertical size={14} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Utility Actions Footer */}
          <div className="sidebar-utilities">
            <button className="sidebar-item" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              {isSidebarOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
              <span className="sidebar-item-label">{isSidebarOpen ? 'Collapse Sidebar' : 'Expand'}</span>
            </button>
          </div>
        </aside>

        {/* ── CHAT AREA ── */}
        <main className="v2-chat-area">
          {activeChatData ? (
            <>
              {/* Dynamic Header */}
              <header className="chat-header">
                <div className="chat-header-left">
                  <button className="mobile-back-btn" onClick={() => { dispatch(setActiveChat(null)); setActiveTab('home'); }}>
                    <ArrowLeft size={20} />
                  </button>
                  <div className="chat-header-avatar" style={{ overflow: 'hidden', padding: 0, backgroundColor: 'var(--accent)' }}>
                    {getChatAvatarUrl(activeChatData) ? (
                      <img src={getChatAvatarUrl(activeChatData)!} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      getChatAvatar(activeChatData)
                    )}
                  </div>
                  <div
                    className="chat-header-info"
                    onClick={() => { if (activeChatData.type === 'GROUP') setIsGroupDetailsModalOpen(true); }}
                    style={{ cursor: activeChatData.type === 'GROUP' ? 'pointer' : 'default' }}
                  >
                    <div className="chat-name-row">
                      <h2>{getChatName(activeChatData)}</h2>
                      {activeChatData.isMuted && <BellOff size={16} strokeWidth={2} style={{ marginLeft: '4px', opacity: 0.5, color: 'var(--text-secondary)' }} />}
                      {activeChatData.type === 'PRIVATE' && <ShieldCheck size={14} className="verified-badge" />}
                    </div>
                    <div className="chat-status-row">
                      {isTyping ? (
                        <span className="status-text" style={{ color: 'var(--accent)', fontStyle: 'italic' }}>{typingText}</span>
                      ) : activeChatData.type === 'PRIVATE' ? (() => {
                        const otherP = activeChatData.participants.find(p => p.userId !== user?.id);
                        const isOnline = otherP?.user?.status === 'ONLINE';
                        return (
                          <>
                            <span className={`status-text ${isOnline ? 'online' : 'offline'}`}>{isOnline ? 'Online' : 'Offline'}</span>
                            <span className={`status-dot ${isOnline ? 'online' : 'offline'}`}></span>
                          </>
                        );
                      })() : (
                        <span className="status-text">{activeChatData.participants.length} Members</span>
                      )}
                      {otherUserAiModeEnabled && (
                        <span className="ai-mode-status">User In AI mode</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="chat-header-right">
                  {activeChatData.type === 'PRIVATE' && (
                    <button
                      className={`header-action-btn ai-mode-toggle ${currentUserAiModeEnabled ? 'active' : ''}`}
                      onClick={toggleActiveChatAIMode}
                      disabled={isSavingAIMode}
                      title={currentUserAiModeEnabled ? 'Turn AI mode off' : 'Turn AI mode on'}
                      aria-label={currentUserAiModeEnabled ? 'Turn AI mode off' : 'Turn AI mode on'}
                    >
                      <Bot size={16} strokeWidth={1.7} />
                    </button>
                  )}
                  <button className="header-action-btn" onClick={() => setIsChatSearchOpen(!isChatSearchOpen)}><Search size={16} strokeWidth={1.5} /></button>
                  <div className="dropdown-container">
                    <button className="header-action-btn" onClick={() => setShowOptionsPopup(!showOptionsPopup)}>
                      <MoreVertical size={16} strokeWidth={1.5} />
                    </button>

                    {showOptionsPopup && (
                      <div className="options-dropdown">
                        <button onClick={async () => {
                          await toggleChatMute(activeChatData.id, !!activeChatData.isMuted);
                          setShowOptionsPopup(false);
                        }}>
                          {activeChatData.isMuted ? <Bell size={14} /> : <BellRing size={14} />} {activeChatData.isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
                        </button>
                        <button onClick={async () => {
                          await toggleChatPin(activeChatData.id, !!activeChatData.isPinned);
                          setShowOptionsPopup(false);
                        }}>
                          <Pin size={14} fill={activeChatData.isPinned ? 'currentColor' : 'none'} /> {activeChatData.isPinned ? 'Unpin Chat' : 'Pin Chat'}
                        </button>
                        <button onClick={async () => {
                          await toggleChatArchive(activeChatData.id, !!activeChatData.isArchived);
                          setShowOptionsPopup(false);
                        }}>
                          <Archive size={14} fill={activeChatData.isArchived ? 'currentColor' : 'none'} /> {activeChatData.isArchived ? 'Unarchive Chat' : 'Archive Chat'}
                        </button>
                        <div className="dropdown-divider"></div>

                        {activeChatData.type === 'PRIVATE' && (
                          <button onClick={() => {
                            setShowAISettings(true);
                            setShowOptionsPopup(false);
                          }}>
                            <Bot size={14} /> AI Settings
                          </button>
                        )}

                        {activeChatData.type === 'PRIVATE' && (() => {
                          const otherUserId = activeChatData.participants.find(p => p.userId !== user?.id)?.userId;
                          if (!otherUserId) return null;
                          const isFriend = contacts.some(c => c.contactId === otherUserId);

                          return (
                            <button onClick={async () => {
                              try {
                                if (isFriend) {
                                  // Find the contact record to delete
                                  const contactRec = contacts.find(c => c.contactId === otherUserId);
                                  if (contactRec) {
                                    await api.delete(`/contacts/${contactRec.id}`);
                                    setContacts(prev => prev.filter(c => c.id !== contactRec.id));
                                  }
                                } else {
                                  const res = await api.post('/contacts', { contactId: otherUserId });
                                  setContacts(prev => [...prev, res.data]);
                                }
                                setShowOptionsPopup(false);
                              } catch (err) {
                                console.error('Failed to toggle friend status', err);
                              }
                            }}>
                              <UserPlus size={14} fill={isFriend ? 'currentColor' : 'none'} /> {isFriend ? 'Remove Friend' : 'Add Friend'}
                            </button>
                          );
                        })()}

                        <button className="danger-text" onClick={async () => {
                          if (activeChatData.type === 'PRIVATE') {
                            const otherUserId = activeChatData.participants.find(p => p.userId !== user?.id)?.userId;
                            if (otherUserId) {
                              setShowOptionsPopup(false);
                              setUserToBlock(otherUserId);
                            }
                          }
                        }}>
                          <Ban size={14} /> Block User
                        </button>
                        <button className="danger-text" onClick={() => setChatToDelete(activeChatData.id)}><Trash2 size={14} /> Clear Chat History</button>
                      </div>
                    )}
                  </div>
                </div>
              </header>

              {isChatSearchOpen && (
                <div style={{ padding: '12px 24px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Search size={14} color="var(--color-text-dim)" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search messages in this chat..."
                    value={chatSearchQuery}
                    onChange={(e) => setChatSearchQuery(e.target.value)}
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--color-text)', fontSize: '14px' }}
                  />
                  <button onClick={() => { setIsChatSearchOpen(false); setChatSearchQuery(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-dim)', padding: '4px' }}>
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Feed */}
              <div ref={chatFeedRef} onScroll={handleScroll} className="chat-feed" style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', position: 'relative' }}>
                {isMessagesLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
                    <div className="skeleton-bubble" style={{ width: '40%', height: '40px', alignSelf: 'flex-start', borderRadius: '12px' }}></div>
                    <div className="skeleton-bubble" style={{ width: '60%', height: '60px', alignSelf: 'flex-start', borderRadius: '12px' }}></div>
                    <div className="skeleton-bubble" style={{ width: '50%', height: '50px', alignSelf: 'flex-end', borderRadius: '12px', opacity: 0.7 }}></div>
                  </div>
                ) : filteredMessages?.length > 0 ? (
                  filteredMessages.map((msg: Message, index: number) => {
                    const isOutgoing = msg.senderId === user?.id && !msg.isAI;
                    const prevMsg = index > 0 ? filteredMessages[index - 1] : null;
                    const isConsecutive = prevMsg && prevMsg.senderId === msg.senderId && prevMsg.isAI === msg.isAI && (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() < 5 * 60 * 1000) && (new Date(msg.createdAt).toDateString() === new Date(prevMsg.createdAt).toDateString());

                    return (
                      <div key={msg.id} style={{ display: 'flex', flexDirection: 'column' }}>
                        {renderDateDivider(msg.createdAt, prevMsg?.createdAt || null)}
                        <div className={`message-row ${isOutgoing ? 'outgoing' : 'incoming'} ${msg.id.startsWith('temp-') ? 'optimistic' : ''}`} style={{ marginTop: isConsecutive ? '-12px' : '0' }}>
                          {!isOutgoing && (
                            <div className="message-avatar" style={{ visibility: isConsecutive ? 'hidden' : 'visible', overflow: 'hidden', padding: 0, backgroundColor: msg.isAI ? 'var(--accent)' : 'var(--accent)' }}>
                              {msg.isAI ? (
                                <span style={{ fontSize: '11px', color: '#fff', fontWeight: 'bold' }}>🤖</span>
                              ) : msg.sender?.avatarUrl ? (
                                <img src={getMediaUrl(msg.sender.avatarUrl)!} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <span style={{ fontSize: '11px', color: '#fff' }}>{msg.sender?.username?.substring(0, 2).toUpperCase() || 'U'}</span>
                              )}
                            </div>
                          )}
                          {msg.isAI && isOutgoing && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                              <span style={{ fontSize: '10px', fontWeight: 600, color: '#818cf8', letterSpacing: '0.3px' }}>🤖 AI Reply</span>
                            </div>
                          )}
                          <div className="message-content" style={{ display: 'flex', flexDirection: isOutgoing ? 'row-reverse' : 'row', alignItems: 'center', gap: '8px' }}>
                            <div className="bubble" style={{
                              borderTopLeftRadius: !isOutgoing && isConsecutive ? '4px' : '',
                              borderTopRightRadius: isOutgoing && isConsecutive ? '4px' : '',
                              display: 'inline-flex',
                              flexDirection: 'column',
                              gap: '4px',
                              maxWidth: '100%'
                            }}>
                              {msg.parentMessage && !msg.isDeleted && (
                                <div style={{
                                  backgroundColor: 'rgba(0,0,0,0.1)',
                                  borderLeft: `4px solid ${isOutgoing ? '#fff' : 'var(--accent)'}`,
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  cursor: 'pointer'
                                }}>
                                  <span style={{ fontWeight: 600, color: isOutgoing ? '#fff' : 'var(--accent)', marginBottom: '2px' }}>
                                    {msg.parentMessage.sender?.username || 'someone'}
                                  </span>
                                  <span style={{ opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                                    {msg.parentMessage.content}
                                  </span>
                                </div>
                              )}
                              <div style={{ display: 'inline-flex', alignItems: 'flex-end', gap: '8px' }}>
                                {(() => {
                                  const translations = msg.translations || {};
                                  const availableLangs = Object.keys(translations);
                                  const prefLang = user?.preferredLanguage || 'en';
                                  const displayLang = translations[prefLang] ? prefLang : (availableLangs.length > 0 ? availableLangs[0] : null);
                                  const hasTranslation = !!displayLang;
                                  const showOriginal = showOriginalForMsg[msg.id];
                                  const displayContent = (hasTranslation && !showOriginal && !msg.isDeleted) ? translations[displayLang as string] : (msg.content || '');
                                  const isCurrentlyTranslating = translatingMsgId === msg.id;

                                  return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', wordBreak: 'normal', minWidth: 0, opacity: msg.isDeleted ? 0.5 : 1, fontStyle: msg.isDeleted ? 'italic' : 'normal' }}>
                                        {msg.isDeleted ? '🚫 This message was deleted' : displayContent}
                                      </div>

                                      {isCurrentlyTranslating && (
                                        <div style={{ fontSize: '10px', fontStyle: 'italic', color: isOutgoing ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)', alignSelf: isOutgoing ? 'flex-end' : 'flex-start' }}>
                                          translating...
                                        </div>
                                      )}
                                      {hasTranslation && !msg.isDeleted && (
                                        <button
                                          onClick={() => setShowOriginalForMsg(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                                          style={{
                                            alignSelf: isOutgoing ? 'flex-end' : 'flex-start',
                                            background: 'none',
                                            border: 'none',
                                            padding: 0,
                                            fontSize: '10px',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            cursor: 'pointer',
                                            color: isOutgoing ? 'rgba(255,255,255,0.8)' : 'var(--accent)',
                                            opacity: 0.8
                                          }}
                                        >
                                          <Languages size={10} /> {showOriginal ? `View Translation (${displayLang})` : 'View Original'}
                                        </button>
                                      )}
                                    </div>
                                  );
                                })()}
                                <div className="message-meta" style={{ flexShrink: 0, opacity: 0.7, fontSize: '10px', display: 'flex', gap: '4px', paddingBottom: '2px', alignItems: 'center' }}>
                                  {msg.isEdited && !msg.isDeleted && <span style={{ marginRight: '2px', fontSize: '9px', fontStyle: 'italic', opacity: 0.7 }}>(edited)</span>}

                                  <span className="time">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  {savedMessageIds.has(msg.id) && (
                                    <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--accent)', marginLeft: '2px', padding: '1px 3px', borderRadius: '4px', border: '1px solid var(--accent)' }}>Saved</span>
                                  )}
                                  {isOutgoing && (
                                    <span className="read-receipt" style={{ display: 'flex', alignItems: 'center', marginLeft: '2px' }}>
                                      {msg.id.startsWith('temp-') || msg.status === 'SENT' ? (
                                        <Check size={14} strokeWidth={2.5} style={{ opacity: 0.7 }} />
                                      ) : (
                                        <CheckCheck
                                          size={14}
                                          strokeWidth={2.5}
                                          color={msg.status === 'READ' ? '#3b82f6' : 'currentColor'}
                                          style={{ opacity: msg.status === 'READ' ? 1 : 0.7 }}
                                        />
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Reaction Strip */}
                            {msg.reactions && msg.reactions.length > 0 && !msg.isDeleted && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px', justifyContent: isOutgoing ? 'flex-end' : 'flex-start' }}>
                                {Object.entries(
                                  msg.reactions.reduce<Record<string, { count: number; users: string[]; hasReacted: boolean }>>((acc, r) => {
                                    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, users: [], hasReacted: false };
                                    acc[r.emoji].count++;
                                    acc[r.emoji].users.push(r.user.username);
                                    if (r.userId === user?.id) acc[r.emoji].hasReacted = true;
                                    return acc;
                                  }, {})
                                ).map(([emoji, data]) => (
                                  <button
                                    key={emoji}
                                    title={data.users.join(', ')}
                                    onClick={async () => {
                                      const { data: updated } = await api.post(`/messages/${msg.id}/react`, { emoji });
                                      dispatch(updateMessageInStore(updated));
                                    }}
                                    style={{
                                      background: data.hasReacted ? 'var(--accent)20' : 'var(--bg-secondary)',
                                      border: `1px solid ${data.hasReacted ? 'var(--accent)' : 'var(--border)'}`,
                                      borderRadius: '12px',
                                      padding: '2px 7px',
                                      fontSize: '13px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      color: 'var(--color-text)',
                                      fontWeight: data.hasReacted ? 600 : 400,
                                      transition: 'all 0.15s'
                                    }}
                                  >
                                    {emoji} <span style={{ fontSize: '11px' }}>{data.count}</span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Hover Actions */}
                            {!msg.id.startsWith('temp-') && !msg.isDeleted && (
                              <div className="message-actions" style={{ opacity: 0, display: 'flex', gap: '4px', transition: 'opacity 0.2s' }}>
                                {/* Quick Reactions */}
                                {['👍', '❤️', '😂'].map(emoji => (
                                  <button
                                    key={emoji}
                                    title={`React ${emoji}`}
                                    onClick={async () => {
                                      const { data: updated } = await api.post(`/messages/${msg.id}/react`, { emoji });
                                      dispatch(updateMessageInStore(updated));
                                    }}
                                    style={{ fontSize: '14px', padding: '0 2px', background: 'none', border: 'none' }}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                                {msg.type === 'TEXT' && (
                                  <button title="Translate" onClick={() => setTranslateMessageId(msg.id)}>
                                    <Languages size={14} />
                                  </button>
                                )}
                                <button title="Reply" onClick={() => {
                                  setReplyingToMessage(msg);
                                  setEditingMessageId(null);
                                  (document.querySelector('.chat-text-input') as HTMLTextAreaElement | null)?.focus();
                                }}>
                                  <Reply size={14} />
                                </button>
                                <button title={savedMessageIds.has(msg.id) ? "Unsave Message" : "Save Message"} onClick={async () => {
                                  try {
                                    const res = await api.post(`/messages/${msg.id}/save`);
                                    setSavedMessageIds(prev => {
                                      const next = new Set(prev);
                                      if (res.data.saved) next.add(msg.id);
                                      else next.delete(msg.id);
                                      return next;
                                    });
                                  } catch (err) {
                                    console.error('Failed to save message', err);
                                  }
                                }}>
                                  <Bookmark size={14} fill={savedMessageIds.has(msg.id) ? 'currentColor' : 'none'} />
                                </button>
                                {isOutgoing && msg.type === 'TEXT' && (
                                  <button title="Edit" onClick={() => {
                                    setEditingMessageId(msg.id);
                                    setReplyingToMessage(null);
                                    setMessageText(msg.content);
                                    (document.querySelector('.chat-text-input') as HTMLTextAreaElement | null)?.focus();
                                  }}>
                                    <Edit3 size={14} />
                                  </button>
                                )}
                                {isOutgoing && (
                                  <button title="Delete" onClick={() => handleDeleteMessage(msg.id)} style={{ color: 'var(--danger)' }}>
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="empty-state" style={{ height: '100%', justifyContent: 'center' }}>
                    <p>No messages yet. Say hi!</p>
                  </div>
                )}

                {isTyping && (() => {
                  const activeChatData = chats.find(c => c.id === activeChatId);
                  const typingUserParticipant = activeChatData?.participants?.find(p => p.userId === otherTypingUsers[0]);

                  return (
                    <div className="message-row incoming typing-indicator-row">
                      <div className="message-avatar" style={{ alignSelf: 'flex-end', marginBottom: '8px', overflow: 'hidden', padding: 0, backgroundColor: 'var(--accent)' }}>
                        {typingUserParticipant?.user?.avatarUrl ? (
                          <img src={getMediaUrl(typingUserParticipant.user.avatarUrl)!} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '11px', color: '#fff' }}>
                            {typingUserParticipant?.user?.username?.substring(0, 2).toUpperCase() || 'U'}
                          </span>
                        )}
                      </div>
                      <div className="message-content">
                        <div className="bubble typing-bubble">
                          <div className="typing-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginLeft: '4px' }}>
                          {typingText}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <div ref={messagesEndRef} />
              </div>

              {showNewMessageIndicator && (
                <button
                  className="new-message-indicator"
                  onClick={() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                    setShowNewMessageIndicator(false);
                  }}
                >
                  <ChevronDown size={16} />
                  <span>New Message</span>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)', marginLeft: '4px' }}></span>
                </button>
              )}

              {/* Input or Message Request Banner */}
              {activeChatData.participants.find(p => p.userId === user?.id)?.hasAccepted === false ? (
                <div className="message-request-banner">
                  <div className="request-banner-content">
                    <ShieldCheck size={20} className="request-icon" />
                    <div>
                      <h4>Message Request</h4>
                      <p>If you reply, {activeChatData.type === 'GROUP' ? 'members of this group' : getChatName(activeChatData)} will be able to interact with you and see information like your Active Status.</p>
                    </div>
                  </div>
                  <div className="request-banner-actions">
                    <button className="btn-secondary" onClick={async () => {
                      try {
                        await api.delete(`/chats/${activeChatData.id}/decline`);
                        dispatch(fetchChats()); // Refresh chats
                      } catch (err) {
                        console.error('Failed to decline request', err);
                      }
                    }}>Decline</button>
                    <button className="btn-primary" onClick={async () => {
                      try {
                        await api.put(`/chats/${activeChatData.id}/accept`);
                        dispatch(fetchChats()); // Refresh chats to update hasAccepted state
                      } catch (err) {
                        console.error('Failed to accept request', err);
                      }
                    }}>Accept</button>
                  </div>
                </div>
              ) : amIBlockedOrBlockedBy ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-dim)', borderTop: '1px solid var(--border)', background: 'var(--bg-panel)' }}>
                  You have blocked this user.
                  <button onClick={async () => {
                    const otherUserId = activeChatData.participants.find(p => p.userId !== user?.id)?.userId;
                    try {
                      await api.delete(`/users/${otherUserId}/block`);
                      dispatch(fetchChats() as any);
                      // Refresh blocked users list
                      api.get('/users/blocked').then(res => setBlockedUsers(res.data)).catch(console.error);
                    } catch (err) {
                      console.error('Failed to unblock', err);
                    }
                  }} style={{ marginLeft: '10px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Unblock</button>
                </div>
              ) : (
                <footer className="chat-input-wrapper" style={{ flexDirection: 'column' }}>
                  {activeChatData.type === 'PRIVATE' && activeChatData.participants.find(p => p.userId !== user?.id)?.hasAccepted === false && (
                    <div style={{ width: '100%', textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)', paddingBottom: '8px' }}>
                      <ShieldCheck size={12} style={{ verticalAlign: 'middle', marginRight: '4px', color: 'var(--accent)' }} />
                      Waiting for {getChatName(activeChatData)} to accept your request. {currentMessages?.length > 0 ? "You cannot send more messages until they accept." : "You can send 1 message."}
                    </div>
                  )}

                  {(editingMessageId || replyingToMessage) && (
                    <div style={{ width: '100%', backgroundColor: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '8px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-primary)', borderLeft: '3px solid var(--accent)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        {editingMessageId ? <Edit3 size={14} color="var(--accent)" /> : <Reply size={14} color="var(--accent)" />}
                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                          <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{editingMessageId ? 'Edit Message' : `Replying to ${replyingToMessage?.sender?.username || 'user'}`}</span>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-secondary)' }}>
                            {editingMessageId ? 'Modify your message below' : replyingToMessage?.content}
                          </span>
                        </div>
                      </div>
                      <button className="input-icon-btn" onClick={() => { setEditingMessageId(null); setReplyingToMessage(null); setMessageText(''); }}>
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  {isLiveTranslateActive && (
                    <div style={{ width: '100%', backgroundColor: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '8px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-primary)', borderLeft: '3px solid var(--accent)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Languages size={14} color="var(--accent)" />
                        <span style={{ fontWeight: 600 }}>Translating to:</span>
                        <select
                          value={liveTranslateTargetLang}
                          onChange={e => setLiveTranslateTargetLang(e.target.value)}
                          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--color-text)', borderRadius: '4px', padding: '2px 4px', fontSize: '12px', outline: 'none' }}
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
                        {isTranslatingLive && <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)', marginLeft: '8px' }}>translating...</span>}
                        {liveTranslateError && <span style={{ fontStyle: 'italic', color: 'var(--danger)', marginLeft: '8px' }}>{liveTranslateError}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={handleManualTranslateDraft}
                          disabled={isTranslatingLive || !messageText.trim()}
                          style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: (isTranslatingLive || !messageText.trim()) ? 'not-allowed' : 'pointer', opacity: (isTranslatingLive || !messageText.trim()) ? 0.6 : 1 }}
                        >
                          Translate
                        </button>
                        <button className="input-icon-btn" onClick={() => {
                          setIsLiveTranslateActive(false);
                          setLiveTranslateError(null);
                        }}>
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="chat-input-box" style={{ width: '100%' }}>
                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} />
                    <button className="input-icon-btn" onClick={() => fileInputRef.current?.click()}><Paperclip size={16} strokeWidth={1.5} /></button>
                    <button className="input-icon-btn" onClick={() => fileInputRef.current?.click()}><Image size={16} strokeWidth={1.5} /></button>
                    <button
                      className="input-icon-btn"
                      onClick={() => setIsLiveTranslateActive(!isLiveTranslateActive)}
                      style={{ color: isLiveTranslateActive ? 'var(--accent)' : 'inherit' }}
                      title="Live Type Translation"
                    >
                      <Languages size={16} strokeWidth={1.5} />
                    </button>
                    <textarea
                      placeholder={activeChatData.type === 'PRIVATE' && activeChatData.participants.find(p => p.userId !== user?.id)?.hasAccepted === false && currentMessages?.length > 0 ? "Waiting for acceptance..." : "Type a message..."}
                      className="chat-text-input"
                      value={messageText}
                      disabled={activeChatData.type === 'PRIVATE' && activeChatData.participants.find(p => p.userId !== user?.id)?.hasAccepted === false && currentMessages?.length > 0}
                      rows={1}
                      style={{ resize: 'none', overflowY: 'auto', maxHeight: '120px' }}
                      onChange={handleTyping}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                          e.currentTarget.style.height = 'auto';
                        }
                      }}
                    />
                    <div style={{ position: 'relative' }}>
                      <button
                        className="input-icon-btn"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      >
                        <Smile size={16} strokeWidth={1.5} />
                      </button>

                      <AnimatePresence>
                        {showEmojiPicker && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            transition={{ duration: 0.15 }}
                            style={{
                              position: 'absolute',
                              bottom: '100%',
                              right: 0,
                              marginBottom: '10px',
                              zIndex: 50
                            }}
                          >
                            <EmojiPicker
                              theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
                              onEmojiClick={(emojiData) => {
                                setMessageText(prev => prev + emojiData.emoji);
                              }}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <button
                      className="send-btn"
                      onClick={handleSendMessage}
                      disabled={activeChatData.type === 'PRIVATE' && activeChatData.participants.find(p => p.userId !== user?.id)?.hasAccepted === false && currentMessages?.length > 0}
                    >
                      <Send size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                </footer>
              )}
            </>
          ) : activeTab === 'saved' ? (
            <div className="saved-messages-view" style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text)' }}>
                <Bookmark size={24} color="var(--accent)" /> Saved Messages
              </h2>
              {isLoadingSaved ? (
                <div className="spinner" style={{ margin: '40px auto', width: '30px', height: '30px', borderColor: 'var(--accent)', borderTopColor: 'transparent' }}></div>
              ) : savedMessages.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {savedMessages.map((sm: any) => (
                    <div key={sm.id} style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-text)' }}>{sm.message.sender.username}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{new Date(sm.createdAt).toLocaleString()}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '14px', whiteSpace: 'pre-wrap', color: 'var(--color-text)' }}>{sm.message.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px' }}>
                  No saved messages yet. Bookmark a message to see it here.
                </div>
              )}
            </div>
          ) : activeTab === 'friends' ? (
            <div className="special-tab-view" style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
              <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div className="special-tab-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                  <button className="mobile-back-btn" onClick={() => setActiveTab('home')}>
                    <ArrowLeft size={20} />
                  </button>
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <UserPlus size={24} /> Friends
                  </h2>
                </div>
                {isLoadingContacts ? (
                  <div style={{ padding: '24px 0', opacity: 0.7 }}>Loading friends...</div>
                ) : contacts.length === 0 ? (
                  <div style={{ padding: '24px 0', opacity: 0.7 }}>No friends found. Find users in Global Search to add them!</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                    {contacts.map(c => (
                      <div key={c.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--accent)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', boxShadow: '0 0 15px var(--accent-soft)' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '32px', overflow: 'hidden', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                          {c.contact.avatarUrl ? (
                            <img src={getMediaUrl(c.contact.avatarUrl)!} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            c.contact.username?.substring(0, 1).toUpperCase()
                          )}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontWeight: 600, fontSize: '15px' }}>{c.contact.fullName || c.contact.username} <Pin size={12} style={{ color: 'var(--accent)' }} /></div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-dim)', marginTop: '2px' }}>@{c.contact.username}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '4px' }}>
                          <button style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--color-text)', cursor: 'pointer', fontSize: '13px' }} onClick={async () => {
                            // Find existing private chat or create
                            const existing = chats.find(chat => chat.type === 'PRIVATE' && chat.participants.some(p => p.userId === c.contactId));
                            if (existing) {
                              dispatch(setActiveChat(existing.id));
                            } else {
                              try {
                                const res = await api.post('/chats/private', { userId: c.contactId });
                                dispatch(fetchChats() as any);
                                dispatch(setActiveChat(res.data.id));
                              } catch (err) {
                                console.error(err);
                              }
                            }
                          }}>
                            Message
                          </button>
                          <button style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--danger)', cursor: 'pointer', fontSize: '13px' }} onClick={async () => {
                            const confirmed = await showConfirm('Remove friend?', 'Confirm Removal');
                            if (confirmed) {
                              try {
                                await api.delete(`/contacts/${c.id}`);
                                setContacts(prev => prev.filter(x => x.id !== c.id));
                              } catch (err) {
                                console.error(err);
                              }
                            }
                          }}>
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'blocked' ? (
            <div className="special-tab-view mobile-chat-active" style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
              <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div className="special-tab-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                  <button className="mobile-back-btn" onClick={() => setActiveTab('home')}>
                    <ArrowLeft size={20} />
                  </button>
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'var(--danger)' }}>
                    <Ban size={24} /> Blocked Users
                  </h2>
                </div>
                {isLoadingBlocked ? (
                  <div style={{ padding: '24px 0', opacity: 0.7 }}>Loading blocked users...</div>
                ) : blockedUsers.length === 0 ? (
                  <div style={{ padding: '24px 0', opacity: 0.7 }}>No blocked users.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                    {blockedUsers.map(b => (
                      <div key={b.id} style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '30px', background: 'var(--danger)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', overflow: 'hidden' }}>
                          {b.blocked.avatarUrl ? <img src={getMediaUrl(b.blocked.avatarUrl)!} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (b.blocked.username?.substring(0, 1)?.toUpperCase() || '?')}
                        </div>
                        <div style={{ fontWeight: '500', fontSize: '14px', textAlign: 'center' }}>
                          <div>{b.blocked.fullName || b.blocked.username}</div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-dim)', marginTop: '2px' }}>@{b.blocked.username}</div>
                        </div>
                        <button onClick={async () => {
                          try {
                            await api.delete(`/users/${b.blocked.id}/block`);
                            setBlockedUsers(prev => prev.filter(x => x.id !== b.id));
                            alert('User unblocked!');
                            dispatch(fetchChats() as any);
                          } catch (err) {
                            console.error('Failed to unblock', err);
                          }
                        }} style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--color-text)', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', width: '100%' }}>
                          Unblock
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <EmptyChatState />
          )}
        </main>
      </div>

      {/* Modals */}
      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
      <CreateGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
      />
      {/* Group Details Modal */}
      {isGroupDetailsModalOpen && activeChatData && activeChatData.type === 'GROUP' && (
        <GroupDetailsModal chat={activeChatData} onClose={() => setIsGroupDetailsModalOpen(false)} />
      )}

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <SettingsModal isOpen={true} onClose={() => setIsSettingsModalOpen(false)} socket={socket} />
      )}

      {/* AI Settings Panel */}
      {showAISettings && activeChatId && (
        <div className="modal-backdrop" onClick={() => setShowAISettings(false)}>
          <div className="settings-modal-container" onClick={e => e.stopPropagation()}>
            <div className="search-modal-header" style={{ paddingBottom: '0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' }}>🤖 AI Settings</h3>
              <button className="search-modal-close" onClick={() => setShowAISettings(false)} style={{ alignSelf: 'auto', marginTop: 0 }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto', maxHeight: '70vh' }}>
              <AutoMessengerPanel
                chatId={activeChatId}
                token={user?.token || localStorage.getItem('accessToken') || ''}
                apiBase={import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}
                socket={socket}
              />
            </div>
          </div>
        </div>
      )}

      {/* Translate Modal */}
      {translateMessageId && (
        <TranslateModal
          isOpen={true}
          onClose={() => setTranslateMessageId(null)}
          onSelectLanguage={async (langCode) => {
            if (activeChatId) {
              setTranslatingMsgId(translateMessageId);
              try {
                await dispatch(translateMessage({ chatId: activeChatId, messageId: translateMessageId, targetLanguage: langCode })).unwrap();
              } catch (err: any) {
                if (err.includes && err.includes('429')) {
                  showAlert('Rate limit exceeded. Please wait a bit.', 'error');
                } else {
                  showAlert(err || 'Failed to translate message', 'error');
                }
              } finally {
                setTranslatingMsgId(null);
              }
            }
          }}
        />
      )}

      {/* Delete Chat Confirm Modal */}
      {chatToDelete && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <h2 className="modal-title">Clear Chat History?</h2>
            <p className="modal-description" style={{ marginBottom: '20px' }}>
              This will clear all messages in this conversation for you. The other person will still see the chat history. The conversation will remain in your list.
            </p>
            <div className="modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setChatToDelete(null)}>Cancel</button>
              <button className="btn-primary" style={{ background: 'var(--danger)' }} onClick={async () => {
                try {
                  await api.put(`/chats/${chatToDelete}/hide`);
                  dispatch(fetchChats() as any);
                  setChatToDelete(null);
                } catch (err) {
                  console.error('Failed to hide chat', err);
                }
              }}>Clear</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Message Confirm Modal */}
      {messageToDelete && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div style={{
            background: 'var(--bg-sidebar)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px',
            maxWidth: '300px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <p style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--color-text)', fontWeight: 500 }}>Delete this message for everyone?</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" style={{ padding: '7px 14px', fontSize: '13px' }} onClick={() => setMessageToDelete(null)}>Cancel</button>
              <button className="btn-primary" style={{ padding: '7px 14px', fontSize: '13px', background: 'var(--danger)' }} onClick={confirmDeleteMessage}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Block User Confirm Modal */}
      {userToBlock && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div style={{
            background: 'var(--bg-sidebar)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px',
            maxWidth: '300px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: 'var(--danger)', fontWeight: 600 }}>Block User?</h3>
            <p style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--color-text)', fontWeight: 400 }}>Are you sure you want to block this user? They will no longer be able to message you.</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" style={{ padding: '7px 14px', fontSize: '13px' }} onClick={() => setUserToBlock(null)}>Cancel</button>
              <button className="btn-primary" style={{ padding: '7px 14px', fontSize: '13px', background: 'var(--danger)' }} onClick={async () => {
                try {
                  await api.post(`/users/${userToBlock}/block`);
                  setUserToBlock(null);
                  dispatch(fetchChats() as any);
                  dispatch(setActiveChat(null));
                  // Refresh blocked users list
                  api.get('/users/blocked').then(res => setBlockedUsers(res.data)).catch(console.error);
                } catch (err) {
                  console.error('Failed to block user', err);
                  setUserToBlock(null);
                }
              }}>Block</button>
            </div>
          </div>
        </div>
      )}
      {/* Logout Confirm Modal */}
      {isLogoutConfirmOpen && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#ef4444' }}>
              <LogOut size={24} />
            </div>
            <h2 className="modal-title">Logout?</h2>
            <p className="modal-description" style={{ marginBottom: '24px' }}>
              Are you sure you want to log out of Aura Messenger? You will need to log back in to see your messages.
            </p>
            <div className="modal-actions" style={{ display: 'flex', gap: '10px', marginLeft: "80px" }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsLogoutConfirmOpen(false)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1, background: 'var(--danger)' }} onClick={() => {
                dispatch(logoutUser());
                setIsLogoutConfirmOpen(false);
              }}>Logout</button>
            </div>
          </div>
        </div>
      )}

      {/* Global Sidebar Options Dropdown (Position Fixed) */}
      {dropdownConfig && (() => {
        const chat = chats.find(c => c.id === dropdownConfig.id);
        if (!chat) return null;
        return (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }} onClick={() => setDropdownConfig(null)} />
            <div className="options-dropdown" style={{ position: 'fixed', left: Math.min(dropdownConfig.x + 8, window.innerWidth - 210), top: Math.min(dropdownConfig.y, window.innerHeight - 200), right: 'auto', zIndex: 10000, boxShadow: 'var(--shadow-elevated)' }}>
              <button onClick={() => { toggleChatPin(chat.id, !!chat.isPinned); setDropdownConfig(null); }}>
                <Pin size={14} fill={chat.isPinned ? 'currentColor' : 'none'} /> {chat.isPinned ? 'Unpin' : 'Pin'} Chat
              </button>
              <button onClick={() => { toggleChatArchive(chat.id, !!chat.isArchived); setDropdownConfig(null); }}>
                <Archive size={14} fill={chat.isArchived ? 'currentColor' : 'none'} /> {chat.isArchived ? 'Unarchive' : 'Archive'} Chat
              </button>
              {(dropdownConfig.itemType === 'direct' || dropdownConfig.itemType === 'archived') && (
                <button className="danger-text" onClick={() => { setChatToDelete(chat.id); setDropdownConfig(null); }}>
                  <Trash2 size={14} /> Delete Chat
                </button>
              )}
              {chat.type === 'PRIVATE' && (
                <>
                  <div className="dropdown-divider"></div>
                  <button className="danger-text" onClick={async () => {
                    const otherUserId = chat.participants.find(p => p.userId !== user?.id)?.userId;
                    if (otherUserId) {
                      setDropdownConfig(null);
                      setUserToBlock(otherUserId);
                    }
                  }}>
                    <Ban size={14} /> Block User
                  </button>
                </>
              )}
            </div>
          </>
        );
      })()}
    </div>
  );
};
