# Mobile Full API Connectivity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Flutter mobile app end-to-end to the NestJS API — fix all broken/missing endpoints, replace all hardcoded data with live API calls, add FCM push registration, and implement payslip PDF download.

**Architecture:** 11 connectivity gaps in 5 screens. Fix is split into two phases: Phase A adds self-service API endpoints to NestJS (Tasks 1–5); Phase B updates the Flutter app to call the correct paths and replace every hardcoded widget with real data (Tasks 6–9). Every API endpoint added is employee-self-service — it looks up the caller's employee record via `prisma.employee.findUnique({ where: { userId } })`.

**Tech Stack:** NestJS (attendance/payroll/notifications/auth controllers), Flutter 3, Riverpod 2, Dio 5, GoRouter 13, firebase_messaging 14, url_launcher 6.

## Global Constraints
- API base: `http://10.0.2.2:3001/api/v1` (Android emulator) or `http://localhost:3001/api/v1` (iOS sim)
- All new NestJS routes use `@UseGuards(JwtAuthGuard, TenantGuard)` — no `RbacGuard`, no permission check (self-service)
- Employee lookup helper: `prisma.employee.findUnique({ where: { userId: currentUserId }, select: { id: true } })` — throw `NotFoundException('No linked employee profile')` if null
- Mobile: never use `setState` for data that must survive navigation; use Riverpod `AsyncNotifier` or `FutureProvider`
- Dart SDK: ≥ 3.0.0, null safety required throughout
- No new packages beyond what is already in `pubspec.yaml` (url_launcher is already listed)

---

## Gap Reference Table

| Screen | Mobile calls | API reality | Fix |
|---|---|---|---|
| Auth | `GET /auth/me` | `GET /users/me` | Add `/auth/me` alias in auth controller |
| Auth | — | — | Add `POST /auth/fcm-token` |
| Attendance | `POST /attendance/check-in` | `POST /attendance/mark` (admin, needs employeeId) | New self-service endpoint |
| Attendance | `POST /attendance/check-out` | Missing | New self-service endpoint |
| Attendance | Today status | Local state only | `GET /attendance/my-today` |
| Attendance | Week summary | Hardcoded strings | `GET /attendance/my-week` |
| Attendance | Month stats | Hardcoded numbers | `GET /attendance/my-month-stats` |
| Leave | `GET /leave/my-balance` | Missing | `GET /attendance/my-leave-balance` |
| Leave | `GET /leave/my-requests?limit=10` | Missing | `GET /attendance/my-leave-requests` |
| Leave | `POST /leave/requests` with string `leaveType` | `POST /attendance/leave-requests` needs leaveTypeId UUID | New self-service endpoint |
| Payslips | `GET /payroll/my-payslips?limit=12` | `GET /payroll/employees/:id/payslips` | `GET /payroll/my-payslips` |
| Payslips | PDF download | Empty `onTap: () {}` | `url_launcher` to PDF URL |
| Notifications | `GET /notifications?limit=20` | Only `GET /notifications/unread` | Add full list endpoint |
| Notifications | Mark all read button | Empty `onTap` | Wire `PATCH /notifications/mark-all-read` |
| Profile | Employee details | None (only user data from Zustand) | `GET /employees/me` |
| Profile | All tile taps | Empty `onTap: () {}` | Implement personal info bottom sheet |

---

## File Map

### New files
| File | Purpose |
|---|---|
| `apps/mobile/lib/core/providers/employee_provider.dart` | `employeeProvider` — loads current user's employee record |
| `apps/mobile/lib/features/attendance/providers/attendance_provider.dart` | Riverpod providers for today, week, month stats |
| `apps/mobile/lib/features/leave/providers/leave_provider.dart` | Providers for leave types, balance, requests |
| `apps/mobile/lib/features/profile/screens/personal_info_sheet.dart` | Bottom sheet showing employee details |

### Modified files
| File | Change |
|---|---|
| `apps/api/src/auth/auth.controller.ts` | Add `GET /auth/me` alias + `POST /auth/fcm-token` |
| `apps/api/src/auth/auth.service.ts` | Add `getMe()` + `registerFcmToken()` |
| `apps/api/src/attendance/attendance.controller.ts` | Add 7 self-service routes |
| `apps/api/src/attendance/attendance.service.ts` | Add 7 self-service methods |
| `apps/api/src/payroll/payroll.controller.ts` | Add `GET /payroll/my-payslips` |
| `apps/api/src/payroll/payroll.service.ts` | Add `getMyPayslips()` |
| `apps/api/src/notifications/notifications.controller.ts` | Add `GET /` list + `PATCH /mark-all-read` |
| `apps/api/src/notifications/notifications.service.ts` | Add `getList()` + `markAllRead()` |
| `apps/api/src/employees/employees.controller.ts` | Add `GET /employees/me` |
| `apps/api/src/employees/employees.service.ts` | Add `getMyProfile()` |
| `apps/mobile/lib/core/providers/auth_provider.dart` | Fix `/auth/me` → `/users/me`, add FCM token registration |
| `apps/mobile/lib/features/attendance/screens/attendance_screen.dart` | Replace all hardcoded data with live API |
| `apps/mobile/lib/features/leave/screens/leave_screen.dart` | Fix all endpoints, load leave types, use leaveTypeId |
| `apps/mobile/lib/features/payslip/screens/payslips_screen.dart` | Fix endpoint, PDF download via url_launcher |
| `apps/mobile/lib/features/notifications/screens/notifications_screen.dart` | Fix endpoint, mark-all-read |
| `apps/mobile/lib/features/profile/screens/profile_screen.dart` | Add employee data, wire personal info tile |
| `apps/mobile/lib/main.dart` | Add FCM token registration after login |

---

## Task 1 — API: Auth self-service + FCM token

**Files:**
- Modify: `apps/api/src/auth/auth.controller.ts`
- Modify: `apps/api/src/auth/auth.service.ts`

**Context:** The mobile calls `GET /auth/me` but the endpoint is `GET /users/me`. Adding an alias in the auth controller avoids touching the mobile auth_provider (which already works). FCM device tokens need to be stored so the backend can send push notifications to specific devices.

**Interfaces:**
- Produces: `GET /api/v1/auth/me` → `{ data: { id, email, firstName, lastName, tenantId, roles: [{ role: { name } }] } }`
- Produces: `POST /api/v1/auth/fcm-token` body `{ token: string, device?: string }` → `{ success: true }`

- [ ] **Step 1: Add `saveFcmToken` method to auth.service.ts**

In `apps/api/src/auth/auth.service.ts`, add this method at the bottom of the `AuthService` class (before the closing brace):

```typescript
async getMe(userId: string, tenantId: string) {
  return this.prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      avatar: true, phone: true, tenantId: true, status: true,
      userRoles: {
        where: { tenantId },
        include: { role: { select: { name: true } } },
      },
    },
  });
}

async saveFcmToken(userId: string, token: string, device?: string) {
  await this.prisma.refreshToken.updateMany({
    where: { userId, device: device ?? null },
    data: { device: device },
  });
  return { success: true };
}
```

> Note: `PrismaService` is already injected in `AuthService`. Confirm it's imported by looking at the constructor — it will be `constructor(private prisma: PrismaService, ...)`.

- [ ] **Step 2: Add routes to auth.controller.ts**

In `apps/api/src/auth/auth.controller.ts`, add these two routes after the `confirm2fa` route. Import `Body, Get, Param` are already imported — only `Request` may need adding. Also import `TenantGuard` and `TenantId, CurrentUser` decorators.

At the top, add/verify imports:
```typescript
import { Controller, Post, Body, UseGuards, Get, Ip, HttpCode, Patch } from '@nestjs/common';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentUser, TenantId } from '../common/decorators/current-user.decorator';
```

Add routes at the bottom of the controller class:
```typescript
@UseGuards(JwtAuthGuard, TenantGuard)
@Get('me')
@ApiBearerAuth()
getMe(@CurrentUser('id') userId: string, @TenantId() tenantId: string) {
  return this.authService.getMe(userId, tenantId);
}

@UseGuards(JwtAuthGuard)
@Post('fcm-token')
@ApiBearerAuth()
@HttpCode(200)
saveFcmToken(
  @CurrentUser('id') userId: string,
  @Body('token') token: string,
  @Body('device') device?: string,
) {
  return this.authService.saveFcmToken(userId, token, device);
}
```

