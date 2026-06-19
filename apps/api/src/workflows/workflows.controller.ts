import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentUser, TenantId } from '../common/decorators/current-user.decorator';
import { WorkflowsService } from './workflows.service';

@ApiTags('Workflows') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('workflows')
export class WorkflowsController {
  constructor(private service: WorkflowsService) {}

  @Get('definitions')
  getDefinitions(@TenantId() t: string) { return this.service.getDefinitions(t); }

  @Post(':id/start')
  start(@TenantId() t: string, @Param('id') id: string, @Body() body: any, @CurrentUser('id') uid: string) {
    return this.service.startWorkflow(t, id, body.entityType, body.entityId, uid);
  }

  @Get('my-approvals')
  getMyApprovals(@TenantId() t: string, @CurrentUser('id') uid: string) { return this.service.getMyPendingApprovals(t, uid); }

  @Post('approvals/:id/action')
  action(@TenantId() t: string, @Param('id') id: string, @Body() body: any, @CurrentUser('id') uid: string) {
    return this.service.action(t, id, uid, body.action, body.comments);
  }
}
