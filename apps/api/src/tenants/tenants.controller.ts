import { Controller, Get, Patch, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { TenantId } from '../common/decorators/current-user.decorator';
import { TenantsService } from './tenants.service';

@ApiTags('Tenants') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private service: TenantsService) {}

  @Get('settings')
  getSettings(@TenantId() t: string) { return this.service.getSettings(t); }

  @Patch('settings')
  updateSettings(@TenantId() t: string, @Body() dto: any) { return this.service.updateSettings(t, dto); }

  @Get('audit-logs')
  @UseGuards(RbacGuard)
  @RequirePermissions('audit:read')
  async getAuditLogs(
    @TenantId() t: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('resource') resource?: string,
  ) {
    return this.service.getAuditLogs(t, { page: +page, limit: +limit, resource });
  }
}
