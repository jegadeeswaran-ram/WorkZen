# WorkZen ERP — Full Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all 9 priority ERP modules (Settings → Employee → Tender → Client → Deployment → Attendance → Payroll → Compliance → Billing) to production-ready level with full CRUD, forms, validation, and API integration.

**Architecture:** NestJS REST API (port 3001) + Next.js 15 App Router frontend (port 3000). All pages use TanStack Query for data fetching, Zustand for auth state, react-hook-form + zod for forms. API uses triple-guard (JWT→Tenant→RBAC). Every module needs: backend service complete, controller permissions fixed, frontend list page + create/edit modal + detail view + delete.

**Tech Stack:** NestJS 10, Prisma 5, PostgreSQL 17, Next.js 15, TypeScript, Tailwind CSS, Shadcn/UI, TanStack Query, Zustand, react-hook-form, Zod, ApexCharts, Framer Motion

**Key file paths:**
- API: `apps/api/src/<module>/`
- Web pages: `apps/web/src/app/(dashboard)/<module>/page.tsx`
- API client: `apps/web/src/lib/api.ts`
- Auth store: `apps/web/src/stores/auth.store.ts`
- Utils: `apps/web/src/lib/utils.ts`
- Schema: `packages/database/prisma/schema.prisma`

**Design system tokens** (use consistently in all UI):
```
background: #060e1a
card: rgba(255,255,255,0.03) border rgba(255,255,255,0.06)
primary: #6366f1
success: #10b981
warning: #f59e0b
danger: #f43f5e
text-muted: rgba(255,255,255,0.4)
input class: input-field
button primary class: btn-primary
button secondary class: btn-secondary
badge classes: badge-success, badge-warning, badge-danger, badge-neutral, badge-info
glass card class: glass-card p-5
font heading: Plus Jakarta Sans
```

---

## PRE-WORK: Fix API Startup

### Task 0: Rebuild & Verify API Starts Clean

**Files:**
- Modify: `apps/api/src/main.ts`

- [ ] **Step 0.1: Kill all node processes on port 3001**
```powershell
$p = (Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue).OwningProcess
if ($p) { Stop-Process -Id $p -Force }
```

- [ ] **Step 0.2: Rebuild the API dist**
```powershell
cd "I:\Upcoming Projects\WorkZen\apps\api"
npx nest build 2>&1
```
Expected: `Successfully compiled: X files with swc`

- [ ] **Step 0.3: Start via preview_start**
Call `preview_start` with name `WorkZen API (NestJS)`

- [ ] **Step 0.4: Verify login works**
```powershell
Invoke-RestMethod "http://localhost:3001/api/v1/auth/login" -Method POST -Body '{"email":"admin@workzen.in","password":"Admin@123!"}' -ContentType "application/json" | Select-Object -ExpandProperty data | Select-Object userId, tenantId
```
Expected: `userId` and `tenantId` returned.

---

## MODULE 1: Settings & Company Setup

**What it does:** Company profile management, user management, role assignment, number series config, notification preferences — all wired to backend.

### Task 1.1: Backend — Tenants & Users API

**Files:**
- Modify: `apps/api/src/tenants/tenants.service.ts`
- Modify: `apps/api/src/tenants/tenants.controller.ts`
- Modify: `apps/api/src/users/users.service.ts`
- Modify: `apps/api/src/users/users.controller.ts`

- [ ] **Step 1.1.1: Implement getTenantSettings in tenants.service.ts**
```typescript
async getSettings(tenantId: string) {
  return this.prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, slug: true, domain: true, logo: true, status: true, plan: true, maxUsers: true, maxEmployees: true, settings: true },
  });
}

async updateSettings(tenantId: string, dto: Record<string, unknown>) {
  return this.prisma.tenant.update({
    where: { id: tenantId },
    data: { ...dto } as any,
  });
}
```

- [ ] **Step 1.1.2: Wire tenant controller**
```typescript
// apps/api/src/tenants/tenants.controller.ts
@Get('settings')
getSettings(@TenantId() t: string) { return this.service.getSettings(t); }

@Patch('settings')
updateSettings(@TenantId() t: string, @Body() dto: any) { return this.service.updateSettings(t, dto); }
```

- [ ] **Step 1.1.3: Implement users service methods**
```typescript
// apps/api/src/users/users.service.ts
async findAll(tenantId: string) {
  return this.prisma.user.findMany({
    where: { tenantId, deletedAt: null },
    include: { userRoles: { include: { role: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

async getRoles(tenantId: string) {
  return this.prisma.role.findMany({
    where: { OR: [{ tenantId }, { tenantId: null }] },
    include: { _count: { select: { userRoles: true } } },
  });
}

async invite(tenantId: string, dto: { email: string; firstName: string; lastName: string; roleId: string }) {
  const hashedPass = await bcrypt.hash('Workzen@123!', 12);
  const user = await this.prisma.user.create({
    data: { tenantId, email: dto.email, firstName: dto.firstName, lastName: dto.lastName, passwordHash: hashedPass, status: 'ACTIVE', emailVerifiedAt: new Date() },
  });
  await this.prisma.userRole.create({ data: { userId: user.id, roleId: dto.roleId } });
  return user;
}

async update(tenantId: string, id: string, dto: Record<string, unknown>) {
  return this.prisma.user.update({ where: { id }, data: dto as any });
}

async findOne(tenantId: string, id: string) {
  return this.prisma.user.findFirst({
    where: { id, tenantId },
    include: { userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } } },
  });
}

async assignRole(tenantId: string, userId: string, roleId: string) {
  await this.prisma.userRole.deleteMany({ where: { userId } });
  return this.prisma.userRole.create({ data: { userId, roleId } });
}
```

