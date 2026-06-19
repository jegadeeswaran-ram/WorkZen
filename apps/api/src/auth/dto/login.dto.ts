import { IsEmail, IsString, MinLength, IsOptional, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@company.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass@123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ description: '6-digit TOTP code for 2FA' })
  @IsOptional()
  @IsString()
  @Length(6, 6)
  totpCode?: string;
}
