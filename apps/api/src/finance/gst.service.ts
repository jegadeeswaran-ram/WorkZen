import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class GSTService {
  constructor(private prisma: PrismaService) {}

  async syncFromInvoice(tenantId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { client: { select: { gstin: true } } },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    const period = `${invoice.issueDate.getFullYear()}-${String(invoice.issueDate.getMonth() + 1).padStart(2, '0')}`;
    const existing = await this.prisma.gSTLedger.findFirst({ where: { tenantId, invoiceId } });
    if (existing) return existing;
    return this.prisma.gSTLedger.create({
      data: {
        tenantId,
        invoiceId,
        transactionDate: invoice.issueDate,
        direction: 'OUTPUT',
        taxableAmount: invoice.taxableAmount,
        cgstRate: 9,
        cgstAmount: invoice.cgstAmount,
        sgstRate: 9,
        sgstAmount: invoice.sgstAmount,
        igstRate: 0,
        igstAmount: invoice.igstAmount ?? 0,
        totalTax: Number(invoice.cgstAmount) + Number(invoice.sgstAmount) + Number(invoice.igstAmount ?? 0),
        period,
        isReconciled: false,
      },
    });
  }

  async getGSTLedger(tenantId: string, query: { period?: string; direction?: string; page?: number; limit?: number }) {
    const { period, direction, page = 1, limit = 20 } = query;
    const where = {
      tenantId,
      ...(period && { period }),
      ...(direction && { direction: direction as any }),
    };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.gSTLedger.findMany({
        where,
        include: { invoice: { select: { invoiceNo: true, clientId: true } } },
        orderBy: { transactionDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.gSTLedger.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getGSTR1Data(tenantId: string, period: string) {
    const entries = await this.prisma.gSTLedger.findMany({
      where: { tenantId, period, direction: 'OUTPUT' },
      include: { invoice: { include: { client: { select: { name: true, gstin: true } } } } },
    });
    const b2b: any[] = [];
    let b2cTotal = 0;
    for (const entry of entries) {
      const gstin = entry.invoice?.client?.gstin;
      if (gstin) {
        b2b.push({
          gstin,
          clientName: entry.invoice?.client?.name,
          invoiceNo: entry.invoice?.invoiceNo,
          taxableAmount: Number(entry.taxableAmount),
          cgst: Number(entry.cgstAmount),
          sgst: Number(entry.sgstAmount),
          igst: Number(entry.igstAmount),
          totalTax: Number(entry.totalTax),
        });
      } else {
        b2cTotal += Number(entry.taxableAmount);
      }
    }
    const totals = await this.prisma.gSTLedger.aggregate({
      where: { tenantId, period, direction: 'OUTPUT' },
      _sum: { taxableAmount: true, cgstAmount: true, sgstAmount: true, igstAmount: true, totalTax: true },
    });
    return {
      period,
      b2b,
      b2cTotal,
      totals: {
        taxableAmount: Number(totals._sum.taxableAmount ?? 0),
        cgst: Number(totals._sum.cgstAmount ?? 0),
        sgst: Number(totals._sum.sgstAmount ?? 0),
        igst: Number(totals._sum.igstAmount ?? 0),
        totalTax: Number(totals._sum.totalTax ?? 0),
      },
    };
  }

  async getGSTR3BSummary(tenantId: string, period: string) {
    const [output, input] = await Promise.all([
      this.prisma.gSTLedger.aggregate({
        where: { tenantId, period, direction: 'OUTPUT' },
        _sum: { taxableAmount: true, cgstAmount: true, sgstAmount: true, igstAmount: true, totalTax: true },
      }),
      this.prisma.gSTLedger.aggregate({
        where: { tenantId, period, direction: 'INPUT' },
        _sum: { taxableAmount: true, cgstAmount: true, sgstAmount: true, igstAmount: true, totalTax: true },
      }),
    ]);
    const outputTax = Number(output._sum.totalTax ?? 0);
    const inputTax = Number(input._sum.totalTax ?? 0);
    return {
      period,
      outputTax: {
        taxableAmount: Number(output._sum.taxableAmount ?? 0),
        cgst: Number(output._sum.cgstAmount ?? 0),
        sgst: Number(output._sum.sgstAmount ?? 0),
        igst: Number(output._sum.igstAmount ?? 0),
        total: outputTax,
      },
      inputTaxCredit: {
        taxableAmount: Number(input._sum.taxableAmount ?? 0),
        cgst: Number(input._sum.cgstAmount ?? 0),
        sgst: Number(input._sum.sgstAmount ?? 0),
        igst: Number(input._sum.igstAmount ?? 0),
        total: inputTax,
      },
      netGstPayable: outputTax - inputTax,
    };
  }

  async getHSNMaster(tenantId: string) {
    return this.prisma.hSNMaster.findMany({ where: { tenantId, isActive: true }, orderBy: { hsnCode: 'asc' } });
  }

  async createHSN(tenantId: string, dto: { hsnCode: string; description: string; defaultTaxRate?: number }, userId: string) {
    return this.prisma.hSNMaster.create({ data: { tenantId, ...dto, createdBy: userId } });
  }

  async getReconciliation(tenantId: string, period: string) {
    const ledgerEntries = await this.prisma.gSTLedger.findMany({
      where: { tenantId, period, direction: 'OUTPUT' },
      include: { invoice: { select: { invoiceNo: true } } },
    });
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId, status: { in: ['SENT', 'PAID', 'OVERDUE'] as any } },
      select: { id: true, invoiceNo: true, cgstAmount: true, sgstAmount: true, igstAmount: true, issueDate: true },
    });
    const invoicePeriodMap = invoices.filter(inv => {
      const p = `${inv.issueDate.getFullYear()}-${String(inv.issueDate.getMonth() + 1).padStart(2, '0')}`;
      return p === period;
    });
    const ledgerInvoiceIds = new Set(ledgerEntries.map(e => e.invoiceId).filter(Boolean));
    const matched = ledgerEntries.filter(e => e.invoiceId && ledgerInvoiceIds.has(e.invoiceId));
    const unmatchedInvoices = invoicePeriodMap.filter(inv => !ledgerInvoiceIds.has(inv.id));
    return { period, matched, unmatchedInvoices, totalMatched: matched.length, totalUnmatched: unmatchedInvoices.length };
  }
}
