import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ARService {
  constructor(private prisma: PrismaService) {}

  async getCustomerLedger(tenantId: string, clientId: string, query: { from?: string; to?: string; page?: number; limit?: number }) {
    const { from, to, page = 1, limit = 30 } = query;
    const where = {
      tenantId, clientId,
      ...(from && { transactionDate: { gte: new Date(from) } }),
      ...(to && { transactionDate: { lte: new Date(to) } }),
    };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.customerLedger.findMany({
        where,
        include: { invoice: { select: { invoiceNo: true } }, payment: { select: { referenceNo: true } } },
        orderBy: { transactionDate: 'asc' },
        skip, take: limit,
      }),
      this.prisma.customerLedger.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async createLedgerEntry(tenantId: string, dto: { clientId: string; transactionDate: Date; invoiceId?: string; paymentId?: string; description: string; debit?: number; credit?: number }) {
    const lastEntry = await this.prisma.customerLedger.findFirst({ where: { tenantId, clientId: dto.clientId }, orderBy: { transactionDate: 'desc' } });
    const prevBalance = lastEntry ? Number(lastEntry.runningBalance) : 0;
    const debit = dto.debit ?? 0;
    const credit = dto.credit ?? 0;
    const runningBalance = prevBalance + debit - credit;
    return this.prisma.customerLedger.create({
      data: { tenantId, clientId: dto.clientId, transactionDate: dto.transactionDate, invoiceId: dto.invoiceId, paymentId: dto.paymentId, description: dto.description, debit, credit, runningBalance },
    });
  }

  async getOutstandingByClient(tenantId: string) {
    const clients = await this.prisma.client.findMany({ where: { tenantId, isActive: true }, select: { id: true, name: true, clientCode: true, creditLimit: true } });
    const results = await Promise.all(clients.map(async (client) => {
      const agg = await this.prisma.invoice.aggregate({ where: { tenantId, clientId: client.id, status: { in: ['SENT', 'OVERDUE', 'PARTIALLY_PAID'] as any } }, _sum: { balanceAmount: true }, _count: true });
      const overdue = await this.prisma.invoice.aggregate({ where: { tenantId, clientId: client.id, status: 'OVERDUE' as any }, _sum: { balanceAmount: true } });
      return { clientId: client.id, clientName: client.name, clientCode: client.clientCode, creditLimit: Number(client.creditLimit ?? 0), totalOutstanding: Number(agg._sum.balanceAmount ?? 0), overdueAmount: Number(overdue._sum.balanceAmount ?? 0), invoiceCount: agg._count };
    }));
    return results.filter(r => r.totalOutstanding > 0).sort((a, b) => b.totalOutstanding - a.totalOutstanding);
  }

  async getAgingSummary(tenantId: string) {
    const invoices = await this.prisma.invoice.findMany({ where: { tenantId, status: { in: ['SENT', 'OVERDUE', 'PARTIALLY_PAID'] as any } }, select: { dueDate: true, balanceAmount: true } });
    const today = new Date();
    const buckets = { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, over90: 0, total: 0 };
    for (const inv of invoices) {
      const days = Math.floor((today.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      const amount = Number(inv.balanceAmount);
      buckets.total += amount;
      if (days <= 0) buckets.current += amount;
      else if (days <= 30) buckets.days1_30 += amount;
      else if (days <= 60) buckets.days31_60 += amount;
      else if (days <= 90) buckets.days61_90 += amount;
      else buckets.over90 += amount;
    }
    return buckets;
  }

  async getCreditLimitStatus(tenantId: string, clientId: string) {
    const client = await this.prisma.client.findFirst({ where: { id: clientId, tenantId } });
    if (!client) throw new NotFoundException('Client not found');
    const outstanding = await this.prisma.invoice.aggregate({ where: { tenantId, clientId, status: { in: ['SENT', 'OVERDUE', 'PARTIALLY_PAID'] as any } }, _sum: { balanceAmount: true } });
    const used = Number(outstanding._sum.balanceAmount ?? 0);
    const limit = Number(client.creditLimit ?? 0);
    return { clientId, creditLimit: limit, used, available: limit - used, utilizationPct: limit > 0 ? Math.round((used / limit) * 100) : 0, isOverLimit: used > limit };
  }

  async sendReminder(tenantId: string, clientId: string, userId: string) {
    const client = await this.prisma.client.findFirst({ where: { id: clientId, tenantId }, include: { contacts: { take: 3 } } });
    if (!client) throw new NotFoundException('Client not found');
    const overdue = await this.prisma.invoice.findMany({ where: { tenantId, clientId, status: { in: ['SENT', 'OVERDUE'] as any } }, select: { id: true, invoiceNo: true, totalAmount: true, balanceAmount: true, dueDate: true } });
    const notifications = overdue.map(inv => ({
      tenantId, type: 'EMAIL' as any, status: 'PENDING' as any,
      subject: `Payment Reminder: ${inv.invoiceNo}`,
      body: `Dear ${client.name}, Invoice ${inv.invoiceNo} of ₹${inv.totalAmount} is due. Please arrange payment.`,
      recipient: userId,
    }));
    if (notifications.length > 0) {
      await this.prisma.notification.createMany({ data: notifications });
    }
    await this.prisma.client.update({ where: { id: clientId }, data: { remindersSent: { increment: 1 }, lastReminderAt: new Date() } });
    return { sent: notifications.length, invoices: overdue.length };
  }
}
