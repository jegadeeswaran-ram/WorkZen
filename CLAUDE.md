# WorkZen ERP — Claude Code Guide

## Project Overview

**WorkZen** is an enterprise-grade ERP platform for Manpower Supply Companies. It manages Government Tenders, Contract Labour, Payroll, Compliance, Billing, and Operations.

**Target:** 1000+ employees, multiple government contracts, multi-tenant SaaS.

---

## Monorepo Structure

```
WorkZen/
├── apps/api         NestJS REST + GraphQL backend
├── apps/web         Next.js 15 SaaS frontend
├── apps/mobile      Flutter mobile app
├── packages/database  Prisma schema + client
├── packages/shared    Shared TypeScript types
├── packages/config    Shared config
├── infrastructure/    Docker, K8s, Nginx
└── .github/workflows  CI/CD
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Shadcn/UI, TanStack Query, Zustand |
| Backend | NestJS, TypeScript, REST + GraphQL, JWT, RBAC, BullMQ, Redis |
| Database | PostgreSQL, Prisma ORM, Row Level Security |
| Mobile | Flutter, Riverpod, Dio, GoRouter |
| Storage | AWS S3 Compatible (MinIO for local) |
| Notifications | Email (Nodemailer), SMS (Twilio), WhatsApp (WATI), FCM Push |
| DevOps | Docker, Kubernetes, Nginx, GitHub Actions |

---

## Skills & Agents Required

### Claude Code Skills
- `vercel:nextjs` — Next.js 15 App Router patterns, server components, actions
- `vercel:shadcn` — Shadcn/UI component patterns
- `frontend-design:frontend-design` — High-quality UI/UX implementation
- `superpowers:test-driven-development` — TDD for all modules
- `superpowers:subagent-driven-development` — Parallel module execution
- `superpowers:systematic-debugging` — Bug resolution
- `vercel:react-best-practices` — React optimization patterns
- `vercel:vercel-functions` — Serverless function patterns
- `appwrite:typescript` — Appwrite SDK patterns (if switching backend)

### Recommended Plugins
- `figma:figma-generate-design` — Generate UI mockups from requirements
- `mcp__magic__21st_magic_component_builder` — Build polished UI components

### Agents
- `vercel:ai-architect` — AI feature architecture (anomaly detection, forecasting)
- `Plan` agent — When adding new modules or major features
- `Explore` agent — Codebase search across all packages

---

## Modules

| # | Module | Key Entities |
|---|---|---|
| 1 | Tender Management | Tender, WorkOrder, TenderDocument |
| 2 | Client Management | Client, ClientContact, ClientPortal |
| 3 | Employee Management | Employee, EmployeeDocument, BankDetail |
| 4 | Recruitment | JobRequisition, Candidate, Interview |
| 5 | Deployment | Deployment, Shift, Roster |
| 6 | Attendance | AttendanceRecord, Leave, Holiday |
| 7 | Payroll | PayrollRun, Payslip, SalaryComponent |
| 8 | Compliance | ComplianceItem, Challan, Return |
| 9 | Billing | Invoice, Payment, CreditNote |
| 10 | Finance | Account, Transaction, JournalEntry |
| 11 | Asset Management | Asset, AssetAssignment |
| 12 | Document Management | Document, DocumentVersion |
| 13 | Workflow Engine | Workflow, WorkflowStep, Approval |
| 14 | Reports & Analytics | ReportDefinition, ReportExecution |

---

## Multi-Tenant Architecture

Every table has:
```sql
tenant_id   UUID NOT NULL
created_by  UUID
updated_by  UUID
created_at  TIMESTAMP
updated_at  TIMESTAMP
deleted_at  TIMESTAMP  -- soft delete
```

Use `TenantGuard` on all API routes. Prisma middleware adds `tenant_id` filter automatically.

---

## RBAC Roles

```
super_admin > company_owner > hr_manager > tender_manager >
operations_manager > payroll_manager > finance_manager >
compliance_officer > recruiter > site_supervisor >
field_officer > client_user > employee
```

Permissions are resource:action pairs (e.g., `tender:create`, `payroll:approve`).

---

## Development Commands

```bash
# Install all dependencies
npm install

# Start dev (API + Web)
npm run dev

# Start only API
npm run dev --filter=api

# Start only Web
npm run dev --filter=web

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Run all tests
npm run test

# Build all
npm run build

# Lint
npm run lint
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in values. Never commit `.env`.

Key variables:
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection
- `JWT_SECRET` — JWT signing secret (min 32 chars)
- `JWT_REFRESH_SECRET` — Refresh token secret
- `AWS_S3_*` — S3 storage credentials
- `SMTP_*` — Email configuration
- `TWILIO_*` — SMS configuration

---

## Code Conventions

- **Files:** `kebab-case.ts` for files, `PascalCase` for classes/components
- **DTOs:** Always validate with `class-validator` + `class-transformer`
- **API responses:** Use `ResponseDto<T>` wrapper with `success`, `data`, `message`
- **Errors:** Throw `HttpException` subclasses; caught by global exception filter
- **Pagination:** Use cursor or offset pagination via `PaginationDto`
- **Tenant isolation:** Never skip `tenant_id` filter in queries
- **Audit:** Every mutation calls `AuditService.log()`

---

## Testing Strategy

- Unit tests: `*.spec.ts` next to source file
- E2E tests: `apps/api/test/` and `apps/web/e2e/`
- Coverage target: 80% per module
- Run: `npm test` (unit), `npm run test:e2e` (integration)

---

## Key Files to Know

| File | Purpose |
|---|---|
| `packages/database/prisma/schema.prisma` | Single source of truth for all data models |
| `apps/api/src/app.module.ts` | All NestJS module registrations |
| `apps/api/src/common/guards/` | JWT, RBAC, Tenant guards |
| `apps/web/src/app/(dashboard)/layout.tsx` | Main app shell |
| `apps/web/src/lib/api.ts` | Typed API client |
| `apps/web/src/stores/` | Zustand global state |
| `docker-compose.yml` | Local dev services (PG, Redis, MinIO) |

---

## Architecture Document

See `Architecture.md` for system diagrams, data flow, and deployment topology.

## Implementation Plan

See `docs/superpowers/plans/2026-06-06-workzen-erp.md` for the full task-by-task implementation plan.
