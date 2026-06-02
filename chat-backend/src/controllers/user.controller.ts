import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { FileService } from '../services/file.service';
import { prisma } from '../config/prisma';

export class UserController {
  private userService: UserService;
  private fileService: FileService;

  constructor() {
    this.userService = new UserService();
    this.fileService = new FileService();
  }

  getMe = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
      const user = await this.userService.getProfile(req.userId);
      res.status(200).json(user);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  };

  updateProfile = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
      const user = await this.userService.updateProfile(req.userId, req.body);
      res.status(200).json({ message: 'Profile updated successfully', user });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  deleteAccount = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
      await this.userService.deleteAccount(req.userId);
      res.status(200).json({ message: 'Account deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  uploadAvatar = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
      
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }
      
      // The file was already saved locally by Multer. Get the local URL.
      const fileUrl = await this.fileService.getLocalFileUrl(req.file.filename);
      
      // Update database profile
      const user = await this.userService.updateProfile(req.userId, { avatarUrl: fileUrl });
      
      res.status(200).json({ message: 'Avatar updated successfully', user });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  updateFcmToken = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
      const { fcmToken } = req.body;
      
      if (!fcmToken) {
        return res.status(400).json({ error: 'fcmToken is required' });
      }

      await this.userService.updateProfile(req.userId, { fcmToken });
      res.status(200).json({ message: 'FCM token updated successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  searchUsers = async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      const users = await this.userService.searchUsers(query);
      res.status(200).json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  getUserStatus = async (req: Request, res: Response) => {
    try {
      const status = await this.userService.getUserStatus(req.params.id as string);
      res.status(200).json(status);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  };

  blockUser = async (req: AuthRequest, res: Response) => {
    try {
      const blockedId = req.params.id as string;
      if (req.userId === blockedId) return res.status(400).json({ error: "Cannot block yourself" });
      
      const block = await prisma.blockedUser.create({
        data: { blockerId: req.userId!, blockedId }
      });
      res.status(201).json(block);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  unblockUser = async (req: AuthRequest, res: Response) => {
    try {
      const blockedId = req.params.id as string;
      await prisma.blockedUser.deleteMany({
        where: { blockerId: req.userId!, blockedId }
      });
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  getBlockedUsers = async (req: AuthRequest, res: Response) => {
    try {
      const blocked = await prisma.blockedUser.findMany({
        where: { blockerId: req.userId! },
        include: { blocked: { select: { id: true, username: true, avatarUrl: true } } }
      });
      res.status(200).json(blocked);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}
