import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { paginate, buildPaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class VisitorsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalVisitors, todayCheckedIn, currentlyInside, blacklisted, recentLogs] =
      await Promise.all([
        this.prisma.visitor.count({ where: { tenantId } }),
        this.prisma.visitorLog.count({
          where: { tenantId, checkIn: { gte: today, lt: tomorrow } },
        }),
        this.prisma.visitorLog.count({
          where: { tenantId, checkOut: null, checkIn: { gte: today } },
        }),
        this.prisma.visitor.count({ where: { tenantId, isBlacklisted: true } }),
        this.prisma.visitorLog.findMany({
          where: { tenantId },
          include: {
            visitor: { select: { id: true, name: true, company: true, phone: true } },
            host: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { checkIn: 'desc' },
          take: 10,
        }),
      ]);

    return { totalVisitors, todayCheckedIn, currentlyInside, blacklisted, recentLogs };
  }

  // ── Visitors (master records) ─────────────────────────────────────
  async findVisitors(tenantId: string, query: any) {
    const { page = 1, limit = 15, search } = query;
    const where: any = { tenantId };
    if (search)
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];

    const [data, total] = await Promise.all([
      this.prisma.visitor.findMany({
        where,
        include: { _count: { select: { logs: true } } },
        orderBy: { createdAt: 'desc' },
        ...paginate(page, limit),
      }),
      this.prisma.visitor.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async findOrCreateVisitor(tenantId: string, dto: any) {
    const existing = await this.prisma.visitor.findFirst({
      where: { tenantId, phone: dto.phone },
    });
    if (existing) return existing;
    return this.prisma.visitor.create({ data: { ...dto, tenantId } });
  }

  async updateVisitor(tenantId: string, id: string, dto: any) {
    return this.prisma.visitor.update({ where: { id }, data: dto });
  }

  async toggleBlacklist(tenantId: string, id: string, blacklist: boolean, reason?: string) {
    return this.prisma.visitor.update({
      where: { id },
      data: { isBlacklisted: blacklist, blacklistReason: blacklist ? reason : null },
    });
  }

  // ── Visitor Logs ──────────────────────────────────────────────────
  async getLogs(tenantId: string, query: any) {
    const { page = 1, limit = 15, search, date, purposeCategory, status } = query;
    const where: any = { tenantId };
    if (purposeCategory) where.purposeCategory = purposeCategory;
    if (status === 'inside') where.checkOut = null;
    if (status === 'checked_out') where.checkOut = { not: null };
    if (date) {
      const d = new Date(date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where.checkIn = { gte: d, lt: next };
    }
    if (search)
      where.visitor = { OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ]};

    const [data, total] = await Promise.all([
      this.prisma.visitorLog.findMany({
        where,
        include: {
          visitor: { select: { id: true, name: true, company: true, phone: true, isBlacklisted: true } },
          host: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { checkIn: 'desc' },
        ...paginate(page, limit),
      }),
      this.prisma.visitorLog.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async checkIn(tenantId: string, userId: string, dto: any) {
    const { visitorData, ...logData } = dto;

    // Check blacklist
    const visitor = visitorData.id
      ? await this.prisma.visitor.findFirst({ where: { id: visitorData.id, tenantId } })
      : await this.findOrCreateVisitor(tenantId, visitorData);

    if (!visitor) throw new NotFoundException('Visitor not found');
    if (visitor.isBlacklisted)
      throw new BadRequestException(`Visitor is blacklisted: ${visitor.blacklistReason ?? 'No reason provided'}`);

    return this.prisma.visitorLog.create({
      data: {
        ...logData,
        tenantId,
        visitorId: visitor.id,
        checkIn: new Date(),
        createdBy: userId,
      },
      include: {
        visitor: true,
        host: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async checkOut(tenantId: string, logId: string) {
    const log = await this.prisma.visitorLog.findFirst({ where: { id: logId, tenantId } });
    if (!log) throw new NotFoundException('Log not found');
    if (log.checkOut) throw new BadRequestException('Visitor already checked out');
    return this.prisma.visitorLog.update({
      where: { id: logId },
      data: { checkOut: new Date() },
      include: { visitor: true },
    });
  }
}
