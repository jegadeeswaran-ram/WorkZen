import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../common/prisma/prisma.service';
import { PaginationDto, paginate, buildPaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class PayrollService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('payroll') private payrollQueue: Queue,
  ) {}

  // ── Payroll Runs ─────────────────────────────────────────
  async getRuns(tenantId: string, query: PaginationDto) {
    const { page = 1, limit = 20 } = query;
    const where = { tenantId };
    const [data, total] = await Promise.all([
      this.prisma.payrollRun.findMany({ where, orderBy: [{ year: 'desc' }, { month: 'desc' }], ...paginate(page, limit) }),
      this.prisma.payrollRun.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async getRun(tenantId: string, id: string) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id, tenantId },
      include: {
        payslips: {
          include: {
            employee: {
              select: {
                firstName: true, lastName: true, employeeCode: true,
                employmentType: true, designation: { select: { name: true } },
                department: { select: { name: true } },
                deployments: { where: { status: 'ACTIVE' }, include: { site: { select: { name: true } }, tender: { select: { tenderName: true } } }, take: 1 },
              },
            },
          },
          orderBy: { netPay: 'desc' },
        },
      },
    });
    if (!run) throw new NotFoundException('Payroll run not found');
    return run;
  }

  async createRun(tenantId: string, month: number, year: number, userId: string, employmentType?: string) {
    const existing = await this.prisma.payrollRun.findFirst({ where: { tenantId, month, year } });
    if (existing) throw new BadRequestException('Payroll already processed for this period');

    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0);

    const run = await this.prisma.payrollRun.create({
      data: { tenantId, month, year, periodStart, periodEnd, status: 'DRAFT', createdBy: userId },
    });

    await this.payrollQueue.add('process-payroll', { tenantId, runId: run.id, month, year, employmentType });
    return run;
  }

  async approveRun(tenantId: string, id: string, userId: string) {
    const run = await this.prisma.payrollRun.findFirst({ where: { id, tenantId } });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status !== 'PENDING_APPROVAL') throw new BadRequestException('Run is not pending approval');
    return this.prisma.payrollRun.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy: userId, approvedAt: new Date() },
    });
  }

  async disburseRun(tenantId: string, id: string, userId: string) {
    const run = await this.prisma.payrollRun.findFirst({ where: { id, tenantId } });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status !== 'APPROVED') throw new BadRequestException('Run must be approved before disbursement');
    await this.prisma.payslip.updateMany({
      where: { payrollRunId: id, tenantId },
      data: { paymentStatus: 'PAID', paidAt: new Date() },
    });
    return this.prisma.payrollRun.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date(), updatedBy: userId },
    });
  }

  // ── Payslips ─────────────────────────────────────────────
  async getPayslip(tenantId: string, id: string) {
    const payslip = await this.prisma.payslip.findFirst({
      where: { id, tenantId },
      include: {
        employee: {
          include: {
            designation: true, department: true, bankDetails: true,
            deployments: { where: { status: 'ACTIVE' }, include: { site: true, tender: { select: { tenderName: true } } }, take: 1 },
          },
        },
        payrollRun: { select: { month: true, year: true, periodStart: true, periodEnd: true, status: true } },
      },
    });
    if (!payslip) throw new NotFoundException('Payslip not found');
    return payslip;
  }

  async getEmployeePayslips(tenantId: string, employeeId: string, query: PaginationDto) {
    const { page = 1, limit = 12 } = query;
    const where = { tenantId, employeeId };
    const [data, total] = await Promise.all([
      this.prisma.payslip.findMany({
        where,
        include: { payrollRun: { select: { month: true, year: true, status: true } } },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        ...paginate(page, limit),
      }),
      this.prisma.payslip.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async getRunPayslips(tenantId: string, runId: string, employmentType?: string) {
    const where: any = { tenantId, payrollRunId: runId };
    if (employmentType) {
      where.employee = { employmentType };
    }
    return this.prisma.payslip.findMany({
      where,
      include: {
        employee: {
          select: {
            firstName: true, lastName: true, employeeCode: true, employmentType: true,
            personalPhone: true,
            designation: { select: { name: true } },
            department: { select: { name: true } },
            deployments: {
              where: { status: 'ACTIVE' },
              include: { site: { select: { name: true } }, tender: { select: { tenderName: true } } },
              take: 1,
            },
          },
        },
      },
      orderBy: { netPay: 'desc' },
    });
  }

  // ── Salary Components ─────────────────────────────────────
  async getSalaryComponents(tenantId: string) {
    return this.prisma.salaryComponent.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createSalaryComponent(tenantId: string, dto: { name: string; code: string; type: string; calculationType: string }) {
    return this.prisma.salaryComponent.create({
      data: { ...dto, tenantId, isActive: true } as any,
    });
  }

  // ── Salary Structures ─────────────────────────────────────
  async getSalaryStructures(tenantId: string, query: { search?: string; employmentType?: string; page?: number; limit?: number }) {
    const { search, employmentType, page = 1, limit = 20 } = query;
    const where: any = {
      tenantId,
      effectiveTo: null,
      ...(employmentType && { employee: { employmentType } }),
      ...(search && {
        employee: {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { employeeCode: { contains: search, mode: 'insensitive' } },
          ],
        },
      }),
    };
    const [data, total] = await Promise.all([
      this.prisma.salaryStructure.findMany({
        where,
        include: {
          employee: {
            select: {
              firstName: true, lastName: true, employeeCode: true, employmentType: true, status: true,
              designation: { select: { name: true } },
              department: { select: { name: true } },
            },
          },
        },
        orderBy: { effectiveFrom: 'desc' },
        ...paginate(page, limit),
      }),
      this.prisma.salaryStructure.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async assignSalaryStructure(tenantId: string, dto: {
    employeeId: string;
    effectiveFrom: string;
    basic: number;
    da?: number;
    hra?: number;
    specialAllowance?: number;
    otherAllowances?: Record<string, number>;
  }, userId: string) {
    const grossSalary = (dto.basic || 0) + (dto.da || 0) + (dto.hra || 0) + (dto.specialAllowance || 0);

    // Close existing active structure
    await this.prisma.salaryStructure.updateMany({
      where: { tenantId, employeeId: dto.employeeId, effectiveTo: null },
      data: { effectiveTo: new Date(dto.effectiveFrom) },
    });

    return this.prisma.salaryStructure.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        effectiveFrom: new Date(dto.effectiveFrom),
        basic: dto.basic,
        da: dto.da ?? 0,
        hra: dto.hra ?? 0,
        specialAllowance: dto.specialAllowance ?? 0,
        otherAllowances: dto.otherAllowances ?? {},
        grossSalary,
        createdBy: userId,
      },
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true, employmentType: true } } },
    });
  }

  async updateSalaryStructure(tenantId: string, id: string, dto: Record<string, unknown>) {
    const existing = await this.prisma.salaryStructure.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Salary structure not found');
    const basic = Number(dto.basic ?? existing.basic);
    const da = Number(dto.da ?? existing.da);
    const hra = Number(dto.hra ?? existing.hra);
    const special = Number(dto.specialAllowance ?? existing.specialAllowance);
    return this.prisma.salaryStructure.update({
      where: { id },
      data: { ...dto, grossSalary: basic + da + hra + special } as any,
    });
  }

  // ── Dashboard ────────────────────────────────────────────
  async getPayrollDashboard(tenantId: string) {
    const [totalRuns, pendingApproval, disbursedRuns, lastRun, totalEmployees, withSalary, officeCount, contractCount] = await Promise.all([
      this.prisma.payrollRun.count({ where: { tenantId } }),
      this.prisma.payrollRun.count({ where: { tenantId, status: 'PENDING_APPROVAL' } }),
      this.prisma.payrollRun.count({ where: { tenantId, status: 'PAID' as any } }),
      this.prisma.payrollRun.findFirst({
        where: { tenantId },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        select: { month: true, year: true, totalNet: true, totalGross: true, totalDeductions: true, totalEmployees: true, status: true, id: true },
      }),
      this.prisma.employee.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.salaryStructure.count({ where: { tenantId, effectiveTo: null } }),
      this.prisma.employee.count({ where: { tenantId, status: 'ACTIVE', employmentType: 'PERMANENT' } }),
      this.prisma.employee.count({ where: { tenantId, status: 'ACTIVE', employmentType: 'CONTRACT' } }),
    ]);
    return { totalRuns, pendingApproval, disbursedRuns, lastRun, totalEmployees, withSalary, officeCount, contractCount };
  }

  async getMyPayslips(tenantId: string, userId: string, limit = 12) {
    const emp = await this.prisma.employee.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!emp) throw new NotFoundException('No linked employee profile');
    const payslips = await this.prisma.payslip.findMany({
      where: { tenantId, employeeId: emp.id },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: limit,
      select: {
        id: true, month: true, year: true,
        grossEarnings: true, netPay: true, paymentStatus: true,
        documentId: true,
        payrollRun: { select: { id: true, status: true } },
      },
    });
    return payslips.map(p => ({
      id: p.id,
      payPeriod: new Date(p.year, p.month - 1, 1).toISOString(),
      grossSalary: Number(p.grossEarnings),
      netSalary: Number(p.netPay),
      status: p.paymentStatus,
      pdfUrl: null as string | null,
      payrollRun: p.payrollRun,
    }));
  }
}
