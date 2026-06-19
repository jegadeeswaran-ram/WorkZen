import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
@Module({
  imports: [BullModule.registerQueue({ name: 'reports' })],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
