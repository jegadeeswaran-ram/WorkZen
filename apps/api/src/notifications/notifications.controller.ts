import { Controller, Get, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentUser, TenantId } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  getList(
    @TenantId() t: string,
    @CurrentUser('id') uid: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getList(t, uid, limit ? Number(limit) : 20);
  }

  @Get('unread')
  getUnread(@TenantId() t: string, @CurrentUser('id') uid: string) {
    return this.service.getUnread(t, uid);
  }

  @Patch('mark-read')
  markRead(@TenantId() t: string, @CurrentUser('id') uid: string, @Body('ids') ids: string[]) {
    return this.service.markRead(t, uid, ids);
  }

  @Patch('mark-all-read')
  markAllRead(@TenantId() t: string, @CurrentUser('id') uid: string) {
    return this.service.markAllRead(t, uid);
  }
}
