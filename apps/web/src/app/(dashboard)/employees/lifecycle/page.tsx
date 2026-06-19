'use client';

import { useState, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowUpCircle, LogOut, Plus, Search, X,
  CheckCircle2, XCircle, ChevronDown, ChevronUp, Clock,
  CheckCheck, AlertCircle, Ban, Briefcase, Users, TrendingUp,
  ShieldAlert, Plane,
} from 'lucide-react';
import { toast } from 'sonner';
import { employeesApi, mastersApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type Transfer = {
  id: string;
  employeeId: string;
  transferType: string;
  fromSiteId?: string;
  toSiteId?: string;
  fromTenderId?: string;
  toTenderId?: string;
  fromDeptId?: string;
  toDeptId?: string;
  effectiveDate: string;
  reason: string;
  status: string;
  employee?: { firstName: string; lastName: string; employeeCode: string };
};

type Promotion = {
  id: string;
  employeeId: string;
  effectiveDate: string;
  newBasicSalary?: number;
  incrementAmount?: number;
  incrementPercentage?: number;
  reason?: string;
  fromDesignationId?: string;
  toDesignationId?: string;
  fromDepartmentId?: string;
  toDepartmentId?: string;
  approvedBy?: string;
  employee?: { firstName: string; lastName: string; employeeCode: string };
  fromDesignation?: { name: string };
  toDesignation?: { name: string };
};

type Separation = {
  id: string;
  employeeId: string;
  separationType: string;
  resignationDate?: string;
  lastWorkingDate?: string;
  noticePeriodDays: number;
  clearanceStatus: Record<string, boolean>;
  employee?: { firstName: string; lastName: string; employeeCode: string };
};

type Site = { id: string; name: string };
type Department = { id: string; name: string };
type Designation = { id: string; name: string };

// ─── Constants ───────────────────────────────────────────────────────────────

const BG = 'var(--wz-page-bg)';
const CARD = 'var(--wz-card-bg)';
const BORDER = 'var(--wz-card-border)';
const ACCENT = '#6366f1';
const MUTED = 'var(--wz-text-muted)';
const TEXT = 'var(--wz-text-primary)';

const TRANSFER_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:            { label: 'Draft',            color: 'rgba(255,255,255,0.45)', bg: 'rgba(255,255,255,0.06)' },
  PENDING_APPROVAL: { label: 'Pending Approval', color: '#f59e0b',              bg: 'rgba(245,158,11,0.12)'   },
  APPROVED:         { label: 'Approved',         color: '#10b981',              bg: 'rgba(16,185,129,0.12)'   },
  REJECTED:         { label: 'Rejected',         color: '#f43f5e',              bg: 'rgba(244,63,94,0.12)'    },
  COMPLETED:        { label: 'Completed',        color: '#3b82f6',              bg: 'rgba(59,130,246,0.12)'   },
  CANCELLED:        { label: 'Cancelled',        color: 'rgba(255,255,255,0.35)', bg: 'rgba(255,255,255,0.04)' },
};

const TRANSFER_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  SITE:       { label: 'Site',       color: '#818cf8', bg: 'rgba(99,102,241,0.15)'  },
  TENDER:     { label: 'Tender',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  DEPARTMENT: { label: 'Department', color: '#14b8a6', bg: 'rgba(20,184,166,0.12)'  },
};

const SEPARATION_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  RESIGNATION:    { label: 'Resignation',   color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
  TERMINATION:    { label: 'Termination',   color: '#f43f5e', bg: 'rgba(244,63,94,0.12)'   },
  RETIREMENT:     { label: 'Retirement',    color: '#14b8a6', bg: 'rgba(20,184,166,0.12)'  },
  CONTRACT_END:   { label: 'Contract End',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)'  },
  ABSCONDING:     { label: 'Absconding',    color: '#f43f5e', bg: 'rgba(244,63,94,0.12)'   },
  DEATH:          { label: 'Death',         color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.06)' },
};

const CLEARANCE_DEPARTMENTS = ['HR', 'Admin', 'IT', 'Accounts', 'Assets', 'Operations'];

