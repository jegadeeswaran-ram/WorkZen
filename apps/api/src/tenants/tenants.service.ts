import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id }, include: { organizations: true } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async update(id: string, dto: Record<string, unknown>) {
    return this.prisma.tenant.update({ where: { id }, data: dto as any });
  }

  async getSettings(tenantId: string) {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true, domain: true, logo: true, status: true, plan: true, maxUsers: true, maxEmployees: true, settings: true, createdAt: true },
    });
  }

  async updateSettings(tenantId: string, dto: Record<string, unknown>) {
    const { name, settings } = dto as any;
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { ...(name && { name }), ...(settings && { settings: settings as Prisma.InputJsonValue }) },
    });
  }

  async getAuditLogs(tenantId: string, query: { page: number; limit: number; resource?: string }) {
    const { page = 1, limit = 20, resource } = query;
    const where = { tenantId, ...(resource && { resource }) };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit,
        include: { user: { select: { firstName: true, lastName: true, email: true } } } }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
