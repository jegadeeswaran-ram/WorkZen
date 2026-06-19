import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService) {}

  // ── ZONES ──────────────────────────────────────────────
  async listZones(tenantId: string) {
    return this.prisma.zone.findMany({ where: { tenantId }, include: { regions: { include: { branches: true } } }, orderBy: { name: 'asc' } });
  }
  async createZone(tenantId: string, dto: { name: string; code?: string }, userId: string) {
    return this.prisma.zone.create({ data: { tenantId, name: dto.name, code: dto.code, createdBy: userId } });
  }
  async updateZone(tenantId: string, id: string, dto: Record<string, unknown>) {
    const z = await this.prisma.zone.findFirst({ where: { id, tenantId } });
    if (!z) throw new NotFoundException('Zone not found');
    return this.prisma.zone.update({ where: { id }, data: dto as any });
  }
  async deleteZone(tenantId: string, id: string) {
    const z = await this.prisma.zone.findFirst({ where: { id, tenantId } });
    if (!z) throw new NotFoundException('Zone not found');
    return this.prisma.zone.delete({ where: { id } });
  }

  // ── REGIONS ────────────────────────────────────────────
  async listRegions(tenantId: string) {
    return this.prisma.region.findMany({ where: { tenantId }, include: { zone: true, branches: true }, orderBy: { name: 'asc' } });
  }
  async createRegion(tenantId: string, dto: { name: string; code?: string; zoneId?: string }, userId: string) {
    return this.prisma.region.create({ data: { tenantId, name: dto.name, code: dto.code, zoneId: dto.zoneId, createdBy: userId } });
  }
  async updateRegion(tenantId: string, id: string, dto: Record<string, unknown>) {
    const r = await this.prisma.region.findFirst({ where: { id, tenantId } });
    if (!r) throw new NotFoundException('Region not found');
    return this.prisma.region.update({ where: { id }, data: dto as any });
  }
  async deleteRegion(tenantId: string, id: string) {
    const r = await this.prisma.region.findFirst({ where: { id, tenantId } });
    if (!r) throw new NotFoundException('Region not found');
    return this.prisma.region.delete({ where: { id } });
  }

  // ── BRANCHES ───────────────────────────────────────────
  async listBranches(tenantId: string) {
    return this.prisma.branch.findMany({ where: { tenantId, isActive: true }, include: { region: { include: { zone: true } }, _count: { select: { employees: true } } }, orderBy: { name: 'asc' } });
  }
  async createBranch(tenantId: string, dto: { code: string; name: string; gstin?: string; pan?: string; address?: Record<string, unknown>; phone?: string; email?: string; regionId?: string; managerId?: string }, userId: string) {
    return this.prisma.branch.create({ data: { tenantId, code: dto.code, name: dto.name, gstin: dto.gstin, pan: dto.pan, address: (dto.address ?? {}) as any, phone: dto.phone, email: dto.email, regionId: dto.regionId, managerId: dto.managerId, createdBy: userId } });
  }
  async updateBranch(tenantId: string, id: string, dto: Record<string, unknown>) {
    const b = await this.prisma.branch.findFirst({ where: { id, tenantId } });
    if (!b) throw new NotFoundException('Branch not found');
    return this.prisma.branch.update({ where: { id }, data: dto as any });
  }
  async deleteBranch(tenantId: string, id: string) {
    const b = await this.prisma.branch.findFirst({ where: { id, tenantId } });
    if (!b) throw new NotFoundException('Branch not found');
    return this.prisma.branch.update({ where: { id }, data: { isActive: false } });
  }

  // ── ANNOUNCEMENTS ──────────────────────────────────────
  async listAnnouncements(tenantId: string, publishedOnly = false) {
    const where: any = { tenantId };
    if (publishedOnly) where.isPublished = true;
    return this.prisma.announcement.findMany({ where, orderBy: { createdAt: 'desc' } });
  }
  async createAnnouncement(tenantId: string, dto: { title: string; body: string; type?: string; targetAudience?: string[]; publishAt?: string; expiresAt?: string; isPublished?: boolean }, userId: string) {
    return this.prisma.announcement.create({ data: { tenantId, title: dto.title, body: dto.body, type: (dto.type ?? 'COMPANY_NEWS') as any, targetAudience: dto.targetAudience ?? [], publishAt: dto.publishAt ? new Date(dto.publishAt) : undefined, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined, isPublished: dto.isPublished ?? false, createdBy: userId } });
  }
  async updateAnnouncement(tenantId: string, id: string, dto: Record<string, unknown>) {
    const a = await this.prisma.announcement.findFirst({ where: { id, tenantId } });
    if (!a) throw new NotFoundException('Announcement not found');
    const data: any = { ...dto };
    if (data.publishAt) data.publishAt = new Date(data.publishAt);
    if (data.expiresAt) data.expiresAt = new Date(data.expiresAt);
    return this.prisma.announcement.update({ where: { id }, data });
  }
  async deleteAnnouncement(tenantId: string, id: string) {
    const a = await this.prisma.announcement.findFirst({ where: { id, tenantId } });
    if (!a) throw new NotFoundException('Announcement not found');
    return this.prisma.announcement.delete({ where: { id } });
  }
  async publishAnnouncement(tenantId: string, id: string) {
    const a = await this.prisma.announcement.findFirst({ where: { id, tenantId } });
    if (!a) throw new NotFoundException('Announcement not found');
    return this.prisma.announcement.update({ where: { id }, data: { isPublished: true, publishAt: new Date() } });
  }

  // ── AWARDS ─────────────────────────────────────────────
  async listAwards(tenantId: string, params: { employeeId?: string; year?: number }) {
    const where: any = { tenantId };
    if (params.employeeId) where.employeeId = params.employeeId;
    if (params.year) where.year = params.year;
    return this.prisma.employeeAward.findMany({ where, include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } }, orderBy: { createdAt: 'desc' } });
  }
  async createAward(tenantId: string, dto: { employeeId: string; awardType: string; title?: string; month?: number; year: number; description?: string }, userId: string) {
    return this.prisma.employeeAward.create({ data: { tenantId, employeeId: dto.employeeId, awardType: (dto.awardType ?? 'CUSTOM') as any, title: dto.title, month: dto.month, year: dto.year, description: dto.description, givenBy: userId } });
  }
  async deleteAward(tenantId: string, id: string) {
    const a = await this.prisma.employeeAward.findFirst({ where: { id, tenantId } });
    if (!a) throw new NotFoundException('Award not found');
    return this.prisma.employeeAward.delete({ where: { id } });
  }

  // ── ORG TREE ───────────────────────────────────────────
  async getOrgTree(tenantId: string) {
    const [zones, regions, branches] = await Promise.all([
      this.prisma.zone.findMany({ where: { tenantId } }),
      this.prisma.region.findMany({ where: { tenantId } }),
      this.prisma.branch.findMany({ where: { tenantId, isActive: true }, include: { _count: { select: { employees: true } } } }),
    ]);
    return { zones, regions, branches };
  }
}
