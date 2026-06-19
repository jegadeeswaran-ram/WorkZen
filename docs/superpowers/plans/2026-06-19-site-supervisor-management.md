# Site Supervisor Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build complete Site Supervisor Management covering enhanced seed data, Complaints escalation, and Site Activity Log with photo capture — on both web (Next.js) and mobile (Flutter).

**Architecture:** New Prisma models (`SiteComplaint`, `SiteActivityLog`) power two NestJS feature modules; Next.js adds a `/supervisor` section under the dashboard; Flutter adds three new screens under the existing `/supervisor/` route tree.

**Tech Stack:** Prisma + PostgreSQL, NestJS REST, Next.js 15 App Router, Shadcn/UI, Flutter 3 + Riverpod + GoRouter, AWS S3 / MinIO for image uploads.

## Global Constraints

- Every DB table has `tenantId`, `createdAt`, `updatedAt`, `deletedAt` (soft delete)
- All API routes guarded by `JwtAuthGuard`, `TenantGuard`, `RolesGuard`
- API responses use `ResponseDto<T>` wrapper: `{ success, data, message }`
- Never skip `tenant_id` filter in Prisma queries
- RBAC: `SITE_SUPERVISOR` can create complaints/logs; `HR_MANAGER` / `OPERATIONS_MANAGER` can update complaint status
- File: `kebab-case.ts`, Class: `PascalCase`
- Flutter state: Riverpod `StateNotifierProvider`; routing: GoRouter
- No `.env` values committed

---

## File Map

### Schema & Seed
| File | Action | Purpose |
|---|---|---|
| `packages/database/prisma/schema.prisma` | Modify | Add `SiteComplaint`, `SiteActivityLog` models; add `supervisorId` to Site |
| `packages/database/src/seed.ts` | Modify | 3 sites, 3 supervisors, 15 employees/site, 90-day attendance, complaints, activity logs |

### API — Complaints
| File | Action | Purpose |
|---|---|---|
| `apps/api/src/complaints/complaints.module.ts` | Create | NestJS module |
| `apps/api/src/complaints/complaints.controller.ts` | Create | REST endpoints |
| `apps/api/src/complaints/complaints.service.ts` | Create | Business logic |
| `apps/api/src/complaints/dto/create-complaint.dto.ts` | Create | Request DTO |
| `apps/api/src/complaints/dto/update-complaint.dto.ts` | Create | Update DTO |
| `apps/api/src/app.module.ts` | Modify | Register ComplaintsModule |

### API — Activity Log
| File | Action | Purpose |
|---|---|---|
| `apps/api/src/activity-log/activity-log.module.ts` | Create | NestJS module |
| `apps/api/src/activity-log/activity-log.controller.ts` | Create | REST endpoints + file upload |
| `apps/api/src/activity-log/activity-log.service.ts` | Create | Business logic + S3 upload |
| `apps/api/src/activity-log/dto/create-activity-log.dto.ts` | Create | Request DTO |
| `apps/api/src/app.module.ts` | Modify | Register ActivityLogModule |

### Web — Supervisor Section
| File | Action | Purpose |
|---|---|---|
| `apps/web/src/app/(dashboard)/supervisor/page.tsx` | Create | Supervisor overview (redirect to /supervisor/sites) |
| `apps/web/src/app/(dashboard)/supervisor/sites/page.tsx` | Create | Sites list with supervisor info |
| `apps/web/src/app/(dashboard)/supervisor/complaints/page.tsx` | Create | Complaints table with filters |
| `apps/web/src/app/(dashboard)/supervisor/complaints/new/page.tsx` | Create | New complaint form |
| `apps/web/src/app/(dashboard)/supervisor/activity/page.tsx` | Create | Activity log with today/history tabs |
| `apps/web/src/components/supervisor/complaint-form.tsx` | Create | Shared complaint form component |
| `apps/web/src/components/supervisor/activity-log-form.tsx` | Create | Activity log form component |
| `apps/web/src/lib/api.ts` | Modify | Add complaints + activity log API calls |

### Mobile — New Screens
| File | Action | Purpose |
|---|---|---|
| `apps/mobile/lib/features/supervisor/complaints_screen.dart` | Create | Complaints list + new complaint FAB |
| `apps/mobile/lib/features/supervisor/new_complaint_screen.dart` | Create | Form: category, severity, description |
| `apps/mobile/lib/features/supervisor/activity_log_screen.dart` | Create | Today's log + History tabs, photo capture |
| `apps/mobile/lib/features/supervisor/supervisor_provider.dart` | Modify | Add complaints + activity log providers |
| `apps/mobile/lib/core/router/app_router.dart` | Modify | Add routes for new screens |

---

## Task 1: Prisma Schema — Add SiteComplaint and SiteActivityLog Models

**Files:**
- Modify: `packages/database/prisma/schema.prisma`

**Interfaces:**
- Produces: `SiteComplaint` model, `SiteActivityLog` model, `ComplaintCategory` enum, `ComplaintSeverity` enum, `ComplaintStatus` enum used in Tasks 2, 3, 4

- [ ] **Step 1: Add enums and SiteComplaint model to schema**

Open `packages/database/prisma/schema.prisma` and append after the last model (before the closing of the file):

```prisma
enum ComplaintCategory {
  LABOUR_HR
  SAFETY
  OPERATIONS
  COMPLIANCE
  CLIENT_SITE
  RESOURCE
}

enum ComplaintSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum ComplaintStatus {
  OPEN
  IN_REVIEW
  ESCALATED
  RESOLVED
  CLOSED
}

model SiteComplaint {
  id               String             @id @default(cuid())
  tenantId         String
  siteId           String
  reportedById     String
  assignedToId     String?
  category         ComplaintCategory
  severity         ComplaintSeverity  @default(MEDIUM)
  status           ComplaintStatus    @default(OPEN)
  title            String
  description      String             @db.Text
  attachments      Json               @default("[]")
  resolvedAt       DateTime?
  resolutionNote   String?            @db.Text
  escalatedAt      DateTime?
  escalatedToId    String?
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt
  deletedAt        DateTime?

  site             Site               @relation(fields: [siteId], references: [id])
  reportedBy       User               @relation("ComplaintReporter", fields: [reportedById], references: [id])
  assignedTo       User?              @relation("ComplaintAssignee", fields: [assignedToId], references: [id])

  @@index([tenantId])
  @@index([siteId])
  @@index([reportedById])
  @@index([status])
  @@map("site_complaints")
}

model SiteActivityLog {
  id              String    @id @default(cuid())
  tenantId        String
  siteId          String
  supervisorId    String
  logDate         DateTime  @db.Date
  workDone        String    @db.Text
  headcount       Int
  hasIncident     Boolean   @default(false)
  incidentType    String?
  incidentDesc    String?   @db.Text
  photoUrls       Json      @default("[]")
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?

  site            Site      @relation(fields: [siteId], references: [id])
  supervisor      User      @relation("ActivityLogSupervisor", fields: [supervisorId], references: [id])

  @@unique([tenantId, siteId, supervisorId, logDate])
  @@index([tenantId])
  @@index([siteId])
  @@index([logDate])
  @@map("site_activity_logs")
}
```

- [ ] **Step 2: Add back-relations to Site model**

Find the `Site` model in schema.prisma and add these two relation lines inside it (after the existing `shifts Shift[]` line):

```prisma
  complaints      SiteComplaint[]
  activityLogs    SiteActivityLog[]
```

- [ ] **Step 3: Add back-relations to User model**

Find the `User` model and add:

```prisma
  reportedComplaints   SiteComplaint[]   @relation("ComplaintReporter")
  assignedComplaints   SiteComplaint[]   @relation("ComplaintAssignee")
  activityLogs         SiteActivityLog[] @relation("ActivityLogSupervisor")
```

- [ ] **Step 4: Generate Prisma migration**

```bash
cd packages/database
npx prisma migrate dev --name add_site_complaint_activity_log
```

Expected output: `The following migration(s) have been applied` + no errors.

- [ ] **Step 5: Regenerate Prisma client**

```bash
npm run db:generate
```

Expected: `Prisma Client generated successfully`

- [ ] **Step 6: Commit**

```bash
git add packages/database/prisma/schema.prisma packages/database/prisma/migrations/
git commit -m "feat(db): add SiteComplaint and SiteActivityLog models"
```

---

## Task 2: Enhanced Seed Data — Sites, Supervisors, Employees, Attendance

**Files:**
- Modify: `packages/database/src/seed.ts`

**Interfaces:**
- Consumes: `SiteComplaint`, `SiteActivityLog` from Task 1
- Produces: 3 sites, 3 supervisors, 45 employees (15/site), 90-day attendance, sample complaints, sample activity logs

- [ ] **Step 1: Replace site creation block with 3 named sites**

Find the sites creation block in `seed.ts` and replace with:

