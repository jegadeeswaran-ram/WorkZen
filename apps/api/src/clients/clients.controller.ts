import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../common/decorators/current-user.decorator';
import { ClientsService } from './clients.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Clients') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RbacGuard)
@Controller('clients')
export class ClientsController {
  constructor(private service: ClientsService) {}

  @Get() @RequirePermissions('client:read')
  findAll(@TenantId() t: string, @Query() q: PaginationDto) { return this.service.findAll(t, q); }

  @Get('dashboard') @RequirePermissions('client:read')
  getDashboard(@TenantId() t: string) { return this.service.getDashboard(t); }

  @Get(':id') @RequirePermissions('client:read')
  findOne(@TenantId() t: string, @Param('id') id: string) { return this.service.findOne(t, id); }

  @Post() @RequirePermissions('client:write')
  create(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.create(t, dto, uid); }

  @Patch(':id') @RequirePermissions('client:write')
  update(@TenantId() t: string, @Param('id') id: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.update(t, id, dto, uid); }

  @Delete(':id') @RequirePermissions('client:delete')
  remove(@TenantId() t: string, @Param('id') id: string) { return this.service.remove(t, id); }

  // ── Contacts ──────────────────────────────────────────────────────────────

  @Get('contacts/all') @RequirePermissions('client:read')
  listAllContacts(@TenantId() t: string) { return this.service.listAllContacts(t); }

  @Get(':clientId/contacts') @RequirePermissions('client:read')
  listContacts(@TenantId() t: string, @Param('clientId') clientId: string) { return this.service.listContacts(t, clientId); }

  @Post(':clientId/contacts') @RequirePermissions('client:write')
  createContact(@TenantId() t: string, @Param('clientId') clientId: string, @Body() dto: any) { return this.service.createContact(t, clientId, dto); }

  @Patch(':clientId/contacts/:contactId') @RequirePermissions('client:write')
  updateContact(@TenantId() t: string, @Param('clientId') clientId: string, @Param('contactId') contactId: string, @Body() dto: any) { return this.service.updateContact(t, clientId, contactId, dto); }

  @Delete(':clientId/contacts/:contactId') @RequirePermissions('client:delete')
  deleteContact(@TenantId() t: string, @Param('clientId') clientId: string, @Param('contactId') contactId: string) { return this.service.deleteContact(t, clientId, contactId); }
}
