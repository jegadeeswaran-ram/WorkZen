import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CreateComplaintDto } from './create-complaint.dto';

export enum ComplaintStatus {
  OPEN = 'OPEN',
  IN_REVIEW = 'IN_REVIEW',
  ESCALATED = 'ESCALATED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export class UpdateComplaintDto extends PartialType(CreateComplaintDto) {
  @IsEnum(ComplaintStatus) @IsOptional() status?: ComplaintStatus;
  @IsString() @IsOptional() resolutionNote?: string;
  @IsString() @IsOptional() escalatedToId?: string;
}
