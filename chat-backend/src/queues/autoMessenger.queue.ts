// src/queues/autoMessenger.queue.ts
// BullMQ queue for AI Auto Messenger message processing.

import { Queue, Worker, Job } from 'bullmq';
import { bullRedisConnection } from '../config/bullmq';
import { prisma } from '../config/prisma';
import { generateReply, isInSleepWindow } from '../ai/replyEngine';
import { getIO } from '../sockets/socket.server';
import { notificationQueue } from './notification.queue';
import { invalidateSummary } from '../ai/memory';

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

export function startAutoMessengerWorker() {
  const worker = new Worker<AutoMessengerJobData>(
    'auto-messenger',
    async (job: Job<AutoMessengerJobData>) => {
      const startedAt = Date.now();
      const { chatId, senderId, content, ownerId, configId, incomingMessageId } = job.data;

      // CRITICAL: Skip if the sender is the config owner themselves
      // This prevents the AI from replying to its own user's outgoing messages
      if (senderId === ownerId) {
        console.log(`[AutoMessenger] Sender is the owner — skipping to prevent self-reply loop`);
        return;
      }

      // Skip if the incoming message was AI-generated (anti-loop)
      const wasIncomingAiGenerated = await prisma.aIMessageLog.findFirst({
        where: { messageId: incomingMessageId }
      });
      if (wasIncomingAiGenerated) {
        console.log(`[AutoMessenger] Incoming message was AI generated — skipping`);
        return;
      }

      const config = await prisma.autoMessengerConfig.findUnique({
        where: { id: configId },
        include: { user: { select: { username: true } } },
      });

      if (!config || !config.isEnabled) {
        console.log(`[AutoMessenger] Config disabled or missing — skipping job ${job.id}`);
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

      if (contactParticipant && !contactParticipant.hasAccepted) {
        const io = getIO();
        io.to(chatId).emit('typing_start', { chatId, userId: ownerId });
        await sleep(2000);
        io.to(chatId).emit('typing_stop', { chatId, userId: ownerId });
        await sendAIMessage(
          ownerId,
          chatId,
          "I'm in offline mode. Once I'm back online, I'll get back to you soon 🙂"
        );
        return;
      }

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
            await sendAIMessage(ownerId, chatId, 'Currently unavailable. Will respond later 🌙');
          }
          return;
        }
      }

      if (config.mode === 'DRAFT_ONLY') {
        const draftResult = await generateReply({
          incomingMessage: content,
          chatId,
          ownerId,
          contactId: senderId,
          ownerUsername: config.user.username,
          contactUsername: contact.username,
          personality: config.personality,
          customPrompt: config.customPrompt ?? undefined,
        });

        await prisma.approvalRequest.create({
          data: {
            configId,
            userId: ownerId,
            chatId,
            incomingMsg: content,
            aiDraft: draftResult.reply,
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
        customPrompt: config.customPrompt ?? undefined,
      });

      if (result.needsApproval) {
        const approval = await prisma.approvalRequest.create({
          data: {
            configId,
            userId: ownerId,
            chatId,
            incomingMsg: content,
            aiDraft: result.reply,
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
        await sendAIMessage(ownerId, chatId, result.reply);

        await notificationQueue.add('send-push', {
          userId: ownerId,
          title: `⚠️ Approval Needed — ${getRiskLabel(result.classification.risk)}`,
          body: `${contact.username}: "${content.slice(0, 60)}"`,
          data: {
            type: 'APPROVAL_REQUEST',
            chatId,
            approvalId: approval.id,
          },
        });

        try {
          getIO().to(ownerId).emit('approval_request', {
            approvalId: approval.id,
            chatId,
            contactUsername: contact.username,
            incomingMsg: content,
            aiDraft: result.reply,
            riskType: result.classification.risk,
            confidence: result.confidence,
            expiresAt: approval.expiresAt,
          });
        } catch { /* ignore if user offline */ }

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
            processingMs: Date.now() - startedAt,
          },
        });

        return;
      }

      const io = getIO();
      io.to(chatId).emit('typing_start', { chatId, userId: ownerId });
      await sleep(result.typingDelayMs);
      io.to(chatId).emit('typing_stop', { chatId, userId: ownerId });

      const sentMessage = await sendAIMessage(ownerId, chatId, result.reply);

      await prisma.aIMessageLog.create({
        data: {
          userId: ownerId,
          chatId,
          messageId: sentMessage?.id,
          incomingMsg: content,
          aiReply: result.reply,
          riskType: result.classification.risk as any,
          confidence: result.confidence,
          wasAutoSent: true,
          personality: config.personality,
          processingMs: Date.now() - startedAt,
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
    MONEY: 'Financial Request',
    COMMITMENT: 'Commitment Request',
    EMERGENCY: 'Urgent Message',
    SENSITIVE: 'Sensitive Request',
  };
  return labels[risk] || 'AI Needs Assistance';
}

async function sendAIMessage(ownerId: string, chatId: string, content: string) {
  try {
    const message = await prisma.message.create({
      data: {
        chatId,
        senderId: ownerId,
        type: 'TEXT',
        content,
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
          lastMessage: { ...message, status: 'SENT' },
        });
      });
    } catch { /* socket may not be available */ }

    return message;
  } catch (err) {
    console.error('[AutoMessenger] Failed to send AI message:', (err as Error).message);
    return null;
  }
}
