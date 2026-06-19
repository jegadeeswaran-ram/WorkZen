import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../common/decorators/current-user.decorator';
import { RecruitmentService } from './recruitment.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Recruitment') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RbacGuard)
@Controller('recruitment')
export class RecruitmentController {
  constructor(private service: RecruitmentService) {}

  @Get('dashboard') @RequirePermissions('recruitment:read')
  getDashboard(@TenantId() t: string) { return this.service.getDashboard(t); }

  // Requisitions
  @Get('requisitions') @RequirePermissions('recruitment:read')
  getRequisitions(@TenantId() t: string, @Query() q: any) { return this.service.getRequisitions(t, q); }

  @Post('requisitions') @RequirePermissions('recruitment:write')
  createRequisition(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.createRequisition(t, dto, uid); }

  @Patch('requisitions/:id') @RequirePermissions('recruitment:write')
  updateRequisition(@TenantId() t: string, @Param('id') id: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.updateRequisition(t, id, dto, uid); }

  // Candidates
  @Get('candidates') @RequirePermissions('recruitment:read')
  getAllCandidates(@TenantId() t: string, @Query() q: any) { return this.service.getAllCandidates(t, q); }

  @Get('candidates/:id') @RequirePermissions('recruitment:read')
  getCandidate(@TenantId() t: string, @Param('id') id: string) { return this.service.getCandidate(t, id); }

  @Get('requisitions/:id/candidates') @RequirePermissions('recruitment:read')
  getCandidates(@TenantId() t: string, @Param('id') id: string, @Query() q: PaginationDto) { return this.service.getCandidates(t, id, q); }

  @Post('requisitions/:id/candidates') @RequirePermissions('recruitment:write')
  addCandidate(@TenantId() t: string, @Param('id') id: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.addCandidate(t, id, dto, uid); }

  @Patch('candidates/:id/status') @RequirePermissions('recruitment:write')
  updateStatus(@TenantId() t: string, @Param('id') id: string, @Body('status') status: string) { return this.service.updateCandidateStatus(t, id, status); }

  // Interviews
  @Post('candidates/:id/interviews') @RequirePermissions('recruitment:write')
  scheduleInterview(@TenantId() t: string, @Param('id') id: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.scheduleInterview(t, id, dto, uid); }

  @Patch('interviews/:id') @RequirePermissions('recruitment:write')
  updateInterview(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) { return this.service.updateInterview(t, id, dto); }

  @Post('interviews/:id/feedback') @RequirePermissions('recruitment:write')
  submitFeedback(@TenantId() t: string, @Param('id') id: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.submitInterviewFeedback(t, id, dto, uid); }

  // Assessments
  @Get('candidates/:id/assessments') @RequirePermissions('recruitment:read')
  getAssessments(@TenantId() t: string, @Param('id') id: string) { return this.service.getAssessments(t, id); }

  @Post('candidates/:id/assessments') @RequirePermissions('recruitment:write')
  createAssessment(@TenantId() t: string, @Param('id') id: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.createAssessment(t, id, dto, uid); }

  @Patch('assessments/:id') @RequirePermissions('recruitment:write')
  updateAssessment(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) { return this.service.updateAssessment(t, id, dto); }

  // Offer Letters
  @Get('offers') @RequirePermissions('recruitment:read')
  getOffers(@TenantId() t: string, @Query() q: any) { return this.service.getOffers(t, q); }

  @Post('offers') @RequirePermissions('recruitment:write')
  createOffer(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.createOffer(t, dto, uid); }

  @Patch('offers/:id/status') @RequirePermissions('recruitment:write')
  updateOfferStatus(@TenantId() t: string, @Param('id') id: string, @Body('status') status: string) { return this.service.updateOfferStatus(t, id, status); }

  // Onboarding
  @Get('onboarding') @RequirePermissions('recruitment:read')
  getOnboardings(@TenantId() t: string, @Query() q: any) { return this.service.getOnboardings(t, q); }

  @Post('onboarding') @RequirePermissions('recruitment:write')
  createOnboarding(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.createOnboarding(t, dto, uid); }

  @Patch('onboarding/:id') @RequirePermissions('recruitment:write')
  updateOnboarding(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) { return this.service.updateOnboarding(t, id, dto); }
}
