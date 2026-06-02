// src/models/autoReplyRule.ts
// Custom auto-reply rule matching (keywords, patterns, time windows)

import { AutoReplyTriggerType, AutoReplyResponseType } from '@prisma/client';

export interface AutoReplyRule {
  id: string;
  userId: string;
  chatId: string;
  triggerType: AutoReplyTriggerType;
  triggerValue: string;
  responseType: AutoReplyResponseType;
  fixedResponse?: string | null;
  aiPromptEnhancement?: string | null;
  enabled: boolean;
  caseSensitive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AutoReplyRuleCreate {
  triggerType: AutoReplyTriggerType;
  triggerValue: string;
  responseType: AutoReplyResponseType;
  fixedResponse?: string;
  aiPromptEnhancement?: string;
  caseSensitive?: boolean;
  priority?: number;
  enabled?: boolean;
}

export class AutoReplyRuleService {
  static matchMessage(
    message: string,
    rules: AutoReplyRule[],
    currentTime?: Date
  ): AutoReplyRule | null {
    const enabledRules = rules.filter((r) => r.enabled);
    if (enabledRules.length === 0) return null;

    const matches = enabledRules.filter((rule) => {
      switch (rule.triggerType) {
        case 'KEYWORD':
          return this.matchKeyword(message, rule.triggerValue, rule.caseSensitive);
        case 'PATTERN':
          return this.matchPattern(message, rule.triggerValue);
        case 'TIME_BASED':
          return this.matchTimeWindow(rule.triggerValue, currentTime);
        default:
          return false;
      }
    });

    return matches.sort((a, b) => b.priority - a.priority)[0] || null;
  }

  private static matchKeyword(message: string, triggerValue: string, caseSensitive: boolean): boolean {
    const text = caseSensitive ? message : message.toLowerCase();
    const trigger = caseSensitive ? triggerValue : triggerValue.toLowerCase();
    const keywords = trigger.split('|').map((k) => k.trim());

    return keywords.some((keyword) => {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, caseSensitive ? '' : 'i');
      return regex.test(text);
    });
  }

  private static matchPattern(message: string, patternString: string): boolean {
    try {
      return new RegExp(patternString, 'i').test(message);
    } catch {
      console.error(`Invalid regex pattern: ${patternString}`);
      return false;
    }
  }

  private static matchTimeWindow(timeRange: string, currentTime: Date = new Date()): boolean {
    try {
      const [startStr, endStr] = timeRange.split('-');
      const [startH, startM] = startStr.split(':').map(Number);
      const [endH, endM] = endStr.split(':').map(Number);
      const h = currentTime.getHours();
      const m = currentTime.getMinutes();
      const currentMins = h * 60 + m;
      const startMins = startH * 60 + startM;
      const endMins = endH * 60 + endM;

      if (startMins > endMins) {
        return currentMins >= startMins || currentMins < endMins;
      }
      return currentMins >= startMins && currentMins < endMins;
    } catch {
      return false;
    }
  }

  static validatePattern(pattern: string): boolean {
    try {
      new RegExp(pattern, 'i');
      return true;
    } catch {
      return false;
    }
  }
}
