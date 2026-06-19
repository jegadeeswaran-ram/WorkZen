import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../common/decorators/current-user.decorator';
import { EmployeesService } from './employees.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RbacGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private service: EmployeesService) {}

  // ── COLLECTION ROUTES (must be before :id) ───────────────

  @Get('me')
  getMe(@TenantId() t: string, @CurrentUser('id') uid: string) {
    return this.service.getMyProfile(t, uid);
  }

  @Get('stats')
  @RequirePermissions('employee:read')
  getStats(@TenantId() tenantId: string) { return this.service.getStats(tenantId); }

  @Get('designations')
  @RequirePermissions('employee:read')
  getDesignations(@TenantId() tenantId: string) { return this.service.getDesignations(tenantId); }

  @Get('departments')
  @RequirePermissions('employee:read')
  getDepartments(@TenantId() tenantId: string) { return this.service.getDepartments(tenantId); }

  @Get('transfers')
  @RequirePermissions('employee:read')
  listTransfers(@TenantId() t: string, @Query() q: any) { return this.service.listTransferRequests(t, q); }

  @Get('promotions')
  @RequirePermissions('employee:read')
  listPromotions(@TenantId() t: string, @Query('employeeId') empId?: string) { return this.service.listPromotions(t, empId); }

  @Get('separations')
  @RequirePermissions('employee:read')
  listSeparations(@TenantId() t: string, @Query() q: any) { return this.service.listSeparations(t, q); }

  @Get()
  @RequirePermissions('employee:read')
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.service.findAll(tenantId, query);
  }

  // ── MUTATIONS (no :id param) ──────────────────────────────

  @Post()
  @RequirePermissions('employee:write')
  @ApiOperation({ summary: 'Create employee (auto-generates employee code)' })
  create(@TenantId() tenantId: string, @Body() dto: CreateEmployeeDto, @CurrentUser('id') userId: string) {
    return this.service.create(tenantId, dto, userId);
  }

  @Post('designations')
  @RequirePermissions('employee:write')
  createDesignation(@TenantId() tenantId: string, @Body('name') name: string, @CurrentUser('id') userId: string) {
    return this.service.createDesignation(tenantId, name, userId);
  }

  @Post('departments')
  @RequirePermissions('employee:write')
  createDepartment(@TenantId() tenantId: string, @Body('name') name: string, @CurrentUser('id') userId: string) {
    return this.service.createDepartment(tenantId, name, userId);
  }

  @Post('transfers')
  @RequirePermissions('employee:write')
  createTransfer(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.createTransferRequest(t, dto, uid); }

  @Post('promotions')
  @RequirePermissions('employee:write')
  createPromotion(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.createPromotion(t, dto, uid); }

  @Post('separations')
  @RequirePermissions('employee:write')
  initiateSeparation(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.initiateSeparation(t, dto, uid); }

  // ── PARAMETERIZED ROUTES (:id must come last) ─────────────

  @Get(':id')
  @RequirePermissions('employee:read')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('employee:write')
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateEmployeeDto, @CurrentUser('id') userId: string) {
    return this.service.update(tenantId, id, dto, userId);
  }

  @Delete(':id')
  @RequirePermissions('employee:delete')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }

  @Patch(':id/lifecycle-status')
  @RequirePermissions('employee:write')
  updateLifecycleStatus(@TenantId() t: string, @Param('id') id: string, @Body('lifecycleStatus') status: string, @CurrentUser('id') uid: string) {
    return this.service.updateLifecycleStatus(t, id, status, uid);
  }

  @Patch('transfers/:id/approve')
  @RequirePermissions('employee:approve')
  approveTransfer(@TenantId() t: string, @Param('id') id: string, @Body('action') action: 'APPROVED' | 'REJECTED', @CurrentUser('id') uid: string) {
    return this.service.approveTransferRequest(t, id, action, uid);
  }

  @Get(':id/separation')
  @RequirePermissions('employee:read')
  getSeparation(@TenantId() t: string, @Param('id') id: string) { return this.service.getSeparationRecord(t, id); }

  @Patch(':id/clearance')
  @RequirePermissions('employee:write')
  updateClearance(@TenantId() t: string, @Param('id') id: string, @Body() dto: { department: string; cleared: boolean }) {
    return this.service.updateClearanceStatus(t, id, dto.department, dto.cleared);
  }

  @Get('warnings') @RequirePermissions('employee:read')
  getWarnings(@TenantId() t: string, @Query() q: any) { return this.service.getWarnings(t, q); }

  @Post('warnings') @RequirePermissions('employee:write')
  createWarning(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.createWarning(t, dto, uid); }

  @Patch('warnings/:id') @RequirePermissions('employee:write')
  updateWarning(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) { return this.service.updateWarning(t, id, dto); }

  @Get('trips') @RequirePermissions('employee:read')
  getTrips(@TenantId() t: string, @Query() q: any) { return this.service.getTrips(t, q); }

  @Post('trips') @RequirePermissions('employee:write')
  createTrip(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.createTrip(t, dto, uid); }

  @Patch('trips/:id') @RequirePermissions('employee:write')
  updateTrip(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) { return this.service.updateTrip(t, id, dto); }
}
