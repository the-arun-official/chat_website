import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { pubClient, subClient } from '../config/redis';
import { socketAuthMiddleware } from './middlewares/auth.socket.middleware';
import { UserRepository } from '../repositories/user.repository';
import { MessageRepository } from '../repositories/message.repository';
import { ChatRepository } from '../repositories/chat.repository';

enum UserStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  AWAY = 'AWAY'
}

let ioInstance: Server | null = null;

export const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket.io is not initialized yet');
  }
  return ioInstance;
};

export class SocketServer {
  private io: Server;
  private userRepository: UserRepository;
  private messageRepository: MessageRepository;
  private chatRepository: ChatRepository;

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: '*', // For development. Should restrict to frontend URL in production
        methods: ['GET', 'POST']
      }
    });

    ioInstance = this.io;

    this.userRepository = new UserRepository();
    this.messageRepository = new MessageRepository();
    this.chatRepository = new ChatRepository();
    
    // Attach Redis Adapter for horizontal scaling (Pub/Sub)
    this.io.adapter(createAdapter(pubClient, subClient));

    // Apply authentication middleware
    this.io.use(socketAuthMiddleware);

    // Register event listeners
    this.io.on('connection', this.handleConnection);
  }

  private handleConnection = async (socket: Socket) => {
    const userId = socket.data.userId;
    console.log(`🔌 User connected: ${userId} (Socket: ${socket.id})`);

    // 1. Join a personal room for direct user-to-user events (e.g., getting a new message)
    socket.join(userId);

    // 2. Mark user as ONLINE in the Postgres Database
    await this.userRepository.updateProfile(userId, { status: UserStatus.ONLINE });

    // 3. Broadcast status to others
    socket.broadcast.emit('user_status_changed', { userId, status: UserStatus.ONLINE });

    // --- CHAT ROOM EVENTS ---
    
    // Join a specific chat room
    socket.on('join_chat', async (chatId: string) => {
      try {
        const participant = await this.chatRepository.getParticipant(chatId, userId);
        if (participant) {
          const chat = await this.chatRepository.getChatById(chatId);
          if (chat?.type === 'GROUP' && participant.hasAccepted === false) {
            console.log(`User ${userId} blocked from joining group chat room: ${chatId} (pending request)`);
            return;
          }
          socket.join(chatId);
          console.log(`User ${userId} joined chat room: ${chatId}`);
        }
      } catch (err) {
        console.error('Error joining chat room', err);
      }
    });

    // Typing Indicators
    socket.on('typing_start', (chatId: string) => {
      socket.to(chatId).emit('typing_start', { chatId, userId });
    });

    socket.on('typing_stop', (chatId: string) => {
      socket.to(chatId).emit('typing_stop', { chatId, userId });
    });

    // Read Receipts
    socket.on('mark_read', async (data: { messageId: string, chatId: string }) => {
      try {
        await this.messageRepository.markMessageAsRead(data.messageId, userId);
        // Broadcast to the chat room so the sender sees the read receipt
        socket.to(data.chatId).emit('receipt_updated', {
          messageId: data.messageId,
          userId,
          status: 'READ',
          chatId: data.chatId
        });
      } catch (err) {
        console.error('Error marking message as read', err);
      }
    });

    // --- DISCONNECT HANDLING ---
    socket.on('disconnect', async () => {
      console.log(`❌ User disconnected: ${userId} (Socket: ${socket.id})`);
      
      // Update DB to OFFLINE and record lastSeen timestamp
      await this.userRepository.updateProfile(userId, { 
        status: UserStatus.OFFLINE,
        lastSeen: new Date()
      });

      // Broadcast offline status
      socket.broadcast.emit('user_status_changed', { userId, status: UserStatus.OFFLINE, lastSeen: new Date() });
    });
  };
}
