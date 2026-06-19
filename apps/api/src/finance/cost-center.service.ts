import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class CostCenterService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string) {
    return this.prisma.costCenter.findMany({
      where: { tenantId, isActive: true },
      include: { parent: { select: { name: true, code: true } }, children: { select: { id: true, name: true, code: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(tenantId: string, dto: { code: string; name: string; type?: string; referenceId?: string; parentId?: string; description?: string }, userId: string) {
    return this.prisma.costCenter.create({
      data: { tenantId, code: dto.code, name: dto.name, type: dto.type ?? 'DEPARTMENT', referenceId: dto.referenceId, parentId: dto.parentId, description: dto.description, createdBy: userId },
    });
  }

  async update(tenantId: string, id: string, dto: Record<string, unknown>) {
    const cc = await this.prisma.costCenter.findFirst({ where: { id, tenantId } });
    if (!cc) throw new NotFoundException('Cost center not found');
    return this.prisma.costCenter.update({ where: { id }, data: dto as any });
  }

  async remove(tenantId: string, id: string) {
    const cc = await this.prisma.costCenter.findFirst({ where: { id, tenantId } });
    if (!cc) throw new NotFoundException('Cost center not found');
    return this.prisma.costCenter.update({ where: { id }, data: { isActive: false } });
  }

  async getPnL(tenantId: string, costCenterId: string, query: { from?: string; to?: string }) {
    const cc = await this.prisma.costCenter.findFirst({ where: { id: costCenterId, tenantId } });
    if (!cc) throw new NotFoundException('Cost center not found');
    const { from, to } = query;
    const dateFilter = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    };

    let revenue = 0;
    if (cc.type === 'TENDER' && cc.referenceId) {
      const invAgg = await this.prisma.invoice.aggregate({
        where: { tenantId, tenderId: cc.referenceId, status: { in: ['SENT', 'PAID', 'OVERDUE', 'PARTIALLY_PAID'] as any }, ...(Object.keys(dateFilter).length && { issueDate: dateFilter }) },
        _sum: { totalAmount: true },
      });
      revenue = Number(invAgg._sum.totalAmount ?? 0);
    }

    const costAgg = await this.prisma.tenderCostEntry.aggregate({
      where: {
        tenantId,
        costCenterId,
        ...(from && { createdAt: { gte: new Date(from) } }),
        ...(to && { createdAt: { lte: new Date(to) } }),
      },
      _sum: { amount: true },
    });
    const expenseAgg = await this.prisma.expense.aggregate({
      where: { tenantId, costCenter: cc.name, ...(Object.keys(dateFilter).length && { date: dateFilter }) },
      _sum: { amount: true },
    });
    const totalCost = Number(costAgg._sum.amount ?? 0) + Number(expenseAgg._sum.amount ?? 0);
    const grossProfit = revenue - totalCost;
    const netMargin = revenue > 0 ? Math.round((grossProfit / revenue) * 10000) / 100 : 0;
    return { costCenter: cc, revenue, totalCost, grossProfit, netMargin };
  }
}
