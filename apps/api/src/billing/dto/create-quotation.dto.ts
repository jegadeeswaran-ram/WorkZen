import { IsString, IsOptional, IsArray, IsNumber, IsDateString, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QuotationLineItemDto {
  @IsString() description: string;
  @IsOptional() @IsString() hsn?: string;
  @IsNumber() @Min(0) quantity: number;
  @IsNumber() @Min(0) rate: number;
  @IsNumber() @Min(0) taxRate: number;
}

export class CreateQuotationDto {
  @IsString() clientId: string;
  @IsOptional() @IsString() tenderId?: string;
  @IsDateString() issueDate: string;
  @IsDateString() validUntil: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() termsConditions?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => QuotationLineItemDto)
  lineItems: QuotationLineItemDto[];
}
