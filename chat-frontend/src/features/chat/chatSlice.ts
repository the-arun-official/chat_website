import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

export interface ChatParticipant {
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  isPinned: boolean;
  hasAccepted: boolean;
  user: {
    id: string;
    username: string;
    fullName: string | null;
    email: string;
    avatarUrl: string | null;
    status: string;
    isBot: boolean;
  };
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'VIDEO';
  status: 'SENT' | 'DELIVERED' | 'READ';
  createdAt: string;
  isEdited: boolean;
  isDeleted: boolean;
  parentMessageId?: string;
  parentMessage?: {
    id: string;
    content: string;
    senderId: string;
    sender?: { username: string };
  };
  sender?: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  reactions?: {
    id: string;
    emoji: string;
    userId: string;
    user: { id: string; username: string };
  }[];
  translations?: Record<string, string>;
  detectedLanguage?: string;
}

export interface Chat {
  id: string;
  type: 'PRIVATE' | 'GROUP' | 'CHANNEL';
  groupDetails?: {
    name: string;
    description: string | null;
    avatarUrl?: string | null;
  } | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  participants: ChatParticipant[];
  lastMessage?: Message | null;
  unreadCount?: number;
  isPinned?: boolean;
  isArchived?: boolean;
  isMuted?: boolean;
  _count?: {
    messages: number;
    participants: number;
  };
}

interface ChatState {
  chats: Chat[];
  activeChatId: string | null;
  messages: Record<string, Message[]>;
  typingUsers: Record<string, string[]>;
  isLoading: boolean;
  isMessagesLoading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  chats: [],
  activeChatId: null,
  messages: {},
  typingUsers: {},
  isLoading: false,
  isMessagesLoading: false,
  error: null,
};

export const fetchChats = createAsyncThunk('chat/fetchChats', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/chats');
    return response.data as Chat[];
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.error || 'Failed to fetch chats');
  }
});

export const markChatAsRead = createAsyncThunk('chat/markAsRead', async (chatId: string, { rejectWithValue }) => {
  try {
    await api.put(`/chats/${chatId}/read`);
    return chatId;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.error || 'Failed to mark chat as read');
  }
});

export const fetchMessages = createAsyncThunk('chat/fetchMessages', async (chatId: string, { rejectWithValue }) => {
  try {
    const response = await api.get(`/chats/${chatId}/messages`);
    return { chatId, messages: response.data as Message[] };
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.error || 'Failed to fetch messages');
  }
});

