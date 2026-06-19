import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'attendance' })],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
