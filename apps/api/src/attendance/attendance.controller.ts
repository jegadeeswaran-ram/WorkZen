import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../common/decorators/current-user.decorator';
import { AttendanceService } from './attendance.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Attendance') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RbacGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private service: AttendanceService) {}

  // ── SELF-SERVICE (no RBAC required — uses JWT userId) ────────────────────

  @Post('check-in') @HttpCode(200)
  selfCheckIn(@TenantId() t: string, @CurrentUser('id') uid: string, @Body() dto: { latitude?: number; longitude?: number; method?: string }) {
    return this.service.selfCheckIn(t, uid, dto);
  }

  @Post('check-out') @HttpCode(200)
  selfCheckOut(@TenantId() t: string, @CurrentUser('id') uid: string, @Body() dto: { latitude?: number; longitude?: number }) {
    return this.service.selfCheckOut(t, uid, dto);
  }

  @Get('my-today')
  myToday(@TenantId() t: string, @CurrentUser('id') uid: string) { return this.service.myTodayStatus(t, uid); }

  @Get('my-week')
  myWeek(@TenantId() t: string, @CurrentUser('id') uid: string) { return this.service.myWeekSummary(t, uid); }

  @Get('my-month-stats')
  myMonthStats(@TenantId() t: string, @CurrentUser('id') uid: string) { return this.service.myMonthStats(t, uid); }

  @Get('my-leave-balance')
  myLeaveBalance(@TenantId() t: string, @CurrentUser('id') uid: string) { return this.service.myLeaveBalance(t, uid); }

  @Get('my-leave-requests')
  myLeaveRequests(@TenantId() t: string, @CurrentUser('id') uid: string, @Query('limit') limit?: string) {
    return this.service.myLeaveRequests(t, uid, limit ? Number(limit) : 10);
  }

  @Post('my-leave-requests') @HttpCode(200)
  applyLeave(@TenantId() t: string, @CurrentUser('id') uid: string, @Body() dto: { leaveTypeId: string; startDate: string; endDate: string; reason: string }) {
    return this.service.applyLeave(t, uid, dto);
  }

  // ── ADMIN ROUTES ──────────────────────────────────────────────────────────

  @Post('mark') @RequirePermissions('attendance:mark')
  mark(@TenantId() t: string, @Body() dto: any) { return this.service.markAttendance(t, dto); }

  @Get('monthly-report') @RequirePermissions('attendance:read')
  report(@TenantId() t: string, @Query() q: any) { return this.service.getMonthlyReport(t, q); }

  @Get('leave-requests') @RequirePermissions('leave:read')
  getLeaves(@TenantId() t: string, @Query() q: PaginationDto) { return this.service.getLeaveRequests(t, q); }

  @Patch('leave-requests/:id/approve') @RequirePermissions('leave:approve')
  approveLeave(@TenantId() t: string, @Param('id') id: string, @Body() body: any, @CurrentUser('id') uid: string) {
    return this.service.approveLeave(t, id, uid, body.action, body.remarks);
  }

  @Post('leave-requests') @RequirePermissions('leave:write')
  createLeave(@TenantId() t: string, @Body() dto: any) { return this.service.createLeaveRequest(t, dto); }

  @Get('leave-types') @RequirePermissions('leave:read')
  getLeaveTypes(@TenantId() t: string) { return this.service.getLeaveTypes(t); }

  @Get('today') @RequirePermissions('attendance:read')
  getToday(@TenantId() t: string) { return this.service.getTodayAttendance(t); }

  // ── BIOMETRIC ────────────────────────────────────────────
  @Post('biometric/import') @RequirePermissions('attendance:write')
  importBiometricLogs(@TenantId() t: string, @Body('logs') logs: any[]) { return this.service.importBiometricLogs(t, logs ?? []); }

  @Get('biometric') @RequirePermissions('attendance:read')
  getBiometricLogs(@TenantId() t: string, @Query() q: any) { return this.service.getBiometricLogs(t, q); }

  @Post('biometric/process') @RequirePermissions('attendance:write')
  processBiometricLogs(@TenantId() t: string, @Body('date') date: string) { return this.service.processBiometricLogs(t, date ?? new Date().toISOString().slice(0, 10)); }

  // ── REGULARIZATION ───────────────────────────────────────
  @Get('regularizations') @RequirePermissions('attendance:read')
  listRegularizations(@TenantId() t: string, @Query() q: any) { return this.service.listRegularizations(t, q); }

  @Post('regularizations') @RequirePermissions('attendance:write')
  createRegularization(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.createRegularization(t, dto, uid); }

  @Patch('regularizations/:id/review') @RequirePermissions('attendance:approve')
  reviewRegularization(@TenantId() t: string, @Param('id') id: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.reviewRegularization(t, id, dto.action, dto.remarks, uid); }

  // ── POLICIES ─────────────────────────────────────────────
  @Get('policies') @RequirePermissions('attendance:read')
  listPolicies(@TenantId() t: string) { return this.service.listPolicies(t); }

  @Post('policies') @RequirePermissions('settings:write')
  createPolicy(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.createPolicy(t, dto, uid); }

  @Patch('policies/:id') @RequirePermissions('settings:write')
  updatePolicy(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) { return this.service.updatePolicy(t, id, dto); }

  // ── TIMESHEETS ────────────────────────────────────────────
  @Get('timesheets') @RequirePermissions('attendance:read')
  listTimesheets(@TenantId() t: string, @Query() q: any) { return this.service.listTimesheets(t, q); }

  @Post('timesheets') @RequirePermissions('attendance:write')
  createTimesheet(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.createTimesheet(t, dto, uid); }

  @Get('timesheets/:id') @RequirePermissions('attendance:read')
  getTimesheet(@TenantId() t: string, @Param('id') id: string) { return this.service.getTimesheet(t, id); }

  @Post('timesheets/:id/entries') @RequirePermissions('attendance:write')
  addTimesheetEntry(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) { return this.service.addTimesheetEntry(t, id, dto); }

  @Patch('timesheets/:id/submit') @RequirePermissions('attendance:write')
  submitTimesheet(@TenantId() t: string, @Param('id') id: string) { return this.service.submitTimesheet(t, id); }

  @Patch('timesheets/:id/approve') @RequirePermissions('attendance:approve')
  approveTimesheet(@TenantId() t: string, @Param('id') id: string, @CurrentUser('id') uid: string) { return this.service.approveTimesheet(t, id, uid); }

  // ── LEAVE POLICIES ────────────────────────────────────────
  @Get('leave-policies') @RequirePermissions('attendance:read')
  listLeavePolicies(@TenantId() t: string) { return this.service.listLeavePolicies(t); }

  @Post('leave-policies') @RequirePermissions('settings:write')
  createLeavePolicy(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.createLeavePolicy(t, dto, uid); }

  @Patch('leave-policies/:id') @RequirePermissions('settings:write')
  updateLeavePolicy(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) { return this.service.updateLeavePolicy(t, id, dto); }
}
