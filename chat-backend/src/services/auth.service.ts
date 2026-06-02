import { UserRepository }  from '../repositories/user.repository';
import { TokenRepository } from '../repositories/token.repository';
import { hashPassword, comparePassword } from '../utils/hash';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { EmailService } from '../services/email.service';
import { bullRedisConnection } from '../config/bullmq';
import crypto from 'crypto';

const PENDING_TTL    = 60 * 15;  // 15 minutes in seconds
const RESET_TTL      = 60 * 60;  // 1 hour in seconds

const pendingKey = (email: string) => `pending_registration:${email.toLowerCase()}`;

interface PendingRegistration {
  email: string;
  username: string;
  passwordHash: string;
  otpCode: string;
  otpExpiresAt: number; // unix timestamp ms
}

export class AuthService {
  private userRepository:  UserRepository;
  private tokenRepository: TokenRepository;
  private emailService:    EmailService;

  constructor() {
    this.userRepository  = new UserRepository();
    this.tokenRepository = new TokenRepository();
    this.emailService    = new EmailService();
  }

  // ── Step 1: Pre-register (no DB write) ──────────────────────────────────
  async register(data: { email: string; username: string; password: string }) {
    // 1. Check uniqueness against existing verified accounts
    const existingEmail    = await this.userRepository.findByEmail(data.email);
    if (existingEmail)    throw new Error('Email is already registered');

    const existingUsername = await this.userRepository.findByUsername(data.username);
    if (existingUsername) throw new Error('Username is already taken');

    // 2. Hash password
    const passwordHash = await hashPassword(data.password);

    // 3. Generate OTP
    const otpCode      = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // 4. Store in Redis (NOT in DB)
    const payload: PendingRegistration = {
      email:        data.email.toLowerCase(),
      username:     data.username,
      passwordHash,
      otpCode,
      otpExpiresAt,
    };
    await bullRedisConnection.set(
      pendingKey(data.email),
      JSON.stringify(payload),
      'EX', PENDING_TTL,
    );

    // 5. Send OTP email
    console.log(`\n[DEV] OTP for ${data.email}: ${otpCode}\n`);
    await this.emailService.sendOtpEmail(data.email, otpCode);

    return { message: 'OTP sent. Please verify your email to complete registration.' };
  }

  // ── Step 2: Verify OTP → create user in DB ──────────────────────────────
  async verifyOtp(email: string, otpCode: string) {
    const key  = pendingKey(email);
    const raw  = await bullRedisConnection.get(key);

    if (!raw) {
      throw new Error('Verification session expired or not found. Please register again.');
    }

    const pending: PendingRegistration = JSON.parse(raw);

    if (pending.otpCode !== otpCode) {
      throw new Error('Invalid OTP code. Please check and try again.');
    }

    if (Date.now() > pending.otpExpiresAt) {
      await bullRedisConnection.del(key);
      throw new Error('OTP code has expired. Please request a new one.');
    }

    // All checks passed → create user in DB (verified from the start)
    const user = await this.userRepository.create({
      email:        pending.email,
      username:     pending.username,
      passwordHash: pending.passwordHash,
      isVerified:   true,
      // fullName is intentionally omitted — set later via PATCH /users/me in the profile step
    } as any);

    // Clean up Redis
    await bullRedisConnection.del(key);

    // Issue tokens
    const accessToken  = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    const expiresAt    = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await this.tokenRepository.create(user.id, refreshToken, expiresAt);

    const { passwordHash: _, otpCode: __, otpExpiresAt: ___, ...safeUser } = user as any;
    return { user: safeUser, accessToken, refreshToken };
  }

