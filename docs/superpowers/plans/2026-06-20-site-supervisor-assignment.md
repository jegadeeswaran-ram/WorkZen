# Site Supervisor Assignment Module — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full Site Supervisor & Employee Assignment module so HR/Operations managers can assign a supervisor to each site and manage which employees are deployed under that supervisor.

**Architecture:** Three new API endpoints on the existing `DeploymentController` + two new web pages under `/deployment/site-management`. No new Prisma models needed — `Site.supervisorId` already exists; assignment uses the existing `Deployment` model. The web UI is split into two panels: Sites+Supervisors (left) and Site Team (right).

**Tech Stack:** NestJS, Prisma, Next.js 15 App Router, TanStack Query, Shadcn/UI (`Table`, `Sheet`, `Dialog`, `Select`, `Command`, `Badge`).

## Global Constraints

- Every Prisma query must filter by `tenantId`
- API responses: `TransformInterceptor` wraps automatically — controllers must NOT manually wrap in `{ success, data, message }`. Return data directly or `{ data, meta }` for pagination.
- All new API routes guarded by `JwtAuthGuard`, `TenantGuard`, `RbacGuard`
- Permissions: `deployment:write` for mutations, `deployment:read` for reads
- Web: Use `api.get/post/patch/delete` (axios client at `src/lib/api.ts`) — baseURL is already `/api/v1`, do NOT include that prefix in route strings
- `SelectContent` must use `position="popper"` inside Sheets/Dialogs to avoid overlap
- `[data-slot="sheet-content"]` and `[data-slot="select-content"]` already have solid dark backgrounds via `globals.css` — no need to add inline styles

---

## File Map

### API — New Methods on Existing Module
| File | Action | Purpose |
|---|---|---|
| `apps/api/src/deployment/deployment.service.ts` | Modify | Add 5 new methods: `listSupervisors`, `assignSupervisor`, `getSiteTeam`, `assignEmployeeToSite`, `removeEmployeeFromSite` |
| `apps/api/src/deployment/deployment.controller.ts` | Modify | Add 5 new routes for the new service methods |

### Web — New Pages & Components
| File | Action | Purpose |
|---|---|---|
| `apps/web/src/app/(dashboard)/deployment/site-management/page.tsx` | Create | Main page: split-pane (sites list left, team right) |
| `apps/web/src/components/deployment/assign-supervisor-dialog.tsx` | Create | Dialog to pick a SITE_SUPERVISOR user and assign to a site |
| `apps/web/src/components/deployment/assign-employee-sheet.tsx` | Create | Sheet to search employees and deploy them to a site |
| `apps/web/src/app/(dashboard)/deployment/page.tsx` | Modify | Add "Site Management" tab link |

---

## Task 1: API — `GET /deployment/supervisors` and `PATCH /deployment/sites/:id/supervisor`

**Files:**
- Modify: `apps/api/src/deployment/deployment.service.ts`
- Modify: `apps/api/src/deployment/deployment.controller.ts`

**Interfaces:**
- Produces:
  - `GET /deployment/supervisors` → `User[]` with `{ id, firstName, lastName, email, supervisedSites }`
  - `PATCH /deployment/sites/:id/supervisor` body: `{ supervisorId: string | null }` → updated `Site`

- [ ] **Step 1: Add `listSupervisors` method to deployment service**

In `apps/api/src/deployment/deployment.service.ts`, add after `getSites`:

```typescript
async listSupervisors(tenantId: string) {
  // Find all users who have the SITE_SUPERVISOR role in this tenant
  return this.prisma.user.findMany({
    where: {
      tenantId,
      deletedAt: null,
      userRoles: {
        some: {
          role: { name: 'SITE_SUPERVISOR' },
        },
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      supervisedSites: {
        where: { tenantId, isActive: true },
        select: { id: true, name: true, code: true },
      },
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });
}
```

- [ ] **Step 2: Add `assignSupervisor` method to deployment service**

In the same file, add after `listSupervisors`:

