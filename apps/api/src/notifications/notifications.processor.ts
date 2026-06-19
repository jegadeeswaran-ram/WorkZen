import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import * as nodemailer from 'nodemailer';

@Processor('notifications')
export class NotificationsProcessor {
  private readonly logger = new Logger(NotificationsProcessor.name);
  private transporter: nodemailer.Transporter;

  constructor(private prisma: PrismaService, private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST'),
      port: config.get<number>('SMTP_PORT', 587),
      secure: config.get('SMTP_SECURE') === 'true',
      auth: { user: config.get('SMTP_USER'), pass: config.get('SMTP_PASS') },
    });
  }

  @Process('send')
  async process(job: Job<{ notificationId: string; type: string; recipient: string; subject?: string; body: string }>) {
    const { notificationId, type, recipient, subject, body } = job.data;
    try {
      if (type === 'EMAIL') {
        await this.transporter.sendMail({
          from: this.config.get('EMAIL_FROM', 'WorkZen <noreply@workzen.com>'),
          to: recipient,
          subject: subject ?? 'Notification from WorkZen',
          html: body,
        });
      }
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { status: 'SENT', sentAt: new Date() },
      });
    } catch (err) {
      this.logger.error(`Failed to send notification ${notificationId}:`, err);
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { status: 'FAILED', failureReason: String(err) },
      });
    }
  }
}
