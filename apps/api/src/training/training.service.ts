import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PaginationDto, paginate, buildPaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class TrainingService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(tenantId: string) {
    const [programs, sessions, totalEnrollments, completed, pending, certs] = await Promise.all([
      this.prisma.trainingProgram.count({ where: { tenantId, isActive: true } }),
      this.prisma.trainingSession.count({ where: { tenantId, status: { in: ['SCHEDULED', 'IN_PROGRESS'] } } }),
      this.prisma.employeeTraining.count({ where: { tenantId } }),
      this.prisma.employeeTraining.count({ where: { tenantId, status: 'COMPLETED' } }),
      this.prisma.employeeTraining.count({ where: { tenantId, status: { in: ['ASSIGNED', 'IN_PROGRESS'] } } }),
      this.prisma.trainingCertificate.count({ where: { tenantId, isValid: true } }),
    ]);
    return { programs, upcomingSessions: sessions, totalEnrollments, completed, pending, activeCerts: certs };
  }

  // Programs
  async getPrograms(tenantId: string, query: PaginationDto & { programType?: string }) {
    const { page = 1, limit = 20, search, programType } = query;
    const where: any = { tenantId, ...(programType && { programType }), ...(search && { name: { contains: search, mode: 'insensitive' } }) };
    const [data, total] = await Promise.all([
      this.prisma.trainingProgram.findMany({ where, include: { _count: { select: { sessions: true } } }, orderBy: { name: 'asc' }, ...paginate(page, limit) }),
      this.prisma.trainingProgram.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async createProgram(tenantId: string, dto: Record<string, unknown>, userId: string) {
    return this.prisma.trainingProgram.create({ data: { ...dto, tenantId, createdBy: userId } as any });
  }

  async updateProgram(tenantId: string, id: string, dto: Record<string, unknown>) {
    return this.prisma.trainingProgram.update({ where: { id }, data: dto as any });
  }

  // Sessions
  async getSessions(tenantId: string, query: PaginationDto & { programId?: string; status?: string }) {
    const { page = 1, limit = 20, programId, status } = query;
    const where: any = { tenantId, ...(programId && { programId }), ...(status && { status }) };
    const [data, total] = await Promise.all([
      this.prisma.trainingSession.findMany({ where, include: { program: { select: { name: true } }, _count: { select: { enrollments: true } } }, orderBy: { scheduledDate: 'asc' }, ...paginate(page, limit) }),
      this.prisma.trainingSession.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async createSession(tenantId: string, dto: Record<string, unknown>, userId: string) {
    return this.prisma.trainingSession.create({ data: { ...dto, tenantId, createdBy: userId } as any });
  }

  async updateSession(tenantId: string, id: string, dto: Record<string, unknown>) {
    return this.prisma.trainingSession.update({ where: { id }, data: dto as any });
  }

  // Employee Trainings
  async getEmployeeTrainings(tenantId: string, query: PaginationDto & { employeeId?: string; status?: string }) {
    const { page = 1, limit = 20, employeeId, status } = query;
    const where: any = { tenantId, ...(employeeId && { employeeId }), ...(status && { status }) };
    const [data, total] = await Promise.all([
      this.prisma.employeeTraining.findMany({ where, include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } }, session: { select: { title: true, scheduledDate: true } } }, orderBy: { enrolledAt: 'desc' }, ...paginate(page, limit) }),
      this.prisma.employeeTraining.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async assignTraining(tenantId: string, dto: Record<string, unknown>, userId: string) {
    return this.prisma.employeeTraining.create({ data: { ...dto, tenantId, createdBy: userId } as any });
  }

  async updateTraining(tenantId: string, id: string, dto: Record<string, unknown>) {
    return this.prisma.employeeTraining.update({ where: { id }, data: dto as any });
  }

  // Certificates
  async getCertificates(tenantId: string, query: PaginationDto & { employeeId?: string }) {
    const { page = 1, limit = 20, employeeId } = query;
    const where: any = { tenantId, ...(employeeId && { employeeId }) };
    const [data, total] = await Promise.all([
      this.prisma.trainingCertificate.findMany({ where, include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } }, orderBy: { issuedDate: 'desc' }, ...paginate(page, limit) }),
      this.prisma.trainingCertificate.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async issueCertificate(tenantId: string, dto: Record<string, unknown>, userId: string) {
    const count = await this.prisma.trainingCertificate.count({ where: { tenantId } });
    const certificateNo = `CERT${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    return this.prisma.trainingCertificate.create({ data: { ...dto, tenantId, certificateNo, createdBy: userId } as any });
  }
}