```typescript
const sites = await Promise.all([
  prisma.site.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'SITE-GGN-01' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Gurugram Metro Station Complex',
      code: 'SITE-GGN-01',
      address: { street: 'Sector 29, Gurugram', city: 'Gurugram', state: 'Haryana', pincode: '122001' },
      latitude: new Decimal('28.4595'),
      longitude: new Decimal('77.0266'),
      geoFenceRadius: 150,
      contactName: 'Rajesh Kumar',
      contactPhone: '9876543210',
      isActive: true,
    },
  }),
  prisma.site.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'SITE-DEL-01' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'DMRC Rajiv Chowk Operations',
      code: 'SITE-DEL-01',
      address: { street: 'Connaught Place, New Delhi', city: 'New Delhi', state: 'Delhi', pincode: '110001' },
      latitude: new Decimal('28.6328'),
      longitude: new Decimal('77.2197'),
      geoFenceRadius: 200,
      contactName: 'Priya Sharma',
      contactPhone: '9876543211',
      isActive: true,
    },
  }),
  prisma.site.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'SITE-FBD-01' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Faridabad Industrial Zone',
      code: 'SITE-FBD-01',
      address: { street: 'Sector 31, Faridabad', city: 'Faridabad', state: 'Haryana', pincode: '121003' },
      latitude: new Decimal('28.4089'),
      longitude: new Decimal('77.3178'),
      geoFenceRadius: 100,
      contactName: 'Amit Singh',
      contactPhone: '9876543212',
      isActive: true,
    },
  }),
]);
const [siteGgn, siteDel, siteFbd] = sites;
```

- [ ] **Step 2: Add 3 supervisor users (one per site)**

After the existing user creation block, add:

```typescript
const supervisorUsers = await Promise.all([
  prisma.user.upsert({
    where: { email: 'supervisor.ggn@workzen.in' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'supervisor.ggn@workzen.in',
      password: await bcrypt.hash('Supervisor@123', 10),
      firstName: 'Vikram',
      lastName: 'Patel',
      isActive: true,
      isEmailVerified: true,
      roles: { create: { tenantId: tenant.id, roleName: RoleName.SITE_SUPERVISOR } },
    },
  }),
  prisma.user.upsert({
    where: { email: 'supervisor.del@workzen.in' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'supervisor.del@workzen.in',
      password: await bcrypt.hash('Supervisor@123', 10),
      firstName: 'Anita',
      lastName: 'Verma',
      isActive: true,
      isEmailVerified: true,
      roles: { create: { tenantId: tenant.id, roleName: RoleName.SITE_SUPERVISOR } },
    },
  }),
  prisma.user.upsert({
    where: { email: 'supervisor.fbd@workzen.in' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'supervisor.fbd@workzen.in',
      password: await bcrypt.hash('Supervisor@123', 10),
      firstName: 'Suresh',
      lastName: 'Yadav',
      isActive: true,
      isEmailVerified: true,
      roles: { create: { tenantId: tenant.id, roleName: RoleName.SITE_SUPERVISOR } },
    },
  }),
]);
const [supGgn, supDel, supFbd] = supervisorUsers;
```

- [ ] **Step 3: Create 15 employees per site (45 total) with deployments**

Add after employee creation:

```typescript
const siteEmployeeData = [
  { site: siteGgn, supervisor: supGgn, prefix: 'GGN' },
  { site: siteDel, supervisor: supDel, prefix: 'DEL' },
  { site: siteFbd, supervisor: supFbd, prefix: 'FBD' },
];

for (const { site, prefix } of siteEmployeeData) {
  for (let i = 1; i <= 15; i++) {
    const emp = await prisma.employee.upsert({
      where: { tenantId_employeeCode: { tenantId: tenant.id, employeeCode: `EMP-${prefix}-${String(i).padStart(3, '0')}` } },
      update: {},
      create: {
        tenantId: tenant.id,
        employeeCode: `EMP-${prefix}-${String(i).padStart(3, '0')}`,
        firstName: firstNames[i % firstNames.length],
        lastName: lastNames[i % lastNames.length],
        personalPhone: `98765${prefix === 'GGN' ? '4' : prefix === 'DEL' ? '5' : '6'}${String(10000 + i)}`,
        gender: i % 3 === 0 ? 'FEMALE' : 'MALE',
        dateOfBirth: new Date(`${1985 + (i % 15)}-${String((i % 12) + 1).padStart(2, '0')}-15`),
        dateOfJoining: new Date('2024-01-01'),
        designationId: designations[i % designations.length].id,
        departmentId: departments[i % departments.length].id,
        employmentType: i % 4 === 0 ? 'PERMANENT' : 'CONTRACT',
        status: 'ACTIVE',
        lifecycleStatus: 'DEPLOYED',
      },
    });

    // Deploy to site
    await prisma.deployment.upsert({
      where: { id: `deploy-${prefix}-${i}` },
      update: {},
      create: {
        id: `deploy-${prefix}-${i}`,
        tenantId: tenant.id,
        employeeId: emp.id,
        siteId: site.id,
        shiftId: shifts[i % shifts.length].id,
        startDate: new Date('2024-01-15'),
        status: 'ACTIVE',
        reportingManager: `EMP-${prefix}-001`,
      },
    });
  }
}
```

Add at top of seed file (before the main function) the name arrays:
```typescript
const firstNames = ['Arun','Priya','Rahul','Sunita','Manoj','Kavita','Deepak','Neha','Vijay','Anita','Suresh','Pooja','Amit','Rekha','Ravi'];
const lastNames = ['Sharma','Kumar','Singh','Verma','Patel','Gupta','Yadav','Mishra','Tiwari','Joshi','Shah','Nair','Reddy','Pillai','Das'];
```

- [ ] **Step 4: Seed 90-day attendance for all employees (Apr-Jun 2026)**

```typescript
const allSiteEmployees = await prisma.employee.findMany({
  where: { tenantId: tenant.id, status: 'ACTIVE' },
  select: { id: true },
});

const attendanceStatuses = ['PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'ABSENT', 'HALF_DAY'];
const startDate = new Date('2026-04-01');
const endDate = new Date('2026-06-30');

for (const emp of allSiteEmployees) {
  const current = new Date(startDate);
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0) { // skip Sundays
      const status = attendanceStatuses[Math.floor(Math.random() * attendanceStatuses.length)];
      await prisma.attendanceRecord.upsert({
        where: { tenantId_employeeId_date: { tenantId: tenant.id, employeeId: emp.id, date: new Date(current) } },
        update: {},
        create: {
          tenantId: tenant.id,
          employeeId: emp.id,
          date: new Date(current),
          status: status as any,
          method: 'BIOMETRIC',
          checkInTime: status === 'PRESENT' ? new Date(current.setHours(9, Math.floor(Math.random() * 15), 0)) : undefined,
          checkOutTime: status === 'PRESENT' ? new Date(new Date(current).setHours(18, Math.floor(Math.random() * 15), 0)) : undefined,
          workHours: status === 'PRESENT' ? new Decimal('8.5') : status === 'HALF_DAY' ? new Decimal('4.0') : undefined,
          isApproved: true,
        },
      });
    }
    current.setDate(current.getDate() + 1);
  }
}
```

- [ ] **Step 5: Seed sample complaints (2 per site)**

```typescript
const complaintSamples = [
  { siteId: siteGgn.id, reportedById: supGgn.id, category: 'SAFETY', severity: 'HIGH', title: 'Faulty electrical panel near Gate 3', description: 'The electrical panel at Gate 3 has exposed wiring and poses shock risk to workers. Immediate repair needed.', status: 'OPEN' },
  { siteId: siteGgn.id, reportedById: supGgn.id, category: 'RESOURCE', severity: 'MEDIUM', title: 'Headcount shortage — 4 workers absent', description: 'Missing 4 security guards for night shift today. Need replacements urgently.', status: 'IN_REVIEW' },
  { siteId: siteDel.id, reportedById: supDel.id, category: 'CLIENT_SITE', severity: 'MEDIUM', title: 'Client requesting scope expansion without amendment', description: 'DMRC site manager asking for additional 10 guards without a revised work order.', status: 'ESCALATED' },
  { siteId: siteDel.id, reportedById: supDel.id, category: 'LABOUR_HR', severity: 'HIGH', title: 'Worker misconduct — verbal harassment', description: 'Guard EMP-DEL-007 reported to have verbally abused a colleague. Witness statements available.', status: 'IN_REVIEW' },
  { siteId: siteFbd.id, reportedById: supFbd.id, category: 'OPERATIONS', severity: 'CRITICAL', title: 'Crane breakdown halting operations', description: 'Primary crane broke down at 10:30 AM. Work stoppage affecting 12 workers. Repair ETA unknown.', status: 'OPEN' },
  { siteId: siteFbd.id, reportedById: supFbd.id, category: 'COMPLIANCE', severity: 'HIGH', title: 'Labour license expiry in 7 days', description: 'Contractor labour license expires on 2026-06-26. Renewal documents not yet submitted.', status: 'ESCALATED' },
];

for (const c of complaintSamples) {
  await prisma.siteComplaint.create({
    data: { tenantId: tenant.id, ...c } as any,
  });
}
```

- [ ] **Step 6: Seed sample activity logs (last 7 days per site)**

```typescript
const supervisorSiteMap = [
  { supervisorId: supGgn.id, siteId: siteGgn.id },
  { supervisorId: supDel.id, siteId: siteDel.id },
  { supervisorId: supFbd.id, siteId: siteFbd.id },
];

for (const { supervisorId, siteId } of supervisorSiteMap) {
  for (let daysAgo = 0; daysAgo < 7; daysAgo++) {
    const logDate = new Date();
    logDate.setDate(logDate.getDate() - daysAgo);
    logDate.setHours(0, 0, 0, 0);
    await prisma.siteActivityLog.upsert({
      where: { tenantId_siteId_supervisorId_logDate: { tenantId: tenant.id, siteId, supervisorId, logDate } },
      update: {},
      create: {
        tenantId: tenant.id,
        siteId,
        supervisorId,
        logDate,
        workDone: daysAgo === 0 ? 'Routine security patrol, access gate monitoring, visitor log updated' : 'Perimeter inspection, shift handover completed, equipment check done',
        headcount: 12 + (daysAgo % 3),
        hasIncident: daysAgo === 2,
        incidentType: daysAgo === 2 ? 'SAFETY' : null,
        incidentDesc: daysAgo === 2 ? 'Minor slip injury near washroom area. First aid administered. Worker sent home.' : null,
        photoUrls: [],
      },
    });
  }
}
```

