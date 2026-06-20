import { Controller, Get, Post, Patch, Body, Query, Param, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
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
  findAll(
    @TenantId() tenantId: string,
    @Query('siteId') siteId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.activityLogService.findAll(tenantId, siteId, startDate, endDate);
  }

  @Get('today')
  findToday(
    @TenantId() tenantId: string,
    @CurrentUser('id') supervisorId: string,
    @Query('siteId') siteId: string,
  ) {
    return this.activityLogService.findToday(tenantId, supervisorId, siteId);
  }

  @Post()
  upsert(
    @TenantId() tenantId: string,
    @CurrentUser('id') supervisorId: string,
    @Body() dto: CreateActivityLogDto,
  ) {
    return this.activityLogService.upsert(tenantId, supervisorId, dto);
  }

  @Patch(':id')
  partialUpdate(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateActivityLogDto,
  ) {
    return this.activityLogService.partialUpdate(tenantId, id, dto);
  }

  @Post('upload-photo')
  @UseInterceptors(FileInterceptor('photo', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadPhoto(
    @TenantId() tenantId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const url = await this.activityLogService.uploadPhoto(tenantId, file);
    // Return with meta so interceptor spreads rather than double-wraps
    return { data: { url }, meta: {} };
  }
}
