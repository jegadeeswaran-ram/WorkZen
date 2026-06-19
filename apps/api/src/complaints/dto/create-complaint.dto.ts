import { IsString, IsEnum, IsOptional, IsNotEmpty } from 'class-validator';

export enum ComplaintCategory {
  LABOUR_HR = 'LABOUR_HR',
  SAFETY = 'SAFETY',
  OPERATIONS = 'OPERATIONS',
  COMPLIANCE = 'COMPLIANCE',
  CLIENT_SITE = 'CLIENT_SITE',
  RESOURCE = 'RESOURCE',
}

export enum ComplaintSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export class CreateComplaintDto {
  @IsString() @IsNotEmpty() siteId: string;
  @IsEnum(ComplaintCategory) category: ComplaintCategory;
  @IsEnum(ComplaintSeverity) @IsOptional() severity?: ComplaintSeverity;
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() description: string;
  @IsString() @IsOptional() assignedToId?: string;
  @IsOptional() attachments?: string[];
}
