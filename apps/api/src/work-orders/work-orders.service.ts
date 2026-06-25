import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import * as nodemailer from 'nodemailer';
import { paginate, buildPaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class WorkOrdersService {
  constructor(private prisma: PrismaService) {}

  // ── Dashboard ─────────────────────────────────────────────────────
  async getDashboard(tenantId: string) {
    const [total, active, fulfilled, totalValue, overdueInvoices, pendingPayments] =
      await Promise.all([
        this.prisma.workOrder.count({ where: { tenantId, deletedAt: null } }),
        this.prisma.workOrder.count({ where: { tenantId, status: 'ACTIVE', deletedAt: null } }),
        this.prisma.workOrder.count({ where: { tenantId, status: 'FULFILLED', deletedAt: null } }),
        this.prisma.workOrder.aggregate({
          where: { tenantId, deletedAt: null },
          _sum: { value: true },
        }),
        this.prisma.workOrderInvoice.count({
          where: { tenantId, status: { in: ['DRAFT', 'SUBMITTED'] } },
        }),
        this.prisma.workOrderPayment.aggregate({
          where: { tenantId },
          _sum: { amount: true },
        }),
      ]);

    const recentWOs = await this.prisma.workOrder.findMany({
      where: { tenantId, deletedAt: null },
      include: { tender: { select: { tenderName: true, tenderNumber: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return {
      total,
      active,
      fulfilled,
      totalValue: Number(totalValue._sum.value ?? 0),
      overdueInvoices,
      totalPaymentsReceived: Number(pendingPayments._sum.amount ?? 0),
      recentWOs,
    };
  }

  // ── Work Orders ───────────────────────────────────────────────────
  async findAll(tenantId: string, query: any) {
    const { page = 1, limit = 15, search, status, tenderId } = query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const where: any = { tenantId, deletedAt: null };
    if (status) where.status = status;
    if (tenderId) where.tenderId = tenderId;
    if (search)
      where.OR = [
        { workOrderNo: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ];

    const [data, total] = await Promise.all([
      this.prisma.workOrder.findMany({
        where,
        include: {
          tender: { select: { id: true, tenderName: true, tenderNumber: true } },
          _count: { select: { positions: true, fulfillments: true, milestones: true } },
        },
        orderBy: { createdAt: 'desc' },
        ...paginate(pageNum, limitNum),
      }),
      this.prisma.workOrder.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, pageNum, limitNum);
  }

  async findOne(tenantId: string, id: string) {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        tender: { select: { id: true, tenderName: true, tenderNumber: true } },
        positions: true,
        milestones: { orderBy: { percentage: 'asc' } },
        amendments: { orderBy: { version: 'desc' } },
        woInvoices: { orderBy: { createdAt: 'desc' } },
        woPayments: { orderBy: { paymentDate: 'desc' } },
        fulfillments: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
            position: { select: { id: true, designation: true } },
          },
        },
      },
    });
    if (!wo) throw new NotFoundException('Work order not found');
    return wo;
  }

  async create(tenantId: string, userId: string, dto: any) {
    const { positions, milestones, ...data } = dto;
    return this.prisma.workOrder.create({
      data: {
        ...data,
        tenantId,
        createdBy: userId,
        updatedBy: userId,
        positions: positions?.length
          ? { create: positions.map((p: any) => ({ ...p, tenantId })) }
          : undefined,
        milestones: milestones?.length
          ? { create: milestones.map((m: any) => ({ ...m, tenantId })) }
          : undefined,
      },
      include: {
        positions: true,
        milestones: true,
        tender: { select: { id: true, tenderName: true } },
      },
    });
  }

  async update(tenantId: string, id: string, userId: string, dto: any) {
    await this.findOne(tenantId, id);
    return this.prisma.workOrder.update({
      where: { id },
      data: { ...dto, updatedBy: userId },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.workOrder.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // ── Positions ─────────────────────────────────────────────────────
  async getPositions(tenantId: string, workOrderId: string) {
    return this.prisma.workOrderPosition.findMany({ where: { workOrderId, tenantId } });
  }

  async createPosition(tenantId: string, workOrderId: string, dto: any) {
    await this.findOne(tenantId, workOrderId);
    return this.prisma.workOrderPosition.create({ data: { ...dto, workOrderId, tenantId } });
  }

  async updatePosition(tenantId: string, id: string, dto: any) {
    const pos = await this.prisma.workOrderPosition.findFirst({ where: { id, tenantId } });
    if (!pos) throw new NotFoundException('Position not found');
    return this.prisma.workOrderPosition.update({ where: { id }, data: dto });
  }

  // ── Milestones ────────────────────────────────────────────────────
  async getMilestones(tenantId: string, workOrderId: string) {
    return this.prisma.workOrderMilestone.findMany({
      where: { workOrderId, tenantId },
      orderBy: { percentage: 'asc' },
      include: { invoices: true },
    });
  }

  async createMilestone(tenantId: string, workOrderId: string, dto: any) {
    await this.findOne(tenantId, workOrderId);
    return this.prisma.workOrderMilestone.create({ data: { ...dto, workOrderId, tenantId } });
  }

  async updateMilestone(tenantId: string, id: string, dto: any) {
    const mil = await this.prisma.workOrderMilestone.findFirst({ where: { id, tenantId } });
    if (!mil) throw new NotFoundException('Milestone not found');
    return this.prisma.workOrderMilestone.update({ where: { id }, data: dto });
  }

  // ── Amendments ────────────────────────────────────────────────────
  async getAmendments(tenantId: string, workOrderId: string) {
    return this.prisma.workOrderAmendment.findMany({
      where: { workOrderId, tenantId },
      orderBy: { version: 'desc' },
    });
  }

  async createAmendment(tenantId: string, workOrderId: string, userId: string, dto: any) {
    const wo = await this.findOne(tenantId, workOrderId);
    const newVersion = wo.currentVersion + 1;
    const [amendment] = await this.prisma.$transaction([
      this.prisma.workOrderAmendment.create({
        data: {
          ...dto,
          workOrderId,
          tenantId,
          version: newVersion,
          createdBy: userId,
        },
      }),
      this.prisma.workOrder.update({
        where: { id: workOrderId },
        data: {
          currentVersion: newVersion,
          ...(dto.newValue && { value: dto.newValue }),
          ...(dto.newStrength && { sanctionedStrength: dto.newStrength }),
          ...(dto.newEndDate && { endDate: dto.newEndDate }),
        },
      }),
    ]);
    return amendment;
  }

  // ── Fulfillments ──────────────────────────────────────────────────
  async getFulfillments(tenantId: string, workOrderId: string) {
    return this.prisma.workOrderFulfillment.findMany({
      where: { workOrderId, tenantId },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        position: { select: { id: true, designation: true } },
      },
      orderBy: { deployedDate: 'desc' },
    });
  }

  async addFulfillment(tenantId: string, workOrderId: string, dto: any) {
    await this.findOne(tenantId, workOrderId);
    const fulfillment = await this.prisma.workOrderFulfillment.create({
      data: { ...dto, workOrderId, tenantId },
    });
    await this.prisma.workOrderPosition.update({
      where: { id: dto.positionId },
      data: { deployedCount: { increment: 1 } },
    });
    return fulfillment;
  }

  async releaseFulfillment(tenantId: string, id: string, releasedDate: string) {
    const ff = await this.prisma.workOrderFulfillment.findFirst({ where: { id, tenantId } });
    if (!ff) throw new NotFoundException('Fulfillment not found');
    const updated = await this.prisma.workOrderFulfillment.update({
      where: { id },
      data: { status: 'RELEASED', releasedDate: new Date(releasedDate) },
    });
    await this.prisma.workOrderPosition.update({
      where: { id: ff.positionId },
      data: { deployedCount: { decrement: 1 } },
    });
    return updated;
  }

  // ── Invoices ──────────────────────────────────────────────────────
  async getInvoices(tenantId: string, workOrderId: string) {
    return this.prisma.workOrderInvoice.findMany({
      where: { workOrderId, tenantId },
      include: { milestone: { select: { id: true, title: true, percentage: true } } },
      orderBy: { invoiceDate: 'desc' },
    });
  }

  async createInvoice(tenantId: string, workOrderId: string, userId: string, dto: any) {
    await this.findOne(tenantId, workOrderId);
    const count = await this.prisma.workOrderInvoice.count({ where: { tenantId } });
    const invoiceNumber = `WOINV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const invoice = await this.prisma.workOrderInvoice.create({
      data: { ...dto, workOrderId, tenantId, invoiceNumber, createdBy: userId },
    });
    if (dto.milestoneId) {
      await this.prisma.workOrderMilestone.update({
        where: { id: dto.milestoneId },
        data: { status: 'INVOICED' },
      });
    }
    return invoice;
  }

  async updateInvoiceStatus(tenantId: string, id: string, status: string) {
    return this.prisma.workOrderInvoice.update({ where: { id }, data: { status } });
  }

  // ── Email ──────────────────────────────────────────────────────────
  async sendEmail(tenantId: string, id: string, email: string, type: 'work-order' | 'invoice') {
    const wo = await this.findOne(tenantId, id);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    const subject = type === 'invoice'
      ? `Invoice from WorkZen — WO: ${wo.workOrderNo}`
      : `Work Order: ${wo.workOrderNo} — ${wo.title}`;
    const html = type === 'invoice'
      ? `<p>Dear Sir/Madam,</p><p>Please find the invoice details for Work Order <strong>${wo.workOrderNo}</strong> attached.</p><p>Total invoices raised: ${(wo as any).woInvoices?.length ?? 0}</p><br><p>For any queries, please contact us.</p><p>Regards,<br>WorkZen Manpower Solutions Pvt. Ltd.</p>`
      : `<p>Dear Sir/Madam,</p><p>Please find the Work Order details below:</p><ul><li><strong>WO Number:</strong> ${wo.workOrderNo}</li><li><strong>Title:</strong> ${wo.title}</li><li><strong>Value:</strong> ₹${Number(wo.value).toLocaleString('en-IN')}</li><li><strong>Period:</strong> ${wo.startDate ? new Date(wo.startDate).toLocaleDateString('en-IN') : '—'} to ${wo.endDate ? new Date(wo.endDate).toLocaleDateString('en-IN') : 'Open-ended'}</li><li><strong>Status:</strong> ${wo.status}</li></ul><br><p>Regards,<br>WorkZen Manpower Solutions Pvt. Ltd.</p>`;
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
        to: email,
        subject,
        html,
      });
    } catch (err: any) {
      throw new InternalServerErrorException(`Failed to send email: ${err.message}`);
    }
    return { sent: true, to: email };
  }

  // ── Payments ──────────────────────────────────────────────────────
  async getPayments(tenantId: string, workOrderId: string) {
    return this.prisma.workOrderPayment.findMany({
      where: { workOrderId, tenantId },
      include: { invoice: { select: { id: true, invoiceNumber: true, totalAmount: true } } },
      orderBy: { paymentDate: 'desc' },
    });
  }

  async recordPayment(tenantId: string, workOrderId: string, userId: string, dto: any) {
    await this.findOne(tenantId, workOrderId);
    const payment = await this.prisma.workOrderPayment.create({
      data: { ...dto, workOrderId, tenantId, recordedBy: userId },
    });
    if (dto.invoiceId) {
      const inv = await this.prisma.workOrderInvoice.findFirst({ where: { id: dto.invoiceId } });
      if (inv) {
        const newPaid = Number(inv.paidAmount) + Number(dto.amount);
        const newStatus = newPaid >= Number(inv.totalAmount) ? 'PAID' : 'PARTIALLY_PAID';
        await this.prisma.workOrderInvoice.update({
          where: { id: dto.invoiceId },
          data: { paidAmount: newPaid, status: newStatus },
        });
        if (newStatus === 'PAID') {
          const mil = await this.prisma.workOrderMilestone.findFirst({
            where: { id: inv.milestoneId ?? '' },
          });
          if (mil)
            await this.prisma.workOrderMilestone.update({
              where: { id: mil.id },
              data: { status: 'PAID' },
            });
        }
      }
    }
    return payment;
  }
}
