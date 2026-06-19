# WorkZen ERP - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete enterprise-grade ERP for a Manpower Supply Company covering Tender, Employee, Payroll, Compliance, Billing, and Operations management.

**Architecture:** Turbo monorepo with three applications — NestJS REST+GraphQL API, Next.js 15 SaaS dashboard, and Flutter mobile app — backed by PostgreSQL via Prisma ORM, Redis caching, and BullMQ for async jobs.

**Tech Stack:** Next.js 15, NestJS, Prisma, PostgreSQL, Redis, BullMQ, Flutter, Docker, Kubernetes, GitHub Actions, Shadcn/UI, TanStack Query, Zustand, ApexCharts, JWT+RBAC, AWS S3

---

## File Structure

```
WorkZen/
├── CLAUDE.md
├── Architecture.md
├── package.json                          # Turbo monorepo root
├── turbo.json
├── .env.example
├── docker-compose.yml
├── docker-compose.prod.yml
├── packages/
│   ├── database/
│   │   ├── prisma/schema.prisma          # All 14 module models
│   │   ├── src/index.ts                  # Prisma client export
│   │   └── package.json
│   ├── shared/
│   │   ├── src/types/index.ts            # Shared TS types
│   │   ├── src/constants/index.ts
│   │   └── package.json
│   └── config/
│       ├── src/index.ts
│       └── package.json
├── apps/
│   ├── api/                              # NestJS backend
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── common/                   # Guards, decorators, pipes
│   │   │   ├── auth/                     # JWT, 2FA, refresh tokens
│   │   │   ├── tenants/                  # Multi-tenant management
│   │   │   ├── users/                    # User & RBAC
│   │   │   ├── tenders/                  # Module 1
│   │   │   ├── clients/                  # Module 2
│   │   │   ├── employees/                # Module 3
│   │   │   ├── recruitment/              # Module 4
│   │   │   ├── deployment/               # Module 5
│   │   │   ├── attendance/               # Module 6
│   │   │   ├── payroll/                  # Module 7
│   │   │   ├── compliance/               # Module 8
│   │   │   ├── billing/                  # Module 9
│   │   │   ├── finance/                  # Module 10
│   │   │   ├── assets/                   # Module 11
│   │   │   ├── documents/                # Module 12
│   │   │   ├── workflows/                # Module 13
│   │   │   ├── reports/                  # Module 14
│   │   │   └── notifications/
│   │   ├── test/
│   │   └── package.json
│   ├── web/                              # Next.js 15 frontend
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── (auth)/
│   │   │   │   └── (dashboard)/
│   │   │   │       ├── dashboard/
│   │   │   │       ├── tenders/
│   │   │   │       ├── clients/
│   │   │   │       ├── employees/
│   │   │   │       ├── recruitment/
│   │   │   │       ├── deployment/
│   │   │   │       ├── attendance/
│   │   │   │       ├── payroll/
│   │   │   │       ├── compliance/
│   │   │   │       ├── billing/
│   │   │   │       ├── finance/
│   │   │   │       ├── assets/
│   │   │   │       ├── documents/
│   │   │   │       ├── reports/
│   │   │   │       └── settings/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── stores/
│   │   │   └── lib/
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   └── mobile/                           # Flutter app
│       ├── lib/
│       │   ├── main.dart
│       │   ├── app/
│       │   ├── features/
│       │   └── core/
│       └── pubspec.yaml
├── infrastructure/
│   ├── docker/
│   ├── kubernetes/
│   └── nginx/
└── .github/workflows/
```

---

### Task 1: Monorepo Root Config

- [ ] Create `package.json` with workspaces
- [ ] Create `turbo.json` pipeline
- [ ] Create `.env.example`
- [ ] Commit: `chore: init monorepo`

### Task 2: Database Package — Prisma Schema

- [ ] Write complete `schema.prisma` with all models
- [ ] Run `prisma generate`
- [ ] Run `prisma migrate dev`

### Task 3: Shared Package

- [ ] Create shared TypeScript types for all modules
- [ ] Create constants (roles, statuses, enums)

### Task 4: NestJS API — Bootstrap

- [ ] Setup `main.ts`, `app.module.ts`
- [ ] Configure Swagger, CORS, validation pipes
- [ ] JWT auth module with refresh tokens + 2FA
- [ ] RBAC guards and decorators

### Task 5: All NestJS Modules (1–14)

- [ ] Create controller, service, module, dto for each module
- [ ] Wire Prisma into each service

### Task 6: Next.js Frontend — Layout & Auth

- [ ] Root layout with providers
- [ ] Auth pages (login, register, forgot-password)
- [ ] Dashboard sidebar/header with navigation

### Task 7: Next.js — All Module Pages

- [ ] Tender Management page with CRUD
- [ ] Client Management page
- [ ] Employee Management with profile view
- [ ] Recruitment pipeline
- [ ] Deployment board
- [ ] Attendance calendar
- [ ] Payroll processing UI
- [ ] Compliance calendar
- [ ] Billing & invoicing UI
- [ ] Finance dashboard
- [ ] Asset management
- [ ] Document manager
- [ ] Reports with ApexCharts

### Task 8: Flutter Mobile App

- [ ] Scaffold with Riverpod, GoRouter
- [ ] Auth flow
- [ ] Attendance, Leave, Payslip screens
- [ ] Push notifications

### Task 9: Infrastructure

- [ ] `docker-compose.yml` for local dev
- [ ] `docker-compose.prod.yml`
- [ ] Kubernetes manifests
- [ ] Nginx config
- [ ] GitHub Actions CI/CD

---

*Plan complete. Execute inline.*
