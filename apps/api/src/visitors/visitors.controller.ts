import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { VisitorsService } from './visitors.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, TenantGuard, RbacGuard)
@Controller('visitors')
export class VisitorsController {
  constructor(private readonly service: VisitorsService) {}

  @Get('dashboard') @RequirePermissions('visitor:read')
  dashboard(@TenantId() tenantId: string) {
    return this.service.getDashboard(tenantId);
  }

  @Get() @RequirePermissions('visitor:read')
  findVisitors(@TenantId() tenantId: string, @Query() query: any) {
    return this.service.findVisitors(tenantId, query);
  }

  @Patch(':id') @RequirePermissions('visitor:write')
  updateVisitor(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.updateVisitor(tenantId, id, dto);
  }

  @Patch(':id/blacklist') @RequirePermissions('visitor:write')
  toggleBlacklist(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.service.toggleBlacklist(tenantId, id, body.blacklist, body.reason);
  }

  @Get('logs') @RequirePermissions('visitor:read')
  getLogs(@TenantId() tenantId: string, @Query() query: any) {
    return this.service.getLogs(tenantId, query);
  }

  @Post('check-in') @RequirePermissions('visitor:write')
  checkIn(@TenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.service.checkIn(tenantId, userId, dto);
  }

  @Patch('logs/:id/check-out') @RequirePermissions('visitor:write')
  checkOut(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.checkOut(tenantId, id);
  }
}
