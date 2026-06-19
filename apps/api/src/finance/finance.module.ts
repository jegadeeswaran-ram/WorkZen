import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
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
@Module({ controllers: [FinanceController], providers: [FinanceService, GSTService, RateService, ARService, CostCenterService, VoucherService, StatementsService, TenderProfitabilityService, RevenueService, BankingService] })
export class FinanceModule {}
