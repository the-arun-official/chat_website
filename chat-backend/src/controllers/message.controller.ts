import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { MessageService } from '../services/message.service';
import { FileService } from '../services/file.service';
import { prisma } from '../config/prisma';
import { getIO } from '../sockets/socket.server';

export class MessageController {
  private messageService: MessageService;
  private fileService: FileService;

  constructor() {
    this.messageService = new MessageService();
    this.fileService = new FileService();
  }

  sendMessage = async (req: AuthRequest, res: Response) => {
    try {
      const chatId = req.params.chatId as string;
      const message = await this.messageService.sendMessage(req.userId!, chatId, req.body);
      res.status(201).json(message);
    } catch (error: any) {
      // Differentiate between 403 Forbidden and 400 Bad Request
      const status = error.message.includes('participant') ? 403 : 400;
      res.status(status).json({ error: error.message });
    }
  };

  sendMediaMessage = async (req: AuthRequest, res: Response) => {
    try {
      const chatId = req.params.chatId as string;
      if (!req.file) {
        return res.status(400).json({ error: 'No media file provided' });
      }

      // The file was already saved locally by Multer. Get the local URL.
      const fileUrl = await this.fileService.getLocalFileUrl(req.file.filename);
      
      // Determine MessageType enum from mimetype
      let type: 'IMAGE' | 'VIDEO' | 'FILE' = 'FILE';
      if (req.file.mimetype.startsWith('image/')) type = 'IMAGE';
      else if (req.file.mimetype.startsWith('video/')) type = 'VIDEO';

      const payload = {
        content: fileUrl,
        type: type,
        parentMessageId: req.body.parentMessageId // Optional reply support
      };

      const message = await this.messageService.sendMessage(req.userId!, chatId, payload);
      res.status(201).json(message);
    } catch (error: any) {
      const status = error.message.includes('participant') ? 403 : 400;
      res.status(status).json({ error: error.message });
    }
  };

  getMessages = async (req: AuthRequest, res: Response) => {
    try {
      const chatId = req.params.chatId as string;
      const cursor = req.query.cursor as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      
      const messages = await this.messageService.getMessages(req.userId!, chatId, cursor, limit);
      res.status(200).json(messages);
    } catch (error: any) {
      res.status(403).json({ error: error.message });
    }
  };

  editMessage = async (req: AuthRequest, res: Response) => {
    try {
      const messageId = req.params.messageId as string;
      const { content } = req.body;
      const message = await this.messageService.editMessage(req.userId!, messageId, content);
      
      try { getIO().to(message.chatId).emit('message_updated', message); } catch(_) {}
      
      res.status(200).json(message);
    } catch (error: any) {
      const status = error.message.includes('own messages') ? 403 : 400;
      res.status(status).json({ error: error.message });
    }
  };

  deleteMessage = async (req: AuthRequest, res: Response) => {
    try {
      const messageId = req.params.messageId as string;
      const message = await this.messageService.deleteMessage(req.userId!, messageId);
      
      try { getIO().to(message.chatId).emit('message_deleted', message); } catch(_) {}
      
      res.status(200).json(message);
    } catch (error: any) {
      const status = error.message.includes('own messages') ? 403 : 400;
      res.status(status).json({ error: error.message });
    }
  };

  searchMessages = async (req: AuthRequest, res: Response) => {
    try {
      const chatId = req.params.chatId as string;
      const query = req.query.q as string;
      
      if (!query) {
        return res.status(400).json({ error: 'Search query (q) is required' });
      }

      const results = await this.messageService.searchMessages(chatId, query);
      res.status(200).json(results);
    } catch (error: any) {
      if (error.message.includes('Connection') || error.meta?.statusCode === 502) {
        return res.status(200).json({ warning: 'Search engine is unavailable locally. OpenSearch must be running on port 9200.', results: [] });
      }
      res.status(500).json({ error: error.message });
    }
  };

  toggleSaveMessage = async (req: AuthRequest, res: Response) => {
    try {
      const messageId = req.params.messageId as string;
      const existing = await prisma.savedMessage.findUnique({
        where: { userId_messageId: { userId: req.userId!, messageId } }
      });

      if (existing) {
        await prisma.savedMessage.delete({
          where: { userId_messageId: { userId: req.userId!, messageId } }
        });
        return res.status(200).json({ saved: false });
      } else {
        await prisma.savedMessage.create({
          data: { userId: req.userId!, messageId }
        });
        return res.status(200).json({ saved: true });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  getSavedMessages = async (req: AuthRequest, res: Response) => {
    try {
      const savedMessages = await prisma.savedMessage.findMany({
        where: { userId: req.userId! },
        include: {
          message: {
            include: {
              sender: { select: { id: true, username: true, avatarUrl: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.status(200).json(savedMessages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  toggleReaction = async (req: AuthRequest, res: Response) => {
    try {
      const messageId = req.params.messageId as string;
      const { emoji } = req.body;
      if (!emoji) return res.status(400).json({ error: 'emoji is required' });

      const message = await this.messageService.toggleReaction(req.userId!, messageId, emoji);

      if (message) {
        try { getIO().to(message.chatId).emit('message_updated', message); } catch(_) {}
      }

      res.status(200).json(message);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  translateMessage = async (req: AuthRequest, res: Response) => {
    try {
      const messageId = req.params.messageId as string;
      const { targetLanguage } = req.body;
      
      if (!targetLanguage) {
        return res.status(400).json({ error: 'targetLanguage is required' });
      }

      const message = await prisma.message.findUnique({
        where: { id: messageId },
      });

      if (!message || !message.content || message.type !== 'TEXT') {
        return res.status(404).json({ error: 'Message not found or has no text content' });
      }

      const translations = (message.translations as Record<string, string>) || {};

      // If already translated to this language, return cached version
      if (translations[targetLanguage]) {
        return res.status(200).json({ 
          id: message.id, 
          translations, 
          detectedLanguage: message.detectedLanguage 
        });
      }

      // Import service
      const { translationService } = await import('../services/translation.service');
      const { translatedText, detectedLanguage } = await translationService.translateMessage(message.content, targetLanguage);

      translations[targetLanguage] = translatedText;

      const updatedMessage = await prisma.message.update({
        where: { id: messageId },
        data: {
          translations: translations,
          detectedLanguage: message.detectedLanguage || detectedLanguage
        }
      });

      res.status(200).json({ 
        id: updatedMessage.id, 
        translations: updatedMessage.translations, 
        detectedLanguage: updatedMessage.detectedLanguage 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  translateDraft = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { text, targetLanguage } = req.body;
      if (!text || !targetLanguage) {
        res.status(400).json({ error: 'Text and targetLanguage are required' });
        return;
      }
      
      const { translationService } = await import('../services/translation.service');
      const { translatedText, detectedLanguage } = await translationService.translateMessage(text, targetLanguage);
      
      res.status(200).json({ translatedText, detectedLanguage });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}
