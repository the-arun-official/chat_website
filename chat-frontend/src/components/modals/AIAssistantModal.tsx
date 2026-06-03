import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Brain, MessageCircle, Sparkles } from 'lucide-react';
import api from '../../services/api';
import '../modals/Modals.css';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageId: string;
  messageContent: string;
  chatId: string;
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

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  messageId,
  messageContent,
  chatId,
}) => {
  const [analysis, setAnalysis] = useState<MessageAnalysis | null>(null);
  const [replies, setReplies] = useState<SmartReply[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'analysis' | 'replies'>('analysis');

  useEffect(() => {
    if (isOpen) {
      fetchAnalysis();
    }
  }, [isOpen, messageId]);

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      // Fetch message analysis
      const analysisResponse = await api.post('/ai-assistant/analyze-message', {
        messageId,
        chatId,
        userId: (window as any).__userId, // Get from your auth context
      });
      setAnalysis(analysisResponse.data);

      // Fetch smart replies
      const repliesResponse = await api.post('/ai-assistant/smart-replies', {
        messageId,
        chatId,
        userId: (window as any).__userId,
      });
      setReplies(repliesResponse.data);
    } catch (error) {
      console.error('Failed to analyze message:', error);
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
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl bg-white dark:bg-slate-800"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-slate-800 dark:to-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-400 to-blue-400 rounded-lg">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    ✨ AI Message Assistant
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Understanding your message
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-slate-700 px-6">
              <button
                onClick={() => setActiveTab('analysis')}
                className={`py-4 px-4 font-medium transition-colors relative ${
                  activeTab === 'analysis'
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              >
                Analysis
                {activeTab === 'analysis' && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-blue-500"
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab('replies')}
                className={`py-4 px-4 font-medium transition-colors relative ${
                  activeTab === 'replies'
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              >
                Smart Replies
                {activeTab === 'replies' && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-blue-500"
                  />
                )}
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <Sparkles className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-400">Analyzing message...</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Analysis Tab */}
                  {activeTab === 'analysis' && analysis && (
                    <div className="p-6 space-y-6">
                      {/* Original Message */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Original Message
                        </label>
                        <div className="p-4 bg-gray-100 dark:bg-slate-700 rounded-lg text-gray-800 dark:text-gray-200 italic">
                          "{messageContent}"
                        </div>
                      </div>

                      {/* Meaning */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          💡 Meaning
                        </label>
                        <p className="text-gray-700 dark:text-gray-300">{analysis.meaning}</p>
                      </div>

                      {/* Tone */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          🎭 Tone
                        </label>
                        <div className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                          {analysis.tone}
                        </div>
                      </div>

                      {/* Intent */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          🎯 Intent
                        </label>
                        <p className="text-gray-700 dark:text-gray-300">{analysis.intent}</p>
                      </div>

                      {/* Emotions */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          😊 Detected Emotions
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {analysis.emotions.map((emotion, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm font-medium"
                            >
                              {emotion}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Hidden Meaning */}
                      {analysis.hiddenMeaning && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                          <label className="block text-sm font-semibold text-amber-900 dark:text-amber-200 mb-2">
                            🔍 Hidden Meaning
                          </label>
                          <p className="text-amber-800 dark:text-amber-200">
                            {analysis.hiddenMeaning}
                          </p>
                        </div>
                      )}

                      {/* Red Flags */}
                      {analysis.redFlags && analysis.redFlags.length > 0 && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <label className="block text-sm font-semibold text-red-900 dark:text-red-200 mb-2">
                            ⚠️ Warning Flags
                          </label>
                          <ul className="space-y-1">
                            {analysis.redFlags.map((flag, i) => (
                              <li key={i} className="text-red-800 dark:text-red-200 flex items-start">
                                <span className="mr-2">•</span>
                                <span>{flag}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Confidence */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Confidence
                        </label>
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${analysis.confidence * 100}%` }}
                            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full"
                          />
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          {(analysis.confidence * 100).toFixed(0)}% confidence
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Replies Tab */}
                  {activeTab === 'replies' && replies.length > 0 && (
                    <div className="p-6 space-y-4">
                      {replies.map((reply, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="inline-block px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs font-semibold capitalize">
                                {reply.style}
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <MessageCircle className="w-4 h-4 text-blue-500" />
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                  Success Score: {reply.successScore}/10
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => copyToClipboard(reply.text, i)}
                              className="p-2 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                            >
                              {copiedIndex === i ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                              )}
                            </button>
                          </div>
                          <p className="text-gray-800 dark:text-gray-200">{reply.text}</p>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-slate-700 p-4 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