- [ ] **Step 3: Verify API compiles and `/auth/me` returns user data**

The API is running (watch mode). Check the err log for compilation errors:
```powershell
Get-Content "I:\Upcoming Projects\WorkZen\api.err.log" -Tail 10
```

Then test with curl (replace TOKEN with a real token from browser localStorage):
```powershell
$TOKEN = "eyJ..."
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/me" -Headers @{Authorization="Bearer $TOKEN"; "x-tenant-id"="<tenantId>"}
```

Expected: `{ data: { id, email, firstName, lastName, userRoles: [...] } }`

---

## Task 2 — API: Attendance self-service endpoints

**Files:**
- Modify: `apps/api/src/attendance/attendance.service.ts`
- Modify: `apps/api/src/attendance/attendance.controller.ts`

**Context:** Mobile needs 5 self-service endpoints. The existing `POST /attendance/mark` requires an explicit `employeeId` in the body (admin-facing). Self-service endpoints look up the employee record from the JWT's userId via `prisma.employee.findUnique({ where: { userId } })`.

**Interfaces:**
- Produces: `POST /api/v1/attendance/check-in` body `{ latitude?, longitude?, method? }` → `{ data: attendanceRecord }`
- Produces: `POST /api/v1/attendance/check-out` body `{ latitude?, longitude? }` → `{ data: attendanceRecord }`
- Produces: `GET /api/v1/attendance/my-today` → `{ data: { date, status, checkInTime, checkOutTime, isCheckedIn } }`
- Produces: `GET /api/v1/attendance/my-week` → `{ data: [{ date, dayLabel, status, statusCode }] }` (7 items, Mon→Sun)
- Produces: `GET /api/v1/attendance/my-month-stats` → `{ data: { present, absent, leaves, total } }`

- [ ] **Step 1: Add self-service methods to attendance.service.ts**

At the bottom of `AttendanceService` class in `apps/api/src/attendance/attendance.service.ts`, add:

```typescript
private async resolveEmployee(tenantId: string, userId: string) {
  const emp = await this.prisma.employee.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!emp) throw new Error('No linked employee profile for this user');
  return emp;
}

async selfCheckIn(tenantId: string, userId: string, dto: { latitude?: number; longitude?: number; method?: string }) {
  const emp = await this.resolveEmployee(tenantId, userId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const existing = await this.prisma.attendanceRecord.findFirst({
    where: { tenantId, employeeId: emp.id, date: today },
  });
  if (existing?.checkInTime) return existing;
  const now = new Date();
  if (existing) {
    return this.prisma.attendanceRecord.update({
      where: { id: existing.id },
      data: { checkInTime: now, checkInLatitude: dto.latitude, checkInLongitude: dto.longitude, status: 'PRESENT', method: (dto.method ?? 'GPS') as any },
    });
  }
  return this.prisma.attendanceRecord.create({
    data: {
      tenantId, employeeId: emp.id, date: today,
      status: 'PRESENT', method: (dto.method ?? 'GPS') as any,
      checkInTime: now, checkInLatitude: dto.latitude, checkInLongitude: dto.longitude,
    },
  });
}

async selfCheckOut(tenantId: string, userId: string, dto: { latitude?: number; longitude?: number }) {
  const emp = await this.resolveEmployee(tenantId, userId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const existing = await this.prisma.attendanceRecord.findFirst({
    where: { tenantId, employeeId: emp.id, date: today },
  });
  if (!existing) throw new Error('No check-in found for today');
  const now = new Date();
  return this.prisma.attendanceRecord.update({
    where: { id: existing.id },
    data: { checkOutTime: now, checkOutLatitude: dto.latitude, checkOutLongitude: dto.longitude },
  });
}

async myTodayStatus(tenantId: string, userId: string) {
  const emp = await this.resolveEmployee(tenantId, userId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const record = await this.prisma.attendanceRecord.findFirst({
    where: { tenantId, employeeId: emp.id, date: today },
  });
  return {
    date: today.toISOString(),
    status: record?.status ?? 'PENDING',
    checkInTime: record?.checkInTime ?? null,
    checkOutTime: record?.checkOutTime ?? null,
    isCheckedIn: !!(record?.checkInTime && !record?.checkOutTime),
  };
}

async myWeekSummary(tenantId: string, userId: string) {
  const emp = await this.resolveEmployee(tenantId, userId);
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const records = await this.prisma.attendanceRecord.findMany({
    where: { tenantId, employeeId: emp.id, date: { gte: monday, lte: sunday } },
  });

  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  return days.map((label, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const record = records.find(r => new Date(r.date).toDateString() === date.toDateString());
    const isFuture = date > today;
    let statusCode = 'O';
    if (!isFuture) {
      statusCode = record ? (record.status === 'PRESENT' ? 'P' : record.status === 'LEAVE' ? 'L' : record.status === 'ABSENT' ? 'A' : 'H') : (date.getDay() === 0 || date.getDay() === 6 ? 'H' : 'A');
    }
    return { date: date.toISOString(), dayLabel: label, status: record?.status ?? null, statusCode };
  });
}

async myMonthStats(tenantId: string, userId: string) {
  const emp = await this.resolveEmployee(tenantId, userId);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const records = await this.prisma.attendanceRecord.findMany({
    where: { tenantId, employeeId: emp.id, date: { gte: start, lte: end } },
  });
  return {
    present: records.filter(r => r.status === 'PRESENT').length,
    absent: records.filter(r => r.status === 'ABSENT').length,
    leaves: records.filter(r => r.status === 'LEAVE').length,
    total: records.length,
  };
}
```

- [ ] **Step 2: Add routes to attendance.controller.ts**

In `apps/api/src/attendance/attendance.controller.ts`, add these routes **before** the existing `@Post('mark')` route (at the top of the route list, after the constructor):

```typescript
// ── SELF-SERVICE (no employeeId needed, uses JWT userId) ──────────────────

@Post('check-in')
selfCheckIn(
  @TenantId() t: string,
  @CurrentUser('id') uid: string,
  @Body() dto: { latitude?: number; longitude?: number; method?: string },
) {
  return this.service.selfCheckIn(t, uid, dto);
}

@Post('check-out')
selfCheckOut(
  @TenantId() t: string,
  @CurrentUser('id') uid: string,
  @Body() dto: { latitude?: number; longitude?: number },
) {
  return this.service.selfCheckOut(t, uid, dto);
}

@Get('my-today')
myToday(@TenantId() t: string, @CurrentUser('id') uid: string) {
  return this.service.myTodayStatus(t, uid);
}

@Get('my-week')
myWeek(@TenantId() t: string, @CurrentUser('id') uid: string) {
  return this.service.myWeekSummary(t, uid);
}

@Get('my-month-stats')
myMonthStats(@TenantId() t: string, @CurrentUser('id') uid: string) {
  return this.service.myMonthStats(t, uid);
}
```

- [ ] **Step 3: Verify endpoints compile**

```powershell
Get-Content "I:\Upcoming Projects\WorkZen\api.err.log" -Tail 10
```

Expected: no TypeScript errors. The NestJS watch mode auto-recompiles.

---

## Task 3 — API: Leave self-service endpoints

**Files:**
- Modify: `apps/api/src/attendance/attendance.service.ts`
- Modify: `apps/api/src/attendance/attendance.controller.ts`

**Context:** Mobile's leave screen calls `/leave/my-balance`, `/leave/my-requests`, and `POST /leave/requests` with a `leaveType` string. All leave data lives under the `attendance` controller in the API. We add 3 self-service endpoints here. The mobile will be updated in Task 8 to call the correct paths.

**Interfaces:**
- Produces: `GET /api/v1/attendance/my-leave-balance` → `{ data: [{ leaveType: { name, code }, allocated, used, pending, balance }] }`
- Produces: `GET /api/v1/attendance/my-leave-requests?limit=10` → `{ data: [...], meta: { total } }`
- Produces: `POST /api/v1/attendance/my-leave-requests` body `{ leaveTypeId, startDate, endDate, reason }` → `{ data: leaveRequest }`

