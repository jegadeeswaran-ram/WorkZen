import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { CurrentUser, TenantId } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { MastersService } from './masters.service';

@Controller('masters')
@UseGuards(JwtAuthGuard, TenantGuard, RbacGuard)
export class MastersController {
  constructor(private readonly svc: MastersService) {}

  // Designations
  @Get('designations') @RequirePermissions('settings:read') listDesignations(@TenantId() t: string) { return this.svc.listDesignations(t); }
  @Post('designations') @RequirePermissions('settings:write') createDesignation(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.svc.createDesignation(t, dto, uid); }
  @Patch('designations/:id') @RequirePermissions('settings:write') updateDesignation(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) { return this.svc.updateDesignation(t, id, dto); }
  @Delete('designations/:id') @RequirePermissions('settings:write') deleteDesignation(@TenantId() t: string, @Param('id') id: string) { return this.svc.deleteDesignation(t, id); }

  // Departments
  @Get('departments') @RequirePermissions('settings:read') listDepartments(@TenantId() t: string) { return this.svc.listDepartments(t); }
  @Post('departments') @RequirePermissions('settings:write') createDepartment(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.svc.createDepartment(t, dto, uid); }
  @Patch('departments/:id') @RequirePermissions('settings:write') updateDepartment(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) { return this.svc.updateDepartment(t, id, dto); }
  @Delete('departments/:id') @RequirePermissions('settings:write') deleteDepartment(@TenantId() t: string, @Param('id') id: string) { return this.svc.deleteDepartment(t, id); }

  // Shifts
  @Get('shifts') @RequirePermissions('settings:read') listShifts(@TenantId() t: string) { return this.svc.listShifts(t); }
  @Post('shifts') @RequirePermissions('settings:write') createShift(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.svc.createShift(t, dto, uid); }
  @Patch('shifts/:id') @RequirePermissions('settings:write') updateShift(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) { return this.svc.updateShift(t, id, dto); }
  @Delete('shifts/:id') @RequirePermissions('settings:write') deleteShift(@TenantId() t: string, @Param('id') id: string) { return this.svc.deleteShift(t, id); }

  // Leave Types
  @Get('leave-types') @RequirePermissions('settings:read') listLeaveTypes(@TenantId() t: string) { return this.svc.listLeaveTypes(t); }
  @Post('leave-types') @RequirePermissions('settings:write') createLeaveType(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.svc.createLeaveType(t, dto, uid); }
  @Patch('leave-types/:id') @RequirePermissions('settings:write') updateLeaveType(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) { return this.svc.updateLeaveType(t, id, dto); }
  @Delete('leave-types/:id') @RequirePermissions('settings:write') deleteLeaveType(@TenantId() t: string, @Param('id') id: string) { return this.svc.deleteLeaveType(t, id); }

  // Holidays
  @Get('holidays') @RequirePermissions('settings:read') listHolidays(@TenantId() t: string, @Query('year') year?: string) { return this.svc.listHolidays(t, year ? parseInt(year) : undefined); }
  @Post('holidays') @RequirePermissions('settings:write') createHoliday(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.svc.createHoliday(t, dto, uid); }
  @Patch('holidays/:id') @RequirePermissions('settings:write') updateHoliday(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) { return this.svc.updateHoliday(t, id, dto); }
  @Delete('holidays/:id') @RequirePermissions('settings:write') deleteHoliday(@TenantId() t: string, @Param('id') id: string) { return this.svc.deleteHoliday(t, id); }

  // Sites
  @Get('sites') @RequirePermissions('settings:read') listSites(@TenantId() t: string) { return this.svc.listSites(t); }
  @Post('sites') @RequirePermissions('settings:write') createSite(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.svc.createSite(t, dto, uid); }
  @Patch('sites/:id') @RequirePermissions('settings:write') updateSite(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) { return this.svc.updateSite(t, id, dto); }
  @Delete('sites/:id') @RequirePermissions('settings:write') deleteSite(@TenantId() t: string, @Param('id') id: string) { return this.svc.deleteSite(t, id); }