- [ ] **Step 7: Run the seed**

```bash
npm run db:migrate
cd packages/database && npx ts-node src/seed.ts
```

Expected: `Seed completed successfully` with no errors.

- [ ] **Step 8: Verify in DB**

```bash
cd packages/database
npx prisma studio
```

Check: Sites table has 3 rows, Users with `SITE_SUPERVISOR` role has 3+ rows, AttendanceRecord has 4500+ rows (45 employees × ~100 working days), SiteComplaint has 6 rows, SiteActivityLog has 21 rows.

- [ ] **Step 9: Commit**

```bash
git add packages/database/src/seed.ts
git commit -m "feat(seed): add 3 sites, 3 supervisors, 45 employees, 90-day attendance, complaints & activity logs"
```

---

## Task 3: API — Complaints Module (NestJS)

**Files:**
- Create: `apps/api/src/complaints/complaints.module.ts`
- Create: `apps/api/src/complaints/complaints.controller.ts`
- Create: `apps/api/src/complaints/complaints.service.ts`
- Create: `apps/api/src/complaints/dto/create-complaint.dto.ts`
- Create: `apps/api/src/complaints/dto/update-complaint.dto.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Produces: `GET /complaints`, `GET /complaints/:id`, `POST /complaints`, `PATCH /complaints/:id`, `DELETE /complaints/:id`
- Response shape: `{ success: true, data: SiteComplaint | SiteComplaint[], message: string }`

- [ ] **Step 1: Create DTOs**

`apps/api/src/complaints/dto/create-complaint.dto.ts`:
```typescript
import { IsString, IsEnum, IsOptional, IsNotEmpty } from 'class-validator';

export enum ComplaintCategory {
  LABOUR_HR = 'LABOUR_HR',
  SAFETY = 'SAFETY',
  OPERATIONS = 'OPERATIONS',
  COMPLIANCE = 'COMPLIANCE',
  CLIENT_SITE = 'CLIENT_SITE',
  RESOURCE = 'RESOURCE',
}

export enum ComplaintSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export class CreateComplaintDto {
  @IsString() @IsNotEmpty() siteId: string;
  @IsEnum(ComplaintCategory) category: ComplaintCategory;
  @IsEnum(ComplaintSeverity) @IsOptional() severity?: ComplaintSeverity;
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() description: string;
  @IsString() @IsOptional() assignedToId?: string;
  @IsOptional() attachments?: string[];
}
```

`apps/api/src/complaints/dto/update-complaint.dto.ts`:
```typescript
import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CreateComplaintDto } from './create-complaint.dto';

export enum ComplaintStatus {
  OPEN = 'OPEN',
  IN_REVIEW = 'IN_REVIEW',
  ESCALATED = 'ESCALATED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export class UpdateComplaintDto extends PartialType(CreateComplaintDto) {
  @IsEnum(ComplaintStatus) @IsOptional() status?: ComplaintStatus;
  @IsString() @IsOptional() resolutionNote?: string;
  @IsString() @IsOptional() escalatedToId?: string;
}
```

- [ ] **Step 2: Create service**

`apps/api/src/complaints/complaints.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintDto, ComplaintStatus } from './dto/update-complaint.dto';

