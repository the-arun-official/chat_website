import { prisma } from '../config/prisma';
import { MessageType, ReceiptStatus } from '@prisma/client';

export class MessageRepository {
  async createMessage(chatId: string, senderId: string, content: string, type: MessageType = 'TEXT', parentMessageId?: string) {
    return prisma.message.create({
      data: {
        chatId,
        senderId,
        content,
        type,
        parentMessageId
      },
      include: {
        sender: { select: { id: true, username: true, avatarUrl: true } },
        parentMessage: { select: { id: true, content: true, senderId: true } },
        attachments: true
      }
    });
  }

  async getMessagesByChat(chatId: string, cursor?: string, limit: number = 50) {
    return prisma.message.findMany({
      where: { chatId },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, username: true, avatarUrl: true } },
        parentMessage: { 
          select: { id: true, content: true, senderId: true, sender: { select: { username: true } } }
        },
        attachments: true,
        reactions: { include: { user: { select: { id: true, username: true } } } },
        statuses: true
      }
    });
  }

  async getMessageById(messageId: string) {
    return prisma.message.findUnique({
      where: { id: messageId },
      include: { chat: { select: { id: true } } } 
    });
  }

  async editMessage(messageId: string, content: string) {
    return prisma.message.update({
      where: { id: messageId },
      data: { content, isEdited: true },
      include: {
        sender: { select: { id: true, username: true, avatarUrl: true } },
        parentMessage: { 
          select: { id: true, content: true, senderId: true, sender: { select: { username: true } } }
        },
        attachments: true,
        reactions: { include: { user: { select: { id: true, username: true } } } }
      }
    });
  }

  async softDeleteMessage(messageId: string) {
    return prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true, content: null },
      include: {
        sender: { select: { id: true, username: true, avatarUrl: true } },
        parentMessage: { 
          select: { id: true, content: true, senderId: true, sender: { select: { username: true } } }
        },
        attachments: true,
        reactions: { include: { user: { select: { id: true, username: true } } } }
      }
    });
  }

  async toggleReaction(messageId: string, userId: string, emoji: string) {
    const existing = await prisma.reaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId, emoji } }
    });

    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.reaction.create({ data: { messageId, userId, emoji } });
    }

    // Return the updated message with all reactions
    return prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, username: true, avatarUrl: true } },
        parentMessage: { 
          select: { id: true, content: true, senderId: true, sender: { select: { username: true } } }
        },
        attachments: true,
        reactions: { include: { user: { select: { id: true, username: true } } } }
      }
    });
  }

  async markMessageAsRead(messageId: string, userId: string) {
    return prisma.messageStatus.upsert({
      where: { messageId_userId: { messageId, userId } },
      update: { status: ReceiptStatus.READ, timestamp: new Date() },
      create: { messageId, userId, status: ReceiptStatus.READ, timestamp: new Date() }
    });
  }
}
