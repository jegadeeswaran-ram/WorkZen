import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { BillingSheetService } from './billing-sheet.service';
import { CollectionService } from './collection.service';
import { QuotationService } from './quotation.service';
import { NotificationsModule } from '../notifications/notifications.module';
@Module({
  imports: [NotificationsModule],
  controllers: [BillingController],
  providers: [BillingService, BillingSheetService, CollectionService, QuotationService],
})
export class BillingModule {}
