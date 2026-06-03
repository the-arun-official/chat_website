import { classifyMessage } from '../ai/classifier';
import { prisma } from '../config/prisma';

export interface MessageAnalysis {
  meaning: string;
  tone: string;
  intent: string;
  emotions: string[];
  confidence: number;
  hiddenMeaning?: string;
  redFlags?: string[];
}

export interface SmartReply {
  text: string;
  style: 'friendly' | 'professional' | 'funny' | 'flirty' | 'short' | 'thoughtful';
  successScore: number; // 0-10
}

export interface ConversationAnalysis {
  currentMood: string;
  interestLevel: 'high' | 'medium' | 'low';
  healthScore: number; // 0-100
  engagementLevel: string;
  warningFlags?: string[];
}

// Core message analysis
export async function analyzeMessage(
  message: string,
  context: { senderName?: string; messageId?: string; chatId?: string }
): Promise<MessageAnalysis> {
  const classification = await classifyMessage(message);
  
  const meaning = analyzeMeaning(message);
  const tone = analyzeTone(message);
  const intent = analyzeIntent(message);
  const emotions = detectEmotions(message);
  const hiddenMeaning = detectHiddenMeaning(message);
  const redFlags = detectRedFlags(message);

  return {
    meaning,
    tone,
    intent,
    emotions,
    confidence: classification.confidence,
    hiddenMeaning,
    redFlags,
  };
}

// Generate multiple smart reply options
export async function generateSmartReplies(
  message: string,
  context: { chatId: string; userId: string }
): Promise<SmartReply[]> {
  const replies: SmartReply[] = [];

  // Friendly reply
  replies.push({
    text: generateFriendlyReply(message),
    style: 'friendly',
    successScore: calculateSuccessScore(message, 'friendly'),
  });

  // Professional reply
  replies.push({
    text: generateProfessionalReply(message),
    style: 'professional',
    successScore: calculateSuccessScore(message, 'professional'),
  });

  // Funny reply
  replies.push({
    text: generateFunnyReply(message),
    style: 'funny',
    successScore: calculateSuccessScore(message, 'funny'),
  });

  // Short reply
  replies.push({
    text: generateShortReply(message),
    style: 'short',
    successScore: calculateSuccessScore(message, 'short'),
  });

  // Thoughtful reply
  replies.push({
    text: generateThoughtfulReply(message),
    style: 'thoughtful',
    successScore: calculateSuccessScore(message, 'thoughtful'),
  });

  // Sort by success score
  return replies.sort((a, b) => b.successScore - a.successScore);
}

