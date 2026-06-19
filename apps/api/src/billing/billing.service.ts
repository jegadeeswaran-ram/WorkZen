import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PaginationDto, paginate, buildPaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  async getInvoices(tenantId: string, query: PaginationDto & { status?: string; clientId?: string }) {
    const { page = 1, limit = 20, search, status, clientId } = query;
    const where = {
      tenantId,
      ...(status && { status: status as any }),
      ...(clientId && { clientId }),
      ...(search && { OR: [{ invoiceNo: { contains: search, mode: 'insensitive' as const } }] }),
    };
    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: { client: { select: { name: true } }, tender: { select: { tenderName: true } } },
        orderBy: { createdAt: 'desc' },
        ...paginate(page, limit),
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async getInvoice(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: { client: true, tender: true, lineItems: true, payments: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async createInvoice(tenantId: string, dto: Record<string, unknown>, userId: string) {
    const count = await this.prisma.invoice.count({ where: { tenantId } });
    const invoiceNo = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    return this.prisma.invoice.create({
      data: { ...dto, tenantId, invoiceNo, createdBy: userId } as any,
    });
  }

  async recordPayment(tenantId: string, invoiceId: string, dto: Record<string, unknown>, userId: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id: invoiceId, tenantId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    const payment = await this.prisma.payment.create({
      data: { ...dto, tenantId, invoiceId, createdBy: userId } as any,
    });
    const totalPaid = Number(invoice.paidAmount) + Number(dto['amount']);
    const newStatus = totalPaid >= Number(invoice.totalAmount) ? 'PAID' : 'PARTIALLY_PAID';
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { paidAmount: totalPaid, balanceAmount: Number(invoice.totalAmount) - totalPaid, status: newStatus as any },
    });
    return payment;
  }

  async updateInvoice(tenantId: string, id: string, dto: Record<string, unknown>) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, tenantId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const { lineItems, ...fields } = dto as any;

    if (lineItems && Array.isArray(lineItems)) {
      // Recalculate totals from line items
      const items = lineItems.map((item: any) => {
        const amount = Number(item.quantity) * Number(item.rate);
        const taxAmount = (amount * Number(item.taxRate)) / 100;
        return { ...item, amount, taxAmount };
      });
      const subtotal = items.reduce((s: number, i: any) => s + i.amount, 0);
      const totalTax = items.reduce((s: number, i: any) => s + i.taxAmount, 0);
      const discount = Number(fields.discount ?? 0);
      const taxableAmount = subtotal - discount;
      const cgst = totalTax / 2;
      const totalAmount = taxableAmount + totalTax;
      const paidAmount = Number(invoice.paidAmount);

      await this.prisma.$transaction([
        this.prisma.invoiceLineItem.deleteMany({ where: { invoiceId: id } }),
        this.prisma.invoice.update({
          where: { id },
          data: {
            ...fields,
            subtotal, discount, taxableAmount,
            cgstAmount: cgst, sgstAmount: cgst, igstAmount: 0,
            totalAmount, balanceAmount: totalAmount - paidAmount,
          } as any,
        }),
        ...items.map((item: any) =>
          this.prisma.invoiceLineItem.create({
            data: {
              invoiceId: id,
              description: item.description,
              hsn: item.hsn ?? null,
              quantity: item.quantity,
              rate: item.rate,
              amount: item.amount,
              taxRate: item.taxRate,
              taxAmount: item.taxAmount,
            },
          })
        ),
      ]);
      return this.prisma.invoice.findFirst({ where: { id }, include: { lineItems: true, client: true, tender: true, payments: true } });
    }

    return this.prisma.invoice.update({ where: { id }, data: fields as any });
  }

  async getDashboard(tenantId: string) {
    const [total, paid, overdue, outstanding] = await Promise.all([
      this.prisma.invoice.aggregate({ where: { tenantId }, _sum: { totalAmount: true } }),
      this.prisma.invoice.aggregate({ where: { tenantId, status: 'PAID' }, _sum: { totalAmount: true } }),
      this.prisma.invoice.count({ where: { tenantId, status: 'OVERDUE' } }),
      this.prisma.invoice.aggregate({ where: { tenantId, status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] } }, _sum: { balanceAmount: true } }),
    ]);
    return {
      totalRevenue: total._sum.totalAmount ?? 0,
      collected: paid._sum.totalAmount ?? 0,
      overdueCount: overdue,
      outstanding: outstanding._sum.balanceAmount ?? 0,
    };
  }

  async createCreditNote(tenantId: string, originalInvoiceId: string, dto: { description: string; amount: number; notes?: string }, userId: string) {
    const original = await this.prisma.invoice.findFirst({ where: { id: originalInvoiceId, tenantId } });
    if (!original) throw new NotFoundException('Invoice not found');
    const count = await this.prisma.invoice.count({ where: { tenantId } });
    const invoiceNo = `CN-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const cgst = dto.amount * 0.09;
    const sgst = dto.amount * 0.09;
    const total = dto.amount + cgst + sgst;
    return this.prisma.invoice.create({
      data: {
        tenantId,
        invoiceNo,
        invoiceType: 'CREDIT_NOTE' as any,
        clientId: original.clientId,
        tenderId: original.tenderId,
        issueDate: new Date(),
        dueDate: new Date(),
        subtotal: dto.amount,
        taxableAmount: dto.amount,
        cgstAmount: cgst,
        sgstAmount: sgst,
        totalAmount: total,
        paidAmount: 0,
        balanceAmount: total,
        discount: 0,
        status: 'SENT' as any,
        notes: dto.notes ?? `Credit note against ${original.invoiceNo}`,
        createdBy: userId,
      },
    });
  }

  async createDebitNote(tenantId: string, originalInvoiceId: string, dto: { description: string; amount: number; notes?: string }, userId: string) {
    const original = await this.prisma.invoice.findFirst({ where: { id: originalInvoiceId, tenantId } });
    if (!original) throw new NotFoundException('Invoice not found');
    const count = await this.prisma.invoice.count({ where: { tenantId } });
    const invoiceNo = `DN-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const cgst = dto.amount * 0.09;
    const sgst = dto.amount * 0.09;
    const total = dto.amount + cgst + sgst;
    return this.prisma.invoice.create({
      data: {
        tenantId,
        invoiceNo,
        invoiceType: 'DEBIT_NOTE' as any,
        clientId: original.clientId,
        tenderId: original.tenderId,
        issueDate: new Date(),
        dueDate: new Date(),
        subtotal: dto.amount,
        taxableAmount: dto.amount,
        cgstAmount: cgst,
        sgstAmount: sgst,
        totalAmount: total,
        paidAmount: 0,
        balanceAmount: total,
        discount: 0,
        status: 'SENT' as any,
        notes: dto.notes ?? `Debit note against ${original.invoiceNo}`,
        createdBy: userId,
      },
    });
  }

  async getAgingAnalysis(tenantId: string) {
    const today = new Date();
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId, status: { in: ['SENT', 'OVERDUE', 'PARTIALLY_PAID'] as any } },
      include: { client: { select: { name: true } } },
    });
    const buckets = { current: { count: 0, amount: 0 }, days30: { count: 0, amount: 0 }, days60: { count: 0, amount: 0 }, days90: { count: 0, amount: 0 }, over90: { count: 0, amount: 0 } };
    for (const inv of invoices) {
      const days = Math.floor((today.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      const amount = Number(inv.balanceAmount);
      if (days <= 0) { buckets.current.count++; buckets.current.amount += amount; }
      else if (days <= 30) { buckets.days30.count++; buckets.days30.amount += amount; }
      else if (days <= 60) { buckets.days60.count++; buckets.days60.amount += amount; }
      else if (days <= 90) { buckets.days90.count++; buckets.days90.amount += amount; }
      else { buckets.over90.count++; buckets.over90.amount += amount; }
    }
    return { buckets, invoices };
  }

  async getDso(tenantId: string) {
    const today = new Date();
    const yearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    const [arTotal, revenueTotal] = await Promise.all([
      this.prisma.invoice.aggregate({ where: { tenantId, status: { in: ['SENT', 'OVERDUE', 'PARTIALLY_PAID'] as any } }, _sum: { balanceAmount: true } }),
      this.prisma.invoice.aggregate({ where: { tenantId, issueDate: { gte: yearAgo }, status: { in: ['SENT', 'PAID', 'OVERDUE', 'PARTIALLY_PAID'] as any } }, _sum: { totalAmount: true } }),
    ]);
    const ar = Number(arTotal._sum.balanceAmount ?? 0);
    const revenue = Number(revenueTotal._sum.totalAmount ?? 1);
    const dso = Math.round((ar / revenue) * 365);
    return { dso, arTotal: ar, revenueLastYear: revenue };
  }

  async bulkStatusUpdate(tenantId: string, ids: string[], status: string) {
    return this.prisma.invoice.updateMany({ where: { tenantId, id: { in: ids } }, data: { status: status as any } });
  }
}
