import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PaginationDto, paginate, buildPaginatedResponse } from '../common/dto/pagination.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: PaginationDto & { status?: string; departmentId?: string }) {
    const { page = 1, limit = 20, search, status, departmentId } = query;
    const where = {
      tenantId,
      ...(status && { status: status as any }),
      ...(departmentId && { departmentId }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
          { employeeCode: { contains: search, mode: 'insensitive' as const } },
          { personalPhone: { contains: search } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        select: {
          id: true, employeeCode: true, firstName: true, lastName: true,
          personalPhone: true, photo: true, status: true, joiningDate: true,
          designation: { select: { name: true } },
          department: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        ...paginate(page, limit),
      }),
      this.prisma.employee.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, tenantId },
      include: {
        designation: true,
        department: true,
        bankDetails: true,
        documents: { include: { document: true } },
        deployments: {
          where: { status: 'ACTIVE' },
          include: { tender: { select: { tenderName: true } }, site: true },
        },
        leaveBalances: { include: { leaveType: true } },
      },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async create(tenantId: string, dto: CreateEmployeeDto, userId: string) {
    const code = await this.generateEmployeeCode(tenantId);
    return this.prisma.employee.create({
      data: { ...dto, tenantId, employeeCode: code, createdBy: userId },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateEmployeeDto, userId: string) {
    await this.findOne(tenantId, id);
    return this.prisma.employee.update({
      where: { id },
      data: { ...dto, updatedBy: userId },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.employee.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    });
  }

  async getStats(tenantId: string) {
    const [total, active, onLeave, deployed] = await Promise.all([
      this.prisma.employee.count({ where: { tenantId } }),
      this.prisma.employee.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.employee.count({ where: { tenantId, status: 'ON_LEAVE' } }),
      this.prisma.employee.count({ where: { tenantId, status: 'DEPLOYED' } }),
    ]);
    return { total, active, onLeave, deployed };
  }

  private async generateEmployeeCode(tenantId: string): Promise<string> {
    const count = await this.prisma.employee.count({ where: { tenantId } });
    return `EMP${String(count + 1).padStart(5, '0')}`;
  }

  async getDesignations(tenantId: string) {
    return this.prisma.designation.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async getDepartments(tenantId: string) {
    return this.prisma.department.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async createDesignation(tenantId: string, name: string, userId: string) {
    return this.prisma.designation.create({
      data: { tenantId, name, createdBy: userId } as any,
    });
  }

  async createDepartment(tenantId: string, name: string, userId: string) {
    return this.prisma.department.create({
      data: { tenantId, name, createdBy: userId } as any,
    });
  }

  // ── LIFECYCLE STATUS ──────────────────────────────────────
  async updateLifecycleStatus(tenantId: string, employeeId: string, lifecycleStatus: string, userId: string) {
    const emp = await this.prisma.employee.findFirst({ where: { id: employeeId, tenantId } });
    if (!emp) throw new NotFoundException('Employee not found');
    return this.prisma.employee.update({ where: { id: employeeId }, data: { lifecycleStatus: lifecycleStatus as any } });
  }

  // ── TRANSFER REQUESTS ─────────────────────────────────────
  async createTransferRequest(tenantId: string, dto: { employeeId: string; transferType?: string; fromSiteId?: string; toSiteId?: string; fromTenderId?: string; toTenderId?: string; fromDeptId?: string; toDeptId?: string; effectiveDate: string; reason: string; notes?: string }, userId: string) {
    const emp = await this.prisma.employee.findFirst({ where: { id: dto.employeeId, tenantId } });
    if (!emp) throw new NotFoundException('Employee not found');
    return this.prisma.transferRequest.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        transferType: dto.transferType ?? 'SITE',
        fromSiteId: dto.fromSiteId,
        toSiteId: dto.toSiteId,
        fromTenderId: dto.fromTenderId,
        toTenderId: dto.toTenderId,
        fromDeptId: dto.fromDeptId,
        toDeptId: dto.toDeptId,
        effectiveDate: new Date(dto.effectiveDate),
        reason: dto.reason,
        notes: dto.notes,
        status: 'DRAFT' as any,
        createdBy: userId,
      },
    });
  }

  async listTransferRequests(tenantId: string, params: { employeeId?: string; status?: string; page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = params;
    const where: any = { tenantId };
    if (params.employeeId) where.employeeId = params.employeeId;
    if (params.status) where.status = params.status;
    const [data, total] = await Promise.all([
      this.prisma.transferRequest.findMany({ where, include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.transferRequest.count({ where }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async approveTransferRequest(tenantId: string, id: string, action: 'APPROVED' | 'REJECTED', userId: string) {
    const tr = await this.prisma.transferRequest.findFirst({ where: { id, tenantId } });
    if (!tr) throw new NotFoundException('Transfer request not found');
    const updated = await this.prisma.transferRequest.update({
      where: { id },
      data: { status: action as any, approvedBy: userId, approvedAt: new Date() },
    });
    if (action === 'APPROVED') {
      const empUpdate: any = { lifecycleStatus: 'TRANSFERRED' };
      if (tr.toDeptId) empUpdate.departmentId = tr.toDeptId;
      await this.prisma.employee.update({ where: { id: tr.employeeId }, data: empUpdate });
      if (tr.toSiteId || tr.toTenderId) {
        await this.prisma.deployment.updateMany({ where: { tenantId, employeeId: tr.employeeId, status: 'ACTIVE' }, data: { status: 'COMPLETED' as any, endDate: new Date(tr.effectiveDate) } });
        await this.prisma.deployment.create({
          data: { tenantId, employeeId: tr.employeeId, siteId: tr.toSiteId, tenderId: tr.toTenderId, startDate: new Date(tr.effectiveDate), status: 'ACTIVE' as any, createdBy: userId },
        });
      }
      await this.prisma.transferRequest.update({ where: { id }, data: { status: 'COMPLETED', completedAt: new Date() } });
    }
    return updated;
  }

  // ── PROMOTION RECORDS ─────────────────────────────────────
  async createPromotion(tenantId: string, dto: { employeeId: string; fromDesignationId?: string; toDesignationId?: string; fromDepartmentId?: string; toDepartmentId?: string; effectiveDate: string; newBasicSalary?: number; incrementAmount?: number; incrementPercentage?: number; reason?: string }, userId: string) {
    const emp = await this.prisma.employee.findFirst({ where: { id: dto.employeeId, tenantId } });
    if (!emp) throw new NotFoundException('Employee not found');
    const record = await this.prisma.promotionRecord.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        fromDesignationId: dto.fromDesignationId ?? emp.designationId,
        toDesignationId: dto.toDesignationId,
        fromDepartmentId: dto.fromDepartmentId ?? emp.departmentId,
        toDepartmentId: dto.toDepartmentId,
        effectiveDate: new Date(dto.effectiveDate),
        newBasicSalary: dto.newBasicSalary,
        incrementAmount: dto.incrementAmount,
        incrementPercentage: dto.incrementPercentage,
        reason: dto.reason,
        createdBy: userId,
      },
    });
    const empUpdate: any = { lifecycleStatus: 'PROMOTED' };
    if (dto.toDesignationId) empUpdate.designationId = dto.toDesignationId;
    if (dto.toDepartmentId) empUpdate.departmentId = dto.toDepartmentId;
    await this.prisma.employee.update({ where: { id: dto.employeeId }, data: empUpdate });
    return record;
  }

  async listPromotions(tenantId: string, employeeId?: string) {
    const where: any = { tenantId };
    if (employeeId) where.employeeId = employeeId;
    return this.prisma.promotionRecord.findMany({
      where,
      include: {
        employee: { select: { firstName: true, lastName: true, employeeCode: true } },
      },
      orderBy: { effectiveDate: 'desc' },
    });
  }

  // ── SEPARATION / EXIT MANAGEMENT ─────────────────────────
  async initiateSeparation(tenantId: string, dto: { employeeId: string; separationType: string; resignationDate?: string; lastWorkingDate?: string; noticePeriodDays?: number; noticePeriodWaived?: boolean; exitRemarks?: string }, userId: string) {
    const emp = await this.prisma.employee.findFirst({ where: { id: dto.employeeId, tenantId } });
    if (!emp) throw new NotFoundException('Employee not found');
    const record = await this.prisma.separationRecord.upsert({
      where: { employeeId: dto.employeeId },
      update: { ...dto as any, resignationDate: dto.resignationDate ? new Date(dto.resignationDate) : undefined, lastWorkingDate: dto.lastWorkingDate ? new Date(dto.lastWorkingDate) : undefined },
      create: {
        tenantId,
        employeeId: dto.employeeId,
        separationType: dto.separationType as any,
        resignationDate: dto.resignationDate ? new Date(dto.resignationDate) : undefined,
        lastWorkingDate: dto.lastWorkingDate ? new Date(dto.lastWorkingDate) : undefined,
        noticePeriodDays: dto.noticePeriodDays ?? 30,
        noticePeriodWaived: dto.noticePeriodWaived ?? false,
        exitRemarks: dto.exitRemarks,
        clearanceStatus: { hr: false, admin: false, it: false, accounts: false, assets: false },
        createdBy: userId,
      } as any,
    });
    const statusMap: Record<string, string> = { RESIGNATION: 'RESIGNED', TERMINATION: 'TERMINATED', RETIREMENT: 'RETIRED', ABSCONDING: 'INACTIVE', CONTRACT_END: 'RESIGNED', MUTUAL_SEPARATION: 'RESIGNED', DEATH: 'RETIRED' };
    await this.prisma.employee.update({ where: { id: dto.employeeId }, data: { status: (statusMap[dto.separationType] ?? 'INACTIVE') as any, lifecycleStatus: (statusMap[dto.separationType] ?? 'RESIGNED') as any } });
    return record;
  }

  async getSeparationRecord(tenantId: string, employeeId: string) {
    return this.prisma.separationRecord.findFirst({ where: { tenantId, employeeId }, include: { employee: { select: { firstName: true, lastName: true, employeeCode: true, designationId: true } } } });
  }

  async updateClearanceStatus(tenantId: string, employeeId: string, department: string, cleared: boolean) {
    const rec = await this.prisma.separationRecord.findFirst({ where: { tenantId, employeeId } });
    if (!rec) throw new NotFoundException('No separation record');
    const clearanceStatus: any = rec.clearanceStatus ?? {};
    clearanceStatus[department] = cleared;
    return this.prisma.separationRecord.update({ where: { employeeId }, data: { clearanceStatus } });
  }

  async listSeparations(tenantId: string, params: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = params;
    const [data, total] = await Promise.all([
      this.prisma.separationRecord.findMany({ where: { tenantId }, include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.separationRecord.count({ where: { tenantId } }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  // ─── Warnings ───────────────────────────────────────────────────────────────

  async getWarnings(tenantId: string, query: PaginationDto & { employeeId?: string }) {
    const { page = 1, limit = 20, employeeId } = query;
    const where: any = { tenantId, ...(employeeId && { employeeId }) };
    const [data, total] = await Promise.all([
      this.prisma.warningRecord.findMany({ where, include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } }, orderBy: { issuedDate: 'desc' }, ...paginate(page, limit) }),
      this.prisma.warningRecord.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async createWarning(tenantId: string, dto: Record<string, unknown>, userId: string) {
    return this.prisma.warningRecord.create({ data: { ...dto, tenantId, createdBy: userId } as any });
  }

  async updateWarning(tenantId: string, id: string, dto: Record<string, unknown>) {
    return this.prisma.warningRecord.update({ where: { id }, data: dto as any });
  }

  // ─── Trips ──────────────────────────────────────────────────────────────────

  async getTrips(tenantId: string, query: PaginationDto & { employeeId?: string; status?: string }) {
    const { page = 1, limit = 20, employeeId, status } = query;
    const where: any = { tenantId, ...(employeeId && { employeeId }), ...(status && { status }) };
    const [data, total] = await Promise.all([
      this.prisma.employeeTrip.findMany({ where, include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } }, orderBy: { departureDate: 'desc' }, ...paginate(page, limit) }),
      this.prisma.employeeTrip.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async createTrip(tenantId: string, dto: Record<string, unknown>, userId: string) {
    return this.prisma.employeeTrip.create({ data: { ...dto, tenantId, createdBy: userId } as any });
  }

  async updateTrip(tenantId: string, id: string, dto: Record<string, unknown>) {
    return this.prisma.employeeTrip.update({ where: { id }, data: dto as any });
  }

  async getMyProfile(tenantId: string, userId: string) {
    const emp = await this.prisma.employee.findUnique({
      where: { userId },
      include: {
        bankDetails: { select: { accountNumber: true, bankName: true, ifscCode: true } },
        designation: { select: { name: true } },
        department: { select: { name: true } },
      },
    });
    if (!emp) throw new NotFoundException('No linked employee profile');
    return emp;
  }
}


// Appended methods - cannot close class here, see below
