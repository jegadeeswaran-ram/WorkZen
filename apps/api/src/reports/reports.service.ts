import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('reports') private reportsQueue: Queue,
  ) {}

  async getDefinitions(tenantId: string) {
    return this.prisma.reportDefinition.findMany({ where: { tenantId, isActive: true } });
  }

  async generateReport(tenantId: string, reportId: string, parameters: Record<string, unknown>, userId: string) {
    const execution = await this.prisma.reportExecution.create({
      data: { tenantId, reportId, parameters: parameters as Prisma.InputJsonValue, status: 'PENDING', executedBy: userId },
    });
    await this.reportsQueue.add('generate', { executionId: execution.id, tenantId, reportId, parameters });
    return execution;
  }

  async getExecutions(tenantId: string, reportId: string) {
    return this.prisma.reportExecution.findMany({ where: { tenantId, reportId }, orderBy: { startedAt: 'desc' }, take: 20 });
  }

  async getDashboardSummary(tenantId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      employees,
      activeTenders,
      invoicesThisMonth,
      payrollThisMonth,
      outstanding,
      complianceOverdue,
      totalClients,
      deploymentsActive,
    ] = await Promise.all([
      this.prisma.employee.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.tender.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.invoice.aggregate({
        where: { tenantId, createdAt: { gte: startOfMonth } },
        _sum: { totalAmount: true },
      }),
      this.prisma.payrollRun.findFirst({
        where: { tenantId },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        select: { totalNet: true, month: true, year: true, totalEmployees: true, status: true },
      }),
      this.prisma.invoice.aggregate({
        where: { tenantId, status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] } },
        _sum: { balanceAmount: true },
      }),
      this.prisma.complianceItem.count({ where: { tenantId, status: 'OVERDUE' } }),
      this.prisma.client.count({ where: { tenantId } }),
      this.prisma.deployment.count({ where: { tenantId, status: 'ACTIVE' } }),
    ]);

    return {
      employees,
      activeTenders,
      invoicesThisMonth: invoicesThisMonth._sum.totalAmount ?? 0,
      payrollThisMonth,
      outstanding: outstanding._sum.balanceAmount ?? 0,
      complianceOverdue,
      totalClients,
      deploymentsActive,
    };
  }
}
