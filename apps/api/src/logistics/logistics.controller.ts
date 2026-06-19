import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { LogisticsService } from './logistics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('logistics')
export class LogisticsController {
  constructor(private readonly service: LogisticsService) {}

  @Get('dashboard')
  dashboard(@Request() req: any) {
    return this.service.getDashboard(req.tenantId).then(data => ({ success: true, data }));
  }

  @Get('vendors')
  getVendors(@Request() req: any) {
    return this.service.getVendors(req.tenantId).then(data => ({ success: true, data }));
  }

  @Post('vendors')
  createVendor(@Request() req: any, @Body() dto: any) {
    return this.service.createVendor(req.tenantId, dto).then(data => ({ success: true, data }));
  }

  @Patch('vendors/:id')
  updateVendor(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.updateVendor(req.tenantId, id, dto).then(data => ({ success: true, data }));
  }

  @Get('dispatches')
  getDispatches(@Request() req: any, @Query() query: any) {
    return this.service.getDispatches(req.tenantId, query).then(data => ({ success: true, ...data }));
  }

  @Post('dispatches')
  createDispatch(@Request() req: any, @Body() dto: any) {
    return this.service.createDispatch(req.tenantId, req.user.id, dto).then(data => ({ success: true, data }));
  }

  @Patch('dispatches/:id')
  updateDispatch(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.updateDispatch(req.tenantId, id, dto).then(data => ({ success: true, data }));
  }

  @Get('receipts')
  getReceipts(@Request() req: any, @Query() query: any) {
    return this.service.getReceipts(req.tenantId, query).then(data => ({ success: true, ...data }));
  }

  @Post('receipts')
  createReceipt(@Request() req: any, @Body() dto: any) {
    return this.service.createReceipt(req.tenantId, dto).then(data => ({ success: true, data }));
  }

  @Patch('receipts/:id')
  updateReceipt(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.updateReceipt(req.tenantId, id, dto).then(data => ({ success: true, data }));
  }
}