- [ ] **Step 1: Add self-service leave methods to attendance.service.ts**

Add these methods at the bottom of `AttendanceService` (after `myMonthStats`):

```typescript
async myLeaveBalance(tenantId: string, userId: string) {
  const emp = await this.resolveEmployee(tenantId, userId);
  const year = new Date().getFullYear();
  return this.prisma.leaveBalance.findMany({
    where: { tenantId, employeeId: emp.id, year },
    include: { leaveType: { select: { name: true, code: true, maxDays: true } } },
    orderBy: { leaveType: { name: 'asc' } },
  });
}

async myLeaveRequests(tenantId: string, userId: string, limit = 10) {
  const emp = await this.resolveEmployee(tenantId, userId);
  const [data, total] = await Promise.all([
    this.prisma.leaveRequest.findMany({
      where: { tenantId, employeeId: emp.id },
      include: { leaveType: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    this.prisma.leaveRequest.count({ where: { tenantId, employeeId: emp.id } }),
  ]);
  return { data, meta: { total, limit } };
}

async applyLeave(
  tenantId: string,
  userId: string,
  dto: { leaveTypeId: string; startDate: string; endDate: string; reason: string },
) {
  const emp = await this.resolveEmployee(tenantId, userId);
  const start = new Date(dto.startDate);
  const end = new Date(dto.endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
  return this.prisma.leaveRequest.create({
    data: {
      tenantId,
      employeeId: emp.id,
      leaveTypeId: dto.leaveTypeId,
      startDate: start,
      endDate: end,
      days,
      reason: dto.reason,
      status: 'PENDING',
      createdBy: userId,
    } as any,
    include: { leaveType: { select: { name: true } } },
  });
}
```

- [ ] **Step 2: Add routes to attendance.controller.ts**

Add these routes in the self-service block (after `my-month-stats`):

```typescript
@Get('my-leave-balance')
myLeaveBalance(@TenantId() t: string, @CurrentUser('id') uid: string) {
  return this.service.myLeaveBalance(t, uid);
}

@Get('my-leave-requests')
myLeaveRequests(
  @TenantId() t: string,
  @CurrentUser('id') uid: string,
  @Query('limit') limit?: string,
) {
  return this.service.myLeaveRequests(t, uid, limit ? Number(limit) : 10);
}

@Post('my-leave-requests')
applyLeave(
  @TenantId() t: string,
  @CurrentUser('id') uid: string,
  @Body() dto: { leaveTypeId: string; startDate: string; endDate: string; reason: string },
) {
  return this.service.applyLeave(t, uid, dto);
}
```

- [ ] **Step 3: Verify no compile errors**

```powershell
Get-Content "I:\Upcoming Projects\WorkZen\api.err.log" -Tail 5
```

---

## Task 4 — API: Payroll self-service endpoint

**Files:**
- Modify: `apps/api/src/payroll/payroll.service.ts`
- Modify: `apps/api/src/payroll/payroll.controller.ts`

**Context:** Mobile calls `GET /payroll/my-payslips?limit=12`. The existing endpoint is `GET /payroll/employees/:employeeId/payslips` which requires knowing the employee UUID. The self-service version derives the employee ID from the JWT user ID.

**Interfaces:**
- Produces: `GET /api/v1/payroll/my-payslips?limit=12` → `{ data: [{ id, payPeriod, grossSalary, netSalary, status, pdfUrl? }] }`

- [ ] **Step 1: Check payroll.service.ts for existing getEmployeePayslips**

```powershell
Select-String -Path "I:\Upcoming Projects\WorkZen\apps\api\src\payroll\payroll.service.ts" -Pattern "async getEmployee|async findPayslips|payslip" | Select-Object -First 10
```

- [ ] **Step 2: Add `getMyPayslips` to payroll.service.ts**

In `apps/api/src/payroll/payroll.service.ts`, add at the bottom of the `PayrollService` class:

```typescript
async getMyPayslips(tenantId: string, userId: string, limit = 12) {
  const emp = await this.prisma.employee.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!emp) throw new NotFoundException('No linked employee profile');

  const payslips = await this.prisma.payslip.findMany({
    where: { tenantId, employeeId: emp.id },
    orderBy: { payPeriod: 'desc' },
    take: limit,
    select: {
      id: true,
      payPeriod: true,
      grossSalary: true,
      netSalary: true,
      status: true,
      pdfUrl: true,
      payrollRun: { select: { id: true, status: true } },
    },
  });
  return payslips;
}
```

> Note: If `NotFoundException` is not yet imported in payroll.service.ts, add `import { NotFoundException } from '@nestjs/common';` at the top.

- [ ] **Step 3: Add route to payroll.controller.ts**

In `apps/api/src/payroll/payroll.controller.ts`, add this route **before** the existing `GET /runs` route (collection routes must come before `:id` routes):

```typescript
@Get('my-payslips')
getMyPayslips(
  @TenantId() t: string,
  @CurrentUser('id') uid: string,
  @Query('limit') limit?: string,
) {
  return this.service.getMyPayslips(t, uid, limit ? Number(limit) : 12);
}
```

Also ensure `@CurrentUser` is imported:
```typescript
import { CurrentUser, TenantId } from '../common/decorators/current-user.decorator';
```

- [ ] **Step 4: Verify**

```powershell
Get-Content "I:\Upcoming Projects\WorkZen\api.err.log" -Tail 5
```

---

## Task 5 — API: Notifications list + mark-all-read + Employee /me

**Files:**
- Modify: `apps/api/src/notifications/notifications.controller.ts`
- Modify: `apps/api/src/notifications/notifications.service.ts`
- Modify: `apps/api/src/employees/employees.controller.ts`
- Modify: `apps/api/src/employees/employees.service.ts`

**Context:**
- Mobile calls `GET /notifications?limit=20` but only `/notifications/unread` exists.
- Mobile's "Mark all read" button has an empty `onTap` — needs `PATCH /notifications/mark-all-read`.
- Profile screen needs to load the employee record for the current user: `GET /employees/me`.

**Interfaces:**
- Produces: `GET /api/v1/notifications?limit=20` → `{ data: [{ id, title, body, type, isRead, createdAt }] }`
- Produces: `PATCH /api/v1/notifications/mark-all-read` → `{ count: number }`
- Produces: `GET /api/v1/employees/me` → `{ data: { id, employeeCode, firstName, lastName, personalPhone, designationId, departmentId, joiningDate, photo } }`

- [ ] **Step 1: Add list + mark-all-read methods to notifications.service.ts**

In `apps/api/src/notifications/notifications.service.ts`, add after `markRead`:

```typescript
async getList(tenantId: string, userId: string, limit = 20) {
  const records = await this.prisma.notification.findMany({
    where: { tenantId, userId, type: 'IN_APP' },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return records.map(n => ({
    id: n.id,
    title: n.subject ?? '',
    body: n.body,
    type: n.type,
    isRead: !!n.readAt,
    createdAt: n.createdAt,
    data: n.data,
  }));
}

async markAllRead(tenantId: string, userId: string) {
  return this.prisma.notification.updateMany({
    where: { tenantId, userId, type: 'IN_APP', readAt: null },
    data: { readAt: new Date() },
  });
}
```

- [ ] **Step 2: Add routes to notifications.controller.ts**

Replace the full file content:

```typescript
import { Controller, Get, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentUser, TenantId } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  getList(
    @TenantId() t: string,
    @CurrentUser('id') uid: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getList(t, uid, limit ? Number(limit) : 20);
  }

  @Get('unread')
  getUnread(@TenantId() t: string, @CurrentUser('id') uid: string) {
    return this.service.getUnread(t, uid);
  }

  @Patch('mark-read')
  markRead(@TenantId() t: string, @CurrentUser('id') uid: string, @Body('ids') ids: string[]) {
    return this.service.markRead(t, uid, ids);
  }

  @Patch('mark-all-read')
  markAllRead(@TenantId() t: string, @CurrentUser('id') uid: string) {
    return this.service.markAllRead(t, uid);
  }
}
```

- [ ] **Step 3: Add `getMyProfile` to employees.service.ts**

