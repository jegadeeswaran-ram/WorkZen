import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../common/decorators/current-user.decorator';
import { TrainingService } from './training.service';

@ApiTags('Training') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RbacGuard)
@Controller('training')
export class TrainingController {
  constructor(private service: TrainingService) {}

  @Get('dashboard') @RequirePermissions('training:read')
  getDashboard(@TenantId() t: string) { return this.service.getDashboard(t); }

  @Get('programs') @RequirePermissions('training:read')
  getPrograms(@TenantId() t: string, @Query() q: any) { return this.service.getPrograms(t, q); }

  @Post('programs') @RequirePermissions('training:write')
  createProgram(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.createProgram(t, dto, uid); }

  @Patch('programs/:id') @RequirePermissions('training:write')
  updateProgram(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) { return this.service.updateProgram(t, id, dto); }

  @Get('sessions') @RequirePermissions('training:read')
  getSessions(@TenantId() t: string, @Query() q: any) { return this.service.getSessions(t, q); }

  @Post('sessions') @RequirePermissions('training:write')
  createSession(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.createSession(t, dto, uid); }

  @Patch('sessions/:id') @RequirePermissions('training:write')
  updateSession(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) { return this.service.updateSession(t, id, dto); }

  @Get('enrollments') @RequirePermissions('training:read')
  getEnrollments(@TenantId() t: string, @Query() q: any) { return this.service.getEmployeeTrainings(t, q); }

  @Post('enrollments') @RequirePermissions('training:write')
  assign(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.assignTraining(t, dto, uid); }

  @Patch('enrollments/:id') @RequirePermissions('training:write')
  updateEnrollment(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) { return this.service.updateTraining(t, id, dto); }

  @Get('certificates') @RequirePermissions('training:read')
  getCertificates(@TenantId() t: string, @Query() q: any) { return this.service.getCertificates(t, q); }

  @Post('certificates') @RequirePermissions('training:write')
  issueCertificate(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.issueCertificate(t, dto, uid); }
}