  // Salary Components
  @Get('salary-components') @RequirePermissions('settings:read') listSalaryComponents(@TenantId() t: string) { return this.svc.listSalaryComponents(t); }
  @Post('salary-components') @RequirePermissions('settings:write') createSalaryComponent(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.svc.createSalaryComponent(t, dto, uid); }
  @Patch('salary-components/:id') @RequirePermissions('settings:write') updateSalaryComponent(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) { return this.svc.updateSalaryComponent(t, id, dto); }
  @Delete('salary-components/:id') @RequirePermissions('settings:write') deleteSalaryComponent(@TenantId() t: string, @Param('id') id: string) { return this.svc.deleteSalaryComponent(t, id); }

  // Financial Years
  @Get('financial-years') @RequirePermissions('settings:read') listFinancialYears(@TenantId() t: string) { return this.svc.listFinancialYears(t); }
  @Post('financial-years') @RequirePermissions('settings:write') createFinancialYear(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.svc.createFinancialYear(t, dto, uid); }
  @Patch('financial-years/:id') @RequirePermissions('settings:write') updateFinancialYear(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) { return this.svc.updateFinancialYear(t, id, dto); }

  // Chart of Accounts
  @Get('accounts') @RequirePermissions('finance:read') listAccounts(@TenantId() t: string) { return this.svc.listAccounts(t); }
  @Post('accounts') @RequirePermissions('finance:write') createAccount(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.svc.createAccount(t, dto, uid); }
  @Patch('accounts/:id') @RequirePermissions('finance:write') updateAccount(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) { return this.svc.updateAccount(t, id, dto); }
  @Delete('accounts/:id') @RequirePermissions('finance:write') deleteAccount(@TenantId() t: string, @Param('id') id: string) { return this.svc.deleteAccount(t, id); }

  // Bank Accounts
  @Get('bank-accounts') @RequirePermissions('finance:read') listBankAccounts(@TenantId() t: string) { return this.svc.listBankAccounts(t); }
  @Post('bank-accounts') @RequirePermissions('finance:write') createBankAccount(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.svc.createBankAccount(t, dto, uid); }
  @Patch('bank-accounts/:id') @RequirePermissions('finance:write') updateBankAccount(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) { return this.svc.updateBankAccount(t, id, dto); }
  @Delete('bank-accounts/:id') @RequirePermissions('finance:write') deleteBankAccount(@TenantId() t: string, @Param('id') id: string) { return this.svc.deleteBankAccount(t, id); }

  // HSN / GST Master
  @Get('hsn') @RequirePermissions('finance:read') listHsn(@TenantId() t: string) { return this.svc.listHsnMasters(t); }
  @Post('hsn') @RequirePermissions('finance:write') createHsn(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.svc.createHsnMaster(t, dto, uid); }
  @Patch('hsn/:id') @RequirePermissions('finance:write') updateHsn(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) { return this.svc.updateHsnMaster(t, id, dto); }
  @Delete('hsn/:id') @RequirePermissions('finance:write') deleteHsn(@TenantId() t: string, @Param('id') id: string) { return this.svc.deleteHsnMaster(t, id); }

  // Rate Master
  @Get('rate-masters') @RequirePermissions('settings:read') listRateMasters(@TenantId() t: string) { return this.svc.listRateMasters(t); }
  @Post('rate-masters') @RequirePermissions('settings:write') createRateMaster(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.svc.createRateMaster(t, dto, uid); }
  @Patch('rate-masters/:id') @RequirePermissions('settings:write') updateRateMaster(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) { return this.svc.updateRateMaster(t, id, dto); }
  @Delete('rate-masters/:id') @RequirePermissions('settings:write') deleteRateMaster(@TenantId() t: string, @Param('id') id: string) { return this.svc.deleteRateMaster(t, id); }
}
