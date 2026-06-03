import express from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  analyzeMessageHandler,
  generateSmartRepliesHandler,
  analyzeConversationHandler,
} from '../controllers/aiAssistant.controller';

const router = express.Router();

// Analyze a specific message
router.post('/analyze-message', authenticate, analyzeMessageHandler);

// Generate smart replies for a message
router.post('/smart-replies', authenticate, generateSmartRepliesHandler);

// Analyze overall conversation health
router.post('/conversation-analysis', authenticate, analyzeConversationHandler);

export default router;
