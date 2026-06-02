import { Worker, Job } from 'bullmq';
import { bullRedisConnection } from '../config/bullmq';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const APP_NAME      = process.env.APP_NAME      || 'Cipher';
const APP_URL       = process.env.APP_URL        || 'http://localhost:5173';
const EMAIL_FROM    = process.env.EMAIL_FROM     || `"${APP_NAME}" <noreply@cipherapp.com>`;
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL  || 'support@cipherapp.com';
const YEAR          = new Date().getFullYear();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'apikey',
    pass: process.env.SENDGRID_API_KEY || process.env.SMTP_PASS,
  },
  pool: true,
});

// ── Anti-spam headers ─────────────────────────────────────────────────────
const HEADERS: Record<string, string> = {
  'X-Priority':         '1',
  'X-MSMail-Priority':  'High',
  'Importance':         'High',
  'X-Mailer':           `${APP_NAME} Notification Service`,
  'List-Unsubscribe':   `<mailto:${SUPPORT_EMAIL}?subject=unsubscribe>`,
};

// ── Shared wrapper (100% table-based, no inline-block) ────────────────────
const wrap = (innerRows: string) => `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
  style="background:#0a0a0a;min-height:100%;">
  <tr><td align="center" style="padding:40px 16px;">

    <!-- outer card -->
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"
      style="width:560px;max-width:560px;background:#141414;border-radius:20px;
             border:1px solid rgba(255,255,255,0.08);font-family:-apple-system,BlinkMacSystemFont,
             'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

      <!-- HEADER -->
      <tr>
        <td style="background:linear-gradient(135deg,#1a1a2e 0%,#0f0f23 100%);
                   padding:24px 36px;border-radius:20px 20px 0 0;
                   border-bottom:1px solid rgba(255,255,255,0.06);">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="36" height="36"
                      style="width:36px;height:36px;background:linear-gradient(135deg,#5b5cff,#7c7dff);
                             border-radius:10px;text-align:center;vertical-align:middle;
                             font-size:18px;font-weight:700;color:#fff;line-height:36px;">
                      C
                    </td>
                    <td style="padding-left:10px;font-size:17px;font-weight:600;
                               color:#ffffff;letter-spacing:-0.3px;vertical-align:middle;">
                      ${APP_NAME}
                    </td>
                  </tr>
                </table>
              </td>
              <td align="right" style="font-size:11px;color:rgba(255,255,255,0.3);vertical-align:middle;">
                Secure Messaging
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- BODY -->
      ${innerRows}

      <!-- FOOTER -->
      <tr>
        <td style="padding:20px 36px 24px;border-top:1px solid rgba(255,255,255,0.06);
                   background:#0f0f0f;border-radius:0 0 20px 20px;">
          <p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,0.3);line-height:1.6;">
            This email was sent by <strong style="color:rgba(255,255,255,0.5);">${APP_NAME}</strong>.
            If you did not request it, no action is required — your account is safe.
          </p>
          <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.2);">
            &copy; ${YEAR} ${APP_NAME}. All rights reserved.
            &nbsp;&bull;&nbsp;
            <a href="${APP_URL}" style="color:rgba(255,255,255,0.3);text-decoration:none;">${APP_URL}</a>
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

// ── OTP Template ──────────────────────────────────────────────────────────
const otpHtml = (otpCode: string) => wrap(`
  <tr>
    <td style="padding:36px 36px 0;">

      <!-- Icon circle -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding-bottom:24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="68" height="68"
                  style="width:68px;height:68px;border-radius:50%;
                         background:rgba(91,92,255,0.12);
                         border:1.5px solid rgba(91,92,255,0.3);
                         text-align:center;vertical-align:middle;
                         font-size:28px;line-height:68px;">
                  &#128272;
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Title -->
      <h1 style="margin:0 0 10px;font-size:26px;font-weight:600;color:#ffffff;
                 text-align:center;letter-spacing:-0.5px;line-height:1.3;">
        Verify your email address
      </h1>
      <p style="margin:0 0 30px;font-size:15px;color:rgba(255,255,255,0.5);
                text-align:center;line-height:1.6;">
        To complete your <strong style="color:rgba(255,255,255,0.7);">${APP_NAME}</strong>
        registration, enter the code below.
      </p>

      <!-- OTP card -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="background:linear-gradient(135deg,rgba(91,92,255,0.1),rgba(91,92,255,0.04));
                     border:1.5px solid rgba(91,92,255,0.28);border-radius:16px;
                     padding:28px 20px;text-align:center;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:500;
                      color:rgba(255,255,255,0.4);letter-spacing:2px;text-transform:uppercase;">
              YOUR VERIFICATION CODE
            </p>
            <p style="margin:0 0 10px;font-size:44px;font-weight:700;
                      letter-spacing:14px;color:#ffffff;
                      font-family:'Courier New',Courier,monospace;">
              ${otpCode}
            </p>
            <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.35);">
              Expires in <strong style="color:rgba(255,255,255,0.55);">10 minutes</strong>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="padding:24px 36px;">
      <!-- Instructions -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);
                     border-radius:12px;padding:16px 18px;">
            <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.5);line-height:1.8;">
              <strong style="color:rgba(255,255,255,0.7);">How to verify:</strong><br/>
              1. Copy the 6-digit code above.<br/>
              2. Go back to the ${APP_NAME} registration page.<br/>
              3. Enter it in the verification field &amp; continue.
            </p>
          </td>
        </tr>
      </table>

      <!-- Security note -->
      <p style="margin:20px 0 0;font-size:12px;color:rgba(255,255,255,0.25);
                text-align:center;line-height:1.6;">
        &#128274;&nbsp; ${APP_NAME} will never ask for this code over chat or phone.
      </p>
    </td>
  </tr>
