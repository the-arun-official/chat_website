import { Router } from 'express';
import { ReportController, NotificationController } from '../controllers/features.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const reportController = new ReportController();
const notificationController = new NotificationController();

router.use(authenticate);

// Reports
router.post('/reports', reportController.submitReport);

// Notifications
router.get('/notifications', notificationController.getNotifications);
router.put('/notifications/read-all', notificationController.markAllAsRead);
router.put('/notifications/:id/read', notificationController.markAsRead);

export default router;
