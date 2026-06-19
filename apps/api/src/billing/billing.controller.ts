import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../common/decorators/current-user.decorator';
import { BillingService } from './billing.service';
import { BillingSheetService } from './billing-sheet.service';
import { CollectionService } from './collection.service';
import { QuotationService } from './quotation.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Billing') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RbacGuard)
@Controller('billing')
export class BillingController {
  constructor(
    private service: BillingService,
    private billingSheetService: BillingSheetService,
    private collectionService: CollectionService,
    private quotationService: QuotationService,
    private notificationsService: NotificationsService,
  ) {}

  @Get('dashboard') @RequirePermissions('invoice:read')
  getDashboard(@TenantId() t: string) { return this.service.getDashboard(t); }

  @Get('invoices') @RequirePermissions('invoice:read')
  getInvoices(@TenantId() t: string, @Query() q: PaginationDto) { return this.service.getInvoices(t, q); }

  @Get('invoices/aging')
  @RequirePermissions('invoice:read')
  getAging(@TenantId() t: string) {
    return this.service.getAgingAnalysis(t);
  }

  @Get('invoices/dso')
  @RequirePermissions('invoice:read')
  getDso(@TenantId() t: string) {
    return this.service.getDso(t);
  }

  @Patch('invoices/bulk-status')
  @RequirePermissions('invoice:approve')
  bulkStatus(@TenantId() t: string, @Body() dto: { ids: string[]; status: string }) {
    return this.service.bulkStatusUpdate(t, dto.ids, dto.status);
  }

  @Get('invoices/:id') @RequirePermissions('invoice:read')
  getInvoice(@TenantId() t: string, @Param('id') id: string) { return this.service.getInvoice(t, id); }

  @Post('invoices') @RequirePermissions('invoice:write')
  createInvoice(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.createInvoice(t, dto, uid); }

  @Patch('invoices/:id') @RequirePermissions('invoice:write')
  updateInvoice(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.updateInvoice(t, id, dto);
  }

  @Post('invoices/:id/payments') @RequirePermissions('invoice:write')
  recordPayment(@TenantId() t: string, @Param('id') id: string, @Body() dto: any, @CurrentUser('id') uid: string) {
    return this.service.recordPayment(t, id, dto, uid);
  }

  @Post('invoices/:id/credit-note')
  @RequirePermissions('invoice:write')
  createCreditNote(@TenantId() t: string, @Param('id') id: string, @Body() dto: any, @CurrentUser('id') uid: string) {
    return this.service.createCreditNote(t, id, dto, uid);
  }

  @Post('invoices/:id/debit-note')
  @RequirePermissions('invoice:write')
  createDebitNote(@TenantId() t: string, @Param('id') id: string, @Body() dto: any, @CurrentUser('id') uid: string) {
    return this.service.createDebitNote(t, id, dto, uid);
  }

  // ── WhatsApp Send ───────────────────────────────────────
  @Post('invoices/:id/send-whatsapp')
  @RequirePermissions('invoice:write')
  async sendInvoiceWhatsApp(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: { phone: string; message?: string },
    @CurrentUser('id') userId: string,
  ) {
    const invoice = await this.service.getInvoice(tenantId, id);
    const body = dto.message ?? `Dear ${(invoice as any).client?.name},\n\nPlease find your invoice ${(invoice as any).invoiceNo} for ₹${(invoice as any).totalAmount}.\n\nThank you.\nWorkZen ERP`;
    return this.notificationsService.send({
      tenantId, userId,
      type: 'WHATSAPP',
      recipient: dto.phone,
      subject: `Invoice ${(invoice as any).invoiceNo}`,
      body,
      data: { invoiceId: id },
    });
  }

  // ── Quotations ──────────────────────────────────────────
  @Get('quotations') @RequirePermissions('invoice:read')
  listQuotations(@TenantId() t: string, @Query() q: any) {
    return this.quotationService.list(t, q);
  }

  @Post('quotations') @RequirePermissions('invoice:write')
  createQuotation(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) {
    return this.quotationService.create(t, dto, uid);
  }

  @Get('quotations/:id') @RequirePermissions('invoice:read')
  getQuotation(@TenantId() t: string, @Param('id') id: string) {
    return this.quotationService.get(t, id);
  }

