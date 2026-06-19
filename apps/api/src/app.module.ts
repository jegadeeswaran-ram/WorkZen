import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';

import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { TendersModule } from './tenders/tenders.module';
import { ClientsModule } from './clients/clients.module';
import { EmployeesModule } from './employees/employees.module';
import { RecruitmentModule } from './recruitment/recruitment.module';
import { DeploymentModule } from './deployment/deployment.module';
import { AttendanceModule } from './attendance/attendance.module';
import { PayrollModule } from './payroll/payroll.module';
import { ComplianceModule } from './compliance/compliance.module';
import { BillingModule } from './billing/billing.module';
import { FinanceModule } from './finance/finance.module';
import { AssetsModule } from './assets/assets.module';
import { DocumentsModule } from './documents/documents.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PerformanceModule } from './performance/performance.module';
import { TrainingModule } from './training/training.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { MastersModule } from './masters/masters.module';
import { OrganizationModule } from './organization/organization.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';
import { LogisticsModule } from './logistics/logistics.module';
import { VisitorsModule } from './visitors/visitors.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { ActivityLogModule } from './activity-log/activity-log.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL', 60) * 1000,
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
    }),

    // Cron jobs
    ScheduleModule.forRoot(),

    // Queue
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL', 'redis://localhost:6379');
        const url = new URL(redisUrl);
        return {
          redis: {
            host: url.hostname,
            port: parseInt(url.port || '6379', 10),
            password: url.password || undefined,
          },
        };
      },
    }),

    // GraphQL — only enabled when resolvers exist
    ...(process.env.ENABLE_GRAPHQL === 'true' ? [GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
      context: ({ req }: { req: Request }) => ({ req }),
    })] : []),

    // Database
    PrismaModule,

    // Feature modules
    AuthModule,
    TenantsModule,
    UsersModule,
    TendersModule,
    ClientsModule,
    EmployeesModule,
    RecruitmentModule,
    DeploymentModule,
    AttendanceModule,
    PayrollModule,
    ComplianceModule,
    BillingModule,
    FinanceModule,
    AssetsModule,
    DocumentsModule,
    WorkflowsModule,
    ReportsModule,
    NotificationsModule,
    PerformanceModule,
    TrainingModule,
    MastersModule,
    OrganizationModule,
    WorkOrdersModule,
    LogisticsModule,
    VisitorsModule,
    ComplaintsModule,
    ActivityLogModule,
  ],
})
export class AppModule {}
