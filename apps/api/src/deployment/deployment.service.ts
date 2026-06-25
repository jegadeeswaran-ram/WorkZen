import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
          tender: { select: { id: true, tenderName: true } },
          site: { select: { id: true, name: true } },
          shift: { select: { id: true, name: true } },
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

  async getDeployment(tenantId: string, id: string) {
    const dep = await this.prisma.deployment.findFirst({
      where: { id, tenantId },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, designation: { select: { name: true } }, photo: true } },
        tender: { select: { id: true, tenderName: true } },
        site: { select: { id: true, name: true } },
        shift: { select: { id: true, name: true, startTime: true, endTime: true } },
      },
    });
    if (!dep) throw new NotFoundException('Deployment not found');
    return dep;
  }

  async updateDeployment(tenantId: string, id: string, dto: Record<string, unknown>) {
    const dep = await this.prisma.deployment.findFirst({ where: { id, tenantId } });
    if (!dep) throw new NotFoundException('Deployment not found');
    return this.prisma.deployment.update({ where: { id }, data: dto as any });
  }

  async deleteDeployment(tenantId: string, id: string) {
    const dep = await this.prisma.deployment.findFirst({ where: { id, tenantId } });
    if (!dep) throw new NotFoundException('Deployment not found');
    return this.prisma.deployment.delete({ where: { id } });
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

  async listSupervisors(tenantId: string) {
    return this.prisma.user.findMany({
      where: {
        tenantId,
        deletedAt: null,
        userRoles: {
          some: {
            role: { name: 'SITE_SUPERVISOR' },
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        supervisedSites: {
          where: { tenantId, isActive: true },
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  async getSiteTeam(tenantId: string, siteId: string) {
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, tenantId },
      select: { id: true, name: true, code: true, supervisor: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!site) throw new NotFoundException('Site not found');
    const data = await this.prisma.deployment.findMany({
      where: { tenantId, siteId, status: 'ACTIVE', deletedAt: null },
      include: {
        employee: {
          select: {
            id: true, firstName: true, lastName: true, employeeCode: true,
            personalPhone: true,
            designation: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
        shift: { select: { id: true, name: true, startTime: true, endTime: true } },
      },
      orderBy: { startDate: 'asc' },
    });
    return { data, meta: { siteId, siteName: site.name, supervisor: site.supervisor, total: data.length } };
  }

  async assignEmployeeToSite(tenantId: string, siteId: string, dto: { employeeId: string; shiftId?: string; startDate?: string }) {
    const site = await this.prisma.site.findFirst({ where: { id: siteId, tenantId } });
    if (!site) throw new NotFoundException('Site not found');
    // Check employee not already active at this site
    const existing = await this.prisma.deployment.findFirst({
      where: { tenantId, siteId, employeeId: dto.employeeId, status: 'ACTIVE' },
    });
    if (existing) throw new BadRequestException('Employee is already deployed to this site');
    return this.prisma.deployment.create({
      data: {
        tenantId,
        siteId,
        employeeId: dto.employeeId,
        shiftId: dto.shiftId ?? null,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        status: 'ACTIVE',
        reportingManager: site.supervisorId ?? undefined,
      } as any,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, designation: { select: { name: true } } } },
        shift: { select: { id: true, name: true } },
      },
    });
  }

  async removeEmployeeFromSite(tenantId: string, siteId: string, deploymentId: string) {
    const dep = await this.prisma.deployment.findFirst({
      where: { id: deploymentId, tenantId, siteId, status: 'ACTIVE' },
    });
    if (!dep) throw new NotFoundException('Active deployment not found');
    await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: 'COMPLETED', endDate: new Date() },
    });
    return { message: 'Employee removed from site' };
  }

  async assignSupervisor(tenantId: string, siteId: string, supervisorId: string | null) {
    const site = await this.prisma.site.findFirst({ where: { id: siteId, tenantId } });
    if (!site) throw new NotFoundException('Site not found');
    if (supervisorId) {
      const user = await this.prisma.user.findFirst({
        where: { id: supervisorId, tenantId, deletedAt: null, userRoles: { some: { role: { name: 'SITE_SUPERVISOR' } } } },
      });
      if (!user) throw new NotFoundException('Supervisor not found or does not have SITE_SUPERVISOR role');
    }
    return this.prisma.site.update({
      where: { id: siteId, tenantId },
      data: { supervisorId },
      include: { supervisor: { select: { id: true, firstName: true, lastName: true, email: true } } },
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
