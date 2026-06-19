import { IsString, IsInt, IsBoolean, IsOptional, IsNotEmpty, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateActivityLogDto {
  @IsString() @IsNotEmpty() siteId: string;
  @IsDateString() @IsOptional() logDate?: string;
  @IsString() @IsNotEmpty() workDone: string;
  @IsInt() @Min(0) @Type(() => Number) headcount: number;
  @IsBoolean() @IsOptional() hasIncident?: boolean;
  @IsString() @IsOptional() incidentType?: string;
  @IsString() @IsOptional() incidentDesc?: string;
  @IsOptional() photoUrls?: string[];
}
