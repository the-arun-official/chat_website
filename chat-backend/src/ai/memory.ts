// src/ai/memory.ts
// Memory Engine for AI Auto Messenger.
// Manages:
//   • User style fingerprint (tone, emoji usage, word choice)
//   • Contact memory (relationship, interests, shared history)
//   • Rolling conversation summaries (compresses old context to save tokens)

import { prisma } from '../config/prisma';
import { redisClient } from '../config/redis';
import { createProviderManager } from './providers';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface StyleFingerprint {
  favoriteWords: string[];
  emojiFrequency: 'none' | 'low' | 'medium' | 'high';
  usedEmojis: string[];
  avgMsgLength: number;        // characters
  grammar: 'casual' | 'formal' | 'mixed';
  preferredLanguage: string;
  slangTerms: string[];        // "bro", "machi", "da", "okay"
}

export interface ContactMemoryBlob {
  relationship: string;        // "friend", "colleague", "family"
  workplace?: string;
  interests: string[];
  sharedHistory: string[];     // Brief events: "Met at college", "Working on XYZ project"
  commitments: string[];       // Pending: "Will meet Friday"
  lastTopics: string[];        // Last 5 conversation topics
}

const DEFAULT_CONTACT_MEMORY: ContactMemoryBlob = {
  relationship: 'friend',
  interests: [],
  sharedHistory: [],
  commitments: [],
  lastTopics: [],
};

export function normalizeContactMemory(
  blob: Partial<ContactMemoryBlob> | null | undefined
): ContactMemoryBlob {
  if (!blob || typeof blob !== 'object') {
    return { ...DEFAULT_CONTACT_MEMORY };
  }
  return {
    relationship: blob.relationship ?? DEFAULT_CONTACT_MEMORY.relationship,
    workplace: blob.workplace,
    interests: Array.isArray(blob.interests) ? blob.interests : [],
    sharedHistory: Array.isArray(blob.sharedHistory) ? blob.sharedHistory : [],
    commitments: Array.isArray(blob.commitments) ? blob.commitments : [],
    lastTopics: Array.isArray(blob.lastTopics) ? blob.lastTopics : [],
  };
}

export function normalizeStyleFingerprint(
  style: Partial<StyleFingerprint> | null | undefined
): StyleFingerprint | null {
  if (!style || typeof style !== 'object') return null;
  return {
    favoriteWords: Array.isArray(style.favoriteWords) ? style.favoriteWords : [],
    emojiFrequency: style.emojiFrequency ?? 'low',
    usedEmojis: Array.isArray(style.usedEmojis) ? style.usedEmojis : [],
    avgMsgLength: typeof style.avgMsgLength === 'number' ? style.avgMsgLength : 40,
    grammar: style.grammar ?? 'casual',
    preferredLanguage: style.preferredLanguage ?? 'en',
    slangTerms: Array.isArray(style.slangTerms) ? style.slangTerms : [],
  };
}

// ─── User Style Fingerprint ────────────────────────────────────────────────────

const STYLE_CACHE_KEY = (userId: string) => `ai:style:${userId}`;

export async function getUserStyle(userId: string): Promise<StyleFingerprint | null> {
  // Try Redis cache first
  try {
    const cached = await redisClient.get(STYLE_CACHE_KEY(userId));
    if (cached) {
      return normalizeStyleFingerprint(JSON.parse(cached));
    }
  } catch { /* ignore */ }

  const profile = await prisma.userAIProfile.findUnique({ where: { userId } });
  if (!profile?.styleFingerprint) return null;

  const style = normalizeStyleFingerprint(
    profile.styleFingerprint as unknown as Partial<StyleFingerprint>
  );
  if (!style) return null;
  try {
    await redisClient.setEx(STYLE_CACHE_KEY(userId), 1800, JSON.stringify(style));
  } catch { /* ignore */ }
  return style;
}

/**
 * Learns user style from their last N sent messages in a chat.
 * Called periodically (e.g., daily) via a BullMQ scheduled job.
 */
