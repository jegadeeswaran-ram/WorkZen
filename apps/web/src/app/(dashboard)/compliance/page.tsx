'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import {
  Shield, AlertCircle, CheckCircle2, Clock, Plus, X, Save,
  ChevronLeft, ChevronRight, FileCheck, Award, Calendar, Search
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatCurrency } from '@/lib/utils';
import { complianceApi } from '@/lib/api';

// ─── Schemas ────────────────────────────────────────────────────────
const itemSchema = z.object({
  type: z.string().min(1, 'Type required'),
  period: z.string().min(1, 'Period required (e.g. Jun-2026)'),
  dueDate: z.string().min(1, 'Due date required'),
  amount: z.coerce.number().optional(),
  notes: z.string().optional(),
});

const licenseSchema = z.object({
  type: z.string().min(1, 'License type required'),
  licenseNo: z.string().min(1, 'License number required'),
  issuedBy: z.string().optional(),
  issuedDate: z.string().optional(),
  expiryDate: z.string().optional(),
});

const fileSchema = z.object({
  challanNo: z.string().optional(),
  filedDate: z.string().min(1, 'Filed date required'),
  amount: z.coerce.number().optional(),
});

// ─── Status configs ──────────────────────────────────────────────────
const ITEM_STATUS: Record<string, { color: string; bg: string; label: string }> = {
  PENDING:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Pending' },
  FILED:    { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Filed' },
  PAID:     { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Paid' },
  OVERDUE:  { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)', label: 'Overdue' },
  WAIVED:   { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.06)', label: 'Waived' },
};

const COMPLIANCE_TYPES = [
  { value: 'PF', label: 'PF — Provident Fund' },
  { value: 'ESI', label: 'ESI — Employee State Insurance' },
  { value: 'PROFESSIONAL_TAX', label: 'Professional Tax' },
  { value: 'TDS', label: 'TDS — Tax Deducted at Source' },
  { value: 'LWF', label: 'LWF — Labour Welfare Fund' },
  { value: 'CLRA', label: 'CLRA — Contract Labour' },
  { value: 'MLWF', label: 'MLWF — Maharashtra LWF' },
];

const LICENSE_TYPES = [
  'Labour Licence',
  'Factory Act Registration',
  'Shops & Establishment',
  'CLRA Registration',
  'ESI Registration',
  'PF Registration',
  'GST Registration',
  'Trade Licence',
  'Other',
];

// ─── Modal ───────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className={`w-full rounded-2xl ${wide ? 'max-w-lg' : 'max-w-md'}`}
        style={{ background: 'var(--wz-card-bg)', border: '1px solid var(--wz-card-border)' }}>
        <div className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid var(--wz-card-border)' }}>
          <h3 className="font-semibold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
            <X size={18} style={{ color: 'var(--wz-text-muted)' }} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const F = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div>
    <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>{label}</label>
    {children}
    {error && <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>{error}</p>}
  </div>
);

// ─── Main Page ──────────────────────────────────────────────────────
export default function CompliancePage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'dashboard' | 'items' | 'licenses'>('dashboard');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showItemModal, setShowItemModal] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [fileItemId, setFileItemId] = useState<string | null>(null);
  const qc = useQueryClient();

  const now = new Date();

  const { data: dash } = useQuery({
    queryKey: ['compliance-dash'],
    queryFn: complianceApi.dashboard,
  });

  const { data: itemsData, isLoading: loadItems } = useQuery({
    queryKey: ['compliance-items', page, typeFilter, statusFilter, search],
    queryFn: () => complianceApi.items({
      page,
      limit: 15,
      type: typeFilter || undefined,
      status: statusFilter || undefined,
      search: search || undefined,
    }),
    enabled: tab === 'items',
  });

  const { data: licenses = [], isLoading: loadLicenses } = useQuery({
    queryKey: ['compliance-licenses'],
    queryFn: complianceApi.licenses,
    enabled: tab === 'licenses',
  });

  const { data: calendar = [] } = useQuery({
    queryKey: ['compliance-calendar', now.getMonth() + 1, now.getFullYear()],
    queryFn: () => complianceApi.calendar(now.getMonth() + 1, now.getFullYear()),
    enabled: tab === 'dashboard',
  });

  const items = (itemsData as any)?.data ?? [];
  const itemsMeta = (itemsData as any)?.meta;

  const itemForm = useForm({ resolver: zodResolver(itemSchema) });
  const licenseForm = useForm({ resolver: zodResolver(licenseSchema) });
  const fileForm = useForm({
    resolver: zodResolver(fileSchema),
    defaultValues: { filedDate: now.toISOString().split('T')[0] },
  });

  const createItemMut = useMutation({
    mutationFn: (data: any) => complianceApi.createItem(data),
    onSuccess: () => {
      toast.success('Compliance item added');
      qc.invalidateQueries({ queryKey: ['compliance-items'] });
      qc.invalidateQueries({ queryKey: ['compliance-dash'] });
      setShowItemModal(false);
      itemForm.reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed to add'),
  });

  const createLicenseMut = useMutation({
    mutationFn: (data: any) => complianceApi.createLicense(data),
    onSuccess: () => {
      toast.success('License added');
      qc.invalidateQueries({ queryKey: ['compliance-licenses'] });
      setShowLicenseModal(false);
      licenseForm.reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed to add'),
  });

  const markFiledMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => complianceApi.markFiled(id, data),
    onSuccess: () => {
      toast.success('Marked as filed!');
      qc.invalidateQueries({ queryKey: ['compliance-items'] });
      qc.invalidateQueries({ queryKey: ['compliance-dash'] });
      setFileItemId(null);
      fileForm.reset({ filedDate: now.toISOString().split('T')[0] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed'),
  });

  const healthScore = dash
    ? Math.round(((dash.filed ?? 0) / Math.max((dash.filed ?? 0) + (dash.overdue ?? 0) + (dash.upcoming ?? 0), 1)) * 100)
    : 0;

  const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: Shield },
    { id: 'items', label: 'Compliance Items', icon: FileCheck },
    { id: 'licenses', label: 'Licenses', icon: Award },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Create Item Modal */}
      <Modal open={showItemModal} onClose={() => { setShowItemModal(false); itemForm.reset(); }} title="Add Compliance Item" wide>
        <form onSubmit={itemForm.handleSubmit(d => createItemMut.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <F label="Compliance Type *" error={itemForm.formState.errors.type?.message as string}>
              <select {...itemForm.register('type')} className="input-field w-full">
                <option value="">Select type</option>
                {COMPLIANCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </F>
            <F label="Period *" error={itemForm.formState.errors.period?.message as string}>
              <input {...itemForm.register('period')} className="input-field w-full" placeholder="Jun-2026" />
            </F>
            <F label="Due Date *" error={itemForm.formState.errors.dueDate?.message as string}>
              <input {...itemForm.register('dueDate')} type="date" className="input-field w-full" />
            </F>
            <F label="Amount (₹)">
              <input {...itemForm.register('amount')} type="number" className="input-field w-full" placeholder="15000" />
            </F>
          </div>
          <F label="Notes">
            <textarea {...itemForm.register('notes')} rows={2} className="input-field w-full resize-none" placeholder="Additional notes..." />
          </F>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-1.5" disabled={createItemMut.isPending}>
              <Save size={14} /> {createItemMut.isPending ? 'Adding...' : 'Add Item'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowItemModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* License Modal */}
      <Modal open={showLicenseModal} onClose={() => { setShowLicenseModal(false); licenseForm.reset(); }} title="Add License / Certificate" wide>
        <form onSubmit={licenseForm.handleSubmit(d => createLicenseMut.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <F label="License Type *" error={licenseForm.formState.errors.type?.message as string}>
              <select {...licenseForm.register('type')} className="input-field w-full">
                <option value="">Select type</option>
                {LICENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </F>
            <F label="License Number *" error={licenseForm.formState.errors.licenseNo?.message as string}>
              <input {...licenseForm.register('licenseNo')} className="input-field w-full" placeholder="MH/LIC/2024/001234" />
            </F>
            <F label="Issued By">
              <input {...licenseForm.register('issuedBy')} className="input-field w-full" placeholder="Labour Commissioner" />
            </F>
            <F label="Issued Date">
              <input {...licenseForm.register('issuedDate')} type="date" className="input-field w-full" />
            </F>
            <F label="Expiry Date">
              <input {...licenseForm.register('expiryDate')} type="date" className="input-field w-full" />
            </F>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-1.5" disabled={createLicenseMut.isPending}>
              <Save size={14} /> {createLicenseMut.isPending ? 'Adding...' : 'Add License'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowLicenseModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Mark Filed Modal */}
      <Modal
        open={!!fileItemId}
        onClose={() => { setFileItemId(null); fileForm.reset({ filedDate: now.toISOString().split('T')[0] }); }}
        title="Mark as Filed"
      >
        <form onSubmit={fileForm.handleSubmit(d => markFiledMut.mutate({ id: fileItemId!, data: d }))} className="space-y-4">
          <F label="Filed Date *" error={fileForm.formState.errors.filedDate?.message as string}>
            <input {...fileForm.register('filedDate')} type="date" className="input-field w-full" />
          </F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Challan / Reference No.">
              <input {...fileForm.register('challanNo')} className="input-field w-full" placeholder="CHL/2026/001" />
            </F>
            <F label="Amount Paid (₹)">
              <input {...fileForm.register('amount')} type="number" className="input-field w-full" placeholder="15000" />
            </F>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-1.5" disabled={markFiledMut.isPending}>
              <CheckCircle2 size={14} /> {markFiledMut.isPending ? 'Saving...' : 'Mark as Filed'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setFileItemId(null)}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>Compliance</h2>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Track statutory obligations, filings, and licenses</p>
        </div>
        <div className="flex gap-2">
          {tab === 'items' && (
            <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowItemModal(true)}>
              <Plus size={16} /> Add Item
            </button>
          )}
          {tab === 'licenses' && (
            <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowLicenseModal(true)}>
              <Plus size={16} /> Add License
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === t.id ? 'rgba(99,102,241,0.2)' : 'transparent',
              color: tab === t.id ? '#818cf8' : 'rgba(255,255,255,0.5)',
            }}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD TAB ─────────────────────────────────────── */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Health Score */}
            <div className="glass-card p-6 flex flex-col items-center justify-center text-center">
              <p className="text-xs font-semibold uppercase tracking-wider mb-4"
                style={{ color: 'rgba(255,255,255,0.4)' }}>Compliance Health Score</p>
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                  <circle cx="60" cy="60" r="50" fill="none"
                    stroke={healthScore >= 80 ? '#10b981' : healthScore >= 60 ? '#f59e0b' : '#f43f5e'}
                    strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={`${(314 * healthScore) / 100} 314`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-3xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>{healthScore}%</p>
                </div>
              </div>
              <p className="text-sm mt-3" style={{ color: healthScore >= 80 ? '#10b981' : healthScore >= 60 ? '#f59e0b' : '#f43f5e' }}>
                {healthScore >= 80 ? '✓ Compliant' : healthScore >= 60 ? '⚠ Needs Attention' : '✗ At Risk'}
              </p>
            </div>

            {/* Stat cards */}
            <div className="lg:col-span-2 grid grid-cols-3 gap-4">
              {[
                { label: 'Overdue', value: dash?.overdue ?? 0, color: '#f43f5e', icon: AlertCircle, desc: 'Require immediate action' },
                { label: 'Due This Month', value: dash?.upcoming ?? 0, color: '#f59e0b', icon: Clock, desc: 'Upcoming in 30 days' },
                { label: 'Filed', value: dash?.filed ?? 0, color: '#10b981', icon: CheckCircle2, desc: 'Successfully completed' },
              ].map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }} className="glass-card p-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                    style={{ background: `${s.color}15`, color: s.color }}>
                    <s.icon size={15} />
                  </div>
                  <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>{s.value}</p>
                  <p className="text-xs font-medium mt-1" style={{ color: s.color }}>{s.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Calendar items */}
          {(calendar as any[]).length > 0 ? (
            <div className="glass-card p-5">
              <h3 className="font-semibold text-white mb-4" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                This Month&apos;s Due Dates — {now.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h3>
              <div className="space-y-2">
                {(calendar as any[]).map((item: any) => {
                  const cfg = ITEM_STATUS[item.status] ?? ITEM_STATUS.PENDING;
                  const dueDate = new Date(item.dueDate);
                  const isOverdue = dueDate < now && item.status !== 'FILED' && item.status !== 'PAID';
                  const typeLabel = COMPLIANCE_TYPES.find(t => t.value === item.type)?.label ?? item.type;
                  return (
                    <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl"
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isOverdue ? 'rgba(244,63,94,0.2)' : 'rgba(255,255,255,0.04)'}`,
                      }}>
                      <div className="text-center min-w-[3rem]">
                        <p className="text-lg font-bold"
                          style={{ color: isOverdue ? '#f43f5e' : 'rgba(255,255,255,0.7)', fontFamily: 'Plus Jakarta Sans' }}>
                          {dueDate.getDate()}
                        </p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          {dueDate.toLocaleString('default', { month: 'short' })}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{typeLabel}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Period: {item.period}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium flex-shrink-0"
                        style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>
                      {item.status !== 'FILED' && item.status !== 'PAID' && (
                        <button onClick={() => setFileItemId(item.id)}
                          className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors"
                          style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                          Mark Filed
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="glass-card p-8 text-center">
              <Calendar size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
              <p className="font-medium text-white mb-1">No compliance items this month</p>
              <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Add compliance items to track filings and deadlines
              </p>
              <button className="btn-primary flex items-center gap-1.5 mx-auto"
                onClick={() => { setTab('items'); setShowItemModal(true); }}>
                <Plus size={14} /> Add Compliance Item
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── ITEMS TAB ─────────────────────────────────────────── */}
      {tab === 'items' && (
        <div className="space-y-4">
          <div className="glass-card p-4 flex gap-3 flex-wrap">
            <div className="relative min-w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--wz-text-muted)' }} />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search compliance items..." className="input-field w-full pl-9" />
            </div>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="input-field" style={{ width: 'auto' }}>
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="FILED">Filed</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
              <option value="WAIVED">Waived</option>
            </select>
            <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
              className="input-field" style={{ width: 'auto' }}>
              <option value="">All Types</option>
              {COMPLIANCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Type', 'Period', 'Due Date', 'Amount', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadItems && [...Array(5)].map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                      </td>
                    ))}
                  </tr>
                ))}
                {!loadItems && items.map((item: any) => {
                  const cfg = ITEM_STATUS[item.status] ?? ITEM_STATUS.PENDING;
                  const isOverdue = new Date(item.dueDate) < now && item.status !== 'FILED' && item.status !== 'PAID';
                  const typeLabel = COMPLIANCE_TYPES.find(t => t.value === item.type)?.label ?? item.type;
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.015] transition-colors"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-white">{typeLabel}</p>
                        {item.challanNo && (
                          <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            Challan: {item.challanNo}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{item.period}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm" style={{ color: isOverdue ? '#f43f5e' : 'rgba(255,255,255,0.5)' }}>
                          {formatDate(item.dueDate)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {item.amount ? formatCurrency(Number(item.amount)) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={{ background: cfg.bg, color: cfg.color }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.status !== 'FILED' && item.status !== 'PAID' && (
                          <button onClick={() => setFileItemId(item.id)}
                            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                            style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                            Mark Filed
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!loadItems && items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <Shield size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                      <p className="text-white font-medium mb-1">No compliance items</p>
                      <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        Track PF, ESI, TDS, labour licences and more
                      </p>
                      <button className="btn-primary flex items-center gap-1.5 mx-auto" onClick={() => setShowItemModal(true)}>
                        <Plus size={14} /> Add First Item
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {itemsMeta && itemsMeta.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{itemsMeta.total} items</p>
                <div className="flex gap-1 items-center">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                    className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30">
                    <ChevronLeft size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
                  </button>
                  <span className="text-xs px-2 py-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {page}/{itemsMeta.totalPages}
                  </span>
                  <button disabled={page === itemsMeta.totalPages} onClick={() => setPage(p => p + 1)}
                    className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30">
                    <ChevronRight size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LICENSES TAB ──────────────────────────────────────── */}
      {tab === 'licenses' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loadLicenses && [...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-5 h-36 animate-pulse" />
          ))}
          {!loadLicenses && (licenses as any[]).map((lic: any) => {
            const daysLeft = lic.expiryDate
              ? Math.ceil((new Date(lic.expiryDate).getTime() - now.getTime()) / 86400000)
              : null;
            const isExpiring = daysLeft !== null && daysLeft <= 30 && daysLeft >= 0;
            const isExpired = daysLeft !== null && daysLeft < 0;
            return (
              <motion.div key={lic.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: isExpired
                        ? 'rgba(244,63,94,0.12)'
                        : isExpiring ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
                    }}>
                    <Award size={18} style={{ color: isExpired ? '#f43f5e' : isExpiring ? '#f59e0b' : '#10b981' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-sm truncate">{lic.type}</h3>
                    <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>{lic.licenseNo}</p>
                  </div>
                </div>
                <div className="space-y-1 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {lic.issuedBy && <p>Issued by: {lic.issuedBy}</p>}
                  {lic.issuedDate && <p>Issued: {formatDate(lic.issuedDate)}</p>}
                  {lic.expiryDate && (
                    <p style={{ color: isExpired ? '#f43f5e' : isExpiring ? '#f59e0b' : 'rgba(255,255,255,0.45)' }}>
                      Expires: {formatDate(lic.expiryDate)}
                      {daysLeft !== null && daysLeft >= 0 && ` (${daysLeft} days left)`}
                      {isExpired && ' (EXPIRED)'}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
          {!loadLicenses && (licenses as any[]).length === 0 && (
            <div className="col-span-3 py-20 text-center">
              <Award size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
              <p className="text-white font-medium mb-1">No licenses tracked</p>
              <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Track labour licences, factory permits, and registrations
              </p>
              <button className="btn-primary flex items-center gap-1.5 mx-auto" onClick={() => setShowLicenseModal(true)}>
                <Plus size={14} /> Add License
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
