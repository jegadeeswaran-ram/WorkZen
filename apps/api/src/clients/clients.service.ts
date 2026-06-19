import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PaginationDto, paginate, buildPaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: PaginationDto) {
    const { page = 1, limit = 20, search } = query;
    const where = {
      tenantId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { clientCode: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };
    const [data, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        include: { _count: { select: { tenders: true, contacts: true } } },
        orderBy: { name: 'asc' },
        ...paginate(page, limit),
      }),
      this.prisma.client.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, tenantId },
      include: { contacts: true, tenders: { select: { id: true, tenderName: true, status: true } } },
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async create(tenantId: string, dto: Record<string, unknown>, userId: string) {
    const code = `CLT${Date.now()}`;
    return this.prisma.client.create({ data: { ...dto, tenantId, clientCode: code, createdBy: userId } as any });
  }

  async update(tenantId: string, id: string, dto: Record<string, unknown>, userId: string) {
    await this.findOne(tenantId, id);
    return this.prisma.client.update({ where: { id }, data: { ...dto, updatedBy: userId } as any });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.client.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // ── Contacts ──────────────────────────────────────────────────────────────

  async listContacts(tenantId: string, clientId: string) {
    return this.prisma.clientContact.findMany({
      where: { tenantId, clientId },
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    });
  }

  async listAllContacts(tenantId: string) {
    return this.prisma.clientContact.findMany({
      where: { tenantId },
      include: { client: { select: { name: true } } },
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    });
  }

  async createContact(tenantId: string, clientId: string, dto: Record<string, unknown>) {
    await this.findOne(tenantId, clientId);
    return this.prisma.clientContact.create({ data: { ...dto, tenantId, clientId } as any });
  }

  async updateContact(tenantId: string, clientId: string, contactId: string, dto: Record<string, unknown>) {
    return this.prisma.clientContact.update({ where: { id: contactId }, data: dto as any });
  }

  async deleteContact(tenantId: string, clientId: string, contactId: string) {
    return this.prisma.clientContact.delete({ where: { id: contactId } });
  }

  async getDashboard(tenantId: string) {
    const [total, govt, psu, private_, active] = await Promise.all([
      this.prisma.client.count({ where: { tenantId } }),
      this.prisma.client.count({ where: { tenantId, clientType: 'GOVERNMENT_DEPARTMENT' } }),
      this.prisma.client.count({ where: { tenantId, clientType: 'PSU' } }),
      this.prisma.client.count({ where: { tenantId, clientType: 'PRIVATE_ORGANIZATION' } }),
      this.prisma.client.count({ where: { tenantId, isActive: true } }),
    ]);
    return { total, govt, psu, private: private_, active };
  }
}
