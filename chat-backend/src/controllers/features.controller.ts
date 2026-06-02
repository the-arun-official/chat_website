import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/prisma';

export class ReportController {
  submitReport = async (req: AuthRequest, res: Response) => {
    try {
      const { reportedId, chatId, reason } = req.body;
      const report = await prisma.report.create({
        data: {
          reporterId: req.userId!,
          reportedId,
          chatId,
          reason,
        }
      });
      res.status(201).json(report);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}

export class NotificationController {
  getNotifications = async (req: AuthRequest, res: Response) => {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId: req.userId! },
        orderBy: { createdAt: 'desc' }
      });
      res.status(200).json(notifications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  markAsRead = async (req: AuthRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      await prisma.notification.update({
        where: { id },
        data: { isRead: true }
      });
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  markAllAsRead = async (req: AuthRequest, res: Response) => {
    try {
      await prisma.notification.updateMany({
        where: { userId: req.userId!, isRead: false },
        data: { isRead: true }
      });
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}
