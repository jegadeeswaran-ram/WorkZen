import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PaginationDto, paginate, buildPaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class PerformanceService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(tenantId: string) {
    const [totalReviews, pending, completed, totalGoals, activeGoals] = await Promise.all([
      this.prisma.performanceReview.count({ where: { tenantId } }),
      this.prisma.performanceReview.count({ where: { tenantId, status: { in: ['PENDING_SELF', 'PENDING_MANAGER', 'PENDING_HR'] } } }),
      this.prisma.performanceReview.count({ where: { tenantId, status: 'COMPLETED' } }),
      this.prisma.employeeGoal.count({ where: { tenantId } }),
      this.prisma.employeeGoal.count({ where: { tenantId, status: 'ACTIVE' } }),
    ]);
    const avgRating = await this.prisma.performanceReview.aggregate({ where: { tenantId, finalRating: { not: null } }, _avg: { finalRating: true } });
    return { totalReviews, pending, completed, totalGoals, activeGoals, avgRating: avgRating._avg.finalRating ?? 0 };
  }

  // Review Cycles
  async getCycles(tenantId: string) {
    return this.prisma.performanceReviewCycle.findMany({ where: { tenantId }, orderBy: { startDate: 'desc' } });
  }

  async createCycle(tenantId: string, dto: Record<string, unknown>, userId: string) {
    return this.prisma.performanceReviewCycle.create({ data: { ...dto, tenantId, createdBy: userId } as any });
  }

  async updateCycle(tenantId: string, id: string, dto: Record<string, unknown>) {
    return this.prisma.performanceReviewCycle.update({ where: { id }, data: dto as any });
  }

  // Goals
  async getGoals(tenantId: string, query: PaginationDto & { employeeId?: string; status?: string }) {
    const { page = 1, limit = 20, employeeId, status } = query;
    const where: any = { tenantId, ...(employeeId && { employeeId }), ...(status && { status }) };
    const [data, total] = await Promise.all([
      this.prisma.employeeGoal.findMany({ where, include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } }, orderBy: { createdAt: 'desc' }, ...paginate(page, limit) }),
      this.prisma.employeeGoal.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async createGoal(tenantId: string, dto: Record<string, unknown>, userId: string) {
    return this.prisma.employeeGoal.create({ data: { ...dto, tenantId, createdBy: userId } as any });
  }

  async updateGoal(tenantId: string, id: string, dto: Record<string, unknown>) {
    return this.prisma.employeeGoal.update({ where: { id }, data: dto as any });
  }

  // Reviews
  async getReviews(tenantId: string, query: PaginationDto & { employeeId?: string; cycleId?: string; status?: string }) {
    const { page = 1, limit = 20, employeeId, cycleId, status } = query;
    const where: any = { tenantId, ...(employeeId && { employeeId }), ...(cycleId && { cycleId }), ...(status && { status }) };
    const [data, total] = await Promise.all([
      this.prisma.performanceReview.findMany({ where, include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, designation: { select: { name: true } } } }, cycle: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, ...paginate(page, limit) }),
      this.prisma.performanceReview.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async createReview(tenantId: string, dto: Record<string, unknown>, userId: string) {
    return this.prisma.performanceReview.create({ data: { ...dto, tenantId, createdBy: userId } as any });
  }

  async updateReview(tenantId: string, id: string, dto: Record<string, unknown>) {
    const review = await this.prisma.performanceReview.findFirst({ where: { id, tenantId } });
    if (!review) throw new NotFoundException('Review not found');
    return this.prisma.performanceReview.update({ where: { id }, data: dto as any });
  }
}
