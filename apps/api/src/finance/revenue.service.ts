import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class RevenueService {
  constructor(private prisma: PrismaService) {}

  async getRevenueSummary(tenantId: string, query: { from?: string; to?: string }) {
    const from = query.from ? new Date(query.from) : new Date(new Date().getFullYear(), 3, 1);
    const to = query.to ? new Date(query.to) : new Date();
    const [billed, recognized, deferred] = await Promise.all([
      this.prisma.invoice.aggregate({ where: { tenantId, issueDate: { gte: from, lte: to }, status: { not: 'CANCELLED' as any } }, _sum: { totalAmount: true } }),
      this.prisma.revenueSchedule.aggregate({ where: { tenantId, isRecognized: true, recognizedAt: { gte: from, lte: to } }, _sum: { recognizedAmount: true } }),
      this.prisma.revenueSchedule.aggregate({ where: { tenantId, isRecognized: false }, _sum: { scheduledAmount: true } }),
    ]);
    return {
      billedRevenue: Number(billed._sum.totalAmount ?? 0),
      recognizedRevenue: Number(recognized._sum.recognizedAmount ?? 0),
      deferredRevenue: Number(deferred._sum.scheduledAmount ?? 0),
    };
  }

  async getRevenueSchedules(tenantId: string, query: { invoiceId?: string; isRecognized?: boolean; from?: string; to?: string; page?: number; limit?: number }) {
    const { invoiceId, isRecognized, from, to, page = 1, limit = 20 } = query;
    const where: any = {
      tenantId,
      ...(invoiceId && { invoiceId }),
      ...(isRecognized !== undefined && { isRecognized }),
    };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.revenueSchedule.findMany({ where, include: { invoice: { select: { invoiceNo: true, client: { select: { name: true } } } } }, orderBy: { period: 'asc' }, skip, take: limit }),
      this.prisma.revenueSchedule.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async createRevenueSchedule(tenantId: string, dto: { invoiceId: string; schedules: { period: string; scheduledAmount: number }[] }) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id: dto.invoiceId, tenantId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return this.prisma.revenueSchedule.createMany({
      data: dto.schedules.map(s => ({ tenantId, invoiceId: dto.invoiceId, period: s.period, scheduledAmount: s.scheduledAmount })),
    });
  }

  async recognizeRevenue(tenantId: string, scheduleId: string) {
    const schedule = await this.prisma.revenueSchedule.findFirst({ where: { id: scheduleId, tenantId } });
    if (!schedule) throw new NotFoundException('Schedule not found');
    return this.prisma.revenueSchedule.update({
      where: { id: scheduleId },
      data: { isRecognized: true, recognizedAt: new Date(), recognizedAmount: schedule.scheduledAmount },
    });
  }

  async deferRevenue(tenantId: string, scheduleId: string, _reason: string) {
    const schedule = await this.prisma.revenueSchedule.findFirst({ where: { id: scheduleId, tenantId } });
    if (!schedule) throw new NotFoundException('Schedule not found');
    return this.prisma.revenueSchedule.update({ where: { id: scheduleId }, data: { isRecognized: false } });
  }

  async getMonthlyRevenueChart(tenantId: string, months = 12) {
    const result = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const from = new Date(d.getFullYear(), d.getMonth(), 1);
      const to = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const agg = await this.prisma.invoice.aggregate({ where: { tenantId, issueDate: { gte: from, lte: to }, status: { not: 'CANCELLED' as any } }, _sum: { totalAmount: true } });
      result.push({ month: from.toISOString().slice(0, 7), revenue: Number(agg._sum.totalAmount ?? 0) });
    }
    return result;
  }
}
