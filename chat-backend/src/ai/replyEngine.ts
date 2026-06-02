// src/ai/replyEngine.ts
// Generates AI replies using multi-provider fallback system.

import { buildSystemPrompt, PersonalityContext, calculateTypingDelay } from './personality';
import { classifyMessage, ClassificationResult } from './classifier';
import { getUserStyle, getContactMemory, getOrBuildSummary } from './memory';
import { prisma } from '../config/prisma';
import { PersonalityType } from './personality';
import { createProviderManager } from './providers';
import {
  detectLanguageVariant,
  buildLanguagePrompt,
  validateLanguageMatch,
} from './languageDetector';

let providerManager = createProviderManager();

export const AI_SENDER_MARKER = '__AI_AUTO__';

export interface ReplyEngineInput {
  incomingMessage: string;
  chatId: string;
  ownerId: string;
  contactId: string;
  ownerUsername: string;
  contactUsername: string;
  personality: PersonalityType;
  customPrompt?: string;
}

export interface ReplyEngineOutput {
  reply: string;
  draftReply: string;
  holdingReply?: string;
  classification: ClassificationResult;
  confidence: number;
  typingDelayMs: number;
  needsApproval: boolean;
  languageVariant?: string;
}

const REQUIRES_APPROVAL: ClassificationResult['risk'][] = [
  'EMERGENCY',
  'PAYMENT',
  'MEETING',
  'SENSITIVE',
];

const HOLDING_REPLIES: Record<string, string[]> = {
  MEETING: [
    "Let me check my schedule and get back to you!",
    "I'll confirm once I check — give me a moment 🙂",
    "Let me look into that and reply shortly.",
  ],
  PAYMENT: [
    "Noted! Let me sort that out and get back to you.",
    "I'll check on this and respond soon.",
  ],
  EMERGENCY: [
    "On it! Give me a moment.",
    "I'll get back to you very soon!",
  ],
  SENSITIVE: [
    "I can't share that right now — let me get back to you.",
    "That's something I'd need to handle separately. I'll reach out soon.",
  ],
};

function pickHoldingReply(risk: ClassificationResult['risk']): string {
  const options = HOLDING_REPLIES[risk] || ["I'll get back to you soon!"];
  return options[Math.floor(Math.random() * options.length)];
}

async function getRecentMessages(chatId: string, limit = 20) {
  const msgs = await prisma.message.findMany({
    where: { chatId, type: 'TEXT', isDeleted: false },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { sender: { select: { username: true, id: true } } },
  });
  return msgs.reverse();
}

export async function generateReply(input: ReplyEngineInput): Promise<ReplyEngineOutput> {
  const {
    incomingMessage,
    chatId,
    ownerId,
    contactId,
    ownerUsername,
    contactUsername,
    personality,
    customPrompt,
  } = input;

  const languageDetection = detectLanguageVariant(incomingMessage);
  const languagePrompt = buildLanguagePrompt(languageDetection, incomingMessage);

  const classification = await classifyMessage(incomingMessage);

  if (['EMERGENCY', 'SENSITIVE'].includes(classification.risk)) {
    const holdingReply = pickHoldingReply(classification.risk);
    return {
      reply: holdingReply,
      draftReply: holdingReply,
      holdingReply,
      classification,
      confidence: 1,
      typingDelayMs: calculateTypingDelay(holdingReply.length),
      needsApproval: true,
      languageVariant: languageDetection.variant,
    };
  }

  const [style, contactMemory, conversationSummary, recentMsgs] = await Promise.all([
    getUserStyle(ownerId),
    getContactMemory(ownerId, contactId),
    getOrBuildSummary(ownerId, contactId, chatId),
    getRecentMessages(chatId),
  ]);

  const ctx: PersonalityContext = {
    personality,
    customPrompt,
    style,
    contactMemory,
    conversationSummary,
    ownerUsername,
    contactUsername,
    languageDetection,
    languagePrompt,
  };

  const systemPrompt = buildSystemPrompt(ctx);

  const history = recentMsgs.map((m) => ({
    role: m.sender.id === ownerId ? 'assistant' : 'user',
    content: m.content || '',
  }));

  let draftReply = '';
  let confidence = classification.confidence;

  try {
    const result = await providerManager.generateReply(systemPrompt, [
      ...history.slice(0, -1),
      { role: 'user', content: incomingMessage },
    ]);

    draftReply = result.reply;

    if (!draftReply) {
      draftReply = "Thanks for your message! I'll get back to you soon.";
      confidence = 0.6;
    }

    if (draftReply.length > 300) confidence *= 0.85;
    if (draftReply.includes('I think') || draftReply.includes('maybe')) confidence *= 0.9;

    const languageMatch = validateLanguageMatch(languageDetection, draftReply);
    if (!languageMatch.isValid) {
      console.warn(`[ReplyEngine] Language mismatch: ${languageMatch.warning}`);
    }
  } catch (err) {
    console.error('[ReplyEngine] All providers failed:', (err as Error).message);
    draftReply = 'Thanks for reaching out! I\'ll respond shortly.';
    confidence = 0.4;
  }

  const needsApproval = REQUIRES_APPROVAL.includes(classification.risk);

  if (needsApproval) {
    const holdingReply = pickHoldingReply(classification.risk);
    return {
      reply: holdingReply,
      draftReply,
      holdingReply,
      classification,
      confidence,
      typingDelayMs: calculateTypingDelay(holdingReply.length),
      needsApproval: true,
      languageVariant: languageDetection.variant,
    };
  }

  return {
    reply: draftReply,
    draftReply,
    classification,
    confidence,
    typingDelayMs: calculateTypingDelay(draftReply.length),
    needsApproval: false,
    languageVariant: languageDetection.variant,
  };
}

export function isInSleepWindow(sleepStart: string, sleepEnd: string, tz: string): boolean {
  try {
    const now = new Date().toLocaleString('en-US', { timeZone: tz });
    const current = new Date(now);
    const [startH, startM] = sleepStart.split(':').map(Number);
    const [endH, endM] = sleepEnd.split(':').map(Number);
    const h = current.getHours();
    const m = current.getMinutes();
    const mins = h * 60 + m;
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    if (startMins > endMins) {
      return mins >= startMins || mins < endMins;
    }
    return mins >= startMins && mins < endMins;
  } catch {
    return false;
  }
}
