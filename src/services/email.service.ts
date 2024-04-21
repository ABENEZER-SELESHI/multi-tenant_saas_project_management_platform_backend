import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      secure: false,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null;

export class EmailService {
  async send(to: string, subject: string, html: string): Promise<void> {
    if (!transporter) {
      logger.info('Email skipped (no SMTP configured)', { to, subject });
      return;
    }
    await transporter.sendMail({ from: env.SMTP_FROM, to, subject, html });
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const url = `${env.CORS_ORIGIN}/verify-email?token=${token}`;
    await this.send(to, 'Verify your email — ProjectFlow', `<p>Click <a href="${url}">here</a> to verify your email.</p>`);
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const url = `${env.CORS_ORIGIN}/reset-password?token=${token}`;
    await this.send(to, 'Reset your password — ProjectFlow', `<p>Click <a href="${url}">here</a> to reset your password.</p>`);
  }

  async sendInvitationEmail(to: string, orgName: string, token: string): Promise<void> {
    const url = `${env.CORS_ORIGIN}/invitations/${token}`;
    await this.send(to, `Invitation to join ${orgName}`, `<p>You've been invited to join <strong>${orgName}</strong>. <a href="${url}">Accept invitation</a></p>`);
  }

  async sendNotificationEmail(to: string, title: string, body: string): Promise<void> {
    await this.send(to, title, `<p>${body}</p>`);
  }
}

export const emailService = new EmailService();
