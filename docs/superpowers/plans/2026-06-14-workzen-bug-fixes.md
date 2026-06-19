# WorkZen Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 22 identified bugs across auth, light theme, dropdowns, search, backend security, and API quality.

**Architecture:** Four phases — Critical/Security → UI/UX → API Quality → Cleanup. Each task is self-contained and commits independently.

**Tech Stack:** Next.js 15 (App Router), NestJS, Prisma ORM, Zustand, TanStack Query, Tailwind CSS + CSS variables, TypeScript.

---

## File Map

### Modified — Frontend (`apps/web/src/`)
- `app/(dashboard)/layout.tsx` — fix auth flicker (render null when unauthenticated)
- `app/globals.css` — fix CSS rgba selector to match React's space-serialized format
- `app/(dashboard)/employees/page.tsx` — fix STATUS_CONFIG colors + header text
- `app/(dashboard)/tenders/page.tsx` — fix STATUS_CONFIG colors + header text
- `app/(dashboard)/clients/page.tsx` — fix header text colors
- `app/(dashboard)/employees/create-employee-modal.tsx` — fix modal bg + label colors
- `app/(dashboard)/tenders/create-tender-modal.tsx` — fix modal bg + label colors
- `app/(dashboard)/clients/create-client-modal.tsx` — fix modal bg + label colors
- `components/layout/header.tsx` — wire up global search
- `app/(dashboard)/payroll/page.tsx` — add search input
- `app/(dashboard)/compliance/page.tsx` — add search input
- `app/(dashboard)/attendance/page.tsx` — add search input
- `app/(dashboard)/recruitment/page.tsx` — add search input
- `app/(dashboard)/assets/page.tsx` — add search input
- `app/(dashboard)/documents/page.tsx` — add search input
- `app/(dashboard)/visitors/page.tsx` — add search input
- `app/(dashboard)/finance/page.tsx` — add search input

### Modified — Backend (`apps/api/src/`)
- `common/decorators/current-user.decorator.ts` — throw on missing tenantId
- `common/guards/rbac.guard.ts` — verify no changes needed (reference)
- `work-orders/work-orders.controller.ts` — add RbacGuard + use decorators
- `work-orders/work-orders.service.ts` — add tenant check to updatePosition/updateMilestone
- `visitors/visitors.controller.ts` — add RbacGuard
- `auth/auth.service.ts` — fix logout() and confirmTwoFactor() return values
- `auth/strategies/jwt.strategy.ts` — return only safe user fields
- `users/users.service.ts` — replace Error with ConflictException
- `attendance/attendance.service.ts` — replace Error with NotFoundException
- `masters/masters.service.ts` — remove updatedBy: undefined
- `finance/cost-center.service.ts` — remove updatedBy: undefined
- `finance/rate.service.ts` — remove updatedBy: undefined

### Modified — Schema
- `packages/database/prisma/schema.prisma` — add onDelete: Cascade to 6 relations

### Modified — Config
- `.env.example` — fix PORT from 4000 to 3001

---

## PHASE 1 — Critical & Security

---

### Task 1: Fix Auth Flicker in Dashboard Layout

**Files:**
- Modify: `apps/web/src/app/(dashboard)/layout.tsx`

**Root cause:** The layout renders `<Sidebar>`, `<Header>`, and `{children}` immediately after hydration, then checks auth in `useEffect` one frame later. That one frame is visible as a flash.

**Fix:** Block rendering of the whole layout — not just children — until `isAuthenticated` is confirmed.

- [ ] **Step 1: Edit the layout**

