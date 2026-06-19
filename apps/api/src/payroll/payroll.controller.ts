import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../common/decorators/current-user.decorator';
import { PayrollService } from './payroll.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Payroll') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RbacGuard)
@Controller('payroll')
export class PayrollController {
  constructor(private service: PayrollService) {}

  @Get('dashboard') @RequirePermissions('payroll:read')
  getDashboard(@TenantId() t: string) { return this.service.getPayrollDashboard(t); }

  // ── Salary Components ─────────────────────────────────────
  @Get('salary-components') @RequirePermissions('payroll:read')
  getSalaryComponents(@TenantId() t: string) { return this.service.getSalaryComponents(t); }

  @Post('salary-components') @RequirePermissions('payroll:run')
  createSalaryComponent(@TenantId() t: string, @Body() dto: any) { return this.service.createSalaryComponent(t, dto); }

  // ── Salary Structures ─────────────────────────────────────
  @Get('salary-structures') @RequirePermissions('payroll:read')
  getSalaryStructures(@TenantId() t: string, @Query() q: any) { return this.service.getSalaryStructures(t, q); }

  @Post('salary-structures') @RequirePermissions('payroll:run')
  assignSalary(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) {
    return this.service.assignSalaryStructure(t, dto, uid);
  }

  @Patch('salary-structures/:id') @RequirePermissions('payroll:run')
  updateSalary(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.updateSalaryStructure(t, id, dto);
  }

  // ── SELF-SERVICE ──────────────────────────────────────────
  @Get('my-payslips')
  getMyPayslips(@TenantId() t: string, @CurrentUser('id') uid: string, @Query('limit') limit?: string) {
    return this.service.getMyPayslips(t, uid, limit ? Number(limit) : 12);
  }

  // ── Payroll Runs ─────────────────────────────────────────
  @Get('runs') @RequirePermissions('payroll:read')
  getRuns(@TenantId() t: string, @Query() q: PaginationDto) { return this.service.getRuns(t, q); }

  @Get('runs/:id') @RequirePermissions('payroll:read')
  getRun(@TenantId() t: string, @Param('id') id: string) { return this.service.getRun(t, id); }

  @Post('runs') @RequirePermissions('payroll:run')
  createRun(@TenantId() t: string, @Body() body: { month: number; year: number; employmentType?: string }, @CurrentUser('id') uid: string) {
    return this.service.createRun(t, body.month, body.year, uid, body.employmentType);
  }

  @Patch('runs/:id/approve') @RequirePermissions('payroll:approve')
  approveRun(@TenantId() t: string, @Param('id') id: string, @CurrentUser('id') uid: string) {
    return this.service.approveRun(t, id, uid);
  }

  @Patch('runs/:id/disburse') @RequirePermissions('payroll:approve')
  disburseRun(@TenantId() t: string, @Param('id') id: string, @CurrentUser('id') uid: string) {
    return this.service.disburseRun(t, id, uid);
  }

  @Get('runs/:id/payslips') @RequirePermissions('payroll:read')
  getRunPayslips(@TenantId() t: string, @Param('id') id: string, @Query('employmentType') empType?: string) {
    return this.service.getRunPayslips(t, id, empType);
  }

  // ── Payslips ─────────────────────────────────────────────
  @Get('employees/:employeeId/payslips') @RequirePermissions('payroll:read')
  getEmployeePayslips(@TenantId() t: string, @Param('employeeId') eid: string, @Query() q: PaginationDto) {
    return this.service.getEmployeePayslips(t, eid, q);
  }

  @Get('payslips/:id') @RequirePermissions('payroll:read')
  getPayslip(@TenantId() t: string, @Param('id') id: string) { return this.service.getPayslip(t, id); }
}
