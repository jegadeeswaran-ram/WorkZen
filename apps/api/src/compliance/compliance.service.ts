import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { PaginationDto, paginate, buildPaginatedResponse } from '../common/dto/pagination.dto';
import { Logger } from '@nestjs/common';

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(private prisma: PrismaService) {}

  async getItems(tenantId: string, query: PaginationDto & { type?: string; status?: string }) {
    const { page = 1, limit = 20, type, status } = query;
    const where = { tenantId, ...(type && { type: type as any }), ...(status && { status: status as any }) };
    const [data, total] = await Promise.all([
      this.prisma.complianceItem.findMany({ where, orderBy: { dueDate: 'asc' }, ...paginate(page, limit) }),
      this.prisma.complianceItem.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async getCalendar(tenantId: string, month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return this.prisma.complianceItem.findMany({
      where: { tenantId, dueDate: { gte: start, lte: end } },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getDashboard(tenantId: string) {
    const today = new Date();
    const next30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const [overdue, upcoming, filed] = await Promise.all([
      this.prisma.complianceItem.count({ where: { tenantId, status: 'OVERDUE' } }),
      this.prisma.complianceItem.count({ where: { tenantId, status: 'PENDING', dueDate: { gte: today, lte: next30 } } }),
      this.prisma.complianceItem.count({ where: { tenantId, status: 'FILED' } }),
    ]);
    return { overdue, upcoming, filed };
  }

  async markFiled(tenantId: string, id: string, data: { challanNo?: string; filedDate: string; amount?: number }) {
    return this.prisma.complianceItem.update({
      where: { id },
      data: {
        status: 'FILED',
        challanNo: data.challanNo,
        filedDate: new Date(data.filedDate),
        amount: data.amount,
      },
    });
  }

  async getLicenses(tenantId: string) {
    return this.prisma.complianceLicense.findMany({
      where: { tenantId },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async createItem(tenantId: string, dto: {
    type: string;
    period: string;
    dueDate: string;
    amount?: number;
    notes?: string;
  }) {
    return this.prisma.complianceItem.create({
      data: {
        tenantId,
        type: dto.type as any,
        period: dto.period,
        dueDate: new Date(dto.dueDate),
        amount: dto.amount,
        notes: dto.notes,
        status: 'PENDING',
      },
    });
  }

  async createLicense(tenantId: string, dto: {
    type: string;
    licenseNo: string;
    issuedBy?: string;
    issuedDate?: string;
    expiryDate?: string;
  }) {
    return this.prisma.complianceLicense.create({
      data: {
        tenantId,
        type: dto.type,
        licenseNo: dto.licenseNo,
        issuedBy: dto.issuedBy,
        issuedDate: dto.issuedDate ? new Date(dto.issuedDate) : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        status: 'ACTIVE',
      },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkExpiringCompliance() {
    const now = new Date();
    const alertDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const overdue = await this.prisma.complianceItem.findMany({
      where: { status: 'PENDING', dueDate: { lt: now } },
    });
    await Promise.all(
      overdue.map((item) =>
        this.prisma.complianceItem.update({ where: { id: item.id }, data: { status: 'OVERDUE' } }),
      ),
    );
    this.logger.log(`Updated ${overdue.length} compliance items to OVERDUE`);
  }
}
