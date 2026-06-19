import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';

@Injectable()
export class QuotationService {
  constructor(private prisma: PrismaService) {}

  private calcTotals(lineItems: CreateQuotationDto['lineItems']) {
    let subtotal = 0;
    const items = lineItems.map(item => {
      const amount = item.quantity * item.rate;
      const taxAmount = (amount * item.taxRate) / 100;
      subtotal += amount;
      return { ...item, amount, taxAmount };
    });
    const taxableAmount = subtotal;
    const totalTax = items.reduce((s, i) => s + i.taxAmount, 0);
    const cgst = totalTax / 2;
    const sgst = totalTax / 2;
    return { items, subtotal, taxableAmount, cgstAmount: cgst, sgstAmount: sgst, igstAmount: 0, totalAmount: subtotal + totalTax };
  }

  async create(tenantId: string, dto: CreateQuotationDto, userId: string) {
    const { items, subtotal, taxableAmount, cgstAmount, sgstAmount, igstAmount, totalAmount } = this.calcTotals(dto.lineItems);
    const count = await this.prisma.quotation.count({ where: { tenantId } });
    const quotationNo = `QT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.quotation.create({
      data: {
        tenantId, quotationNo,
        clientId: dto.clientId,
        tenderId: dto.tenderId,
        issueDate: new Date(dto.issueDate),
        validUntil: new Date(dto.validUntil),
        subtotal, taxableAmount, cgstAmount, sgstAmount, igstAmount, totalAmount,
        discount: 0,
        notes: dto.notes,
        termsConditions: dto.termsConditions,
        createdBy: userId,
        lineItems: {
          create: items.map(i => ({
            description: i.description, hsn: i.hsn,
            quantity: i.quantity, rate: i.rate,
            amount: i.amount, taxRate: i.taxRate, taxAmount: i.taxAmount,
          })),
        },
      },
      include: { client: true, tender: true, lineItems: true },
    });
  }

  async list(tenantId: string, query: any) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 15);
    const skip = (page - 1) * limit;
    const where: any = { tenantId, deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.clientSearch) where.client = { name: { contains: query.clientSearch, mode: 'insensitive' } };

    const [data, total] = await Promise.all([
      this.prisma.quotation.findMany({
        where, skip, take: limit,
        include: { client: true, tender: true, lineItems: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.quotation.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async get(tenantId: string, id: string) {
    const q = await this.prisma.quotation.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { client: true, tender: true, lineItems: true },
    });
    if (!q) throw new NotFoundException('Quotation not found');
    return q;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateQuotationDto> & { status?: string; discount?: number; issueDate?: string }) {
    await this.get(tenantId, id);
    let updateData: any = {};

    if (dto.lineItems && Array.isArray(dto.lineItems)) {
      const discount = Number(dto.discount ?? 0);
      const { items, subtotal, taxableAmount, cgstAmount, sgstAmount, igstAmount, totalAmount } = this.calcTotals(dto.lineItems);
      const discountedTaxable = taxableAmount - discount;
      await this.prisma.quotationLineItem.deleteMany({ where: { quotationId: id } });
      updateData = {
        subtotal, discount, taxableAmount: discountedTaxable,
        cgstAmount, sgstAmount, igstAmount, totalAmount: discountedTaxable + (cgstAmount + sgstAmount),
        lineItems: { create: items.map(i => ({ description: i.description, hsn: i.hsn, quantity: i.quantity, rate: i.rate, amount: i.amount, taxRate: i.taxRate, taxAmount: i.taxAmount })) },
      };
    }
    if (dto.clientId) updateData.clientId = dto.clientId;
    if (dto.tenderId !== undefined) updateData.tenderId = dto.tenderId || null;
    if (dto.issueDate) updateData.issueDate = new Date(dto.issueDate);
    if (dto.validUntil) updateData.validUntil = new Date(dto.validUntil);
    if (dto.status) updateData.status = dto.status;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.termsConditions !== undefined) updateData.termsConditions = dto.termsConditions;
    if (dto.discount !== undefined && !dto.lineItems) updateData.discount = dto.discount;

    return this.prisma.quotation.update({
      where: { id },
      data: updateData,
      include: { client: true, tender: true, lineItems: true },
    });
  }

  async convertToInvoice(tenantId: string, id: string, userId: string) {
    const q = await this.get(tenantId, id);
    const count = await this.prisma.invoice.count({ where: { tenantId } });
    const invoiceNo = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const now = new Date();
    const dueDate = new Date(now.getTime() + 30 * 86400000);

    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId, invoiceNo,
        clientId: q.clientId, tenderId: q.tenderId,
        issueDate: now, dueDate,
        subtotal: q.subtotal, discount: 0, taxableAmount: q.taxableAmount,
        cgstAmount: q.cgstAmount, sgstAmount: q.sgstAmount, igstAmount: q.igstAmount,
        totalAmount: q.totalAmount, paidAmount: 0, balanceAmount: q.totalAmount,
        notes: q.notes, termsConditions: q.termsConditions,
        createdBy: userId,
        lineItems: {
          create: q.lineItems.map(l => ({
            description: l.description, hsn: l.hsn,
            quantity: l.quantity, rate: l.rate,
            amount: l.amount, taxRate: l.taxRate, taxAmount: l.taxAmount,
          })),
        },
      },
      include: { client: true, tender: true, lineItems: true },
    });

    await this.prisma.quotation.update({ where: { id }, data: { status: 'ACCEPTED' } });
    return invoice;
  }
}
