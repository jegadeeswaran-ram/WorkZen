import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintDto, ComplaintStatus } from './dto/update-complaint.dto';

@Injectable()
export class ComplaintsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, siteId?: string) {
    return this.prisma.siteComplaint.findMany({
      where: { tenantId, ...(siteId ? { siteId } : {}), deletedAt: null },
      include: {
        site: { select: { id: true, name: true, code: true } },
        reportedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const complaint = await this.prisma.siteComplaint.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        site: true,
        reportedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');
    return complaint;
  }

  async create(tenantId: string, userId: string, dto: CreateComplaintDto) {
    return this.prisma.siteComplaint.create({
      data: {
        tenantId,
        reportedById: userId,
        siteId: dto.siteId,
        category: dto.category,
        severity: dto.severity ?? 'MEDIUM',
        title: dto.title,
        description: dto.description,
        assignedToId: dto.assignedToId,
        attachments: dto.attachments ?? [],
        status: 'OPEN',
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateComplaintDto) {
    await this.findOne(tenantId, id);
    const extra: Record<string, unknown> = {};
    if (dto.status === ComplaintStatus.RESOLVED) extra.resolvedAt = new Date();
    if (dto.escalatedToId) extra.escalatedAt = new Date();
    return this.prisma.siteComplaint.update({
      where: { id, tenantId },
      data: { ...dto, ...extra },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.siteComplaint.update({ where: { id, tenantId }, data: { deletedAt: new Date() } });
  }
}