export async function learnUserStyle(userId: string): Promise<StyleFingerprint> {
  const messages = await prisma.message.findMany({
    where: { senderId: userId, type: 'TEXT', isDeleted: false },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { content: true },
  });

  const texts = messages.map((m) => m.content || '').filter(Boolean);
  if (texts.length === 0) {
    return {
      favoriteWords: [],
      emojiFrequency: 'low',
      usedEmojis: [],
      avgMsgLength: 40,
      grammar: 'casual',
      preferredLanguage: 'en',
      slangTerms: [],
    };
  }

  const sample = texts.slice(0, 40).join('\n---\n');

  const prompt = `Analyze these chat messages written by a single user and extract their style.
Messages (separated by ---):
${sample}

Return ONLY a JSON object (no markdown):
{
  "favoriteWords": ["word1", "word2"],
  "emojiFrequency": "none|low|medium|high",
  "usedEmojis": ["😂", "👍"],
  "avgMsgLength": <number>,
  "grammar": "casual|formal|mixed",
  "preferredLanguage": "en",
  "slangTerms": ["bro", "da", "machi"]
}`;

  try {
    const providerManager = createProviderManager();
    const result = await providerManager.generateReply(
      "You are a background analysis AI. You must ONLY output a valid JSON object matching the requested schema. No markdown, no backticks, no conversational text.",
      [{ role: 'user', content: prompt }]
    );

    let raw = result.reply.trim();
    if (raw.startsWith('```json')) {
      raw = raw.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }

    const parsed = JSON.parse(raw) as Partial<StyleFingerprint>;
    const style = normalizeStyleFingerprint(parsed)!;

    await prisma.userAIProfile.upsert({
      where: { userId },
      create: { userId, styleFingerprint: style as any, lastLearnedAt: new Date() },
      update: { styleFingerprint: style as any, lastLearnedAt: new Date() },
    });

    try {
      await redisClient.setEx(STYLE_CACHE_KEY(userId), 1800, JSON.stringify(style));
    } catch { /* ignore */ }

    return style;
  } catch (err) {
    console.warn('[Memory] Style learning failed:', (err as Error).message);
    return {
      favoriteWords: [],
      emojiFrequency: 'low',
      usedEmojis: [],
      avgMsgLength: 40,
      grammar: 'casual',
      preferredLanguage: 'en',
      slangTerms: [],
    };
  }
}

// ─── Contact Memory ────────────────────────────────────────────────────────────

const CONTACT_CACHE_KEY = (userId: string, contactId: string) =>
  `ai:contact:${userId}:${contactId}`;

export async function getContactMemory(
  userId: string,
  contactId: string
): Promise<ContactMemoryBlob> {
  try {
    const cached = await redisClient.get(CONTACT_CACHE_KEY(userId, contactId));
    if (cached) {
      return normalizeContactMemory(JSON.parse(cached));
    }
  } catch { /* ignore */ }

  const record = await prisma.contactMemory.findUnique({
    where: { userId_contactId: { userId, contactId } },
  });

  const blob = normalizeContactMemory(
    record?.memoryBlob as unknown as Partial<ContactMemoryBlob>
  );

  try {
    await redisClient.setEx(CONTACT_CACHE_KEY(userId, contactId), 600, JSON.stringify(blob));
  } catch { /* ignore */ }

  return blob;
}

export async function updateContactMemory(
  userId: string,
  contactId: string,
  patch: Partial<ContactMemoryBlob>
): Promise<void> {
  const existing = await getContactMemory(userId, contactId);
  const updated = normalizeContactMemory({ ...existing, ...patch });

  await prisma.contactMemory.upsert({
    where: { userId_contactId: { userId, contactId } },
    create: { userId, contactId, memoryBlob: updated as any },
    update: { memoryBlob: updated as any },
  });

  try {
    await redisClient.setEx(
      CONTACT_CACHE_KEY(userId, contactId),
      600,
      JSON.stringify(updated)
    );
  } catch { /* ignore */ }
}

// ─── Conversation Summary ──────────────────────────────────────────────────────

const SUMMARY_CACHE_KEY = (userId: string, chatId: string) =>
  `ai:summary:${userId}:${chatId}`;

export async function getOrBuildSummary(
  userId: string,
  contactId: string,
  chatId: string
): Promise<string> {
  try {
    const cached = await redisClient.get(SUMMARY_CACHE_KEY(userId, chatId));
    if (cached) return cached;
  } catch { /* ignore */ }

  const record = await prisma.contactMemory.findUnique({
    where: { userId_contactId: { userId, contactId } },
  });

  if (record?.summary) {
    try {
      await redisClient.setEx(SUMMARY_CACHE_KEY(userId, chatId), 300, record.summary);
    } catch { /* ignore */ }
    return record.summary;
  }

  // Build summary from recent messages
  const msgs = await prisma.message.findMany({
    where: { chatId, type: 'TEXT', isDeleted: false },
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: { sender: { select: { username: true } } },
  });

  if (msgs.length === 0) return '';

  const lines = msgs
    .reverse()
    .map((m) => `${m.sender.username}: ${m.content}`)
    .join('\n');

  try {
    const providerManager = createProviderManager();
    const result = await providerManager.generateReply(
      "You are a helpful assistant that summarizes conversations concisely.",
      [{ role: 'user', content: `Summarize this chat conversation in 3-5 bullet points. Focus on key topics, decisions, and ongoing commitments. Keep it concise.\n\n${lines}` }]
    );
    const summary = result.reply.trim();

    await prisma.contactMemory.upsert({
      where: { userId_contactId: { userId, contactId } },
      create: {
        userId,
        contactId,
        summary,
        summaryAt: new Date(),
        memoryBlob: DEFAULT_CONTACT_MEMORY as any,
      },
      update: { summary, summaryAt: new Date() },
    });

    try {
      await redisClient.setEx(SUMMARY_CACHE_KEY(userId, chatId), 300, summary);
    } catch { /* ignore */ }

    return summary;
  } catch {
    return ''; // graceful degradation
  }
}

/**
 * Invalidate summaries when new messages arrive so the next call re-builds.
 */
export async function invalidateSummary(userId: string, chatId: string): Promise<void> {
  try {
    await redisClient.del(SUMMARY_CACHE_KEY(userId, chatId));
  } catch { /* ignore */ }
}
