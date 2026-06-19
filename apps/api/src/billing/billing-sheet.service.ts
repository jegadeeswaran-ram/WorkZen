import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class BillingSheetService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, query: { tenderId?: string; clientId?: string; status?: string; page?: number; limit?: number }) {
    const { tenderId, clientId, status, page = 1, limit = 20 } = query;
    const where = {
      tenantId,
      ...(tenderId && { tenderId }),
      ...(clientId && { clientId }),
      ...(status && { status: status as any }),
    };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.billingSheet.findMany({
        where,
        include: {
          tender: { select: { tenderName: true, tenderNumber: true } },
          client: { select: { name: true, clientCode: true } },
          _count: { select: { lines: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.billingSheet.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async create(tenantId: string, dto: { tenderId: string; clientId: string; billingCycle?: string; periodFrom: string; periodTo: string; notes?: string }, userId: string) {
    const sheetCount = await this.prisma.billingSheet.count({ where: { tenantId } });
    const sheetNo = `BS-${new Date().getFullYear()}-${String(sheetCount + 1).padStart(4, '0')}`;
    const periodFrom = new Date(dto.periodFrom);
    const periodTo = new Date(dto.periodTo);

    const deployments = await this.prisma.deployment.findMany({
      where: { tenantId, tenderId: dto.tenderId, status: 'ACTIVE' },
      include: { employee: { select: { id: true, designationId: true } } },
    });

    const sheet = await this.prisma.billingSheet.create({
      data: {
        tenantId,
        sheetNo,
        tenderId: dto.tenderId,
        clientId: dto.clientId,
        billingCycle: (dto.billingCycle ?? 'MONTHLY') as any,
        periodFrom,
        periodTo,
        notes: dto.notes,
        createdBy: userId,
      },
    });

    const lines: any[] = [];
    for (const dep of deployments) {
      const attCount = await this.prisma.attendanceRecord.count({
        where: {
          tenantId,
          employeeId: dep.employeeId,
          date: { gte: periodFrom, lte: periodTo },
          status: 'PRESENT',
        },
      });
      const halfDayCount = await this.prisma.attendanceRecord.count({
        where: { tenantId, employeeId: dep.employeeId, date: { gte: periodFrom, lte: periodTo }, status: 'HALF_DAY' },
      });
      const presentDays = attCount + halfDayCount * 0.5;

      const rate = await this.prisma.rateMaster.findFirst({
        where: {
          tenantId, tenderId: dto.tenderId, designationId: dep.employee.designationId,
          rateType: 'BASIC', isActive: true, effectiveFrom: { lte: periodFrom },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: periodTo } }],
        },
        orderBy: { effectiveFrom: 'desc' },
      });
      const dailyRate = rate ? Number(rate.amount) / 26 : 0;
      const billableAmount = presentDays * dailyRate;
      lines.push({
        tenantId, billingSheetId: sheet.id,
        employeeId: dep.employeeId,
        designationId: dep.employee.designationId,
        presentDays,
        rate: dailyRate,
        billableAmount,
        finalAmount: billableAmount,
      });
    }
    if (lines.length > 0) {
      await this.prisma.billingSheetLine.createMany({ data: lines });
    }

    const totals = await this.prisma.billingSheetLine.aggregate({
      where: { billingSheetId: sheet.id },
      _sum: { presentDays: true, finalAmount: true },
    });
    await this.prisma.billingSheet.update({
      where: { id: sheet.id },
      data: {
        totalMandays: totals._sum.presentDays ?? 0,
        totalBillableAmount: totals._sum.finalAmount ?? 0,
        netAmount: totals._sum.finalAmount ?? 0,
      },
    });
    return this.get(tenantId, sheet.id);
  }

  async get(tenantId: string, id: string) {
    const sheet = await this.prisma.billingSheet.findFirst({
      where: { id, tenantId },
      include: {
        tender: { select: { tenderName: true, tenderNumber: true } },
        client: { select: { name: true } },
        lines: {
          include: {
            employee: { select: { firstName: true, lastName: true, employeeCode: true } },
            designation: { select: { name: true } },
          },
        },
      },
    });
    if (!sheet) throw new NotFoundException('Billing sheet not found');
    return sheet;
  }

  async submit(tenantId: string, id: string, userId: string) {
    const sheet = await this.prisma.billingSheet.findFirst({ where: { id, tenantId } });
    if (!sheet) throw new NotFoundException('Billing sheet not found');
    if (sheet.status !== 'DRAFT') throw new BadRequestException('Only DRAFT sheets can be submitted');
    return this.prisma.billingSheet.update({ where: { id }, data: { status: 'SUBMITTED', updatedBy: userId } });
  }

  async approve(tenantId: string, id: string, userId: string) {
    const sheet = await this.prisma.billingSheet.findFirst({ where: { id, tenantId } });
    if (!sheet) throw new NotFoundException('Billing sheet not found');
    if (sheet.status !== 'SUBMITTED') throw new BadRequestException('Only SUBMITTED sheets can be approved');
    return this.prisma.billingSheet.update({ where: { id }, data: { status: 'APPROVED', approvedBy: userId, approvedAt: new Date(), updatedBy: userId } });
  }

  async post(tenantId: string, id: string, userId: string) {
    const sheet = await this.prisma.billingSheet.findFirst({ where: { id, tenantId }, include: { client: true } });
    if (!sheet) throw new NotFoundException('Billing sheet not found');
    if (sheet.status !== 'APPROVED') throw new BadRequestException('Only APPROVED sheets can be posted');
    const invoiceCount = await this.prisma.invoice.count({ where: { tenantId } });
    const invoiceNo = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(4, '0')}`;
    const taxableAmount = Number(sheet.netAmount);
    const cgst = taxableAmount * 0.09;
    const sgst = taxableAmount * 0.09;
    const totalAmount = taxableAmount + cgst + sgst;
    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId,
        invoiceNo,
        clientId: sheet.clientId,
        tenderId: sheet.tenderId,
        billingSheetId: sheet.id,
        periodFrom: sheet.periodFrom,
        periodTo: sheet.periodTo,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subtotal: taxableAmount,
        taxableAmount,
        cgstAmount: cgst,
        sgstAmount: sgst,
        totalAmount,
        paidAmount: 0,
        balanceAmount: totalAmount,
        discount: 0,
        status: 'DRAFT' as any,
        createdBy: userId,
      },
    });
    await this.prisma.billingSheet.update({ where: { id }, data: { status: 'POSTED', updatedBy: userId } });
    return { sheet: id, invoice: invoice.id, invoiceNo };
  }

  async updateLine(tenantId: string, sheetId: string, lineId: string, dto: { adjustmentAmount?: number; penaltyAmount?: number; notes?: string }) {
    const sheet = await this.prisma.billingSheet.findFirst({ where: { id: sheetId, tenantId } });
    if (!sheet) throw new NotFoundException('Billing sheet not found');
    const line = await this.prisma.billingSheetLine.findFirst({ where: { id: lineId, billingSheetId: sheetId } });
    if (!line) throw new NotFoundException('Line not found');
    const adj = dto.adjustmentAmount ?? Number(line.adjustmentAmount);
    const finalAmount = Number(line.billableAmount) + adj;
    const updated = await this.prisma.billingSheetLine.update({
      where: { id: lineId },
      data: { adjustmentAmount: adj, finalAmount, notes: dto.notes },
    });
    const totals = await this.prisma.billingSheetLine.aggregate({ where: { billingSheetId: sheetId }, _sum: { presentDays: true, finalAmount: true } });
    await this.prisma.billingSheet.update({ where: { id: sheetId }, data: { totalMandays: totals._sum.presentDays ?? 0, totalBillableAmount: totals._sum.finalAmount ?? 0, netAmount: totals._sum.finalAmount ?? 0 } });
    return updated;
  }
}
