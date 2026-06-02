import { emailQueue } from '../queues/email.queue';

export class EmailService {
  async sendPasswordResetEmail(email: string, resetToken: string) {
    // Add job to BullMQ queue, offloading work from main thread
    await emailQueue.add('send-password-reset', {
      email,
      resetToken
    });
  }

  async sendOtpEmail(email: string, otpCode: string) {
    await emailQueue.add('send-otp', {
      email,
      otpCode
    });
  }
}
