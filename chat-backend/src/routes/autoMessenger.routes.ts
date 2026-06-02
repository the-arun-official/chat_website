// src/routes/autoMessenger.routes.ts
import { Router } from 'express';
import { AutoMessengerController } from '../controllers/autoMessenger.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const ctrl = new AutoMessengerController();

router.use(authenticate);

router.get('/', ctrl.getAllConfigs);

router.get('/approvals/pending', ctrl.getPendingApprovals);
router.post('/approvals/:id/resolve', ctrl.resolveApproval);

router.get('/analytics/summary', ctrl.getAnalytics);

router.post('/learn-style', ctrl.learnStyle);

router.get('/memory/:contactId', ctrl.getMemory);
router.put('/memory/:contactId', ctrl.updateMemory);

router.get('/health/providers', ctrl.healthCheck);

router.get('/:chatId/rules', ctrl.getRules);
router.post('/:chatId/rules', ctrl.createRule);
router.patch('/:chatId/rules/:ruleId', ctrl.updateRule);
router.delete('/:chatId/rules/:ruleId', ctrl.deleteRule);

router.get('/:chatId', ctrl.getConfig);
router.put('/:chatId', ctrl.upsertConfig);

export default router;