@Injectable()
export class ComplaintsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, siteId?: string) {
    return this.prisma.siteComplaint.findMany({
      where: { tenantId, ...(siteId ? { siteId } : {}), deletedAt: null },
      include: { site: { select: { id: true, name: true, code: true } }, reportedBy: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const complaint = await this.prisma.siteComplaint.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { site: true, reportedBy: { select: { id: true, firstName: true, lastName: true, email: true } }, assignedTo: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');
    return complaint;
  }

  async create(tenantId: string, userId: string, dto: CreateComplaintDto) {
    return this.prisma.siteComplaint.create({
      data: {
        tenantId,
        reportedById: userId,
        siteId: dto.siteId,
        category: dto.category,
        severity: dto.severity ?? 'MEDIUM',
        title: dto.title,
        description: dto.description,
        assignedToId: dto.assignedToId,
        attachments: dto.attachments ?? [],
        status: 'OPEN',
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateComplaintDto) {
    await this.findOne(tenantId, id);
    const extra: Record<string, unknown> = {};
    if (dto.status === ComplaintStatus.RESOLVED) extra.resolvedAt = new Date();
    if (dto.escalatedToId) extra.escalatedAt = new Date();
    return this.prisma.siteComplaint.update({
      where: { id },
      data: { ...dto, ...extra },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.siteComplaint.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
```

- [ ] **Step 3: Create controller**

`apps/api/src/complaints/complaints.controller.ts`:
```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('complaints')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Get()
  async findAll(@Request() req: any, @Query('siteId') siteId?: string) {
    const data = await this.complaintsService.findAll(req.tenantId, siteId);
    return { success: true, data, message: 'Complaints fetched' };
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    const data = await this.complaintsService.findOne(req.tenantId, id);
    return { success: true, data, message: 'Complaint fetched' };
  }

  @Post()
  async create(@Request() req: any, @Body() dto: CreateComplaintDto) {
    const data = await this.complaintsService.create(req.tenantId, req.user.id, dto);
    return { success: true, data, message: 'Complaint created' };
  }

  @Patch(':id')
  async update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateComplaintDto) {
    const data = await this.complaintsService.update(req.tenantId, id, dto);
    return { success: true, data, message: 'Complaint updated' };
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    await this.complaintsService.remove(req.tenantId, id);
    return { success: true, data: null, message: 'Complaint deleted' };
  }
}
```

- [ ] **Step 4: Create module and register**

`apps/api/src/complaints/complaints.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ComplaintsController } from './complaints.controller';
import { ComplaintsService } from './complaints.service';

@Module({
  controllers: [ComplaintsController],
  providers: [ComplaintsService],
  exports: [ComplaintsService],
})
export class ComplaintsModule {}
```

In `apps/api/src/app.module.ts`, add to the `imports` array:
```typescript
import { ComplaintsModule } from './complaints/complaints.module';
// ...
ComplaintsModule,
```

- [ ] **Step 5: Test the endpoint**

```bash
# Start API
npm run dev --filter=api

# Test create complaint (replace TOKEN with a valid supervisor JWT)
curl -X POST http://localhost:3001/complaints \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"siteId":"<id>","category":"SAFETY","title":"Test issue","description":"Test desc"}'
```

Expected: `{ "success": true, "data": { "id": "...", "status": "OPEN" } }`

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/complaints/
git add apps/api/src/app.module.ts
git commit -m "feat(api): add complaints module with CRUD endpoints"
```

---

## Task 4: API — Activity Log Module (NestJS) with Image Upload

**Files:**
- Create: `apps/api/src/activity-log/activity-log.module.ts`
- Create: `apps/api/src/activity-log/activity-log.controller.ts`
- Create: `apps/api/src/activity-log/activity-log.service.ts`
- Create: `apps/api/src/activity-log/dto/create-activity-log.dto.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Produces: `GET /activity-log?siteId=&date=`, `GET /activity-log/today`, `POST /activity-log`, `POST /activity-log/upload-photo`, `PATCH /activity-log/:id`

- [ ] **Step 1: Create DTO**

`apps/api/src/activity-log/dto/create-activity-log.dto.ts`:
```typescript
import { IsString, IsInt, IsBoolean, IsOptional, IsNotEmpty, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateActivityLogDto {
  @IsString() @IsNotEmpty() siteId: string;
  @IsDateString() @IsOptional() logDate?: string;
  @IsString() @IsNotEmpty() workDone: string;
  @IsInt() @Min(0) @Type(() => Number) headcount: number;
  @IsBoolean() @IsOptional() hasIncident?: boolean;
  @IsString() @IsOptional() incidentType?: string;
  @IsString() @IsOptional() incidentDesc?: string;
  @IsOptional() photoUrls?: string[];
}
```

- [ ] **Step 2: Create service**

`apps/api/src/activity-log/activity-log.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

@Injectable()
export class ActivityLogService {
  private s3: S3Client;

  constructor(private prisma: PrismaService) {
    this.s3 = new S3Client({
      region: process.env.AWS_REGION ?? 'ap-south-1',
      endpoint: process.env.AWS_S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
      },
      forcePathStyle: true,
    });
  }

  async uploadPhoto(tenantId: string, file: Express.Multer.File): Promise<string> {
    const key = `activity-logs/${tenantId}/${randomUUID()}-${file.originalname}`;
    await this.s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET ?? 'workzen',
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));
    return `${process.env.AWS_S3_ENDPOINT ?? ''}/${process.env.AWS_S3_BUCKET ?? 'workzen'}/${key}`;
  }

  async findAll(tenantId: string, siteId: string, startDate?: string, endDate?: string) {
    return this.prisma.siteActivityLog.findMany({
      where: {
        tenantId,
        siteId,
        deletedAt: null,
        ...(startDate && endDate ? { logDate: { gte: new Date(startDate), lte: new Date(endDate) } } : {}),
      },
      include: { supervisor: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { logDate: 'desc' },
    });
  }

  async findToday(tenantId: string, supervisorId: string, siteId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.prisma.siteActivityLog.findFirst({
      where: { tenantId, siteId, supervisorId, logDate: today, deletedAt: null },
    });
  }

  async upsert(tenantId: string, supervisorId: string, dto: CreateActivityLogDto) {
    const logDate = dto.logDate ? new Date(dto.logDate) : new Date();
    logDate.setHours(0, 0, 0, 0);
    return this.prisma.siteActivityLog.upsert({
      where: { tenantId_siteId_supervisorId_logDate: { tenantId, siteId: dto.siteId, supervisorId, logDate } },
      update: { workDone: dto.workDone, headcount: dto.headcount, hasIncident: dto.hasIncident ?? false, incidentType: dto.incidentType, incidentDesc: dto.incidentDesc, photoUrls: dto.photoUrls ?? [] },
      create: { tenantId, siteId: dto.siteId, supervisorId, logDate, workDone: dto.workDone, headcount: dto.headcount, hasIncident: dto.hasIncident ?? false, incidentType: dto.incidentType, incidentDesc: dto.incidentDesc, photoUrls: dto.photoUrls ?? [] },
    });
  }
}
```

- [ ] **Step 3: Create controller with file upload**

`apps/api/src/activity-log/activity-log.controller.ts`:
```typescript
import { Controller, Get, Post, Patch, Body, Query, Request, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ActivityLogService } from './activity-log.service';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { memoryStorage } from 'multer';

@Controller('activity-log')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  async findAll(@Request() req: any, @Query('siteId') siteId: string, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    const data = await this.activityLogService.findAll(req.tenantId, siteId, startDate, endDate);
    return { success: true, data, message: 'Activity logs fetched' };
  }

  @Get('today')
  async findToday(@Request() req: any, @Query('siteId') siteId: string) {
    const data = await this.activityLogService.findToday(req.tenantId, req.user.id, siteId);
    return { success: true, data, message: 'Today\'s log fetched' };
  }

  @Post()
  async upsert(@Request() req: any, @Body() dto: CreateActivityLogDto) {
    const data = await this.activityLogService.upsert(req.tenantId, req.user.id, dto);
    return { success: true, data, message: 'Activity log saved' };
  }

  @Post('upload-photo')
  @UseInterceptors(FileInterceptor('photo', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadPhoto(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
    const url = await this.activityLogService.uploadPhoto(req.tenantId, file);
    return { success: true, data: { url }, message: 'Photo uploaded' };
  }
}
```

- [ ] **Step 4: Create module**

`apps/api/src/activity-log/activity-log.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ActivityLogController } from './activity-log.controller';
import { ActivityLogService } from './activity-log.service';

@Module({
  controllers: [ActivityLogController],
  providers: [ActivityLogService],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}
```

Add to `apps/api/src/app.module.ts` imports:
```typescript
import { ActivityLogModule } from './activity-log/activity-log.module';
// ...
ActivityLogModule,
```

- [ ] **Step 5: Install missing packages if needed**

```bash
cd apps/api
npm install @aws-sdk/client-s3 multer @types/multer --save
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/activity-log/ apps/api/src/app.module.ts
git commit -m "feat(api): add activity-log module with photo upload"
```

---

## Task 5: Web — Supervisor Section Layout and Sites Overview

**Files:**
- Create: `apps/web/src/app/(dashboard)/supervisor/page.tsx`
- Create: `apps/web/src/app/(dashboard)/supervisor/layout.tsx`
- Modify: `apps/web/src/lib/api.ts`

**Interfaces:**
- Produces: `/supervisor` route with tab navigation to Sites / Complaints / Activity
- Consumes: `GET /sites` (existing), `GET /complaints?siteId=`, `GET /activity-log?siteId=`

- [ ] **Step 1: Add API client methods**

In `apps/web/src/lib/api.ts`, add:

```typescript
// Complaints
export const complaintsApi = {
  list: (siteId?: string) => api.get<ResponseDto<SiteComplaint[]>>(`/complaints${siteId ? `?siteId=${siteId}` : ''}`),
  get: (id: string) => api.get<ResponseDto<SiteComplaint>>(`/complaints/${id}`),
  create: (data: CreateComplaintPayload) => api.post<ResponseDto<SiteComplaint>>('/complaints', data),
  update: (id: string, data: Partial<CreateComplaintPayload> & { status?: string }) => api.patch<ResponseDto<SiteComplaint>>(`/complaints/${id}`, data),
  delete: (id: string) => api.delete(`/complaints/${id}`),
};

// Activity Log
export const activityLogApi = {
  list: (siteId: string, startDate?: string, endDate?: string) => api.get<ResponseDto<SiteActivityLog[]>>(`/activity-log?siteId=${siteId}${startDate ? `&startDate=${startDate}` : ''}${endDate ? `&endDate=${endDate}` : ''}`),
  today: (siteId: string) => api.get<ResponseDto<SiteActivityLog | null>>(`/activity-log/today?siteId=${siteId}`),
  save: (data: ActivityLogPayload) => api.post<ResponseDto<SiteActivityLog>>('/activity-log', data),
  uploadPhoto: (file: File, siteId: string) => {
    const fd = new FormData(); fd.append('photo', file);
    return api.post<ResponseDto<{ url: string }>>('/activity-log/upload-photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};
```

Add type definitions:
```typescript
export interface SiteComplaint {
  id: string; tenantId: string; siteId: string; category: string; severity: string;
  status: string; title: string; description: string; attachments: string[];
  reportedById: string; resolvedAt: string | null; resolutionNote: string | null;
  createdAt: string; site?: { id: string; name: string; code: string };
  reportedBy?: { id: string; firstName: string; lastName: string };
}
export interface SiteActivityLog {
  id: string; siteId: string; supervisorId: string; logDate: string;
  workDone: string; headcount: number; hasIncident: boolean;
  incidentType: string | null; incidentDesc: string | null; photoUrls: string[];
  createdAt: string;
}
export type CreateComplaintPayload = { siteId: string; category: string; severity?: string; title: string; description: string; assignedToId?: string; attachments?: string[] };
export type ActivityLogPayload = { siteId: string; logDate?: string; workDone: string; headcount: number; hasIncident?: boolean; incidentType?: string; incidentDesc?: string; photoUrls?: string[] };
```

- [ ] **Step 2: Create supervisor layout with tab nav**

`apps/web/src/app/(dashboard)/supervisor/layout.tsx`:
```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const tabs = [
  { label: 'Sites Overview', href: '/supervisor/sites' },
  { label: 'Complaints', href: '/supervisor/complaints' },
  { label: 'Activity Log', href: '/supervisor/activity' },
];

export default function SupervisorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Site Supervisor Portal</h1>
        <p className="text-muted-foreground">Manage complaints, daily logs, and site activity</p>
      </div>
      <nav className="flex gap-1 border-b pb-0">
        {tabs.map(tab => (
          <Link key={tab.href} href={tab.href}
            className={cn('px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              pathname.startsWith(tab.href) ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}>
            {tab.label}
          </Link>
        ))}
      </nav>
      <div>{children}</div>
    </div>
  );
}
```

`apps/web/src/app/(dashboard)/supervisor/page.tsx`:
```tsx
import { redirect } from 'next/navigation';
export default function SupervisorPage() { redirect('/supervisor/sites'); }
```

- [ ] **Step 3: Create Sites Overview page**

`apps/web/src/app/(dashboard)/supervisor/sites/page.tsx`:
```tsx
'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, AlertCircle } from 'lucide-react';

export default function SupervisorSitesPage() {
  const { data: sites, isLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: () => api.get('/sites').then(r => r.data.data),
  });

  if (isLoading) return <div className="animate-pulse h-48 bg-muted rounded-lg" />;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {(sites ?? []).map((site: any) => (
        <Card key={site.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{site.name}</CardTitle>
              <Badge variant={site.isActive ? 'default' : 'secondary'}>{site.isActive ? 'Active' : 'Inactive'}</Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono">{site.code}</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-muted-foreground">{site.address?.street}, {site.address?.city}</span>
            </div>
            {site.contactName && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{site.contactName} · {site.contactPhone}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(dashboard)/supervisor/ apps/web/src/lib/api.ts
git commit -m "feat(web): add supervisor section with sites overview and tab layout"
```

---

## Task 6: Web — Complaints Page

**Files:**
- Create: `apps/web/src/app/(dashboard)/supervisor/complaints/page.tsx`
- Create: `apps/web/src/components/supervisor/complaint-form.tsx`

**Interfaces:**
- Consumes: `complaintsApi` from Task 5
- Produces: Complaints table with filters, status badges, new complaint sheet

- [ ] **Step 1: Create complaint form component**

`apps/web/src/components/supervisor/complaint-form.tsx`:
```tsx
'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { complaintsApi, api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'LABOUR_HR', label: 'Labour / HR — Dispute, misconduct, absenteeism, harassment' },
  { value: 'SAFETY', label: 'Safety — Accident, near-miss, unsafe equipment, hazard' },
  { value: 'OPERATIONS', label: 'Operations — Material shortage, breakdown, work stoppage' },
  { value: 'COMPLIANCE', label: 'Compliance — Contractor violation, document expiry, labour law' },
  { value: 'CLIENT_SITE', label: 'Client / Site — Client complaint, scope change, access problem' },
  { value: 'RESOURCE', label: 'Resource — Headcount shortage, skill gap, overtime overrun' },
];
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

interface Props { onSuccess?: () => void; }

export function ComplaintForm({ onSuccess }: Props) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<any>();
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');
  const [siteId, setSiteId] = useState('');
  const qc = useQueryClient();

  const { data: sites } = useQuery({ queryKey: ['sites'], queryFn: () => api.get('/sites').then(r => r.data.data) });

  const mutation = useMutation({
    mutationFn: (data: any) => complaintsApi.create({ ...data, category, severity, siteId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['complaints'] }); toast.success('Complaint submitted'); onSuccess?.(); },
    onError: () => toast.error('Failed to submit complaint'),
  });

  return (
    <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
      <div>
        <Label>Site</Label>
        <Select onValueChange={setSiteId}>
          <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
          <SelectContent>{(sites ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Category</Label>
        <Select onValueChange={setCategory}>
          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Severity</Label>
        <Select defaultValue="MEDIUM" onValueChange={setSeverity}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Title</Label>
        <Input {...register('title', { required: true })} placeholder="Brief summary of the issue" />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea {...register('description', { required: true })} rows={4} placeholder="Provide full details of the complaint..." />
      </div>
      <Button type="submit" disabled={mutation.isPending} className="w-full">
        {mutation.isPending ? 'Submitting...' : 'Submit Complaint'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Create complaints page**

`apps/web/src/app/(dashboard)/supervisor/complaints/page.tsx`:
```tsx
'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { complaintsApi } from '@/lib/api';
import { ComplaintForm } from '@/components/supervisor/complaint-form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'destructive', IN_REVIEW: 'secondary', ESCALATED: 'warning',
  RESOLVED: 'success', CLOSED: 'outline',
};
const SEV_COLORS: Record<string, string> = {
  LOW: 'secondary', MEDIUM: 'default', HIGH: 'destructive', CRITICAL: 'destructive',
};

export default function ComplaintsPage() {
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const qc = useQueryClient();

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ['complaints'],
    queryFn: () => complaintsApi.list().then(r => r.data.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => complaintsApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['complaints'] }),
  });

  const filtered = statusFilter ? complaints.filter((c: any) => c.status === statusFilter) : complaints;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['', 'OPEN', 'IN_REVIEW', 'ESCALATED', 'RESOLVED', 'CLOSED'].map(s => (
            <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(s)}>
              {s || 'All'}
            </Button>
          ))}
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />New Complaint</Button>
          </SheetTrigger>
          <SheetContent className="w-[480px]">
            <SheetHeader><SheetTitle>Raise a Complaint</SheetTitle></SheetHeader>
            <div className="mt-4"><ComplaintForm onSuccess={() => setOpen(false)} /></div>
          </SheetContent>
        </Sheet>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c: any) => (
            <div key={c.id} className="border rounded-lg p-4 space-y-2 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{c.title}</span>
                    <Badge variant={SEV_COLORS[c.severity] as any} className="text-xs">{c.severity}</Badge>
                    <Badge variant={STATUS_COLORS[c.status] as any} className="text-xs">{c.status.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{c.category.replace('_', ' ')} · {c.site?.name} · {format(new Date(c.createdAt), 'dd MMM yyyy')}</p>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
                </div>
                {c.status === 'OPEN' && (
                  <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: c.id, status: 'IN_REVIEW' })}>
                    Mark In Review
                  </Button>
                )}
                {c.status === 'IN_REVIEW' && (
                  <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: c.id, status: 'RESOLVED' })}>
                    Resolve
                  </Button>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No complaints found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(dashboard)/supervisor/complaints/ apps/web/src/components/supervisor/
git commit -m "feat(web): add supervisor complaints page with filtering and new complaint sheet"
```

---

## Task 7: Web — Site Activity Log Page

**Files:**
- Create: `apps/web/src/app/(dashboard)/supervisor/activity/page.tsx`
- Create: `apps/web/src/components/supervisor/activity-log-form.tsx`

**Interfaces:**
- Consumes: `activityLogApi` from Task 5
- Produces: Today's log tab + History tab, form with incident toggle and photo upload

- [ ] **Step 1: Create activity log form**

`apps/web/src/components/supervisor/activity-log-form.tsx`:
```tsx
'use client';
import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { activityLogApi, api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, X, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const INCIDENT_TYPES = ['SAFETY', 'OPERATIONAL', 'HR', 'COMPLIANCE', 'EQUIPMENT', 'OTHER'];

interface Props { siteId: string; defaultValues?: any; onSuccess?: () => void; }

export function ActivityLogForm({ siteId, defaultValues, onSuccess }: Props) {
  const { register, handleSubmit } = useForm({ defaultValues });
  const [hasIncident, setHasIncident] = useState(defaultValues?.hasIncident ?? false);
  const [incidentType, setIncidentType] = useState(defaultValues?.incidentType ?? '');
  const [photoUrls, setPhotoUrls] = useState<string[]>(defaultValues?.photoUrls ?? []);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await activityLogApi.uploadPhoto(file, siteId);
      setPhotoUrls(prev => [...prev, res.data.data.url]);
      toast.success('Photo uploaded');
    } catch { toast.error('Upload failed'); }
    setUploading(false);
  };

  const mutation = useMutation({
    mutationFn: (data: any) => activityLogApi.save({ ...data, siteId, hasIncident, incidentType: hasIncident ? incidentType : undefined, photoUrls }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activity-log', siteId] });
      setSubmitted(true);
      toast.success('Activity log saved!');
      setTimeout(() => { setSubmitted(false); onSuccess?.(); }, 2000);
    },
    onError: () => toast.error('Failed to save log'),
  });

  if (submitted) return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      <CheckCircle className="h-12 w-12 text-green-500" />
      <p className="font-medium text-lg">Log Submitted!</p>
      <p className="text-muted-foreground text-sm">Your activity log has been saved successfully.</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
      <div>
        <Label>Work Done Today <span className="text-destructive">*</span></Label>
        <Textarea {...register('workDone', { required: true })} rows={4} placeholder="Describe the work completed today, areas covered, tasks done..." />
      </div>
      <div>
        <Label>Headcount (Workers Present) <span className="text-destructive">*</span></Label>
        <Input type="number" {...register('headcount', { required: true, min: 0 })} placeholder="0" className="w-32" />
      </div>
      <div className="flex items-center gap-3 p-3 border rounded-lg">
        <Switch checked={hasIncident} onCheckedChange={setHasIncident} id="incident-toggle" />
        <Label htmlFor="incident-toggle" className="cursor-pointer">Any incident today?</Label>
      </div>
      {hasIncident && (
        <div className="space-y-3 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
          <div>
            <Label>Incident Type</Label>
            <Select onValueChange={setIncidentType}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>{INCIDENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Incident Description</Label>
            <Textarea {...register('incidentDesc')} rows={3} placeholder="Describe what happened, people involved, action taken..." />
          </div>
        </div>
      )}
      <div>
        <Label>Photos</Label>
        <div className="flex gap-2 flex-wrap mt-1">
          {photoUrls.map((url, i) => (
            <div key={i} className="relative w-20 h-20 rounded border overflow-hidden group">
              <img src={url} alt={`Photo ${i+1}`} className="w-full h-full object-cover" />
              <button type="button" onClick={() => setPhotoUrls(p => p.filter((_, j) => j !== i))} className="absolute top-0 right-0 bg-black/60 text-white p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3" /></button>
            </div>
          ))}
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="w-20 h-20 border-2 border-dashed rounded flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors">
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Camera className="h-5 w-5" /><span className="text-xs mt-1">Add Photo</span></>}
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
        </div>
      </div>
      <Button type="submit" disabled={mutation.isPending} className="w-full">
        {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Submit Log'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Create activity log page with Today/History tabs**

`apps/web/src/app/(dashboard)/supervisor/activity/page.tsx`:
```tsx
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { activityLogApi, api } from '@/lib/api';
import { ActivityLogForm } from '@/components/supervisor/activity-log-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays } from 'date-fns';
import { Users, AlertTriangle, Camera } from 'lucide-react';

export default function ActivityLogPage() {
  const [siteId, setSiteId] = useState('');

  const { data: sites = [] } = useQuery({ queryKey: ['sites'], queryFn: () => api.get('/sites').then(r => r.data.data) });
  const { data: todayLog } = useQuery({ queryKey: ['activity-log-today', siteId], queryFn: () => siteId ? activityLogApi.today(siteId).then(r => r.data.data) : null, enabled: !!siteId });
  const { data: history = [] } = useQuery({ queryKey: ['activity-log', siteId], queryFn: () => siteId ? activityLogApi.list(siteId, format(subDays(new Date(), 30), 'yyyy-MM-dd'), format(new Date(), 'yyyy-MM-dd')).then(r => r.data.data) : [], enabled: !!siteId });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select onValueChange={setSiteId}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select site" /></SelectTrigger>
          <SelectContent>{(sites as any[]).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
        {!siteId && <p className="text-sm text-muted-foreground">Select a site to view or submit activity logs</p>}
      </div>

      {siteId && (
        <Tabs defaultValue="today">
          <TabsList>
            <TabsTrigger value="today">Today's Log</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="today" className="mt-4">
            {todayLog ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Log for {format(new Date(todayLog.logDate), 'dd MMM yyyy')}</CardTitle>
                    {todayLog.hasIncident && <Badge variant="destructive">Incident Reported</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><span>Headcount: <strong>{todayLog.headcount}</strong></span></div>
                  <div><p className="text-muted-foreground font-medium">Work Done</p><p className="mt-1">{todayLog.workDone}</p></div>
                  {todayLog.hasIncident && <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg"><div className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4 text-destructive" />Incident: {todayLog.incidentType}</div><p className="mt-1 text-muted-foreground">{todayLog.incidentDesc}</p></div>}
                  {todayLog.photoUrls?.length > 0 && (
                    <div><p className="text-muted-foreground font-medium flex items-center gap-1"><Camera className="h-4 w-4" />Photos</p><div className="flex gap-2 mt-1 flex-wrap">{todayLog.photoUrls.map((url: string, i: number) => <img key={i} src={url} alt={`Photo ${i+1}`} className="w-20 h-20 rounded object-cover border" />)}</div></div>
                  )}
                  <p className="text-xs text-muted-foreground">Log already submitted for today. Edit by re-submitting below.</p>
                </CardContent>
              </Card>
            ) : null}
            <div className={todayLog ? 'mt-4 p-4 border rounded-lg' : ''}>
              {todayLog && <p className="text-sm font-medium mb-3">Update Today's Log</p>}
              <ActivityLogForm siteId={siteId} defaultValues={todayLog ?? undefined} />
            </div>
          </TabsContent>
          <TabsContent value="history" className="mt-4 space-y-3">
            {(history as any[]).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground"><p>No logs found for the past 30 days</p></div>
            ) : (history as any[]).map(log => (
              <Card key={log.id}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{format(new Date(log.logDate), 'EEEE, dd MMM yyyy')}</p>
                    <div className="flex gap-2">
                      {log.hasIncident && <Badge variant="destructive" className="text-xs">Incident</Badge>}
                      {log.photoUrls?.length > 0 && <Badge variant="secondary" className="text-xs"><Camera className="h-3 w-3 mr-1" />{log.photoUrls.length}</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-3.5 w-3.5" />{log.headcount} workers</div>
                  <p className="text-sm line-clamp-2">{log.workDone}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(dashboard)/supervisor/activity/ apps/web/src/components/supervisor/activity-log-form.tsx
git commit -m "feat(web): add activity log page with today/history tabs and photo upload"
```

---

## Task 8: Mobile — Complaints Screen (Flutter)

**Files:**
- Create: `apps/mobile/lib/features/supervisor/complaints_screen.dart`
- Create: `apps/mobile/lib/features/supervisor/new_complaint_screen.dart`
- Modify: `apps/mobile/lib/features/supervisor/supervisor_provider.dart`
- Modify: `apps/mobile/lib/core/router/app_router.dart`

**Interfaces:**
- Consumes: `GET /complaints?siteId=`, `POST /complaints`
- Produces: `/supervisor/complaints` route, `/supervisor/complaints/new` route

- [ ] **Step 1: Add complaint models and providers**

In `apps/mobile/lib/features/supervisor/supervisor_provider.dart`, add:

```dart
// --- Complaint Model ---
class SiteComplaint {
  final String id;
  final String siteId;
  final String category;
  final String severity;
  final String status;
  final String title;
  final String description;
  final String createdAt;

  const SiteComplaint({required this.id, required this.siteId, required this.category, required this.severity, required this.status, required this.title, required this.description, required this.createdAt});

  factory SiteComplaint.fromJson(Map<String, dynamic> j) => SiteComplaint(
    id: j['id'], siteId: j['siteId'], category: j['category'],
    severity: j['severity'], status: j['status'], title: j['title'],
    description: j['description'], createdAt: j['createdAt'],
  );
}

// --- Complaints Notifier ---
class ComplaintsNotifier extends StateNotifier<AsyncValue<List<SiteComplaint>>> {
  ComplaintsNotifier(this._dio) : super(const AsyncValue.loading());
  final Dio _dio;

  Future<void> load(String siteId) async {
    state = const AsyncValue.loading();
    try {
      final res = await _dio.get('/complaints', queryParameters: {'siteId': siteId});
      final list = (res.data['data'] as List).map((e) => SiteComplaint.fromJson(e)).toList();
      state = AsyncValue.data(list);
    } catch (e, s) { state = AsyncValue.error(e, s); }
  }

  Future<void> create({required String siteId, required String category, required String severity, required String title, required String description}) async {
    await _dio.post('/complaints', data: {'siteId': siteId, 'category': category, 'severity': severity, 'title': title, 'description': description});
  }
}

final complaintsProvider = StateNotifierProvider<ComplaintsNotifier, AsyncValue<List<SiteComplaint>>>((ref) {
  final dio = ref.watch(dioProvider);
  return ComplaintsNotifier(dio);
});
```

- [ ] **Step 2: Create complaints list screen**

`apps/mobile/lib/features/supervisor/complaints_screen.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'supervisor_provider.dart';

class ComplaintsScreen extends ConsumerStatefulWidget {
  final String siteId;
  const ComplaintsScreen({super.key, required this.siteId});

  @override
  ConsumerState<ComplaintsScreen> createState() => _ComplaintsScreenState();
}

class _ComplaintsScreenState extends ConsumerState<ComplaintsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(complaintsProvider.notifier).load(widget.siteId);
    });
  }

  Color _statusColor(String status) => switch (status) {
    'OPEN' => Colors.red,
    'IN_REVIEW' => Colors.orange,
    'ESCALATED' => Colors.deepOrange,
    'RESOLVED' => Colors.green,
    _ => Colors.grey,
  };

  Color _sevColor(String sev) => switch (sev) {
    'CRITICAL' => Colors.red,
    'HIGH' => Colors.deepOrange,
    'MEDIUM' => Colors.orange,
    _ => Colors.grey,
  };

  @override
  Widget build(BuildContext context) {
    final complaints = ref.watch(complaintsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Complaints'), centerTitle: false),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/supervisor/complaints/new', extra: widget.siteId),
        icon: const Icon(Icons.add),
        label: const Text('New Complaint'),
      ),
      body: complaints.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (list) => list.isEmpty
          ? const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [Icon(Icons.check_circle_outline, size: 48, color: Colors.green), SizedBox(height: 12), Text('No open complaints')]))
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (ctx, i) {
                final c = list[i];
                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [
                        Expanded(child: Text(c.title, style: const TextStyle(fontWeight: FontWeight.w600))),
                        Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2), decoration: BoxDecoration(color: _statusColor(c.status).withAlpha(30), borderRadius: BorderRadius.circular(12)), child: Text(c.status.replaceAll('_', ' '), style: TextStyle(fontSize: 11, color: _statusColor(c.status), fontWeight: FontWeight.w600))),
                      ]),
                      const SizedBox(height: 4),
                      Row(children: [
                        Text(c.category.replaceAll('_', ' / '), style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurface.withAlpha(150))),
                        const Spacer(),
                        Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: BoxDecoration(color: _sevColor(c.severity).withAlpha(30), borderRadius: BorderRadius.circular(8)), child: Text(c.severity, style: TextStyle(fontSize: 10, color: _sevColor(c.severity), fontWeight: FontWeight.w600))),
                      ]),
                      const SizedBox(height: 6),
                      Text(c.description, maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurface.withAlpha(180))),
                    ]),
                  ),
                );
              },
            ),
      ),
    );
  }
}
```

- [ ] **Step 3: Create new complaint screen**

`apps/mobile/lib/features/supervisor/new_complaint_screen.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'supervisor_provider.dart';

const _categories = [
  ('LABOUR_HR', 'Labour / HR', 'Dispute, misconduct, absenteeism, harassment'),
  ('SAFETY', 'Safety', 'Accident, near-miss, unsafe equipment, hazard'),
  ('OPERATIONS', 'Operations', 'Material shortage, equipment breakdown, work stoppage'),
  ('COMPLIANCE', 'Compliance', 'Contractor violation, document expiry, labour law'),
  ('CLIENT_SITE', 'Client / Site', 'Client complaint, scope change, site access problem'),
  ('RESOURCE', 'Resource', 'Headcount shortage, skill gap, overtime overrun'),
];
const _severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

class NewComplaintScreen extends ConsumerStatefulWidget {
  final String siteId;
  const NewComplaintScreen({super.key, required this.siteId});

  @override
  ConsumerState<NewComplaintScreen> createState() => _NewComplaintScreenState();
}

class _NewComplaintScreenState extends ConsumerState<NewComplaintScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  String _category = 'SAFETY';
  String _severity = 'MEDIUM';
  bool _loading = false;

  @override
  void dispose() { _titleCtrl.dispose(); _descCtrl.dispose(); super.dispose(); }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      await ref.read(complaintsProvider.notifier).create(
        siteId: widget.siteId, category: _category, severity: _severity,
        title: _titleCtrl.text.trim(), description: _descCtrl.text.trim(),
      );
      if (mounted) { context.pop(); ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Complaint submitted successfully'), backgroundColor: Colors.green)); }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red));
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Raise Complaint'), centerTitle: false),
      body: Form(
        key: _formKey,
        child: ListView(padding: const EdgeInsets.all(16), children: [
          const Text('Category', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          const SizedBox(height: 8),
          ...(_categories.map((c) => RadioListTile<String>(
            title: Text(c.$2, style: const TextStyle(fontWeight: FontWeight.w500)),
            subtitle: Text(c.$3, style: const TextStyle(fontSize: 12)),
            value: c.$1, groupValue: _category,
            onChanged: (v) => setState(() => _category = v!),
            contentPadding: EdgeInsets.zero, dense: true,
          ))),
          const SizedBox(height: 12),
          const Text('Severity', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          const SizedBox(height: 8),
          Wrap(spacing: 8, children: _severities.map((s) => ChoiceChip(label: Text(s), selected: _severity == s, onSelected: (_) => setState(() => _severity = s))).toList()),
          const SizedBox(height: 16),
          TextFormField(controller: _titleCtrl, decoration: const InputDecoration(labelText: 'Title', hintText: 'Brief summary', border: OutlineInputBorder()), validator: (v) => v!.isEmpty ? 'Required' : null),
          const SizedBox(height: 12),
          TextFormField(controller: _descCtrl, decoration: const InputDecoration(labelText: 'Description', hintText: 'Full details of the issue...', border: OutlineInputBorder()), maxLines: 5, validator: (v) => v!.isEmpty ? 'Required' : null),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _loading ? null : _submit,
            style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
            child: _loading ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Submit Complaint', style: TextStyle(fontSize: 16)),
          ),
        ]),
      ),
    );
  }
}
```

- [ ] **Step 4: Add routes to app_router.dart**

In `apps/mobile/lib/core/router/app_router.dart`, find the supervisor routes and add:

```dart
GoRoute(
  path: '/supervisor/complaints',
  builder: (ctx, state) {
    final siteId = state.extra as String? ?? '';
    return ComplaintsScreen(siteId: siteId);
  },
),
GoRoute(
  path: '/supervisor/complaints/new',
  builder: (ctx, state) {
    final siteId = state.extra as String? ?? '';
    return NewComplaintScreen(siteId: siteId);
  },
),
```

Add import at the top of app_router.dart:
```dart
import '../../features/supervisor/complaints_screen.dart';
import '../../features/supervisor/new_complaint_screen.dart';
```

- [ ] **Step 5: Add Complaints button to supervisor dashboard**

In `apps/mobile/lib/features/supervisor/supervisor_dashboard_screen.dart`, add a quick-action card:

```dart
_QuickActionCard(
  icon: Icons.report_problem_outlined,
  label: 'Complaints',
  color: Colors.orange,
  onTap: () => context.push('/supervisor/complaints', extra: siteId),
),
```

- [ ] **Step 6: Run Flutter and verify**

```bash
cd apps/mobile
flutter run
```

Navigate to supervisor dashboard → Complaints → verify list loads → tap New Complaint → fill form → submit → verify redirected back with success toast.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/lib/features/supervisor/complaints_screen.dart
git add apps/mobile/lib/features/supervisor/new_complaint_screen.dart
git add apps/mobile/lib/features/supervisor/supervisor_provider.dart
git add apps/mobile/lib/core/router/app_router.dart
git commit -m "feat(mobile): add complaints screen with category/severity form"
```

---

## Task 9: Mobile — Activity Log Screen (Flutter)

**Files:**
- Create: `apps/mobile/lib/features/supervisor/activity_log_screen.dart`
- Modify: `apps/mobile/lib/features/supervisor/supervisor_provider.dart`
- Modify: `apps/mobile/lib/core/router/app_router.dart`

**Interfaces:**
- Consumes: `GET /activity-log/today?siteId=`, `GET /activity-log?siteId=`, `POST /activity-log`, `POST /activity-log/upload-photo`
- Produces: `/supervisor/activity` with Today's Log / History tabs, photo capture, confirmation screen

- [ ] **Step 1: Add ActivityLog model and providers**

In `supervisor_provider.dart`, add:

```dart
// --- ActivityLog Model ---
class SiteActivityLog {
  final String id;
  final String siteId;
  final String logDate;
  final String workDone;
  final int headcount;
  final bool hasIncident;
  final String? incidentType;
  final String? incidentDesc;
  final List<String> photoUrls;

  const SiteActivityLog({required this.id, required this.siteId, required this.logDate, required this.workDone, required this.headcount, required this.hasIncident, this.incidentType, this.incidentDesc, required this.photoUrls});

  factory SiteActivityLog.fromJson(Map<String, dynamic> j) => SiteActivityLog(
    id: j['id'], siteId: j['siteId'], logDate: j['logDate'],
    workDone: j['workDone'], headcount: j['headcount'],
    hasIncident: j['hasIncident'] ?? false,
    incidentType: j['incidentType'], incidentDesc: j['incidentDesc'],
    photoUrls: (j['photoUrls'] as List?)?.cast<String>() ?? [],
  );
}

class ActivityLogNotifier extends StateNotifier<AsyncValue<List<SiteActivityLog>>> {
  ActivityLogNotifier(this._dio) : super(const AsyncValue.loading());
  final Dio _dio;
  SiteActivityLog? todayLog;

  Future<void> load(String siteId) async {
    state = const AsyncValue.loading();
    try {
      final res = await _dio.get('/activity-log', queryParameters: {'siteId': siteId});
      final list = (res.data['data'] as List).map((e) => SiteActivityLog.fromJson(e)).toList();
      state = AsyncValue.data(list);
      // also load today
      try {
        final todayRes = await _dio.get('/activity-log/today', queryParameters: {'siteId': siteId});
        todayLog = todayRes.data['data'] != null ? SiteActivityLog.fromJson(todayRes.data['data']) : null;
      } catch (_) {}
    } catch (e, s) { state = AsyncValue.error(e, s); }
  }

  Future<String> uploadPhoto(String filePath, String tenantId) async {
    final formData = FormData.fromMap({'photo': await MultipartFile.fromFile(filePath, filename: filePath.split('/').last)});
    final res = await _dio.post('/activity-log/upload-photo', data: formData);
    return res.data['data']['url'] as String;
  }

  Future<void> save({required String siteId, required String workDone, required int headcount, required bool hasIncident, String? incidentType, String? incidentDesc, List<String> photoUrls = const []}) async {
    await _dio.post('/activity-log', data: {
      'siteId': siteId, 'workDone': workDone, 'headcount': headcount,
      'hasIncident': hasIncident, if (incidentType != null) 'incidentType': incidentType,
      if (incidentDesc != null) 'incidentDesc': incidentDesc, 'photoUrls': photoUrls,
    });
  }
}

final activityLogProvider = StateNotifierProvider<ActivityLogNotifier, AsyncValue<List<SiteActivityLog>>>((ref) {
  final dio = ref.watch(dioProvider);
  return ActivityLogNotifier(dio);
});
```

- [ ] **Step 2: Create activity log screen**

`apps/mobile/lib/features/supervisor/activity_log_screen.dart`:
```dart
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'supervisor_provider.dart';

class ActivityLogScreen extends ConsumerStatefulWidget {
  final String siteId;
  const ActivityLogScreen({super.key, required this.siteId});
  @override
  ConsumerState<ActivityLogScreen> createState() => _ActivityLogScreenState();
}

class _ActivityLogScreenState extends ConsumerState<ActivityLogScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;
  final _workCtrl = TextEditingController();
  final _headCtrl = TextEditingController(text: '0');
  final _incDescCtrl = TextEditingController();
  bool _hasIncident = false;
  String _incidentType = 'SAFETY';
  List<String> _uploadedUrls = [];
  List<XFile> _pendingPhotos = [];
  bool _submitting = false;
  bool _submitted = false;

  static const _incidentTypes = ['SAFETY', 'OPERATIONAL', 'HR', 'COMPLIANCE', 'EQUIPMENT', 'OTHER'];

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(activityLogProvider.notifier).load(widget.siteId).then((_) {
        final today = ref.read(activityLogProvider.notifier).todayLog;
        if (today != null && mounted) {
          _workCtrl.text = today.workDone;
          _headCtrl.text = today.headcount.toString();
          setState(() { _hasIncident = today.hasIncident; _incidentType = today.incidentType ?? 'SAFETY'; _uploadedUrls = today.photoUrls; });
          if (today.incidentDesc != null) _incDescCtrl.text = today.incidentDesc!;
        }
      });
    });
  }

  @override
  void dispose() { _tabs.dispose(); _workCtrl.dispose(); _headCtrl.dispose(); _incDescCtrl.dispose(); super.dispose(); }

  Future<void> _pickPhoto() async {
    final picker = ImagePicker();
    final photo = await picker.pickImage(source: ImageSource.camera, imageQuality: 70);
    if (photo != null) setState(() => _pendingPhotos.add(photo));
  }

  Future<void> _submit() async {
    if (_workCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please describe the work done today')));
      return;
    }
    setState(() => _submitting = true);
    try {
      final notifier = ref.read(activityLogProvider.notifier);
      // Upload pending photos first
      for (final photo in _pendingPhotos) {
        final url = await notifier.uploadPhoto(photo.path, '');
        _uploadedUrls.add(url);
      }
      await notifier.save(
        siteId: widget.siteId,
        workDone: _workCtrl.text.trim(),
        headcount: int.tryParse(_headCtrl.text) ?? 0,
        hasIncident: _hasIncident,
        incidentType: _hasIncident ? _incidentType : null,
        incidentDesc: _hasIncident && _incDescCtrl.text.isNotEmpty ? _incDescCtrl.text.trim() : null,
        photoUrls: _uploadedUrls,
      );
      await notifier.load(widget.siteId);
      if (mounted) setState(() { _submitted = true; _submitting = false; });
    } catch (e) {
      if (mounted) { ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red)); setState(() => _submitting = false); }
    }
  }

  Widget _buildTodayForm() {
    if (_submitted) {
      return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.check_circle, size: 64, color: Colors.green),
        const SizedBox(height: 16),
        const Text("Log Submitted!", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        const Text("Your activity log has been saved.", textAlign: TextAlign.center),
        const SizedBox(height: 24),
        OutlinedButton(onPressed: () => setState(() { _submitted = false; _tabs.animateTo(1); }), child: const Text("View History")),
      ]));
    }
    return ListView(padding: const EdgeInsets.all(16), children: [
      TextFormField(controller: _workCtrl, decoration: const InputDecoration(labelText: 'Work Done Today *', hintText: 'Describe tasks, areas covered...', border: OutlineInputBorder()), maxLines: 4),
      const SizedBox(height: 12),
      TextFormField(controller: _headCtrl, decoration: const InputDecoration(labelText: 'Headcount (Workers Present)', border: OutlineInputBorder(), prefixIcon: Icon(Icons.groups)), keyboardType: TextInputType.number),
      const SizedBox(height: 12),
      SwitchListTile(
        title: const Text('Any incident today?'),
        subtitle: const Text('Toggle if there was an accident, issue, or safety concern'),
        value: _hasIncident, onChanged: (v) => setState(() => _hasIncident = v),
        contentPadding: EdgeInsets.zero,
      ),
      if (_hasIncident) ...[
        const SizedBox(height: 8),
        Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: Colors.red.withAlpha(15), borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.red.withAlpha(60))), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Incident Type', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          const SizedBox(height: 6),
          Wrap(spacing: 6, children: _incidentTypes.map((t) => ChoiceChip(label: Text(t, style: const TextStyle(fontSize: 12)), selected: _incidentType == t, onSelected: (_) => setState(() => _incidentType = t))).toList()),
          const SizedBox(height: 10),
          TextFormField(controller: _incDescCtrl, decoration: const InputDecoration(labelText: 'Incident Description', hintText: 'What happened, who was involved, action taken...', border: OutlineInputBorder()), maxLines: 3),
        ])),
      ],
      const SizedBox(height: 16),
      const Text('Photos', style: TextStyle(fontWeight: FontWeight.w600)),
      const SizedBox(height: 8),
      Wrap(spacing: 8, runSpacing: 8, children: [
        ..._pendingPhotos.map((p) => ClipRRect(borderRadius: BorderRadius.circular(8), child: Stack(children: [
          Image.file(File(p.path), width: 72, height: 72, fit: BoxFit.cover),
          Positioned(top: 2, right: 2, child: GestureDetector(onTap: () => setState(() => _pendingPhotos.remove(p)), child: const CircleAvatar(radius: 10, backgroundColor: Colors.black54, child: Icon(Icons.close, size: 12, color: Colors.white)))),
        ]))),
        GestureDetector(
          onTap: _pickPhoto,
          child: Container(width: 72, height: 72, decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade400, width: 1.5, style: BorderStyle.solid), borderRadius: BorderRadius.circular(8), color: Colors.grey.shade100),
            child: const Column(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(Icons.camera_alt_outlined, color: Colors.grey), SizedBox(height: 4), Text('Photo', style: TextStyle(fontSize: 11, color: Colors.grey))])),
        ),
      ]),
      const SizedBox(height: 24),
      ElevatedButton.icon(
        onPressed: _submitting ? null : _submit,
        icon: _submitting ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.send),
        label: Text(_submitting ? 'Submitting...' : 'Submit Log'),
        style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
      ),
    ]);
  }

  Widget _buildHistory(List<SiteActivityLog> logs) {
    if (logs.isEmpty) return const Center(child: Text('No logs in the past 30 days'));
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: logs.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (ctx, i) {
        final log = logs[i];
        final dateStr = DateFormat('EEE, dd MMM yyyy').format(DateTime.parse(log.logDate));
        return Card(child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text(dateStr, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
            if (log.hasIncident) Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2), decoration: BoxDecoration(color: Colors.red.withAlpha(30), borderRadius: BorderRadius.circular(12)), child: const Text('Incident', style: TextStyle(fontSize: 11, color: Colors.red, fontWeight: FontWeight.w600))),
            if (log.photoUrls.isNotEmpty) ...[const SizedBox(width: 6), const Icon(Icons.photo, size: 14, color: Colors.grey)],
          ]),
          const SizedBox(height: 4),
          Text('${log.headcount} workers present', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
          const SizedBox(height: 6),
          Text(log.workDone, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13)),
          if (log.hasIncident && log.incidentType != null) ...[const SizedBox(height: 6), Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4), decoration: BoxDecoration(color: Colors.orange.withAlpha(20), borderRadius: BorderRadius.circular(6)), child: Text('${log.incidentType}: ${log.incidentDesc ?? ''}', style: const TextStyle(fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis))],
        ])));
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final logsState = ref.watch(activityLogProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Activity Log'),
        centerTitle: false,
        bottom: TabBar(controller: _tabs, tabs: const [Tab(text: "Today's Log"), Tab(text: "History")]),
      ),
      body: TabBarView(controller: _tabs, children: [
        _buildTodayForm(),
        logsState.when(loading: () => const Center(child: CircularProgressIndicator()), error: (e, _) => Center(child: Text('Error: $e')), data: _buildHistory),
      ]),
    );
  }
}
```

- [ ] **Step 3: Add image_picker dependency**

```bash
cd apps/mobile
flutter pub add image_picker
```

For iOS, add to `ios/Runner/Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>Camera access needed to capture site activity photos</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Photo library access needed to attach site photos</string>
```

For Android, add to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.CAMERA"/>
```

- [ ] **Step 4: Register route**

In `app_router.dart`, add:
```dart
GoRoute(
  path: '/supervisor/activity',
  builder: (ctx, state) {
    final siteId = state.extra as String? ?? '';
    return ActivityLogScreen(siteId: siteId);
  },
),
```

Import:
```dart
import '../../features/supervisor/activity_log_screen.dart';
```

- [ ] **Step 5: Add Activity Log card to supervisor dashboard**

In `supervisor_dashboard_screen.dart`:
```dart
_QuickActionCard(
  icon: Icons.assignment_outlined,
  label: 'Activity Log',
  color: Colors.blue,
  onTap: () => context.push('/supervisor/activity', extra: siteId),
),
```

- [ ] **Step 6: Run and test**

```bash
flutter run
```

Navigate to supervisor dashboard → Activity Log → fill today's form → toggle incident → capture photo → submit → see confirmation screen → switch to History tab → verify past logs show.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/lib/features/supervisor/activity_log_screen.dart
git add apps/mobile/lib/features/supervisor/supervisor_provider.dart
git add apps/mobile/lib/core/router/app_router.dart
git add apps/mobile/pubspec.yaml apps/mobile/pubspec.lock
git commit -m "feat(mobile): add activity log screen with today/history tabs and camera photo capture"
```

---

## Task 10: Add Supervisor Nav to Sidebar (Web)

**Files:**
- Modify: `apps/web/src/app/(dashboard)/layout.tsx` (or wherever the sidebar nav is defined)

**Interfaces:**
- Produces: "Supervisor" nav section visible to `SITE_SUPERVISOR` and `HR_MANAGER` roles

- [ ] **Step 1: Find the sidebar nav items**

```bash
grep -r "href.*deployment\|href.*employees" apps/web/src/app/(dashboard)/ --include="*.tsx" -l
```

Find the file that defines sidebar navigation links and add:

```tsx
{
  section: 'Supervisor',
  items: [
    { label: 'Sites Overview', href: '/supervisor/sites', icon: MapPin, roles: ['SITE_SUPERVISOR', 'HR_MANAGER', 'OPERATIONS_MANAGER'] },
    { label: 'Complaints', href: '/supervisor/complaints', icon: AlertCircle, roles: ['SITE_SUPERVISOR', 'HR_MANAGER'] },
    { label: 'Activity Log', href: '/supervisor/activity', icon: ClipboardList, roles: ['SITE_SUPERVISOR', 'HR_MANAGER'] },
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/(dashboard)/
git commit -m "feat(web): add supervisor section to dashboard sidebar nav"
```

---

## Self-Review Checklist

### Spec Coverage
- [x] Seed: multiple sites (3) ✓
- [x] Seed: multiple supervisors (1 per site) ✓
- [x] Seed: employees per site (15/site = 45 total) ✓
- [x] Seed: attendance data (90 days, Apr-Jun 2026) ✓
- [x] Complaints — Labour/HR, Safety, Operations, Compliance, Client/Site, Resource ✓
- [x] Complaint form on mobile ✓
- [x] Activity log — work done, headcount, incident toggle ✓
- [x] Activity log — incident type + description on toggle ✓
- [x] Activity log — photo capture ✓
- [x] Activity log — confirmation screen after submit ✓
- [x] Activity log — Today's log vs History tabs ✓
- [x] Web: Sites overview, Complaints page, Activity log page ✓
- [x] API: Complaints CRUD ✓
- [x] API: Activity log with photo upload ✓

### Gaps Identified
- Monthly/yearly attendance **summary** views: these are derived from the seeded `AttendanceRecord` data via existing queries — no new model needed. The web `/attendance` page already supports date-range filtering. For mobile, the supervisor dashboard stats (present/absent counts) cover daily. A future analytics task can add monthly charts.

### Type Consistency
- `SiteActivityLog.photoUrls` is `Json @default("[]")` in schema → typed as `string[]` in TS and `List<String>` in Dart ✓
- `SiteComplaint.attachments` same pattern ✓
- `ComplaintCategory` enum values match between Prisma, NestJS DTOs, and Flutter constants ✓
