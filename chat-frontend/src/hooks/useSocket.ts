import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppDispatch } from '../store/store';
import { addMessage, updateChatLatestMessage, addChat, fetchChats, markChatAsRead, setTypingStatus, updateMessageReceipt, updateMessage, deleteMessage, updateUserStatus, translateMessage, setAiModeStatus } from '../features/chat/chatSlice';
import type { Message, Chat } from '../features/chat/chatSlice';
import { store } from '../store/store';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

export const useSocket = (activeChatId: string | null) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const activeChatIdRef = useRef(activeChatId);
  const dispatch = useAppDispatch();

  // Keep ref in sync
  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    // Get token
    const state = store.getState();
    const token = state.auth.user?.token || localStorage.getItem('accessToken');

    if (!token) return;

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ Connected to Socket server');
      if (activeChatIdRef.current) {
        newSocket.emit('join_chat', activeChatIdRef.current);
      }
    });

    const playNotificationSound = () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(500, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.1);
      } catch (e) { }
    };

    const showBrowserNotification = (message: Message) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        const title = `New message from ${message.sender?.username || 'someone'}`;
        const options = {
          body: message.content,
          icon: '/favicon.ico',
        };
        new Notification(title, options);
      }
    };

    newSocket.on('new_message', (message: Message) => {
      dispatch(addMessage(message));
      const state = store.getState();
      const user = state.auth.user;
      
      if (user?.autoTranslate && message.senderId !== user.id && message.type === 'TEXT') {
        const preferredLang = user.preferredLanguage || 'en';
        if (!message.translations || !message.translations[preferredLang]) {
           dispatch(translateMessage({ chatId: message.chatId, messageId: message.id, targetLanguage: preferredLang }) as any);
        }
      }
      
      const chat = state.chat.chats.find(c => c.id === message.chatId);
      const isArchived = chat?.isArchived;
      const isMuted = chat?.isMuted;

      if (activeChatIdRef.current === message.chatId) {
        dispatch(markChatAsRead(message.chatId));
        if (message.senderId !== state.auth.user?.id) {
          newSocket.emit('mark_read', { messageId: message.id, chatId: message.chatId });

          if (!document.hasFocus() && !isArchived && !isMuted) {
            playNotificationSound();
            showBrowserNotification(message);
          }
        }
      } else {
        if (message.senderId !== state.auth.user?.id && !isArchived && !isMuted) {
          playNotificationSound();
          showBrowserNotification(message);
        }
      }
    });

    newSocket.on('chat_updated', async (data: { chatId: string; lastMessage: Message }) => {
      const state = store.getState();
      const currentUserId = state.auth.user?.id;

      const chatExists = state.chat.chats.some(c => c.id === data.chatId);
      if (!chatExists) {
        // Zombie chat was revived! Fetch everything to resurrect it
        try {
          await dispatch(fetchChats()).unwrap();
        } catch (err) {
          console.error('Failed to fetch resurrected chat', err);
        }
      }

      // Update latest message and unread count
      dispatch(updateChatLatestMessage({ ...data, currentUserId, forceIncrement: !chatExists }));

      // If the chat is active but we somehow missed the room broadcast
      if (activeChatIdRef.current === data.chatId) {
        dispatch(addMessage(data.lastMessage));
      }
    });

    newSocket.on('new_chat_created', (chat: Chat) => {
      dispatch(addChat(chat));
    });

    newSocket.on('message_updated', (message: Message) => {
      dispatch(updateMessage(message));
    });

    newSocket.on('message_deleted', (message: Message) => {
      dispatch(deleteMessage({ chatId: message.chatId, messageId: message.id }));
    });

    newSocket.on('chat_accepted', () => {
      dispatch(fetchChats());
    });

    newSocket.on('chat_declined', () => {
      dispatch(fetchChats());
    });

    newSocket.on('typing_start', ({ chatId, userId }: { chatId: string; userId: string }) => {
      dispatch(setTypingStatus({ chatId, userId, isTyping: true }));
    });

    newSocket.on('typing_stop', ({ chatId, userId }: { chatId: string; userId: string }) => {
      dispatch(setTypingStatus({ chatId, userId, isTyping: false }));
    });

    newSocket.on('user_status_changed', (data: { userId: string; status: string }) => {
      dispatch(updateUserStatus(data));
    });

    newSocket.on('auto_messenger_status_changed', (data: { chatId: string; userId: string; isEnabled: boolean }) => {
      dispatch(setAiModeStatus(data));
    });

    // Group Chat Events
    const refetchChats = () => dispatch(fetchChats() as any);
    newSocket.on('group_updated', refetchChats);
    newSocket.on('participants_added', refetchChats);
    newSocket.on('participant_removed', refetchChats);
    newSocket.on('participant_updated', refetchChats);
    newSocket.on('added_to_group', refetchChats);
    newSocket.on('removed_from_group', refetchChats);

    newSocket.on('receipt_updated', (data: { messageId: string; chatId: string; userId: string; status: 'DELIVERED' | 'READ' }) => {
      dispatch(updateMessageReceipt(data));
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error', err);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []); // Connect once on mount

  // When active chat changes, emit join_chat
  useEffect(() => {
    if (socket && socket.connected && activeChatId) {
      socket.emit('join_chat', activeChatId);
    }
  }, [activeChatId, socket]);

  return socket;
};
