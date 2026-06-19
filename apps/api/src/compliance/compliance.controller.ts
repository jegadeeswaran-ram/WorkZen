import { Controller, Get, Patch, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { TenantId } from '../common/decorators/current-user.decorator';
import { ComplianceService } from './compliance.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Compliance') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RbacGuard)
@Controller('compliance')
export class ComplianceController {
  constructor(private service: ComplianceService) {}

  @Get('dashboard') @RequirePermissions('compliance:read')
  getDashboard(@TenantId() t: string) { return this.service.getDashboard(t); }

  @Get('items') @RequirePermissions('compliance:read')
  getItems(@TenantId() t: string, @Query() q: PaginationDto) { return this.service.getItems(t, q); }

  @Get('calendar') @RequirePermissions('compliance:read')
  getCalendar(@TenantId() t: string, @Query() q: { month: number; year: number }) {
    return this.service.getCalendar(t, q.month, q.year);
  }

  @Get('licenses') @RequirePermissions('compliance:read')
  getLicenses(@TenantId() t: string) { return this.service.getLicenses(t); }

  @Post('items') @RequirePermissions('compliance:write')
  createItem(@TenantId() t: string, @Body() dto: any) { return this.service.createItem(t, dto); }

  @Post('licenses') @RequirePermissions('compliance:write')
  createLicense(@TenantId() t: string, @Body() dto: any) { return this.service.createLicense(t, dto); }

  @Patch('items/:id/file') @RequirePermissions('compliance:write')
  markFiled(@TenantId() t: string, @Param('id') id: string, @Body() body: any) {
    return this.service.markFiled(t, id, body);
  }
}
