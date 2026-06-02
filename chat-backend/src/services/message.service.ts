import { MessageRepository } from '../repositories/message.repository';
import { ChatRepository } from '../repositories/chat.repository';
import { MessageType } from '@prisma/client';
import { searchQueue } from '../queues/search.queue';
import { notificationQueue } from '../queues/notification.queue';
import { osClient } from '../config/opensearch';
import { getIO } from '../sockets/socket.server';
import { prisma } from '../config/prisma';

export class MessageService {
  private messageRepository: MessageRepository;
  private chatRepository: ChatRepository;

  constructor() {
    this.messageRepository = new MessageRepository();
    this.chatRepository = new ChatRepository();
  }

  async sendMessage(userId: string, chatId: string, data: { content?: string; type?: MessageType; parentMessageId?: string }) {
    // 1. Verify user belongs to the chat
    const isParticipant = await this.chatRepository.isUserInChat(chatId, userId);
    if (!isParticipant) throw new Error('You are not a participant in this chat');

    // 2. Enforce Message Request restrictions
    const chat = await this.chatRepository.getChatById(chatId);
    if (!chat) throw new Error('Chat not found');

    if (chat.type === 'PRIVATE') {
      const other = chat.participants.find((p: any) => p.userId !== userId);
      if (other) {
        // Check for blocks
        const block = await prisma.blockedUser.findFirst({
          where: {
            OR: [
              { blockerId: userId, blockedId: other.userId },
              { blockerId: other.userId, blockedId: userId }
            ]
          }
        });
        if (block) {
          throw new Error('Message cannot be sent because a user is blocked.');
        }

        if (!other.hasAccepted) {
          // Find how many messages I've already sent in this chat
          const myMessageCount = await prisma.message.count({
            where: { chatId, senderId: userId }
          });
          if (myMessageCount >= 1) {
            throw new Error('You can only send one message request until the user accepts.');
          }
        }
      }
    }

    // 3. Verify parent message exists if replying
    if (data.parentMessageId) {
      const parent = await this.messageRepository.getMessageById(data.parentMessageId);
      if (!parent || parent.chatId !== chatId) throw new Error('Invalid parent message');
    }

    // Unhide the chat for all participants so they can see the new message
    await this.chatRepository.unhideAllParticipants(chatId);
    
    // Increment unread count for everyone except the sender
    await this.chatRepository.incrementUnreadCounts(chatId, userId);

    // 4. Create message (Attachment handling would happen here in Phase 10)
    const message = await this.messageRepository.createMessage(
      chatId, 
      userId, 
      data.content || '', 
      data.type || 'TEXT', 
      data.parentMessageId
    );

    // Broadcast the new message instantly to all connected users in the chat room!
    const messageWithStatus = { ...message, status: 'SENT' };
    try {
      getIO().to(chatId).emit('new_message', messageWithStatus);
      
      // Also emit a global chat_updated to all participants' personal rooms
      if (chat) {
        chat.participants.forEach((p: any) => {
          if (chat.type === 'GROUP' && p.hasAccepted === false) return;
          
          getIO().to(p.userId).emit('chat_updated', {
            chatId,
            lastMessage: messageWithStatus
          });
        });
      }
    } catch (err) {
      console.error('Socket.io not initialized or failed to emit new_message', err);
    }

    // Fire-and-forget: queue the message for background indexing in OpenSearch
    if (message.type === 'TEXT') {
      searchQueue.add('index-message', {
        id: message.id,
        content: message.content,
        chatId: message.chatId,
        senderId: message.senderId,
        createdAt: message.createdAt
      }).catch(err => console.error('Failed to queue message for search', err));
    }

    // Fire-and-forget: queue push notifications for other participants
    if (chat) {
      chat.participants.forEach((participant: any) => {
        if (participant.userId !== userId) {
          if (chat.type === 'GROUP' && participant.hasAccepted === false) return;
          
          notificationQueue.add('send-push', {
            userId: participant.userId,
            title: 'New Message',
            body: message.type === 'TEXT' ? message.content : `Sent a ${message.type.toLowerCase()}`,
            data: { chatId: message.chatId, messageId: message.id }
          }).catch((err: any) => console.error('Failed to queue push notification', err));
        }
      });
    }

    return message;
  }

  async getMessages(userId: string, chatId: string, cursor?: string, limit: number = 50) {
    // 1. Verify access
    const participant = await this.chatRepository.getParticipant(chatId, userId);
    if (!participant) throw new Error('Access denied to this chat');

    const chat = await this.chatRepository.getChatById(chatId);
    if (chat?.type === 'GROUP' && participant.hasAccepted === false) {
      return []; // Pending group members cannot view chat history
    }

    // 2. Fetch with cursor pagination
    const messages = await this.messageRepository.getMessagesByChat(chatId, cursor, limit);
    
    // 3. Filter messages before hiddenAt and map statuses
    let filtered = messages;
    if (participant.hiddenAt) {
      filtered = messages.filter(m => new Date(m.createdAt) >= new Date(participant.hiddenAt!));
    }
    
    return filtered.map((m: any) => {
      const { statuses, ...rest } = m;
      let status = 'SENT';
      if (statuses && statuses.length > 0) {
        if (statuses.some((s: any) => s.status === 'READ')) status = 'READ';
        else if (statuses.some((s: any) => s.status === 'DELIVERED')) status = 'DELIVERED';
      }
      return { ...rest, status };
    });
  }

  async editMessage(userId: string, messageId: string, content: string) {
    const msg = await this.messageRepository.getMessageById(messageId);
    if (!msg) throw new Error('Message not found');
    
    // 1. Ownership & State checks
    if (msg.senderId !== userId) throw new Error('You can only edit your own messages');
    if (msg.isDeleted) throw new Error('Cannot edit a deleted message');
    if (msg.type !== MessageType.TEXT) throw new Error('Only text messages can be edited');

    // 2. Execute update
    return this.messageRepository.editMessage(messageId, content);
  }

  async deleteMessage(userId: string, messageId: string) {
    const msg = await this.messageRepository.getMessageById(messageId);
    if (!msg) throw new Error('Message not found');
    
    // 1. Ownership check
    if (msg.senderId !== userId) throw new Error('You can only delete your own messages');
    if (msg.isDeleted) throw new Error('Message is already deleted');

    // 2. Execute soft delete
    return this.messageRepository.softDeleteMessage(messageId);
  }

  async toggleReaction(userId: string, messageId: string, emoji: string) {
    const msg = await this.messageRepository.getMessageById(messageId);
    if (!msg) throw new Error('Message not found');
    return this.messageRepository.toggleReaction(messageId, userId, emoji);
  }

  async searchMessages(chatId: string, query: string) {
    try {
      const result = await osClient.search({
        index: 'chat-messages',
        body: {
          query: {
            bool: {
              must: [
                { match: { chatId } },
                { match: { content: query } }
              ]
            }
          },
          highlight: {
            fields: {
              content: {}
            }
          }
        }
      });
      
      return result.body.hits.hits.map((hit: any) => ({
        id: hit._id,
        ...hit._source,
        highlight: hit.highlight
      }));
    } catch (error: any) {
      if (error.message.includes('Connection') || error.meta?.statusCode === 502) {
        return { warning: 'Search engine is unavailable locally. OpenSearch must be running on port 9200.', results: [] };
      }
      throw error;
    }
  }
}
