import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { upload } from '../middlewares/upload.middleware';
import { updateProfileSchema } from '../validators/user.validator';

const router = Router();
const userController = new UserController();

// All user routes must be authenticated
router.use(authenticate);

// Profile Management
router.get('/me', userController.getMe);
router.put('/me', validate(updateProfileSchema), userController.updateProfile);
router.patch('/me', validate(updateProfileSchema), userController.updateProfile);
router.delete('/me', userController.deleteAccount);

// FCM Token Update
router.put('/me/fcm-token', userController.updateFcmToken);

// Avatar Upload (Requires multipart/form-data with 'avatar' field)
router.post('/me/avatar', upload.single('avatar'), userController.uploadAvatar);

// Search & Discovery
router.get('/search', userController.searchUsers);

// Blocking
router.get('/blocked', userController.getBlockedUsers);
router.post('/:id/block', userController.blockUser);
router.delete('/:id/block', userController.unblockUser);

// Online Status
router.get('/:id/status', userController.getUserStatus);

export default router;