// Analyze entire conversation
export async function analyzeConversationHealth(
  chatId: string
): Promise<ConversationAnalysis> {
  const messages = await prisma.message.findMany({
    where: { chatId, type: 'TEXT', isDeleted: false },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  if (messages.length === 0) {
    return {
      currentMood: 'neutral',
      interestLevel: 'low',
      healthScore: 50,
      engagementLevel: 'minimal',
    };
  }

  const recentMessages = messages.slice(0, 10);
  const allEmotions = recentMessages.flatMap((m) => detectEmotions(m.content || ''));
  const currentMood = determineMood(allEmotions);
  const interestLevel = calculateEngagement(recentMessages);
  const healthScore = calculateHealthScore(recentMessages);

  return {
    currentMood,
    interestLevel,
    healthScore,
    engagementLevel: getEngagementLevel(interestLevel, healthScore),
    warningFlags: detectConversationWarnings(recentMessages),
  };
}

// ============= Helper Functions =============

function analyzeMeaning(message: string): string {
  const lower = message.toLowerCase();

  if (lower === 'fine' || lower === 'ok' || lower === 'okay') {
    return 'Could indicate genuine response, slight frustration, or end of conversation';
  }

  if (lower.includes('thank')) {
    return 'Expression of gratitude and appreciation';
  }

  if (lower.includes('sorry') || lower.includes('apologize')) {
    return 'Expression of apology or regret';
  }

  if (lower.includes('?')) {
    return 'Question asking for information or clarification';
  }

  if (lower.includes('!')) {
    return 'Exclamation expressing strong emotion or enthusiasm';
  }

  return 'General statement or observation';
}

function analyzeTone(message: string): string {
  const lower = message.toLowerCase();
  const length = message.length;

  if (message.match(/!{2,}/)) return 'Very excited';
  if (message.match(/\?{2,}/)) return 'Very confused';
  if (message.includes('...')) return 'Uncertain or trailing off';
  if (lower.includes('please') || lower.includes('thank')) return 'Polite and formal';
  if (lower.includes('sorry') || lower.includes('apologize')) return 'Apologetic';
  if (lower.includes('love') || lower.includes('😍') || lower.includes('❤️')) return 'Loving or affectionate';
  if (lower.includes('hate') || lower.includes('😠') || lower.includes('🤬')) return 'Angry or frustrated';
  if (length < 3) return 'Brief or dismissive';
  if (length > 500) return 'Detailed or thoughtful';

  return 'Neutral';
}

function analyzeIntent(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('?')) {
    if (lower.includes('when') || lower.includes('where') || lower.includes('what time'))
      return 'Planning or scheduling';
    if (lower.includes('how') || lower.includes('why')) return 'Seeking explanation';
    if (lower.includes('can you') || lower.includes('could you')) return 'Making a request';
    return 'Asking a question';
  }

  if (lower.includes('i') && lower.includes('feel')) return 'Sharing emotions';
  if (lower.includes('let') || lower.includes('shall we')) return 'Proposing action';
  if (lower.includes('congratulate') || lower.includes('congrats')) return 'Offering congratulations';

  return 'Sharing information';
}

function detectEmotions(message: string): string[] {
  const emotions: string[] = [];
  const lower = message.toLowerCase();

  if (lower.includes('happy') || lower.includes('😊') || lower.includes('🎉'))
    emotions.push('happiness');
  if (lower.includes('sad') || lower.includes('😔') || lower.includes('😢'))
    emotions.push('sadness');
  if (lower.includes('angry') || lower.includes('😠') || lower.includes('🤬'))
    emotions.push('anger');
  if (lower.includes('excited') || lower.includes('🤩') || lower.includes('😍'))
    emotions.push('excitement');
  if (lower.includes('confused') || lower.includes('🤔') || lower.includes('😕'))
    emotions.push('confusion');
  if (lower.includes('worried') || lower.includes('😟') || lower.includes('😰'))
    emotions.push('concern');
  if (lower.includes('sorry') || lower.includes('apologize'))
    emotions.push('regret');
  if (lower.includes('grateful') || lower.includes('thank'))
    emotions.push('gratitude');
  if (lower.includes('love')) emotions.push('affection');
  if (lower.includes('uncertain') || lower.includes('...')) emotions.push('uncertainty');

  return emotions.length > 0 ? emotions : ['neutral'];
}

function detectHiddenMeaning(message: string): string | undefined {
  const lower = message.toLowerCase();

  if (lower === 'fine' || lower === 'ok') {
    return 'May indicate frustration or disengagement depending on context';
  }

  if (lower === 'whatever' || lower === 'do whatever you want') {
    return 'Often indicates frustration or giving up on the conversation';
  }

  if (lower === 'i guess' || lower === 'i suppose') {
    return 'Reluctant agreement or uncertainty';
  }

  if (lower.includes('lol') || lower.includes('haha')) {
    return 'May mask true feelings or be genuine humor';
  }

  return undefined;
}

function detectRedFlags(message: string): string[] {
  const flags: string[] = [];
  const lower = message.toLowerCase();

  if (lower.includes('urgent') || lower.includes('asap') || lower.includes('now'))
    flags.push('urgency pressure');
  if (lower.includes('everyone knows') || lower.includes('just between us'))
    flags.push('manipulation attempt');
  if (lower.includes('you have to') || lower.includes('you must'))
    flags.push('controlling language');
  if (lower.includes('if you really') || lower.includes('if you cared'))
    flags.push('guilt tripping');

  return flags;
}

function generateFriendlyReply(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('how was your day'))
    return "It was good! How about yours? 😊";
  if (lower.includes('miss you'))
    return "Miss you too! When can we catch up? 💕";
  if (lower.includes('congratulate') || lower.includes('congrats'))
    return "Thank you so much! Really appreciate it! 🙏";
  if (lower.includes('sorry') || lower.includes('apologize'))
    return "No worries at all! It happens 😊";

  return "Thanks for reaching out! 😊";
}

