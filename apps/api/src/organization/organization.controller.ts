import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { TenantId } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { OrganizationService } from './organization.service';

@Controller('organization')
@UseGuards(JwtAuthGuard, TenantGuard, RbacGuard)
export class OrganizationController {
  constructor(private readonly svc: OrganizationService) {}

  @Get('tree') @RequirePermissions('settings:read') getOrgTree(@TenantId() t: string) { return this.svc.getOrgTree(t); }

  @Get('zones') @RequirePermissions('settings:read') listZones(@TenantId() t: string) { return this.svc.listZones(t); }
  @Post('zones') @RequirePermissions('settings:write') createZone(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.svc.createZone(t, dto, uid); }
  @Patch('zones/:id') @RequirePermissions('settings:write') updateZone(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) { return this.svc.updateZone(t, id, dto); }
  @Delete('zones/:id') @RequirePermissions('settings:write') deleteZone(@TenantId() t: string, @Param('id') id: string) { return this.svc.deleteZone(t, id); }

  @Get('regions') @RequirePermissions('settings:read') listRegions(@TenantId() t: string) { return this.svc.listRegions(t); }
  @Post('regions') @RequirePermissions('settings:write') createRegion(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.svc.createRegion(t, dto, uid); }
  @Patch('regions/:id') @RequirePermissions('settings:write') updateRegion(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) { return this.svc.updateRegion(t, id, dto); }
  @Delete('regions/:id') @RequirePermissions('settings:write') deleteRegion(@TenantId() t: string, @Param('id') id: string) { return this.svc.deleteRegion(t, id); }

  @Get('branches') @RequirePermissions('settings:read') listBranches(@TenantId() t: string) { return this.svc.listBranches(t); }
  @Post('branches') @RequirePermissions('settings:write') createBranch(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.svc.createBranch(t, dto, uid); }
  @Patch('branches/:id') @RequirePermissions('settings:write') updateBranch(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) { return this.svc.updateBranch(t, id, dto); }
  @Delete('branches/:id') @RequirePermissions('settings:write') deleteBranch(@TenantId() t: string, @Param('id') id: string) { return this.svc.deleteBranch(t, id); }

  @Get('announcements') @RequirePermissions('settings:read') listAnnouncements(@TenantId() t: string, @Query('publishedOnly') pub?: string) { return this.svc.listAnnouncements(t, pub === 'true'); }
  @Post('announcements') @RequirePermissions('settings:write') createAnnouncement(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.svc.createAnnouncement(t, dto, uid); }
  @Patch('announcements/:id') @RequirePermissions('settings:write') updateAnnouncement(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) { return this.svc.updateAnnouncement(t, id, dto); }
  @Patch('announcements/:id/publish') @RequirePermissions('settings:write') publishAnnouncement(@TenantId() t: string, @Param('id') id: string) { return this.svc.publishAnnouncement(t, id); }
  @Delete('announcements/:id') @RequirePermissions('settings:write') deleteAnnouncement(@TenantId() t: string, @Param('id') id: string) { return this.svc.deleteAnnouncement(t, id); }

  @Get('awards') @RequirePermissions('employee:read') listAwards(@TenantId() t: string, @Query() q: any) { return this.svc.listAwards(t, q); }
  @Post('awards') @RequirePermissions('employee:write') createAward(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.svc.createAward(t, dto, uid); }
  @Delete('awards/:id') @RequirePermissions('employee:write') deleteAward(@TenantId() t: string, @Param('id') id: string) { return this.svc.deleteAward(t, id); }
}
