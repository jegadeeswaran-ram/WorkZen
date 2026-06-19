import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../common/decorators/current-user.decorator';
import { AssetsService } from './assets.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Assets') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RbacGuard)
@Controller('assets')
export class AssetsController {
  constructor(private service: AssetsService) {}

  @Get('dashboard') @RequirePermissions('asset:read')
  getDashboard(@TenantId() t: string) { return this.service.getDashboard(t); }

  @Get() @RequirePermissions('asset:read')
  findAll(@TenantId() t: string, @Query() q: PaginationDto) { return this.service.findAll(t, q); }

  @Post() @RequirePermissions('asset:write')
  create(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.create(t, dto, uid); }

  @Post(':id/assign') @RequirePermissions('asset:assign')
  assign(@TenantId() t: string, @Param('id') id: string, @Body('employeeId') eid: string, @CurrentUser('id') uid: string) {
    return this.service.assignToEmployee(t, id, eid, uid);
  }

  @Post('assignments/:id/return') @RequirePermissions('asset:write')
  returnAsset(@TenantId() t: string, @Param('id') id: string, @Body('notes') notes?: string) {
    return this.service.returnAsset(t, id, notes);
  }

  @Get('employee/:employeeId') @RequirePermissions('asset:read')
  getEmployeeAssets(@TenantId() t: string, @Param('employeeId') eid: string) { return this.service.getEmployeeAssets(t, eid); }
}
