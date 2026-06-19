import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PaginationDto, paginate, buildPaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class DeploymentService {
  constructor(private prisma: PrismaService) {}

  async getDeployments(tenantId: string, query: PaginationDto & { tenderId?: string; siteId?: string; status?: string }) {
    const { page = 1, limit = 20, tenderId, siteId, status } = query;
    const where = { tenantId, ...(tenderId && { tenderId }), ...(siteId && { siteId }), ...(status && { status: status as any }) };
    const [data, total] = await Promise.all([
      this.prisma.deployment.findMany({
        where,
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, designation: { select: { name: true } } } },
          tender: { select: { tenderName: true } },
          site: { select: { name: true } },
          shift: { select: { name: true } },
        },
        orderBy: { startDate: 'desc' },
        ...paginate(page, limit),
      }),
      this.prisma.deployment.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async createDeployment(tenantId: string, dto: Record<string, unknown>, userId: string) {
    return this.prisma.deployment.create({ data: { ...dto, tenantId, createdBy: userId } as any });
  }

  async endDeployment(tenantId: string, id: string, endDate: string) {
    const dep = await this.prisma.deployment.findFirst({ where: { id, tenantId } });
    if (!dep) throw new NotFoundException('Deployment not found');
    return this.prisma.deployment.update({
      where: { id },
      data: { status: 'COMPLETED', endDate: new Date(endDate) },
    });
  }

  async getSites(tenantId: string) {
    return this.prisma.site.findMany({
      where: { tenantId, isActive: true },
      include: { supervisor: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createSite(tenantId: string, dto: Record<string, unknown>, _userId: string) {
    return this.prisma.site.create({
      data: { ...dto, tenantId } as any,
    });
  }

  async updateSite(tenantId: string, id: string, dto: Record<string, unknown>) {
    return this.prisma.site.update({ where: { id }, data: dto as any });
  }

  async getShifts(tenantId: string) {
    return this.prisma.shift.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createShift(tenantId: string, dto: Record<string, unknown>) {
    return this.prisma.shift.create({ data: { ...dto, tenantId } as any });
  }

  async getSupervisorTeam(tenantId: string, userId: string) {
    const site = await this.prisma.site.findFirst({ where: { tenantId, supervisorId: userId, isActive: true } });
    if (!site) return { success: true, data: [], message: 'No site assigned to this supervisor' };
    const data = await this.prisma.deployment.findMany({
      where: { tenantId, siteId: site.id, status: 'ACTIVE' },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, personalPhone: true, designation: { select: { name: true } } } },
        shift: { select: { name: true, startTime: true, endTime: true } },
      },
      orderBy: { startDate: 'asc' },
    });
    return { success: true, data, message: 'Team fetched', meta: { siteId: site.id, siteName: site.name } };
  }

  async getStrength(tenantId: string, tenderId: string) {
    const deployments = await this.prisma.deployment.groupBy({
      by: ['siteId'],
      where: { tenantId, tenderId, status: 'ACTIVE' },
      _count: { employeeId: true },
    });
    return deployments;
  }
}