```typescript
async assignSupervisor(tenantId: string, siteId: string, supervisorId: string | null) {
  const site = await this.prisma.site.findFirst({ where: { id: siteId, tenantId } });
  if (!site) throw new NotFoundException('Site not found');
  if (supervisorId) {
    // Validate the user exists and has SITE_SUPERVISOR role
    const user = await this.prisma.user.findFirst({
      where: { id: supervisorId, tenantId, userRoles: { some: { role: { name: 'SITE_SUPERVISOR' } } } },
    });
    if (!user) throw new NotFoundException('Supervisor not found or does not have SITE_SUPERVISOR role');
  }
  return this.prisma.site.update({
    where: { id: siteId },
    data: { supervisorId },
    include: { supervisor: { select: { id: true, firstName: true, lastName: true, email: true } } },
  });
}
```

- [ ] **Step 3: Add routes to deployment controller**

In `apps/api/src/deployment/deployment.controller.ts`, add these two routes (before the generic `@Get()` route to avoid path conflicts):

```typescript
@Get('supervisors') @RequirePermissions('deployment:read')
listSupervisors(@TenantId() t: string) { return this.service.listSupervisors(t); }

@Patch('sites/:id/supervisor') @RequirePermissions('deployment:write')
assignSupervisor(@TenantId() t: string, @Param('id') id: string, @Body('supervisorId') supervisorId: string | null) {
  return this.service.assignSupervisor(t, id, supervisorId ?? null);
}
```

- [ ] **Step 4: Verify with PowerShell**

Start the API (`npm run dev` in `apps/api`) then:

```powershell
$resp = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"admin@workzen.in","password":"Admin@123!"}'
$token = $resp.data.accessToken
$h = @{ Authorization = "Bearer $token" }

# List supervisors
$sup = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/deployment/supervisors" -Headers $h
Write-Host "Supervisors: $($sup.data.Count)"  # expect 3 (Vikram, Anita, Suresh)
$sup.data | Select firstName, lastName, @{N='sites';E={$_.supervisedSites.Count}} | Format-Table

# Get sites to find an ID without supervisor
$sites = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/deployment/sites" -Headers $h
$unassigned = $sites.data | Where-Object { -not $_.supervisorId } | Select-Object -First 1
Write-Host "Testing with site: $($unassigned.name) ($($unassigned.id))"

# Assign a supervisor to that site
$sup1 = $sup.data[0]
$body = "{`"supervisorId`":`"$($sup1.id)`"}"
$r = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/deployment/sites/$($unassigned.id)/supervisor" -Method PATCH -ContentType "application/json" -Body $body -Headers $h
Write-Host "Assigned: $($r.data.supervisor.firstName) to $($r.data.name)"
```

Expected output: `Supervisors: 3`, then `Assigned: Vikram to <site-name>`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/deployment/deployment.service.ts apps/api/src/deployment/deployment.controller.ts
git commit -m "feat(api): add listSupervisors and assignSupervisor endpoints"
```

---

## Task 2: API — Site Team CRUD (`GET /deployment/sites/:id/team`, `POST`, `DELETE`)

**Files:**
- Modify: `apps/api/src/deployment/deployment.service.ts`
- Modify: `apps/api/src/deployment/deployment.controller.ts`

**Interfaces:**
- Produces:
  - `GET /deployment/sites/:id/team` → `{ data: Deployment[], meta: { siteId, siteName, total } }`
  - `POST /deployment/sites/:id/team` body: `{ employeeId: string, shiftId?: string, startDate?: string }` → created `Deployment`
  - `DELETE /deployment/sites/:id/team/:deploymentId` → `{ message: 'Employee removed from site' }`

- [ ] **Step 1: Add `getSiteTeam` method**

In `apps/api/src/deployment/deployment.service.ts`, add after `assignSupervisor`:

```typescript
async getSiteTeam(tenantId: string, siteId: string) {
  const site = await this.prisma.site.findFirst({
    where: { id: siteId, tenantId },
    select: { id: true, name: true, code: true, supervisor: { select: { id: true, firstName: true, lastName: true } } },
  });
  if (!site) throw new NotFoundException('Site not found');
  const data = await this.prisma.deployment.findMany({
    where: { tenantId, siteId, status: 'ACTIVE', deletedAt: null },
    include: {
      employee: {
        select: {
          id: true, firstName: true, lastName: true, employeeCode: true,
          personalPhone: true,
          designation: { select: { name: true } },
          department: { select: { name: true } },
        },
      },
      shift: { select: { id: true, name: true, startTime: true, endTime: true } },
    },
    orderBy: { startDate: 'asc' },
  });
  return { data, meta: { siteId, siteName: site.name, supervisor: site.supervisor, total: data.length } };
}
```

