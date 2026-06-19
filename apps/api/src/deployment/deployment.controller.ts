import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../common/decorators/current-user.decorator';
import { DeploymentService } from './deployment.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Deployment') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RbacGuard)
@Controller('deployment')
export class DeploymentController {
  constructor(private service: DeploymentService) {}

  @Get('sites') @RequirePermissions('deployment:read')
  getSites(@TenantId() t: string) { return this.service.getSites(t); }

  @Post('sites') @RequirePermissions('deployment:write')
  createSite(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) {
    return this.service.createSite(t, dto, uid);
  }

  @Patch('sites/:id') @RequirePermissions('deployment:write')
  updateSite(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.updateSite(t, id, dto);
  }

  @Get('shifts') @RequirePermissions('deployment:read')
  getShifts(@TenantId() t: string) { return this.service.getShifts(t); }

  @Post('shifts') @RequirePermissions('deployment:write')
  createShift(@TenantId() t: string, @Body() dto: any) { return this.service.createShift(t, dto); }

  @Get('strength/:tenderId') @RequirePermissions('deployment:read')
  strength(@TenantId() t: string, @Param('tenderId') tid: string) { return this.service.getStrength(t, tid); }

  @Get() @RequirePermissions('deployment:read')
  getAll(@TenantId() t: string, @Query() q: PaginationDto) { return this.service.getDeployments(t, q); }

  @Post() @RequirePermissions('deployment:write')
  create(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.createDeployment(t, dto, uid); }

  @Patch(':id/end') @RequirePermissions('deployment:write')
  end(@TenantId() t: string, @Param('id') id: string, @Body('endDate') endDate: string) { return this.service.endDeployment(t, id, endDate); }
}