`);

// ── Password Reset Template ───────────────────────────────────────────────
const resetHtml = (resetUrl: string) => wrap(`
  <tr>
    <td style="padding:36px 36px 0;">

      <!-- Icon circle -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding-bottom:24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="68" height="68"
                  style="width:68px;height:68px;border-radius:50%;
                         background:rgba(255,149,0,0.1);
                         border:1.5px solid rgba(255,149,0,0.3);
                         text-align:center;vertical-align:middle;
                         font-size:28px;line-height:68px;">
                  &#128273;
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <h1 style="margin:0 0 10px;font-size:26px;font-weight:600;color:#ffffff;
                 text-align:center;letter-spacing:-0.5px;line-height:1.3;">
        Reset your password
      </h1>
      <p style="margin:0 0 30px;font-size:15px;color:rgba(255,255,255,0.5);
                text-align:center;line-height:1.6;">
        We received a password reset request for your
        <strong style="color:rgba(255,255,255,0.7);">${APP_NAME}</strong> account.
        Click the button below to choose a new password.
      </p>

      <!-- CTA Button -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding-bottom:24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background:linear-gradient(135deg,#5b5cff,#7c7dff);
                           border-radius:12px;padding:14px 36px;">
                  <a href="${resetUrl}"
                    style="color:#ffffff;text-decoration:none;font-size:15px;
                           font-weight:600;letter-spacing:-0.2px;white-space:nowrap;">
                    Reset Password
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

    </td>
  </tr>

  <tr>
    <td style="padding:0 36px 24px;">
      <!-- Fallback URL -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);
                     border-radius:12px;padding:14px 18px;margin-bottom:16px;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:500;
                      color:rgba(255,255,255,0.4);letter-spacing:1.5px;text-transform:uppercase;">
              Button not working? Copy this link:
            </p>
            <p style="margin:0;font-size:12px;color:rgba(91,92,255,0.8);
                      word-break:break-all;font-family:'Courier New',Courier,monospace;">
              ${resetUrl}
            </p>
          </td>
        </tr>
      </table>

      <!-- Warning -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin-top:12px;">
        <tr>
          <td style="background:rgba(255,59,48,0.06);
                     border:1px solid rgba(255,59,48,0.18);
                     border-radius:12px;padding:14px 18px;">
            <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.5);line-height:1.8;">
              &#9203;&nbsp; This link expires in <strong style="color:rgba(255,255,255,0.7);">1 hour</strong>.<br/>
              &#128274;&nbsp; If you didn't request this, ignore this email — your account is safe.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
`);

// ── Worker ────────────────────────────────────────────────────────────────
export const emailWorker = new Worker('email-queue', async (job: Job) => {

  if (job.name === 'send-otp') {
    const { email, otpCode } = job.data;
    console.log(`✉️  [Email Worker] Sending OTP to ${email}`);

    await transporter.sendMail({
      from:    EMAIL_FROM,
      to:      email,
      replyTo: SUPPORT_EMAIL,
      subject: `${otpCode} — your ${APP_NAME} verification code`,
      headers: HEADERS,
      text: `Your ${APP_NAME} verification code is: ${otpCode}\n\nThis code expires in 10 minutes.\nDo not share this code with anyone.\n\nIf you didn't create an account, ignore this email.`,
      html: otpHtml(otpCode),
    });

    console.log(`✅ [Email Worker] OTP sent → ${email}`);

  } else if (job.name === 'send-password-reset') {
    const { email, resetToken } = job.data;
    console.log(`✉️  [Email Worker] Sending password reset to ${email}`);

    const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      from:    EMAIL_FROM,
      to:      email,
      replyTo: SUPPORT_EMAIL,
      subject: `Reset your ${APP_NAME} password`,
      headers: HEADERS,
      text: `Reset your ${APP_NAME} password here:\n${resetUrl}\n\nThis link expires in 1 hour.\nIf you didn't request this, ignore this email.`,
      html: resetHtml(resetUrl),
    });

    console.log(`✅ [Email Worker] Password reset sent → ${email}`);
  }

}, { 
  connection: bullRedisConnection as any,
  lockDuration: 60000 
});

emailWorker.on('completed', (job) => console.log(`✅ [BullMQ] "${job.name}" (${job.id}) done`));
emailWorker.on('failed', (job, err) => console.error(`❌ [BullMQ] "${job?.name}" failed:`, err.message));
