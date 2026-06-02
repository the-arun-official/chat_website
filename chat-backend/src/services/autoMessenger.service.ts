// src/services/autoMessenger.service.ts
// Business logic for all Auto Messenger API operations.

import { prisma } from '../config/prisma';
import { AutoMessengerMode, PersonalityType } from '@prisma/client';
import { autoMessengerQueue } from '../queues/autoMessenger.queue';
import { learnUserStyle } from '../ai/memory';
import { getIO } from '../sockets/socket.server';

export class AutoMessengerService {
  async getConfig(userId: string, chatId: string) {
    return prisma.autoMessengerConfig.findUnique({
      where: { userId_chatId: { userId, chatId } },
    });
  }

  async upsertConfig(
    userId: string,
    chatId: string,
    data: {
      isEnabled?: boolean;
      mode?: AutoMessengerMode;
      personality?: PersonalityType;
      customPrompt?: string;
      sleepStart?: string;
      sleepEnd?: string;
      timezone?: string;
    }
  ) {
    const participant = await prisma.chatParticipant.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });
    if (!participant) throw new Error('You are not a member of this chat');

    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (chat?.type !== 'PRIVATE') throw new Error('Auto Messenger is only available for private chats');

    const config = await prisma.autoMessengerConfig.upsert({
      where: { userId_chatId: { userId, chatId } },
      create: { userId, chatId, ...data } as any,
      update: data,
    });

    if (typeof data.isEnabled === 'boolean') {
      try {
        getIO().to(chatId).emit('auto_messenger_status_changed', {
          chatId,
          userId,
          isEnabled: config.isEnabled,
        });
      } catch { /* ignore */ }
    }

    return config;
  }

  async getAllConfigs(userId: string) {
    return prisma.autoMessengerConfig.findMany({
      where: { userId },
      include: {
        chat: {
          include: {
            participants: {
              where: { userId: { not: userId } },
              include: { user: { select: { username: true, fullName: true, avatarUrl: true } } },
            },
          },
        },
      },
    });
  }

  async getPendingApprovals(userId: string) {
    await prisma.approvalRequest.updateMany({
      where: {
        userId,
        status: 'PENDING',
        expiresAt: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });

    return prisma.approvalRequest.findMany({
      where: { userId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveApproval(
    userId: string,
    approvalId: string,
    action: 'APPROVED' | 'REJECTED' | 'CUSTOM_REPLIED',
    customReply?: string
  ) {
    const approval = await prisma.approvalRequest.findUnique({
      where: { id: approvalId },
    });

    if (!approval) throw new Error('Approval request not found');
    if (approval.userId !== userId) throw new Error('Not authorized');
    if (approval.status !== 'PENDING') throw new Error('Approval already resolved');

    const updated = await prisma.approvalRequest.update({
      where: { id: approvalId },
      data: {
        status: action,
        customReply: action === 'CUSTOM_REPLIED' ? customReply : null,
        resolvedAt: new Date(),
      },
    });

    if (action === 'APPROVED') {
      await this.sendAsUser(userId, approval.chatId, approval.aiDraft);
    } else if (action === 'CUSTOM_REPLIED' && customReply) {
      await this.sendAsUser(userId, approval.chatId, customReply);
    }

    try {
      getIO().to(userId).emit('approval_resolved', { approvalId, action });
    } catch { /* ignore */ }

    return updated;
  }

  private async sendAsUser(userId: string, chatId: string, content: string) {
    const message = await prisma.message.create({
      data: { chatId, senderId: userId, type: 'TEXT', content },
    });

    await prisma.chatParticipant.updateMany({
      where: { chatId, userId: { not: userId } },
      data: { unreadCount: { increment: 1 } },
    });

    try {
      getIO().to(chatId).emit('new_message', { ...message, status: 'SENT' });
    } catch { /* ignore */ }

    return message;
  }

  async getAnalytics(userId: string, days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [total, autoSent, pending, byRisk] = await Promise.all([
      prisma.aIMessageLog.count({ where: { userId, createdAt: { gte: since } } }),
      prisma.aIMessageLog.count({ where: { userId, wasAutoSent: true, createdAt: { gte: since } } }),
      prisma.approvalRequest.count({ where: { userId, status: 'PENDING' } }),
      prisma.aIMessageLog.groupBy({
        by: ['riskType'],
        _count: { id: true },
        where: { userId, createdAt: { gte: since } },
      }),
    ]);

    const avgProcessingMs = await prisma.aIMessageLog.aggregate({
      _avg: { processingMs: true },
      where: { userId, createdAt: { gte: since } },
    });

    return {
      period: `${days}d`,
      totalMessages: total,
      autoSent,
      pendingApprovals: pending,
      byRisk,
      avgResponseMs: Math.round(avgProcessingMs._avg.processingMs ?? 0),
    };
  }

  async triggerStyleLearning(userId: string) {
    const style = await learnUserStyle(userId);
    return style;
  }

  async getContactMemory(userId: string, contactId: string) {
    return prisma.contactMemory.findUnique({
      where: { userId_contactId: { userId, contactId } },
    });
  }

  async updateContactMemory(
    userId: string,
    contactId: string,
    memoryBlob: Record<string, any>
  ) {
    return prisma.contactMemory.upsert({
      where: { userId_contactId: { userId, contactId } },
      create: { userId, contactId, memoryBlob },
      update: { memoryBlob },
    });
  }
}
