import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true, lastLoginAt: true, createdAt: true,
        userRoles: { include: { role: { select: { id: true, name: true, displayName: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async invite(tenantId: string, dto: { email: string; firstName: string; lastName: string; roleId: string }) {
    const exists = await this.prisma.user.findFirst({ where: { tenantId, email: dto.email } });
    if (exists) throw new ConflictException('User with this email already exists');
    const passwordHash = await bcrypt.hash('Workzen@123!', 12);
    const user = await this.prisma.user.create({
      data: { tenantId, email: dto.email, firstName: dto.firstName, lastName: dto.lastName, passwordHash, status: 'ACTIVE', emailVerifiedAt: new Date() },
    });
    if (dto.roleId) {
      await this.prisma.userRole.create({ data: { userId: user.id, roleId: dto.roleId } });
    }
    return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, status: user.status };
  }

  async findOne(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      include: { userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } } },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(tenantId: string, id: string, dto: { firstName?: string; lastName?: string; phone?: string }) {
    await this.findOne(tenantId, id);
    return this.prisma.user.update({ where: { id }, data: dto });
  }

  async changePassword(id: string, newPassword: string) {
    const hash = await bcrypt.hash(newPassword, 12);
    return this.prisma.user.update({ where: { id }, data: { passwordHash: hash } });
  }

  async assignRole(tenantId: string, userId: string, roleId: string) {
    await this.prisma.userRole.deleteMany({ where: { userId } });
    return this.prisma.userRole.create({ data: { userId, roleId } });
  }

  async getRoles(tenantId: string) {
    return this.prisma.role.findMany({ where: { OR: [{ tenantId }, { isSystem: true }] } });
  }

  // ── ROLES ────────────────────────────────────────────
  async listRoles(tenantId: string) {
    const roles = await this.prisma.role.findMany({
      where: { OR: [{ tenantId }, { isSystem: true }] },
      include: { rolePermissions: { include: { permission: true } } },
      orderBy: { name: 'asc' },
    });
    return roles.map(r => ({
      ...r,
      permissions: r.rolePermissions.map(rp => rp.permission),
    }));
  }

  async getRole(tenantId: string, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, OR: [{ tenantId }, { isSystem: true }] },
      include: { rolePermissions: { include: { permission: true } } },
    });
    if (!role) throw new NotFoundException('Role not found');
    return { ...role, permissions: role.rolePermissions.map(rp => rp.permission) };
  }

  async createRole(tenantId: string, dto: { name: string; displayName: string; description?: string }, userId: string) {
    return this.prisma.role.create({
      data: { tenantId, name: dto.name, displayName: dto.displayName, description: dto.description, isSystem: false },
    });
  }

  async updateRole(tenantId: string, id: string, dto: { displayName?: string; description?: string }) {
    const role = await this.prisma.role.findFirst({ where: { id, tenantId } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new BadRequestException('Cannot modify system roles');
    return this.prisma.role.update({ where: { id }, data: dto });
  }

  async setRolePermissions(tenantId: string, roleId: string, permissionIds: string[]) {
    const role = await this.prisma.role.findFirst({ where: { id: roleId, OR: [{ tenantId }, { isSystem: true }] } });
    if (!role) throw new NotFoundException('Role not found');
    await this.prisma.rolePermission.deleteMany({ where: { roleId } });
    if (permissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissionIds.map(permissionId => ({ roleId, permissionId })),
        skipDuplicates: true,
      });
    }
    return this.getRole(tenantId, roleId);
  }

  async listAllPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ resource: 'asc' }, { action: 'asc' }] });
  }

  async listUsers(tenantId: string, query: { search?: string; role?: string; page?: number; limit?: number }) {
    const { search, role, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const where = {
      tenantId,
      deletedAt: null,
      ...(search && { OR: [{ firstName: { contains: search, mode: 'insensitive' as const } }, { lastName: { contains: search, mode: 'insensitive' as const } }, { email: { contains: search, mode: 'insensitive' as const } }] }),
    };
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true, createdAt: true, lastLoginAt: true, userRoles: { include: { role: { select: { id: true, name: true, displayName: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data: users, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async setUserRoles(tenantId: string, userId: string, roleIds: string[]) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.userRole.deleteMany({ where: { userId } });
    if (roleIds.length > 0) {
      await this.prisma.userRole.createMany({ data: roleIds.map(roleId => ({ userId, roleId })), skipDuplicates: true });
    }
    return this.getUser(tenantId, userId);
  }

  async getUser(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
