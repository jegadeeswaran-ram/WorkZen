import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { PayrollProcessor } from './payroll.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'payroll' })],
  controllers: [PayrollController],
  providers: [PayrollService, PayrollProcessor],
})
export class PayrollModule {}
