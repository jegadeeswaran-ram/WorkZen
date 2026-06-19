import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

export interface SendNotificationDto {
  tenantId: string;
  userId?: string;
  type: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH' | 'IN_APP';
  recipient: string;
  subject?: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {}

  async send(dto: SendNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        tenantId: dto.tenantId,
        userId: dto.userId,
        type: dto.type,
        recipient: dto.recipient,
        subject: dto.subject,
        body: dto.body,
        data: (dto.data ?? {}) as Prisma.InputJsonValue,
      },
    });
    await this.notificationsQueue.add('send', { notificationId: notification.id, ...dto });
    return notification;
  }

  async getUnread(tenantId: string, userId: string) {
    return this.prisma.notification.findMany({
      where: { tenantId, userId, type: 'IN_APP', readAt: null },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async markRead(tenantId: string, userId: string, ids: string[]) {
    return this.prisma.notification.updateMany({
      where: { tenantId, userId, id: { in: ids } },
      data: { readAt: new Date() },
    });
  }

  async getList(tenantId: string, userId: string, limit = 20) {
    const records = await this.prisma.notification.findMany({
      where: { tenantId, userId, type: 'IN_APP' },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return records.map(n => ({
      id: n.id,
      title: n.subject ?? '',
      body: n.body,
      type: n.type,
      isRead: !!n.readAt,
      createdAt: n.createdAt,
      data: n.data,
    }));
  }

  async markAllRead(tenantId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { tenantId, userId, type: 'IN_APP', readAt: null },
      data: { readAt: new Date() },
    });
  }
}
