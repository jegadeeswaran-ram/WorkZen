# WorkZen ERP — System Architecture

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Web Browser │  │  Flutter App │  │  Client Portal       │  │
│  │  (Next.js 15)│  │  (Mobile)    │  │  (Sub-domain)        │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
└─────────┼─────────────────┼──────────────────────┼─────────────┘
          │                 │                      │
          ▼                 ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NGINX REVERSE PROXY                           │
│         Rate Limiting │ SSL Termination │ Load Balancing         │
└─────────────────────────────────┬───────────────────────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          ▼                        ▼                        ▼
┌──────────────────┐  ┌────────────────────┐  ┌───────────────────┐
│   Next.js Web    │  │   NestJS API       │  │   WebSocket       │
│   (Port 3000)    │  │   (Port 4000)      │  │   (Port 4001)     │
│                  │  │   REST + GraphQL   │  │   Real-time       │
└──────────────────┘  └─────────┬──────────┘  └───────────────────┘
                                 │
          ┌──────────────────────┼──────────────────────────┐
          ▼                      ▼                          ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│   PostgreSQL     │  │   Redis Cache    │  │   BullMQ Queues      │
│   (Port 5432)    │  │   (Port 6379)    │  │   (Background Jobs)  │
└──────────────────┘  └──────────────────┘  └──────────────────────┘
                                 │
          ┌──────────────────────┼──────────────────────────┐
          ▼                      ▼                          ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│   AWS S3         │  │   Email (SMTP)   │  │  SMS/WhatsApp        │
│   Document Store │  │   SendGrid       │  │  Twilio / WATI       │
└──────────────────┘  └──────────────────┘  └──────────────────────┘
```

---

## 2. Multi-Tenant Architecture

```
┌───────────────────────────────────────────────┐
│                 WorkZen SaaS                   │
│                                               │
│  ┌─────────────────┐  ┌─────────────────┐     │
│  │  Tenant A       │  │  Tenant B       │     │
│  │  (Company ABC)  │  │  (Company XYZ)  │     │
│  │  tenant_id=001  │  │  tenant_id=002  │     │
│  └─────────────────┘  └─────────────────┘     │
│                                               │
│  Shared Database  │  Tenant Row Isolation     │
│  Shared Services  │  Separate Configurations  │
└───────────────────────────────────────────────┘
```

**Isolation Strategy:** Schema-per-tenant via `tenant_id` row-level isolation.
Every Prisma query is middleware-intercepted to inject `WHERE tenant_id = :current_tenant`.

### Tenant Resolution

```
Request → Extract JWT → Decode tenant_id → TenantGuard validates → 
Prisma middleware scopes all queries
```

---

## 3. Authentication & Authorization Flow

```
Client
  │
  ├─► POST /auth/login
  │     │
  │     ├─ Validate credentials
  │     ├─ Check 2FA (TOTP)
  │     └─ Return { accessToken, refreshToken }
  │
  ├─► Every API Request
  │     │
  │     ├─ JwtGuard → verify accessToken (15min TTL)
  │     ├─ TenantGuard → extract + validate tenant_id
  │     ├─ RbacGuard → check role:permission matrix
  │     └─ AuditLog → record action
  │
  └─► POST /auth/refresh
        └─ Validate refreshToken (7d TTL) → new accessToken
```

### RBAC Permission Matrix (Condensed)

| Resource | super_admin | company_owner | hr_manager | tender_manager | payroll_manager | employee |
|---|---|---|---|---|---|---|
| tender:* | ✓ | ✓ | — | ✓ | — | — |
| employee:* | ✓ | ✓ | ✓ | — | — | self |
| payroll:* | ✓ | ✓ | — | — | ✓ | self-read |
| compliance:* | ✓ | ✓ | — | — | — | — |
| billing:* | ✓ | ✓ | — | — | — | — |
| reports:* | ✓ | ✓ | ✓ | ✓ | ✓ | — |

---

## 4. Database Architecture

### Entity Relationship Overview

```
Tenant (1) ──── (N) Organization
Organization (1) ──── (N) Users
Organization (1) ──── (N) Tenders
Tender (1) ──── (N) WorkOrders
WorkOrder (N) ──── (N) Employees (via Deployment)
Employee (1) ──── (N) AttendanceRecords
Employee (1) ──── (N) Payslips (via PayrollRun)
Tender (1) ──── (N) Invoices
Invoice (1) ──── (N) Payments
Employee (1) ──── (N) ComplianceItems (PF, ESI, PT)
```

### Core Tables

| Table | Purpose |
|---|---|
| `tenants` | SaaS tenant registry |
| `organizations` | Company profiles |
| `users` | Authentication, profile |
| `roles` | RBAC role definitions |
| `permissions` | resource:action pairs |
| `tenders` | Government contract tenders |
| `work_orders` | Work orders under tenders |
| `clients` | Government departments / PSUs |
| `employees` | Employee master |
| `deployments` | Employee → Site assignments |
| `attendance_records` | Daily attendance |
| `payroll_runs` | Monthly payroll batch |
| `payslips` | Individual payslips |
| `invoices` | Client billing |
| `compliance_items` | PF/ESI/PT filings |
| `assets` | Uniform, equipment inventory |
| `documents` | File metadata |
| `workflows` | Approval workflow definitions |
| `audit_logs` | All mutations |

### Indexing Strategy

- All `tenant_id` columns indexed
- `employee_id + month_year` composite index on `payslips`
- `tender_id + status` index on `deployments`
- `employee_id + date` index on `attendance_records`
- Full-text search via PostgreSQL `tsvector` on employee name, tender name

---

## 5. API Architecture

### REST Conventions

```
GET    /api/v1/{resource}           List (paginated)
GET    /api/v1/{resource}/:id       Get one
POST   /api/v1/{resource}           Create
PATCH  /api/v1/{resource}/:id       Update
DELETE /api/v1/{resource}/:id       Soft delete

