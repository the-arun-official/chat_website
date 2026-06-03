import React from 'react';
import { Brain } from 'lucide-react';
import { motion } from 'framer-motion';

interface MessageAIButtonProps {
  onClick: () => void;
  isVisible?: boolean;
}

export const MessageAIButton: React.FC<MessageAIButtonProps> = ({ onClick, isVisible = true }) => {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: isVisible ? 1 : 0, scale: isVisible ? 1 : 0.8 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={!isVisible}
      className="p-2 rounded-lg hover:bg-gradient-to-r hover:from-purple-500 hover:to-blue-500 hover:text-white transition-all duration-200 text-gray-600 hover:shadow-lg flex items-center justify-center"
      title="Analyze with AI"
      type="button"
    >
      <Brain className="w-4 h-4" />
    </motion.button>
  );
};
