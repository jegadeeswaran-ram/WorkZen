import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PaginationDto, paginate, buildPaginatedResponse } from '../common/dto/pagination.dto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DocumentsService {
  private s3: S3Client;
  private bucket: string;

  constructor(private prisma: PrismaService, private config: ConfigService) {
    this.bucket = config.get<string>('AWS_S3_BUCKET', 'workzen-docs');
    this.s3 = new S3Client({
      region: config.get<string>('AWS_REGION', 'ap-south-1'),
      credentials: {
        accessKeyId: config.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: config.get<string>('AWS_SECRET_ACCESS_KEY', ''),
      },
      ...(config.get('AWS_S3_ENDPOINT') && { endpoint: config.get('AWS_S3_ENDPOINT') }),
      forcePathStyle: true,
    });
  }

  async findAll(tenantId: string, query: PaginationDto & { documentType?: string }) {
    const { page = 1, limit = 20, search, documentType } = query;
    const where = {
      tenantId,
      ...(documentType && { documentType: documentType as any }),
      ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
    };
    const [data, total] = await Promise.all([
      this.prisma.document.findMany({ where, orderBy: { createdAt: 'desc' }, ...paginate(page, limit) }),
      this.prisma.document.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async getSignedUploadUrl(tenantId: string, fileName: string, contentType: string) {
    const key = `${tenantId}/${Date.now()}-${fileName}`;
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
    const url = await getSignedUrl(this.s3, command, { expiresIn: 3600 });
    return { uploadUrl: url, key };
  }

  async create(tenantId: string, dto: Record<string, unknown>, userId: string) {
    return this.prisma.document.create({ data: { ...dto, tenantId, uploadedBy: userId } as any });
  }

  async getDownloadUrl(tenantId: string, id: string) {
    const doc = await this.prisma.document.findFirst({ where: { id, tenantId } });
    if (!doc) throw new NotFoundException('Document not found');
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: doc.s3Key! });
    const url = await getSignedUrl(this.s3, command, { expiresIn: 3600 });
    return { downloadUrl: url };
  }

  async remove(tenantId: string, id: string) {
    const doc = await this.prisma.document.findFirst({ where: { id, tenantId } });
    if (!doc) throw new NotFoundException('Document not found');
    return this.prisma.document.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
