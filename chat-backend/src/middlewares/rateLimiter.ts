import rateLimit from 'express-rate-limit';

// General API rate limiter (e.g., 100 requests per 15 minutes)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for authentication routes (e.g., login, register)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: { error: 'Too many authentication attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiter for OTP/Emails to prevent spam & SendGrid quota exhaustion
export const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 emails per hour
  message: { error: 'Too many email requests from this IP, please try again after an hour' },
  standardHeaders: true,
  legacyHeaders: false,
});