In `apps/api/src/employees/employees.service.ts`, add at the bottom of `EmployeesService`:

```typescript
async getMyProfile(tenantId: string, userId: string) {
  const emp = await this.prisma.employee.findUnique({
    where: { userId },
    include: {
      bankDetails: { select: { accountNumber: true, bankName: true, ifscCode: true } },
    },
  });
  if (!emp) throw new NotFoundException('No linked employee profile');
  return emp;
}
```

- [ ] **Step 4: Add `GET /employees/me` route to employees.controller.ts**

In `apps/api/src/employees/employees.controller.ts`, add this route **before** `@Get('stats')` (it must come before `@Get(':id')` to avoid route collision):

```typescript
@Get('me')
getMe(@TenantId() t: string, @CurrentUser('id') uid: string) {
  return this.service.getMyProfile(t, uid);
}
```

- [ ] **Step 5: Verify all compile**

```powershell
Get-Content "I:\Upcoming Projects\WorkZen\api.err.log" -Tail 10
```

Expected: no errors.

---

## Task 6 — Mobile: Core providers + FCM registration

**Files:**
- Modify: `apps/mobile/lib/core/providers/auth_provider.dart`
- Create: `apps/mobile/lib/core/providers/employee_provider.dart`
- Modify: `apps/mobile/lib/main.dart`

**Context:** The mobile's `auth_provider.dart` currently calls `GET /auth/me`. Since we added the alias in Task 1, this now works. But we also need to: (1) register the FCM token after login, (2) create an `employeeProvider` that loads the employee profile (used by attendance, leave, profile screens), (3) handle notifications permission.

**Interfaces:**
- Consumes: `GET /api/v1/auth/me` → `{ data: { id, email, firstName, lastName, tenantId, userRoles } }` (fixed in Task 1)
- Consumes: `GET /api/v1/employees/me` → employee object
- Produces: `employeeProvider` — `AsyncNotifierProvider<EmployeeNotifier, Employee?>` readable from any screen

- [ ] **Step 1: Create employee_provider.dart**

Create `apps/mobile/lib/core/providers/employee_provider.dart`:

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'api_client.dart';
import 'auth_provider.dart';

class Employee {
  final String id;
  final String employeeCode;
  final String firstName;
  final String lastName;
  final String? photo;
  final String personalPhone;
  final String? designationId;
  final String? departmentId;
  final String? joiningDate;

  const Employee({
    required this.id,
    required this.employeeCode,
    required this.firstName,
    required this.lastName,
    required this.personalPhone,
    this.photo,
    this.designationId,
    this.departmentId,
    this.joiningDate,
  });

  factory Employee.fromJson(Map<String, dynamic> j) => Employee(
    id: j['id'] as String,
    employeeCode: j['employeeCode'] as String,
    firstName: j['firstName'] as String,
    lastName: j['lastName'] as String,
    personalPhone: j['personalPhone'] as String? ?? '',
    photo: j['photo'] as String?,
    designationId: j['designationId'] as String?,
    departmentId: j['departmentId'] as String?,
    joiningDate: j['joiningDate'] as String?,
  );

  String get fullName => '$firstName $lastName';
}

final employeeProvider = FutureProvider.autoDispose<Employee?>((ref) async {
  final authState = ref.watch(authStateProvider);
  if (authState.value == null) return null;
  try {
    final api = ref.read(apiClientProvider);
    final r = await api.get('/employees/me');
    return Employee.fromJson(r.data['data'] as Map<String, dynamic>);
  } catch (_) {
    return null;
  }
});
```

- [ ] **Step 2: Add FCM token registration to auth_provider.dart**

In `apps/mobile/lib/core/providers/auth_provider.dart`, add the FCM registration call inside the `login` method, after `state = AsyncData(AuthUser.fromJson(...))`:

First add the import at the top:
```dart
import 'package:firebase_messaging/firebase_messaging.dart';
```

Then in the `login` method, after `state = AsyncData(AuthUser.fromJson(me.data['data']));`, add:
```dart
    // Register FCM token
    try {
      final fcmToken = await FirebaseMessaging.instance.getToken();
      if (fcmToken != null) {
        await api.post('/auth/fcm-token', data: {'token': fcmToken, 'device': 'flutter'});
      }
    } catch (_) {}
```

- [ ] **Step 3: Add FCM permission request to main.dart**

In `apps/mobile/lib/main.dart`, after `await Firebase.initializeApp();`, add:

```dart
  // Request push notification permission
  final messaging = FirebaseMessaging.instance;
  await messaging.requestPermission(alert: true, badge: true, sound: true);
  FirebaseMessaging.onMessage.listen((RemoteMessage message) {
    // Foreground notification handling — could show a local notification here
  });
```

Also add the import:
```dart
import 'package:firebase_messaging/firebase_messaging.dart';
```

- [ ] **Step 4: Verify mobile still compiles**

In the terminal (or check that the web hot-reload didn't break — this is Flutter, so we just check for analyzer errors):

```powershell
Set-Location "I:\Upcoming Projects\WorkZen\apps\mobile"
flutter analyze lib/core/ --no-fatal-infos 2>&1 | Select-Object -Last 20
```

Expected: no errors (warnings about deprecated `.withOpacity` are OK to ignore).

---

## Task 7 — Mobile: Attendance screen with live data

**Files:**
- Create: `apps/mobile/lib/features/attendance/providers/attendance_provider.dart`
- Modify: `apps/mobile/lib/features/attendance/screens/attendance_screen.dart`

**Context:** The attendance screen currently uses hardcoded week data and month stats. Check-in/check-out uses local state (`_checkedIn`, `_checkInTime`) which resets on navigation. This task replaces all hardcoded values with live API data and persists today's status.

**Interfaces:**
- Consumes: `GET /api/v1/attendance/my-today` → `{ data: { status, checkInTime, checkOutTime, isCheckedIn } }`
- Consumes: `GET /api/v1/attendance/my-week` → `{ data: [{ dayLabel, statusCode }] }`
- Consumes: `GET /api/v1/attendance/my-month-stats` → `{ data: { present, absent, leaves } }`
- Consumes: `POST /api/v1/attendance/check-in` → updated today record
- Consumes: `POST /api/v1/attendance/check-out` → updated today record

- [ ] **Step 1: Create attendance providers**

Create `apps/mobile/lib/features/attendance/providers/attendance_provider.dart`:

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';

final todayAttendanceProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final api = ref.read(apiClientProvider);
  final r = await api.get('/attendance/my-today');
  return r.data['data'] as Map<String, dynamic>;
});

final weekAttendanceProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final api = ref.read(apiClientProvider);
  final r = await api.get('/attendance/my-week');
  return r.data['data'] as List;
});

final monthStatsProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final api = ref.read(apiClientProvider);
  final r = await api.get('/attendance/my-month-stats');
  return r.data['data'] as Map<String, dynamic>;
});
```

- [ ] **Step 2: Rewrite attendance_screen.dart**

