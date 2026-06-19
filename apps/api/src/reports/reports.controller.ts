import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';

@ApiTags('Reports') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('reports')
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('summary') @RequirePermissions('report:read')
  getSummary(@TenantId() t: string) { return this.service.getDashboardSummary(t); }

  @Get('definitions') @RequirePermissions('report:read')
  getDefinitions(@TenantId() t: string) { return this.service.getDefinitions(t); }

  @Post(':id/generate') @RequirePermissions('report:export')
  generate(@TenantId() t: string, @Param('id') id: string, @Body() params: any, @CurrentUser('id') uid: string) {
    return this.service.generateReport(t, id, params, uid);
  }

  @Get(':id/executions') @RequirePermissions('report:read')
  getExecutions(@TenantId() t: string, @Param('id') id: string) { return this.service.getExecutions(t, id); }
}
