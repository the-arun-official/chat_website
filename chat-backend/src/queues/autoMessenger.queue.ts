// src/queues/autoMessenger.queue.ts
// BullMQ queue for AI Auto Messenger message processing.

import { Queue, Worker, Job } from 'bullmq';
import { Prisma } from '@prisma/client';
import { bullRedisConnection } from '../config/bullmq';
import { prisma } from '../config/prisma';
import { generateReply, isInSleepWindow } from '../ai/replyEngine';
import { getIO } from '../sockets/socket.server';
import { notificationQueue } from './notification.queue';
import { invalidateSummary } from '../ai/memory';
import { AutoReplyRuleService } from '../models/autoReplyRule';

export const autoMessengerQueue = new Queue('auto-messenger', {
  connection: bullRedisConnection as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 200 },
  },
});

export interface AutoMessengerJobData {
  incomingMessageId: string;
  chatId: string;
  senderId: string;
  content: string;
  ownerId: string;
  configId: string;
}

interface AIMessageMetadata {
  personality?: string;
  languageVariant?: string;
  source?: string;
  confidence?: number;
}

async function checkAutoReplyRules(message: string, chatId: string, ownerId: string) {
  const rules = await prisma.autoReplyRule.findMany({
    where: { userId: ownerId, chatId, enabled: true },
    orderBy: { priority: 'desc' },
  });

  if (rules.length === 0) return null;

  const matched = AutoReplyRuleService.matchMessage(message, rules);
  if (!matched) return null;

  if (matched.responseType === 'FIXED' && matched.fixedResponse) {
    return { reply: matched.fixedResponse, source: 'RULE' as const };
  }

  if (matched.responseType === 'AI_ENHANCED') {
    return { reply: null, source: 'AI_ENHANCED' as const, rule: matched };
  }

  return null;
}