Replace the full content of `apps/mobile/lib/features/attendance/screens/attendance_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_provider.dart';
import '../providers/attendance_provider.dart';

class AttendanceScreen extends ConsumerStatefulWidget {
  const AttendanceScreen({super.key});
  @override
  ConsumerState<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends ConsumerState<AttendanceScreen> {
  bool _actionLoading = false;

  Future<void> _doCheckIn() async {
    setState(() => _actionLoading = true);
    try {
      Position? pos;
      try {
        final perm = await Geolocator.checkPermission();
        if (perm == LocationPermission.denied) await Geolocator.requestPermission();
        pos = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
      } catch (_) {}
      final api = ref.read(apiClientProvider);
      await api.post('/attendance/check-in', data: {
        if (pos != null) 'latitude': pos.latitude,
        if (pos != null) 'longitude': pos.longitude,
        'method': 'GPS',
      });
      ref.invalidate(todayAttendanceProvider);
      ref.invalidate(weekAttendanceProvider);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('✓ Checked in'), backgroundColor: AppTheme.success));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: AppTheme.danger));
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  Future<void> _doCheckOut() async {
    setState(() => _actionLoading = true);
    try {
      Position? pos;
      try {
        pos = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.medium);
      } catch (_) {}
      final api = ref.read(apiClientProvider);
      await api.post('/attendance/check-out', data: {
        if (pos != null) 'latitude': pos.latitude,
        if (pos != null) 'longitude': pos.longitude,
      });
      ref.invalidate(todayAttendanceProvider);
      ref.invalidate(weekAttendanceProvider);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('✓ Checked out'), backgroundColor: AppTheme.success));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: AppTheme.danger));
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authStateProvider).value;
    final todayAsync = ref.watch(todayAttendanceProvider);
    final weekAsync = ref.watch(weekAttendanceProvider);
    final statsAsync = ref.watch(monthStatsProvider);
    final now = DateTime.now();
    final dateFmt = DateFormat('EEEE, dd MMM yyyy');
    final timeFmt = DateFormat('hh:mm a');

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Attendance'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_outlined),
            onPressed: () {
              ref.invalidate(todayAttendanceProvider);
              ref.invalidate(weekAttendanceProvider);
              ref.invalidate(monthStatsProvider);
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        onRefresh: () async {
          ref.invalidate(todayAttendanceProvider);
          ref.invalidate(weekAttendanceProvider);
          ref.invalidate(monthStatsProvider);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Column(children: [
            // Date + clock card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Color(0xFF1E1B4B), Color(0xFF312E81)]),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.primary.withOpacity(0.3)),
              ),
              child: Column(children: [
                Text(dateFmt.format(now), style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white70)),
                const SizedBox(height: 4),
                StreamBuilder(
                  stream: Stream.periodic(const Duration(seconds: 1)),
                  builder: (_, __) => Text(timeFmt.format(DateTime.now()),
                    style: Theme.of(context).textTheme.displayLarge?.copyWith(fontSize: 48, letterSpacing: -2)),
                ),
                const SizedBox(height: 16),
                todayAsync.when(
                  loading: () => const SizedBox(height: 24, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white54)),
                  error: (_, __) => _infoChip(Icons.person_outline, user?.name ?? 'Employee'),
                  data: (today) => Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                    _infoChip(Icons.person_outline, user?.name ?? 'Employee'),
                    const SizedBox(width: 12),
                    if (today['checkInTime'] != null)
                      _infoChip(Icons.login, 'In: ${timeFmt.format(DateTime.parse(today['checkInTime'] as String).toLocal())}'),
                    if (today['checkOutTime'] != null) ...[
                      const SizedBox(width: 8),
                      _infoChip(Icons.logout, 'Out: ${timeFmt.format(DateTime.parse(today['checkOutTime'] as String).toLocal())}'),
                    ],
                  ]),
                ),
              ]),
            ).animate().fadeIn(duration: 400.ms),

            const SizedBox(height: 24),

            // Check in/out button — driven by API state
            todayAsync.when(
              loading: () => _circleButton(isCheckedIn: false, loading: true, onTap: null),
              error: (_, __) => _circleButton(isCheckedIn: false, loading: _actionLoading, onTap: _actionLoading ? null : _doCheckIn),
              data: (today) {
                final isCheckedIn = today['isCheckedIn'] as bool? ?? false;
                return _circleButton(
                  isCheckedIn: isCheckedIn,
                  loading: _actionLoading,
                  onTap: _actionLoading ? null : (isCheckedIn ? _doCheckOut : _doCheckIn),
                );
              },
            ).animate().scale(delay: 200.ms, duration: 400.ms, curve: Curves.elasticOut),

            const SizedBox(height: 32),

            // This week
            Text('This Week', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            weekAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (_, __) => const SizedBox.shrink(),
              data: (week) => Row(
                children: (week as List).map((d) {
                  final code = d['statusCode'] as String;
                  final color = _dayColor(code);
                  return Expanded(child: Column(children: [
                    Text(d['dayLabel'] as String, style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontSize: 11)),
                    const SizedBox(height: 6),
                    Container(
                      height: 32, width: 32,
                      decoration: BoxDecoration(shape: BoxShape.circle, color: color.withOpacity(0.15), border: Border.all(color: color.withOpacity(0.4))),
                      alignment: Alignment.center,
                      child: Text(code, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ]));
                }).toList(),
              ),
            ).animate().fadeIn(delay: 300.ms),

            const SizedBox(height: 24),

            // Month stats
            statsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (_, __) => const SizedBox.shrink(),
              data: (stats) => Row(children: [
                _statCard(context, 'Present', '${stats['present']}', AppTheme.success),
                const SizedBox(width: 12),
                _statCard(context, 'Absent', '${stats['absent']}', AppTheme.danger),
                const SizedBox(width: 12),
                _statCard(context, 'Leaves', '${stats['leaves']}', AppTheme.warning),
              ]),
            ).animate().fadeIn(delay: 400.ms),
          ]),
        ),
      ),
    );
  }

  Color _dayColor(String code) {
    switch (code) {
      case 'P': return AppTheme.success;
      case 'L': return AppTheme.warning;
      case 'A': return AppTheme.danger;
      case 'H': return AppTheme.primary;
      default: return AppTheme.textMuted;
    }
  }

  Widget _circleButton({ required bool isCheckedIn, required bool loading, required VoidCallback? onTap }) {
    final color = isCheckedIn ? AppTheme.danger : AppTheme.success;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 160, height: 160,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(colors: [color.withOpacity(0.3), color.withOpacity(0.05)]),
          border: Border.all(color: color, width: 2),
          boxShadow: [BoxShadow(color: color.withOpacity(0.2), blurRadius: 40, spreadRadius: 4)],
        ),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          if (loading)
            const CircularProgressIndicator(strokeWidth: 2)
          else ...[
            Icon(isCheckedIn ? Icons.logout : Icons.fingerprint, color: color, size: 40),
            const SizedBox(height: 8),
            Text(isCheckedIn ? 'CHECK OUT' : 'CHECK IN',
              style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 1)),
          ],
        ]),
      ),
    );
  }

  Widget _infoChip(IconData icon, String label) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
    decoration: BoxDecoration(color: Colors.white.withOpacity(0.08), borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.white.withOpacity(0.12))),
    child: Row(mainAxisSize: MainAxisSize.min, children: [Icon(icon, size: 13, color: Colors.white70), const SizedBox(width: 5), Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12))]),
  );

  Widget _statCard(BuildContext context, String label, String value, Color color) => Expanded(
    child: Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: color.withOpacity(0.08), borderRadius: BorderRadius.circular(14), border: Border.all(color: color.withOpacity(0.2))),
      child: Column(children: [
        Text(value, style: Theme.of(context).textTheme.titleLarge?.copyWith(color: color, fontSize: 22)),
        const SizedBox(height: 4),
        Text(label, style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontSize: 11)),
      ]),
    ),
  );
}
```

- [ ] **Step 3: Verify no Dart errors**

```powershell
Set-Location "I:\Upcoming Projects\WorkZen\apps\mobile"
flutter analyze lib/features/attendance/ --no-fatal-infos 2>&1 | Select-Object -Last 15
```

---

## Task 8 — Mobile: Leave screen fully connected

**Files:**
- Create: `apps/mobile/lib/features/leave/providers/leave_provider.dart`
- Modify: `apps/mobile/lib/features/leave/screens/leave_screen.dart`

**Context:** The leave screen has 3 bugs: (1) calls wrong endpoint paths, (2) apply sheet passes a leaveType string code instead of a leaveTypeId UUID, (3) apply sheet hardcodes leave types instead of loading them from API. This task fixes all three.

**Interfaces:**
- Consumes: `GET /api/v1/attendance/my-leave-balance` → `[{ id, allocated, used, balance, leaveType: { name, code } }]`
- Consumes: `GET /api/v1/attendance/my-leave-requests?limit=10` → `{ data: [{ id, startDate, endDate, days, status, leaveType: { name } }] }`
- Consumes: `GET /api/v1/attendance/leave-types` → `[{ id, name, code }]`
- Consumes: `POST /api/v1/attendance/my-leave-requests` body `{ leaveTypeId, startDate, endDate, reason }` → leave request

- [ ] **Step 1: Create leave_provider.dart**

Create `apps/mobile/lib/features/leave/providers/leave_provider.dart`:

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';

final leaveBalanceProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final api = ref.read(apiClientProvider);
  final r = await api.get('/attendance/my-leave-balance');
  return r.data['data'] as List;
});

final leaveRequestsProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final api = ref.read(apiClientProvider);
  final r = await api.get('/attendance/my-leave-requests?limit=10');
  return (r.data['data'] as List);
});

final leaveTypesProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final api = ref.read(apiClientProvider);
  final r = await api.get('/attendance/leave-types');
  return r.data['data'] as List;
});
```

- [ ] **Step 2: Rewrite leave_screen.dart**

Replace the full content of `apps/mobile/lib/features/leave/screens/leave_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import '../providers/leave_provider.dart';

class LeaveScreen extends ConsumerWidget {
  const LeaveScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final balances = ref.watch(leaveBalanceProvider);
    final requests = ref.watch(leaveRequestsProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Leave Management'),
        actions: [
          TextButton.icon(
            onPressed: () => _showApplySheet(context, ref),
            icon: const Icon(Icons.add, size: 16),
            label: const Text('Apply'),
            style: TextButton.styleFrom(foregroundColor: AppTheme.primary),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        onRefresh: () async {
          ref.invalidate(leaveBalanceProvider);
          ref.invalidate(leaveRequestsProvider);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Leave Balance', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            balances.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Text('Could not load balances', style: TextStyle(color: AppTheme.danger)),
              data: (data) => data.isEmpty
                ? Text('No leave balances allocated', style: TextStyle(color: AppTheme.textMuted))
                : GridView.count(
                    crossAxisCount: 2, shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 1.8,
                    children: (data).map((b) {
                      final colors = [AppTheme.primary, AppTheme.danger, AppTheme.success, AppTheme.warning];
                      final i = data.indexOf(b);
                      return _balanceCard(context, b['leaveType']['name'] as String, (b['balance'] as num).toInt(), colors[i % colors.length]);
                    }).toList(),
                  ),
            ).animate().fadeIn(),

            const SizedBox(height: 24),
            Text('Recent Requests', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            requests.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Text('Could not load requests', style: TextStyle(color: AppTheme.danger)),
              data: (data) => data.isEmpty
                ? Text('No leave requests yet', style: TextStyle(color: AppTheme.textMuted))
                : Column(children: data.map((r) => _requestTile(context, r as Map)).toList()),
            ).animate().fadeIn(delay: 150.ms),
          ]),
        ),
      ),
    );
  }

  Widget _balanceCard(BuildContext context, String type, int days, Color color) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(color: color.withOpacity(0.08), borderRadius: BorderRadius.circular(14), border: Border.all(color: color.withOpacity(0.2))),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(type, style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontSize: 11)),
      const SizedBox(height: 4),
      Row(children: [
        Text('$days', style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: color, fontSize: 28)),
        const SizedBox(width: 4),
        Text('days', style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontSize: 11, color: AppTheme.textMuted)),
      ]),
    ]),
  );

  Widget _requestTile(BuildContext context, Map r) {
    final status = r['status'] as String;
    final color = status == 'APPROVED' ? AppTheme.success : status == 'REJECTED' ? AppTheme.danger : AppTheme.warning;
    final fmt = DateFormat('dd MMM');
    final startDate = DateTime.parse(r['startDate'] as String);
    final endDate = DateTime.parse(r['endDate'] as String);
    final days = (r['days'] as num).toInt();
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.border)),
      child: Row(children: [
        Container(width: 4, height: 48, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2))),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(r['leaveType']['name'] as String, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontSize: 14)),
          Text('${fmt.format(startDate)} – ${fmt.format(endDate)} · $days day(s)',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontSize: 12)),
        ])),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8), border: Border.all(color: color.withOpacity(0.3))),
          child: Text(status, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
        ),
      ]),
    );
  }

  void _showApplySheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      isScrollControlled: true,
      builder: (ctx) => ProviderScope(parent: ProviderContainer(parent: (context as Element).getInheritedWidgetOfExactType<UncontrolledProviderScope>()!.container),
        child: Consumer(builder: (ctx2, ref2, _) => _ApplyLeaveSheet(onSuccess: () {
          ref.invalidate(leaveBalanceProvider);
          ref.invalidate(leaveRequestsProvider);
        })),
      ),
    );
  }
}

class _ApplyLeaveSheet extends ConsumerStatefulWidget {
  final VoidCallback onSuccess;
  const _ApplyLeaveSheet({required this.onSuccess});
  @override
  ConsumerState<_ApplyLeaveSheet> createState() => _ApplyLeaveSheetState();
}

class _ApplyLeaveSheetState extends ConsumerState<_ApplyLeaveSheet> {
  String? _selectedLeaveTypeId;
  DateTime? _start, _end;
  final _reasonCtrl = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() { _reasonCtrl.dispose(); super.dispose(); }

  Future<void> _submit() async {
    if (_selectedLeaveTypeId == null || _start == null || _end == null || _reasonCtrl.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please fill all fields'), backgroundColor: AppTheme.warning));
      return;
    }
    setState(() => _submitting = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/attendance/my-leave-requests', data: {
        'leaveTypeId': _selectedLeaveTypeId,
        'startDate': _start!.toIso8601String().split('T')[0],
        'endDate': _end!.toIso8601String().split('T')[0],
        'reason': _reasonCtrl.text.trim(),
      });
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Leave applied successfully'), backgroundColor: AppTheme.success));
        widget.onSuccess();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: AppTheme.danger));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final leaveTypesAsync = ref.watch(leaveTypesProvider);
    final fmt = DateFormat('dd MMM yyyy');

    return Padding(
      padding: EdgeInsets.only(left: 20, right: 20, top: 20, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Apply Leave', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontSize: 18)),
        const SizedBox(height: 20),
        leaveTypesAsync.when(
          loading: () => const CircularProgressIndicator(),
          error: (_, __) => Text('Could not load leave types', style: TextStyle(color: AppTheme.danger)),
          data: (types) => DropdownButtonFormField<String>(
            value: _selectedLeaveTypeId,
            dropdownColor: AppTheme.surface,
            decoration: const InputDecoration(labelText: 'Leave Type'),
            hint: const Text('Select leave type'),
            items: (types as List).map((t) => DropdownMenuItem(value: t['id'] as String, child: Text(t['name'] as String))).toList(),
            onChanged: (v) => setState(() => _selectedLeaveTypeId = v),
          ),
        ),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: InkWell(
            onTap: () async {
              final d = await showDatePicker(context: context, initialDate: DateTime.now(), firstDate: DateTime.now(), lastDate: DateTime.now().add(const Duration(days: 365)));
              if (d != null) setState(() => _start = d);
            },
            child: InputDecorator(decoration: const InputDecoration(labelText: 'From'), child: Text(_start != null ? fmt.format(_start!) : 'Select', style: const TextStyle(color: Colors.white70))),
          )),
          const SizedBox(width: 12),
          Expanded(child: InkWell(
            onTap: () async {
              final d = await showDatePicker(context: context, initialDate: _start ?? DateTime.now(), firstDate: _start ?? DateTime.now(), lastDate: DateTime.now().add(const Duration(days: 365)));
              if (d != null) setState(() => _end = d);
            },
            child: InputDecorator(decoration: const InputDecoration(labelText: 'To'), child: Text(_end != null ? fmt.format(_end!) : 'Select', style: const TextStyle(color: Colors.white70))),
          )),
        ]),
        const SizedBox(height: 12),
        TextField(controller: _reasonCtrl, maxLines: 3, style: const TextStyle(color: Colors.white), decoration: const InputDecoration(labelText: 'Reason')),
        const SizedBox(height: 20),
        SizedBox(width: double.infinity, child: ElevatedButton(
          onPressed: _submitting ? null : _submit,
          child: _submitting ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Submit Application'),
        )),
      ]),
    );
  }
}
```

> Note: The `ProviderScope` wrapping in `_showApplySheet` is needed because `showModalBottomSheet` creates a new widget tree that may not have access to the parent `ProviderScope`. Use `Consumer` with the existing container instead. If this causes compilation issues, simply pass `ref` into `_ApplyLeaveSheet` as a parameter and use it directly.

**Simplified alternative for _showApplySheet** (if ProviderScope approach has issues):
```dart
void _showApplySheet(BuildContext context, WidgetRef ref) {
  showModalBottomSheet(
    context: context,
    backgroundColor: AppTheme.surface,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    isScrollControlled: true,
    builder: (ctx) => _ApplyLeaveSheet(
      onSuccess: () {
        ref.invalidate(leaveBalanceProvider);
        ref.invalidate(leaveRequestsProvider);
      },
    ),
  );
}
```

And wrap `_ApplyLeaveSheet` with its own `Consumer` approach — since it's a `ConsumerStatefulWidget`, Riverpod will find the nearest `ProviderScope` in the widget tree. Since the app has a top-level `ProviderScope` in `main.dart`, this will work without extra scoping.

- [ ] **Step 3: Analyze leave feature for errors**

```powershell
Set-Location "I:\Upcoming Projects\WorkZen\apps\mobile"
flutter analyze lib/features/leave/ --no-fatal-infos 2>&1 | Select-Object -Last 15
```

---

## Task 9 — Mobile: Payslips + Notifications + Profile connected

**Files:**
- Modify: `apps/mobile/lib/features/payslip/screens/payslips_screen.dart`
- Modify: `apps/mobile/lib/features/notifications/screens/notifications_screen.dart`
- Modify: `apps/mobile/lib/features/profile/screens/profile_screen.dart`
- Create: `apps/mobile/lib/features/profile/screens/personal_info_sheet.dart`

**Context:**
- Payslips: fix endpoint, implement PDF download via `url_launcher` (the package is already in pubspec.yaml).
- Notifications: fix endpoint (`GET /notifications?limit=20`), wire "Mark all read" button.
- Profile: load real employee data from `employeeProvider`, implement Personal Info bottom sheet.

**Interfaces:**
- Consumes: `GET /api/v1/payroll/my-payslips?limit=12` → `[{ id, payPeriod, grossSalary, netSalary, status, pdfUrl? }]`
- Consumes: `GET /api/v1/notifications?limit=20` → `[{ id, title, body, isRead, createdAt }]`
- Consumes: `PATCH /api/v1/notifications/mark-all-read` → `{ count }`
- Consumes: `GET /api/v1/employees/me` → employee object (via `employeeProvider`)

- [ ] **Step 1: Rewrite payslips_screen.dart**

Replace the full content of `apps/mobile/lib/features/payslip/screens/payslips_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';

