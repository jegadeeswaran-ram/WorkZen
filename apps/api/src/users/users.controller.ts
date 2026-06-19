import { Controller, Get, Patch, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';

@ApiTags('Users') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RbacGuard)
@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}

  @Get() @RequirePermissions('user:read')
  findAll(@TenantId() t: string) { return this.service.findAll(t); }

  @Post('invite') @RequirePermissions('user:write')
  invite(@TenantId() t: string, @Body() dto: any) { return this.service.invite(t, dto); }

  @Get('me')
  getMe(@TenantId() t: string, @CurrentUser('id') uid: string) { return this.service.findOne(t, uid); }

  // ── PERMISSIONS & ROLES ──────────────────────────────
  @Get('permissions')
  @RequirePermissions('role:read')
  listAllPermissions() {
    return this.service.listAllPermissions();
  }

  @Get('roles')
  @RequirePermissions('role:read')
  listRoles(@TenantId() tenantId: string) {
    return this.service.listRoles(tenantId);
  }

  @Post('roles')
  @RequirePermissions('role:write')
  createRole(@TenantId() tenantId: string, @Body() dto: any, @CurrentUser('id') userId: string) {
    return this.service.createRole(tenantId, dto, userId);
  }

  @Get('roles/:id')
  @RequirePermissions('role:read')
  getRole(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.getRole(tenantId, id);
  }

  @Patch('roles/:id')
  @RequirePermissions('role:write')
  updateRole(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.updateRole(tenantId, id, dto);
  }

  @Put('roles/:id/permissions')
  @RequirePermissions('role:write')
  setRolePermissions(@TenantId() tenantId: string, @Param('id') id: string, @Body('permissionIds') permissionIds: string[]) {
    return this.service.setRolePermissions(tenantId, id, permissionIds);
  }

  @Get('list')
  @RequirePermissions('user:read')
  listUsers(@TenantId() tenantId: string, @Query() query: any) {
    return this.service.listUsers(tenantId, query);
  }

  @Put(':id/roles')
  @RequirePermissions('user:write')
  setUserRoles(@TenantId() tenantId: string, @Param('id') id: string, @Body('roleIds') roleIds: string[]) {
    return this.service.setUserRoles(tenantId, id, roleIds);
  }

  @Get(':id') @RequirePermissions('user:read')
  getUser(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.getUser(tenantId, id);
  }

  @Patch(':id') @RequirePermissions('user:write')
  update(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) { return this.service.update(t, id, dto); }

  @Post(':id/roles') @RequirePermissions('user:write')
  assignRole(@TenantId() t: string, @Param('id') id: string, @Body('roleId') roleId: string) { return this.service.assignRole(t, id, roleId); }
}
