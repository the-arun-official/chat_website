import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Sparkles, ArrowRight, Loader } from 'lucide-react';
import { useAppSelector } from '../../store/store';
import api from '../../services/api';
import './AIPanelBox.css';

interface AIPanelBoxProps {
  isOpen: boolean;
  onClose: () => void;
  messageId: string;
  messageContent: string;
  chatId: string;
  onReplySelect: (reply: string) => void;
}

interface MessageAnalysis {
  meaning: string;
  tone: string;
  intent: string;
  emotions: string[];
  confidence: number;
  hiddenMeaning?: string;
  redFlags?: string[];
}

interface SmartReply {
  text: string;
  style: string;
  successScore: number;
}

export const AIPanelBox: React.FC<AIPanelBoxProps> = ({
  isOpen,
  onClose,
  messageId,
  messageContent,
  chatId,
  onReplySelect,
}) => {
  const [analysis, setAnalysis] = useState<MessageAnalysis | null>(null);
  const [replies, setReplies] = useState<SmartReply[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAppSelector(state => state.auth);

  useEffect(() => {
    if (isOpen && messageId && chatId && user?.id) {
      fetchAnalysis();
    }
  }, [isOpen, messageId, chatId, user?.id]);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching AI analysis:', { messageId, chatId, userId: user?.id });
      
      // Fetch analysis
      const analysisResponse = await api.post('/ai-assistant/analyze-message', {
        messageId,
        chatId,
        userId: user?.id,
      });
      console.log('Analysis response:', analysisResponse.data);
      setAnalysis(analysisResponse.data);

      // Fetch replies
      const repliesResponse = await api.post('/ai-assistant/smart-replies', {
        messageId,
        chatId,
        userId: user?.id,
      });
      console.log('Replies response:', repliesResponse.data);
      setReplies(repliesResponse.data);
    } catch (error: any) {
      console.error('Failed to analyze message:', error);
      console.error('Error details:', error.response?.data || error.message);
      setError(error.response?.data?.error || error.message || 'Failed to load analysis');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="ai-panel-box"
        >
          {/* Header */}
          <div className="ai-panel-header">
            <div className="ai-panel-title">
              <Sparkles className="ai-panel-icon" />
              <span>AI Analysis</span>
            </div>
            <button onClick={onClose} className="ai-panel-close-btn">
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="ai-panel-content">
            {loading ? (
              <div className="ai-panel-loading">
                <Loader className="ai-loader-icon" />
                <p>Analyzing your message...</p>
              </div>
            ) : analysis ? (
              <>
                {/* Original Message Box */}
                <div className="ai-section">
                  <h3 className="ai-section-title">📝 Original Message</h3>
                  <div className="ai-message-box">
                    "{messageContent}"
                  </div>
                </div>

                {/* Explanation Box */}
                <div className="ai-section">
                  <h3 className="ai-section-title">💡 Explanation</h3>
                  <div className="ai-explanation-box">
                    <div className="ai-field">
                      <span className="ai-label">Meaning:</span>
                      <p className="ai-value">{analysis.meaning}</p>
                    </div>

                    <div className="ai-field">
                      <span className="ai-label">Tone:</span>
                      <span className="ai-badge ai-badge-blue">{analysis.tone}</span>
                    </div>

                    <div className="ai-field">
                      <span className="ai-label">Intent:</span>
                      <p className="ai-value">{analysis.intent}</p>
                    </div>

                    <div className="ai-field">
                      <span className="ai-label">Emotions:</span>
                      <div className="ai-chips">
                        {analysis.emotions.map((emotion, i) => (
                          <span key={i} className="ai-chip ai-chip-purple">
                            {emotion}
                          </span>
                        ))}
                      </div>
                    </div>

                    {analysis.hiddenMeaning && (
                      <div className="ai-field ai-field-hidden">
                        <span className="ai-label">🔍 Hidden Meaning:</span>
                        <p className="ai-value">{analysis.hiddenMeaning}</p>
                      </div>
                    )}

                    {analysis.redFlags && analysis.redFlags.length > 0 && (
                      <div className="ai-field ai-field-warning">
                        <span className="ai-label">⚠️ Red Flags:</span>
                        <ul className="ai-flags-list">
                          {analysis.redFlags.map((flag, i) => (
                            <li key={i}>{flag}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="ai-field">
                      <span className="ai-label">Confidence:</span>
                      <div className="ai-confidence-bar">
                        <div
                          className="ai-confidence-fill"
                          style={{ width: `${analysis.confidence * 100}%` }}
                        />
                      </div>
                      <p className="ai-confidence-text">
                        {(analysis.confidence * 100).toFixed(0)}% confident
                      </p>
                    </div>
                  </div>
                </div>

                {/* Reply Box */}
                <div className="ai-section">
                  <h3 className="ai-section-title">💬 Suggested Replies</h3>
                  <div className="ai-replies-box">
                    {replies.length > 0 ? (
                      replies.map((reply, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="ai-reply-item"
                        >
                          <div className="ai-reply-header">
                            <span className="ai-reply-style">{reply.style}</span>
                            <span className="ai-reply-score">Score: {reply.successScore}/10</span>
                          </div>
                          <p className="ai-reply-text">{reply.text}</p>
                          <div className="ai-reply-actions">
                            <button
                              onClick={() => copyToClipboard(reply.text, idx)}
                              className="ai-reply-btn ai-reply-copy-btn"
                              title="Copy reply"
                            >
                              {copiedIndex === idx ? (
                                <Check size={16} />
                              ) : (
                                <Copy size={16} />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                onReplySelect(reply.text);
                                onClose();
                              }}
                              className="ai-reply-btn ai-reply-use-btn"
                              title="Use this reply"
                            >
                              <ArrowRight size={16} />
                            </button>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <p className="ai-no-replies">No suggestions available</p>
                    )}
                  </div>
                </div>
              </>
            ) : error ? (
              <div className="ai-panel-error">
                <p>Error: {error}</p>
                <p style={{ fontSize: '12px', marginTop: '10px', opacity: 0.7 }}>
                  Check browser console for details
                </p>
              </div>
            ) : (
              <div className="ai-panel-error">
                <p>No data loaded</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
