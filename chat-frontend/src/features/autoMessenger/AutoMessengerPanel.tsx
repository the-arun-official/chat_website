// src/features/autoMessenger/AutoMessengerPanel.tsx
// Full-featured Auto Messenger settings panel.

import { useState, useEffect, useCallback } from 'react';
import './AutoMessenger.css';

type Mode = 'FULL_AUTO' | 'SMART' | 'DRAFT_ONLY';
type Personality =
  | 'FRIENDLY'
  | 'PROFESSIONAL'
  | 'CASUAL'
  | 'FUNNY'
  | 'CORPORATE'
  | 'SUPPORTIVE'
  | 'ROMANTIC'
  | 'CUSTOM';

interface Config {
  isEnabled: boolean;
  mode: Mode;
  personality: Personality;
  customPrompt?: string;
  sleepStart?: string;
  sleepEnd?: string;
  timezone?: string;
}

interface ApprovalRequest {
  id: string;
  chatId: string;
  incomingMsg: string;
  aiDraft: string;
  riskType: string;
  confidence: number;
  expiresAt: string;
}

interface Analytics {
  totalMessages: number;
  autoSent: number;
  pendingApprovals: number;
  avgResponseMs: number;
}

interface AutoReplyRule {
  id: string;
  triggerType: 'KEYWORD' | 'PATTERN' | 'TIME_BASED';
  triggerValue: string;
  responseType: 'FIXED' | 'AI_ENHANCED';
  fixedResponse?: string;
  aiPromptEnhancement?: string;
  enabled: boolean;
  priority: number;
}

const TRIGGER_TYPES = [
  { value: 'KEYWORD' as const, label: 'Keywords', example: 'hello|hi|hey' },
  { value: 'PATTERN' as const, label: 'Regex Pattern', example: '^when.*free' },
  { value: 'TIME_BASED' as const, label: 'Time Window', example: '22:00-08:00' },
];

const PERSONALITIES: { value: Personality; label: string; emoji: string }[] = [
  { value: 'FRIENDLY',     label: 'Friendly',      emoji: '😊' },
  { value: 'CASUAL',       label: 'Casual',        emoji: '😎' },
  { value: 'PROFESSIONAL', label: 'Professional',  emoji: '💼' },
  { value: 'FUNNY',        label: 'Funny',         emoji: '😂' },
  { value: 'CORPORATE',    label: 'Corporate',     emoji: '🏢' },
  { value: 'SUPPORTIVE',   label: 'Supportive',    emoji: '🤗' },
  { value: 'ROMANTIC',     label: 'Romantic',      emoji: '❤️' },
  { value: 'CUSTOM',       label: 'Custom Prompt', emoji: '✍️' },
];

const MODE_INFO: Record<Mode, { label: string; desc: string }> = {
  FULL_AUTO:  { label: 'Full Auto',     desc: 'All safe messages sent automatically. No prompts.' },
  SMART:      { label: 'Smart',         desc: 'AI chats freely. Risky decisions come to you.' },
  DRAFT_ONLY: { label: 'Draft Only',    desc: 'AI suggests replies. You send them manually.' },
};

const RISK_COLORS: Record<string, string> = {
  SAFE:      '#22c55e',
  MEETING:   '#f59e0b',
  PAYMENT:   '#ef4444',
  EMERGENCY: '#dc2626',
  SENSITIVE: '#7c3aed',
};

interface Props {
  chatId: string;
  token: string;
  apiBase?: string;
  socket?: any;
}

