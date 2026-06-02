import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (req: Request, res: Response) => {
    try {
      const user = await this.authService.register(req.body);
      res.status(201).json({ message: 'User registered successfully', user });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      const data = await this.authService.login(email, password);
      res.status(200).json(data);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  };

  logout = async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        await this.authService.logout(refreshToken);
      }
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  refreshToken = async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      const data = await this.authService.refreshToken(refreshToken);
      res.status(200).json(data);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  };

  forgotPassword = async (req: Request, res: Response) => {
    try {
      await this.authService.forgotPassword(req.body.email);
      // Always return 200 to prevent email enumeration
      res.status(200).json({ message: 'If that email exists, a reset link was sent.' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  validateResetToken = async (req: Request, res: Response) => {
    try {
      const token = req.params.token as string;
      const data = await this.authService.validateResetToken(token);
      res.status(200).json(data);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  resetPassword = async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;
      const data = await this.authService.resetPassword(token, newPassword);
      res.status(200).json(data);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  sendOtp = async (req: Request, res: Response) => {
    try {
      const data = await this.authService.sendOtp(req.body.email);
      res.status(200).json(data);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  verifyOtp = async (req: Request, res: Response) => {
    try {
      const { email, otpCode } = req.body;
      const data = await this.authService.verifyOtp(email, otpCode);
      // verifyOtp now returns { user, accessToken, refreshToken } after creating user in DB
      res.status(200).json(data);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };
}
