import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class CollectionService {
  constructor(private prisma: PrismaService) {}

  async listReceipts(tenantId: string, query: { clientId?: string; from?: string; to?: string; status?: string; page?: number; limit?: number }) {
    const { clientId, from, to, status, page = 1, limit = 20 } = query;
    const where = {
      tenantId,
      ...(clientId && { invoice: { clientId } }),
      ...(from && { paymentDate: { gte: new Date(from) } }),
      ...(to && { paymentDate: { lte: new Date(to) } }),
      ...(status && { status: status as any }),
    };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: { invoice: { select: { invoiceNo: true, clientId: true, client: { select: { name: true } } } } },
        orderBy: { paymentDate: 'desc' },
        skip, take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async recordAdvanceReceipt(tenantId: string, clientId: string, dto: { amount: number; paymentDate: string; paymentMethod: string; referenceNo?: string; notes?: string }, userId: string) {
    const firstInvoice = await this.prisma.invoice.findFirst({ where: { tenantId, clientId } });
    if (!firstInvoice) throw new BadRequestException('No invoice found for this client to link advance receipt');
    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        invoiceId: firstInvoice.id,
        amount: dto.amount,
        paymentDate: new Date(dto.paymentDate),
        paymentMethod: dto.paymentMethod,
        referenceNo: dto.referenceNo,
        notes: dto.notes ? `ADVANCE: ${dto.notes}` : 'ADVANCE RECEIPT',
        status: 'RECEIVED' as any,
        createdBy: userId,
      },
    });
    return payment;
  }

  async allocatePayment(tenantId: string, paymentId: string, allocations: { invoiceId: string; amount: number }[]) {
    const payment = await this.prisma.payment.findFirst({ where: { id: paymentId, tenantId } });
    if (!payment) throw new NotFoundException('Payment not found');
    const totalAllocated = allocations.reduce((s, a) => s + a.amount, 0);
    if (totalAllocated > Number(payment.amount)) throw new BadRequestException('Allocation exceeds payment amount');
    for (const alloc of allocations) {
      const invoice = await this.prisma.invoice.findFirst({ where: { id: alloc.invoiceId, tenantId } });
      if (!invoice) continue;
      const newPaid = Number(invoice.paidAmount) + alloc.amount;
      const newBalance = Number(invoice.totalAmount) - newPaid;
      const status = newBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';
      await this.prisma.invoice.update({ where: { id: alloc.invoiceId }, data: { paidAmount: newPaid, balanceAmount: Math.max(0, newBalance), status: status as any } });
    }
    await this.prisma.payment.update({ where: { id: paymentId }, data: { notes: `${payment.notes ?? ''} | ALLOCATED` } });
    return { allocated: allocations.length, totalAmount: totalAllocated };
  }

  async getUnallocatedReceipts(tenantId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { tenantId, notes: { contains: 'ADVANCE' } },
      include: { invoice: { select: { invoiceNo: true, clientId: true, client: { select: { name: true } } } } },
      orderBy: { paymentDate: 'desc' },
    });
    return payments;
  }

  async getChequeStatus(tenantId: string, query: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { tenantId, paymentMethod: 'CHEQUE' },
        include: { invoice: { select: { invoiceNo: true, client: { select: { name: true } } } } },
        orderBy: { paymentDate: 'desc' },
        skip, take: limit,
      }),
      this.prisma.payment.count({ where: { tenantId, paymentMethod: 'CHEQUE' } }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
