import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

@Injectable()
export class ActivityLogService {
  private s3: S3Client;

  constructor(private prisma: PrismaService) {
    this.s3 = new S3Client({
      region: process.env.AWS_REGION ?? 'ap-south-1',
      endpoint: process.env.AWS_S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
      },
      forcePathStyle: true,
    });
  }

  async uploadPhoto(tenantId: string, file: Express.Multer.File): Promise<string> {
    const key = `activity-logs/${tenantId}/${randomUUID()}-${file.originalname}`;
    await this.s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET ?? 'workzen',
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));
    return `${process.env.AWS_S3_ENDPOINT ?? ''}/${process.env.AWS_S3_BUCKET ?? 'workzen'}/${key}`;
  }

  async findAll(tenantId: string, siteId: string, startDate?: string, endDate?: string) {
    return this.prisma.siteActivityLog.findMany({
      where: {
        tenantId,
        siteId,
        deletedAt: null,
        ...(startDate && endDate ? { logDate: { gte: new Date(startDate), lte: new Date(endDate) } } : {}),
      },
      include: { supervisor: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { logDate: 'desc' },
    });
  }

  async findToday(tenantId: string, supervisorId: string, siteId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.prisma.siteActivityLog.findFirst({
      where: { tenantId, siteId, supervisorId, logDate: today, deletedAt: null },
    });
  }

  async upsert(tenantId: string, supervisorId: string, dto: CreateActivityLogDto) {
    const logDate = dto.logDate ? new Date(dto.logDate) : new Date();
    logDate.setHours(0, 0, 0, 0);
    return this.prisma.siteActivityLog.upsert({
      where: { tenantId_siteId_supervisorId_logDate: { tenantId, siteId: dto.siteId, supervisorId, logDate } },
      update: {
        workDone: dto.workDone,
        headcount: dto.headcount,
        hasIncident: dto.hasIncident ?? false,
        incidentType: dto.incidentType,
        incidentDesc: dto.incidentDesc,
        photoUrls: dto.photoUrls ?? [],
      },
      create: {
        tenantId,
        siteId: dto.siteId,
        supervisorId,
        logDate,
        workDone: dto.workDone,
        headcount: dto.headcount,
        hasIncident: dto.hasIncident ?? false,
        incidentType: dto.incidentType,
        incidentDesc: dto.incidentDesc,
        photoUrls: dto.photoUrls ?? [],
      },
    });
  }
}
