import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class WorkflowsService {
  constructor(private prisma: PrismaService) {}

  async getDefinitions(tenantId: string) {
    return this.prisma.workflowDefinition.findMany({ where: { tenantId, isActive: true }, include: { steps: { orderBy: { stepOrder: 'asc' } } } });
  }

  async startWorkflow(tenantId: string, workflowId: string, entityType: string, entityId: string, userId: string) {
    const workflow = await this.prisma.workflowDefinition.findFirst({
      where: { id: workflowId, tenantId }, include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
    if (!workflow) throw new NotFoundException('Workflow not found');

    const instance = await this.prisma.workflowInstance.create({
      data: { tenantId, workflowId, entityType, entityId, initiatedBy: userId, status: 'IN_PROGRESS', currentStep: 0 },
    });

    if (workflow.steps.length === 0) {
      await this.prisma.workflowInstance.update({ where: { id: instance.id }, data: { status: 'APPROVED', completedAt: new Date() } });
    }
    return instance;
  }

  async getMyPendingApprovals(tenantId: string, userId: string) {
    return this.prisma.approval.findMany({
      where: { tenantId, approverId: userId, actionedAt: null },
      include: { instance: { include: { workflow: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async action(tenantId: string, approvalId: string, userId: string, action: 'APPROVED' | 'REJECTED', comments?: string) {
    const approval = await this.prisma.approval.findFirst({ where: { id: approvalId, approverId: userId } });
    if (!approval) throw new NotFoundException('Approval not found');
    if (approval.actionedAt) throw new BadRequestException('Already actioned');

    await this.prisma.approval.update({ where: { id: approvalId }, data: { action, comments, actionedAt: new Date() } });

    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: approval.workflowInstanceId },
      include: { workflow: { include: { steps: { orderBy: { stepOrder: 'asc' } } } } },
    });
    if (!instance) return;

    if (action === 'REJECTED') {
      await this.prisma.workflowInstance.update({ where: { id: instance.id }, data: { status: 'REJECTED', completedAt: new Date() } });
    } else {
      const nextStep = instance.currentStep + 1;
      if (nextStep >= instance.workflow.steps.length) {
        await this.prisma.workflowInstance.update({ where: { id: instance.id }, data: { status: 'APPROVED', completedAt: new Date() } });
      } else {
        await this.prisma.workflowInstance.update({ where: { id: instance.id }, data: { currentStep: nextStep } });
      }
    }
  }
}
