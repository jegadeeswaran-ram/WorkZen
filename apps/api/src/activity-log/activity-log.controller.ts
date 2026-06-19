import { Controller, Get, Post, Body, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ActivityLogService } from './activity-log.service';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentUser, TenantId } from '../common/decorators/current-user.decorator';
import { memoryStorage } from 'multer';

@Controller('activity-log')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  async findAll(
    @TenantId() tenantId: string,
    @Query('siteId') siteId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const data = await this.activityLogService.findAll(tenantId, siteId, startDate, endDate);
    return { success: true, data, message: 'Activity logs fetched' };
  }

  @Get('today')
  async findToday(
    @TenantId() tenantId: string,
    @CurrentUser('id') supervisorId: string,
    @Query('siteId') siteId: string,
  ) {
    const data = await this.activityLogService.findToday(tenantId, supervisorId, siteId);
    return { success: true, data, message: "Today's log fetched" };
  }

  @Post()
  async upsert(
    @TenantId() tenantId: string,
    @CurrentUser('id') supervisorId: string,
    @Body() dto: CreateActivityLogDto,
  ) {
    const data = await this.activityLogService.upsert(tenantId, supervisorId, dto);
    return { success: true, data, message: 'Activity log saved' };
  }

  @Post('upload-photo')
  @UseInterceptors(FileInterceptor('photo', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadPhoto(
    @TenantId() tenantId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const url = await this.activityLogService.uploadPhoto(tenantId, file);
    return { success: true, data: { url }, message: 'Photo uploaded' };
  }
}