- [ ] **Step 2: Add `assignEmployeeToSite` method**

```typescript
async assignEmployeeToSite(tenantId: string, siteId: string, dto: { employeeId: string; shiftId?: string; startDate?: string }) {
  const site = await this.prisma.site.findFirst({ where: { id: siteId, tenantId } });
  if (!site) throw new NotFoundException('Site not found');
  // Check employee not already active at this site
  const existing = await this.prisma.deployment.findFirst({
    where: { tenantId, siteId, employeeId: dto.employeeId, status: 'ACTIVE' },
  });
  if (existing) throw new BadRequestException('Employee is already deployed to this site');
  return this.prisma.deployment.create({
    data: {
      tenantId,
      siteId,
      employeeId: dto.employeeId,
      shiftId: dto.shiftId ?? null,
      startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
      status: 'ACTIVE',
      reportingManager: site.supervisorId ?? undefined,
    } as any,
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, designation: { select: { name: true } } } },
      shift: { select: { id: true, name: true } },
    },
  });
}
```

Add `BadRequestException` to the import at the top of the service file:
```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
```

- [ ] **Step 3: Add `removeEmployeeFromSite` method**

```typescript
async removeEmployeeFromSite(tenantId: string, siteId: string, deploymentId: string) {
  const dep = await this.prisma.deployment.findFirst({
    where: { id: deploymentId, tenantId, siteId, status: 'ACTIVE' },
  });
  if (!dep) throw new NotFoundException('Active deployment not found');
  await this.prisma.deployment.update({
    where: { id: deploymentId },
    data: { status: 'COMPLETED', endDate: new Date() },
  });
  return { message: 'Employee removed from site' };
}
```

- [ ] **Step 4: Add three routes to the controller**

In `apps/api/src/deployment/deployment.controller.ts`:

```typescript
@Get('sites/:id/team') @RequirePermissions('deployment:read')
getSiteTeam(@TenantId() t: string, @Param('id') id: string) { return this.service.getSiteTeam(t, id); }

@Post('sites/:id/team') @RequirePermissions('deployment:write')
assignEmployee(@TenantId() t: string, @Param('id') id: string, @Body() dto: { employeeId: string; shiftId?: string; startDate?: string }) {
  return this.service.assignEmployeeToSite(t, id, dto);
}

@Delete('sites/:id/team/:deploymentId') @RequirePermissions('deployment:write')
removeEmployee(@TenantId() t: string, @Param('id') id: string, @Param('deploymentId') deploymentId: string) {
  return this.service.removeEmployeeFromSite(t, id, deploymentId);
}
```

Add `Delete` to the NestJS import at the top of the controller file:
```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
```

- [ ] **Step 5: Verify with PowerShell**

```powershell
$resp = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"admin@workzen.in","password":"Admin@123!"}'
$h = @{ Authorization = "Bearer $($resp.data.accessToken)" }

$sites = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/deployment/sites" -Headers $h
$testSite = $sites.data[0]  # GGN site
Write-Host "Testing site: $($testSite.name)"

# Get team
$team = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/deployment/sites/$($testSite.id)/team" -Headers $h
Write-Host "Team size: $($team.data.Count), Supervisor: $($team.meta.supervisor.firstName)"

# Get an undeployed employee to add
$emps = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/employees?status=ACTIVE&limit=5" -Headers $h
Write-Host "Employees fetched: $($emps.data.Count)"
```

