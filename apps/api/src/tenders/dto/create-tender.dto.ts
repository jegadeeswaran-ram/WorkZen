import {
  IsString, IsOptional, IsNumber, IsDateString, IsEnum, IsArray, IsInt, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContractType, TenderStatus } from '@prisma/client';

export class CreateTenderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() tenderNumber?: string;
  @ApiProperty() @IsString() tenderName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() departmentId?: string;
  @ApiProperty() @IsNumber() tenderValue: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() bidDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() awardDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
  @ApiPropertyOptional({ enum: ContractType }) @IsOptional() @IsEnum(ContractType) contractType?: ContractType;
  @ApiPropertyOptional({ enum: TenderStatus }) @IsOptional() @IsEnum(TenderStatus) status?: TenderStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() workLocations?: string[];
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) requiredEmployees?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() emdAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() securityDeposit?: number;
}
