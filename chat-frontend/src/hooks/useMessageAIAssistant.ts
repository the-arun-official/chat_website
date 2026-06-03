import { useState, useCallback } from 'react';

export interface MessageAIAssistantState {
  isOpen: boolean;
  messageId: string | null;
  messageContent: string | null;
  chatId: string | null;
}

export const useMessageAIAssistant = () => {
  const [state, setState] = useState<MessageAIAssistantState>({
    isOpen: false,
    messageId: null,
    messageContent: null,
    chatId: null,
  });

  // Open AI Assistant - Simple and Direct
  const openAIAssistant = useCallback(
    (messageId: string, content: string, chatId: string) => {
      setState({
        isOpen: true,
        messageId,
        messageContent: content,
        chatId,
      });
    },
    []
  );

  const closeModal = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return {
    state,
    openAIAssistant,
    closeModal,
  };
};