  @Patch('quotations/:id') @RequirePermissions('invoice:write')
  updateQuotation(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) {
    return this.quotationService.update(t, id, dto);
  }

  @Post('quotations/:id/convert') @RequirePermissions('invoice:write')
  convertQuotation(@TenantId() t: string, @Param('id') id: string, @CurrentUser('id') uid: string) {
    return this.quotationService.convertToInvoice(t, id, uid);
  }

  @Post('quotations/:id/send-whatsapp')
  @RequirePermissions('invoice:write')
  async sendQuotationWhatsApp(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: { phone: string; message?: string },
    @CurrentUser('id') userId: string,
  ) {
    const quotation = await this.quotationService.get(tenantId, id);
    const body = dto.message ?? `Dear ${(quotation as any).client?.name},\n\nPlease find your quotation ${(quotation as any).quotationNo} for ₹${(quotation as any).totalAmount}.\n\nValid until: ${new Date((quotation as any).validUntil).toLocaleDateString('en-IN')}.\n\nWorkZen ERP`;
    return this.notificationsService.send({
      tenantId, userId,
      type: 'WHATSAPP',
      recipient: dto.phone,
      subject: `Quotation ${(quotation as any).quotationNo}`,
      body,
      data: { quotationId: id },
    });
  }

  // ── Billing Sheets ─────────────────────────────────────
  @Get('billing-sheets')
  @RequirePermissions('invoice:read')
  listSheets(@TenantId() t: string, @Query() q: any) {
    return this.billingSheetService.list(t, q);
  }

  @Post('billing-sheets')
  @RequirePermissions('invoice:write')
  createSheet(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) {
    return this.billingSheetService.create(t, dto, uid);
  }

  @Get('billing-sheets/:id')
  @RequirePermissions('invoice:read')
  getSheet(@TenantId() t: string, @Param('id') id: string) {
    return this.billingSheetService.get(t, id);
  }

  @Patch('billing-sheets/:id/submit')
  @RequirePermissions('invoice:write')
  submitSheet(@TenantId() t: string, @Param('id') id: string, @CurrentUser('id') uid: string) {
    return this.billingSheetService.submit(t, id, uid);
  }

  @Patch('billing-sheets/:id/approve')
  @RequirePermissions('invoice:approve')
  approveSheet(@TenantId() t: string, @Param('id') id: string, @CurrentUser('id') uid: string) {
    return this.billingSheetService.approve(t, id, uid);
  }

  @Patch('billing-sheets/:id/post')
  @RequirePermissions('invoice:approve')
  postSheet(@TenantId() t: string, @Param('id') id: string, @CurrentUser('id') uid: string) {
    return this.billingSheetService.post(t, id, uid);
  }

  @Patch('billing-sheets/:sheetId/lines/:lineId')
  @RequirePermissions('invoice:write')
  updateSheetLine(@TenantId() t: string, @Param('sheetId') sheetId: string, @Param('lineId') lineId: string, @Body() dto: any) {
    return this.billingSheetService.updateLine(t, sheetId, lineId, dto);
  }

  // ── Collections ────────────────────────────────────────
  @Get('collections/receipts')
  @RequirePermissions('payment:read')
  listReceipts(@TenantId() t: string, @Query() q: any) {
    return this.collectionService.listReceipts(t, q);
  }

  @Post('collections/advance')
  @RequirePermissions('payment:write')
  recordAdvance(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) {
    return this.collectionService.recordAdvanceReceipt(t, dto.clientId, dto, uid);
  }

  @Patch('collections/:id/allocate')
  @RequirePermissions('payment:write')
  allocatePayment(@TenantId() t: string, @Param('id') id: string, @Body('allocations') allocations: any[]) {
    return this.collectionService.allocatePayment(t, id, allocations);
  }

  @Get('collections/unallocated')
  @RequirePermissions('payment:read')
  getUnallocated(@TenantId() t: string) {
    return this.collectionService.getUnallocatedReceipts(t);
  }

  @Get('collections/cheques')
  @RequirePermissions('payment:read')
  getCheques(@TenantId() t: string, @Query() q: any) {
    return this.collectionService.getChequeStatus(t, q);
  }
}
