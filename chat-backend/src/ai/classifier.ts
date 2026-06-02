// src/ai/classifier.ts
// Message classification using keyword patterns only (no external API)
// Triggers approval only for constrained words/emergency situations

import { redisClient } from '../config/redis';

export type RiskLevel =
  | 'SAFE'
  | 'EMERGENCY'
  | 'MEETING'
  | 'PAYMENT'
  | 'SENSITIVE';

export interface ClassificationResult {
  risk: RiskLevel;
  confidence: number; // 0–1
  reasoning: string;
}

// Constraint word patterns
const SENSITIVE_PATTERNS =
  /password|otp|secret|cvv|bank account|pin number|aadhaar|ssn|credit card|confirm identity/i;
const EMERGENCY_PATTERNS =
  /urgent|emergency|hospital|accident|ambulance|call me now|asap|help.*urgent|911|critical|dying|bleeding/i;
const PAYMENT_PATTERNS =
  /send money|transfer|pay me|i.*owe|lend|borrow|upi|gpay|paytm|account number|invoice|bill|payment|rupees|dollars|₹|\$|rs\.|amount/i;
const MEETING_PATTERNS =
  /meet|tomorrow|available|free.*time|schedule|appointment|can we|shall we|when are you|tonight|this week|this month|coffee|lunch|dinner|call me|video call/i;

function keywordClassify(message: string): ClassificationResult {
  const m = message.toLowerCase();

  if (SENSITIVE_PATTERNS.test(m))
    return { risk: 'SENSITIVE', confidence: 0.95, reasoning: 'contains sensitive data request' };
  if (EMERGENCY_PATTERNS.test(m))
    return { risk: 'EMERGENCY', confidence: 0.9, reasoning: 'urgent/emergency situation' };
  if (PAYMENT_PATTERNS.test(m))
    return { risk: 'PAYMENT', confidence: 0.85, reasoning: 'financial/payment request' };
  if (MEETING_PATTERNS.test(m))
    return { risk: 'MEETING', confidence: 0.8, reasoning: 'scheduling/meeting request' };

  return { risk: 'SAFE', confidence: 0.95, reasoning: 'no constraints detected' };
}

const CACHE_TTL = 3600; // 1 hour

export async function classifyMessage(message: string): Promise<ClassificationResult> {
  // Check Redis cache
  const cacheKey = `ai:classify:${message.toLowerCase().trim().slice(0, 200)}`;

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached) as ClassificationResult;
  } catch {
    // Redis may be unavailable; continue
  }

  // Use keyword-based classification (fast, reliable, no external API)
  const result = keywordClassify(message);

  // Cache result
  try {
    await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(result));
  } catch { /* ignore */ }

  return result;
}

