// src/controllers/autoMessenger.controller.ts
// Express controllers for Auto Messenger REST API.

import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AutoMessengerService } from '../services/autoMessenger.service';
import { createProviderManager } from '../ai/providers';

const service = new AutoMessengerService();
const providerManager = createProviderManager();

export class AutoMessengerController {
  getConfig = async (req: AuthRequest, res: Response) => {
    try {
      const config = await service.getConfig(req.userId!, req.params.chatId as string);
      res.json(config ?? null);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  getAllConfigs = async (req: AuthRequest, res: Response) => {
    try {
      const configs = await service.getAllConfigs(req.userId!);
      res.json(configs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  upsertConfig = async (req: AuthRequest, res: Response) => {
    try {
      const config = await service.upsertConfig(
        req.userId!,
        req.params.chatId as string,
        req.body
      );
      res.json(config);
    } catch (err: any) {
      const status = err.message.includes('not a member') ? 403 : 400;
      res.status(status).json({ error: err.message });
    }
  };

  getPendingApprovals = async (req: AuthRequest, res: Response) => {
    try {
      const approvals = await service.getPendingApprovals(req.userId!);
      res.json(approvals);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  resolveApproval = async (req: AuthRequest, res: Response) => {
    try {
      const { action, customReply } = req.body;

      if (!['APPROVED', 'REJECTED', 'CUSTOM_REPLIED'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
      }

      if (action === 'CUSTOM_REPLIED' && !customReply?.trim()) {
        return res.status(400).json({ error: 'customReply is required for CUSTOM_REPLIED action' });
      }

      const updated = await service.resolveApproval(
        req.userId!,
        req.params.id as string,
        action,
        customReply
      );
      res.json(updated);
    } catch (err: any) {
      const status = err.message.includes('authorized') ? 403 : 400;
      res.status(status).json({ error: err.message });
    }
  };

  getAnalytics = async (req: AuthRequest, res: Response) => {
    try {
      const days = parseInt((req.query.days as string) || '7');
      const analytics = await service.getAnalytics(req.userId!, days);
      res.json(analytics);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  learnStyle = async (req: AuthRequest, res: Response) => {
    try {
      const style = await service.triggerStyleLearning(req.userId!);
      res.json({ success: true, style });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  getMemory = async (req: AuthRequest, res: Response) => {
    try {
      const memory = await service.getContactMemory(req.userId!, req.params.contactId as string);
      res.json(memory);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  updateMemory = async (req: AuthRequest, res: Response) => {
    try {
      const memory = await service.updateContactMemory(
        req.userId!,
        req.params.contactId as string,
        req.body
      );
      res.json(memory);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  healthCheck = async (req: AuthRequest, res: Response) => {
    try {
      const status = providerManager.getProviderStatus();
      res.json({
        timestamp: new Date().toISOString(),
        providers: status,
        allHealthy: status.every(p => p.healthy),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };
}
