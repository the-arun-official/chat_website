import { Router } from 'express';
import { MessageController } from '../controllers/message.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { upload } from '../middlewares/upload.middleware';
import { sendMessageSchema, editMessageSchema } from '../validators/message.validator';

const router = Router();
const messageController = new MessageController();

// Apply auth middleware to all message routes
router.use(authenticate);

// --- Routes bound to a specific Chat ---
// GET /api/chats/:chatId/messages/search (Needs to be above standard /messages)
router.get('/chats/:chatId/messages/search', messageController.searchMessages);

// GET /api/chats/:chatId/messages
router.get('/chats/:chatId/messages', messageController.getMessages);

// POST /api/chats/:chatId/messages (Text JSON)
router.post('/chats/:chatId/messages', validate(sendMessageSchema), messageController.sendMessage);

// POST /api/chats/:chatId/messages/media (Multipart Form Data)
router.post('/chats/:chatId/messages/media', upload.single('file'), messageController.sendMediaMessage);


// --- Routes bound to a specific Message ---
// Saved Messages
router.get('/messages/saved', messageController.getSavedMessages);
router.post('/messages/:messageId/save', messageController.toggleSaveMessage);

// PUT /api/messages/:messageId (and RESTful alias)
router.put('/messages/:messageId', validate(editMessageSchema), messageController.editMessage);
router.put('/chats/:chatId/messages/:messageId', validate(editMessageSchema), messageController.editMessage);

// DELETE /api/messages/:messageId (and RESTful alias)
router.delete('/messages/:messageId', messageController.deleteMessage);
router.delete('/chats/:chatId/messages/:messageId', messageController.deleteMessage);

// POST /api/messages/:messageId/react (toggle reaction)
router.post('/messages/:messageId/react', messageController.toggleReaction);

// POST /api/messages/:messageId/translate (AI translation)
router.post('/messages/:messageId/translate', messageController.translateMessage);
router.post('/chats/:chatId/messages/:messageId/translate', messageController.translateMessage);
// POST /api/messages/translate-draft (AI translation for drafting)
router.post('/messages/translate-draft', messageController.translateDraft as any);

export default router;
