import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.addTenantMiddleware();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private addTenantMiddleware() {
    // Soft delete middleware — filter deleted_at for all reads
    this.$use(async (params, next) => {
      const modelsWithSoftDelete = [
        'Tender', 'Client', 'Employee', 'Deployment', 'Invoice', 'Document',
      ];

      if (modelsWithSoftDelete.includes(params.model ?? '')) {
        if (params.action === 'findMany' || params.action === 'findFirst' || params.action === 'count') {
          params.args = params.args ?? {};
          params.args.where = params.args.where ?? {};
          if (params.args.where.deletedAt === undefined) {
            params.args.where.deletedAt = null;
          }
        }
      }

      return next(params);
    });
  }
}
