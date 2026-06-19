import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PaginationDto, paginate, buildPaginatedResponse } from '../common/dto/pagination.dto';
import { CreateTenderDto } from './dto/create-tender.dto';
import { UpdateTenderDto } from './dto/update-tender.dto';
import { TenderStatus } from '@prisma/client';

@Injectable()
export class TendersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: PaginationDto & { status?: TenderStatus }) {
    const { page = 1, limit = 20, search, status } = query;
    const where = {
      tenantId,
      ...(status && { status }),
      ...(search && {
        OR: [
          { tenderNumber: { contains: search, mode: 'insensitive' as const } },
          { tenderName: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };
    const [data, total] = await Promise.all([
      this.prisma.tender.findMany({
        where,
        include: { department: { select: { id: true, name: true } }, _count: { select: { deployments: true } } },
        orderBy: { createdAt: 'desc' },
        ...paginate(page, limit),
      }),
      this.prisma.tender.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const tender = await this.prisma.tender.findFirst({
      where: { id, tenantId },
      include: {
        department: true,
        workOrders: true,
        deployments: { include: { employee: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });
    if (!tender) throw new NotFoundException('Tender not found');
    return tender;
  }

  async create(tenantId: string, dto: CreateTenderDto, userId: string) {
    if (!dto.tenderNumber) {
      const count = await this.prisma.tender.count({ where: { tenantId } });
      (dto as any).tenderNumber = `TND${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    }
    return this.prisma.tender.create({
      data: { ...dto, tenantId, createdBy: userId } as any,
    });
  }

  async update(tenantId: string, id: string, dto: UpdateTenderDto, userId: string) {
    await this.findOne(tenantId, id);
    return this.prisma.tender.update({
      where: { id },
      data: { ...dto, updatedBy: userId },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.tender.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async getDashboard(tenantId: string) {
    const [active, expired, upcoming] = await Promise.all([
      this.prisma.tender.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.tender.count({ where: { tenantId, status: 'EXPIRED' } }),
      this.prisma.tender.count({
        where: {
          tenantId, status: 'ACTIVE',
          endDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);
    return { active, expired, upcoming };
  }
}