In `apps/web/src/app/(dashboard)/layout.tsx`, change:

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { useUiStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useUiStore();
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const sidebarWidth = sidebarCollapsed ? 72 : 260;

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, _hasHydrated, router]);

  if (!_hasHydrated) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--wz-page-bg)' }}>
      <Sidebar />
      <div
        className="transition-all duration-300"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <Header />
        <main
          className="min-h-screen p-6 page-enter"
          style={{ paddingTop: 'calc(64px + 24px)' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
```

To:

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { useUiStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useUiStore();
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const sidebarWidth = sidebarCollapsed ? 72 : 260;

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, _hasHydrated, router]);

  // Block ALL rendering until Zustand has rehydrated from localStorage.
  // Once hydrated, block if not authenticated — redirect fires in useEffect above.
  if (!_hasHydrated || !isAuthenticated) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--wz-page-bg)' }}>
      <Sidebar />
      <div
        className="transition-all duration-300"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <Header />
        <main
          className="min-h-screen p-6 page-enter"
          style={{ paddingTop: 'calc(64px + 24px)' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/layout.tsx
git commit -m "fix: eliminate dashboard flash by blocking render until auth confirmed"
```

---

### Task 2: Fix TenantId Decorator — Throw on Missing Value

**Files:**
- Modify: `apps/api/src/common/decorators/current-user.decorator.ts`

- [ ] **Step 1: Edit the decorator**

Replace entire file content:

```typescript
import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId;
    if (!tenantId) throw new UnauthorizedException('Tenant context required');
    return tenantId;
  },
);
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/common/decorators/current-user.decorator.ts
git commit -m "fix: throw UnauthorizedException when tenantId missing from JWT context"
```

---

### Task 3: Add RbacGuard to WorkOrders Controller

**Files:**
- Modify: `apps/api/src/work-orders/work-orders.controller.ts`

- [ ] **Step 1: Check existing RbacGuard and RequirePermissions usage**

Open `apps/api/src/clients/clients.controller.ts` to see the pattern — it already uses `@UseGuards(JwtAuthGuard, TenantGuard, RbacGuard)` and `@RequirePermissions('client:read')`. Use the same pattern.

- [ ] **Step 2: Replace the controller file**

Replace `apps/api/src/work-orders/work-orders.controller.ts` with:

```typescript
import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, TenantGuard, RbacGuard)
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly service: WorkOrdersService) {}

  @Get('dashboard') @RequirePermissions('work_order:read')
  getDashboard(@TenantId() tenantId: string) {
    return this.service.getDashboard(tenantId);
  }

  @Get() @RequirePermissions('work_order:read')
  findAll(@TenantId() tenantId: string, @Query() query: any) {
    return this.service.findAll(tenantId, query);
  }

  @Get(':id') @RequirePermissions('work_order:read')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post() @RequirePermissions('work_order:write')
  create(@TenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.service.create(tenantId, userId, dto);
  }

  @Patch(':id') @RequirePermissions('work_order:write')
  update(@TenantId() tenantId: string, @Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.service.update(tenantId, id, userId, dto);
  }

  @Get(':id/positions') @RequirePermissions('work_order:read')
  getPositions(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.getPositions(tenantId, id);
  }

  @Post(':id/positions') @RequirePermissions('work_order:write')
  createPosition(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.createPosition(tenantId, id, dto);
  }

  @Patch('positions/:posId') @RequirePermissions('work_order:write')
  updatePosition(@TenantId() tenantId: string, @Param('posId') posId: string, @Body() dto: any) {
    return this.service.updatePosition(tenantId, posId, dto);
  }

  @Get(':id/milestones') @RequirePermissions('work_order:read')
  getMilestones(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.getMilestones(tenantId, id);
  }

  @Post(':id/milestones') @RequirePermissions('work_order:write')
  createMilestone(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.createMilestone(tenantId, id, dto);
  }

  @Patch('milestones/:milId') @RequirePermissions('work_order:write')
  updateMilestone(@TenantId() tenantId: string, @Param('milId') milId: string, @Body() dto: any) {
    return this.service.updateMilestone(tenantId, milId, dto);
  }

  @Get(':id/amendments') @RequirePermissions('work_order:read')
  getAmendments(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.getAmendments(tenantId, id);
  }

  @Post(':id/amendments') @RequirePermissions('work_order:write')
  createAmendment(@TenantId() tenantId: string, @Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.service.createAmendment(tenantId, id, userId, dto);
  }

  @Get(':id/fulfillments') @RequirePermissions('work_order:read')
  getFulfillments(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.getFulfillments(tenantId, id);
  }

  @Post(':id/fulfillments') @RequirePermissions('work_order:write')
  createFulfillment(@TenantId() tenantId: string, @Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.service.createFulfillment(tenantId, id, userId, dto);
  }

  @Patch('fulfillments/:fulId') @RequirePermissions('work_order:write')
  updateFulfillment(@TenantId() tenantId: string, @Param('fulId') fulId: string, @Body() dto: any) {
    return this.service.updateFulfillment(tenantId, fulId, dto);
  }

  @Get(':id/invoices') @RequirePermissions('work_order:read')
  getInvoices(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.getInvoices(tenantId, id);
  }

  @Post(':id/invoices') @RequirePermissions('work_order:write')
  createInvoice(@TenantId() tenantId: string, @Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.service.createInvoice(tenantId, id, userId, dto);
  }

  @Get(':id/payments') @RequirePermissions('work_order:read')
  getPayments(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.getPayments(tenantId, id);
  }

  @Post(':id/payments') @RequirePermissions('work_order:write')
  createPayment(@TenantId() tenantId: string, @Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.service.createPayment(tenantId, id, userId, dto);
  }
}
```

- [ ] **Step 3: Add RbacGuard to Visitors controller**

Replace `apps/api/src/visitors/visitors.controller.ts` with:

```typescript
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { VisitorsService } from './visitors.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, TenantGuard, RbacGuard)
@Controller('visitors')
export class VisitorsController {
  constructor(private readonly service: VisitorsService) {}

  @Get('dashboard') @RequirePermissions('visitor:read')
  dashboard(@TenantId() tenantId: string) {
    return this.service.getDashboard(tenantId);
  }

  @Get() @RequirePermissions('visitor:read')
  findVisitors(@TenantId() tenantId: string, @Query() query: any) {
    return this.service.findVisitors(tenantId, query);
  }

  @Patch(':id') @RequirePermissions('visitor:write')
  updateVisitor(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.updateVisitor(tenantId, id, dto);
  }

  @Patch(':id/blacklist') @RequirePermissions('visitor:write')
  toggleBlacklist(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.service.toggleBlacklist(tenantId, id, body.blacklist, body.reason);
  }

  @Get('logs') @RequirePermissions('visitor:read')
  getLogs(@TenantId() tenantId: string, @Query() query: any) {
    return this.service.getLogs(tenantId, query);
  }

  @Post('check-in') @RequirePermissions('visitor:write')
  checkIn(@TenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.service.checkIn(tenantId, userId, dto);
  }

  @Patch('logs/:id/check-out') @RequirePermissions('visitor:write')
  checkOut(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.checkOut(tenantId, id);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/work-orders/work-orders.controller.ts apps/api/src/visitors/visitors.controller.ts
git commit -m "fix: add RbacGuard and permission checks to WorkOrders and Visitors controllers"
```

---

### Task 4: Fix Tenant Isolation in WorkOrder Service Updates

**Files:**
- Modify: `apps/api/src/work-orders/work-orders.service.ts`

- [ ] **Step 1: Fix updatePosition and updateMilestone**

In `apps/api/src/work-orders/work-orders.service.ts`:

Replace:
```typescript
async updatePosition(tenantId: string, id: string, dto: any) {
  return this.prisma.workOrderPosition.update({ where: { id }, data: dto });
}
```
With:
```typescript
async updatePosition(tenantId: string, id: string, dto: any) {
  const pos = await this.prisma.workOrderPosition.findFirst({ where: { id, tenantId } });
  if (!pos) throw new NotFoundException('Position not found');
  return this.prisma.workOrderPosition.update({ where: { id }, data: dto });
}
```

Replace:
```typescript
async updateMilestone(tenantId: string, id: string, dto: any) {
  return this.prisma.workOrderMilestone.update({ where: { id }, data: dto });
}
```
With:
```typescript
async updateMilestone(tenantId: string, id: string, dto: any) {
  const mil = await this.prisma.workOrderMilestone.findFirst({ where: { id, tenantId } });
  if (!mil) throw new NotFoundException('Milestone not found');
  return this.prisma.workOrderMilestone.update({ where: { id }, data: dto });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/work-orders/work-orders.service.ts
git commit -m "fix: add tenant ownership check before WorkOrder position and milestone updates"
```

---

### Task 5: Add CASCADE DELETE to Schema Relations

**Files:**
- Modify: `packages/database/prisma/schema.prisma`

- [ ] **Step 1: Find each relation and add onDelete: Cascade**

Search for `TenderDocument` relation on `tenderId` field and add cascade:
```prisma
tenderId  String
tender    Tender @relation(fields: [tenderId], references: [id], onDelete: Cascade)
```

Search for `TenderRenewal` relation on `tenderId` and add cascade:
```prisma
tenderId  String
tender    Tender @relation(fields: [tenderId], references: [id], onDelete: Cascade)
```

Search for `WorkOrderPosition` relation on `workOrderId` and add cascade:
```prisma
workOrderId  String
workOrder    WorkOrder @relation(fields: [workOrderId], references: [id], onDelete: Cascade)
```

Search for `WorkOrderMilestone` relation on `workOrderId` and add cascade:
```prisma
workOrderId  String
workOrder    WorkOrder @relation(fields: [workOrderId], references: [id], onDelete: Cascade)
```

Search for `WorkOrderAmendment` relation on `workOrderId` and add cascade:
```prisma
workOrderId  String
workOrder    WorkOrder @relation(fields: [workOrderId], references: [id], onDelete: Cascade)
```

Search for `WorkOrderInvoice` relation on `workOrderId` and add cascade:
```prisma
workOrderId  String
workOrder    WorkOrder @relation(fields: [workOrderId], references: [id], onDelete: Cascade)
```

Search for `WorkOrderPayment` relation on `workOrderId` and add cascade:
```prisma
workOrderId  String
workOrder    WorkOrder @relation(fields: [workOrderId], references: [id], onDelete: Cascade)
```

Search for `WorkOrderFulfillment` relation on `workOrderId` and add cascade:
```prisma
workOrderId  String
workOrder    WorkOrder @relation(fields: [workOrderId], references: [id], onDelete: Cascade)
```

- [ ] **Step 2: Generate and apply migration**

```bash
cd packages/database
npx prisma migrate dev --name add_cascade_deletes
```

Expected: Migration created and applied.

- [ ] **Step 3: Commit**

```bash
git add packages/database/prisma/schema.prisma packages/database/prisma/migrations/
git commit -m "fix: add onDelete: Cascade to TenderDocument, TenderRenewal, and all WorkOrder child relations"
```

---

## PHASE 2 — UI/UX

---

### Task 6: Fix Light Theme — CSS Selector

**Files:**
- Modify: `apps/web/src/app/globals.css`

**Root cause:** React serializes `rgba(255,255,255,0.4)` in JSX `style` props as `rgba(255, 255, 255, 0.4)` (spaces after commas). The existing CSS selector `[style*="color: rgba(255,255,255"]` doesn't match because it has no spaces.

- [ ] **Step 1: Add the space-variant selector to globals.css**

In `apps/web/src/app/globals.css`, find the existing block:
```css
/* rgba(255,255,255,X) text → dark slate (covers 0.1 through 0.95) */
html:not(.dark) [style*="color: rgba(255,255,255"] {
  color: #334155 !important;
}
```

Replace with:
```css
/* rgba(255,255,255,X) text → dark slate. React serializes with spaces, so match both. */
html:not(.dark) [style*="color: rgba(255,255,255"],
html:not(.dark) [style*="color: rgba(255, 255, 255"] {
  color: #334155 !important;
}
```

Also add space-variant for background rgba overrides — find:
```css
/* Hardcoded dark hex backgrounds (modals, sticky headers, cards) */
```

Just before that comment, add:
```css
/* rgba(255,255,255,X) backgrounds (dark-mode ghost cards) */
html:not(.dark) [style*="background: rgba(255,255,255"],
html:not(.dark) [style*="background: rgba(255, 255, 255"] {
  background: var(--wz-card-bg) !important;
  border-color: var(--wz-card-border) !important;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "fix: extend light-mode CSS overrides to match React's space-serialized rgba() format"
```

---

### Task 7: Fix Light Theme — Status Badge Colors in Page Files

**Files:**
- Modify: `apps/web/src/app/(dashboard)/employees/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/tenders/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/clients/page.tsx`

The `STATUS_CONFIG` objects use `rgba(255,255,255,X)` colors for "neutral" statuses (INACTIVE, DRAFT) which are invisible on light backgrounds. Replace with theme-aware slate colors.

- [ ] **Step 1: Fix employees/page.tsx STATUS_CONFIG and header**

In `apps/web/src/app/(dashboard)/employees/page.tsx`:

Replace:
```tsx
const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  ACTIVE:     { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Active' },
  INACTIVE:   { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.06)', label: 'Inactive' },
  ON_LEAVE:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'On Leave' },
  DEPLOYED:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: 'Deployed' },
  TERMINATED: { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)', label: 'Terminated' },
};
```
With:
```tsx
const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  ACTIVE:     { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Active' },
  INACTIVE:   { color: '#64748b', bg: 'rgba(100,116,139,0.1)', label: 'Inactive' },
  ON_LEAVE:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'On Leave' },
  DEPLOYED:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: 'Deployed' },
  TERMINATED: { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)', label: 'Terminated' },
};
```

Replace page header:
```tsx
<h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
  Employees
</h2>
<p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
  Manage your workforce — onboard, update, and track all employees
</p>
```
With:
```tsx
<h2 className="text-xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>
  Employees
</h2>
<p className="text-sm mt-0.5" style={{ color: 'var(--wz-text-muted)' }}>
  Manage your workforce — onboard, update, and track all employees
</p>
```

Replace stat card label and value:
```tsx
<p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
  {s.label}
</p>
```
With:
```tsx
<p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--wz-text-muted)' }}>
  {s.label}
</p>
```

Replace stat card value:
```tsx
<p className="text-2xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
  {s.value}
</p>
```
With:
```tsx
<p className="text-2xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>
  {s.value}
</p>
```

- [ ] **Step 2: Fix tenders/page.tsx STATUS_CONFIG and header**

In `apps/web/src/app/(dashboard)/tenders/page.tsx`:

Replace:
```tsx
const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  DRAFT:            { color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.06)', label: 'Draft' },
```
With:
```tsx
const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  DRAFT:            { color: '#64748b', bg: 'rgba(100,116,139,0.1)', label: 'Draft' },
```

Replace page header:
```tsx
<h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>Tenders</h2>
<p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
  Manage government contracts, bids, and work orders
</p>
```
With:
```tsx
<h2 className="text-xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>Tenders</h2>
<p className="text-sm mt-0.5" style={{ color: 'var(--wz-text-muted)' }}>
  Manage government contracts, bids, and work orders
</p>
```

Replace stat card label color (same pattern as employees — `rgba(255,255,255,0.4)` → `var(--wz-text-muted)`) and stat value (`text-white` → `var(--wz-text-primary)`).

- [ ] **Step 3: Fix clients/page.tsx header**

In `apps/web/src/app/(dashboard)/clients/page.tsx`, find and replace any `text-white` classes and `rgba(255,255,255,...)` inline colors in the page header and stat cards using the same `var(--wz-text-primary)` / `var(--wz-text-muted)` pattern.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/employees/page.tsx \
        apps/web/src/app/\(dashboard\)/tenders/page.tsx \
        apps/web/src/app/\(dashboard\)/clients/page.tsx
git commit -m "fix: replace hardcoded white/rgba colors with CSS variable tokens in list page headers and stat cards"
```

---

### Task 8: Fix Light Theme — Modal Backgrounds and Label Colors

**Files:**
- Modify: `apps/web/src/app/(dashboard)/employees/create-employee-modal.tsx`
- Modify: `apps/web/src/app/(dashboard)/tenders/create-tender-modal.tsx`
- Modify: `apps/web/src/app/(dashboard)/clients/create-client-modal.tsx`

- [ ] **Step 1: Fix create-employee-modal.tsx**

Replace modal container background:
```tsx
<div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl" style={{ background: '#0d1628', border: '1px solid rgba(255,255,255,0.08)' }}>
  <div className="flex items-center justify-between p-6 sticky top-0 z-10" style={{ background: '#0d1628', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
```
With:
```tsx
<div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl" style={{ background: 'var(--wz-card-bg)', border: '1px solid var(--wz-card-border)' }}>
  <div className="flex items-center justify-between p-6 sticky top-0 z-10" style={{ background: 'var(--wz-card-bg)', borderBottom: '1px solid var(--wz-card-border)' }}>
```

Replace modal title and subtitle:
```tsx
<h3 className="font-semibold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
<p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
```
With:
```tsx
<h3 className="font-semibold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>
<p className="text-xs mt-0.5" style={{ color: 'var(--wz-text-muted)' }}>
```

Replace field label color inside the `F` component:
```tsx
<label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>
```
With:
```tsx
<label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>
```

Replace close button icon:
```tsx
<X size={18} style={{ color: 'rgba(255,255,255,0.5)' }} />
```
With:
```tsx
<X size={18} style={{ color: 'var(--wz-text-muted)' }} />
```

- [ ] **Step 2: Apply same pattern to create-tender-modal.tsx**

Find and replace all `background: '#0d1628'` → `background: 'var(--wz-card-bg)'`, `rgba(255,255,255,0.08)` border → `var(--wz-card-border)`, label colors → `var(--wz-text-secondary)`, title/subtitle colors → `var(--wz-text-primary)` / `var(--wz-text-muted)`.

- [ ] **Step 3: Apply same pattern to create-client-modal.tsx**

Same replacements as above.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/employees/create-employee-modal.tsx \
        apps/web/src/app/\(dashboard\)/tenders/create-tender-modal.tsx \
        apps/web/src/app/\(dashboard\)/clients/create-client-modal.tsx
git commit -m "fix: replace hardcoded dark modal backgrounds and rgba label colors with CSS variable tokens"
```

---

### Task 9: Wire Up Header Global Search

**Files:**
- Modify: `apps/web/src/components/layout/header.tsx`

The header search input has no `onChange` handler. Implement a simple search that navigates to the relevant list page with the search pre-filled via URL query string.

- [ ] **Step 1: Update header.tsx**

Replace the search section in `apps/web/src/components/layout/header.tsx`:

```tsx
'use client';

import { Bell, Search, Menu, Sun, Moon } from 'lucide-react';
import { useUiStore } from '@/stores/ui.store';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState, useRef } from 'react';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/tenders': 'Tender Management',
  '/work-orders': 'Work Orders',
  '/clients': 'Client Management',
  '/employees': 'Employee Management',
  '/recruitment': 'Recruitment',
  '/deployment': 'Deployment Management',
  '/attendance': 'Attendance',
  '/payroll': 'Payroll',
  '/compliance': 'Compliance',
  '/billing': 'Billing & Invoicing',
  '/finance': 'Finance',
  '/assets': 'Asset Management',
  '/documents': 'Documents',
  '/workflows': 'Workflows',
  '/reports': 'Reports & Analytics',
  '/logistics': 'Logistics',
  '/visitors': 'Visitor Management',
  '/settings': 'Settings',
};

// Pages that support ?search= query param
const SEARCHABLE_PAGES = ['/employees', '/clients', '/tenders', '/payroll', '/compliance', '/attendance', '/recruitment', '/assets', '/documents', '/visitors'];

export function Header() {
  const { toggleSidebar } = useUiStore();
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const title = pageTitles[pathname] ?? pageTitles[`/${pathname.split('/')[1]}`] ?? 'WorkZen';

  const [mounted, setMounted] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  // Keyboard shortcut Cmd/Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !globalSearch.trim()) return;
    const currentSection = `/${pathname.split('/')[1]}`;
    const target = SEARCHABLE_PAGES.includes(currentSection) ? currentSection : '/employees';
    router.push(`${target}?search=${encodeURIComponent(globalSearch.trim())}`);
    setGlobalSearch('');
  };

  const isDark = resolvedTheme === 'dark';

  return (
    <header
      className="fixed top-0 right-0 z-20 flex items-center px-6 gap-4 transition-all duration-300"
      style={{
        left: 'var(--sidebar-current-width, 260px)',
        height: '64px',
        background: 'var(--wz-header-bg)',
        borderBottom: '1px solid var(--wz-header-border)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
        style={{ color: 'var(--wz-text-muted)' }}
      >
        <Menu size={18} />
      </button>

      <div className="flex-1">
        <h1 className="text-base font-semibold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>
          {title}
        </h1>
      </div>

      <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl w-64"
        style={{ background: 'var(--wz-input-bg)', border: '1px solid var(--wz-input-border)' }}>
        <Search size={14} style={{ color: 'var(--wz-text-muted)' }} />
        <input
          ref={searchRef}
          value={globalSearch}
          onChange={e => setGlobalSearch(e.target.value)}
          onKeyDown={handleSearch}
          placeholder="Search... (⌘K)"
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: 'var(--wz-text-secondary)' }}
        />
      </div>

      {mounted && (
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="p-2 rounded-xl transition-all duration-200"
          style={{ background: 'var(--wz-input-bg)', border: '1px solid var(--wz-input-border)', color: 'var(--wz-text-secondary)' }}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      )}

      <button className="relative p-2 rounded-xl transition-all"
        style={{ background: 'var(--wz-input-bg)', border: '1px solid var(--wz-input-border)' }}>
        <Bell size={16} style={{ color: 'var(--wz-text-muted)' }} />
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full"
          style={{ background: '#f43f5e', boxShadow: '0 0 6px rgba(244,63,94,0.6)' }} />
      </button>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/layout/header.tsx
git commit -m "feat: wire up header global search — Enter navigates to current section with search query, Cmd+K focuses"
```

---

### Task 10: Add Search to List Pages That Are Missing It

**Files:**
- Modify: `apps/web/src/app/(dashboard)/payroll/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/compliance/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/attendance/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/recruitment/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/assets/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/documents/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/visitors/page.tsx`

For each page:
1. Read the file to see existing filter/search state
2. If no `search` state: add `const [search, setSearch] = useState('')`
3. Add `search: search || undefined` to the API query params
4. Add a search input `<input>` before or alongside existing filters with `onChange={e => { setSearch(e.target.value); setPage(1); }}`
5. Handle `?search=` URL param for global header search integration

Pattern for each page (adapt to existing structure):

```tsx
// 1. Add import
import { useSearchParams } from 'next/navigation';

// 2. Add state (inside component)
const searchParams = useSearchParams();
const [search, setSearch] = useState(searchParams.get('search') ?? '');
const [page, setPage] = useState(1);

// 3. Add to query params
queryFn: () => someApi.list({ search: search || undefined, page, limit: 15 })

// 4. Add search input in filters section
<div className="relative flex-1 min-w-52">
  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--wz-text-muted)' }} />
  <input
    value={search}
    onChange={e => { setSearch(e.target.value); setPage(1); }}
    placeholder="Search..."
    className="input-field w-full pl-9"
  />
</div>
```

- [ ] **Step 1: Add search to payroll/page.tsx**
- [ ] **Step 2: Add search to compliance/page.tsx**
- [ ] **Step 3: Add search to attendance/page.tsx**
- [ ] **Step 4: Add search to recruitment/page.tsx**
- [ ] **Step 5: Add search to assets/page.tsx**
- [ ] **Step 6: Add search to documents/page.tsx**
- [ ] **Step 7: Add search to visitors/page.tsx**

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/payroll/page.tsx \
        apps/web/src/app/\(dashboard\)/compliance/page.tsx \
        apps/web/src/app/\(dashboard\)/attendance/page.tsx \
        apps/web/src/app/\(dashboard\)/recruitment/page.tsx \
        apps/web/src/app/\(dashboard\)/assets/page.tsx \
        apps/web/src/app/\(dashboard\)/documents/page.tsx \
        apps/web/src/app/\(dashboard\)/visitors/page.tsx
git commit -m "feat: add search input to all list pages — wired to API query and URL param from global header search"
```

---

## PHASE 3 — API Quality

---

### Task 11: Fix Auth Service — Missing Return Values

**Files:**
- Modify: `apps/api/src/auth/auth.service.ts`

- [ ] **Step 1: Fix logout() and confirmTwoFactor()**

In `apps/api/src/auth/auth.service.ts`:

Replace:
```typescript
async logout(userId: string) {
  await this.prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
```
With:
```typescript
async logout(userId: string) {
  await this.prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return { message: 'Logged out successfully' };
}
```

Replace:
```typescript
async confirmTwoFactor(userId: string, token: string) {
  const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const valid = speakeasy.totp.verify({ secret: user.twoFaSecret!, encoding: 'base32', token });
  if (!valid) throw new BadRequestException('Invalid token');
  await this.prisma.user.update({ where: { id: userId }, data: { twoFaEnabled: true } });
}
```
With:
```typescript
async confirmTwoFactor(userId: string, token: string) {
  const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const valid = speakeasy.totp.verify({ secret: user.twoFaSecret!, encoding: 'base32', token });
  if (!valid) throw new BadRequestException('Invalid token');
  await this.prisma.user.update({ where: { id: userId }, data: { twoFaEnabled: true } });
  return { twoFaEnabled: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/auth/auth.service.ts
git commit -m "fix: add return values to logout() and confirmTwoFactor() — previously returned undefined"
```

---

### Task 12: Fix JWT Strategy — Return Only Safe Fields

**Files:**
- Modify: `apps/api/src/auth/strategies/jwt.strategy.ts`

- [ ] **Step 1: Edit jwt.strategy.ts**

Replace:
```typescript
async validate(payload: { sub: string; tenantId: string; email: string }) {
  const user = await this.prisma.user.findUnique({
    where: { id: payload.sub },
    include: { userRoles: { include: { role: true } } },
  });
  if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException();
  return { ...user, tenantId: payload.tenantId };
}
```
With:
```typescript
async validate(payload: { sub: string; tenantId: string; email: string }) {
  const user = await this.prisma.user.findUnique({
    where: { id: payload.sub },
    include: { userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } } },
  });
  if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException();
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    tenantId: payload.tenantId,
    userRoles: user.userRoles,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/auth/strategies/jwt.strategy.ts
git commit -m "fix: return only safe user fields from JWT strategy — exclude passwordHash and sensitive data"
```

---

### Task 13: Fix Plain Error → NestJS Exceptions

**Files:**
- Modify: `apps/api/src/users/users.service.ts`
- Modify: `apps/api/src/attendance/attendance.service.ts`

- [ ] **Step 1: Fix users.service.ts**

In `apps/api/src/users/users.service.ts`, the import line already has `NotFoundException, BadRequestException`. Add `ConflictException` to imports if not present:

```typescript
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
```

Replace:
```typescript
if (exists) throw new Error('User with this email already exists');
```
With:
```typescript
if (exists) throw new ConflictException('User with this email already exists');
```

- [ ] **Step 2: Fix attendance.service.ts**

In `apps/api/src/attendance/attendance.service.ts`, ensure `NotFoundException` is imported, then:

Replace:
```typescript
if (!reg) throw new Error('Regularization not found');
```
With:
```typescript
if (!reg) throw new NotFoundException('Regularization not found');
```

Replace:
```typescript
if (!p) throw new Error('Policy not found');
```
With:
```typescript
if (!p) throw new NotFoundException('Policy not found');
```

Find and replace remaining `throw new Error(` patterns in attendance.service.ts with appropriate NestJS exceptions (NotFoundException for "not found" cases).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/users/users.service.ts apps/api/src/attendance/attendance.service.ts
git commit -m "fix: replace plain Error throws with NestJS ConflictException/NotFoundException for correct HTTP status codes"
```

---

### Task 14: Remove updatedBy: undefined from Service Files

**Files:**
- Modify: `apps/api/src/masters/masters.service.ts`
- Modify: `apps/api/src/finance/cost-center.service.ts`
- Modify: `apps/api/src/finance/rate.service.ts`

- [ ] **Step 1: Fix masters.service.ts**

Replace:
```typescript
return this.prisma.designation.update({ where: { id }, data: { ...dto as any, updatedBy: undefined } });
```
With:
```typescript
return this.prisma.designation.update({ where: { id }, data: dto as any });
```

Search for all other `updatedBy: undefined` occurrences in this file and remove them.

- [ ] **Step 2: Fix cost-center.service.ts**

Replace:
```typescript
return this.prisma.costCenter.update({ where: { id }, data: { ...dto as any, updatedBy: undefined } });
```
With:
```typescript
return this.prisma.costCenter.update({ where: { id }, data: dto as any });
```

- [ ] **Step 3: Fix rate.service.ts**

Replace:
```typescript
return this.prisma.rateMaster.update({
  where: { id },
  data: { ...dto as any, updatedBy: undefined },
});
```
With:
```typescript
return this.prisma.rateMaster.update({
  where: { id },
  data: dto as any,
});
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/masters/masters.service.ts \
        apps/api/src/finance/cost-center.service.ts \
        apps/api/src/finance/rate.service.ts
git commit -m "fix: remove updatedBy: undefined from update calls — was silently overwriting audit field with null"
```

---

## PHASE 4 — Cleanup

---

### Task 15: Fix .env.example PORT Mismatch

**Files:**
- Modify: `.env.example`
- Modify: `apps/web/next.config.ts`

- [ ] **Step 1: Fix .env.example**

Find `PORT=4000` (or `API_URL=http://localhost:4000`) in `.env.example` and change to match `.env`:

```
PORT=3001
```

- [ ] **Step 2: Fix next.config.ts rewrite fallback**

In `apps/web/next.config.ts`, line 14 has fallback port 4000:
```typescript
destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1/:path*`,
```
Change to:
```typescript
destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/v1/:path*`,
```

- [ ] **Step 3: Commit**

```bash
git add .env.example apps/web/next.config.ts
git commit -m "fix: correct fallback API port from 4000 to 3001 in .env.example and next.config.ts"
```