export default function AutoMessengerPanel({ chatId, token, apiBase = '/api', socket }: Props) {
  const [config, setConfig] = useState<Config>({
    isEnabled: false,
    mode: 'SMART',
    personality: 'FRIENDLY',
  });
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'autoreplies' | 'approvals' | 'analytics'>('settings');
  const [customReplyMap, setCustomReplyMap] = useState<Record<string, string>>({});
  const [learningStyle, setLearningStyle] = useState(false);
  const [autoReplies, setAutoReplies] = useState<AutoReplyRule[]>([]);
  const [showNewRuleForm, setShowNewRuleForm] = useState(false);
  const [newRule, setNewRule] = useState<Partial<AutoReplyRule>>({
    triggerType: 'KEYWORD',
    responseType: 'FIXED',
    priority: 5,
    enabled: true,
  });

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    try {
      const [cfgRes, appRes, anaRes, rulesRes] = await Promise.all([
        fetch(`${apiBase}/auto-messenger/${chatId}`, { headers }),
        fetch(`${apiBase}/auto-messenger/approvals/pending`, { headers }),
        fetch(`${apiBase}/auto-messenger/analytics/summary`, { headers }),
        fetch(`${apiBase}/auto-messenger/${chatId}/rules`, { headers }),
      ]);
      if (cfgRes.ok) {
        const cfg = await cfgRes.json();
        if (cfg) setConfig(cfg);
      }
      if (appRes.ok) setApprovals(await appRes.json());
      if (anaRes.ok) setAnalytics(await anaRes.json());
      if (rulesRes.ok) {
        const rules = await rulesRes.json();
        if (Array.isArray(rules)) setAutoReplies(rules);
      }
    } catch (err) {
      console.error('AutoMessenger: failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  }, [chatId, apiBase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!socket) return;
    const handler = (data: ApprovalRequest) => {
      if (data.chatId === chatId) {
        setApprovals((prev) => [data, ...prev.filter((a) => a.id !== data.id)]);
      }
    };
    socket.on('approval_request', handler);
    return () => socket.off('approval_request', handler);
  }, [socket, chatId]);

  const saveConfig = async (patch: Partial<Config>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    setSaving(true);
    try {
      await fetch(`${apiBase}/auto-messenger/${chatId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(next),
      });
    } catch (err) {
      console.error('AutoMessenger: save failed', err);
    } finally {
      setSaving(false);
    }
  };

  const resolve = async (id: string, action: string, customReply?: string) => {
    setApprovals((prev) => prev.filter((a) => a.id !== id));
    await fetch(`${apiBase}/auto-messenger/approvals/${id}/resolve`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, customReply }),
    });
  };

  const triggerLearnStyle = async () => {
    setLearningStyle(true);
    try {
      await fetch(`${apiBase}/auto-messenger/learn-style`, { method: 'POST', headers });
    } finally {
      setLearningStyle(false);
    }
  };

  const addAutoReply = async () => {
    // Validation
    if (!newRule.triggerValue?.trim()) {
      alert('Please enter a trigger value');
      return;
    }
    if (newRule.responseType === 'FIXED' && !newRule.fixedResponse?.trim()) {
      alert('Please enter a response message');
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/auto-messenger/${chatId}/rules`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          triggerType: newRule.triggerType || 'KEYWORD',
          triggerValue: newRule.triggerValue?.trim(),
          responseType: newRule.responseType || 'FIXED',
          fixedResponse: newRule.responseType === 'FIXED' ? newRule.fixedResponse?.trim() : undefined,
          aiPromptEnhancement: newRule.responseType === 'AI_ENHANCED' ? newRule.aiPromptEnhancement?.trim() : undefined,
          priority: newRule.priority || 5,
          enabled: newRule.enabled !== false,
        }),
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${res.status}: Failed to create rule`);
      }
      
      const rule = await res.json();
      setAutoReplies((prev) => [...prev, rule]);
      setNewRule({ triggerType: 'KEYWORD', responseType: 'FIXED', priority: 5, enabled: true });
      setShowNewRuleForm(false);
      // Success feedback
      console.log('Rule created successfully:', rule);
    } catch (err: any) {
      console.error('AutoMessenger: failed to add rule', err);
      alert(`Failed to create rule: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteAutoReply = async (id: string) => {
    if (!confirm('Delete this auto-reply rule?')) return;
    try {
      await fetch(`${apiBase}/auto-messenger/${chatId}/rules/${id}`, {
        method: 'DELETE',
        headers,
      });
      setAutoReplies((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('AutoMessenger: failed to delete rule', err);
    }
  };

  const toggleRule = async (id: string) => {
    const rule = autoReplies.find((r) => r.id === id);
    if (!rule) return;
    try {
      await fetch(`${apiBase}/auto-messenger/${chatId}/rules/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      setAutoReplies((prev) =>
        prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
      );
    } catch (err) {
      console.error('AutoMessenger: failed to toggle rule', err);
    }
  };

  if (loading) {
    return (
      <div className="am-panel am-loading">
        <div className="am-spinner" />
        <span>Loading AI settings…</span>
      </div>
    );
  }

  return (
    <div className="am-panel">
      <div className="am-header">
        <div className="am-header-left">
          <span className="am-icon">🤖</span>
          <div>
            <h3 className="am-title">AI Auto Messenger</h3>
            <p className="am-subtitle">Your AI digital twin</p>
          </div>
        </div>
        <label className="am-toggle">
          <input
            type="checkbox"
            checked={config.isEnabled}
            onChange={(e) => saveConfig({ isEnabled: e.target.checked })}
          />
          <span className="am-toggle-slider" />
        </label>
      </div>

      {!config.isEnabled && (
        <div className="am-disabled-banner">
          Auto Messenger is off for this chat. Toggle to enable.
        </div>
      )}

      <div className="am-language-banner">
        Language detection enabled — AI replies in Tanglish, Tamil, or English to match the contact.
      </div>

      <div className="am-tabs">
        {(['settings', 'autoreplies', 'approvals', 'analytics'] as const).map((tab) => (
          <button
            key={tab}
            className={`am-tab ${activeTab === tab ? 'am-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'approvals' && approvals.length > 0 && (
              <span className="am-badge">{approvals.length}</span>
            )}
            {tab === 'autoreplies' && autoReplies.filter((r) => r.enabled).length > 0 && (
              <span className="am-badge">{autoReplies.filter((r) => r.enabled).length}</span>
            )}
            {tab === 'autoreplies' ? 'Auto-Replies' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'settings' && (
        <div className="am-section">
          <div className="am-field">
            <label className="am-label">Auto Reply Mode</label>
            <div className="am-mode-grid">
              {(Object.keys(MODE_INFO) as Mode[]).map((m) => (
                <button
                  key={m}
                  className={`am-mode-btn ${config.mode === m ? 'am-mode-btn--active' : ''}`}
                  onClick={() => saveConfig({ mode: m })}
                >
                  <span className="am-mode-label">{MODE_INFO[m].label}</span>
                  <span className="am-mode-desc">{MODE_INFO[m].desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="am-field">
            <label className="am-label">Personality</label>
            <div className="am-personality-grid">
              {PERSONALITIES.map((p) => (
                <button
                  key={p.value}
                  className={`am-personality-btn ${config.personality === p.value ? 'am-personality-btn--active' : ''}`}
                  onClick={() => saveConfig({ personality: p.value })}
                >
                  <span>{p.emoji}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {config.personality === 'CUSTOM' && (
            <div className="am-field">
              <label className="am-label">Custom Instructions</label>
              <textarea
                className="am-textarea"
                placeholder="Reply in a short, calm, and professional manner."
                value={config.customPrompt || ''}
                onChange={(e) => setConfig((c) => ({ ...c, customPrompt: e.target.value }))}
                onBlur={() => saveConfig({ customPrompt: config.customPrompt })}
                rows={3}
              />
            </div>
          )}

          <div className="am-field">
            <label className="am-label">Sleep Schedule (AI goes quiet)</label>
            <div className="am-sleep-row">
              <input
                type="time"
                className="am-time-input"
                value={config.sleepStart || ''}
                onChange={(e) => setConfig((c) => ({ ...c, sleepStart: e.target.value }))}
                onBlur={() => saveConfig({ sleepStart: config.sleepStart })}
              />
              <span className="am-to">to</span>
              <input
                type="time"
                className="am-time-input"
                value={config.sleepEnd || ''}
                onChange={(e) => setConfig((c) => ({ ...c, sleepEnd: e.target.value }))}
                onBlur={() => saveConfig({ sleepEnd: config.sleepEnd })}
              />
            </div>
          </div>

          <div className="am-field">
            <label className="am-label">Style Learning</label>
            <p className="am-hint">Train the AI on your last 100 messages so it sounds like you.</p>
            <button
              className="am-btn am-btn--secondary"
              onClick={triggerLearnStyle}
              disabled={learningStyle}
            >
              {learningStyle ? '🔄 Learning…' : '🧠 Learn My Style Now'}
            </button>
          </div>

          {saving && <div className="am-saving-indicator">Saving…</div>}
        </div>
      )}

      {activeTab === 'autoreplies' && (
        <div className="am-section">
          <div className="am-rules-header">
            <h4 className="am-rules-title">Custom Auto-Reply Rules</h4>
            <button
              type="button"
              className="am-btn am-btn--secondary"
              onClick={() => setShowNewRuleForm(!showNewRuleForm)}
            >
              {showNewRuleForm ? 'Cancel' : '+ Add Rule'}
            </button>
          </div>

          {showNewRuleForm && (
            <div className="am-rules-form">
              <div className="am-field">
                <label className="am-label">Trigger Type</label>
                <select
                  className="am-select"
                  value={newRule.triggerType}
                  onChange={(e) =>
                    setNewRule({ ...newRule, triggerType: e.target.value as AutoReplyRule['triggerType'] })
                  }
                >
                  {TRIGGER_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <p className="am-hint">
                  e.g. {TRIGGER_TYPES.find((t) => t.value === newRule.triggerType)?.example}
                </p>
              </div>
              <div className="am-field">
                <label className="am-label">Trigger Value</label>
                <input
                  type="text"
                  className="am-custom-input"
                  placeholder={TRIGGER_TYPES.find((t) => t.value === newRule.triggerType)?.example}
                  value={newRule.triggerValue || ''}
                  onChange={(e) => setNewRule({ ...newRule, triggerValue: e.target.value })}
                />
              </div>
              <div className="am-field">
                <label className="am-label">Response Type</label>
                <div className="am-rules-radio-row">
                  <label>
                    <input
                      type="radio"
                      checked={newRule.responseType === 'FIXED'}
                      onChange={() => setNewRule({ ...newRule, responseType: 'FIXED' })}
                    />
                    Fixed
                  </label>
                  <label>
                    <input
                      type="radio"
                      checked={newRule.responseType === 'AI_ENHANCED'}
                      onChange={() => setNewRule({ ...newRule, responseType: 'AI_ENHANCED' })}
                    />
                    AI Enhanced
                  </label>
                </div>
              </div>
              {newRule.responseType === 'FIXED' ? (
                <div className="am-field">
                  <label className="am-label">Auto-Reply Message</label>
                  <textarea
                    className="am-textarea"
                    rows={2}
                    value={newRule.fixedResponse || ''}
                    onChange={(e) => setNewRule({ ...newRule, fixedResponse: e.target.value })}
                  />
                </div>
              ) : (
                <div className="am-field">
                  <label className="am-label">AI Enhancement (optional)</label>
                  <textarea
                    className="am-textarea"
                    rows={2}
                    placeholder="Extra instructions for the AI when this rule matches"
                    value={newRule.aiPromptEnhancement || ''}
                    onChange={(e) => setNewRule({ ...newRule, aiPromptEnhancement: e.target.value })}
                  />
                </div>
              )}
              <div className="am-field">
                <label className="am-label">Priority (1–10)</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  className="am-custom-input"
                  value={newRule.priority ?? 5}
                  onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value, 10) })}
                />
              </div>
              <button
                type="button"
                className="am-btn am-btn--approve"
                onClick={addAutoReply}
                disabled={saving || !newRule.triggerValue?.trim() || (newRule.responseType === 'FIXED' && !newRule.fixedResponse?.trim())}
              >
                {saving ? '⏳ Creating...' : 'Create Rule'}
              </button>
            </div>
          )}

          {autoReplies.length === 0 ? (
            <div className="am-empty">
              <span className="am-empty-icon">📭</span>
              <p>No auto-reply rules yet.</p>
            </div>
          ) : (
            <div className="am-rules-list">
              {autoReplies.map((rule) => (
                <div key={rule.id} className="am-rule-card">
                  <div className="am-rule-card-header">
                    <span className={`am-rule-badge am-rule-badge--${rule.triggerType.toLowerCase()}`}>
                      {rule.triggerType}
                    </span>
                    <span className="am-rule-trigger">{rule.triggerValue}</span>
                    <span className="am-rule-priority">P{rule.priority}</span>
                    <div className="am-rule-actions">
                      <button
                        type="button"
                        className={`am-rule-toggle ${rule.enabled ? 'am-rule-toggle--on' : ''}`}
                        onClick={() => toggleRule(rule.id)}
                        title={rule.enabled ? 'Disable' : 'Enable'}
                      >
                        {rule.enabled ? 'On' : 'Off'}
                      </button>
                      <button
                        type="button"
                        className="am-rule-delete"
                        onClick={() => deleteAutoReply(rule.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="am-rule-response">
                    {rule.responseType === 'FIXED' ? rule.fixedResponse : rule.aiPromptEnhancement || '(AI enhanced)'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'approvals' && (
        <div className="am-section">
          {approvals.length === 0 ? (
            <div className="am-empty">
              <span className="am-empty-icon">✅</span>
              <p>No pending approvals</p>
            </div>
          ) : (
            approvals.map((a) => (
              <div key={a.id} className="am-approval-card">
                <div className="am-approval-header">
                  <span
                    className="am-risk-badge"
                    style={{ background: RISK_COLORS[a.riskType] || '#64748b' }}
                  >
                    {a.riskType}
                  </span>
                  <span className="am-confidence">
                    {Math.round(a.confidence * 100)}% confidence
                  </span>
                </div>
                <div className="am-approval-msg">
                  <span className="am-msg-label">They said:</span>
                  <p className="am-msg-text">{a.incomingMsg}</p>
                </div>
                <div className="am-approval-draft">
                  <span className="am-msg-label">AI draft (for approval):</span>
                  <p className="am-msg-text am-msg-text--draft">{a.aiDraft}</p>
                </div>
                <div className="am-approval-actions">
                  <button
                    className="am-btn am-btn--approve"
                    onClick={() => resolve(a.id, 'APPROVED')}
                  >
                    ✅ Send Draft
                  </button>
                  <button
                    className="am-btn am-btn--reject"
                    onClick={() => resolve(a.id, 'REJECTED')}
                  >
                    ❌ Ignore
                  </button>
                </div>
                <div className="am-custom-reply-row">
                  <input
                    className="am-custom-input"
                    placeholder="Or type your own reply…"
                    value={customReplyMap[a.id] || ''}
                    onChange={(e) =>
                      setCustomReplyMap((m) => ({ ...m, [a.id]: e.target.value }))
                    }
                  />
                  <button
                    className="am-btn am-btn--custom"
                    onClick={() => resolve(a.id, 'CUSTOM_REPLIED', customReplyMap[a.id])}
                    disabled={!customReplyMap[a.id]?.trim()}
                  >
                    Send
                  </button>
                </div>
                <div className="am-expires">
                  Expires: {new Date(a.expiresAt).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'analytics' && analytics && (
        <div className="am-section">
          <div className="am-analytics-grid">
            <div className="am-stat">
              <span className="am-stat-value">{analytics.totalMessages}</span>
              <span className="am-stat-label">Messages Handled</span>
            </div>
            <div className="am-stat">
              <span className="am-stat-value">{analytics.autoSent}</span>
              <span className="am-stat-label">Auto-Sent</span>
            </div>
            <div className="am-stat">
              <span className="am-stat-value">{analytics.pendingApprovals}</span>
              <span className="am-stat-label">Pending</span>
            </div>
            <div className="am-stat">
              <span className="am-stat-value">
                {(analytics.avgResponseMs / 1000).toFixed(1)}s
              </span>
              <span className="am-stat-label">Avg Response</span>
            </div>
          </div>
          <p className="am-analytics-note">Last 7 days across all chats</p>
        </div>
      )}
    </div>
  );
}
