// src/services/autoMessenger.service.ts
// Business logic for all Auto Messenger API operations.

import { prisma } from '../config/prisma';
import {
  AutoMessengerMode,
  PersonalityType,
  AutoReplyTriggerType,
  AutoReplyResponseType,
} from '@prisma/client';
import { learnUserStyle } from '../ai/memory';
import { getIO } from '../sockets/socket.server';
import { AutoReplyRuleCreate, AutoReplyRuleService } from '../models/autoReplyRule';

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

  private async assertPrivateChatMember(userId: string, chatId: string) {
    const participant = await prisma.chatParticipant.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });
    if (!participant) throw new Error('You are not a member of this chat');

    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (chat?.type !== 'PRIVATE') throw new Error('Auto Messenger is only available for private chats');
  }

  async getRules(userId: string, chatId: string) {
    await this.assertPrivateChatMember(userId, chatId);
    return prisma.autoReplyRule.findMany({
      where: { userId, chatId },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createRule(userId: string, chatId: string, data: AutoReplyRuleCreate) {
    await this.assertPrivateChatMember(userId, chatId);

    if (data.triggerType === 'PATTERN' && !AutoReplyRuleService.validatePattern(data.triggerValue)) {
      throw new Error('Invalid regex pattern');
    }
    if (data.responseType === 'FIXED' && !data.fixedResponse?.trim()) {
      throw new Error('fixedResponse is required for FIXED response type');
    }

    return prisma.autoReplyRule.create({
      data: {
        userId,
        chatId,
        triggerType: data.triggerType as AutoReplyTriggerType,
        triggerValue: data.triggerValue,
        responseType: data.responseType as AutoReplyResponseType,
        fixedResponse: data.fixedResponse,
        aiPromptEnhancement: data.aiPromptEnhancement,
        caseSensitive: data.caseSensitive ?? false,
        priority: data.priority ?? 5,
        enabled: data.enabled ?? true,
      },
    });
  }

  async updateRule(
    userId: string,
    chatId: string,
    ruleId: string,
    data: Partial<AutoReplyRuleCreate> & { enabled?: boolean }
  ) {
    await this.assertPrivateChatMember(userId, chatId);

    const existing = await prisma.autoReplyRule.findFirst({
      where: { id: ruleId, userId, chatId },
    });
    if (!existing) throw new Error('Rule not found');

    if (data.triggerValue && data.triggerType === 'PATTERN') {
      if (!AutoReplyRuleService.validatePattern(data.triggerValue)) {
        throw new Error('Invalid regex pattern');
      }
    } else if (data.triggerValue && existing.triggerType === 'PATTERN') {
      if (!AutoReplyRuleService.validatePattern(data.triggerValue)) {
        throw new Error('Invalid regex pattern');
      }
    }

    return prisma.autoReplyRule.update({
      where: { id: ruleId },
      data: {
        ...(data.triggerType !== undefined && { triggerType: data.triggerType as AutoReplyTriggerType }),
        ...(data.triggerValue !== undefined && { triggerValue: data.triggerValue }),
        ...(data.responseType !== undefined && { responseType: data.responseType as AutoReplyResponseType }),
        ...(data.fixedResponse !== undefined && { fixedResponse: data.fixedResponse }),
        ...(data.aiPromptEnhancement !== undefined && { aiPromptEnhancement: data.aiPromptEnhancement }),
        ...(data.caseSensitive !== undefined && { caseSensitive: data.caseSensitive }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.enabled !== undefined && { enabled: data.enabled }),
      },
    });
  }

  async deleteRule(userId: string, chatId: string, ruleId: string) {
    await this.assertPrivateChatMember(userId, chatId);

    const existing = await prisma.autoReplyRule.findFirst({
      where: { id: ruleId, userId, chatId },
    });
    if (!existing) throw new Error('Rule not found');

    await prisma.autoReplyRule.delete({ where: { id: ruleId } });
    return { success: true };
  }

  private async sendAsUser(userId: string, chatId: string, content: string) {
    const message = await prisma.message.create({
      data: {
        chatId,
        senderId: userId,
        type: 'TEXT',
        content,
        isAI: true,
        aiMetadata: { source: 'APPROVAL' } as object,
      },
    });

    await prisma.chatParticipant.updateMany({
      where: { chatId, userId: { not: userId } },
      data: { unreadCount: { increment: 1 } },
    });

    try {
      getIO().to(chatId).emit('new_message', { ...message, status: 'SENT', isAI: true });
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

  // ── PHASE 5: Pending Chat Reply (auto-reply for first-time contacts) ──
  async getPendingChatReply(userId: string) {
    let config = await prisma.pendingChatReply.findUnique({
      where: { userId },
    });

    // Create default if not exists
    if (!config) {
      config = await prisma.pendingChatReply.create({
        data: {
          userId,
          message: "Hey! 👋 Thanks for reaching out. The boss will get back to you soon!",
        },
      });
    }

    return config;
  }

  async updatePendingChatReply(userId: string, message: string) {
    if (!message?.trim()) {
      throw new Error('Message cannot be empty');
    }

    const config = await prisma.pendingChatReply.upsert({
      where: { userId },
      create: { userId, message },
      update: { message },
    });

    return config;
  }

  // ── PHASE 7: Daily Status ──
  async getDailyStatus(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return prisma.dailyStatus.findUnique({
      where: { userId },
    });
  }

  async setDailyStatus(userId: string, text: string, timezone: string = 'Asia/Kolkata') {
    if (text && text.length > 200) {
      throw new Error('Status message must be 200 characters or less');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const status = await prisma.dailyStatus.upsert({
      where: { userId },
      create: {
        userId,
        text: text || null,
        timezone,
        date: today,
      },
      update: {
        text: text || null,
        timezone,
        date: today,
      },
    });

    return status;
  }

  async clearDailyStatus(userId: string) {
    try {
      await prisma.dailyStatus.delete({
        where: { userId },
      });
      return { success: true };
    } catch {
      // Already deleted or doesn't exist
      return { success: true };
    }
  }

  // ── PHASE 10: VIP Contacts ──
  async getVIPContacts(userId: string, chatId: string) {
    const config = await this.getConfig(userId, chatId);
    if (!config) return [];
    return (config.vipContacts as string[]) || [];
  }

  async addVIPContact(userId: string, chatId: string, contactUsername: string) {
    const config = await this.getConfig(userId, chatId);
    if (!config) throw new Error('Config not found for this chat');

    const vipList = (config.vipContacts as string[]) || [];
    if (!vipList.includes(contactUsername)) {
      vipList.push(contactUsername);
    }

    return prisma.autoMessengerConfig.update({
      where: { id: config.id },
      data: { vipContacts: vipList },
    });
  }

  async removeVIPContact(userId: string, chatId: string, contactUsername: string) {
    const config = await this.getConfig(userId, chatId);
    if (!config) throw new Error('Config not found for this chat');

    const vipList = ((config.vipContacts as string[]) || []).filter(u => u !== contactUsername);

    return prisma.autoMessengerConfig.update({
      where: { id: config.id },
      data: { vipContacts: vipList.length > 0 ? vipList : undefined },
    });
  }
}
