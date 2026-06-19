import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PaginationDto, paginate, buildPaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  async getAccounts(tenantId: string) {
    return this.prisma.account.findMany({ where: { tenantId, isActive: true }, orderBy: { code: 'asc' } });
  }

  async getJournalEntries(tenantId: string, query: PaginationDto) {
    const { page = 1, limit = 20 } = query;
    const where = { tenantId };
    const [data, total] = await Promise.all([
      this.prisma.journalEntry.findMany({ where, include: { lines: true }, orderBy: { date: 'desc' }, ...paginate(page, limit) }),
      this.prisma.journalEntry.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async getExpenses(tenantId: string, query: PaginationDto) {
    const { page = 1, limit = 20 } = query;
    const where = { tenantId };
    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({ where, orderBy: { date: 'desc' }, ...paginate(page, limit) }),
      this.prisma.expense.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async getDashboard(tenantId: string) {
    const today = new Date();
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
    const fyStart = new Date(today.getFullYear(), 3, 1); // April 1

    const [
      totalRevenue,
      thisMonthRevenue,
      lastMonthRevenue,
      outstanding,
      overdueCount,
      overdueAmount,
      gstLiability,
      topClients,
      agingBuckets,
      recentInvoices,
      collectionThisMonth,
      dsoData,
    ] = await Promise.all([
      // Total FY revenue
      this.prisma.invoice.aggregate({ where: { tenantId, issueDate: { gte: fyStart }, status: { not: 'CANCELLED' as any } }, _sum: { totalAmount: true } }),
      // This month billing
      this.prisma.invoice.aggregate({ where: { tenantId, issueDate: { gte: thisMonthStart }, status: { not: 'CANCELLED' as any } }, _sum: { totalAmount: true } }),
      // Last month billing
      this.prisma.invoice.aggregate({ where: { tenantId, issueDate: { gte: lastMonthStart, lte: lastMonthEnd }, status: { not: 'CANCELLED' as any } }, _sum: { totalAmount: true } }),
      // Outstanding AR
      this.prisma.invoice.aggregate({ where: { tenantId, status: { in: ['SENT', 'OVERDUE', 'PARTIALLY_PAID'] as any } }, _sum: { balanceAmount: true } }),
      // Overdue count
      this.prisma.invoice.count({ where: { tenantId, status: 'OVERDUE' as any } }),
      // Overdue amount
      this.prisma.invoice.aggregate({ where: { tenantId, status: 'OVERDUE' as any }, _sum: { balanceAmount: true } }),
      // GST liability (output tax)
      this.prisma.gSTLedger.aggregate({ where: { tenantId, direction: 'OUTPUT' as any }, _sum: { totalTax: true } }),
      // Top 5 clients by outstanding
      this.prisma.invoice.groupBy({ by: ['clientId'], where: { tenantId, status: { in: ['SENT', 'OVERDUE', 'PARTIALLY_PAID'] as any } }, _sum: { balanceAmount: true }, orderBy: { _sum: { balanceAmount: 'desc' } }, take: 5 }),
      // Aging buckets
      this.prisma.invoice.findMany({ where: { tenantId, status: { in: ['SENT', 'OVERDUE', 'PARTIALLY_PAID'] as any } }, select: { dueDate: true, balanceAmount: true } }),
      // Recent 5 invoices
      this.prisma.invoice.findMany({ where: { tenantId }, include: { client: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 5 }),
      // Collection this month
      this.prisma.payment.aggregate({ where: { tenantId, paymentDate: { gte: thisMonthStart }, status: 'RECEIVED' as any }, _sum: { amount: true } }),
      // DSO calc data
      this.prisma.invoice.aggregate({ where: { tenantId, issueDate: { gte: new Date(today.getFullYear() - 1, today.getMonth(), 1) }, status: { not: 'CANCELLED' as any } }, _sum: { totalAmount: true } }),
    ]);

    // Build aging buckets
    const aging = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
    for (const inv of agingBuckets) {
      const days = Math.floor((today.getTime() - new Date(inv.dueDate).getTime()) / 86400000);
      const amt = Number(inv.balanceAmount);
      if (days <= 0) aging.current += amt;
      else if (days <= 30) aging.days30 += amt;
      else if (days <= 60) aging.days60 += amt;
      else if (days <= 90) aging.days90 += amt;
      else aging.over90 += amt;
    }

    // Enrich top clients with names
    const clientIds = topClients.map(c => c.clientId);
    const clients = clientIds.length > 0 ? await this.prisma.client.findMany({ where: { id: { in: clientIds } }, select: { id: true, name: true } }) : [];
    const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));
    const enrichedTopClients = topClients.map(c => ({ clientId: c.clientId, clientName: clientMap[c.clientId] ?? 'Unknown', outstanding: Number(c._sum.balanceAmount ?? 0) }));

    // KPIs
    const fyRevenue = Number(totalRevenue._sum.totalAmount ?? 0);
    const arBalance = Number(outstanding._sum.balanceAmount ?? 0);
    const annualRevenue = Number(dsoData._sum.totalAmount ?? 1);
    const dso = Math.round((arBalance / annualRevenue) * 365);
    const thisMonth = Number(thisMonthRevenue._sum.totalAmount ?? 0);
    const lastMonth = Number(lastMonthRevenue._sum.totalAmount ?? 0);
    const revenueGrowth = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 10000) / 100 : 0;
    const collected = Number(collectionThisMonth._sum.amount ?? 0);
    const collectionEfficiency = thisMonth > 0 ? Math.round((collected / thisMonth) * 10000) / 100 : 0;

    return {
      kpis: { fyRevenue, thisMonthBilling: thisMonth, lastMonthBilling: lastMonth, revenueGrowth, arOutstanding: arBalance, overdueCount, overdueAmount: Number(overdueAmount._sum.balanceAmount ?? 0), gstLiability: Number(gstLiability._sum.totalTax ?? 0), dso, collectionEfficiency },
      aging,
      topClients: enrichedTopClients,
      recentInvoices,
    };
  }

  async getBankAccounts(tenantId: string, query: PaginationDto) {
    const { page = 1, limit = 20, search } = query;
    const where = { tenantId, ...(search && { OR: [{ accountName: { contains: search, mode: 'insensitive' as const } }, { bankName: { contains: search, mode: 'insensitive' as const } }] }) };
    const [data, total] = await Promise.all([
      this.prisma.bankAccount.findMany({ where, orderBy: { createdAt: 'desc' }, ...paginate(page, limit) }),
      this.prisma.bankAccount.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async createExpense(tenantId: string, dto: Record<string, unknown>, userId: string) {
    return this.prisma.expense.create({ data: { ...dto, tenantId, createdBy: userId } as any });
  }
}