export function startAutoMessengerWorker() {
  const worker = new Worker<AutoMessengerJobData>(
    'auto-messenger',
    async (job: Job<AutoMessengerJobData>) => {
      const startedAt = Date.now();
      const { chatId, senderId, ownerId, configId, incomingMessageId } = job.data;
      const content = job.data.content ?? '';

      if (!content.trim()) {
        console.log(`[AutoMessenger] Empty message content — skipping job ${job.id}`);
        return;
      }

      if (senderId === ownerId) {
        console.log(`[AutoMessenger] Sender is the owner — skipping to prevent self-reply loop`);
        return;
      }

      const wasIncomingAiGenerated = await prisma.aIMessageLog.findFirst({
        where: { messageId: incomingMessageId },
      });
      if (wasIncomingAiGenerated) {
        console.log(`[AutoMessenger] Incoming message was AI generated — skipping`);
        return;
      }

      const contact = await prisma.user.findUnique({
        where: { id: senderId },
        select: { username: true, isBot: true },
      });

      if (!contact) return;

      const contactParticipant = await prisma.chatParticipant.findUnique({
        where: { chatId_userId: { chatId, userId: senderId } },
      });

      // ── PHASE 5: Auto-reply to new chat requests (pre-acceptance) ──
      // If contact hasn't accepted the chat yet, send a greeting auto-reply (even if AI is OFF)
      if (contactParticipant && !contactParticipant.hasAccepted) {
        try {
          // Get or create pending chat reply config for owner
          let pendingReply = await prisma.pendingChatReply.findUnique({
            where: { userId: ownerId },
          });

          // Create default on first encounter
          if (!pendingReply) {
            pendingReply = await prisma.pendingChatReply.create({
              data: {
                userId: ownerId,
                message: "Hey! 👋 Thanks for reaching out. The boss will get back to you soon!",
              },
            });
          }

          // Check if greeting was already sent for this chat (idempotency)
          const existingGreeting = await prisma.message.findFirst({
            where: {
              chatId,
              senderId: ownerId,
              isAI: true,
              content: pendingReply.message,
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Within last 24 hours
              },
            },
          });

          if (!existingGreeting) {
            const io = getIO();
            io.to(chatId).emit('typing_start', { chatId, userId: ownerId });
            await sleep(1500);
            io.to(chatId).emit('typing_stop', { chatId, userId: ownerId });

            const sentMessage = await sendAIMessage(ownerId, chatId, pendingReply.message, {
              personality: 'FRIENDLY',
              source: 'PENDING_GREETING',
            });

            if (sentMessage) {
              await prisma.aIMessageLog.create({
                data: {
                  userId: ownerId,
                  chatId,
                  messageId: sentMessage.id,
                  incomingMsg: content,
                  aiReply: pendingReply.message,
                  riskType: 'SAFE' as any,
                  confidence: 1,
                  wasAutoSent: true,
                  personality: 'FRIENDLY',
                  processingMs: Date.now() - startedAt,
                  source: 'PENDING_GREETING',
                },
              });
            }
          }

          console.log(`[AutoMessenger] Pending greeting sent or already exists for ${chatId}`);
          return;
        } catch (err) {
          console.error('[AutoMessenger] Failed to send pending greeting:', (err as Error).message);
          return;
        }
      }

      const config = await prisma.autoMessengerConfig.findUnique({
        where: { id: configId },
        include: { user: { select: { username: true } } },
      });

      if (!config || !config.isEnabled) {
        console.log(`[AutoMessenger] Config disabled or missing — skipping job ${job.id}`);
        return;
      }

      // ── PHASE 10: VIP Contacts — always ask for approval ──
      const vipContacts = config.vipContacts as string[] || [];
      const isVIP = vipContacts.includes(contact.username);

      if (contact.isBot) {
        console.log(`[AutoMessenger] Sender is a bot — skipping to prevent loop`);
        return;
      }

      if (config.sleepStart && config.sleepEnd) {
        if (isInSleepWindow(config.sleepStart, config.sleepEnd, config.timezone)) {
          const sleepKey = `auto:sleep:${chatId}:${ownerId}`;
          const alreadySent = await bullRedisConnection.get(sleepKey);
          if (!alreadySent) {
            await bullRedisConnection.setex(sleepKey, 3600, '1');
            const io = getIO();
            io.to(chatId).emit('typing_start', { chatId, userId: ownerId });
            await sleep(2000);
            io.to(chatId).emit('typing_stop', { chatId, userId: ownerId });
            await sendAIMessage(ownerId, chatId, 'Currently unavailable. Will respond later 🌙', {
              personality: config.personality,
              source: 'SLEEP',
            });
          }
          return;
        }
      }

      const ruleMatch = await checkAutoReplyRules(content, chatId, ownerId);

      if (ruleMatch && ruleMatch.source === 'RULE') {
        const io = getIO();
        io.to(chatId).emit('typing_start', { chatId, userId: ownerId });
        await sleep(1500);
        io.to(chatId).emit('typing_stop', { chatId, userId: ownerId });

        const sentMessage = await sendAIMessage(ownerId, chatId, ruleMatch.reply, {
          personality: config.personality,
          source: 'RULE',
        });

        await prisma.aIMessageLog.create({
          data: {
            userId: ownerId,
            chatId,
            messageId: sentMessage?.id,
            incomingMsg: content,
            aiReply: ruleMatch.reply,
            riskType: 'SAFE' as any,
            confidence: 1,
            wasAutoSent: true,
            personality: config.personality,
            processingMs: Date.now() - startedAt,
            source: 'RULE',
          },
        });

        await invalidateSummary(ownerId, chatId);
        return;
      }

      const enhancedPrompt =
        ruleMatch?.source === 'AI_ENHANCED' && ruleMatch.rule?.aiPromptEnhancement
          ? `${config.customPrompt || ''}\n${ruleMatch.rule.aiPromptEnhancement}`.trim()
          : config.customPrompt ?? undefined;

      if (config.mode === 'DRAFT_ONLY') {
        const draftResult = await generateReply({
          incomingMessage: content,
          chatId,
          ownerId,
          contactId: senderId,
          ownerUsername: config.user.username,
          contactUsername: contact.username,
          personality: config.personality,
          customPrompt: enhancedPrompt,
        });

        await prisma.approvalRequest.create({
          data: {
            configId,
            userId: ownerId,
            chatId,
            incomingMsg: content,
            aiDraft: draftResult.draftReply,
            riskType: draftResult.classification.risk as any,
            confidence: draftResult.confidence,
            status: 'PENDING',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          },
        });

        await notificationQueue.add('send-push', {
          userId: ownerId,
          title: '✍️ AI Draft Ready',
          body: `${contact.username}: ${content.slice(0, 60)}`,
          data: { type: 'DRAFT_READY', chatId },
        });

        return;
      }

      const result = await generateReply({
        incomingMessage: content,
        chatId,
        ownerId,
        contactId: senderId,
        ownerUsername: config.user.username,
        contactUsername: contact.username,
        personality: config.personality,
        customPrompt: enhancedPrompt,
      });

      // VIP contacts always need approval
      if (isVIP || result.needsApproval) {
        const approval = await prisma.approvalRequest.create({
          data: {
            configId,
            userId: ownerId,
            chatId,
            incomingMsg: content,
            aiDraft: result.draftReply,
            riskType: result.classification.risk as any,
            confidence: result.confidence,
            status: 'PENDING',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          },
        });

        const io = getIO();
        io.to(chatId).emit('typing_start', { chatId, userId: ownerId });
        await sleep(result.typingDelayMs);
        io.to(chatId).emit('typing_stop', { chatId, userId: ownerId });
        await sendAIMessage(ownerId, chatId, result.reply, {
          personality: config.personality,
          languageVariant: result.languageVariant,
          source: isVIP ? 'VIP_HOLD' : 'HOLDING',
          confidence: result.confidence,
        });

        await notificationQueue.add('send-push', {
          userId: ownerId,
          title: `⚠️ Approval Needed — ${isVIP ? 'VIP Contact' : getRiskLabel(result.classification.risk)}`,
          body: `${contact.username}: "${content.slice(0, 60)}"`,
          data: { type: 'APPROVAL_REQUEST', chatId, approvalId: approval.id },
        });

        try {
          getIO().to(ownerId).emit('approval_request', {
            approvalId: approval.id,
            chatId,
            contactUsername: contact.username,
            incomingMsg: content,
            aiDraft: result.draftReply,
            riskType: result.classification.risk,
            confidence: result.confidence,
            expiresAt: approval.expiresAt,
            isVIP,
          });
        } catch { /* ignore */ }

        await prisma.aIMessageLog.create({
          data: {
            userId: ownerId,
            chatId,
            incomingMsg: content,
            aiReply: result.reply,
            riskType: result.classification.risk as any,
            confidence: result.confidence,
            wasAutoSent: true,
            personality: config.personality,
            language: result.languageVariant,
            processingMs: Date.now() - startedAt,
            source: isVIP ? 'VIP_HOLD' : 'HOLDING',
          },
        });

        return;
      }

      const io = getIO();
      io.to(chatId).emit('typing_start', { chatId, userId: ownerId });
      await sleep(result.typingDelayMs);
      io.to(chatId).emit('typing_stop', { chatId, userId: ownerId });

      const sentMessage = await sendAIMessage(ownerId, chatId, result.draftReply, {
        personality: config.personality,
        languageVariant: result.languageVariant,
        source: 'PRIMARY',
        confidence: result.confidence,
      });

      await prisma.aIMessageLog.create({
        data: {
          userId: ownerId,
          chatId,
          messageId: sentMessage?.id,
          incomingMsg: content,
          aiReply: result.draftReply,
          riskType: result.classification.risk as any,
          confidence: result.confidence,
          wasAutoSent: true,
          personality: config.personality,
          language: result.languageVariant,
          processingMs: Date.now() - startedAt,
          source: 'PRIMARY',
        },
      });

      await invalidateSummary(ownerId, chatId);
    },
    {
      connection: bullRedisConnection as any,
      concurrency: 10,
      lockDuration: 30000,
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[AutoMessenger] Job ${job?.id} failed:`, err.message);
  });

  worker.on('completed', (job) => {
    console.log(`[AutoMessenger] Job ${job.id} completed`);
  });

  return worker;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRiskLabel(risk: string): string {
  const labels: Record<string, string> = {
    SCHEDULING: 'Meeting Request',
    MEETING: 'Meeting Request',
    MONEY: 'Financial Request',
    PAYMENT: 'Financial Request',
    COMMITMENT: 'Commitment Request',
    EMERGENCY: 'Urgent Message',
    SENSITIVE: 'Sensitive Request',
  };
  return labels[risk] || 'AI Needs Assistance';
}

async function sendAIMessage(
  ownerId: string,
  chatId: string,
  content: string,
  metadata?: AIMessageMetadata
) {
  try {
    const message = await prisma.message.create({
      data: {
        chatId,
        senderId: ownerId,
        type: 'TEXT',
        content,
        isAI: true,
        aiMetadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
      },
      include: { sender: { select: { username: true, id: true } } },
    });

    await prisma.chatParticipant.updateMany({
      where: { chatId, userId: { not: ownerId } },
      data: { unreadCount: { increment: 1 } },
    });

    try {
      getIO().to(chatId).emit('new_message', { ...message, status: 'SENT', isAI: true });

      const participants = await prisma.chatParticipant.findMany({
        where: { chatId },
        select: { userId: true },
      });
      participants.forEach((p) => {
        getIO().to(p.userId).emit('chat_updated', {
          chatId,
          lastMessage: { ...message, status: 'SENT', isAI: true },
        });
      });
    } catch { /* socket may not be available */ }

    return message;
  } catch (err) {
    console.error('[AutoMessenger] Failed to send AI message:', (err as Error).message);
    return null;
  }
}
