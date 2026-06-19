import { Controller, Get, Post, Patch, Delete, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../common/decorators/current-user.decorator';
import { FinanceService } from './finance.service';
import { GSTService } from './gst.service';
import { RateService } from './rate.service';
import { ARService } from './ar.service';
import { CostCenterService } from './cost-center.service';
import { VoucherService } from './voucher.service';
import { StatementsService } from './statements.service';
import { TenderProfitabilityService } from './tender-profitability.service';
import { RevenueService } from './revenue.service';
import { BankingService } from './banking.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Finance') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RbacGuard)
@Controller('finance')
export class FinanceController {
  constructor(private service: FinanceService, private gstService: GSTService, private rateService: RateService, private arService: ARService, private costCenterService: CostCenterService, private voucherService: VoucherService, private statementsService: StatementsService, private tenderProfitabilityService: TenderProfitabilityService, private revenueService: RevenueService, private bankingService: BankingService) {}

  @Get('dashboard') @RequirePermissions('finance:read')
  getDashboard(@TenantId() t: string) { return this.service.getDashboard(t); }

  @Get('accounts') @RequirePermissions('finance:read')
  getAccounts(@TenantId() t: string) { return this.service.getAccounts(t); }

  @Get('journal-entries') @RequirePermissions('finance:read')
  getJournalEntries(@TenantId() t: string, @Query() q: PaginationDto) { return this.service.getJournalEntries(t, q); }

  @Get('journal') @RequirePermissions('finance:read')
  getJournal(@TenantId() t: string, @Query() q: PaginationDto) { return this.service.getJournalEntries(t, q); }

  @Get('bank-accounts') @RequirePermissions('finance:read')
  getBankAccounts(@TenantId() t: string, @Query() q: PaginationDto) { return this.service.getBankAccounts(t, q); }

  @Get('expenses') @RequirePermissions('finance:read')
  getExpenses(@TenantId() t: string, @Query() q: PaginationDto) { return this.service.getExpenses(t, q); }

  @Post('expenses') @RequirePermissions('finance:write')
  createExpense(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.createExpense(t, dto, uid); }

  // ── GST Management ──────────────────────────────────────
  @Get('gst/ledger')
  @RequirePermissions('finance:read')
  getGSTLedger(@TenantId() t: string, @Query() q: any) {
    return this.gstService.getGSTLedger(t, q);
  }

  @Get('gst/gstr1')
  @RequirePermissions('finance:read')
  getGSTR1(@TenantId() t: string, @Query('period') period: string) {
    return this.gstService.getGSTR1Data(t, period);
  }

  @Get('gst/gstr3b')
  @RequirePermissions('finance:read')
  getGSTR3B(@TenantId() t: string, @Query('period') period: string) {
    return this.gstService.getGSTR3BSummary(t, period);
  }

  @Get('gst/hsn')
  @RequirePermissions('finance:read')
  getHSN(@TenantId() t: string) {
    return this.gstService.getHSNMaster(t);
  }

  @Post('gst/hsn')
  @RequirePermissions('finance:write')
  createHSN(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) {
    return this.gstService.createHSN(t, dto, uid);
  }

  @Get('gst/reconciliation')
  @RequirePermissions('finance:read')
  getGSTReconciliation(@TenantId() t: string, @Query('period') period: string) {
    return this.gstService.getReconciliation(t, period);
  }

  @Post('gst/sync/:invoiceId')
  @RequirePermissions('finance:write')
  syncGSTFromInvoice(@TenantId() t: string, @Param('invoiceId') invoiceId: string) {
    return this.gstService.syncFromInvoice(t, invoiceId);
  }

  // ── Rate Management ────────────────────────────────────
  @Get('rates')
  @RequirePermissions('finance:read')
  listRates(@TenantId() t: string, @Query() q: any) {
    return this.rateService.listRates(t, q);
  }

  @Post('rates')
  @RequirePermissions('finance:write')
  createRate(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) {
    return this.rateService.createRate(t, dto, uid);
  }

  @Get('rates/:id')
  @RequirePermissions('finance:read')
  getRate(@TenantId() t: string, @Param('id') id: string) {
    return this.rateService.getRate(t, id);
  }

  @Patch('rates/:id')
  @RequirePermissions('finance:write')
  updateRate(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) {
    return this.rateService.updateRate(t, id, dto);
  }

  @Delete('rates/:id')
  @RequirePermissions('finance:write')
  deactivateRate(@TenantId() t: string, @Param('id') id: string) {
    return this.rateService.deactivateRate(t, id);
  }

  @Get('rates/:id/escalations')
  @RequirePermissions('finance:read')
  listEscalations(@TenantId() t: string, @Param('id') id: string) {
    return this.rateService.listEscalations(t, id);
  }

