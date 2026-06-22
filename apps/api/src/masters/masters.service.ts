import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class MastersService {
  constructor(private prisma: PrismaService) {}

  // ── DESIGNATIONS ───────────────────────────────────────
  async listDesignations(tenantId: string) {
    return this.prisma.designation.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }
  async createDesignation(tenantId: string, dto: { name: string; code?: string; level?: number; description?: string }, userId: string) {
    return this.prisma.designation.create({ data: { tenantId, ...dto, createdBy: userId } as any });
  }
  async updateDesignation(tenantId: string, id: string, dto: Record<string, unknown>) {
    const rec = await this.prisma.designation.findFirst({ where: { id, tenantId } });
    if (!rec) throw new NotFoundException('Designation not found');
    return this.prisma.designation.update({ where: { id }, data: dto as any });
  }
  async deleteDesignation(tenantId: string, id: string) {
    const rec = await this.prisma.designation.findFirst({ where: { id, tenantId } });
    if (!rec) throw new NotFoundException('Designation not found');
    return this.prisma.designation.delete({ where: { id } });
  }

  // ── DEPARTMENTS ────────────────────────────────────────
  async listDepartments(tenantId: string) {
    return this.prisma.department.findMany({ where: { tenantId }, include: { parent: { select: { name: true } } }, orderBy: { name: 'asc' } });
  }
  async createDepartment(tenantId: string, dto: { name: string; code?: string; parentId?: string; description?: string }, userId: string) {
    return this.prisma.department.create({ data: { tenantId, ...dto, createdBy: userId } as any });
  }
  async updateDepartment(tenantId: string, id: string, dto: Record<string, unknown>) {
    const rec = await this.prisma.department.findFirst({ where: { id, tenantId } });
    if (!rec) throw new NotFoundException('Department not found');
    return this.prisma.department.update({ where: { id }, data: dto as any });
  }
  async deleteDepartment(tenantId: string, id: string) {
    const rec = await this.prisma.department.findFirst({ where: { id, tenantId } });
    if (!rec) throw new NotFoundException('Department not found');
    return this.prisma.department.delete({ where: { id } });
  }

  // ── SHIFTS ─────────────────────────────────────────────
  async listShifts(tenantId: string) {
    return this.prisma.shift.findMany({ where: { tenantId }, include: { site: { select: { name: true } } }, orderBy: { name: 'asc' } });
  }
  async createShift(tenantId: string, dto: { name: string; shiftType: string; startTime: string; endTime: string; breakDuration?: number; isNightShift?: boolean; overtimeAfter?: number; weeklyOffs?: string[]; siteId?: string }, userId: string) {
    return this.prisma.shift.create({ data: { tenantId, ...dto as any, createdBy: userId } });
  }
  async updateShift(tenantId: string, id: string, dto: Record<string, unknown>) {
    const rec = await this.prisma.shift.findFirst({ where: { id, tenantId } });
    if (!rec) throw new NotFoundException('Shift not found');
    return this.prisma.shift.update({ where: { id }, data: dto as any });
  }
  async deleteShift(tenantId: string, id: string) {
    const rec = await this.prisma.shift.findFirst({ where: { id, tenantId } });
    if (!rec) throw new NotFoundException('Shift not found');
    return this.prisma.shift.delete({ where: { id } });
  }

  // ── LEAVE TYPES ────────────────────────────────────────
  async listLeaveTypes(tenantId: string) {
    return this.prisma.leaveType.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }
  async createLeaveType(tenantId: string, dto: { name: string; code: string; category: string; maxDays: number; isCarryForward?: boolean; isPaid?: boolean; description?: string }, userId: string) {
    return this.prisma.leaveType.create({ data: { tenantId, ...dto, createdBy: userId } as any });
  }
  async updateLeaveType(tenantId: string, id: string, dto: Record<string, unknown>) {
    const rec = await this.prisma.leaveType.findFirst({ where: { id, tenantId } });
    if (!rec) throw new NotFoundException('Leave type not found');
    return this.prisma.leaveType.update({ where: { id }, data: dto as any });
  }
  async deleteLeaveType(tenantId: string, id: string) {
    const rec = await this.prisma.leaveType.findFirst({ where: { id, tenantId } });
    if (!rec) throw new NotFoundException('Leave type not found');
    return this.prisma.leaveType.delete({ where: { id } });
  }

  // ── HOLIDAYS ───────────────────────────────────────────
  async listHolidays(tenantId: string, year?: number) {
    const where = { tenantId, ...(year && { date: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31) } }) };
    return this.prisma.holiday.findMany({ where, orderBy: { date: 'asc' } });
  }
  async createHoliday(tenantId: string, dto: { name: string; date: string; type: string; isOptional?: boolean; applicableTo?: string }, userId: string) {
    return this.prisma.holiday.create({ data: { tenantId, name: dto.name, date: new Date(dto.date), type: dto.type, isOptional: dto.isOptional ?? false } });
  }
  async updateHoliday(tenantId: string, id: string, dto: Record<string, unknown>) {
    const rec = await this.prisma.holiday.findFirst({ where: { id, tenantId } });
    if (!rec) throw new NotFoundException('Holiday not found');
    const data = { ...dto as any };
    if (data.date) data.date = new Date(data.date);
    return this.prisma.holiday.update({ where: { id }, data });
  }
  async deleteHoliday(tenantId: string, id: string) {
    const rec = await this.prisma.holiday.findFirst({ where: { id, tenantId } });
    if (!rec) throw new NotFoundException('Holiday not found');
    return this.prisma.holiday.delete({ where: { id } });
  }

  // ── SITES ──────────────────────────────────────────────
  async listSites(tenantId: string) {
    return this.prisma.site.findMany({ where: { tenantId, isActive: true }, orderBy: { name: 'asc' } });
  }
  async createSite(tenantId: string, dto: { name: string; code: string; address?: string; contactName?: string; contactPhone?: string; latitude?: number; longitude?: number; geoFenceRadius?: number }, userId: string) {
    return this.prisma.site.create({ data: { tenantId, ...dto, createdBy: userId } as any });
  }
  async updateSite(tenantId: string, id: string, dto: Record<string, unknown>) {
    const rec = await this.prisma.site.findFirst({ where: { id, tenantId } });
    if (!rec) throw new NotFoundException('Site not found');
    return this.prisma.site.update({ where: { id }, data: dto as any });
  }
  async deleteSite(tenantId: string, id: string) {
    const rec = await this.prisma.site.findFirst({ where: { id, tenantId } });
    if (!rec) throw new NotFoundException('Site not found');
    return this.prisma.site.update({ where: { id }, data: { isActive: false } });
  }

  // ── SALARY COMPONENTS ──────────────────────────────────
  async listSalaryComponents(tenantId: string) {
    return this.prisma.salaryComponent.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }
  async createSalaryComponent(tenantId: string, dto: { name: string; code: string; type: string; calculationType: string; value?: number; isTaxable?: boolean; isActive?: boolean }, userId: string) {
    return this.prisma.salaryComponent.create({ data: { tenantId, ...dto as any, createdBy: userId } });
  }
  async updateSalaryComponent(tenantId: string, id: string, dto: Record<string, unknown>) {
    const rec = await this.prisma.salaryComponent.findFirst({ where: { id, tenantId } });
    if (!rec) throw new NotFoundException('Salary component not found');
    return this.prisma.salaryComponent.update({ where: { id }, data: dto as any });
  }
  async deleteSalaryComponent(tenantId: string, id: string) {
    const rec = await this.prisma.salaryComponent.findFirst({ where: { id, tenantId } });
    if (!rec) throw new NotFoundException('Salary component not found');
    return this.prisma.salaryComponent.update({ where: { id }, data: { isActive: false } });
  }

  // ── FINANCIAL YEARS ────────────────────────────────────
  async listFinancialYears(tenantId: string) {
    return this.prisma.financialYear.findMany({ where: { tenantId }, orderBy: { startDate: 'desc' } });
  }
  async createFinancialYear(tenantId: string, dto: { label: string; startDate: string; endDate: string; isCurrent?: boolean }, userId: string) {
    if (dto.isCurrent) await this.prisma.financialYear.updateMany({ where: { tenantId }, data: { isCurrent: false } });
    return this.prisma.financialYear.create({ data: { tenantId, ...dto, startDate: new Date(dto.startDate), endDate: new Date(dto.endDate), createdBy: userId } as any });
  }
  async updateFinancialYear(tenantId: string, id: string, dto: Record<string, unknown>) {
    const rec = await this.prisma.financialYear.findFirst({ where: { id, tenantId } });
    if (!rec) throw new NotFoundException('Financial year not found');
    if ((dto as any).isCurrent) await this.prisma.financialYear.updateMany({ where: { tenantId }, data: { isCurrent: false } });
    const data = { ...dto as any };
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);
    return this.prisma.financialYear.update({ where: { id }, data });
  }

  // ── CHART OF ACCOUNTS ──────────────────────────────────
  async listAccounts(tenantId: string) {
    return this.prisma.account.findMany({ where: { tenantId, isActive: true }, include: { parent: { select: { name: true, code: true } } }, orderBy: [{ type: 'asc' }, { code: 'asc' }] });
  }
  async createAccount(tenantId: string, dto: { code: string; name: string; type: string; subType?: string; parentId?: string; description?: string; openingBalance?: number }, userId: string) {
    return this.prisma.account.create({ data: { tenantId, ...dto, openingBalance: dto.openingBalance ?? 0, currentBalance: dto.openingBalance ?? 0, createdBy: userId } as any });
  }
  async updateAccount(tenantId: string, id: string, dto: Record<string, unknown>) {
    const rec = await this.prisma.account.findFirst({ where: { id, tenantId } });
    if (!rec) throw new NotFoundException('Account not found');
    return this.prisma.account.update({ where: { id }, data: dto as any });
  }
  async deleteAccount(tenantId: string, id: string) {
    const rec = await this.prisma.account.findFirst({ where: { id, tenantId } });
    if (!rec) throw new NotFoundException('Account not found');
    return this.prisma.account.update({ where: { id }, data: { isActive: false } });
  }

  // ── BANK ACCOUNTS ──────────────────────────────────────
  async listBankAccounts(tenantId: string) {
    return this.prisma.bankAccount.findMany({ where: { tenantId }, orderBy: { accountName: 'asc' } });
  }
  async createBankAccount(tenantId: string, dto: { accountName: string; accountNumber: string; bankName: string; ifscCode?: string; branchName?: string; accountType?: string; openingBalance?: number }, userId: string) {
    return this.prisma.bankAccount.create({ data: { tenantId, ...dto, openingBalance: dto.openingBalance ?? 0, currentBalance: dto.openingBalance ?? 0, createdBy: userId } as any });
  }
  async updateBankAccount(tenantId: string, id: string, dto: Record<string, unknown>) {
    const rec = await this.prisma.bankAccount.findFirst({ where: { id, tenantId } });
    if (!rec) throw new NotFoundException('Bank account not found');
    return this.prisma.bankAccount.update({ where: { id }, data: dto as any });
  }
  async deleteBankAccount(tenantId: string, id: string) {
    const rec = await this.prisma.bankAccount.findFirst({ where: { id, tenantId } });
    if (!rec) throw new NotFoundException('Bank account not found');
    return this.prisma.bankAccount.delete({ where: { id } });
  }

  // ── HSN / GST MASTER ───────────────────────────────────
  async listHsnMasters(tenantId: string) {
    return this.prisma.hSNMaster.findMany({ where: { tenantId }, orderBy: { hsnCode: 'asc' } });
  }
  async createHsnMaster(tenantId: string, dto: { hsnCode: string; description: string; defaultTaxRate?: number }, userId: string) {
    return this.prisma.hSNMaster.create({ data: { tenantId, defaultTaxRate: 18, ...dto, createdBy: userId } as any });
  }
  async updateHsnMaster(tenantId: string, id: string, dto: Record<string, unknown>) {
    const rec = await this.prisma.hSNMaster.findFirst({ where: { id, tenantId } });
    if (!rec) throw new NotFoundException('HSN entry not found');
    return this.prisma.hSNMaster.update({ where: { id }, data: dto as any });
  }
  async deleteHsnMaster(tenantId: string, id: string) {
    const rec = await this.prisma.hSNMaster.findFirst({ where: { id, tenantId } });
    if (!rec) throw new NotFoundException('HSN entry not found');
    return this.prisma.hSNMaster.delete({ where: { id } });
  }

  // ── RATE MASTER ────────────────────────────────────────
  async listRateMasters(tenantId: string) {
    return this.prisma.rateMaster.findMany({
      where: { tenantId },
      include: { designation: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
  async createRateMaster(tenantId: string, dto: { rateType: string; amount: number; effectiveFrom: string; effectiveTo?: string; designationId?: string; notes?: string }, userId: string) {
    return this.prisma.rateMaster.create({ data: { tenantId, ...dto, effectiveFrom: new Date(dto.effectiveFrom), effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined, createdBy: userId } as any });
  }
  async updateRateMaster(tenantId: string, id: string, dto: Record<string, unknown>) {
    const rec = await this.prisma.rateMaster.findFirst({ where: { id, tenantId } });
    if (!rec) throw new NotFoundException('Rate master not found');
    const data = { ...dto };
    if (data.effectiveFrom) data.effectiveFrom = new Date(data.effectiveFrom as string);
    if (data.effectiveTo) data.effectiveTo = new Date(data.effectiveTo as string);
    return this.prisma.rateMaster.update({ where: { id }, data: data as any });
  }
  async deleteRateMaster(tenantId: string, id: string) {
    const rec = await this.prisma.rateMaster.findFirst({ where: { id, tenantId } });
    if (!rec) throw new NotFoundException('Rate master not found');
    return this.prisma.rateMaster.delete({ where: { id } });
  }
}