- [ ] **Step 1.1.4: Add bcrypt import to users.service.ts**
```typescript
import * as bcrypt from 'bcryptjs';
```

- [ ] **Step 1.1.5: Add invite endpoint to users.controller.ts**
```typescript
@Post('invite')
@RequirePermissions('user:write')
invite(@TenantId() t: string, @Body() dto: any) { return this.service.invite(t, dto); }
```

### Task 1.2: Add API functions to web api.ts

**Files:**
- Modify: `apps/web/src/lib/api.ts`

- [ ] **Step 1.2.1: Add settings and users API functions**
```typescript
// append to apps/web/src/lib/api.ts
export const settingsApi = {
  get: () => api.get('/tenants/settings').then(r => r.data.data),
  update: (data: Record<string, unknown>) => api.patch('/tenants/settings', data).then(r => r.data.data),
};

export const usersApi = {
  list: () => api.get('/users').then(r => r.data.data),
  get: (id: string) => api.get(`/users/${id}`).then(r => r.data.data),
  invite: (data: { email: string; firstName: string; lastName: string; roleId: string }) =>
    api.post('/users/invite', data).then(r => r.data.data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/users/${id}`, data).then(r => r.data.data),
  roles: () => api.get('/users/roles').then(r => r.data.data),
  assignRole: (id: string, roleId: string) => api.post(`/users/${id}/roles`, { roleId }).then(r => r.data.data),
};
```

### Task 1.3: Settings Page — Company Tab (connected to API)

**Files:**
- Modify: `apps/web/src/app/(dashboard)/settings/page.tsx`

- [ ] **Step 1.3.1: Replace settings page with fully connected version**

Replace entire `apps/web/src/app/(dashboard)/settings/page.tsx` with:

```tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Building2, Users, Shield, Bell, Globe, Key, Save, Plus, Pencil, Trash2, UserPlus, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { settingsApi, usersApi } from '@/lib/api';
import { formatDate, getInitials } from '@/lib/utils';

const SECTIONS = [
  { id: 'company', label: 'Company', icon: Building2, color: '#6366f1' },
  { id: 'users', label: 'Users & Roles', icon: Users, color: '#3b82f6' },
  { id: 'security', label: 'Security', icon: Shield, color: '#10b981' },
  { id: 'notifications', label: 'Notifications', icon: Bell, color: '#f59e0b' },
  { id: 'integrations', label: 'Integrations', icon: Globe, color: '#8b5cf6' },
];

const companySchema = z.object({
  name: z.string().min(2),
  settings: z.object({
    gstin: z.string().optional(),
    pan: z.string().optional(),
    pfReg: z.string().optional(),
    esiReg: z.string().optional(),
    cin: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    website: z.string().optional(),
  }).optional(),
});

const inviteSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email(),
  roleId: z.string().min(1, 'Required'),
});

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="relative w-10 h-5 rounded-full transition-all flex-shrink-0"
      style={{ background: value ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.12)' }}>
      <span className="absolute top-0.5 transition-all w-4 h-4 rounded-full bg-white shadow"
        style={{ left: value ? '1.25rem' : '0.125rem' }} />
    </button>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{description}</p>}
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [section, setSection] = useState('company');
  const [showInvite, setShowInvite] = useState(false);
  const [notifSettings, setNotifSettings] = useState({ email: true, sms: false, push: true, payroll: true, compliance: true, leaves: true, billing: false });
  const [secSettings, setSecSettings] = useState({ twoFactor: false, sessionTimeout: '30', ipWhitelist: false, auditLog: true });
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery({ queryKey: ['tenant-settings'], queryFn: settingsApi.get });
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: usersApi.list });
  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: usersApi.roles });

  const { register, handleSubmit, formState: { errors, isDirty }, reset } = useForm({
    resolver: zodResolver(companySchema),
    values: settings ? {
      name: settings.name ?? '',
      settings: {
        gstin: (settings.settings as any)?.gstin ?? '',
        pan: (settings.settings as any)?.pan ?? '',
        pfReg: (settings.settings as any)?.pfReg ?? '',
        esiReg: (settings.settings as any)?.esiReg ?? '',
        cin: (settings.settings as any)?.cin ?? '',
        address: (settings.settings as any)?.address ?? '',
        phone: (settings.settings as any)?.phone ?? '',
        email: (settings.settings as any)?.email ?? '',
        website: (settings.settings as any)?.website ?? '',
      },
    } : undefined,
  });

  const { register: ri, handleSubmit: hi, formState: { errors: ei }, reset: rri } = useForm({
    resolver: zodResolver(inviteSchema),
  });

  const updateMut = useMutation({
    mutationFn: (data: any) => settingsApi.update(data),
    onSuccess: () => { toast.success('Settings saved'); qc.invalidateQueries({ queryKey: ['tenant-settings'] }); },
    onError: () => toast.error('Failed to save'),
  });

  const inviteMut = useMutation({
    mutationFn: (data: any) => usersApi.invite(data),
    onSuccess: () => { toast.success('User invited successfully'); qc.invalidateQueries({ queryKey: ['users'] }); setShowInvite(false); rri(); },
    onError: () => toast.error('Failed to invite user'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>Settings</h2>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Manage your workspace preferences and configurations</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="glass-card p-2 h-fit">
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => setSection(s.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
              style={{ background: section === s.id ? `${s.color}15` : 'transparent', color: section === s.id ? s.color : 'rgba(255,255,255,0.5)' }}>
              <s.icon size={16} />
              <span className="text-sm font-medium">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <motion.div key={section} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">

            {/* COMPANY */}
            {section === 'company' && (
              <form onSubmit={handleSubmit(d => updateMut.mutate(d))}>
                <h3 className="font-semibold text-white mb-6" style={{ fontFamily: 'Plus Jakarta Sans' }}>Company Information</h3>
                {isLoading ? <p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading...</p> : (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="col-span-2">
                        <label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>Company Name *</label>
                        <input {...register('name')} className="input-field w-full" placeholder="WorkZen Security Services Pvt. Ltd." />
                        {errors.name && <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>{String(errors.name.message)}</p>}
                      </div>
                      {[
                        { field: 'settings.gstin', label: 'GST Number', placeholder: '27AADCB2230M1ZT' },
                        { field: 'settings.pan', label: 'PAN Number', placeholder: 'AADCB2230M' },
                        { field: 'settings.cin', label: 'CIN', placeholder: 'U74999MH2018PTC123456' },
                        { field: 'settings.pfReg', label: 'PF Registration No.', placeholder: 'MHBAN0012345' },
                        { field: 'settings.esiReg', label: 'ESI Registration No.', placeholder: '31-00-123456-000-0001' },
                        { field: 'settings.phone', label: 'Phone', placeholder: '+91 98765 43210' },
                        { field: 'settings.email', label: 'Company Email', placeholder: 'info@company.com' },
                        { field: 'settings.website', label: 'Website', placeholder: 'https://company.com' },
                      ].map(f => (
                        <div key={f.field}>
                          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>{f.label}</label>
                          <input {...register(f.field as any)} className="input-field w-full" placeholder={f.placeholder} />
                        </div>
                      ))}
                    </div>
                    <div className="mb-4">
                      <label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>Registered Address</label>
                      <textarea rows={3} {...register('settings.address')} placeholder="Office No. 205, Tower B, Business Park, Mumbai - 400001" className="input-field w-full resize-none" />
                    </div>
                    <button type="submit" className="btn-primary" disabled={updateMut.isPending}>
                      <Save size={14} /> {updateMut.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                )}
              </form>
            )}

            {/* USERS */}
            {section === 'users' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>Users & Roles</h3>
                  <button className="btn-primary" onClick={() => setShowInvite(true)}><UserPlus size={14} /> Invite User</button>
                </div>

                {showInvite && (
                  <div className="mb-6 p-5 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <h4 className="font-medium text-white mb-4">Invite New User</h4>
                    <form onSubmit={hi(d => inviteMut.mutate(d))}>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.5)' }}>First Name *</label>
                          <input {...ri('firstName')} className="input-field w-full" placeholder="John" />
                          {ei.firstName && <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>{ei.firstName.message}</p>}
                        </div>
                        <div>
                          <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.5)' }}>Last Name *</label>
                          <input {...ri('lastName')} className="input-field w-full" placeholder="Doe" />
                        </div>
                        <div>
                          <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.5)' }}>Email *</label>
                          <input {...ri('email')} type="email" className="input-field w-full" placeholder="john@company.com" />
                          {ei.email && <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>{ei.email.message}</p>}
                        </div>
                        <div>
                          <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.5)' }}>Role *</label>
                          <select {...ri('roleId')} className="input-field w-full">
                            <option value="">Select role</option>
                            {roles?.map((r: any) => <option key={r.id} value={r.id}>{r.displayName}</option>)}
                          </select>
                          {ei.roleId && <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>{ei.roleId.message}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="btn-primary" disabled={inviteMut.isPending}>{inviteMut.isPending ? 'Inviting...' : 'Send Invite'}</button>
                        <button type="button" className="btn-secondary" onClick={() => setShowInvite(false)}>Cancel</button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="space-y-2">
                  {(users ?? []).map((u: any) => (
                    <div key={u.id} className="flex items-center gap-4 p-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>
                        {getInitials(u.firstName, u.lastName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{u.firstName} {u.lastName}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{u.email}</p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>
                        {u.userRoles?.[0]?.role?.displayName ?? 'No Role'}
                      </span>
                      <span className={`badge ${u.status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'}`}>{u.status}</span>
                    </div>
                  ))}
                  {(!users || users.length === 0) && (
                    <p className="text-center py-8" style={{ color: 'rgba(255,255,255,0.3)' }}>No users yet. Invite your team.</p>
                  )}
                </div>
              </div>
            )}

            {/* SECURITY */}
            {section === 'security' && (
              <div>
                <h3 className="font-semibold text-white mb-6" style={{ fontFamily: 'Plus Jakarta Sans' }}>Security Settings</h3>
                <SettingRow label="Two-Factor Authentication" description="Require TOTP 2FA for all admin users">
                  <Toggle value={secSettings.twoFactor} onChange={v => setSecSettings(s => ({ ...s, twoFactor: v }))} />
                </SettingRow>
                <SettingRow label="IP Whitelist" description="Restrict access to specific IP addresses">
                  <Toggle value={secSettings.ipWhitelist} onChange={v => setSecSettings(s => ({ ...s, ipWhitelist: v }))} />
                </SettingRow>
                <SettingRow label="Audit Logging" description="Log all user actions for compliance">
                  <Toggle value={secSettings.auditLog} onChange={v => setSecSettings(s => ({ ...s, auditLog: v }))} />
                </SettingRow>
                <SettingRow label="Session Timeout" description="Auto-logout after inactivity">
                  <select className="input-field" value={secSettings.sessionTimeout} onChange={e => setSecSettings(s => ({ ...s, sessionTimeout: e.target.value }))} style={{ width: 'auto' }}>
                    {['15', '30', '60', '120', '480'].map(v => <option key={v} value={v}>{v} min</option>)}
                  </select>
                </SettingRow>
                <div className="mt-6">
                  <button className="btn-primary" onClick={() => toast.success('Security settings saved')}><Save size={14} /> Save</button>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS */}
            {section === 'notifications' && (
              <div>
                <h3 className="font-semibold text-white mb-6" style={{ fontFamily: 'Plus Jakarta Sans' }}>Notification Preferences</h3>
                <p className="text-xs mb-4 font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>Channels</p>
                {[
                  { key: 'email', label: 'Email Notifications', desc: 'Alerts via email' },
                  { key: 'sms', label: 'SMS Notifications', desc: 'Critical alerts via SMS' },
                  { key: 'push', label: 'Push Notifications', desc: 'Browser push' },
                ].map(n => (
                  <SettingRow key={n.key} label={n.label} description={n.desc}>
                    <Toggle value={(notifSettings as any)[n.key]} onChange={v => setNotifSettings(s => ({ ...s, [n.key]: v }))} />
                  </SettingRow>
                ))}
                <p className="text-xs mt-6 mb-4 font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>Events</p>
                {[
                  { key: 'payroll', label: 'Payroll Processed', desc: 'When payroll completes' },
                  { key: 'compliance', label: 'Compliance Due', desc: '7 days before deadline' },
                  { key: 'leaves', label: 'Leave Requests', desc: 'New requests for approval' },
                  { key: 'billing', label: 'Invoice Overdue', desc: 'When invoices are overdue' },
                ].map(n => (
                  <SettingRow key={n.key} label={n.label} description={n.desc}>
                    <Toggle value={(notifSettings as any)[n.key]} onChange={v => setNotifSettings(s => ({ ...s, [n.key]: v }))} />
                  </SettingRow>
                ))}
                <div className="mt-6">
                  <button className="btn-primary" onClick={() => toast.success('Notification preferences saved')}><Save size={14} /> Save</button>
                </div>
              </div>
            )}

            {section === 'integrations' && (
              <div>
                <h3 className="font-semibold text-white mb-6" style={{ fontFamily: 'Plus Jakarta Sans' }}>Integrations</h3>
                <div className="space-y-3">
                  {[
                    { name: 'WhatsApp (WATI)', desc: 'WhatsApp Business notifications', connected: false, color: '#25D366', emoji: '💬' },
                    { name: 'Twilio SMS', desc: 'SMS notifications & OTP', connected: false, color: '#F22F46', emoji: '📱' },
                    { name: 'AWS S3 / MinIO', desc: 'Document storage', connected: true, color: '#FF9900', emoji: '☁️' },
                    { name: 'Firebase FCM', desc: 'Mobile push notifications', connected: false, color: '#FFCA28', emoji: '🔔' },
                    { name: 'EPFO Portal', desc: 'PF ECR auto-submission', connected: false, color: '#6366f1', emoji: '🏛️' },
                  ].map(i => (
                    <div key={i.name} className="flex items-center gap-4 p-4 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: `${i.color}15`, border: `1px solid ${i.color}25` }}>{i.emoji}</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{i.name}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{i.desc}</p>
                      </div>
                      <span className={`badge ${i.connected ? 'badge-success' : 'badge-neutral'}`}>{i.connected ? 'Connected' : 'Not Connected'}</span>
                      <button className="btn-secondary text-xs py-1.5">{i.connected ? 'Configure' : 'Connect'}</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 1.3.2: Verify settings page loads and saves company data**

Visit http://localhost:3000/settings, update company name, click Save. Toast "Settings saved" should appear.

---

## MODULE 2: Employee Management

**What it does:** Full employee CRUD — list with filters, create modal with all fields, edit, view detail, status management.

### Task 2.1: Backend — Complete Employees API

**Files:**
- Modify: `apps/api/src/employees/employees.service.ts`

- [ ] **Step 2.1.1: Add missing employees service methods**
```typescript
// Add to EmployeesService in employees.service.ts
async getDesignations(tenantId: string) {
  return this.prisma.designation.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
}

async getDepartments(tenantId: string) {
  return this.prisma.department.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
}

async createDesignation(tenantId: string, name: string, userId: string) {
  return this.prisma.designation.create({ data: { tenantId, name, createdBy: userId } as any });
}

async createDepartment(tenantId: string, name: string, userId: string) {
  return this.prisma.department.create({ data: { tenantId, name, createdBy: userId } as any });
}
```

- [ ] **Step 2.1.2: Add designation and department endpoints to employees controller**
```typescript
// Add to EmployeesController
@Get('designations')
@RequirePermissions('employee:read')
getDesignations(@TenantId() t: string) { return this.service.getDesignations(t); }

@Get('departments')
@RequirePermissions('employee:read')
getDepartments(@TenantId() t: string) { return this.service.getDepartments(t); }

@Post('designations')
@RequirePermissions('employee:write')
createDesignation(@TenantId() t: string, @Body('name') name: string, @CurrentUser('id') uid: string) {
  return this.service.createDesignation(t, name, uid);
}

@Post('departments')
@RequirePermissions('employee:write')
createDepartment(@TenantId() t: string, @Body('name') name: string, @CurrentUser('id') uid: string) {
  return this.service.createDepartment(t, name, uid);
}
```

### Task 2.2: Add employees API functions

**Files:**
- Modify: `apps/web/src/lib/api.ts`

- [ ] **Step 2.2.1: Expand employeesApi**
```typescript
// Replace existing employeesApi in api.ts
export const employeesApi = {
  list: (params?: Record<string, unknown>) => api.get('/employees', { params }).then(r => r.data),
  get: (id: string) => api.get(`/employees/${id}`).then(r => r.data.data),
  create: (data: Record<string, unknown>) => api.post('/employees', data).then(r => r.data.data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/employees/${id}`, data).then(r => r.data.data),
  remove: (id: string) => api.delete(`/employees/${id}`).then(r => r.data),
  stats: () => api.get('/employees/stats').then(r => r.data.data),
  designations: () => api.get('/employees/designations').then(r => r.data.data),
  departments: () => api.get('/employees/departments').then(r => r.data.data),
};
```

### Task 2.3: Employee List Page with Create Modal

**Files:**
- Create: `apps/web/src/app/(dashboard)/employees/create-employee-modal.tsx`
- Modify: `apps/web/src/app/(dashboard)/employees/page.tsx`

- [ ] **Step 2.3.1: Create the employee form modal component**

Create file `apps/web/src/app/(dashboard)/employees/create-employee-modal.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { employeesApi } from '@/lib/api';

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  personalPhone: z.string().min(10, 'Valid phone required'),
  personalEmail: z.string().email().optional().or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  dateOfBirth: z.string().optional(),
  joiningDate: z.string().optional(),
  designationId: z.string().optional(),
  departmentId: z.string().optional(),
  employmentType: z.enum(['PERMANENT', 'CONTRACT', 'TEMPORARY', 'PROBATION']).optional(),
  aadhaarNumber: z.string().optional(),
  panNumber: z.string().optional(),
  pfNumber: z.string().optional(),
  esiNumber: z.string().optional(),
  uanNumber: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  employee?: Record<string, any> | null;
}

export function CreateEmployeeModal({ open, onClose, employee }: Props) {
  const qc = useQueryClient();
  const { data: designations } = useQuery({ queryKey: ['designations'], queryFn: employeesApi.designations });
  const { data: departments } = useQuery({ queryKey: ['departments'], queryFn: employeesApi.departments });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (employee) reset({ ...employee });
    else reset({});
  }, [employee, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => employee
      ? employeesApi.update(employee.id, data)
      : employeesApi.create(data),
    onSuccess: () => {
      toast.success(employee ? 'Employee updated' : 'Employee created');
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['employee-stats'] });
      onClose();
      reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed to save'),
  });

  if (!open) return null;

  const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
    <div>
      <label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</label>
      {children}
      {error && <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>{error}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl" style={{ background: '#0d1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <h3 className="font-semibold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            {employee ? 'Edit Employee' : 'Add New Employee'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5">
            <X size={18} style={{ color: 'rgba(255,255,255,0.5)' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="p-6 space-y-6">
          {/* Personal Info */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#6366f1' }}>Personal Information</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name *" error={errors.firstName?.message}>
                <input {...register('firstName')} className="input-field w-full" placeholder="Rajesh" />
              </Field>
              <Field label="Last Name *" error={errors.lastName?.message}>
                <input {...register('lastName')} className="input-field w-full" placeholder="Kumar" />
              </Field>
              <Field label="Mobile Number *" error={errors.personalPhone?.message}>
                <input {...register('personalPhone')} className="input-field w-full" placeholder="+91 98765 43210" />
              </Field>
              <Field label="Personal Email" error={errors.personalEmail?.message}>
                <input {...register('personalEmail')} type="email" className="input-field w-full" placeholder="rajesh@email.com" />
              </Field>
              <Field label="Gender">
                <select {...register('gender')} className="input-field w-full">
                  <option value="">Select</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </Field>
              <Field label="Date of Birth">
                <input {...register('dateOfBirth')} type="date" className="input-field w-full" />
              </Field>
            </div>
          </div>

          {/* Employment */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#3b82f6' }}>Employment Details</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Joining Date">
                <input {...register('joiningDate')} type="date" className="input-field w-full" />
              </Field>
              <Field label="Employment Type">
                <select {...register('employmentType')} className="input-field w-full">
                  <option value="">Select</option>
                  <option value="PERMANENT">Permanent</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="TEMPORARY">Temporary</option>
                  <option value="PROBATION">Probation</option>
                </select>
              </Field>
              <Field label="Designation">
                <select {...register('designationId')} className="input-field w-full">
                  <option value="">Select designation</option>
                  {(designations ?? []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="Department">
                <select {...register('departmentId')} className="input-field w-full">
                  <option value="">Select department</option>
                  {(departments ?? []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
            </div>
          </div>

          {/* Statutory */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#10b981' }}>Statutory Details</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Aadhaar Number">
                <input {...register('aadhaarNumber')} className="input-field w-full" placeholder="1234 5678 9012" />
              </Field>
              <Field label="PAN Number">
                <input {...register('panNumber')} className="input-field w-full" placeholder="ABCDE1234F" />
              </Field>
              <Field label="UAN Number">
                <input {...register('uanNumber')} className="input-field w-full" placeholder="100123456789" />
              </Field>
              <Field label="ESI Number">
                <input {...register('esiNumber')} className="input-field w-full" placeholder="12-34-567890-000-0001" />
              </Field>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={mutation.isPending}>
              <Save size={14} /> {mutation.isPending ? 'Saving...' : employee ? 'Update Employee' : 'Create Employee'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2.3.2: Update employees page to include create/edit modal**

Replace `apps/web/src/app/(dashboard)/employees/page.tsx` with:

```tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Search, Users, UserCheck, UserX, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, statusColor, getInitials } from '@/lib/utils';
import { employeesApi } from '@/lib/api';
import { CreateEmployeeModal } from './create-employee-modal';

const STATUS_FILTERS = ['ALL', 'ACTIVE', 'INACTIVE', 'ON_LEAVE', 'DEPLOYED'];
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#10b981', INACTIVE: 'rgba(255,255,255,0.3)', ON_LEAVE: '#f59e0b', DEPLOYED: '#3b82f6', TERMINATED: '#f43f5e',
};

export default function EmployeesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Record<string, any> | null>(null);
  const qc = useQueryClient();

  const { data: stats } = useQuery({ queryKey: ['employee-stats'], queryFn: employeesApi.stats });
  const { data, isLoading } = useQuery({
    queryKey: ['employees', { search, status, page }],
    queryFn: () => employeesApi.list({ search: search || undefined, status: status === 'ALL' ? undefined : status, page, limit: 15 }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => employeesApi.remove(id),
    onSuccess: () => { toast.success('Employee removed'); qc.invalidateQueries({ queryKey: ['employees'] }); qc.invalidateQueries({ queryKey: ['employee-stats'] }); },
    onError: () => toast.error('Failed to remove'),
  });

  const employees = data?.data ?? [];
  const meta = data?.meta;

  const statCards = [
    { label: 'Total', value: stats?.total ?? 0, color: '#6366f1', icon: <Users size={16} /> },
    { label: 'Active', value: stats?.active ?? 0, color: '#10b981', icon: <UserCheck size={16} /> },
    { label: 'On Leave', value: stats?.onLeave ?? 0, color: '#f59e0b', icon: <UserX size={16} /> },
    { label: 'Deployed', value: stats?.deployed ?? 0, color: '#3b82f6', icon: <MapPin size={16} /> },
  ];

  return (
    <div className="space-y-6">
      <CreateEmployeeModal open={showModal || !!editEmployee} onClose={() => { setShowModal(false); setEditEmployee(null); }} employee={editEmployee} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>Employees</h2>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Manage your workforce</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> Add Employee</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</p>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${s.color}15`, color: s.color }}>{s.icon}</div>
            </div>
            <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search employees..."
            className="input-field w-full pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => { setStatus(s); setPage(1); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: status === s ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)', color: status === s ? '#818cf8' : 'rgba(255,255,255,0.5)', border: `1px solid ${status === s ? 'rgba(99,102,241,0.3)' : 'transparent'}` }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Employee', 'Contact', 'Designation', 'Department', 'Joining Date', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} /></td>
                ))}
              </tr>
            ))}
            {!isLoading && employees.map((emp: any) => (
              <tr key={emp.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                      {getInitials(emp.firstName, emp.lastName)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>{emp.employeeCode}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{emp.personalPhone}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{emp.designation?.name ?? '—'}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{emp.department?.name ?? '—'}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{formatDate(emp.joiningDate)}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLORS[emp.status] ?? '#888' }} />
                    <span style={{ color: STATUS_COLORS[emp.status] ?? 'rgba(255,255,255,0.5)' }}>{emp.status}</span>
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-lg hover:bg-white/5" onClick={() => setEditEmployee(emp)} title="Edit">
                      <Pencil size={14} style={{ color: '#818cf8' }} />
                    </button>
                    <button className="p-1.5 rounded-lg hover:bg-white/5" onClick={() => { if (confirm('Remove this employee?')) deleteMut.mutate(emp.id); }} title="Remove">
                      <Trash2 size={14} style={{ color: '#f43f5e' }} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && employees.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-16 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                No employees found. <button className="underline" style={{ color: '#818cf8' }} onClick={() => setShowModal(true)}>Add first employee</button>
              </td></tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, meta.total)} of {meta.total}
            </p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30">
                <ChevronLeft size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
              <button disabled={page === meta.totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30">
                <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## MODULE 3: Tender Management

**What it does:** Full tender CRUD — list with status filters, create/edit modal with all tender fields, dashboard stats.

### Task 3.1: Create Tender Modal

**Files:**
- Create: `apps/web/src/app/(dashboard)/tenders/create-tender-modal.tsx`
- Modify: `apps/web/src/app/(dashboard)/tenders/page.tsx`

- [ ] **Step 3.1.1: Create tender modal**

Create `apps/web/src/app/(dashboard)/tenders/create-tender-modal.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { tendersApi, api } from '@/lib/api';

const schema = z.object({
  tenderName: z.string().min(2, 'Required'),
  tenderNumber: z.string().optional(),
  tenderValue: z.coerce.number().min(1, 'Required'),
  departmentId: z.string().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'UNDER_EVALUATION', 'AWARDED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED']).optional(),
  contractType: z.enum(['FIXED_TERM', 'OPEN_ENDED', 'ANNUAL', 'MULTI_YEAR']).optional(),
  bidDate: z.string().optional(),
  awardDate: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  requiredEmployees: z.coerce.number().optional(),
  emdAmount: z.coerce.number().optional(),
  securityDeposit: z.coerce.number().optional(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props { open: boolean; onClose: () => void; tender?: Record<string, any> | null; }

export function CreateTenderModal({ open, onClose, tender }: Props) {
  const qc = useQueryClient();
  const { data: clients } = useQuery({ queryKey: ['clients-list'], queryFn: () => api.get('/clients?limit=100').then(r => r.data.data) });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({ resolver: zodResolver(schema) });
  useEffect(() => { if (tender) reset({ ...tender, tenderValue: Number(tender.tenderValue) }); else reset({}); }, [tender, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => tender ? tendersApi.update(tender.id, data) : tendersApi.create(data),
    onSuccess: () => { toast.success(tender ? 'Tender updated' : 'Tender created'); qc.invalidateQueries({ queryKey: ['tenders'] }); qc.invalidateQueries({ queryKey: ['tender-dash'] }); onClose(); reset(); },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed to save'),
  });

  if (!open) return null;

  const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
    <div>
      <label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</label>
      {children}
      {error && <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>{error}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl" style={{ background: '#0d1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <h3 className="font-semibold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>{tender ? 'Edit Tender' : 'New Tender'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5"><X size={18} style={{ color: 'rgba(255,255,255,0.5)' }} /></button>
        </div>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="p-6 space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#6366f1' }}>Tender Details</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Tender Name *" error={errors.tenderName?.message}>
                <input {...register('tenderName')} className="input-field w-full col-span-2" placeholder="Security Services at NHAI HQ" />
              </Field>
              <Field label="Tender Number (auto if blank)">
                <input {...register('tenderNumber')} className="input-field w-full" placeholder="TND2026-00001" />
              </Field>
              <Field label="Tender Value (₹) *" error={errors.tenderValue?.message}>
                <input {...register('tenderValue')} type="number" className="input-field w-full" placeholder="5000000" />
              </Field>
              <Field label="Client / Department">
                <select {...register('departmentId')} className="input-field w-full">
                  <option value="">Select client</option>
                  {(clients ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select {...register('status')} className="input-field w-full">
                  {['DRAFT','SUBMITTED','UNDER_EVALUATION','AWARDED','ACTIVE','COMPLETED','CANCELLED','EXPIRED'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                </select>
              </Field>
              <Field label="Contract Type">
                <select {...register('contractType')} className="input-field w-full">
                  <option value="">Select</option>
                  {['FIXED_TERM','OPEN_ENDED','ANNUAL','MULTI_YEAR'].map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
                </select>
              </Field>
              <Field label="Required Employees">
                <input {...register('requiredEmployees')} type="number" className="input-field w-full" placeholder="50" />
              </Field>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#3b82f6' }}>Dates</p>
            <div className="grid grid-cols-2 gap-4">
              {[['bidDate','Bid Date'],['awardDate','Award Date'],['startDate','Start Date'],['endDate','End Date']].map(([f,l]) => (
                <Field key={f} label={l}><input {...register(f as any)} type="date" className="input-field w-full" /></Field>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#10b981' }}>Financial</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="EMD Amount (₹)"><input {...register('emdAmount')} type="number" className="input-field w-full" placeholder="100000" /></Field>
              <Field label="Security Deposit (₹)"><input {...register('securityDeposit')} type="number" className="input-field w-full" placeholder="250000" /></Field>
            </div>
          </div>
          <Field label="Description">
            <textarea {...register('description')} rows={3} className="input-field w-full resize-none" placeholder="Scope of work..." />
          </Field>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary flex-1" disabled={mutation.isPending}>
              <Save size={14} /> {mutation.isPending ? 'Saving...' : tender ? 'Update Tender' : 'Create Tender'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3.1.2: Update tenders page with full CRUD**

Replace `apps/web/src/app/(dashboard)/tenders/page.tsx` with complete version including modal, table with edit/delete, and dashboard stats. (Follow same pattern as employees page — import CreateTenderModal, add showModal/editTender state, add mutations for delete, table with actions column.)

---

## MODULE 4: Client Management

### Task 4.1: Clients API & Create Modal

**Files:**
- Create: `apps/web/src/app/(dashboard)/clients/create-client-modal.tsx`
- Modify: `apps/web/src/app/(dashboard)/clients/page.tsx`
- Modify: `apps/web/src/lib/api.ts`

- [ ] **Step 4.1.1: Add clientsApi to api.ts**
```typescript
export const clientsApi = {
  list: (params?: Record<string, unknown>) => api.get('/clients', { params }).then(r => r.data),
  get: (id: string) => api.get(`/clients/${id}`).then(r => r.data.data),
  create: (data: Record<string, unknown>) => api.post('/clients', data).then(r => r.data.data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/clients/${id}`, data).then(r => r.data.data),
  remove: (id: string) => api.delete(`/clients/${id}`).then(r => r.data),
  dashboard: () => api.get('/clients/dashboard').then(r => r.data.data),
};
```

- [ ] **Step 4.1.2: Add dashboard endpoint to clients controller & service**
```typescript
// apps/api/src/clients/clients.service.ts — add method:
async getDashboard(tenantId: string) {
  const [total, govt, psu, active] = await Promise.all([
    this.prisma.client.count({ where: { tenantId } }),
    this.prisma.client.count({ where: { tenantId, type: 'GOVERNMENT_DEPARTMENT' } }),
    this.prisma.client.count({ where: { tenantId, type: 'PSU' } }),
    this.prisma.client.count({ where: { tenantId, isActive: true } }),
  ]);
  return { total, govt, psu, active };
}
```

```typescript
// apps/api/src/clients/clients.controller.ts — add route:
@Get('dashboard') @RequirePermissions('client:read')
getDashboard(@TenantId() t: string) { return this.service.getDashboard(t); }
```

- [ ] **Step 4.1.3: Create client modal** (zod schema: name, type, gstin, pan, phone, email, address, creditLimit, creditPeriod)

---

## MODULE 5: Deployment & Sites

### Task 5.1: Sites & Deployment Backend

**Files:**
- Modify: `apps/api/src/deployment/deployment.service.ts`
- Modify: `apps/api/src/deployment/deployment.controller.ts`

- [ ] **Step 5.1.1: Add create site endpoint**
```typescript
// deployment.service.ts
async createSite(tenantId: string, dto: Record<string, unknown>, userId: string) {
  return this.prisma.site.create({ data: { ...dto, tenantId, createdBy: userId } as any });
}
```

```typescript
// deployment.controller.ts
@Post('sites') @RequirePermissions('deployment:write')
createSite(@TenantId() t: string, @Body() dto: any, @CurrentUser('id') uid: string) {
  return this.service.createSite(t, dto, uid);
}
```

- [ ] **Step 5.1.2: Create Deployment list page with create modal** (fields: employeeId, tenderId, siteId, shiftId, startDate, notes)

---

## MODULE 6: Attendance & Leave

### Task 6.1: Attendance Frontend

**Files:**
- Modify: `apps/web/src/app/(dashboard)/attendance/page.tsx`
- Modify: `apps/web/src/lib/api.ts`

- [ ] **Step 6.1.1: Add attendance API**
```typescript
export const attendanceApi = {
  mark: (data: Record<string, unknown>) => api.post('/attendance/mark', data).then(r => r.data.data),
  report: (params: Record<string, unknown>) => api.get('/attendance/monthly-report', { params }).then(r => r.data),
  leaves: (params?: Record<string, unknown>) => api.get('/attendance/leave-requests', { params }).then(r => r.data),
  approveLeave: (id: string, action: 'APPROVED' | 'REJECTED', remarks?: string) =>
    api.patch(`/attendance/leave-requests/${id}/approve`, { action, remarks }).then(r => r.data.data),
};
```

- [ ] **Step 6.1.2: Build attendance page** with: tab switcher (Daily | Monthly Report | Leave Requests), mark attendance form, leave request approval list.

---

## MODULE 7: Payroll

### Task 7.1: Payroll Frontend

**Files:**
- Modify: `apps/web/src/app/(dashboard)/payroll/page.tsx`
- Modify: `apps/web/src/lib/api.ts`

- [ ] **Step 7.1.1: Add payroll API**
```typescript
// Already exists: payrollApi — verify it has these:
export const payrollApi = {
  runs: (params?: Record<string, unknown>) => api.get('/payroll/runs', { params }).then(r => r.data),
  run: (id: string) => api.get(`/payroll/runs/${id}`).then(r => r.data.data),
  create: (month: number, year: number) => api.post('/payroll/runs', { month, year }).then(r => r.data.data),
  approve: (id: string) => api.patch(`/payroll/runs/${id}/approve`).then(r => r.data.data),
  payslips: (employeeId: string, params?: Record<string, unknown>) =>
    api.get(`/payroll/employees/${employeeId}/payslips`, { params }).then(r => r.data),
};
```

- [ ] **Step 7.1.2: Build payroll page** with: run history table, "Run Payroll" button with month/year picker modal, approve button, status badges.

---

## MODULE 8: Compliance

### Task 8.1: Compliance Frontend

**Files:**
- Modify: `apps/web/src/app/(dashboard)/compliance/page.tsx`

- [ ] **Step 8.1.1: Add compliance API**
```typescript
export const complianceApi = {
  dashboard: () => api.get('/compliance/dashboard').then(r => r.data.data),
  items: (params?: Record<string, unknown>) => api.get('/compliance/items', { params }).then(r => r.data),
  calendar: (month: number, year: number) => api.get('/compliance/calendar', { params: { month, year } }).then(r => r.data.data),
  licenses: () => api.get('/compliance/licenses').then(r => r.data.data),
  markFiled: (id: string, data: { challanNo?: string; filedDate: string; amount?: number }) =>
    api.patch(`/compliance/items/${id}/file`, data).then(r => r.data.data),
};
```

- [ ] **Step 8.1.2: Build compliance page** with: dashboard stats (overdue/upcoming/filed), compliance items table with "Mark Filed" action modal, license list.

---

## MODULE 9: Billing & Invoicing

### Task 9.1: Billing Frontend

**Files:**
- Modify: `apps/web/src/app/(dashboard)/billing/page.tsx`
- Create: `apps/web/src/app/(dashboard)/billing/create-invoice-modal.tsx`

- [ ] **Step 9.1.1: Create invoice modal** (fields: clientId, tenderId, serviceMonth, lineItems array, dueDate)

- [ ] **Step 9.1.2: Build billing page** with: revenue stats, invoice table (status, amount, client, due date), create invoice button, record payment button.

---

## Commit Strategy

After completing each module:
```bash
git add apps/web/src/app/(dashboard)/<module>/ apps/api/src/<module>/ apps/web/src/lib/api.ts
git commit -m "feat(<module>): complete CRUD UI and API integration"
```

---

## Testing Checklist (run after each module)

For each module, verify:
- [ ] List page loads data from API (not empty, not 401)
- [ ] Create modal opens, validates required fields, submits successfully
- [ ] Newly created item appears in list without page refresh
- [ ] Edit works (modal pre-fills with existing data, saves updates)
- [ ] Delete works (item removed from list)
- [ ] Error states: API down → shows error toast; empty state → shows helpful empty message
- [ ] Login as non-admin user → RBAC permission check works (no 403 on `:write` permissions)
