// src/routes/autoMessenger.routes.ts
import { Router } from 'express';
import { AutoMessengerController } from '../controllers/autoMessenger.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const ctrl = new AutoMessengerController();

router.use(authenticate);

// ═══════════════════════════════════════════════════════════
// GLOBAL ROUTES (must be FIRST, before :chatId parameter)
// ═══════════════════════════════════════════════════════════

router.get('/', ctrl.getAllConfigs);

router.get('/approvals/pending', ctrl.getPendingApprovals);
router.post('/approvals/:id/resolve', ctrl.resolveApproval);

router.get('/analytics/summary', ctrl.getAnalytics);
router.post('/learn-style', ctrl.learnStyle);

router.get('/health/providers', ctrl.healthCheck);

// ── PHASE 5: Pending Chat Reply (auto-reply for first-time contacts) ──
router.get('/pending-reply', ctrl.getPendingReply);
router.patch('/pending-reply', ctrl.updatePendingReply);

// ── PHASE 7: Daily Status ──
router.get('/daily-status', ctrl.getDailyStatus);
router.post('/daily-status', ctrl.setDailyStatus);
router.delete('/daily-status', ctrl.clearDailyStatus);

// ═══════════════════════════════════════════════════════════
// CHAT-SPECIFIC ROUTES (must be AFTER global routes)
// ═══════════════════════════════════════════════════════════

// Memory routes
router.get('/memory/:contactId', ctrl.getMemory);
router.put('/memory/:contactId', ctrl.updateMemory);

// Rules routes (BEFORE vip-contacts to avoid :chatId match)
router.get('/:chatId/rules', ctrl.getRules);
router.post('/:chatId/rules', ctrl.createRule);
router.patch('/:chatId/rules/:ruleId', ctrl.updateRule);
router.delete('/:chatId/rules/:ruleId', ctrl.deleteRule);

// ── PHASE 10: VIP Contacts ──
router.get('/:chatId/vip-contacts', ctrl.getVIPContacts);
router.post('/:chatId/vip-contacts/add', ctrl.addVIPContact);
router.post('/:chatId/vip-contacts/remove', ctrl.removeVIPContact);

// Config CRUD (LAST, catches :chatId pattern)
router.get('/:chatId', ctrl.getConfig);
router.put('/:chatId', ctrl.upsertConfig);

export default router;
