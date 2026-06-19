import { IsString, IsInt, IsBoolean, IsOptional, IsNotEmpty, IsDateString, Min, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateActivityLogDto {
  @IsString() @IsNotEmpty() siteId: string;
  @IsDateString() @IsOptional() logDate?: string;
  @IsString() @IsNotEmpty() workDone: string;
  @IsInt() @Min(0) @Type(() => Number) headcount: number;
  @IsBoolean() @IsOptional() hasIncident?: boolean;
  @IsString() @IsOptional() incidentType?: string;
  @IsString() @IsOptional() incidentDesc?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) photoUrls?: string[];
}
