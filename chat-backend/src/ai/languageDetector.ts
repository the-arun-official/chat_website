// src/ai/languageDetector.ts
// Detects language/dialect including Tanglish, Tamil, mixed language messages
// Ensures AI replies in the SAME language as the user

type LanguageVariant = 'ENGLISH' | 'TANGLISH' | 'TAMIL' | 'MIXED' | 'OTHER';

interface LanguageDetectionResult {
  variant: LanguageVariant;
  confidence: number;
  primaryLanguage: string;
  shouldMatchLanguage: boolean;
  detectedScript: 'LATIN' | 'TAMIL' | 'MIXED';
}

const TANGLISH_INDICATORS = {
  words: [
    'da', 'di', 'la', 'le', 'va', 've', 'na', 'nu', 'ta', 'te', 'ra', 're',
    'sollu', 'sollra', 'sollren', 'sollrenu', 'solla', 'sollama',
    'mapla', 'thangam', 'kannu', 'kaasu', 'vanam',
    'podu', 'vechu', 'idhu', 'athu', 'itu', 'atu',
    'poi', 'poidutu', 'poidutan', 'poitan',
    'vandhuta', 'vandhutan', 'vandhurundhaan',
    'enna', 'ennada', 'ennadi', 'ennadhaan',
    'oru', 'rendu', 'moonu', 'naalu', 'anju',
    'konjam', 'romba', 'epdi', 'epda', 'ethukku',
  ],
  patterns: [
    /\b(da|di|la|le|va|ve|na|nu|ta|te)\s/i,
    /\b(enna|ennada|ennadi|epdi|epda)\b/i,
    /\b(sollu|solla|sollren|sollama)\b/i,
    /\b(vandhutan|vandhuta|poidutan|poitan)\b/i,
  ],
};

const TAMIL_UNICODE_RANGE = /[\u0B80-\u0BFF]/g;

export function detectLanguageVariant(message: string): LanguageDetectionResult {
  const normalizedMsg = message.toLowerCase();

  const tamilChars = (message.match(TAMIL_UNICODE_RANGE) || []).length;
  const totalChars = message.replace(/\s/g, '').length;
  const tamilPercentage = totalChars > 0 ? tamilChars / totalChars : 0;

  if (tamilPercentage > 0.7) {
    return {
      variant: 'TAMIL',
      confidence: Math.min(0.95, tamilPercentage),
      primaryLanguage: 'Tamil',
      shouldMatchLanguage: true,
      detectedScript: 'TAMIL',
    };
  }

  if (tamilPercentage > 0.1) {
    return {
      variant: 'MIXED',
      confidence: 0.8,
      primaryLanguage: 'Tamil+English',
      shouldMatchLanguage: true,
      detectedScript: 'MIXED',
    };
  }

  let tanglishScore = 0;
  const words = normalizedMsg.split(/\s+/);
  const tanglishWordMatches = words.filter((w) =>
    TANGLISH_INDICATORS.words.some((tw) => w.includes(tw))
  ).length;

  if (tanglishWordMatches > 0 && words.length > 0) {
    tanglishScore += tanglishWordMatches / words.length;
  }

  const patternMatches = TANGLISH_INDICATORS.patterns.filter((p) => p.test(normalizedMsg)).length;
  if (patternMatches > 0) {
    tanglishScore += patternMatches * 0.2;
  }

  if (tanglishScore > 0.3) {
    return {
      variant: 'TANGLISH',
      confidence: Math.min(0.95, tanglishScore),
      primaryLanguage: 'Tanglish (Tamil+English)',
      shouldMatchLanguage: true,
      detectedScript: 'LATIN',
    };
  }

  return {
    variant: 'ENGLISH',
    confidence: 0.9,
    primaryLanguage: 'English',
    shouldMatchLanguage: false,
    detectedScript: 'LATIN',
  };
}

export function buildLanguagePrompt(detection: LanguageDetectionResult, _contactMessage: string): string {
  if (detection.variant === 'TAMIL') {
    return `
=== LANGUAGE REQUIREMENT ===
The user sent a message in TAMIL SCRIPT.
You MUST respond ENTIRELY IN TAMIL SCRIPT.
Do NOT mix Tamil with English.
Do NOT romanize Tamil.
Use proper Tamil grammar and vocabulary.
Match their formality level and tone.
DO NOT ask them to switch to English.
DO NOT apologize or negotiate about language.
Just respond naturally in Tamil.`;
  }

  if (detection.variant === 'TANGLISH') {
    return `
=== LANGUAGE REQUIREMENT ===
The user is using TANGLISH (Tamil words written in English script + English mixed together).
Example: "hi da mapla, enna solren?" (Hi buddy, what are you saying?)
You MUST respond in TANGLISH with the SAME style:
- Use Tamil words written in English characters (da, di, la, ve, va, etc.)
- Mix English and Tanglish naturally
- Use particles like "da", "le", "va" at the end of sentences as they do
- Keep the same casual, friendly vibe
- DO NOT ask them to switch to English
- DO NOT apologize for using Tanglish
- Accept their language choice naturally and respond in it
Match their exact tone and word patterns.`;
  }

  if (detection.variant === 'MIXED') {
    return `
=== LANGUAGE REQUIREMENT ===
The user is mixing TAMIL SCRIPT with ENGLISH.
You MUST respond in the SAME MIX:
- Use both Tamil script and English together
- Match their ratio of Tamil vs English
- Keep sentences in their original structure
- DO NOT translate or correct their language
- Respond naturally in their mixed language`;
  }

  return `
=== LANGUAGE REQUIREMENT ===
The user sent a message in ENGLISH.
Respond naturally in ENGLISH only.`;
}