export const translateMessage = createAsyncThunk('chat/translateMessage', async ({ chatId, messageId, targetLanguage }: { chatId: string, messageId: string, targetLanguage: string }, { rejectWithValue }) => {
  try {
    const response = await api.post(`/chats/${chatId}/messages/${messageId}/translate`, { targetLanguage });
    return { chatId, messageId, translations: response.data.translations, detectedLanguage: response.data.detectedLanguage };
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.error || 'Failed to translate message');
  }
});

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveChat: (state, action: PayloadAction<string | null>) => {
      state.activeChatId = action.payload;
      if (action.payload) {
        const chat = state.chats.find(c => c.id === action.payload);
        if (chat) {
          chat.unreadCount = 0;
        }
      }
    },
    setTypingStatus: (state, action: PayloadAction<{ chatId: string; userId: string; isTyping: boolean }>) => {
      const { chatId, userId, isTyping } = action.payload;
      if (!state.typingUsers[chatId]) {
        state.typingUsers[chatId] = [];
      }
      if (isTyping && !state.typingUsers[chatId].includes(userId)) {
        state.typingUsers[chatId].push(userId);
      } else if (!isTyping) {
        state.typingUsers[chatId] = state.typingUsers[chatId].filter(id => id !== userId);
      }
    },
    addChat: (state, action: PayloadAction<Chat>) => {
      const newChat = action.payload;
      
      // If it's a private chat, ensure we don't have an old ghost chat with the same user
      if (newChat.type === 'PRIVATE') {
        const otherUserId = newChat.participants.find(p => p.userId !== state.activeChatId)?.[0]?.userId; // We don't have current user ID here easily, let's just find the exact matching participants array
        // Actually, a simpler way: find if there's any PRIVATE chat that has the exact same set of participant userIds.
        const newUserIds = newChat.participants.map(p => p.userId).sort().join(',');
        
        state.chats = state.chats.filter(c => {
          if (c.type === 'PRIVATE') {
            const existingUserIds = c.participants.map(p => p.userId).sort().join(',');
            return existingUserIds !== newUserIds; // Keep it only if participants differ
          }
          return true; // Keep all group/channel chats
        });
      }

      const exists = state.chats.some(c => c.id === newChat.id);
      if (!exists) {
        state.chats.unshift(newChat);
      }
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      const msg = action.payload;
      if (!state.messages[msg.chatId]) {
        state.messages[msg.chatId] = [];
      }
      
      // If this is a real message, remove any optimistic temp message that matches
      if (!msg.id.startsWith('temp-')) {
        state.messages[msg.chatId] = state.messages[msg.chatId].filter(
          m => !(m.id.startsWith('temp-') && m.content === msg.content && m.senderId === msg.senderId)
        );
      }

      const exists = state.messages[msg.chatId].some(m => m.id === msg.id);
      if (!exists) {
        state.messages[msg.chatId].push(msg);
      }
    },
    updateMessage: (state, action: PayloadAction<Message>) => {
      const msg = action.payload;
      if (state.messages[msg.chatId]) {
        const index = state.messages[msg.chatId].findIndex(m => m.id === msg.id);
        if (index !== -1) {
          state.messages[msg.chatId][index] = msg;
        }
      }
    },
    deleteMessage: (state, action: PayloadAction<{ chatId: string; messageId: string }>) => {
      const { chatId, messageId } = action.payload;
      if (state.messages[chatId]) {
        const msg = state.messages[chatId].find(m => m.id === messageId);
        if (msg) {
          msg.isDeleted = true;
          msg.content = 'This message was deleted';
          msg.reactions = []; // Clear reactions on delete
        }
      }
    },
    updateMessageReceipt: (state, action: PayloadAction<{ chatId: string; messageId: string; status: 'DELIVERED' | 'READ' }>) => {
      const { chatId, messageId, status } = action.payload;
      if (state.messages[chatId]) {
        const msg = state.messages[chatId].find(m => m.id === messageId);
        if (msg) msg.status = status;
      }
    },
    updateChatLatestMessage: (state, action: PayloadAction<{ chatId: string; lastMessage: Message; currentUserId?: string; forceIncrement?: boolean }>) => {
      const { chatId, lastMessage, currentUserId, forceIncrement } = action.payload;
      const chatIndex = state.chats.findIndex(c => c.id === chatId);
      
      if (chatIndex !== -1) {
        // Move chat to top
        const [chat] = state.chats.splice(chatIndex, 1);
        chat.lastMessage = lastMessage;
        chat.updatedAt = lastMessage.createdAt; // Bump sort
        
        // Increment unread count if it's not the active chat and we didn't send the message
        if ((state.activeChatId !== chatId && lastMessage.senderId !== currentUserId) || forceIncrement) {
          chat.unreadCount = (chat.unreadCount || 0) + 1;
        }

        state.chats.unshift(chat);
      } else if (forceIncrement) {
         // If it's still somehow not found (race condition), we can't do much here, but fetchChats should have populated it.
      }
    },
    updateChat: (state, action: PayloadAction<{ chatId: string; updates: Partial<Chat> }>) => {
      const { chatId, updates } = action.payload;
      const chat = state.chats.find(c => c.id === chatId);
      if (chat) {
        Object.assign(chat, updates);
      }
    },
    updateUserStatus: (state, action: PayloadAction<{ userId: string; status: string; lastSeen?: string }>) => {
      state.chats.forEach(chat => {
        const participant = chat.participants.find(p => p.userId === action.payload.userId);
        if (participant && participant.user) {
          participant.user.status = action.payload.status;
          // if (action.payload.lastSeen) participant.user.lastSeen = action.payload.lastSeen;
        }
      });
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchChats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.chats = action.payload;
      })
      .addCase(fetchChats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchMessages.pending, (state) => {
        state.isMessagesLoading = true;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        const { chatId, messages } = action.payload;
        state.isMessagesLoading = false;
        // Sort by createdAt asc to append at the bottom
        state.messages[chatId] = messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      })
      .addCase(fetchMessages.rejected, (state) => {
        state.isMessagesLoading = false;
      })
      .addCase(translateMessage.fulfilled, (state, action) => {
        const { chatId, messageId, translations, detectedLanguage } = action.payload;
        if (state.messages[chatId]) {
          const msg = state.messages[chatId].find(m => m.id === messageId);
          if (msg) {
            msg.translations = translations;
            msg.detectedLanguage = detectedLanguage;
          }
        }
      });
  },
});

export const { 
  setActiveChat, 
  addMessage, 
  updateMessage,
  deleteMessage,
  addChat, 
  setTypingStatus,
  updateMessageReceipt,
  updateChatLatestMessage,
  updateChat,
  updateUserStatus
} = chatSlice.actions;
export default chatSlice.reducer;