Pagination: ?page=1&limit=20&sort=createdAt:desc
Filter: ?status=active&search=keyword
```

### Standard Response Envelope

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 450,
    "totalPages": 23
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [{ "field": "email", "message": "Invalid email" }]
  }
}
```

---

## 6. Frontend Architecture

### Next.js 15 App Router Structure

```
app/
├── (auth)/            Public — login, register, forgot-password
│   └── layout.tsx     Clean centered layout
├── (dashboard)/       Protected — requires auth
│   ├── layout.tsx     Sidebar + Header shell
│   ├── dashboard/     Analytics overview
│   ├── tenders/       Module pages
│   ├── employees/
│   ├── payroll/
│   └── ...
└── api/               Next.js route handlers (minimal — proxy to NestJS)
```

### Data Fetching Pattern

```tsx
// Server Component — static/initial data
const data = await fetch(`${API_URL}/tenders`, { 
  headers: { Authorization: `Bearer ${token}` },
  next: { tags: ['tenders'] } 
})

// Client Component — interactive/real-time
const { data } = useQuery({ queryKey: ['tenders'], queryFn: fetchTenders })
```

### State Management

- **Server state:** TanStack Query (caching, invalidation, optimistic updates)
- **Global UI state:** Zustand (sidebar, modals, notifications)
- **Forms:** React Hook Form + Zod validation

---

## 7. Background Job Architecture

```
API Controller
  └─► BullMQ Producer → Redis Queue
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        Payroll        Compliance    Notification
        Processor      Processor     Processor
              │            │            │
        Generate       Generate    Send Email/
        Payslips       Challans    SMS/WhatsApp
```

### Queue Definitions

| Queue | Jobs |
|---|---|
| `payroll` | ProcessPayrollRun, GeneratePayslips, GenerateBankFile |
| `compliance` | GenerateChallan, SendComplianceAlert |
| `notifications` | SendEmail, SendSMS, SendWhatsApp, SendPush |
| `reports` | GenerateReport, ExportPDF, ExportExcel |
| `documents` | ProcessOCR, ScanDocument |

---

## 8. Mobile App Architecture (Flutter)

```
lib/
├── core/
│   ├── network/       Dio HTTP client
│   ├── storage/       Hive offline storage
│   └── theme/         App theme
├── features/
│   ├── auth/          Login, biometric
│   ├── attendance/    GPS mark, QR scan
│   ├── leave/         Request, approval
│   ├── payslips/      View, download
│   ├── tasks/         Supervisor tasks
│   └── notifications/ FCM push
└── app/
    └── router.dart    GoRouter config
```

---

## 9. Deployment Architecture

### Kubernetes Topology

```
Kubernetes Cluster
├── Namespace: workzen-prod
│   ├── Deployment: api (3 replicas)
│   ├── Deployment: web (2 replicas)
│   ├── Deployment: worker (2 replicas)
│   ├── StatefulSet: postgresql
│   ├── StatefulSet: redis
│   ├── Service: api-svc (ClusterIP)
│   ├── Service: web-svc (ClusterIP)
│   ├── Ingress: nginx-ingress
│   │   ├── app.workzen.com → web-svc
│   │   └── api.workzen.com → api-svc
│   ├── ConfigMap: app-config
│   ├── Secret: app-secrets
│   └── HPA: api-hpa (min:3, max:10)
```

### CI/CD Pipeline

```
Push to main
  └─► GitHub Actions
        ├── Lint & Type Check
        ├── Unit Tests
        ├── E2E Tests
        ├── Build Docker Images
        ├── Push to Registry (GHCR)
        ├── Deploy to Staging (auto)
        └── Deploy to Production (manual approval)
```

---

## 10. AI Features Architecture

| Feature | Implementation |
|---|---|
| Attendance Anomaly Detection | Isolation Forest on attendance patterns → BullMQ daily job |
| Payroll Validation | Rule-based + ML: detect outliers in payslip amounts |
| Invoice Verification | OCR + LLM extraction (Claude API) |
| Tender Profitability Forecast | Linear regression on historical tender data |
| Workforce Demand Prediction | Time-series model on deployment patterns |
| Chat Assistant | Claude API (claude-sonnet-4-6) via AI SDK streaming |

---

## 11. Security Architecture

| Layer | Implementation |
|---|---|
| Transport | TLS 1.3 via Nginx |
| Authentication | JWT (RS256), 15min access + 7d refresh |
| 2FA | TOTP (Google Authenticator compatible) |
| Authorization | RBAC with tenant isolation |
| Data at Rest | PostgreSQL encryption, S3 SSE |
| Rate Limiting | 100 req/min general, 5 req/min auth |
| CORS | Whitelist per tenant domain |
| Audit | Every mutation logged in `audit_logs` |
| Session | Redis session store with device tracking |
| Secrets | Kubernetes Secrets / .env (never committed) |