/**
 * CRITICAL: Never negotiate language choice in response
 * Remove ALL phrases that ask user to switch languages
 * These violate user autonomy and sound robotic
 */
export function removeLanguageNegotiation(response: string): string {
  const negotiationPatterns = [
    // "let's stick to English" variants
    /as we\s+(previously\s+)?discussed.*let['']?s\s+stick\s+to\s+(english|hindi)/gi,
    /let['']?s\s+stick\s+to\s+(english|hindi)/gi,
    /let['']?s\s+continue\s+(in\s+)?(english|hindi)/gi,
    
    // "I prefer English" variants
    /i['']?d\s+prefer\s+(english|hindi)/gi,
    /i\s+prefer\s+(english|hindi)/gi,
    /i['']?m\s+more\s+comfortable\s+in\s+(english|hindi)/gi,
    /i\s+am\s+more\s+comfortable\s+in\s+(english|hindi)/gi,
    
    // "Can we use English" variants
    /can we\s+(please\s+)?use\s+(english|hindi)/gi,
    /can we\s+(please\s+)?communicate\s+in\s+(english|hindi)/gi,
    /let['']?s\s+communicate\s+in\s+(english|hindi)/gi,
    /please\s+switch\s+to\s+(english|hindi)/gi,
    
    // "I don't understand" variants
    /i\s+don['']?t\s+understand\s+(tanglish|tamil|hindi)/gi,
    /i\s+don['']?t\s+speak\s+(tanglish|tamil|hindi)/gi,
    /i\s+cannot\s+respond\s+in\s+(tanglish|tamil|hindi)/gi,
    /i\s+am\s+not\s+equipped\s+to\s+respond\s+in\s+(tanglish|tamil|hindi)/gi,
    
    // "Not equipped" variants
    /i['']?m\s+not\s+equipped\s+to\s+(respond\s+)?in\s+(tanglish|tamil|hindi)/gi,
    /i\s+respectfully\s+point\s+out/gi,
    /while\s+i\s+appreciate\s+your\s+preference/gi,
    /originally\s+planned/gi,
    /to\s+avoid\s+any\s+potential\s+misunderstandings/gi,
    
    // Full sentence removals
    /i\s+apologize.*but\s+i\s+must\s+respectfully.*(?=\s|$)/gi,
    /thank you for your understanding and cooperation\./gi,
    /this will enable us to communicate more effectively/gi,
    
    // Paragraph-level removals
    /i\s+apologize[\s\S]*?cooperation\./gi,
  ];

  let filtered = response;
  
  negotiationPatterns.forEach((pattern) => {
    filtered = filtered.replace(pattern, '');
  });

  // Clean up resulting gaps, multiple spaces, and odd line breaks
  filtered = filtered
    .replace(/\n\s*\n/g, '\n')           // Remove blank lines
    .replace(/\s+\n/g, '\n')             // Remove trailing spaces before newlines
    .replace(/\n\s+/g, '\n')             // Remove leading spaces after newlines
    .replace(/\s+/g, ' ')                // Replace multiple spaces with single space
    .trim();
  
  return filtered;
}

export function analyzeLanguagePattern(
  recentMessages: Array<{ content: string; senderIsUser: boolean }>
) {
  const userMessages = recentMessages.filter((m) => m.senderIsUser);
  if (userMessages.length === 0) return null;

  const detections = userMessages
    .slice(-10)
    .map((m) => detectLanguageVariant(m.content ?? ''));
  const variantCounts = detections.reduce(
    (acc, d) => {
      acc[d.variant] = (acc[d.variant] || 0) + 1;
      return acc;
    },
    {} as Record<LanguageVariant, number>
  );

  const mostCommonVariant = Object.entries(variantCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    consistentVariant: mostCommonVariant,
    avgConfidence: detections.reduce((a, d) => a + d.confidence, 0) / detections.length,
    totalUniqueVariants: Object.keys(variantCounts).length,
  };
}

export function validateLanguageMatch(
  userInput: LanguageDetectionResult,
  aiResponse: string
): { isValid: boolean; confidence: number; warning?: string } {
  if (!userInput.shouldMatchLanguage) {
    return { isValid: true, confidence: 1 };
  }

  const normalizedResponse = aiResponse.toLowerCase();

  if (userInput.variant === 'TAMIL') {
    const tamilChars = (aiResponse.match(TAMIL_UNICODE_RANGE) || []).length;
    const totalChars = aiResponse.replace(/\s/g, '').length;
    const tamilPercentage = totalChars > 0 ? tamilChars / totalChars : 0;

    if (tamilPercentage < 0.7) {
      return {
        isValid: false,
        confidence: tamilPercentage,
        warning: `AI response should be >70% Tamil script. Got ${Math.round(tamilPercentage * 100)}%`,
      };
    }
  }

  if (userInput.variant === 'TANGLISH') {
    const hasTanglishMarkers = TANGLISH_INDICATORS.patterns.some((p) => p.test(normalizedResponse));
    const tanglishWords = normalizedResponse.split(/\s+/).filter((w) =>
      TANGLISH_INDICATORS.words.some((tw) => w.includes(tw))
    ).length;

    if (!hasTanglishMarkers && tanglishWords === 0) {
      return {
        isValid: false,
        confidence: 0.2,
        warning: 'AI response should use Tanglish markers (da, le, va, etc.)',
      };
    }
  }

  return { isValid: true, confidence: 0.9 };
}

export type { LanguageVariant, LanguageDetectionResult };
