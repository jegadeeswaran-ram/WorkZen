import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../common/decorators/current-user.decorator';
import { DocumentsService } from './documents.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Documents') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RbacGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private service: DocumentsService) {}

  @Get() @RequirePermissions('document:read')
  findAll(@TenantId() t: string, @Query() q: PaginationDto) { return this.service.findAll(t, q); }

  @Post('upload-url') @RequirePermissions('document:write')
  getUploadUrl(@TenantId() t: string, @Body() body: { fileName: string; contentType: string }) {
    return this.service.getSignedUploadUrl(t, body.fileName, body.contentType);
  }

  @Post() @RequirePermissions('document:write')
  create(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) { return this.service.create(t, dto, uid); }

  @Get(':id/download-url') @RequirePermissions('document:read')
  getDownloadUrl(@TenantId() t: string, @Param('id') id: string) { return this.service.getDownloadUrl(t, id); }

  @Delete(':id') @RequirePermissions('document:delete')
  remove(@TenantId() t: string, @Param('id') id: string) { return this.service.remove(t, id); }
}