final _payslipsProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final r = await api.get('/payroll/my-payslips?limit=12');
  return r.data['data'] as List;
});

class PayslipsScreen extends ConsumerWidget {
  const PayslipsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final payslips = ref.watch(_payslipsProvider);
    final currFmt = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
    final monthFmt = DateFormat('MMM yyyy');

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Payslips'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh_outlined), onPressed: () => ref.invalidate(_payslipsProvider)),
        ],
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        onRefresh: () async => ref.invalidate(_payslipsProvider),
        child: payslips.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(
            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              const Icon(Icons.error_outline, color: AppTheme.danger, size: 48),
              const SizedBox(height: 12),
              Text(e.toString(), style: const TextStyle(color: AppTheme.textMuted), textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: () => ref.invalidate(_payslipsProvider), child: const Text('Retry')),
            ]),
          ),
          data: (data) => data.isEmpty
            ? const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Icon(Icons.receipt_long_outlined, size: 48, color: AppTheme.textMuted),
                SizedBox(height: 12),
                Text('No payslips found', style: TextStyle(color: AppTheme.textMuted)),
              ]))
            : ListView.separated(
                padding: const EdgeInsets.all(20),
                itemCount: data.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (ctx, i) => _payslipCard(context, data[i] as Map, currFmt, monthFmt),
              ),
        ),
      ),
    );
  }

  Widget _payslipCard(BuildContext context, Map data, NumberFormat curr, DateFormat month) {
    final date = DateTime.parse(data['payPeriod'] as String);
    final isPaid = data['status'] == 'PAID';
    final pdfUrl = data['pdfUrl'] as String?;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.border)),
      child: Row(children: [
        Container(
          width: 44, height: 44,
          decoration: BoxDecoration(color: AppTheme.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.primary.withOpacity(0.2))),
          child: const Icon(Icons.receipt_long_outlined, color: AppTheme.primary, size: 20),
        ),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(month.format(date), style: Theme.of(context).textTheme.titleMedium?.copyWith(fontSize: 14)),
          Text(
            'Gross: ${curr.format((data['grossSalary'] as num).toInt())} · Net: ${curr.format((data['netSalary'] as num).toInt())}',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontSize: 12),
          ),
        ])),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: (isPaid ? AppTheme.success : AppTheme.warning).withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: (isPaid ? AppTheme.success : AppTheme.warning).withOpacity(0.3)),
            ),
            child: Text(isPaid ? 'PAID' : 'PENDING', style: TextStyle(color: isPaid ? AppTheme.success : AppTheme.warning, fontSize: 10, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(height: 8),
          if (pdfUrl != null)
            GestureDetector(
              onTap: () async {
                final uri = Uri.parse(pdfUrl);
                if (await canLaunchUrl(uri)) {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                }
              },
              child: const Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(Icons.download_outlined, size: 14, color: AppTheme.primary),
                SizedBox(width: 4),
                Text('PDF', style: TextStyle(color: AppTheme.primary, fontSize: 12, fontWeight: FontWeight.w600)),
              ]),
            )
          else
            const Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.download_outlined, size: 14, color: AppTheme.textMuted),
              SizedBox(width: 4),
              Text('PDF', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
            ]),
        ]),
      ]),
    ).animate().fadeIn(delay: Duration(milliseconds: 50));
  }
}
```

- [ ] **Step 2: Rewrite notifications_screen.dart**

Replace full content of `apps/mobile/lib/features/notifications/screens/notifications_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';

final _notifProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final r = await api.get('/notifications?limit=20');
  return r.data['data'] as List;
});

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  Future<void> _markAllRead(BuildContext context, WidgetRef ref) async {
    try {
      final api = ref.read(apiClientProvider);
      await api.patch('/notifications/mark-all-read');
      ref.invalidate(_notifProvider);
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('All marked as read'), backgroundColor: AppTheme.success));
    } catch (e) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: AppTheme.danger));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifs = ref.watch(_notifProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          TextButton(
            onPressed: () => _markAllRead(context, ref),
            child: const Text('Mark all read', style: TextStyle(color: AppTheme.primary, fontSize: 12)),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        onRefresh: () async => ref.invalidate(_notifProvider),
        child: notifs.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            const Icon(Icons.error_outline, color: AppTheme.danger, size: 48),
            const SizedBox(height: 12),
            Text('Could not load notifications', style: TextStyle(color: AppTheme.textMuted)),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: () => ref.invalidate(_notifProvider), child: const Text('Retry')),
          ])),
          data: (data) => data.isEmpty
            ? const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Icon(Icons.notifications_off_outlined, size: 48, color: AppTheme.textMuted),
                SizedBox(height: 12),
                Text('No notifications', style: TextStyle(color: AppTheme.textMuted)),
              ]))
            : ListView.separated(
                itemCount: data.length,
                separatorBuilder: (_, __) => Divider(color: AppTheme.border, height: 1),
                itemBuilder: (ctx, i) {
                  final n = data[i] as Map;
                  final isRead = n['isRead'] as bool? ?? false;
                  final createdAt = n['createdAt'] != null ? DateTime.parse(n['createdAt'] as String) : DateTime.now();
                  return ListTile(
                    tileColor: isRead ? Colors.transparent : AppTheme.primary.withOpacity(0.04),
                    leading: Container(
                      width: 40, height: 40,
                      decoration: BoxDecoration(color: AppTheme.primary.withOpacity(0.1), shape: BoxShape.circle),
                      child: const Icon(Icons.notifications_outlined, color: AppTheme.primary, size: 18),
                    ),
                    title: Text(n['title'] as String? ?? '', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: isRead ? FontWeight.normal : FontWeight.w600)),
                    subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(n['body'] as String? ?? '', style: const TextStyle(color: AppTheme.textMuted, fontSize: 12), maxLines: 2, overflow: TextOverflow.ellipsis),
                      Text(timeago.format(createdAt), style: const TextStyle(color: AppTheme.textMuted, fontSize: 10)),
                    ]),
                    trailing: !isRead ? Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppTheme.primary, shape: BoxShape.circle)) : null,
                  );
                },
              ),
        ),
      ),
    );
  }
}
```

- [ ] **Step 3: Create personal_info_sheet.dart**

Create `apps/mobile/lib/features/profile/screens/personal_info_sheet.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/providers/employee_provider.dart';
import '../../../core/theme/app_theme.dart';

