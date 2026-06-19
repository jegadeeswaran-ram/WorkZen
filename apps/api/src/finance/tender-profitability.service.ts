import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class TenderProfitabilityService {
  constructor(private prisma: PrismaService) {}

  private monthRange(period: string): [Date, Date] {
    const [y, m] = period.split('-').map(Number);
    return [new Date(y, m - 1, 1), new Date(y, m, 0, 23, 59, 59)];
  }

  async addCostEntry(tenantId: string, dto: { tenderId: string; costCenterId?: string; costType: string; amount: number; period: string; description?: string }, userId: string) {
    return this.prisma.tenderCostEntry.create({
      data: { tenantId, tenderId: dto.tenderId, costCenterId: dto.costCenterId, costType: dto.costType as any, amount: dto.amount, period: dto.period, description: dto.description, createdBy: userId },
    });
  }

  async getCostEntries(tenantId: string, tenderId: string, query: { period?: string; costType?: string }) {
    return this.prisma.tenderCostEntry.findMany({
      where: { tenantId, tenderId, ...(query.period && { period: query.period }), ...(query.costType && { costType: query.costType as any }) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async computeProfitability(tenantId: string, tenderId: string, period: string) {
    const tender = await this.prisma.tender.findFirst({ where: { id: tenderId, tenantId } });
    if (!tender) throw new NotFoundException('Tender not found');
    const [from, to] = this.monthRange(period);
    const revenueAgg = await this.prisma.invoice.aggregate({
      where: { tenantId, tenderId, status: { in: ['SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE'] as any }, issueDate: { gte: from, lte: to } },
      _sum: { totalAmount: true },
    });
    const revenue = Number(revenueAgg._sum.totalAmount ?? 0);
    const costEntries = await this.prisma.tenderCostEntry.findMany({ where: { tenantId, tenderId, period } });
    const byType: Record<string, number> = {};
    for (const e of costEntries) byType[e.costType] = (byType[e.costType] ?? 0) + Number(e.amount);
    const salaryCost = byType['SALARY'] ?? 0;
    const pfCost = byType['PF'] ?? 0;
    const esiCost = byType['ESI'] ?? 0;
    const adminCost = byType['ADMIN'] ?? 0;
    const travelCost = byType['TRAVEL'] ?? 0;
    const uniformCost = byType['UNIFORM'] ?? 0;
    const assetCost = byType['ASSET'] ?? 0;
    const otherCost = byType['OTHER'] ?? 0;
    const totalCost = salaryCost + pfCost + esiCost + adminCost + travelCost + uniformCost + assetCost + otherCost;
    const grossProfit = revenue - salaryCost - pfCost - esiCost;
    const netMargin = revenue > 0 ? Math.round(((revenue - totalCost) / revenue) * 10000) / 10000 : 0;
    return this.prisma.tenderProfitability.upsert({
      where: { tenantId_tenderId_period: { tenantId, tenderId, period } },
      create: { tenantId, tenderId, period, revenue, salaryCost, pfCost, esiCost, adminCost, travelCost, uniformCost, assetCost, otherCost, totalCost, grossProfit, netMargin },
      update: { revenue, salaryCost, pfCost, esiCost, adminCost, travelCost, uniformCost, assetCost, otherCost, totalCost, grossProfit, netMargin },
    });
  }

  async getProfitabilityHistory(tenantId: string, tenderId: string) {
    return this.prisma.tenderProfitability.findMany({ where: { tenantId, tenderId }, orderBy: { period: 'desc' } });
  }

  async getDashboard(tenantId: string) {
    const tenders = await this.prisma.tender.findMany({ where: { tenantId, status: { in: ['ACTIVE', 'AWARDED'] as any } }, select: { id: true, tenderName: true, tenderNumber: true } });
    const currentMonth = new Date().toISOString().slice(0, 7);
    const results = await Promise.all(tenders.map(async (t) => {
      const prof = await this.prisma.tenderProfitability.findFirst({ where: { tenantId, tenderId: t.id, period: currentMonth } });
      return { tenderId: t.id, tenderName: t.tenderName, tenderNumber: t.tenderNumber, currentMonth: prof ?? null };
    }));
    results.sort((a, b) => {
      const aN = a.currentMonth ? Number(a.currentMonth.revenue) - Number(a.currentMonth.totalCost) : 0;
      const bN = b.currentMonth ? Number(b.currentMonth.revenue) - Number(b.currentMonth.totalCost) : 0;
      return bN - aN;
    });
    return results;
  }

  async compareTenders(tenantId: string, tenderIds: string[], period: string) {
    return this.prisma.tenderProfitability.findMany({ where: { tenantId, tenderId: { in: tenderIds }, period }, include: { tender: { select: { tenderName: true, tenderNumber: true } } } });
  }
}