  @Post('rates/:id/escalations')
  @RequirePermissions('finance:write')
  createEscalation(@TenantId() t: string, @Param('id') id: string, @Body() dto: any, @CurrentUser('id') uid: string) {
    return this.rateService.createEscalation(t, id, dto, uid);
  }

  // ── Accounts Receivable ────────────────────────────────
  @Get('ar/outstanding')
  @RequirePermissions('finance:read')
  getAROutstanding(@TenantId() t: string) {
    return this.arService.getOutstandingByClient(t);
  }

  @Get('ar/aging')
  @RequirePermissions('finance:read')
  getARAgingSummary(@TenantId() t: string) {
    return this.arService.getAgingSummary(t);
  }

  @Get('ar/clients/:id/ledger')
  @RequirePermissions('finance:read')
  getClientLedger(@TenantId() t: string, @Param('id') id: string, @Query() q: any) {
    return this.arService.getCustomerLedger(t, id, q);
  }

  @Get('ar/clients/:id/credit-status')
  @RequirePermissions('finance:read')
  getCreditStatus(@TenantId() t: string, @Param('id') id: string) {
    return this.arService.getCreditLimitStatus(t, id);
  }

  @Post('ar/clients/:id/send-reminder')
  @RequirePermissions('finance:write')
  sendReminder(@TenantId() t: string, @Param('id') id: string, @CurrentUser('id') uid: string) {
    return this.arService.sendReminder(t, id, uid);
  }

  // ── Cost Centers ────────────────────────────────────────
  @Get('cost-centers')
  @RequirePermissions('finance:read')
  listCostCenters(@TenantId() t: string) {
    return this.costCenterService.list(t);
  }

  @Post('cost-centers')
  @RequirePermissions('finance:write')
  createCostCenter(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) {
    return this.costCenterService.create(t, dto, uid);
  }

  @Patch('cost-centers/:id')
  @RequirePermissions('finance:write')
  updateCostCenter(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) {
    return this.costCenterService.update(t, id, dto);
  }

  @Delete('cost-centers/:id')
  @RequirePermissions('finance:write')
  removeCostCenter(@TenantId() t: string, @Param('id') id: string) {
    return this.costCenterService.remove(t, id);
  }

  @Get('cost-centers/:id/pnl')
  @RequirePermissions('finance:read')
  getCostCenterPnL(@TenantId() t: string, @Param('id') id: string, @Query() q: any) {
    return this.costCenterService.getPnL(t, id, q);
  }

  // ── Vouchers ────────────────────────────────────────────
  @Post('vouchers')
  @RequirePermissions('finance:write')
  createVoucher(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) {
    return this.voucherService.createVoucher(t, dto, uid);
  }

  @Get('vouchers')
  @RequirePermissions('finance:read')
  listVouchers(@TenantId() t: string, @Query() q: any) {
    return this.voucherService.listVouchers(t, q);
  }

  @Get('day-book')
  @RequirePermissions('finance:read')
  getDayBook(@TenantId() t: string, @Query('date') date: string) {
    return this.voucherService.getDayBook(t, date ?? new Date().toISOString().split('T')[0]);
  }

  @Get('vouchers/:id')
  @RequirePermissions('finance:read')
  getVoucher(@TenantId() t: string, @Param('id') id: string) {
    return this.voucherService.getVoucher(t, id);
  }

  @Patch('vouchers/:id/post')
  @RequirePermissions('finance:write')
  postVoucher(@TenantId() t: string, @Param('id') id: string, @CurrentUser('id') uid: string) {
    return this.voucherService.postVoucher(t, id, uid);
  }

  @Patch('vouchers/:id/cancel')
  @RequirePermissions('finance:write')
  cancelVoucher(@TenantId() t: string, @Param('id') id: string, @CurrentUser('id') uid: string) {
    return this.voucherService.cancelVoucher(t, id, uid);
  }

  @Get('accounts/:id/ledger')
  @RequirePermissions('finance:read')
  getAccountLedger(@TenantId() t: string, @Param('id') id: string, @Query() q: any) {
    return this.voucherService.getGeneralLedger(t, id, q);
  }

  // ── Financial Statements ─────────────────────────────────
  @Get('statements/trial-balance')
  @RequirePermissions('finance:read')
  getTrialBalance(@TenantId() t: string, @Query() q: any) {
    return this.statementsService.getTrialBalance(t, q);
  }

  @Get('statements/profit-loss')
  @RequirePermissions('finance:read')
  getProfitLoss(@TenantId() t: string, @Query() q: any) {
    return this.statementsService.getProfitAndLoss(t, q);
  }

  @Get('statements/balance-sheet')
  @RequirePermissions('finance:read')
  getBalanceSheet(@TenantId() t: string, @Query() q: any) {
    return this.statementsService.getBalanceSheet(t, q);
  }

