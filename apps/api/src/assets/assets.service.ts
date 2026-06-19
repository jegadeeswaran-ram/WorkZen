import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PaginationDto, paginate, buildPaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(tenantId: string) {
    const [total, available, assigned, underMaintenance] = await Promise.all([
      this.prisma.asset.count({ where: { tenantId } }),
      this.prisma.asset.count({ where: { tenantId, status: 'AVAILABLE' as any } }),
      this.prisma.asset.count({ where: { tenantId, status: 'ASSIGNED' as any } }),
      this.prisma.asset.count({ where: { tenantId, status: 'IN_REPAIR' as any } }),
    ]);
    return { total, available, assigned, underMaintenance };
  }

  async findAll(tenantId: string, query: PaginationDto & { category?: string; status?: string }) {
    const { page = 1, limit = 20, category, status, search } = query;
    const where = { tenantId, ...(category && { category: category as any }), ...(status && { status: status as any }), ...(search && { name: { contains: search, mode: 'insensitive' as const } }) };
    const [data, total] = await Promise.all([
      this.prisma.asset.findMany({ where, orderBy: { createdAt: 'desc' }, ...paginate(page, limit) }),
      this.prisma.asset.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async create(tenantId: string, dto: Record<string, unknown>, userId: string) {
    const count = await this.prisma.asset.count({ where: { tenantId } });
    const assetCode = `AST${String(count + 1).padStart(5, '0')}`;
    return this.prisma.asset.create({ data: { ...dto, tenantId, assetCode, createdBy: userId } as any });
  }

  async assignToEmployee(tenantId: string, assetId: string, employeeId: string, userId: string) {
    const asset = await this.prisma.asset.findFirst({ where: { id: assetId, tenantId } });
    if (!asset) throw new NotFoundException('Asset not found');
    const assignment = await this.prisma.assetAssignment.create({
      data: { tenantId, assetId, employeeId, issuedDate: new Date(), createdBy: userId } as any,
    });
    await this.prisma.asset.update({ where: { id: assetId }, data: { status: 'ASSIGNED', available: { decrement: 1 } } });
    return assignment;
  }

  async returnAsset(tenantId: string, assignmentId: string, notes?: string) {
    const assignment = await this.prisma.assetAssignment.findFirst({ where: { id: assignmentId, tenantId } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    await this.prisma.assetAssignment.update({ where: { id: assignmentId }, data: { isReturned: true, returnDate: new Date(), notes } });
    await this.prisma.asset.update({ where: { id: assignment.assetId }, data: { available: { increment: 1 } } });
    return { success: true };
  }

  async getEmployeeAssets(tenantId: string, employeeId: string) {
    return this.prisma.assetAssignment.findMany({
      where: { tenantId, employeeId, isReturned: false },
      include: { asset: true },
    });
  }
}
