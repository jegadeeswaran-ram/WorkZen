import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PaginationDto, paginate, buildPaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async markAttendance(tenantId: string, dto: {
    employeeId: string;
    date: string;
    status: string;
    method: string;
    checkInTime?: string;
    checkInLatitude?: number;
    checkInLongitude?: number;
  }) {
    const existing = await this.prisma.attendanceRecord.findFirst({
      where: { tenantId, employeeId: dto.employeeId, date: new Date(dto.date) },
    });
    if (existing) {
      return this.prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: { checkOutTime: dto.checkInTime ? new Date(dto.checkInTime) : undefined },
      });
    }
    return this.prisma.attendanceRecord.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        date: new Date(dto.date),
        status: dto.status as any,
        method: dto.method as any,
        checkInTime: dto.checkInTime ? new Date(dto.checkInTime) : undefined,
        checkInLatitude: dto.checkInLatitude,
        checkInLongitude: dto.checkInLongitude,
      },
    });
  }

  async findByMonth(tenantId: string, employeeId: string, month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return this.prisma.attendanceRecord.findMany({
      where: { tenantId, employeeId, date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    });
  }

  async getMonthlyReport(tenantId: string, query: { month: number; year: number } & PaginationDto) {
    const { month, year, page = 1, limit = 20 } = query;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);

    const employees = await this.prisma.employee.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: { id: true, employeeCode: true, firstName: true, lastName: true },
      ...paginate(page, limit),
    });

    const report = await Promise.all(
      employees.map(async (emp) => {
        const records = await this.prisma.attendanceRecord.findMany({
          where: { tenantId, employeeId: emp.id, date: { gte: start, lte: end } },
        });
        const present = records.filter((r) => r.status === 'PRESENT').length;
        const absent = records.filter((r) => r.status === 'ABSENT').length;
        const leaves = records.filter((r) => r.status === 'LEAVE').length;
        return { ...emp, present, absent, leaves, total: records.length };
      }),
    );
    const total = await this.prisma.employee.count({ where: { tenantId, status: 'ACTIVE' } });
    return buildPaginatedResponse(report, total, page, limit);
  }

  async getLeaveRequests(tenantId: string, query: PaginationDto) {
    const { page = 1, limit = 20 } = query;
    const where = { tenantId };
    const [data, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
          leaveType: true,
        },
        orderBy: { createdAt: 'desc' },
        ...paginate(page, limit),
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async approveLeave(tenantId: string, id: string, approverId: string, action: 'APPROVED' | 'REJECTED', remarks?: string) {
    const leave = await this.prisma.leaveRequest.findFirst({ where: { id, tenantId } });
    if (!leave) throw new NotFoundException('Leave request not found');
    if (leave.status !== 'PENDING') throw new BadRequestException('Leave already actioned');
    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: action, approvedBy: approverId, approvedAt: new Date(), remarks },
    });
  }

  async createLeaveRequest(tenantId: string, dto: {
    employeeId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason: string;
    leaveDays: number;
  }) {
    return this.prisma.leaveRequest.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        leaveTypeId: dto.leaveTypeId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        reason: dto.reason,
        days: dto.leaveDays,
        status: 'PENDING',
      } as any,
    });
  }

  async getLeaveTypes(tenantId: string) {
    return this.prisma.leaveType.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async getSupervisorTeamTodayAttendance(tenantId: string, userId: string) {
    const site = await this.prisma.site.findFirst({ where: { tenantId, supervisorId: userId, isActive: true } });
    if (!site) return { success: true, data: [], message: 'No site assigned' };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const deployments = await this.prisma.deployment.findMany({
      where: { tenantId, siteId: site.id, status: 'ACTIVE' },
      select: { employeeId: true, employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
    });
    const employeeIds = deployments.map(d => d.employeeId);
    const records = await this.prisma.attendanceRecord.findMany({
      where: { tenantId, employeeId: { in: employeeIds }, date: { gte: today } },
      select: { employeeId: true, status: true, checkInTime: true, checkOutTime: true, workHours: true },
    });
    const attMap = new Map(records.map(r => [r.employeeId, r]));
    const data = deployments.map(d => ({
      employeeId: d.employeeId,
      employee: d.employee,
      status: attMap.get(d.employeeId)?.status ?? null,
      checkInTime: attMap.get(d.employeeId)?.checkInTime ?? null,
      checkOutTime: attMap.get(d.employeeId)?.checkOutTime ?? null,
    }));
    return { success: true, data, message: 'Team attendance fetched', meta: { siteId: site.id, date: today.toISOString() } };
  }

  async getSupervisorTeamLeaveRequests(tenantId: string, userId: string, status?: string) {
    const site = await this.prisma.site.findFirst({ where: { tenantId, supervisorId: userId, isActive: true } });
    if (!site) return { success: true, data: [], message: 'No site assigned' };
    const deployments = await this.prisma.deployment.findMany({
      where: { tenantId, siteId: site.id, status: 'ACTIVE' },
      select: { employeeId: true },
    });
    const employeeIds = deployments.map(d => d.employeeId);
    const data = await this.prisma.leaveRequest.findMany({
      where: { tenantId, employeeId: { in: employeeIds }, ...(status ? { status: status as any } : {}) },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        leaveType: { select: { id: true, name: true, category: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { data, meta: { total: data.length } };
  }

  async getTodayAttendance(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [present, absent, onLeave, total] = await Promise.all([
      this.prisma.attendanceRecord.count({ where: { tenantId, date: { gte: today }, status: 'PRESENT' } }),
      this.prisma.attendanceRecord.count({ where: { tenantId, date: { gte: today }, status: 'ABSENT' } }),
      this.prisma.attendanceRecord.count({ where: { tenantId, date: { gte: today }, status: 'LEAVE' } }),
      this.prisma.employee.count({ where: { tenantId, status: 'ACTIVE' } }),
    ]);
    return { present, absent, onLeave, total, date: today };
  }

  // ── BIOMETRIC PUNCH LOGS ────────────────────────────────
  async importBiometricLogs(tenantId: string, logs: { employeeId: string; deviceId?: string; deviceName?: string; punchTime: string; punchType?: string; latitude?: number; longitude?: number }[]) {
    const created = await this.prisma.biometricPunchLog.createMany({
      data: logs.map(l => ({
        tenantId,
        employeeId: l.employeeId,
        deviceId: l.deviceId,
        deviceName: l.deviceName,
        punchTime: new Date(l.punchTime),
        punchType: (l.punchType ?? 'IN') as any,
        latitude: l.latitude,
        longitude: l.longitude,
        isProcessed: false,
      })),
      skipDuplicates: true,
    });
    return { imported: created.count };
  }

  async getBiometricLogs(tenantId: string, params: { employeeId?: string; date?: string; isProcessed?: boolean; page?: number; limit?: number }) {
    const { employeeId, date, page = 1, limit = 50 } = params;
    const where: any = { tenantId };
    if (employeeId) where.employeeId = employeeId;
    if (date) {
      const d = new Date(date);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      where.punchTime = { gte: d, lt: next };
    }
    if (params.isProcessed !== undefined) where.isProcessed = params.isProcessed;
    const [data, total] = await Promise.all([
      this.prisma.biometricPunchLog.findMany({ where, include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } }, orderBy: { punchTime: 'asc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.biometricPunchLog.count({ where }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async processBiometricLogs(tenantId: string, date: string) {
    const d = new Date(date);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    const logs = await this.prisma.biometricPunchLog.findMany({
      where: { tenantId, punchTime: { gte: d, lt: next }, isProcessed: false },
      orderBy: [{ employeeId: 'asc' }, { punchTime: 'asc' }],
    });
    const byEmployee = new Map<string, typeof logs>();
    for (const l of logs) {
      if (!byEmployee.has(l.employeeId)) byEmployee.set(l.employeeId, []);
      byEmployee.get(l.employeeId)!.push(l);
    }
    let processed = 0;
    for (const [employeeId, empLogs] of byEmployee.entries()) {
      const ins = empLogs.filter(l => l.punchType === 'IN');
      const outs = empLogs.filter(l => l.punchType === 'OUT');
      const firstIn = ins[0];
      const lastOut = outs[outs.length - 1];
      if (firstIn) {
        const workMinutes = lastOut
          ? (lastOut.punchTime.getTime() - firstIn.punchTime.getTime()) / 60000
          : 0;
        await this.prisma.attendanceRecord.upsert({
          where: { tenantId_employeeId_date: { tenantId, employeeId, date: d } },
          update: {
            checkInTime: firstIn.punchTime,
            checkOutTime: lastOut?.punchTime,
            workHours: workMinutes / 60,
            method: 'BIOMETRIC' as any,
          },
          create: {
            tenantId, employeeId, date: d,
            status: 'PRESENT' as any,
            method: 'BIOMETRIC' as any,
            checkInTime: firstIn.punchTime,
            checkOutTime: lastOut?.punchTime,
            workHours: workMinutes / 60,
          },
        });
        processed++;
      }
      await this.prisma.biometricPunchLog.updateMany({
        where: { id: { in: empLogs.map(l => l.id) } },
        data: { isProcessed: true, processedAt: new Date() },
      });
    }
    return { date, processed };
  }

  // ── ATTENDANCE REGULARIZATION ───────────────────────────
  async createRegularization(tenantId: string, dto: { employeeId: string; date: string; requestType: string; reason: string; requestedIn?: string; requestedOut?: string }, userId: string) {
    const existing = await this.prisma.attendanceRecord.findFirst({ where: { tenantId, employeeId: dto.employeeId, date: new Date(dto.date) } });
    return this.prisma.attendanceRegularization.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        date: new Date(dto.date),
        requestType: dto.requestType as any,
        reason: dto.reason,
        requestedIn: dto.requestedIn,
        requestedOut: dto.requestedOut,
        currentIn: existing?.checkInTime?.toTimeString().slice(0, 5),
        currentOut: existing?.checkOutTime?.toTimeString().slice(0, 5),
        status: 'PENDING' as any,
      },
    });
  }

  async listRegularizations(tenantId: string, params: { employeeId?: string; status?: string; page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = params;
    const where: any = { tenantId };
    if (params.employeeId) where.employeeId = params.employeeId;
    if (params.status) where.status = params.status;
    const [data, total] = await Promise.all([
      this.prisma.attendanceRegularization.findMany({ where, include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.attendanceRegularization.count({ where }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async reviewRegularization(tenantId: string, id: string, action: 'APPROVED' | 'REJECTED', remarks: string, reviewerId: string) {
    const reg = await this.prisma.attendanceRegularization.findFirst({ where: { id, tenantId } });
    if (!reg) throw new NotFoundException('Regularization not found');
    const updated = await this.prisma.attendanceRegularization.update({
      where: { id },
      data: { status: action, reviewedBy: reviewerId, reviewedAt: new Date(), reviewRemarks: remarks },
    });
    if (action === 'APPROVED' && (reg.requestedIn || reg.requestedOut)) {
      const parseTime = (t: string) => { const [h, m] = t.split(':'); const dt = new Date(reg.date); dt.setHours(+h, +m); return dt; };
      const upd: any = {};
      if (reg.requestedIn) upd.checkInTime = parseTime(reg.requestedIn);
      if (reg.requestedOut) upd.checkOutTime = parseTime(reg.requestedOut);
      if (upd.checkInTime && upd.checkOutTime) upd.workHours = (upd.checkOutTime.getTime() - upd.checkInTime.getTime()) / 3600000;
      await this.prisma.attendanceRecord.upsert({
        where: { tenantId_employeeId_date: { tenantId, employeeId: reg.employeeId, date: reg.date } },
        update: upd,
        create: { tenantId, employeeId: reg.employeeId, date: reg.date, status: 'PRESENT' as any, method: 'MANUAL' as any, ...upd },
      });
    }
    return updated;
  }

  // ── ATTENDANCE POLICIES ─────────────────────────────────
  async listPolicies(tenantId: string) {
    return this.prisma.attendancePolicy.findMany({ where: { tenantId, isActive: true }, orderBy: { name: 'asc' } });
  }

  async createPolicy(tenantId: string, dto: { name: string; lateGraceMinutes?: number; halfDayMinutes?: number; fullDayMinutes?: number; overtimeAfterMin?: number; lopAfterHalfDays?: number; isDefault?: boolean }, userId: string) {
    if (dto.isDefault) await this.prisma.attendancePolicy.updateMany({ where: { tenantId }, data: { isDefault: false } });
    return this.prisma.attendancePolicy.create({ data: { tenantId, ...dto as any, createdBy: userId } });
  }

  async updatePolicy(tenantId: string, id: string, dto: Record<string, unknown>) {
    const p = await this.prisma.attendancePolicy.findFirst({ where: { id, tenantId } });
    if (!p) throw new NotFoundException('Policy not found');
    if ((dto as any).isDefault) await this.prisma.attendancePolicy.updateMany({ where: { tenantId }, data: { isDefault: false } });
    return this.prisma.attendancePolicy.update({ where: { id }, data: dto as any });
  }

  // ── TIMESHEETS ─────────────────────────────────────────
  async listTimesheets(tenantId: string, params: { employeeId?: string; status?: string; page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = params;
    const where: any = { tenantId };
    if (params.employeeId) where.employeeId = params.employeeId;
    if (params.status) where.status = params.status;
    const [data, total] = await Promise.all([
      this.prisma.timesheet.findMany({ where, include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } }, _count: { select: { entries: true } } }, orderBy: { periodStart: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.timesheet.count({ where }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async createTimesheet(tenantId: string, dto: { employeeId: string; periodStart: string; periodEnd: string }, userId: string) {
    return this.prisma.timesheet.create({ data: { tenantId, employeeId: dto.employeeId, periodStart: new Date(dto.periodStart), periodEnd: new Date(dto.periodEnd), status: 'DRAFT' } });
  }

  async getTimesheet(tenantId: string, id: string) {
    const ts = await this.prisma.timesheet.findFirst({ where: { id, tenantId }, include: { entries: true, employee: true } });
    if (!ts) throw new NotFoundException('Timesheet not found');
    return ts;
  }

  async addTimesheetEntry(tenantId: string, timesheetId: string, dto: { date: string; hoursWorked: number; overtimeHours?: number; tenderId?: string; siteId?: string; taskDescription?: string; isHoliday?: boolean }) {
    await this.prisma.timesheet.findFirstOrThrow({ where: { id: timesheetId, tenantId } });
    const entry = await this.prisma.timesheetEntry.create({ data: { tenantId, timesheetId, date: new Date(dto.date), hoursWorked: dto.hoursWorked, overtimeHours: dto.overtimeHours ?? 0, tenderId: dto.tenderId, siteId: dto.siteId, taskDescription: dto.taskDescription, isHoliday: dto.isHoliday ?? false } });
    const agg = await this.prisma.timesheetEntry.aggregate({ where: { timesheetId }, _sum: { hoursWorked: true } });
    await this.prisma.timesheet.update({ where: { id: timesheetId }, data: { totalHours: agg._sum.hoursWorked ?? 0 } });
    return entry;
  }

  async submitTimesheet(tenantId: string, id: string) {
    return this.prisma.timesheet.update({ where: { id }, data: { status: 'SUBMITTED', submittedAt: new Date() } });
  }

  async approveTimesheet(tenantId: string, id: string, approverId: string) {
    return this.prisma.timesheet.update({ where: { id }, data: { status: 'APPROVED', approvedBy: approverId, approvedAt: new Date() } });
  }

  // ── LEAVE POLICIES ─────────────────────────────────────
  async listLeavePolicies(tenantId: string) {
    return this.prisma.leavePolicy.findMany({ where: { tenantId, isActive: true }, include: { leaveType: true }, orderBy: { createdAt: 'asc' } });
  }

  async createLeavePolicy(tenantId: string, dto: { leaveTypeId: string; name: string; accrualType: string; accrualValue: number; maxAccrual?: number; carryForwardMax?: number; encashable?: boolean; encashMax?: number; probationApply?: boolean; contractApply?: boolean; sandwichRule?: boolean; minServiceDays?: number }, userId: string) {
    return this.prisma.leavePolicy.create({ data: { tenantId, leaveTypeId: dto.leaveTypeId, name: dto.name, accrualType: dto.accrualType as any, accrualValue: dto.accrualValue, maxAccrual: dto.maxAccrual, carryForwardMax: dto.carryForwardMax ?? 0, encashable: dto.encashable ?? false, encashMax: dto.encashMax, probationApply: dto.probationApply ?? false, contractApply: dto.contractApply ?? true, sandwichRule: dto.sandwichRule ?? false, minServiceDays: dto.minServiceDays ?? 0, createdBy: userId } as any });
  }

  async updateLeavePolicy(tenantId: string, id: string, dto: Record<string, unknown>) {
    const p = await this.prisma.leavePolicy.findFirst({ where: { id, tenantId } });
    if (!p) throw new NotFoundException('Leave policy not found');
    return this.prisma.leavePolicy.update({ where: { id }, data: dto as any });
  }

  // ── SELF-SERVICE (mobile — no employeeId needed, uses JWT userId) ──────────

  private async resolveEmployee(tenantId: string, userId: string) {
    const emp = await this.prisma.employee.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!emp) throw new NotFoundException('No linked employee profile for this user');
    return emp;
  }

  async selfCheckIn(tenantId: string, userId: string, dto: { latitude?: number; longitude?: number; method?: string }) {
    const emp = await this.resolveEmployee(tenantId, userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existing = await this.prisma.attendanceRecord.findFirst({
      where: { tenantId, employeeId: emp.id, date: today },
    });
    if (existing?.checkInTime) return existing;
    const now = new Date();
    if (existing) {
      return this.prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: { checkInTime: now, checkInLatitude: dto.latitude, checkInLongitude: dto.longitude, status: 'PRESENT', method: (dto.method ?? 'GPS') as any },
      });
    }
    return this.prisma.attendanceRecord.create({
      data: {
        tenantId, employeeId: emp.id, date: today,
        status: 'PRESENT', method: (dto.method ?? 'GPS') as any,
        checkInTime: now, checkInLatitude: dto.latitude, checkInLongitude: dto.longitude,
      },
    });
  }

  async selfCheckOut(tenantId: string, userId: string, dto: { latitude?: number; longitude?: number }) {
    const emp = await this.resolveEmployee(tenantId, userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existing = await this.prisma.attendanceRecord.findFirst({
      where: { tenantId, employeeId: emp.id, date: today },
    });
    if (!existing) throw new NotFoundException('No check-in found for today');
    return this.prisma.attendanceRecord.update({
      where: { id: existing.id },
      data: { checkOutTime: new Date(), checkOutLatitude: dto.latitude, checkOutLongitude: dto.longitude },
    });
  }

  async myTodayStatus(tenantId: string, userId: string) {
    const emp = await this.resolveEmployee(tenantId, userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const record = await this.prisma.attendanceRecord.findFirst({
      where: { tenantId, employeeId: emp.id, date: today },
    });
    return {
      date: today.toISOString(),
      status: record?.status ?? 'PENDING',
      checkInTime: record?.checkInTime ?? null,
      checkOutTime: record?.checkOutTime ?? null,
      isCheckedIn: !!(record?.checkInTime && !record?.checkOutTime),
    };
  }

  async myWeekSummary(tenantId: string, userId: string) {
    const emp = await this.resolveEmployee(tenantId, userId);
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    const records = await this.prisma.attendanceRecord.findMany({
      where: { tenantId, employeeId: emp.id, date: { gte: monday, lte: sunday } },
    });
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((label, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const record = records.find(r => new Date(r.date).toDateString() === date.toDateString());
      const isFuture = date > today;
      let statusCode = 'O';
      if (!isFuture) {
        statusCode = record
          ? (record.status === 'PRESENT' ? 'P' : record.status === 'LEAVE' ? 'L' : record.status === 'ABSENT' ? 'A' : 'H')
          : (date.getDay() === 0 || date.getDay() === 6 ? 'H' : 'A');
      }
      return { date: date.toISOString(), dayLabel: label, status: record?.status ?? null, statusCode };
    });
  }

  async myMonthStats(tenantId: string, userId: string) {
    const emp = await this.resolveEmployee(tenantId, userId);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const records = await this.prisma.attendanceRecord.findMany({
      where: { tenantId, employeeId: emp.id, date: { gte: start, lte: end } },
    });
    return {
      present: records.filter(r => r.status === 'PRESENT').length,
      absent: records.filter(r => r.status === 'ABSENT').length,
      leaves: records.filter(r => r.status === 'LEAVE').length,
      total: records.length,
    };
  }

  async myLeaveBalance(tenantId: string, userId: string) {
    const emp = await this.resolveEmployee(tenantId, userId);
    const year = new Date().getFullYear();
    return this.prisma.leaveBalance.findMany({
      where: { tenantId, employeeId: emp.id, year },
      include: { leaveType: { select: { name: true, code: true, maxDays: true } } },
      orderBy: { leaveType: { name: 'asc' } },
    });
  }

  async myLeaveRequests(tenantId: string, userId: string, limit = 10) {
    const emp = await this.resolveEmployee(tenantId, userId);
    const [data, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where: { tenantId, employeeId: emp.id },
        include: { leaveType: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.leaveRequest.count({ where: { tenantId, employeeId: emp.id } }),
    ]);
    return { data, meta: { total, limit } };
  }

  async applyLeave(
    tenantId: string,
    userId: string,
    dto: { leaveTypeId: string; startDate: string; endDate: string; reason: string },
  ) {
    const emp = await this.resolveEmployee(tenantId, userId);
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
    return this.prisma.leaveRequest.create({
      data: {
        tenantId,
        employeeId: emp.id,
        leaveTypeId: dto.leaveTypeId,
        startDate: start,
        endDate: end,
        days,
        reason: dto.reason,
        status: 'PENDING',
        createdBy: userId,
      } as any,
      include: { leaveType: { select: { name: true } } },
    });
  }
}
