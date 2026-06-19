import { Controller, Post, Body, UseGuards, Get, Ip, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentUser, TenantId } from '../common/decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login with email + password (+ optional TOTP)' })
  login(@Body() dto: LoginDto, @Ip() ip: string) {
    return this.authService.login(dto, ip);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register new tenant + company owner' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Exchange refresh token for new access token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth()
  @HttpCode(200)
  logout(@CurrentUser('id') userId: string) {
    return this.authService.logout(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('2fa/setup')
  @ApiBearerAuth()
  setup2fa(@CurrentUser('id') userId: string) {
    return this.authService.setupTwoFactor(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/confirm')
  @ApiBearerAuth()
  confirm2fa(@CurrentUser('id') userId: string, @Body('token') token: string) {
    return this.authService.confirmTwoFactor(userId, token);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get('me')
  @ApiBearerAuth()
  getMe(@CurrentUser('id') userId: string, @TenantId() tenantId: string) {
    return this.authService.getMe(userId, tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('fcm-token')
  @ApiBearerAuth()
  @HttpCode(200)
  saveFcmToken(
    @CurrentUser('id') userId: string,
    @Body('token') token: string,
    @Body('device') device?: string,
  ) {
    return this.authService.saveFcmToken(userId, token, device);
  }
}