Expected: team size 15, supervisor "Vikram".

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/deployment/deployment.service.ts apps/api/src/deployment/deployment.controller.ts
git commit -m "feat(api): add site team CRUD — getSiteTeam, assignEmployee, removeEmployee"
```

---

## Task 3: Web — `AssignSupervisorDialog` Component

**Files:**
- Create: `apps/web/src/components/deployment/assign-supervisor-dialog.tsx`

**Interfaces:**
- Consumes: `GET /deployment/supervisors`, `PATCH /deployment/sites/:id/supervisor`
- Props: `site: { id: string; name: string; supervisorId?: string | null }`, `onSuccess: () => void`

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/deployment/assign-supervisor-dialog.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { UserCheck, X } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  site: { id: string; name: string; supervisorId?: string | null };
  onSuccess: () => void;
}

export function AssignSupervisorDialog({ open, onOpenChange, site, onSuccess }: Props) {
  const [selectedId, setSelectedId] = useState<string>(site.supervisorId ?? '');
  const qc = useQueryClient();

  const { data: supervisors = [], isLoading } = useQuery({
    queryKey: ['supervisors'],
    queryFn: () => api.get('/deployment/supervisors').then(r => {
      const d = r.data?.data;
      return Array.isArray(d) ? d : [];
    }),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (supervisorId: string | null) =>
      api.patch(`/deployment/sites/${site.id}/supervisor`, { supervisorId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sites'] });
      qc.invalidateQueries({ queryKey: ['site-team', site.id] });
      toast.success('Supervisor assigned successfully');
      onSuccess();
      onOpenChange(false);
    },
    onError: () => toast.error('Failed to assign supervisor'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Assign Supervisor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Assigning a supervisor to <span className="font-semibold text-foreground">{site.name}</span>
            </p>
            <Label>Site Supervisor</Label>
            <Select
              value={selectedId}
              onValueChange={setSelectedId}
              disabled={isLoading}
            >
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue placeholder="Select a supervisor..." />
              </SelectTrigger>
              <SelectContent position="popper">
                {supervisors.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex flex-col">
                      <span>{s.firstName} {s.lastName}</span>
                      <span className="text-xs text-muted-foreground">{s.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedId && (
              <div className="mt-2">
                {(() => {
                  const sup = supervisors.find((s: any) => s.id === selectedId);
                  if (!sup) return null;
                  const otherSites = (sup.supervisedSites ?? []).filter((s: any) => s.id !== site.id);
                  return otherSites.length > 0 ? (
                    <p className="text-xs text-amber-500">
                      ⚠ Also manages: {otherSites.map((s: any) => s.name).join(', ')}
                    </p>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          {site.supervisorId && (
            <Button
              variant="outline"
              className="text-destructive border-destructive/40 hover:bg-destructive/10 mr-auto"
              onClick={() => mutation.mutate(null)}
              disabled={mutation.isPending}
            >
              <X className="h-4 w-4 mr-1" /> Remove Supervisor
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate(selectedId || null)}
            disabled={mutation.isPending || !selectedId}
          >
            {mutation.isPending ? 'Saving...' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/deployment/assign-supervisor-dialog.tsx
git commit -m "feat(web): AssignSupervisorDialog component"
```

---

## Task 4: Web — `AssignEmployeeSheet` Component

**Files:**
- Create: `apps/web/src/components/deployment/assign-employee-sheet.tsx`

**Interfaces:**
- Consumes: `GET /employees?status=ACTIVE&limit=100`, `GET /deployment/shifts`, `POST /deployment/sites/:id/team`
- Props: `siteId: string`, `siteName: string`, `onSuccess: () => void`
- Produces: Sheet that lets user search employees and pick a shift to deploy them

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/deployment/assign-employee-sheet.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  siteId: string;
  siteName: string;
  onSuccess: () => void;
}

