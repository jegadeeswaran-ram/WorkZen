import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../common/decorators/current-user.decorator';
import { TendersService } from './tenders.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateTenderDto } from './dto/create-tender.dto';
import { UpdateTenderDto } from './dto/update-tender.dto';

@ApiTags('Tenders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RbacGuard)
@Controller('tenders')
export class TendersController {
  constructor(private service: TendersService) {}

  @Get('dashboard')
  @RequirePermissions('tender:read')
  @ApiOperation({ summary: 'Get tender dashboard stats' })
  getDashboard(@TenantId() tenantId: string) {
    return this.service.getDashboard(tenantId);
  }

  @Get()
  @RequirePermissions('tender:read')
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.service.findAll(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('tender:read')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post()
  @RequirePermissions('tender:write')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateTenderDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.create(tenantId, dto, userId);
  }

  @Patch(':id')
  @RequirePermissions('tender:write')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTenderDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.update(tenantId, id, dto, userId);
  }

  @Delete(':id')
  @RequirePermissions('tender:delete')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}
