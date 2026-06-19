import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../common/decorators/current-user.decorator';
import { PerformanceService } from './performance.service';

@ApiTags('Performance') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RbacGuard)
@Controller('performance')
export class PerformanceController {
  constructor(private service: PerformanceService) {}

  @Get('dashboard') @RequirePermissions('performance:read')
  getDashboard(@TenantId() t: string) { return this.service.getDashboard(t); }

  @Get('cycles') @RequirePermissions('performance:read')
  getCycles(@TenantId() t: string) { return this.service.getCycles(t); }

  @Post('cycles') @RequirePermissions('performance:write')
  createCycle(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.createCycle(t, dto, uid); }

  @Patch('cycles/:id') @RequirePermissions('performance:write')
  updateCycle(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) { return this.service.updateCycle(t, id, dto); }

  @Get('goals') @RequirePermissions('performance:read')
  getGoals(@TenantId() t: string, @Query() q: any) { return this.service.getGoals(t, q); }

  @Post('goals') @RequirePermissions('performance:write')
  createGoal(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.createGoal(t, dto, uid); }

  @Patch('goals/:id') @RequirePermissions('performance:write')
  updateGoal(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) { return this.service.updateGoal(t, id, dto); }

  @Get('reviews') @RequirePermissions('performance:read')
  getReviews(@TenantId() t: string, @Query() q: any) { return this.service.getReviews(t, q); }

  @Post('reviews') @RequirePermissions('performance:write')
  createReview(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.createReview(t, dto, uid); }

  @Patch('reviews/:id') @RequirePermissions('performance:write')
  updateReview(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) { return this.service.updateReview(t, id, dto); }
}