export function AssignEmployeeSheet({ open, onOpenChange, siteId, siteName, onSuccess }: Props) {
  const [search, setSearch] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const qc = useQueryClient();

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-for-assignment'],
    queryFn: () => api.get('/employees?status=ACTIVE&limit=200').then(r => {
      const d = r.data?.data;
      return Array.isArray(d) ? d : Array.isArray((d as any)?.data) ? (d as any).data : [];
    }),
    enabled: open,
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => api.get('/deployment/shifts').then(r => {
      const d = r.data?.data;
      return Array.isArray(d) ? d : [];
    }),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () => api.post(`/deployment/sites/${siteId}/team`, {
      employeeId: selectedEmpId,
      shiftId: shiftId || undefined,
      startDate: new Date().toISOString().slice(0, 10),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site-team', siteId] });
      toast.success('Employee assigned to site');
      setSelectedEmpId('');
      setShiftId('');
      setSearch('');
      onSuccess();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Failed to assign employee'),
  });

  const filtered = (employees as any[]).filter((e: any) => {
    const q = search.toLowerCase();
    return !q || `${e.firstName} ${e.lastName} ${e.employeeCode}`.toLowerCase().includes(q);
  });

  const selected = (employees as any[]).find((e: any) => e.id === selectedEmpId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Assign Employee
          </SheetTitle>
          <p className="text-sm text-muted-foreground">Adding to <span className="font-medium text-foreground">{siteName}</span></p>
        </SheetHeader>

        <div className="mt-6 space-y-5 px-1">
          {/* Employee Search */}
          <div>
            <Label>Search Employee</Label>
            <div className="relative mt-1.5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Name or employee code..."
                className="pl-9"
              />
            </div>
          </div>

          {/* Employee List */}
          <div className="max-h-52 overflow-y-auto rounded-lg border divide-y">
            {filtered.slice(0, 30).map((emp: any) => (
              <button
                key={emp.id}
                type="button"
                onClick={() => setSelectedEmpId(emp.id === selectedEmpId ? '' : emp.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50 ${
                  selectedEmpId === emp.id ? 'bg-primary/10 border-l-2 border-primary' : ''
                }`}
              >
                <div>
                  <p className="font-medium">{emp.firstName} {emp.lastName}</p>
                  <p className="text-xs text-muted-foreground">
                    {emp.employeeCode} · {emp.designation?.name ?? '—'}
                  </p>
                </div>
                {emp.lifecycleStatus === 'DEPLOYED' && (
                  <Badge variant="secondary" className="text-xs shrink-0">Deployed</Badge>
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">No employees found</p>
            )}
          </div>

          {/* Selected Employee Summary */}
          {selected && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm space-y-0.5">
              <p className="font-semibold">{selected.firstName} {selected.lastName}</p>
              <p className="text-muted-foreground">{selected.employeeCode} · {selected.designation?.name}</p>
              <p className="text-muted-foreground">{selected.department?.name}</p>
            </div>
          )}

          {/* Shift Picker */}
          <div>
            <Label>Shift <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Select value={shiftId} onValueChange={setShiftId}>
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue placeholder="Select shift..." />
              </SelectTrigger>
              <SelectContent position="popper">
                {(shifts as any[]).map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.startTime}–{s.endTime})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            disabled={!selectedEmpId || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Assigning...</>
              : <><UserPlus className="h-4 w-4 mr-2" />Assign to {siteName}</>
            }
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/deployment/assign-employee-sheet.tsx
git commit -m "feat(web): AssignEmployeeSheet component with employee search and shift picker"
```

---

## Task 5: Web — Main Site Management Page

**Files:**
- Create: `apps/web/src/app/(dashboard)/deployment/site-management/page.tsx`

**Interfaces:**
- Consumes: `GET /deployment/sites` (includes supervisor), `GET /deployment/sites/:id/team`, `DELETE /deployment/sites/:id/team/:deploymentId`
- Consumes components: `AssignSupervisorDialog` (Task 3), `AssignEmployeeSheet` (Task 4)
- Produces: `/deployment/site-management` route — split UI: left sites list, right selected site team

- [ ] **Step 1: Create the page**

Create `apps/web/src/app/(dashboard)/deployment/site-management/page.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AssignSupervisorDialog } from '@/components/deployment/assign-supervisor-dialog';
import { AssignEmployeeSheet } from '@/components/deployment/assign-employee-sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  MapPin, UserCheck, Users, UserPlus, Trash2,
  ChevronRight, AlertCircle, Phone, Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

function safeArray(d: any): any[] {
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.data)) return d.data;
  return [];
}

export default function SiteManagementPage() {
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [supervisorDialog, setSupervisorDialog] = useState<{ open: boolean; site: any }>({ open: false, site: null });
  const [assignSheet, setAssignSheet] = useState(false);
  const qc = useQueryClient();

  // Sites list
  const { data: sites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: () => api.get('/deployment/sites').then(r => safeArray(r.data?.data)),
  });

  const selectedSite = (sites as any[]).find((s: any) => s.id === selectedSiteId);

  // Team for selected site
  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: ['site-team', selectedSiteId],
    queryFn: () => api.get(`/deployment/sites/${selectedSiteId}/team`).then(r => r.data),
    enabled: !!selectedSiteId,
  });
  const team = safeArray(teamData?.data);
  const teamMeta = teamData?.meta ?? {};

  // Remove employee mutation
  const removeMutation = useMutation({
    mutationFn: (deploymentId: string) =>
      api.delete(`/deployment/sites/${selectedSiteId}/team/${deploymentId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site-team', selectedSiteId] });
      toast.success('Employee removed from site');
    },
    onError: () => toast.error('Failed to remove employee'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Site Management</h1>
        <p className="text-muted-foreground">Assign supervisors and manage employee deployment per site</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT: Sites List ── */}
        <div className="lg:col-span-1 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Sites ({(sites as any[]).length})
          </p>
          {sitesLoading ? (
            [...Array(5)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)
          ) : (
            (sites as any[]).map((site: any) => (
              <button
                key={site.id}
                type="button"
                onClick={() => setSelectedSiteId(site.id)}
                className={`w-full text-left rounded-lg border p-3 transition-all hover:border-primary/50 hover:bg-muted/30 ${
                  selectedSiteId === site.id
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border bg-card'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{site.name}</p>
                      <Badge variant={site.isActive ? 'default' : 'secondary'} className="text-xs shrink-0">
                        {site.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{site.code}</p>
                    {site.supervisor ? (
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-green-500">
                        <UserCheck className="h-3 w-3" />
                        {site.supervisor.firstName} {site.supervisor.lastName}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-amber-500">
                        <AlertCircle className="h-3 w-3" />
                        No supervisor assigned
                      </div>
                    )}
                  </div>
                  <ChevronRight className={`h-4 w-4 shrink-0 mt-0.5 transition-colors ${selectedSiteId === site.id ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
              </button>
            ))
          )}
        </div>

        {/* ── RIGHT: Site Detail ── */}
        <div className="lg:col-span-2">
          {!selectedSite ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground border-2 border-dashed rounded-xl">
              <MapPin className="h-8 w-8 mb-3 opacity-40" />
              <p className="font-medium">Select a site</p>
              <p className="text-sm">Click any site on the left to manage it</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Site Header Card */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">{selectedSite.name}</CardTitle>
                      <p className="text-sm text-muted-foreground font-mono">{selectedSite.code}</p>
                      {selectedSite.address && (
                        <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {selectedSite.address.street}, {selectedSite.address.city}
                        </div>
                      )}
                    </div>
                    <Badge variant={selectedSite.isActive ? 'default' : 'secondary'}>
                      {selectedSite.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 border-t">
                  <div className="flex items-center justify-between mt-3">
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">Supervisor</p>
                      {selectedSite.supervisor ? (
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center text-xs font-bold text-green-500">
                            {selectedSite.supervisor.firstName?.[0]}{selectedSite.supervisor.lastName?.[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{selectedSite.supervisor.firstName} {selectedSite.supervisor.lastName}</p>
                            <p className="text-xs text-muted-foreground">{selectedSite.supervisor.email}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-amber-500 flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" /> Not assigned
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSupervisorDialog({ open: true, site: selectedSite })}
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      {selectedSite.supervisor ? 'Change Supervisor' : 'Assign Supervisor'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Team Table */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-base">
                        Site Team
                        {teamMeta.total != null && (
                          <span className="ml-2 text-sm font-normal text-muted-foreground">({teamMeta.total} employees)</span>
                        )}
                      </CardTitle>
                    </div>
                    <Button size="sm" onClick={() => setAssignSheet(true)}>
                      <UserPlus className="h-4 w-4 mr-1" /> Add Employee
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {teamLoading ? (
                    <div className="space-y-2">
                      {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />)}
                    </div>
                  ) : team.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No employees deployed to this site yet</p>
                      <Button size="sm" variant="outline" className="mt-3" onClick={() => setAssignSheet(true)}>
                        <UserPlus className="h-4 w-4 mr-1" /> Add First Employee
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {team.map((dep: any) => (
                        <div key={dep.id} className="flex items-center justify-between py-3 gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                              {dep.employee?.firstName?.[0]}{dep.employee?.lastName?.[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm">
                                {dep.employee?.firstName} {dep.employee?.lastName}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                <span className="font-mono">{dep.employee?.employeeCode}</span>
                                {dep.employee?.designation?.name && (
                                  <span className="flex items-center gap-1">
                                    <Briefcase className="h-3 w-3" />
                                    {dep.employee.designation.name}
                                  </span>
                                )}
                                {dep.employee?.personalPhone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {dep.employee.personalPhone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {dep.shift && (
                              <Badge variant="secondary" className="text-xs">{dep.shift.name}</Badge>
                            )}
                            <p className="text-xs text-muted-foreground hidden sm:block">
                              Since {format(new Date(dep.startDate), 'dd MMM yyyy')}
                            </p>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                if (confirm(`Remove ${dep.employee?.firstName} from this site?`)) {
                                  removeMutation.mutate(dep.id);
                                }
                              }}
                              disabled={removeMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {supervisorDialog.site && (
        <AssignSupervisorDialog
          open={supervisorDialog.open}
          onOpenChange={v => setSupervisorDialog(d => ({ ...d, open: v }))}
          site={supervisorDialog.site}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['sites'] })}
        />
      )}
      {selectedSite && (
        <AssignEmployeeSheet
          open={assignSheet}
          onOpenChange={setAssignSheet}
          siteId={selectedSite.id}
          siteName={selectedSite.name}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "apps/web/src/app/(dashboard)/deployment/site-management/page.tsx"
git commit -m "feat(web): add Site Management page with supervisor and team assignment"
```

---

## Task 6: Web — Wire into Sidebar and Deployment Page

**Files:**
- Modify: `apps/web/src/app/(dashboard)/layout.tsx` (or whichever file has sidebar nav items)

**Interfaces:**
- Consumes: Existing sidebar nav structure
- Produces: "Site Management" link under SUPERVISOR section visible to `HR_MANAGER`, `OPERATIONS_MANAGER`, `SUPER_ADMIN`, `COMPANY_OWNER`

- [ ] **Step 1: Find the sidebar nav file**

```bash
grep -rn "Sites Overview\|supervisor.*href\|href.*supervisor" apps/web/src --include="*.tsx" -l
```

Open the file that contains the sidebar nav links.

- [ ] **Step 2: Add Site Management to sidebar**

Find the SUPERVISOR section in the sidebar and add a new entry:

```tsx
{
  label: 'Site Management',
  href: '/deployment/site-management',
  icon: Building2,   // import Building2 from 'lucide-react' if not already imported
  roles: ['SUPER_ADMIN', 'COMPANY_OWNER', 'HR_MANAGER', 'OPERATIONS_MANAGER'],
},
```

- [ ] **Step 3: Verify the link appears in the browser**

Navigate to `http://localhost:3000` and confirm "Site Management" appears under the SUPERVISOR or OPERATIONS section in the sidebar for admin users. Click it — the page loads with the site list.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(dashboard)/layout.tsx   # or whichever file was edited
git commit -m "feat(web): add Site Management link to sidebar nav"
```

---

## Self-Review Checklist

### Spec Coverage
- [x] Assign supervisor to site — Task 1 (`PATCH /deployment/sites/:id/supervisor` + `AssignSupervisorDialog`)
- [x] Remove supervisor from site — Task 3 (Remove Supervisor button sends `supervisorId: null`)
- [x] List SITE_SUPERVISOR users to pick from — Task 1 (`GET /deployment/supervisors`)
- [x] View employees currently assigned to a site — Task 2 (`GET /deployment/sites/:id/team`) + Task 5
- [x] Assign employee to site — Task 2 (`POST /deployment/sites/:id/team`) + Task 4
- [x] Remove employee from site — Task 2 (`DELETE /deployment/sites/:id/team/:deploymentId`) + Task 5
- [x] Shift assignment for deployed employee — Task 4 (shift picker in `AssignEmployeeSheet`)
- [x] Web navigation entry — Task 6

### Gaps
- None identified. The schema already has `Site.supervisorId`, deployments already exist as the mechanism for employee-to-site assignment.

### Type Consistency
- `site` shape: `{ id, name, code, isActive, address, supervisor, supervisorId }` — consistent across Tasks 1, 3, 5
- `team` item shape: `{ id, employeeId, employee: { firstName, lastName, employeeCode, designation, personalPhone }, shift, startDate }` — consistent between Task 2 service and Task 5 render
- API route prefixes: all use `/deployment/sites/:id/...` — consistent across Tasks 1, 2, 3, 4, 5