const TRANSFER_STATUSES = ['ALL', 'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'];
const SEPARATION_TYPES_LIST = ['RESIGNATION', 'TERMINATION', 'RETIREMENT', 'CONTRACT_END', 'ABSCONDING', 'DEATH'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtCurrency(n?: number) {
  if (!n && n !== 0) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function empName(e?: { firstName: string; lastName: string; employeeCode: string }) {
  if (!e) return '—';
  return `${e.firstName} ${e.lastName}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: React.ElementType }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '18px 22px', flex: 1, minWidth: 140 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={color} />
        </div>
        <span style={{ fontSize: 12, color: MUTED, fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: TEXT }}>{value}</div>
    </div>
  );
}

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color, background: bg, borderRadius: 6, padding: '3px 8px', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18 }}
        style={{ position: 'relative', background: 'var(--wz-card-bg)', border: `1px solid ${BORDER}`, borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '88vh', overflowY: 'auto', padding: 28 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', padding: 4, borderRadius: 6 }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: MUTED, letterSpacing: '0.05em' }}>
        {label.toUpperCase()}{required && <span style={{ color: '#f43f5e' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--wz-input-bg)',
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: '9px 12px',
  color: TEXT,
  fontSize: 14,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

function SubmitBtn({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 9, padding: '11px 24px', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 8 }}
    >
      {loading ? 'Saving…' : label}
    </button>
  );
}

// ─── Tab: Transfers ───────────────────────────────────────────────────────────

function TransfersTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    employeeCode: '', transferType: 'SITE', toSiteId: '', toTenderId: '', toDeptId: '',
    effectiveDate: '', reason: '',
  });

  const { data: transfersData, isLoading } = useQuery({
    queryKey: ['transfers', statusFilter, search],
    queryFn: () => employeesApi.transfers({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      search: search || undefined,
    }),
  });

  const { data: sitesData } = useQuery({ queryKey: ['master-sites'], queryFn: mastersApi.sites });
  const { data: deptsData } = useQuery({ queryKey: ['master-departments'], queryFn: mastersApi.departments });

  const sites: Site[] = (sitesData as any) ?? [];
  const depts: Department[] = (deptsData as any) ?? [];

  const createMut = useMutation({
    mutationFn: (d: Record<string, unknown>) => employeesApi.createTransfer(d),
    onSuccess: () => { toast.success('Transfer initiated'); qc.invalidateQueries({ queryKey: ['transfers'] }); setShowDialog(false); resetForm(); },
    onError: () => toast.error('Failed to create transfer'),
  });

  const approveMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'APPROVED' | 'REJECTED' }) =>
      employeesApi.approveTransfer(id, action),
    onSuccess: (_d, vars) => {
      toast.success(vars.action === 'APPROVED' ? 'Transfer approved' : 'Transfer rejected');
      qc.invalidateQueries({ queryKey: ['transfers'] });
    },
    onError: () => toast.error('Action failed'),
  });

  const transfers: Transfer[] = (transfersData as any)?.data ?? (transfersData as any) ?? [];

  const statusCounts = TRANSFER_STATUSES.slice(1).reduce<Record<string, number>>((acc, s) => {
    acc[s] = transfers.filter(t => t.status === s).length;
    return acc;
  }, {});

  const resetForm = () => setForm({ employeeCode: '', transferType: 'SITE', toSiteId: '', toTenderId: '', toDeptId: '', effectiveDate: '', reason: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      employeeCode: form.employeeCode,
      transferType: form.transferType,
      effectiveDate: form.effectiveDate,
      reason: form.reason,
    };
    if (form.transferType === 'SITE' && form.toSiteId) payload.toSiteId = form.toSiteId;
    if (form.transferType === 'TENDER' && form.toTenderId) payload.toTenderId = form.toTenderId;
    if (form.transferType === 'DEPARTMENT' && form.toDeptId) payload.toDeptId = form.toDeptId;
    createMut.mutate(payload);
  };

  const statIcons = [Clock, CheckCircle2, CheckCheck, Ban];
  const statLabels = ['Pending', 'Approved', 'Completed', 'Cancelled'];
  const statKeys = ['PENDING_APPROVAL', 'APPROVED', 'COMPLETED', 'CANCELLED'];
  const statColors = ['#f59e0b', '#10b981', '#3b82f6', MUTED];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {statLabels.map((lbl, i) => (
          <StatCard key={lbl} label={lbl} value={statusCounts[statKeys[i]] ?? 0} color={statColors[i]} icon={statIcons[i]} />
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: MUTED }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search employee code or name…"
            style={{ ...inputStyle, paddingLeft: 34 }}
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...selectStyle, width: 'auto', minWidth: 160 }}>
          {TRANSFER_STATUSES.map(s => (
            <option key={s} value={s} style={{ background: 'var(--wz-card-bg)' }}>{s === 'ALL' ? 'All Statuses' : (TRANSFER_STATUS_CONFIG[s]?.label ?? s)}</option>
          ))}
        </select>
        <button
          onClick={() => setShowDialog(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: ACCENT, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          <Plus size={15} /> New Transfer
        </button>
      </div>

      {/* Table */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              {['Emp Code', 'Name', 'Type', 'Transfer', 'Effective Date', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: MUTED }}>Loading…</td></tr>
            ) : transfers.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: MUTED }}>No transfers found</td></tr>
            ) : transfers.map((t, idx) => {
              const tCfg = TRANSFER_TYPE_CONFIG[t.transferType] ?? TRANSFER_TYPE_CONFIG.SITE;
              const sCfg = TRANSFER_STATUS_CONFIG[t.status] ?? TRANSFER_STATUS_CONFIG.DRAFT;
              const fromLabel = t.fromSiteId ?? t.fromTenderId ?? t.fromDeptId ?? '—';
              const toLabel = t.toSiteId ?? t.toTenderId ?? t.toDeptId ?? '—';
              return (
                <tr key={t.id} style={{ borderBottom: idx < transfers.length - 1 ? `1px solid ${BORDER}` : 'none', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '13px 16px', fontSize: 13, color: MUTED, fontFamily: 'monospace' }}>{t.employee?.employeeCode ?? '—'}</td>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: TEXT, fontWeight: 500 }}>{empName(t.employee)}</td>
                  <td style={{ padding: '13px 16px' }}><Badge label={tCfg.label} color={tCfg.color} bg={tCfg.bg} /></td>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: MUTED }}>
                      <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fromLabel}</span>
                      <ArrowRight size={12} style={{ flexShrink: 0 }} />
                      <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: TEXT }}>{toLabel}</span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: MUTED }}>{fmt(t.effectiveDate)}</td>
                  <td style={{ padding: '13px 16px' }}><Badge label={sCfg.label} color={sCfg.color} bg={sCfg.bg} /></td>
                  <td style={{ padding: '13px 16px' }}>
                    {t.status === 'PENDING_APPROVAL' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => approveMut.mutate({ id: t.id, action: 'APPROVED' })}
                          style={{ fontSize: 11, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
                        >Approve</button>
                        <button
                          onClick={() => approveMut.mutate({ id: t.id, action: 'REJECTED' })}
                          style={{ fontSize: 11, fontWeight: 700, color: '#f43f5e', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
                        >Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Dialog */}
      <AnimatePresence>
        {showDialog && (
          <Dialog open={showDialog} onClose={() => { setShowDialog(false); resetForm(); }} title="New Transfer Request">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Employee Code" required>
                <input value={form.employeeCode} onChange={e => setForm(p => ({ ...p, employeeCode: e.target.value }))} placeholder="e.g. EMP001" style={inputStyle} required />
              </Field>
              <Field label="Transfer Type" required>
                <select value={form.transferType} onChange={e => setForm(p => ({ ...p, transferType: e.target.value }))} style={selectStyle} required>
                  <option value="SITE" style={{ background: 'var(--wz-card-bg)' }}>Site Transfer</option>
                  <option value="TENDER" style={{ background: 'var(--wz-card-bg)' }}>Tender Transfer</option>
                  <option value="DEPARTMENT" style={{ background: 'var(--wz-card-bg)' }}>Department Transfer</option>
                </select>
              </Field>
              {form.transferType === 'SITE' && (
                <Field label="To Site">
                  <select value={form.toSiteId} onChange={e => setForm(p => ({ ...p, toSiteId: e.target.value }))} style={selectStyle}>
                    <option value="" style={{ background: 'var(--wz-card-bg)' }}>— Select Site —</option>
                    {sites.map(s => <option key={s.id} value={s.id} style={{ background: 'var(--wz-card-bg)' }}>{s.name}</option>)}
                  </select>
                </Field>
              )}
              {form.transferType === 'TENDER' && (
                <Field label="To Tender ID">
                  <input value={form.toTenderId} onChange={e => setForm(p => ({ ...p, toTenderId: e.target.value }))} placeholder="Tender ID or reference" style={inputStyle} />
                </Field>
              )}
              {form.transferType === 'DEPARTMENT' && (
                <Field label="To Department">
                  <select value={form.toDeptId} onChange={e => setForm(p => ({ ...p, toDeptId: e.target.value }))} style={selectStyle}>
                    <option value="" style={{ background: 'var(--wz-card-bg)' }}>— Select Department —</option>
                    {depts.map(d => <option key={d.id} value={d.id} style={{ background: 'var(--wz-card-bg)' }}>{d.name}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Effective Date" required>
                <input type="date" value={form.effectiveDate} onChange={e => setForm(p => ({ ...p, effectiveDate: e.target.value }))} style={inputStyle} required />
              </Field>
              <Field label="Reason" required>
                <textarea value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="State the reason for transfer…" rows={3} style={{ ...inputStyle, resize: 'vertical' }} required />
              </Field>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => { setShowDialog(false); resetForm(); }} style={{ ...inputStyle, width: 'auto', padding: '9px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Cancel</button>
                <SubmitBtn loading={createMut.isPending} label="Create Transfer" />
              </div>
            </form>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Tab: Promotions ──────────────────────────────────────────────────────────

function PromotionsTab() {
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    employeeCode: '', fromDesignationId: '', toDesignationId: '',
    fromDepartmentId: '', toDepartmentId: '',
    effectiveDate: '', newBasicSalary: '', incrementAmount: '', incrementPercentage: '', reason: '',
  });

  const { data: promoData, isLoading } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => employeesApi.promotions(),
  });

  const { data: desigData } = useQuery({ queryKey: ['master-designations'], queryFn: mastersApi.designations });
  const { data: deptsData } = useQuery({ queryKey: ['master-departments'], queryFn: mastersApi.departments });

  const designations: Designation[] = (desigData as any) ?? [];
  const depts: Department[] = (deptsData as any) ?? [];

  const createMut = useMutation({
    mutationFn: (d: Record<string, unknown>) => employeesApi.createPromotion(d),
    onSuccess: () => { toast.success('Promotion recorded'); qc.invalidateQueries({ queryKey: ['promotions'] }); setShowDialog(false); resetForm(); },
    onError: () => toast.error('Failed to record promotion'),
  });

  const promotions: Promotion[] = Array.isArray(promoData) ? promoData : ((promoData as any)?.data ?? []);

  const resetForm = () => setForm({ employeeCode: '', fromDesignationId: '', toDesignationId: '', fromDepartmentId: '', toDepartmentId: '', effectiveDate: '', newBasicSalary: '', incrementAmount: '', incrementPercentage: '', reason: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      employeeCode: form.employeeCode,
      effectiveDate: form.effectiveDate,
      reason: form.reason || undefined,
    };
    if (form.fromDesignationId) payload.fromDesignationId = form.fromDesignationId;
    if (form.toDesignationId) payload.toDesignationId = form.toDesignationId;
    if (form.fromDepartmentId) payload.fromDepartmentId = form.fromDepartmentId;
    if (form.toDepartmentId) payload.toDepartmentId = form.toDepartmentId;
    if (form.newBasicSalary) payload.newBasicSalary = Number(form.newBasicSalary);
    if (form.incrementAmount) payload.incrementAmount = Number(form.incrementAmount);
    if (form.incrementPercentage) payload.incrementPercentage = Number(form.incrementPercentage);
    createMut.mutate(payload);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setShowDialog(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: ACCENT, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
        >
          <Plus size={15} /> Record Promotion
        </button>
      </div>

      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              {['Employee', 'From Designation', 'To Designation', 'Effective Date', 'Increment', 'New Basic', 'Approved By', 'Recorded'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: MUTED }}>Loading…</td></tr>
            ) : promotions.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: MUTED }}>No promotion records found</td></tr>
            ) : promotions.map((p, idx) => {
              const incrementLabel = p.incrementAmount
                ? fmtCurrency(p.incrementAmount)
                : p.incrementPercentage
                ? `${p.incrementPercentage}%`
                : '—';
              const fromDesig = p.fromDesignation?.name ?? designations.find(d => d.id === p.fromDesignationId)?.name ?? '—';
              const toDesig = p.toDesignation?.name ?? designations.find(d => d.id === p.toDesignationId)?.name ?? '—';
              return (
                <tr key={p.id} style={{ borderBottom: idx < promotions.length - 1 ? `1px solid ${BORDER}` : 'none', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ fontSize: 13, color: TEXT, fontWeight: 500 }}>{empName(p.employee)}</div>
                    <div style={{ fontSize: 11, color: MUTED, fontFamily: 'monospace' }}>{p.employee?.employeeCode ?? '—'}</div>
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: MUTED }}>{fromDesig}</td>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: '#10b981', fontWeight: 600 }}>{toDesig}</td>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: MUTED }}>{fmt(p.effectiveDate)}</td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ fontSize: 13, color: '#f59e0b', fontWeight: 600 }}>{incrementLabel}</span>
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: TEXT }}>{fmtCurrency(p.newBasicSalary)}</td>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: MUTED }}>{p.approvedBy ?? '—'}</td>
                  <td style={{ padding: '13px 16px', fontSize: 12, color: MUTED }}>{fmt((p as any).createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showDialog && (
          <Dialog open={showDialog} onClose={() => { setShowDialog(false); resetForm(); }} title="Record Promotion">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Employee Code" required>
                <input value={form.employeeCode} onChange={e => setForm(p => ({ ...p, employeeCode: e.target.value }))} placeholder="e.g. EMP001" style={inputStyle} required />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="From Designation">
                  <select value={form.fromDesignationId} onChange={e => setForm(p => ({ ...p, fromDesignationId: e.target.value }))} style={selectStyle}>
                    <option value="" style={{ background: 'var(--wz-card-bg)' }}>— Select —</option>
                    {designations.map(d => <option key={d.id} value={d.id} style={{ background: 'var(--wz-card-bg)' }}>{d.name}</option>)}
                  </select>
                </Field>
                <Field label="To Designation" required>
                  <select value={form.toDesignationId} onChange={e => setForm(p => ({ ...p, toDesignationId: e.target.value }))} style={selectStyle} required>
                    <option value="" style={{ background: 'var(--wz-card-bg)' }}>— Select —</option>
                    {designations.map(d => <option key={d.id} value={d.id} style={{ background: 'var(--wz-card-bg)' }}>{d.name}</option>)}
                  </select>
                </Field>
                <Field label="From Department">
                  <select value={form.fromDepartmentId} onChange={e => setForm(p => ({ ...p, fromDepartmentId: e.target.value }))} style={selectStyle}>
                    <option value="" style={{ background: 'var(--wz-card-bg)' }}>— Select —</option>
                    {depts.map(d => <option key={d.id} value={d.id} style={{ background: 'var(--wz-card-bg)' }}>{d.name}</option>)}
                  </select>
                </Field>
                <Field label="To Department">
                  <select value={form.toDepartmentId} onChange={e => setForm(p => ({ ...p, toDepartmentId: e.target.value }))} style={selectStyle}>
                    <option value="" style={{ background: 'var(--wz-card-bg)' }}>— Select —</option>
                    {depts.map(d => <option key={d.id} value={d.id} style={{ background: 'var(--wz-card-bg)' }}>{d.name}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Effective Date" required>
                <input type="date" value={form.effectiveDate} onChange={e => setForm(p => ({ ...p, effectiveDate: e.target.value }))} style={inputStyle} required />
              </Field>
              <Field label="New Basic Salary">
                <input type="number" value={form.newBasicSalary} onChange={e => setForm(p => ({ ...p, newBasicSalary: e.target.value }))} placeholder="e.g. 45000" style={inputStyle} min="0" />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Increment Amount (₹)">
                  <input type="number" value={form.incrementAmount} onChange={e => setForm(p => ({ ...p, incrementAmount: e.target.value, incrementPercentage: '' }))} placeholder="e.g. 5000" style={inputStyle} min="0" />
                </Field>
                <Field label="Increment (%)">
                  <input type="number" value={form.incrementPercentage} onChange={e => setForm(p => ({ ...p, incrementPercentage: e.target.value, incrementAmount: '' }))} placeholder="e.g. 10" style={inputStyle} min="0" max="100" step="0.01" />
                </Field>
              </div>
              <Field label="Reason">
                <textarea value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="Justification for promotion…" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </Field>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => { setShowDialog(false); resetForm(); }} style={{ ...inputStyle, width: 'auto', padding: '9px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Cancel</button>
                <SubmitBtn loading={createMut.isPending} label="Save Promotion" />
              </div>
            </form>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Tab: Separations ─────────────────────────────────────────────────────────

function SeparationsTab() {
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    employeeCode: '', separationType: 'RESIGNATION', resignationDate: '',
    lastWorkingDate: '', noticePeriodDays: '30', noticePeriodWaived: false, exitRemarks: '',
  });

  const { data: sepData, isLoading } = useQuery({
    queryKey: ['separations'],
    queryFn: () => employeesApi.separations(),
  });

  const initMut = useMutation({
    mutationFn: (d: Record<string, unknown>) => employeesApi.initiateSeparation(d),
    onSuccess: () => { toast.success('Exit process initiated'); qc.invalidateQueries({ queryKey: ['separations'] }); setShowDialog(false); resetForm(); },
    onError: () => toast.error('Failed to initiate exit'),
  });

  const clearanceMut = useMutation({
    mutationFn: ({ employeeId, dept, cleared }: { employeeId: string; dept: string; cleared: boolean }) =>
      employeesApi.updateClearance(employeeId, dept, cleared),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['separations'] }); },
    onError: () => toast.error('Failed to update clearance'),
  });

  const separations: Separation[] = (sepData as any)?.data ?? (sepData as any) ?? [];

  const resetForm = () => setForm({ employeeCode: '', separationType: 'RESIGNATION', resignationDate: '', lastWorkingDate: '', noticePeriodDays: '30', noticePeriodWaived: false, exitRemarks: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      employeeCode: form.employeeCode,
      separationType: form.separationType,
      noticePeriodDays: Number(form.noticePeriodDays),
      noticePeriodWaived: form.noticePeriodWaived,
    };
    if (form.resignationDate) payload.resignationDate = form.resignationDate;
    if (form.lastWorkingDate) payload.lastWorkingDate = form.lastWorkingDate;
    if (form.exitRemarks) payload.exitRemarks = form.exitRemarks;
    initMut.mutate(payload);
  };

  const getClearancePct = (cs: Record<string, boolean>) => {
    const cleared = CLEARANCE_DEPARTMENTS.filter(d => cs[d] || cs[d.toLowerCase()]).length;
    return Math.round((cleared / CLEARANCE_DEPARTMENTS.length) * 100);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setShowDialog(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
        >
          <Plus size={15} /> Initiate Exit
        </button>
      </div>

      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              {['Employee', 'Type', 'Resignation Date', 'Last Working Day', 'Notice Period', 'Clearance', ''].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: MUTED }}>Loading…</td></tr>
            ) : separations.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: MUTED }}>No exit records found</td></tr>
            ) : separations.map((s, idx) => {
              const sCfg = SEPARATION_TYPE_CONFIG[s.separationType] ?? SEPARATION_TYPE_CONFIG.RESIGNATION;
              const pct = getClearancePct(s.clearanceStatus ?? {});
              const isExpanded = expandedId === s.id;
              return (
                <Fragment key={s.id}>
                  <tr
                    style={{ borderBottom: (isExpanded || idx < separations.length - 1) ? `1px solid ${BORDER}` : 'none', transition: 'background 0.15s', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                  >
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ fontSize: 13, color: TEXT, fontWeight: 500 }}>{empName(s.employee)}</div>
                      <div style={{ fontSize: 11, color: MUTED, fontFamily: 'monospace' }}>{s.employee?.employeeCode ?? '—'}</div>
                    </td>
                    <td style={{ padding: '13px 16px' }}><Badge label={sCfg.label} color={sCfg.color} bg={sCfg.bg} /></td>
                    <td style={{ padding: '13px 16px', fontSize: 13, color: MUTED }}>{fmt(s.resignationDate)}</td>
                    <td style={{ padding: '13px 16px', fontSize: 13, color: MUTED }}>{fmt(s.lastWorkingDate)}</td>
                    <td style={{ padding: '13px 16px', fontSize: 13, color: TEXT }}>
                      {s.noticePeriodDays} days
                    </td>
                    <td style={{ padding: '13px 16px', minWidth: 140 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#10b981' : pct > 50 ? '#f59e0b' : '#f43f5e', borderRadius: 3, transition: 'width 0.4s' }} />
                        </div>
                        <span style={{ fontSize: 12, color: MUTED, whiteSpace: 'nowrap' }}>{pct}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ color: MUTED }}>
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr style={{ borderBottom: idx < separations.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                      <td colSpan={7} style={{ padding: '0 16px 16px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px 18px' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: '0.06em', marginBottom: 12 }}>CLEARANCE CHECKLIST</div>
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            {CLEARANCE_DEPARTMENTS.map(dept => {
                              const cleared = !!(s.clearanceStatus?.[dept] || s.clearanceStatus?.[dept.toLowerCase()]);
                              return (
                                <button
                                  key={dept}
                                  onClick={(e) => { e.stopPropagation(); clearanceMut.mutate({ employeeId: s.employeeId, dept, cleared: !cleared }); }}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 7,
                                    background: cleared ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.08)',
                                    border: `1px solid ${cleared ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.2)'}`,
                                    borderRadius: 8, padding: '6px 12px', cursor: 'pointer', transition: 'all 0.2s',
                                  }}
                                >
                                  {cleared
                                    ? <CheckCircle2 size={13} color="#10b981" />
                                    : <XCircle size={13} color="#f43f5e" />}
                                  <span style={{ fontSize: 12, fontWeight: 600, color: cleared ? '#10b981' : '#f43f5e' }}>{dept}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showDialog && (
          <Dialog open={showDialog} onClose={() => { setShowDialog(false); resetForm(); }} title="Initiate Employee Exit">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Employee Code" required>
                <input value={form.employeeCode} onChange={e => setForm(p => ({ ...p, employeeCode: e.target.value }))} placeholder="e.g. EMP001" style={inputStyle} required />
              </Field>
              <Field label="Separation Type" required>
                <select value={form.separationType} onChange={e => setForm(p => ({ ...p, separationType: e.target.value }))} style={selectStyle} required>
                  {SEPARATION_TYPES_LIST.map(t => (
                    <option key={t} value={t} style={{ background: 'var(--wz-card-bg)' }}>{SEPARATION_TYPE_CONFIG[t]?.label ?? t}</option>
                  ))}
                </select>
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Resignation Date">
                  <input type="date" value={form.resignationDate} onChange={e => setForm(p => ({ ...p, resignationDate: e.target.value }))} style={inputStyle} />
                </Field>
                <Field label="Last Working Date">
                  <input type="date" value={form.lastWorkingDate} onChange={e => setForm(p => ({ ...p, lastWorkingDate: e.target.value }))} style={inputStyle} />
                </Field>
              </div>
              <Field label="Notice Period (Days)">
                <input type="number" value={form.noticePeriodDays} onChange={e => setForm(p => ({ ...p, noticePeriodDays: e.target.value }))} style={inputStyle} min="0" />
              </Field>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.noticePeriodWaived}
                  onChange={e => setForm(p => ({ ...p, noticePeriodWaived: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: ACCENT }}
                />
                <span style={{ fontSize: 13, color: MUTED }}>Notice period waived</span>
              </label>
              <Field label="Exit Remarks">
                <textarea value={form.exitRemarks} onChange={e => setForm(p => ({ ...p, exitRemarks: e.target.value }))} placeholder="Any additional notes…" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </Field>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => { setShowDialog(false); resetForm(); }} style={{ ...inputStyle, width: 'auto', padding: '9px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Cancel</button>
                <button
                  type="submit"
                  disabled={initMut.isPending}
                  style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 9, padding: '11px 24px', fontWeight: 700, fontSize: 14, cursor: initMut.isPending ? 'not-allowed' : 'pointer', opacity: initMut.isPending ? 0.7 : 1, marginTop: 8 }}
                >
                  {initMut.isPending ? 'Initiating…' : 'Initiate Exit'}
                </button>
              </div>
            </form>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Tab: Warnings ────────────────────────────────────────────────────────────

function WarningsTab() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['warnings'], queryFn: () => employeesApi.warnings({ limit: 50 }) });
  const { data: empData } = useQuery({ queryKey: ['employees-select-all'], queryFn: () => employeesApi.selectAll() });

  const createMut = useMutation({
    mutationFn: (d: any) => employeesApi.createWarning(d),
    onSuccess: () => { toast.success('Warning issued'); qc.invalidateQueries({ queryKey: ['warnings'] }); setShowForm(false); setForm({}); },
    onError: () => toast.error('Failed to issue warning'),
  });

  const warnings = (data as any)?.data ?? [];
  const empList: any[] = Array.isArray(empData) ? empData : (empData as any)?.data ?? [];

  const INPUT_S: React.CSSProperties = { background: 'var(--wz-input-bg)', border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT, padding: '8px 12px', width: '100%', outline: 'none', fontSize: 13 };
  const warnTypeCfg: Record<string, { color: string; bg: string }> = {
    VERBAL: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    WRITTEN: { color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
    FINAL: { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)' },
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ color: TEXT, fontWeight: 700, fontSize: 16 }}>Disciplinary Warnings</h2>
        <button onClick={() => setShowForm(true)} style={{ background: ACCENT, border: 'none', borderRadius: 8, color: 'white', padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          <Plus size={13} className="inline mr-1" />Issue Warning
        </button>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: `1px solid ${BORDER}` }}>
            {['Employee', 'Type', 'Subject', 'Incident Date', 'Issued By', 'Status'].map(h => (
              <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: MUTED, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {isLoading ? Array.from({ length: 4 }).map((_, i) => <tr key={i}><td colSpan={6} style={{ padding: '10px 16px' }}><div style={{ height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.05)' }} /></td></tr>) :
              warnings.length === 0 ? <tr><td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: MUTED }}>No warnings issued</td></tr> :
              warnings.map((w: any) => {
                const cfg = warnTypeCfg[w.warningType] ?? { color: MUTED, bg: 'rgba(255,255,255,0.06)' };
                return (
                  <tr key={w.id} style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                    <td style={{ padding: '10px 16px', color: TEXT, fontSize: 13 }}><span style={{ fontWeight: 600 }}>{w.employee?.firstName} {w.employee?.lastName}</span><br /><span style={{ fontSize: 11, color: MUTED }}>{w.employee?.employeeCode}</span></td>
                    <td style={{ padding: '10px 16px' }}><span style={{ background: cfg.bg, color: cfg.color, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{w.warningType}</span></td>
                    <td style={{ padding: '10px 16px', color: TEXT, fontSize: 13 }}>{w.subject}</td>
                    <td style={{ padding: '10px 16px', color: MUTED, fontSize: 13 }}>{formatDate(w.incidentDate)}</td>
                    <td style={{ padding: '10px 16px', color: MUTED, fontSize: 13 }}>{w.issuedBy ?? '—'}</td>
                    <td style={{ padding: '10px 16px' }}><span style={{ background: w.acknowledgedAt ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', color: w.acknowledgedAt ? '#10b981' : '#f59e0b', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>{w.acknowledgedAt ? 'Acknowledged' : 'Pending'}</span></td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Issue Warning Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
          <div style={{ width: '100%', maxWidth: 480, borderRadius: 16, background: 'var(--wz-card-bg)', border: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${BORDER}` }}>
              <h3 style={{ color: TEXT, fontWeight: 700, margin: 0 }}>Issue Warning</h3>
              <button onClick={() => { setShowForm(false); setForm({}); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED }}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { key: 'employeeId', label: 'Employee', type: 'select', options: empList.map((e: any) => ({ value: e.id, label: `${e.firstName} ${e.lastName} (${e.employeeCode})` })) },
                { key: 'warningType', label: 'Warning Type', type: 'select', options: ['VERBAL', 'WRITTEN', 'FINAL'].map(v => ({ value: v, label: v })) },
                { key: 'subject', label: 'Subject', type: 'text' },
                { key: 'description', label: 'Description', type: 'textarea' },
                { key: 'incidentDate', label: 'Incident Date', type: 'date' },
              ].map(({ key, label, type, options }) => (
                <div key={key}>
                  <label style={{ color: MUTED, fontSize: 12, display: 'block', marginBottom: 4 }}>{label}</label>
                  {type === 'select' ? (
                    <select style={INPUT_S} value={form[key] ?? ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}>
                      <option value="">Select...</option>
                      {(options ?? []).map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : type === 'textarea' ? (
                    <textarea style={{ ...INPUT_S, height: 72, resize: 'vertical' as const }} value={form[key] ?? ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                  ) : (
                    <input type={type} style={INPUT_S} value={form[key] ?? ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={() => createMut.mutate(form)} disabled={createMut.isPending} style={{ flex: 1, background: '#dc2626', border: 'none', borderRadius: 8, color: 'white', padding: '9px 0', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>{createMut.isPending ? 'Issuing…' : 'Issue Warning'}</button>
                <button onClick={() => { setShowForm(false); setForm({}); }} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: TEXT, padding: '9px 0', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Trips ───────────────────────────────────────────────────────────────

function TripsTab() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['trips'], queryFn: () => employeesApi.trips({ limit: 50 }) });
  const { data: empData } = useQuery({ queryKey: ['employees-select-all'], queryFn: () => employeesApi.selectAll() });

  const createMut = useMutation({
    mutationFn: (d: any) => employeesApi.createTrip(d),
    onSuccess: () => { toast.success('Trip created'); qc.invalidateQueries({ queryKey: ['trips'] }); setShowForm(false); setForm({}); },
    onError: () => toast.error('Failed to create trip'),
  });

  const trips = (data as any)?.data ?? [];
  const empList: any[] = Array.isArray(empData) ? empData : (empData as any)?.data ?? [];
  const INPUT_S: React.CSSProperties = { background: 'var(--wz-input-bg)', border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT, padding: '8px 12px', width: '100%', outline: 'none', fontSize: 13 };

  const tripStatusCfg: Record<string, { color: string; bg: string }> = {
    REQUESTED: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    APPROVED:  { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    COMPLETED: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    CANCELLED: { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)' },
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ color: TEXT, fontWeight: 700, fontSize: 16 }}>Employee Trips & Travel</h2>
        <button onClick={() => setShowForm(true)} style={{ background: ACCENT, border: 'none', borderRadius: 8, color: 'white', padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          <Plus size={13} className="inline mr-1" />New Trip
        </button>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: `1px solid ${BORDER}` }}>
            {['Employee', 'Purpose', 'From → To', 'Departure', 'Advance', 'Actual', 'Status'].map(h => (
              <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: MUTED, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {isLoading ? Array.from({ length: 4 }).map((_, i) => <tr key={i}><td colSpan={7} style={{ padding: '10px 16px' }}><div style={{ height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.05)' }} /></td></tr>) :
              trips.length === 0 ? <tr><td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: MUTED }}>No trips yet</td></tr> :
              trips.map((t: any) => {
                const cfg = tripStatusCfg[t.status] ?? { color: MUTED, bg: 'rgba(255,255,255,0.06)' };
                return (
                  <tr key={t.id} style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                    <td style={{ padding: '10px 16px', color: TEXT, fontSize: 13 }}><span style={{ fontWeight: 600 }}>{t.employee?.firstName} {t.employee?.lastName}</span><br /><span style={{ fontSize: 11, color: MUTED }}>{t.employee?.employeeCode}</span></td>
                    <td style={{ padding: '10px 16px', color: TEXT, fontSize: 13 }}>{t.purpose}</td>
                    <td style={{ padding: '10px 16px', color: MUTED, fontSize: 12 }}>{t.fromLocation} → {t.toLocation}</td>
                    <td style={{ padding: '10px 16px', color: MUTED, fontSize: 13 }}>{formatDate(t.departureDate)}</td>
                    <td style={{ padding: '10px 16px', color: MUTED, fontSize: 13 }}>{t.advanceAmount ? `₹${Number(t.advanceAmount).toLocaleString()}` : '—'}</td>
                    <td style={{ padding: '10px 16px', color: MUTED, fontSize: 13 }}>{t.actualExpense ? `₹${Number(t.actualExpense).toLocaleString()}` : '—'}</td>
                    <td style={{ padding: '10px 16px' }}><span style={{ background: cfg.bg, color: cfg.color, borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>{t.status}</span></td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* New Trip Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
          <div style={{ width: '100%', maxWidth: 480, borderRadius: 16, background: 'var(--wz-card-bg)', border: `1px solid ${BORDER}`, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, position: 'sticky', top: 0, background: 'var(--wz-card-bg)' }}>
              <h3 style={{ color: TEXT, fontWeight: 700, margin: 0 }}>New Trip Request</h3>
              <button onClick={() => { setShowForm(false); setForm({}); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED }}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { key: 'employeeId', label: 'Employee', type: 'select', options: empList.map((e: any) => ({ value: e.id, label: `${e.firstName} ${e.lastName} (${e.employeeCode})` })) },
                { key: 'tripType', label: 'Trip Type', type: 'select', options: ['SITE_VISIT', 'INSPECTION', 'TRAINING', 'CLIENT_MEETING', 'OTHER'].map(v => ({ value: v, label: v })) },
                { key: 'purpose', label: 'Purpose', type: 'text' },
                { key: 'fromLocation', label: 'From Location', type: 'text' },
                { key: 'toLocation', label: 'To Location', type: 'text' },
                { key: 'departureDate', label: 'Departure Date', type: 'date' },
                { key: 'returnDate', label: 'Return Date', type: 'date' },
                { key: 'advanceAmount', label: 'Advance Amount (₹)', type: 'number' },
              ].map(({ key, label, type, options }) => (
                <div key={key}>
                  <label style={{ color: MUTED, fontSize: 12, display: 'block', marginBottom: 4 }}>{label}</label>
                  {type === 'select' ? (
                    <select style={INPUT_S} value={form[key] ?? ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}>
                      <option value="">Select...</option>
                      {(options ?? []).map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input type={type} style={INPUT_S} value={form[key] ?? ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={() => createMut.mutate(form)} disabled={createMut.isPending} style={{ flex: 1, background: ACCENT, border: 'none', borderRadius: 8, color: 'white', padding: '9px 0', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>{createMut.isPending ? 'Saving…' : 'Create Trip'}</button>
                <button onClick={() => { setShowForm(false); setForm({}); }} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: TEXT, padding: '9px 0', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'transfers',   label: 'Transfers',         icon: ArrowRight },
  { id: 'promotions',  label: 'Promotions',         icon: TrendingUp },
  { id: 'separations', label: 'Separations / Exit', icon: LogOut },
  { id: 'warnings',    label: 'Warnings',           icon: ShieldAlert },
  { id: 'trips',       label: 'Trips',              icon: Plane },
] as const;

type TabId = 'transfers' | 'promotions' | 'separations' | 'warnings' | 'trips';

export default function WorkforceLifecyclePage() {
  const [activeTab, setActiveTab] = useState<TabId>('transfers');

  return (
    <div style={{ background: BG, minHeight: '100vh', padding: '28px 32px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ marginBottom: 28 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `${ACCENT}20`, border: `1px solid ${ACCENT}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} color={ACCENT} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: TEXT, letterSpacing: '-0.01em' }}>Workforce Lifecycle</h1>
            <p style={{ margin: 0, fontSize: 13, color: MUTED, marginTop: 2 }}>Manage employee transfers, promotions, and exits</p>
          </div>
        </div>
      </motion.div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 4, width: 'fit-content', marginBottom: 24 }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 18px', border: 'none', borderRadius: 7, cursor: 'pointer',
                background: active ? ACCENT : 'transparent',
                color: active ? '#fff' : MUTED,
                fontWeight: active ? 700 : 500,
                fontSize: 13,
                transition: 'all 0.18s',
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === 'transfers' && <TransfersTab />}
          {activeTab === 'promotions' && <PromotionsTab />}
          {activeTab === 'separations' && <SeparationsTab />}
          {activeTab === 'warnings' && <WarningsTab />}
          {activeTab === 'trips' && <TripsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
