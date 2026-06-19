import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../common/prisma/prisma.service';

const mockUser = {
  id: 'user-1',
  tenantId: 'tenant-1',
  email: 'admin@workzen.in',
  firstName: 'Admin',
  lastName: 'User',
  passwordHash: '$2a$12$hash',
  status: 'ACTIVE',
  twoFaEnabled: false,
  twoFaSecret: null,
  lastLoginAt: null,
  lastLoginIp: null,
  deletedAt: null,
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let jwt: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              findUniqueOrThrow: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            tenant: { create: jest.fn() },
            role: { findFirst: jest.fn() },
            userRole: { create: jest.fn() },
            refreshToken: {
              create: jest.fn(),
              findUnique: jest.fn(),
              updateMany: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('mock-access-token') },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('mock-value') },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    jwt = module.get(JwtService) as jest.Mocked<JwtService>;
  });

  describe('validateUser', () => {
    it('throws UnauthorizedException when user not found', async () => {
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(null);
      await expect(service.validateUser('x@x.com', 'pass')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      await expect(service.validateUser(mockUser.email, 'wrong')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user is not ACTIVE', async () => {
      const inactiveUser = { ...mockUser, status: 'INACTIVE' };
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(inactiveUser as any);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      await expect(service.validateUser(mockUser.email, 'pass')).rejects.toThrow(UnauthorizedException);
    });

    it('returns user when credentials are valid', async () => {
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      const result = await service.validateUser(mockUser.email, 'pass');
      expect(result).toEqual(mockUser);
    });
  });

  describe('logout', () => {
    it('revokes all refresh tokens and returns success message', async () => {
      jest.spyOn(prisma.refreshToken, 'updateMany').mockResolvedValue({ count: 2 } as any);
      const result = await service.logout('user-1');
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('register', () => {
    it('throws ConflictException if email already exists', async () => {
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any);
      await expect(
        service.register({
          email: mockUser.email,
          password: 'pass',
          firstName: 'A',
          lastName: 'B',
          companyName: 'Company',
          phone: '9999999999',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates tenant + user + role assignment on success', async () => {
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.tenant, 'create').mockResolvedValue({ id: 'tenant-new' } as any);
      jest.spyOn(prisma.user, 'create').mockResolvedValue(mockUser as any);
      jest.spyOn(prisma.role, 'findFirst').mockResolvedValue({ id: 'role-1' } as any);
      jest.spyOn(prisma.userRole, 'create').mockResolvedValue({} as any);
      jest.spyOn(prisma.refreshToken, 'create').mockResolvedValue({ token: 'tok' } as any);

      const result = await service.register({
        email: 'new@workzen.in',
        password: 'StrongPass@1',
        firstName: 'New',
        lastName: 'User',
        companyName: 'ACME',
        phone: '9876543210',
      });

      expect(prisma.tenant.create).toHaveBeenCalled();
      expect(prisma.user.create).toHaveBeenCalled();
      expect(prisma.userRole.create).toHaveBeenCalledWith({ data: { userId: mockUser.id, roleId: 'role-1' } });
      expect(result).toHaveProperty('accessToken');
    });
  });

  describe('refresh', () => {
    it('throws UnauthorizedException for invalid token', async () => {
      jest.spyOn(prisma.refreshToken, 'findUnique').mockResolvedValue(null);
      await expect(service.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for expired token', async () => {
      jest.spyOn(prisma.refreshToken, 'findUnique').mockResolvedValue({
        token: 'tok',
        revokedAt: null,
        expiresAt: new Date('2000-01-01'),
        userId: 'user-1',
      } as any);
      await expect(service.refresh('tok')).rejects.toThrow(UnauthorizedException);
    });

    it('returns new tokens for valid refresh token', async () => {
      jest.spyOn(prisma.refreshToken, 'findUnique').mockResolvedValue({
        token: 'tok',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
        userId: 'user-1',
      } as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prisma.refreshToken, 'create').mockResolvedValue({ token: 'new-tok' } as any);

      const result = await service.refresh('tok');
      expect(result).toHaveProperty('accessToken', 'mock-access-token');
    });
  });

  describe('confirmTwoFactor', () => {
    it('throws BadRequestException for invalid TOTP token', async () => {
      jest.spyOn(prisma.user, 'findUniqueOrThrow').mockResolvedValue({
        ...mockUser,
        twoFaSecret: 'SECRET',
      } as any);
      await expect(service.confirmTwoFactor('user-1', '000000')).rejects.toThrow(BadRequestException);
    });

    it('returns twoFaEnabled: true on success', async () => {
      const speakeasy = require('speakeasy');
      const secret = speakeasy.generateSecret();
      const validToken = speakeasy.totp({ secret: secret.base32, encoding: 'base32' });

      jest.spyOn(prisma.user, 'findUniqueOrThrow').mockResolvedValue({
        ...mockUser,
        twoFaSecret: secret.base32,
      } as any);
      jest.spyOn(prisma.user, 'update').mockResolvedValue({} as any);

      const result = await service.confirmTwoFactor('user-1', validToken);
      expect(result).toEqual({ twoFaEnabled: true });
    });
  });
});