  @Get('statements/cash-flow')
  @RequirePermissions('finance:read')
  getCashFlow(@TenantId() t: string, @Query() q: any) {
    return this.statementsService.getCashFlow(t, q);
  }

  // ── Tender Profitability ─────────────────────────────────
  @Get('profitability/dashboard')
  @RequirePermissions('finance:read')
  getProfitabilityDashboard(@TenantId() t: string) {
    return this.tenderProfitabilityService.getDashboard(t);
  }

  @Get('profitability/tenders/:id/history')
  @RequirePermissions('finance:read')
  getProfitabilityHistory(@TenantId() t: string, @Param('id') id: string) {
    return this.tenderProfitabilityService.getProfitabilityHistory(t, id);
  }

  @Post('profitability/tenders/:id/compute')
  @RequirePermissions('finance:write')
  computeProfitability(@TenantId() t: string, @Param('id') id: string, @Body('month') month: string) {
    return this.tenderProfitabilityService.computeProfitability(t, id, month ?? new Date().toISOString().slice(0, 7));
  }

  @Get('profitability/tenders/:id/costs')
  @RequirePermissions('finance:read')
  getCostEntries(@TenantId() t: string, @Param('id') id: string, @Query() q: any) {
    return this.tenderProfitabilityService.getCostEntries(t, id, q);
  }

  @Post('profitability/tenders/:id/costs')
  @RequirePermissions('finance:write')
  addCostEntry(@TenantId() t: string, @Param('id') id: string, @Body() dto: any, @CurrentUser('id') uid: string) {
    return this.tenderProfitabilityService.addCostEntry(t, { ...dto, tenderId: id }, uid);
  }

  @Post('profitability/compare')
  @RequirePermissions('finance:read')
  compareTenders(@TenantId() t: string, @Body() dto: { tenderIds: string[]; month: string }) {
    return this.tenderProfitabilityService.compareTenders(t, dto.tenderIds, dto.month);
  }

  // ── Revenue Management ───────────────────────────────────
  @Get('revenue/summary')
  @RequirePermissions('finance:read')
  getRevenueSummary(@TenantId() t: string, @Query() q: any) {
    return this.revenueService.getRevenueSummary(t, q);
  }

  @Get('revenue/schedules')
  @RequirePermissions('finance:read')
  getRevenueSchedules(@TenantId() t: string, @Query() q: any) {
    return this.revenueService.getRevenueSchedules(t, q);
  }

  @Post('revenue/schedules')
  @RequirePermissions('finance:write')
  createRevenueSchedule(@TenantId() t: string, @Body() dto: any) {
    return this.revenueService.createRevenueSchedule(t, dto);
  }

  @Patch('revenue/schedules/:id/recognize')
  @RequirePermissions('finance:write')
  recognizeRevenue(@TenantId() t: string, @Param('id') id: string) {
    return this.revenueService.recognizeRevenue(t, id);
  }

  @Patch('revenue/schedules/:id/defer')
  @RequirePermissions('finance:write')
  deferRevenue(@TenantId() t: string, @Param('id') id: string, @Body('reason') reason: string) {
    return this.revenueService.deferRevenue(t, id, reason);
  }

  @Get('revenue/monthly-chart')
  @RequirePermissions('finance:read')
  getMonthlyChart(@TenantId() t: string, @Query('months') months: string) {
    return this.revenueService.getMonthlyRevenueChart(t, months ? parseInt(months) : 12);
  }

  // ── Banking ─────────────────────────────────────────────
  @Get('banking/accounts')
  @RequirePermissions('finance:read')
  getBankingAccounts(@TenantId() t: string) {
    return this.bankingService.getBankAccounts(t);
  }

  @Post('banking/accounts/:id/import-statement')
  @RequirePermissions('finance:write')
  importStatement(@TenantId() t: string, @Param('id') id: string, @Body('lines') lines: any[]) {
    return this.bankingService.importStatement(t, id, lines);
  }

  @Get('banking/accounts/:id/unreconciled')
  @RequirePermissions('finance:read')
  getUnreconciledLines(@TenantId() t: string, @Param('id') id: string, @Query() q: any) {
    return this.bankingService.getUnreconciledLines(t, id, q);
  }

  @Patch('banking/lines/:lineId/reconcile')
  @RequirePermissions('finance:write')
  reconcileLine(@TenantId() t: string, @Param('lineId') lineId: string, @Body() dto: { voucherId: string; note?: string }) {
    return this.bankingService.reconcileLine(t, lineId, dto.voucherId, dto.note);
  }

  @Get('banking/accounts/:id/reconciliation-summary')
  @RequirePermissions('finance:read')
  getReconciliationSummary(@TenantId() t: string, @Param('id') id: string) {
    return this.bankingService.getReconciliationSummary(t, id);
  }
}
