import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ChatService } from '../services/chat.service';

export class ChatController {
  private chatService: ChatService;

  constructor() {
    this.chatService = new ChatService();
  }

  createPrivateChat = async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req.body;
      const chat = await this.chatService.getOrCreatePrivateChat(req.userId!, userId);
      res.status(200).json(chat);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  createGroupChat = async (req: AuthRequest, res: Response) => {
    try {
      const chat = await this.chatService.createGroupChat(req.userId!, req.body);
      res.status(201).json(chat);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  getUserChats = async (req: AuthRequest, res: Response) => {
    try {
      const chats = await this.chatService.getUserChats(req.userId!);
      res.status(200).json(chats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  markAsRead = async (req: AuthRequest, res: Response) => {
    try {
      const chatId = req.params.chatId as string;
      const participant = await this.chatService.toggleChatFeature(req.userId!, chatId, 'read');
      res.status(200).json(participant);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  toggleChatFeature = async (req: AuthRequest, res: Response, feature: 'pin' | 'archive' | 'mute') => {
    try {
      const chatId = req.params.chatId as string;
      const updatedParticipant = await this.chatService.toggleChatFeature(req.userId!, chatId, feature);
      res.status(200).json(updatedParticipant);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  togglePin = async (req: AuthRequest, res: Response) => this.toggleChatFeature(req, res, 'pin');
  toggleArchive = async (req: AuthRequest, res: Response) => this.toggleChatFeature(req, res, 'archive');
  toggleMute = async (req: AuthRequest, res: Response) => this.toggleChatFeature(req, res, 'mute');

  acceptRequest = async (req: AuthRequest, res: Response) => {
    try {
      const chatId = req.params.chatId as string;
      const participant = await this.chatService.acceptRequest(req.userId!, chatId);
      res.status(200).json(participant);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  declineRequest = async (req: AuthRequest, res: Response) => {
    try {
      const chatId = req.params.chatId as string;
      await this.chatService.declineRequest(req.userId!, chatId);
      res.status(200).json({ message: 'Request declined successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  hideChat = async (req: AuthRequest, res: Response) => {
    try {
      const chatId = req.params.chatId as string;
      await this.chatService.hideChat(req.userId!, chatId);
      res.status(200).json({ message: 'Chat hidden successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  updateGroupDetails = async (req: AuthRequest, res: Response) => {
    try {
      const chatId = req.params.chatId as string;
      const group = await this.chatService.updateGroupDetails(req.userId!, chatId, req.body);
      res.status(200).json(group);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  addGroupMembers = async (req: AuthRequest, res: Response) => {
    try {
      const chatId = req.params.chatId as string;
      const { userIds } = req.body;
      const participants = await this.chatService.addGroupMembers(req.userId!, chatId, userIds);
      res.status(200).json(participants);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  removeGroupMember = async (req: AuthRequest, res: Response) => {
    try {
      const chatId = req.params.chatId as string;
      const targetUserId = req.params.userId as string;
      await this.chatService.removeGroupMember(req.userId!, chatId, targetUserId);
      res.status(200).json({ message: 'Member removed successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  updateMemberRole = async (req: AuthRequest, res: Response) => {
    try {
      const chatId = req.params.chatId as string;
      const targetUserId = req.params.userId as string;
      const { role } = req.body;
      const participant = await this.chatService.updateMemberRole(req.userId!, chatId, targetUserId, role);
      res.status(200).json(participant);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };
}
