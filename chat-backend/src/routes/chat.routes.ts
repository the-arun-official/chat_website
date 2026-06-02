import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createPrivateChatSchema, createGroupChatSchema } from '../validators/chat.validator';

const router = Router();
const chatController = new ChatController();

// Apply auth middleware to all chat routes
router.use(authenticate);

// Get all chats for the logged in user
router.get('/', chatController.getUserChats);

// Create or fetch a 1-on-1 private chat
router.post('/private', validate(createPrivateChatSchema), chatController.createPrivateChat);

// Create a new group chat
router.post('/group', validate(createGroupChatSchema), chatController.createGroupChat);

// Create a channel
// router.post('/channel', validate(createGroupChatSchema), chatController.createChannel); // Pending validator if needed, can reuse group for now.

// Group Management
router.put('/:chatId/group', chatController.updateGroupDetails);
router.post('/:chatId/participants', chatController.addGroupMembers);
router.delete('/:chatId/participants/:userId', chatController.removeGroupMember);
router.put('/:chatId/participants/:userId/role', chatController.updateMemberRole);

// Toggle Chat Features
router.put('/:chatId/pin', chatController.togglePin);
router.put('/:chatId/archive', chatController.toggleArchive);
router.put('/:chatId/mute', chatController.toggleMute);
router.put('/:chatId/read', chatController.markAsRead);
router.put('/:chatId/accept', chatController.acceptRequest);
router.put('/:chatId/hide', chatController.hideChat);
router.delete('/:chatId/decline', chatController.declineRequest);

export default router;