function generateProfessionalReply(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('meeting') || lower.includes('schedule'))
    return "Certainly, I'll check my schedule and get back to you shortly.";
  if (lower.includes('project') || lower.includes('work'))
    return "Thank you for this update. I'll review and follow up accordingly.";
  if (lower.includes('question'))
    return "That's a great question. Let me look into that and respond shortly.";

  return "Thank you for your message. I appreciate it.";
}

function generateFunnyReply(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('how was your day'))
    return "Survived another day! 😂 What about you?";
  if (lower.includes('busy') || lower.includes('tired'))
    return "Same energy honestly 😅";
  if (lower.includes('miss you'))
    return "Miss you more! 🎭";

  return "Haha, I like your style! 😄";
}

function generateShortReply(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('?')) return "Sure!";
  if (lower.includes('thank')) return "Anytime!";
  if (lower.includes('sorry')) return "It's fine!";

  return "Got it!";
}

function generateThoughtfulReply(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('promoted') || lower.includes('achievement'))
    return "That's incredible! Tell me more about it - I'd love to hear the full story!";
  if (lower.includes('struggling') || lower.includes('difficult'))
    return "I hear you. That sounds tough. Want to talk about what's going on?";
  if (lower.includes('exciting'))
    return "That sounds amazing! What's making you excited about this?";

  return "I'm really interested in hearing more about this.";
}

function calculateSuccessScore(message: string, style: string): number {
  const lower = message.toLowerCase();
  let score = 5;

  // Adjust based on message type and style compatibility
  if (lower.includes('?') && style === 'thoughtful') score += 3;
  if (lower.includes('thank') && style === 'professional') score += 3;
  if (lower.includes('miss you') && style === 'friendly') score += 3;
  if (lower.includes('busy') && style === 'funny') score += 2;

  return Math.min(10, score);
}

function determineMood(emotions: string[]): string {
  if (emotions.includes('happiness')) return 'Happy 😊';
  if (emotions.includes('sadness')) return 'Sad 😔';
  if (emotions.includes('anger')) return 'Frustrated 😠';
  if (emotions.includes('excitement')) return 'Excited 🤩';
  if (emotions.includes('confusion')) return 'Confused 🤔';

  return 'Neutral 😐';
}

function calculateEngagement(messages: any[]): 'high' | 'medium' | 'low' {
  if (messages.length === 0) return 'low';

  const avgLength = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0) / messages.length;
  const hasEmojis = messages.some((m) => m.content?.match(/[\u{1F300}-\u{1F9FF}]/u));
  const hasQuestions = messages.some((m) => m.content?.includes('?'));

  if (avgLength > 100 && hasQuestions && hasEmojis) return 'high';
  if (avgLength > 50 || hasQuestions) return 'medium';

  return 'low';
}

function calculateHealthScore(messages: any[]): number {
  if (messages.length === 0) return 50;

  let score = 50;

  // Positive indicators
  if (messages.some((m) => m.content?.includes('thank'))) score += 10;
  if (messages.some((m) => m.content?.includes('😊') || m.content?.includes('😍')))
    score += 10;
  if (messages.some((m) => m.content?.includes('?'))) score += 5;

  // Negative indicators
  if (messages.some((m) => m.content?.includes('😠') || m.content?.includes('angry')))
    score -= 10;
  if (messages.some((m) => m.content?.match(/fine|ok|whatever/i)))
    score -= 5;

  return Math.max(0, Math.min(100, score));
}

function getEngagementLevel(
  interest: 'high' | 'medium' | 'low',
  health: number
): string {
  if (interest === 'high' && health > 80) return 'Very Active ✨';
  if (interest === 'high') return 'Active 🔥';
  if (interest === 'medium' && health > 60) return 'Engaged';
  if (interest === 'medium') return 'Moderately Engaged';

  return 'Low Engagement';
}

function detectConversationWarnings(messages: any[]): string[] {
  const warnings: string[] = [];

  const hasAngry = messages.some((m) =>
    m.content?.match(/angry|hate|😠|🤬/i)
  );
  if (hasAngry) warnings.push('Possible conflict detected');

  const hasRedFlags = messages.some((m) => detectRedFlags(m.content || '').length > 0);
  if (hasRedFlags) warnings.push('Potential manipulation detected');

  const lastMessage = messages[0];
  if (lastMessage && lastMessage.content?.match(/^(ok|fine|whatever)$/i)) {
    warnings.push('May indicate disengagement');
  }

  return warnings;
}
