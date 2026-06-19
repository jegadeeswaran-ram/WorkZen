import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { PrismaService } from '../common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findFirst({ where: { email, deletedAt: null } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Account is not active');
    return user;
  }

  async login(dto: LoginDto, ip: string) {
    const user = await this.validateUser(dto.email, dto.password);

    if (user.twoFaEnabled) {
      if (!dto.totpCode) return { requiresTwoFactor: true, userId: user.id };
      const valid = speakeasy.totp.verify({
        secret: user.twoFaSecret!,
        encoding: 'base32',
        token: dto.totpCode,
      });
      if (!valid) throw new UnauthorizedException('Invalid 2FA code');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
    });

    return this.generateTokens(user);
  }

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findFirst({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.companyName,
        slug: dto.companyName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
        status: 'TRIAL',
        plan: 'FREE',
      },
    });

    const user = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        passwordHash,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
    });

    const ownerRole = await this.prisma.role.findFirst({ where: { name: 'COMPANY_OWNER' } });
    if (ownerRole) {
      await this.prisma.userRole.create({ data: { userId: user.id, roleId: ownerRole.id } });
    }

    return this.generateTokens(user);
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) throw new UnauthorizedException('User not found');
    return this.generateTokens(user);
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { message: 'Logged out successfully' };
  }

  async setupTwoFactor(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const secret = speakeasy.generateSecret({ name: `WorkZen (${user.email})` });
    await this.prisma.user.update({ where: { id: userId }, data: { twoFaSecret: secret.base32 } });
    const qrDataUrl = await qrcode.toDataURL(secret.otpauth_url!);
    return { secret: secret.base32, qrDataUrl };
  }

  async confirmTwoFactor(userId: string, token: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = speakeasy.totp.verify({ secret: user.twoFaSecret!, encoding: 'base32', token });
    if (!valid) throw new BadRequestException('Invalid token');
    await this.prisma.user.update({ where: { id: userId }, data: { twoFaEnabled: true } });
    return { twoFaEnabled: true };
  }

  private async generateTokens(user: { id: string; tenantId: string; email: string }) {
    const payload = { sub: user.id, tenantId: user.tenantId, email: user.email };
    const accessToken = this.jwt.sign(payload);
    const refreshToken = await this.createRefreshToken(user.id);
    return { accessToken, refreshToken, userId: user.id, tenantId: user.tenantId };
  }

  private async createRefreshToken(userId: string) {
    const token = require('crypto').randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.prisma.refreshToken.create({ data: { userId, token, expiresAt } });
    return token;
  }

  async getMe(userId: string, _tenantId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        avatar: true, phone: true, tenantId: true, status: true,
        userRoles: {
          include: { role: { select: { name: true } } },
        },
      },
    });
  }

  async saveFcmToken(userId: string, token: string, device?: string) {
    // Store token on the latest refresh token record for this user/device
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { device: device ?? token.slice(0, 20) },
    });
    return { success: true };
  }
}
