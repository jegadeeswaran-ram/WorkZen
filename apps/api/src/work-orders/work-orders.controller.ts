import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, TenantGuard, RbacGuard)
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly service: WorkOrdersService) {}

  @Get('dashboard') @RequirePermissions('work_order:read')
  getDashboard(@TenantId() tenantId: string) {
    return this.service.getDashboard(tenantId);
  }

  // ── Work Orders ─────────────────────────────────────────────────
  @Get() @RequirePermissions('work_order:read')
  findAll(@TenantId() tenantId: string, @Query() query: any) {
    return this.service.findAll(tenantId, query);
  }

  @Get(':id') @RequirePermissions('work_order:read')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post() @RequirePermissions('work_order:write')
  create(@TenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.service.create(tenantId, userId, dto);
  }

  @Patch(':id') @RequirePermissions('work_order:write')
  update(@TenantId() tenantId: string, @Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.service.update(tenantId, id, userId, dto);
  }

  // ── Positions ──────────────────────────────────────────────────
  @Get(':id/positions') @RequirePermissions('work_order:read')
  getPositions(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.getPositions(tenantId, id);
  }

  @Post(':id/positions') @RequirePermissions('work_order:write')
  createPosition(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.createPosition(tenantId, id, dto);
  }

  @Patch('positions/:posId') @RequirePermissions('work_order:write')
  updatePosition(@TenantId() tenantId: string, @Param('posId') posId: string, @Body() dto: any) {
    return this.service.updatePosition(tenantId, posId, dto);
  }

  // ── Milestones ─────────────────────────────────────────────────
  @Get(':id/milestones') @RequirePermissions('work_order:read')
  getMilestones(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.getMilestones(tenantId, id);
  }

  @Post(':id/milestones') @RequirePermissions('work_order:write')
  createMilestone(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.createMilestone(tenantId, id, dto);
  }

  @Patch('milestones/:mid') @RequirePermissions('work_order:write')
  updateMilestone(@TenantId() tenantId: string, @Param('mid') mid: string, @Body() dto: any) {
    return this.service.updateMilestone(tenantId, mid, dto);
  }

  // ── Amendments ─────────────────────────────────────────────────
  @Get(':id/amendments') @RequirePermissions('work_order:read')
  getAmendments(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.getAmendments(tenantId, id);
  }

  @Post(':id/amendments') @RequirePermissions('work_order:write')
  createAmendment(@TenantId() tenantId: string, @Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.service.createAmendment(tenantId, id, userId, dto);
  }

  // ── Fulfillments ────────────────────────────────────────────────
  @Get(':id/fulfillments') @RequirePermissions('work_order:read')
  getFulfillments(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.getFulfillments(tenantId, id);
  }

  @Post(':id/fulfillments') @RequirePermissions('work_order:write')
  addFulfillment(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.addFulfillment(tenantId, id, dto);
  }

  @Patch('fulfillments/:fid/release') @RequirePermissions('work_order:write')
  releaseFulfillment(@TenantId() tenantId: string, @Param('fid') fid: string, @Body() body: any) {
    return this.service.releaseFulfillment(tenantId, fid, body.releasedDate);
  }

  // ── Invoices ────────────────────────────────────────────────────
  @Get(':id/invoices') @RequirePermissions('work_order:read')
  getInvoices(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.getInvoices(tenantId, id);
  }

  @Post(':id/invoices') @RequirePermissions('work_order:write')
  createInvoice(@TenantId() tenantId: string, @Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.service.createInvoice(tenantId, id, userId, dto);
  }

  @Patch('invoices/:invId/status') @RequirePermissions('work_order:write')
  updateInvoiceStatus(@TenantId() tenantId: string, @Param('invId') invId: string, @Body() body: any) {
    return this.service.updateInvoiceStatus(tenantId, invId, body.status);
  }

  // ── Payments ────────────────────────────────────────────────────
  @Get(':id/payments') @RequirePermissions('work_order:read')
  getPayments(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.getPayments(tenantId, id);
  }

  @Post(':id/payments') @RequirePermissions('work_order:write')
  recordPayment(@TenantId() tenantId: string, @Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.service.recordPayment(tenantId, id, userId, dto);
  }
}