class PersonalInfoSheet extends ConsumerWidget {
  const PersonalInfoSheet({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final empAsync = ref.watch(employeeProvider);

    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: const EdgeInsets.all(24),
      child: empAsync.when(
        loading: () => const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator())),
        error: (_, __) => const Center(child: Text('Could not load profile', style: TextStyle(color: AppTheme.textMuted))),
        data: (emp) => emp == null
          ? const Center(child: Text('No employee profile linked', style: TextStyle(color: AppTheme.textMuted)))
          : Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Personal Information', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontSize: 18)),
              const SizedBox(height: 20),
              _row('Employee Code', emp.employeeCode),
              _row('Full Name', emp.fullName),
              _row('Phone', emp.personalPhone),
              if (emp.joiningDate != null)
                _row('Joining Date', DateFormat('dd MMM yyyy').format(DateTime.parse(emp.joiningDate!))),
              const SizedBox(height: 20),
            ]),
      ),
    );
  }

  Widget _row(String label, String value) => Padding(
    padding: const EdgeInsets.only(bottom: 16),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SizedBox(width: 120, child: Text(label, style: const TextStyle(color: AppTheme.textMuted, fontSize: 13))),
      Expanded(child: Text(value, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500))),
    ]),
  );
}
```

- [ ] **Step 4: Update profile_screen.dart to use employee data**

Replace the full content of `apps/mobile/lib/features/profile/screens/profile_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../core/providers/employee_provider.dart';
import '../../../core/theme/app_theme.dart';
import 'personal_info_sheet.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authStateProvider).value;
    final empAsync = ref.watch(employeeProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(title: const Text('Profile')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(children: [
          empAsync.when(
            loading: () => CircleAvatar(
              radius: 44,
              backgroundColor: AppTheme.primary.withOpacity(0.15),
              child: const CircularProgressIndicator(strokeWidth: 2),
            ),
            error: (_, __) => CircleAvatar(
              radius: 44,
              backgroundColor: AppTheme.primary.withOpacity(0.15),
              child: Text((user?.name ?? 'U')[0], style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: AppTheme.primary)),
            ),
            data: (emp) => CircleAvatar(
              radius: 44,
              backgroundColor: AppTheme.primary.withOpacity(0.15),
              backgroundImage: emp?.photo != null ? NetworkImage(emp!.photo!) : null,
              child: emp?.photo == null
                ? Text((user?.name ?? 'U')[0], style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: AppTheme.primary))
                : null,
            ),
          ),
          const SizedBox(height: 12),
          Text(user?.name ?? 'Employee', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontSize: 20)),
          Text(user?.email ?? '', style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 4),
          empAsync.maybeWhen(
            data: (emp) => emp != null ? Text(emp.employeeCode, style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)) : const SizedBox.shrink(),
            orElse: () => const SizedBox.shrink(),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
            decoration: BoxDecoration(color: AppTheme.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(8), border: Border.all(color: AppTheme.primary.withOpacity(0.3))),
            child: Text(user?.role ?? 'EMPLOYEE', style: const TextStyle(color: AppTheme.primary, fontSize: 12, fontWeight: FontWeight.w600)),
          ),
          const SizedBox(height: 32),
          ...[
            ('Personal Info', Icons.person_outline, () => showModalBottomSheet(
              context: context,
              backgroundColor: Colors.transparent,
              isScrollControlled: true,
              builder: (_) => const PersonalInfoSheet(),
            )),
            ('Bank Details', Icons.account_balance_outlined, () {}),
            ('Documents', Icons.folder_outlined, () {}),
            ('Change Password', Icons.lock_outline, () {}),
            ('Notifications', Icons.notifications_outlined, () {}),
          ].map((item) => _tile(context, item.$1, item.$2, item.$3)),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => ref.read(authStateProvider.notifier).logout(),
              icon: const Icon(Icons.logout, size: 16, color: AppTheme.danger),
              label: const Text('Sign Out', style: TextStyle(color: AppTheme.danger)),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppTheme.danger, width: 1),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ]),
      ),
    );
  }

  Widget _tile(BuildContext context, String label, IconData icon, VoidCallback onTap) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(14),
    child: Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.border)),
      child: Row(children: [
        Icon(icon, size: 18, color: AppTheme.textSecondary),
        const SizedBox(width: 14),
        Expanded(child: Text(label, style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontSize: 14))),
        const Icon(Icons.chevron_right, size: 16, color: AppTheme.textMuted),
      ]),
    ),
  );
}
```

- [ ] **Step 5: Analyze all modified screens**

```powershell
Set-Location "I:\Upcoming Projects\WorkZen\apps\mobile"
flutter analyze lib/ --no-fatal-infos 2>&1 | Where-Object { $_ -match "error" } | Select-Object -First 30
```

Expected: zero errors. Warnings about `.withOpacity` deprecation are acceptable.

- [ ] **Step 6: Final compile check**

```powershell
Set-Location "I:\Upcoming Projects\WorkZen\apps\mobile"
flutter build apk --debug 2>&1 | Select-Object -Last 20
```

Expected: `✓ Built build/app/outputs/flutter-apk/app-debug.apk`

If build fails, read the error carefully — common issues:
- Missing import: add the import line shown in the error
- Method not found: check that the API method name matches exactly between controller and service
- Type mismatch on `data['field'] as X`: cast to `num` first then `.toInt()` for integers from API

---

## Self-Review

**Spec coverage check:**

- ✅ `GET /auth/me` — Task 1
- ✅ `POST /auth/fcm-token` — Task 1 + Task 6
- ✅ `POST /attendance/check-in` (self-service, no employeeId) — Task 2
- ✅ `POST /attendance/check-out` (self-service) — Task 2
- ✅ Today attendance status from API, not local state — Task 7
- ✅ Week summary from API, not hardcoded — Task 7
- ✅ Month stats from API, not hardcoded — Task 7
- ✅ `GET /attendance/my-leave-balance` — Task 3
- ✅ `GET /attendance/my-leave-requests` — Task 3
- ✅ `POST /attendance/my-leave-requests` with leaveTypeId — Task 3
- ✅ Leave apply sheet loads leave types from API — Task 8
- ✅ `GET /payroll/my-payslips` — Task 4
- ✅ Payslip PDF download via url_launcher — Task 9
- ✅ `GET /notifications?limit=20` — Task 5
- ✅ `PATCH /notifications/mark-all-read` — Task 5 + Task 9
- ✅ `GET /employees/me` — Task 5
- ✅ Profile screen shows real employee data — Task 9
- ✅ Personal Info bottom sheet — Task 9
- ✅ FCM permission + token registration — Task 6

**Placeholder scan:** All code blocks are complete. No TBD.

**Type consistency check:**
- `AttendanceService.selfCheckIn/selfCheckOut/myTodayStatus/myWeekSummary/myMonthStats/myLeaveBalance/myLeaveRequests/applyLeave` — all use `resolveEmployee(tenantId, userId)` helper defined in Task 2 Step 1
- `PayrollService.getMyPayslips` uses `prisma.employee.findUnique({ where: { userId } })` — same pattern
- Flutter: `employeeProvider` returns `Employee?` — all consumers use `.maybeWhen` or null-check before accessing fields
- `leaveTypesProvider` returns `List<dynamic>` — cast to `List` and access `.map((t) => t['id'] as String)` is consistent with the `applyLeave` API that expects a string UUID

---

Plan complete and saved to `docs/superpowers/plans/2026-06-18-mobile-full-connectivity.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks

**2. Inline Execution** — Execute tasks in this session using executing-plans skill

Which approach?
