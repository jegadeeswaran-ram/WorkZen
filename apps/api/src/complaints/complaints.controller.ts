import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentUser, TenantId } from '../common/decorators/current-user.decorator';

@Controller('complaints')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Get()
  async findAll(@TenantId() tenantId: string, @Query('siteId') siteId?: string) {
    const data = await this.complaintsService.findAll(tenantId, siteId);
    return { success: true, data, message: 'Complaints fetched' };
  }

  @Get(':id')
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.complaintsService.findOne(tenantId, id);
    return { success: true, data, message: 'Complaint fetched' };
  }

  @Post()
  async create(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateComplaintDto,
  ) {
    const data = await this.complaintsService.create(tenantId, userId, dto);
    return { success: true, data, message: 'Complaint created' };
  }

  @Patch(':id')
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateComplaintDto,
  ) {
    const data = await this.complaintsService.update(tenantId, id, dto);
    return { success: true, data, message: 'Complaint updated' };
  }

  @Delete(':id')
  async remove(@TenantId() tenantId: string, @Param('id') id: string) {
    await this.complaintsService.remove(tenantId, id);
    return { success: true, data: null, message: 'Complaint deleted' };
  }
}
