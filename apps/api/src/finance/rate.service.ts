import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class RateService {
  constructor(private prisma: PrismaService) {}

  async listRates(tenantId: string, query: { tenderId?: string; clientId?: string; designationId?: string; rateType?: string; page?: number; limit?: number }) {
    const { tenderId, clientId, designationId, rateType, page = 1, limit = 20 } = query;
    const where = {
      tenantId, isActive: true,
      ...(tenderId && { tenderId }),
      ...(clientId && { clientId }),
      ...(designationId && { designationId }),
      ...(rateType && { rateType: rateType as any }),
    };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.rateMaster.findMany({
        where,
        include: {
          tender: { select: { tenderName: true, tenderNumber: true } },
          client: { select: { name: true, clientCode: true } },
          designation: { select: { name: true } },
          escalations: true,
        },
        orderBy: { effectiveFrom: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.rateMaster.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async createRate(tenantId: string, dto: { tenderId?: string; clientId?: string; designationId?: string; rateType: string; amount: number; effectiveFrom: string; effectiveTo?: string; notes?: string }, userId: string) {
    return this.prisma.rateMaster.create({
      data: {
        tenantId,
        tenderId: dto.tenderId,
        clientId: dto.clientId,
        designationId: dto.designationId,
        rateType: dto.rateType as any,
        amount: dto.amount,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
        notes: dto.notes,
        createdBy: userId,
      },
    });
  }

  async updateRate(tenantId: string, id: string, dto: Record<string, unknown>) {
    const existing = await this.prisma.rateMaster.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Rate not found');
    return this.prisma.rateMaster.update({
      where: { id },
      data: dto as any,
    });
  }

  async deactivateRate(tenantId: string, id: string) {
    const existing = await this.prisma.rateMaster.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Rate not found');
    return this.prisma.rateMaster.update({ where: { id }, data: { isActive: false } });
  }

  async getRate(tenantId: string, id: string) {
    const rate = await this.prisma.rateMaster.findFirst({
      where: { id, tenantId },
      include: {
        tender: { select: { tenderName: true } },
        client: { select: { name: true } },
        designation: { select: { name: true } },
        escalations: { orderBy: { applicableFrom: 'asc' } },
      },
    });
    if (!rate) throw new NotFoundException('Rate not found');
    return rate;
  }

  async listEscalations(tenantId: string, rateMasterId: string) {
    const rate = await this.prisma.rateMaster.findFirst({ where: { id: rateMasterId, tenantId } });
    if (!rate) throw new NotFoundException('Rate not found');
    return this.prisma.escalationRule.findMany({ where: { rateMasterId }, orderBy: { applicableFrom: 'asc' } });
  }

  async createEscalation(tenantId: string, rateMasterId: string, dto: { escalationType: string; value: number; applicableFrom: string; notes?: string }, userId: string) {
    const rate = await this.prisma.rateMaster.findFirst({ where: { id: rateMasterId, tenantId } });
    if (!rate) throw new NotFoundException('Rate not found');
    return this.prisma.escalationRule.create({
      data: {
        tenantId,
        rateMasterId,
        escalationType: dto.escalationType as any,
        value: dto.value,
        applicableFrom: new Date(dto.applicableFrom),
        notes: dto.notes,
        createdBy: userId,
      },
    });
  }

  async lookupRate(tenantId: string, tenderId: string, designationId: string, rateType: string, date: Date) {
    return this.prisma.rateMaster.findFirst({
      where: {
        tenantId, tenderId, designationId,
        rateType: rateType as any,
        isActive: true,
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
  }
}