  // ── Resend OTP (pending session must exist) ──────────────────────────────
  async sendOtp(email: string) {
    const key = pendingKey(email);
    const raw = await bullRedisConnection.get(key);

    if (!raw) {
      // Could also be an existing DB user who lost their pending session
      throw new Error('No pending registration found. Please start the registration again.');
    }

    const pending: PendingRegistration = JSON.parse(raw);

    // Refresh OTP
    const otpCode      = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = Date.now() + 10 * 60 * 1000;
    pending.otpCode      = otpCode;
    pending.otpExpiresAt = otpExpiresAt;

    await bullRedisConnection.set(key, JSON.stringify(pending), 'EX', PENDING_TTL);

    console.log(`\n[DEV] Resent OTP for ${email}: ${otpCode}\n`);
    await this.emailService.sendOtpEmail(email, otpCode);

    return { message: 'A new OTP has been sent to your email.' };
  }

  // ── Login ────────────────────────────────────────────────────────────────
  async login(email: string, pass: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new Error('Incorrect email or password');

    const isMatch = await comparePassword(pass, user.passwordHash);
    if (!isMatch) throw new Error('Incorrect email or password');

    if (!user.isVerified) {
      throw new Error('Your account is not verified. Please complete registration first.');
    }

    const accessToken  = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    const expiresAt    = new Date();
    expiresAt.setDate(expiresAt.getDate() + 10);
    await this.tokenRepository.create(user.id, refreshToken, expiresAt);

    const { passwordHash: _, otpCode: __, otpExpiresAt: ___, ...safeUser } = user as any;
    return { user: safeUser, accessToken, refreshToken };
  }

  // ── Logout ───────────────────────────────────────────────────────────────
  async logout(refreshToken: string) {
    await this.tokenRepository.deleteByToken(refreshToken);
  }

  // ── Token rotation ───────────────────────────────────────────────────────
  async refreshToken(token: string) {
    const record = await this.tokenRepository.findByToken(token);
    if (!record) throw new Error('Invalid or revoked refresh token');

    try {
      const payload      = verifyRefreshToken(token);
      const accessToken  = generateAccessToken(payload.userId);
      const newRefresh   = generateRefreshToken(payload.userId);
      const expiresAt    = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await this.tokenRepository.deleteByToken(token);
      await this.tokenRepository.create(payload.userId, newRefresh, expiresAt);

      return { accessToken, refreshToken: newRefresh };
    } catch {
      await this.tokenRepository.deleteByToken(token).catch(() => {});
      throw new Error('Refresh token expired or invalid');
    }
  }

  // ── Forgot password ──────────────────────────────────────────────────────
  async forgotPassword(email: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) return; // Silent — prevent enumeration

    // Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenKey   = `password_reset:${resetToken}`;

    // Store in Redis: { email, userId } with 1-hour TTL
    await bullRedisConnection.set(
      tokenKey,
      JSON.stringify({ email: user.email, userId: user.id }),
      'EX', RESET_TTL,
    );

    console.log(`\n[DEV] Password reset link for ${email}: ${process.env.APP_URL}/reset-password?token=${resetToken}\n`);
    await this.emailService.sendPasswordResetEmail(email, resetToken);
  }

  // ── Validate Reset Token ────────────────────────────────────────────────
  async validateResetToken(token: string) {
    const tokenKey = `password_reset:${token}`;
    const raw = await bullRedisConnection.get(tokenKey);

    if (!raw) {
      throw new Error('This reset link is invalid or has expired.');
    }
    return { valid: true };
  }

  // ── Reset password ───────────────────────────────────────────────────────
  async resetPassword(token: string, newPassword: string) {
    const tokenKey = `password_reset:${token}`;
    const raw      = await bullRedisConnection.get(tokenKey);

    if (!raw) {
      throw new Error('This reset link is invalid or has expired. Please request a new one.');
    }

    const { userId } = JSON.parse(raw) as { email: string; userId: string };

    const passwordHash = await hashPassword(newPassword);
    await this.userRepository.updatePassword(userId, passwordHash);

    // Revoke ALL refresh tokens for security
    // (user should log in fresh after password change)
    await bullRedisConnection.del(tokenKey);

    return { message: 'Password reset successfully. Please log in with your new password.' };
  }
}
