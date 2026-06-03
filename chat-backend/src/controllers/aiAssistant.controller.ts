import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { analyzeMessage, generateSmartReplies, analyzeConversationHealth } from '../services/aiAssistant.service';

export const analyzeMessageHandler = async (req: Request, res: Response) => {
  try {
    const { messageId, chatId, userId } = req.body;

    if (!messageId || !chatId || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify user has access to this chat
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { participants: true },
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const isParticipant = chat.participants.some((p) => p.id === userId);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get the message
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { sender: true },
    });

    if (!message || message.chatId !== chatId) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Analyze the message
    const analysis = await analyzeMessage(message.content || '', {
      senderName: message.sender.username,
      messageId,
      chatId,
    });

    return res.json(analysis);
  } catch (error) {
    console.error('[AIAssistant] Analysis error:', error);
    return res.status(500).json({ error: 'Failed to analyze message' });
  }
};

export const generateSmartRepliesHandler = async (req: Request, res: Response) => {
  try {
    const { messageId, chatId, userId } = req.body;

    if (!messageId || !chatId || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify access
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { participants: true },
    });

    if (!chat || !chat.participants.some((p) => p.id === userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message || message.chatId !== chatId) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Generate smart replies
    const replies = await generateSmartReplies(message.content || '', {
      chatId,
      userId,
    });

    return res.json(replies);
  } catch (error) {
    console.error('[AIAssistant] Reply generation error:', error);
    return res.status(500).json({ error: 'Failed to generate replies' });
  }
};

export const analyzeConversationHandler = async (req: Request, res: Response) => {
  try {
    const { chatId, userId } = req.body;

    if (!chatId || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify access
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { participants: true },
    });

    if (!chat || !chat.participants.some((p) => p.id === userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Analyze conversation health
    const analysis = await analyzeConversationHealth(chatId);

    return res.json(analysis);
  } catch (error) {
    console.error('[AIAssistant] Conversation analysis error:', error);
    return res.status(500).json({ error: 'Failed to analyze conversation' });
  }
};
