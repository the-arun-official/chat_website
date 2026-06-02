// src/ai/replyEngine.ts
// Generates AI replies using multi-provider fallback system.
// Primary: Ollama (local, free) → Fallback: HuggingFace (cloud, free tier)
// Handles: context window assembly, reply generation, confidence scoring, anti-loop protection.

import { buildSystemPrompt, PersonalityContext, calculateTypingDelay } from './personality';
import { classifyMessage, ClassificationResult } from './classifier';
import { getUserStyle, getContactMemory, getOrBuildSummary } from './memory';
import { prisma } from '../config/prisma';
import { PersonalityType } from './personality';
import { createProviderManager } from './providers';

let providerManager = createProviderManager();

// Marker prefix so we can detect and skip AI-generated messages in message service
export const AI_SENDER_MARKER = '__AI_AUTO__';

export interface ReplyEngineInput {
  incomingMessage: string;
  chatId: string;
  ownerId: string;          // The person who enabled Auto Messenger
  contactId: string;        // The person who sent the message
  ownerUsername: string;
  contactUsername: string;
  personality: PersonalityType;
  customPrompt?: string;
}

export interface ReplyEngineOutput {
  reply: string;
  classification: ClassificationResult;
  confidence: number;
  typingDelayMs: number;
  needsApproval: boolean;
}

// Risk levels that require approval (only these trigger manual review)
const REQUIRES_APPROVAL: ClassificationResult['risk'][] = [
  'EMERGENCY',
  'PAYMENT',
  'MEETING',
  'SENSITIVE',
];

// Holding replies for when user needs to approve (buys time without committing)
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

// ─── Recent message context ────────────────────────────────────────────────────
async function getRecentMessages(chatId: string, limit = 20) {
  const msgs = await prisma.message.findMany({
    where: { chatId, type: 'TEXT', isDeleted: false },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { sender: { select: { username: true, id: true } } },
  });
  return msgs.reverse();
}

// ─── Main reply generator ──────────────────────────────────────────────────────
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

  // 1. Classify the incoming message
  const classification = await classifyMessage(incomingMessage);

  // 2. Skip if contains critical keywords (emergency, sensitive, etc.)
  if (['EMERGENCY', 'SENSITIVE'].includes(classification.risk)) {
    console.log(`[ReplyEngine] Skipping critical message (${classification.risk}): ${incomingMessage.slice(0, 50)}`);
    const holdingReply = pickHoldingReply(classification.risk);
    return {
      reply: holdingReply,
      classification,
      confidence: 1,
      typingDelayMs: calculateTypingDelay(holdingReply.length),
      needsApproval: true,
    };
  }

  // 3. Gather memory & style
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
  };

  const systemPrompt = buildSystemPrompt(ctx);

  // 4. Build conversation history for Ollama (last 20 messages)
  const history = recentMsgs.map((m) => ({
    role: m.sender.id === ownerId ? 'assistant' : 'user',
    content: m.content || '',
  }));

  let reply = '';
  let usedProvider = 'unknown';
  let confidence = classification.confidence;

  try {
    // 5. Generate reply via provider manager (with fallback)
    const result = await providerManager.generateReply(systemPrompt, [
      ...history.slice(0, -1),
      { role: 'user', content: incomingMessage },
    ]);

    reply = result.reply;
    usedProvider = result.provider;

    if (!reply) {
      reply = "Thanks for your message! I'll get back to you soon.";
      confidence = 0.6;
    }

    // Confidence adjustments
    if (reply.length > 300) confidence *= 0.85;
    if (reply.includes('I think') || reply.includes('maybe')) confidence *= 0.9;
  } catch (err) {
    console.error('[ReplyEngine] All providers failed:', (err as Error).message);
    // Safe fallback when all providers are down
    reply = 'Thanks for reaching out! I\'ll respond shortly.';
    usedProvider = 'fallback';
    confidence = 0.4;
  }

  // 6. Determine if approval is needed
  const riskRequiresApproval = REQUIRES_APPROVAL.includes(classification.risk);
  const needsApproval = riskRequiresApproval;

  // 7. For risky messages, replace with safe holding reply
  const finalReply = needsApproval ? pickHoldingReply(classification.risk) : reply;

  return {
    reply: finalReply,
    classification,
    confidence,
    typingDelayMs: calculateTypingDelay(finalReply.length),
    needsApproval,
  };
}

// ─── Sleeping hours check ──────────────────────────────────────────────────────
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
      // Overnight window (e.g., 23:00 – 07:00)
      return mins >= startMins || mins < endMins;
    }
    return mins >= startMins && mins < endMins;
  } catch {
    return false;
  }
}
