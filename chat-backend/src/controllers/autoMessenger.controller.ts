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

  getRules = async (req: AuthRequest, res: Response) => {
    try {
      const rules = await service.getRules(req.userId!, req.params.chatId as string);
      res.json(rules);
    } catch (err: any) {
      const status = err.message.includes('not a member') ? 403 : 400;
      res.status(status).json({ error: err.message });
    }
  };

  createRule = async (req: AuthRequest, res: Response) => {
    try {
      const rule = await service.createRule(
        req.userId!,
        req.params.chatId as string,
        req.body
      );
      res.status(201).json(rule);
    } catch (err: any) {
      const status = err.message.includes('not a member') ? 403 : 400;
      res.status(status).json({ error: err.message });
    }
  };

  updateRule = async (req: AuthRequest, res: Response) => {
    try {
      const rule = await service.updateRule(
        req.userId!,
        req.params.chatId as string,
        req.params.ruleId as string,
        req.body
      );
      res.json(rule);
    } catch (err: any) {
      const status = err.message.includes('not found') ? 404 : err.message.includes('not a member') ? 403 : 400;
      res.status(status).json({ error: err.message });
    }
  };

  deleteRule = async (req: AuthRequest, res: Response) => {
    try {
      const result = await service.deleteRule(
        req.userId!,
        req.params.chatId as string,
        req.params.ruleId as string
      );
      res.json(result);
    } catch (err: any) {
      const status = err.message.includes('not found') ? 404 : err.message.includes('not a member') ? 403 : 400;
      res.status(status).json({ error: err.message });
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

  // ── PHASE 5: Pending Chat Reply ──
  getPendingReply = async (req: AuthRequest, res: Response) => {
    try {
      const config = await service.getPendingChatReply(req.userId!);
      res.json(config);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  updatePendingReply = async (req: AuthRequest, res: Response) => {
    try {
      const { message } = req.body;
      if (!message?.trim()) {
        return res.status(400).json({ error: 'message is required' });
      }

      const config = await service.updatePendingChatReply(req.userId!, message);
      res.json(config);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  // ── PHASE 7: Daily Status ──
  getDailyStatus = async (req: AuthRequest, res: Response) => {
    try {
      const status = await service.getDailyStatus(req.userId!);
      res.json(status ?? null);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  setDailyStatus = async (req: AuthRequest, res: Response) => {
    try {
      const { text, timezone } = req.body;
      const status = await service.setDailyStatus(req.userId!, text || '', timezone || 'Asia/Kolkata');
      res.json(status);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  clearDailyStatus = async (req: AuthRequest, res: Response) => {
    try {
      const result = await service.clearDailyStatus(req.userId!);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  // ── PHASE 10: VIP Contacts ──
  getVIPContacts = async (req: AuthRequest, res: Response) => {
    try {
      const chatId = req.params.chatId as string;
      const vipList = await service.getVIPContacts(req.userId!, chatId);
      res.json(vipList);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  addVIPContact = async (req: AuthRequest, res: Response) => {
    try {
      const chatId = req.params.chatId as string;
      const { contactUsername } = req.body;

      if (!contactUsername?.trim()) {
        return res.status(400).json({ error: 'contactUsername is required' });
      }

      const config = await service.addVIPContact(req.userId!, chatId, contactUsername);
      res.json(config);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  removeVIPContact = async (req: AuthRequest, res: Response) => {
    try {
      const chatId = req.params.chatId as string;
      const { contactUsername } = req.body;

      if (!contactUsername?.trim()) {
        return res.status(400).json({ error: 'contactUsername is required' });
      }

      const config = await service.removeVIPContact(req.userId!, chatId, contactUsername);
      res.json(config);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };
}
