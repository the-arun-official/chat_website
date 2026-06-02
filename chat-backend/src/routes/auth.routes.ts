import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate.middleware';
import { authLimiter, emailLimiter } from '../middlewares/rateLimiter';
import { 
  registerSchema, 
  loginSchema, 
  refreshTokenSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema,
  sendOtpSchema,
  verifyOtpSchema
} from '../validators/auth.validator';

const router = Router();
const authController = new AuthController();

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/logout', authController.logout); // Optional validation for refresh token
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);
router.post('/refresh-token', validate(refreshTokenSchema), authController.refreshToken); // Keeping for backwards compatibility
router.post('/forgot-password', emailLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.get('/reset-password/validate/:token', authController.validateResetToken);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.post('/send-otp', emailLimiter, validate(sendOtpSchema), authController.sendOtp);
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), authController.verifyOtp);

export default router;
