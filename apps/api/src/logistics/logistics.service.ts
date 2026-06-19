import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { paginate, buildPaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class LogisticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(tenantId: string) {
    const [totalDispatched, delivered, inTransit, totalReceived] = await Promise.all([
      this.prisma.logisticsDispatch.count({ where: { tenantId } }),
      this.prisma.logisticsDispatch.count({ where: { tenantId, status: 'DELIVERED' } }),
      this.prisma.logisticsDispatch.count({ where: { tenantId, status: 'IN_TRANSIT' } }),
      this.prisma.logisticsReceipt.count({ where: { tenantId } }),
    ]);

    const recentDispatches = await this.prisma.logisticsDispatch.findMany({
      where: { tenantId },
      include: { courierVendor: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return { totalDispatched, delivered, inTransit, totalReceived, recentDispatches };
  }

  // ── Courier Vendors ──────────────────────────────────────────────
  async getVendors(tenantId: string) {
    return this.prisma.courierVendor.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createVendor(tenantId: string, dto: any) {
    return this.prisma.courierVendor.create({ data: { ...dto, tenantId } });
  }

  async updateVendor(tenantId: string, id: string, dto: any) {
    return this.prisma.courierVendor.update({ where: { id }, data: dto });
  }

  // ── Dispatches ───────────────────────────────────────────────────
  async getDispatches(tenantId: string, query: any) {
    const { page = 1, limit = 15, search, status, contentType } = query;
    const where: any = { tenantId };
    if (status) where.status = status;
    if (contentType) where.contentType = contentType;
    if (search)
      where.OR = [
        { dispatchNo: { contains: search, mode: 'insensitive' } },
        { toName: { contains: search, mode: 'insensitive' } },
        { trackingNumber: { contains: search, mode: 'insensitive' } },
      ];

    const [data, total] = await Promise.all([
      this.prisma.logisticsDispatch.findMany({
        where,
        include: { courierVendor: { select: { id: true, name: true } } },
        orderBy: { dispatchDate: 'desc' },
        ...paginate(page, limit),
      }),
      this.prisma.logisticsDispatch.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async createDispatch(tenantId: string, userId: string, dto: any) {
    const count = await this.prisma.logisticsDispatch.count({ where: { tenantId } });
    const dispatchNo = `DSP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    return this.prisma.logisticsDispatch.create({
      data: { ...dto, tenantId, dispatchNo, dispatchedBy: userId },
    });
  }

  async updateDispatch(tenantId: string, id: string, dto: any) {
    return this.prisma.logisticsDispatch.update({ where: { id }, data: dto });
  }

  // ── Receipts ─────────────────────────────────────────────────────
  async getReceipts(tenantId: string, query: any) {
    const { page = 1, limit = 15, search, contentType } = query;
    const where: any = { tenantId };
    if (contentType) where.contentType = contentType;
    if (search)
      where.OR = [
        { receiptNo: { contains: search, mode: 'insensitive' } },
        { fromName: { contains: search, mode: 'insensitive' } },
        { trackingNumber: { contains: search, mode: 'insensitive' } },
      ];

    const [data, total] = await Promise.all([
      this.prisma.logisticsReceipt.findMany({
        where,
        include: { courierVendor: { select: { id: true, name: true } } },
        orderBy: { receivedDate: 'desc' },
        ...paginate(page, limit),
      }),
      this.prisma.logisticsReceipt.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async createReceipt(tenantId: string, dto: any) {
    const count = await this.prisma.logisticsReceipt.count({ where: { tenantId } });
    const receiptNo = `RCV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    return this.prisma.logisticsReceipt.create({
      data: { ...dto, tenantId, receiptNo },
    });
  }

  async updateReceipt(tenantId: string, id: string, dto: any) {
    return this.prisma.logisticsReceipt.update({ where: { id }, data: dto });
  }
}
