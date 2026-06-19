'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, Users, Building2, Briefcase, MapPin, Play, ThumbsUp,
  ChevronLeft, ChevronRight, Plus, X, Save, Search, Pencil,
  AlertCircle, CheckCircle2, Clock, DollarSign, LayoutGrid,
  ClipboardList, Settings2, Eye, IndianRupee,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import { payrollApi, employeesApi } from '@/lib/api';

// ── Constants ──────────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const RUN_STATUS: Record<string, { color: string; bg: string; ring: string; label: string; icon: React.ElementType }> = {
  DRAFT:            { color: 'rgba(255,255,255,0.5)',  bg: 'rgba(255,255,255,0.06)',  ring: 'rgba(255,255,255,0.1)',  label: 'Draft',            icon: Clock          },
  PROCESSING:       { color: '#818cf8',                bg: 'rgba(99,102,241,0.12)',   ring: 'rgba(99,102,241,0.2)',   label: 'Processing',       icon: Clock          },
  PENDING_APPROVAL: { color: '#f59e0b',                bg: 'rgba(245,158,11,0.12)',   ring: 'rgba(245,158,11,0.25)', label: 'Pending Approval', icon: AlertCircle    },
  APPROVED:         { color: '#10b981',                bg: 'rgba(16,185,129,0.12)',   ring: 'rgba(16,185,129,0.25)', label: 'Approved',         icon: CheckCircle2   },
  PAID:             { color: '#3b82f6',                bg: 'rgba(59,130,246,0.12)',   ring: 'rgba(59,130,246,0.25)', label: 'Disbursed',        icon: CheckCircle2   },
  CANCELLED:        { color: '#f43f5e',                bg: 'rgba(244,63,94,0.12)',    ring: 'rgba(244,63,94,0.2)',   label: 'Cancelled',        icon: AlertCircle    },
};

const EMP_TYPE_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  PERMANENT:  { label: 'Office Staff', color: '#6366f1', bg: 'rgba(99,102,241,0.1)',  icon: Building2 },
  CONTRACT:   { label: 'Site/Contract', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: MapPin    },
  TEMPORARY:  { label: 'Temporary',    color: '#64748b', bg: 'rgba(100,116,139,0.1)', icon: Clock     },
  TRAINEE:    { label: 'Trainee',      color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icon: Users     },
};

// ── Schemas ────────────────────────────────────────────────────────────────
const runSchema = z.object({
  month: z.coerce.number().min(1).max(12),
  year:  z.coerce.number().min(2020).max(2099),
  employmentType: z.string().optional(),
});

const salarySchema = z.object({
  employeeId:       z.string().min(1, 'Select employee'),
  effectiveFrom:    z.string().min(1, 'Required'),
  basic:            z.coerce.number().min(1, 'Basic required'),
  da:               z.coerce.number().min(0).default(0),
  hra:              z.coerce.number().min(0).default(0),
  specialAllowance: z.coerce.number().min(0).default(0),
});

type RunForm    = z.infer<typeof runSchema>;
type SalaryForm = z.infer<typeof salarySchema>;

// ── Field wrapper ──────────────────────────────────────────────────────────
function F({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>{label}</label>
      {children}
      {error && <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>{error}</p>}
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: 'var(--wz-card-bg)', border: '1px solid var(--wz-card-border)' }}>
        <div className="flex items-center justify-between p-5 sticky top-0" style={{ background: 'var(--wz-card-bg)', borderBottom: '1px solid var(--wz-card-border)' }}>
          <h3 className="font-semibold text-sm" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5"><X size={16} style={{ color: 'var(--wz-text-muted)' }} /></button>
        </div>
        <div className="p-5">{children}</div>
      </motion.div>
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--wz-text-muted)' }}>{label}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, color }}><Icon size={15} /></div>
      </div>
      <p className="text-2xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--wz-text-muted)' }}>{sub}</p>}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
const TABS = [
  { id: 'dashboard',  label: 'Dashboard',        icon: LayoutGrid    },
  { id: 'runs',       label: 'Payroll Runs',      icon: ClipboardList },
  { id: 'salary',     label: 'Salary Setup',      icon: IndianRupee   },
] as const;
type TabId = typeof TABS[number]['id'];

export default function PayrollPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const now = new Date();

  const [tab, setTab]           = useState<TabId>('dashboard');
  const [showRunModal, setShowRunModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [editSalary, setEditSalary] = useState<any>(null);
  const [runsPage, setRunsPage] = useState(1);
  const [salaryPage, setSalaryPage] = useState(1);
  const [salarySearch, setSalarySearch] = useState('');
  const [salaryTypeFilter, setSalaryTypeFilter] = useState('');

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: dash } = useQuery({ queryKey: ['payroll-dashboard'], queryFn: payrollApi.dashboard, staleTime: 60_000 });

  const { data: runsData, isLoading: runsLoading } = useQuery({
    queryKey: ['payroll-runs', runsPage],
    queryFn: () => payrollApi.runs({ page: runsPage, limit: 10 }),
    enabled: tab === 'runs' || tab === 'dashboard',
  });

  const { data: salaryData, isLoading: salaryLoading } = useQuery({
    queryKey: ['salary-structures', salaryPage, salarySearch, salaryTypeFilter],
    queryFn: () => payrollApi.salaryStructures({ page: salaryPage, limit: 15, search: salarySearch || undefined, employmentType: salaryTypeFilter || undefined }),
    enabled: tab === 'salary',
  });

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['employees-select-all-active'],
    queryFn: () => employeesApi.selectAll('ACTIVE'),
    enabled: showSalaryModal,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const runMut = useMutation({
    mutationFn: (d: RunForm) => payrollApi.createRun({ month: d.month, year: d.year, employmentType: d.employmentType }),
    onSuccess: () => { toast.success('Payroll run initiated'); qc.invalidateQueries({ queryKey: ['payroll-runs'] }); qc.invalidateQueries({ queryKey: ['payroll-dashboard'] }); setShowRunModal(false); },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed to create run'),
  });

  const approveMut = useMutation({
    mutationFn: payrollApi.approve,
    onSuccess: () => { toast.success('Payroll approved'); qc.invalidateQueries({ queryKey: ['payroll-runs'] }); qc.invalidateQueries({ queryKey: ['payroll-dashboard'] }); },
    onError: () => toast.error('Failed to approve'),
  });

  const disburseMut = useMutation({
    mutationFn: payrollApi.disburse,
    onSuccess: () => { toast.success('Payroll disbursed'); qc.invalidateQueries({ queryKey: ['payroll-runs'] }); qc.invalidateQueries({ queryKey: ['payroll-dashboard'] }); },
    onError: () => toast.error('Failed to disburse'),
  });

  const salaryMut = useMutation({
    mutationFn: (d: SalaryForm) => editSalary
      ? payrollApi.updateSalary(editSalary.id, d)
      : payrollApi.assignSalary(d),
    onSuccess: () => {
      toast.success(editSalary ? 'Salary updated' : 'Salary assigned');
      qc.invalidateQueries({ queryKey: ['salary-structures'] });
      qc.invalidateQueries({ queryKey: ['payroll-dashboard'] });
      setShowSalaryModal(false); setEditSalary(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed'),
  });

  // ── Forms ─────────────────────────────────────────────────────────────────
  const runForm = useForm<RunForm>({
    resolver: zodResolver(runSchema),
    defaultValues: { month: now.getMonth() + 1, year: now.getFullYear() },
  });

  const salaryForm = useForm<SalaryForm>({ resolver: zodResolver(salarySchema) });

  const openSalaryModal = (record?: any) => {
    setEditSalary(record ?? null);
    salaryForm.reset(record ? {
      employeeId: record.employeeId,
      effectiveFrom: record.effectiveFrom?.split('T')[0],
      basic: Number(record.basic),
      da: Number(record.da),
      hra: Number(record.hra),
      specialAllowance: Number(record.specialAllowance),
    } : { effectiveFrom: now.toISOString().split('T')[0], da: 0, hra: 0, specialAllowance: 0 });
    setShowSalaryModal(true);
  };

  const runs: any[] = (runsData as any)?.data ?? [];
  const runsMeta    = (runsData as any)?.meta;
  const structures: any[] = (salaryData as any)?.data ?? [];
  const salaryMeta  = (salaryData as any)?.meta;

  // Live gross preview in salary form
  const watchSalary = salaryForm.watch();
  const liveGross = (Number(watchSalary.basic) || 0) + (Number(watchSalary.da) || 0) + (Number(watchSalary.hra) || 0) + (Number(watchSalary.specialAllowance) || 0);
  const livePF    = Math.min((Number(watchSalary.basic) || 0) * 0.12, 1800);
  const liveESI   = liveGross <= 21000 ? liveGross * 0.0075 : 0;
  const livePT    = liveGross <= 7500 ? 0 : liveGross <= 10000 ? 175 : 200;
  const liveNet   = liveGross - livePF - liveESI - livePT;

  return (
    <>
      {/* ── Run Modal ── */}
      <Modal open={showRunModal} onClose={() => setShowRunModal(false)} title="Process Payroll Run">
        <form onSubmit={runForm.handleSubmit(d => runMut.mutate(d))} className="space-y-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <p className="text-xs" style={{ color: '#f59e0b' }}>This will process attendance and generate payslips for the selected period.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Month" error={runForm.formState.errors.month?.message}>
              <select {...runForm.register('month')} className="input-field w-full">
                {MONTH_FULL.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </F>
            <F label="Year" error={runForm.formState.errors.year?.message}>
              <input {...runForm.register('year')} type="number" className="input-field w-full" />
            </F>
          </div>
          <F label="Employee Type">
            <select {...runForm.register('employmentType')} className="input-field w-full">
              <option value="">All Employees</option>
              <option value="PERMANENT">Office Staff (Permanent)</option>
              <option value="CONTRACT">Site/Contract Employees</option>
              <option value="TEMPORARY">Temporary Staff</option>
            </select>
          </F>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => setShowRunModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={runMut.isPending} className="btn-primary flex items-center gap-2">
              <Play size={13} /> {runMut.isPending ? 'Processing…' : 'Run Payroll'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Salary Modal ── */}
      <Modal open={showSalaryModal} onClose={() => { setShowSalaryModal(false); setEditSalary(null); }} title={editSalary ? 'Update Salary Structure' : 'Assign Salary Structure'}>
        <form onSubmit={salaryForm.handleSubmit(d => salaryMut.mutate(d))} className="space-y-4">
          {!editSalary && (
            <F label="Employee *" error={salaryForm.formState.errors.employeeId?.message}>
              <select {...salaryForm.register('employeeId')} className="input-field w-full">
                <option value="">Select employee</option>
                {(allEmployees as any[]).map((e: any) => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>
                ))}
              </select>
            </F>
          )}
          <F label="Effective From *" error={salaryForm.formState.errors.effectiveFrom?.message}>
            <input {...salaryForm.register('effectiveFrom')} type="date" className="input-field w-full" />
          </F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Basic Salary (₹) *" error={salaryForm.formState.errors.basic?.message}>
              <input {...salaryForm.register('basic')} type="number" step="0.01" className="input-field w-full" placeholder="e.g. 15000" />
            </F>
            <F label="DA (₹)">
              <input {...salaryForm.register('da')} type="number" step="0.01" className="input-field w-full" placeholder="0" />
            </F>
            <F label="HRA (₹) — Office staff">
              <input {...salaryForm.register('hra')} type="number" step="0.01" className="input-field w-full" placeholder="0" />
            </F>
            <F label="Special Allowance (₹)">
              <input {...salaryForm.register('specialAllowance')} type="number" step="0.01" className="input-field w-full" placeholder="0" />
            </F>
          </div>

          {/* Live preview */}
          {liveGross > 0 && (
            <div className="rounded-xl p-3.5 space-y-1.5" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#818cf8' }}>Preview</p>
              {[
                { l: 'Gross Salary', v: liveGross, c: '#10b981' },
                { l: 'PF (Employee 12%)', v: -livePF, c: '#f43f5e' },
                { l: 'ESI (0.75%)', v: -liveESI, c: '#f43f5e' },
                { l: 'Professional Tax', v: -livePT, c: '#f43f5e' },
              ].map(r => (
                <div key={r.l} className="flex justify-between text-xs">
                  <span style={{ color: 'var(--wz-text-muted)' }}>{r.l}</span>
                  <span style={{ color: r.c }}>{formatCurrency(Math.abs(r.v))}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold pt-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ color: 'var(--wz-text-primary)' }}>Net Take-Home</span>
                <span style={{ color: '#10b981' }}>{formatCurrency(liveNet)}</span>
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => { setShowSalaryModal(false); setEditSalary(null); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={salaryMut.isPending} className="btn-primary flex items-center gap-2">
              <Save size={13} /> {salaryMut.isPending ? 'Saving…' : editSalary ? 'Update' : 'Assign Salary'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Page ── */}
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>Payroll Management</h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--wz-text-muted)' }}>Office staff & contract site employee payroll</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { openSalaryModal(); setTab('salary'); }} className="btn-secondary flex items-center gap-1.5 text-sm">
              <IndianRupee size={14} /> Assign Salary
            </button>
            <button onClick={() => setShowRunModal(true)} className="btn-primary flex items-center gap-1.5 text-sm">
              <Play size={14} /> Run Payroll
            </button>
          </div>
        </div>

        {/* Tab nav */}
        <div className="glass-card overflow-hidden">
          <div className="flex gap-0 px-4 overflow-x-auto">
            {TABS.map(t => {
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className="flex items-center gap-1.5 px-4 py-3.5 text-xs font-semibold transition-all relative whitespace-nowrap"
                  style={{ color: active ? '#818cf8' : 'var(--wz-text-muted)' }}>
                  <t.icon size={13} /> {t.label}
                  {active && (
                    <motion.div layoutId="payroll-tab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                      style={{ background: 'linear-gradient(90deg,#6366f1,#3b82f6)' }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── DASHBOARD ── */}
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>

            {tab === 'dashboard' && (
              <div className="space-y-5">
                {/* Stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Total Employees" value={dash?.totalEmployees ?? 0} sub={`${dash?.withSalary ?? 0} with salary`} icon={Users} color="#6366f1" />
                  <StatCard label="Office Staff" value={dash?.officeCount ?? 0} sub="Permanent" icon={Building2} color="#3b82f6" />
                  <StatCard label="Contract/Site" value={dash?.contractCount ?? 0} sub="Contract employees" icon={MapPin} color="#f59e0b" />
                  <StatCard label="Payroll Runs" value={dash?.totalRuns ?? 0} sub={`${dash?.pendingApproval ?? 0} pending approval`} icon={ClipboardList} color="#10b981" />
                </div>

                {/* Last run card */}
                {dash?.lastRun && (
                  <div className="glass-card p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--wz-text-muted)' }}>Last Payroll Run</p>
                        <h3 className="text-lg font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>
                          {MONTH_FULL[(dash.lastRun.month ?? 1) - 1]} {dash.lastRun.year}
                        </h3>
                      </div>
                      {(() => {
                        const cfg = RUN_STATUS[dash.lastRun.status] ?? RUN_STATUS.DRAFT;
                        const Icon = cfg.icon;
                        return (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.ring}` }}>
                            <Icon size={11} /> {cfg.label}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { l: 'Employees', v: String(dash.lastRun.totalEmployees ?? 0) },
                        { l: 'Gross Payable', v: formatCurrency(Number(dash.lastRun.totalGross ?? 0)) },
                        { l: 'Net Payable', v: formatCurrency(Number(dash.lastRun.totalNet ?? 0)) },
                      ].map(s => (
                        <div key={s.l} className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <p className="text-xs mb-1" style={{ color: 'var(--wz-text-muted)' }}>{s.l}</p>
                          <p className="text-base font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>{s.v}</p>
                        </div>
                      ))}
                    </div>
                    {dash.lastRun.id && (
                      <button onClick={() => router.push(`/payroll/runs/${dash.lastRun.id}`)}
                        className="mt-4 flex items-center gap-1.5 text-xs font-medium"
                        style={{ color: '#818cf8' }}>
                        <Eye size={12} /> View Details
                      </button>
                    )}
                  </div>
                )}

                {/* Recent runs */}
                {runs.length > 0 && (
                  <div className="glass-card overflow-hidden">
                    <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#6366f1' }}>Recent Runs</h3>
                      <button onClick={() => setTab('runs')} className="text-xs" style={{ color: '#818cf8' }}>View all →</button>
                    </div>
                    <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                      {runs.slice(0, 4).map((run: any) => {
                        const cfg = RUN_STATUS[run.status] ?? RUN_STATUS.DRAFT;
                        const Icon = cfg.icon;
                        return (
                          <div key={run.id} className="flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-white/[0.015] transition-colors"
                            onClick={() => router.push(`/payroll/runs/${run.id}`)}>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold" style={{ color: 'var(--wz-text-primary)' }}>{MONTH_FULL[run.month - 1]} {run.year}</p>
                              <p className="text-xs" style={{ color: 'var(--wz-text-muted)' }}>{run.totalEmployees} employees</p>
                            </div>
                            <p className="text-sm font-semibold" style={{ color: '#10b981' }}>{formatCurrency(Number(run.totalNet ?? 0))}</p>
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                              style={{ background: cfg.bg, color: cfg.color }}><Icon size={10} />{cfg.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── PAYROLL RUNS ── */}
            {tab === 'runs' && (
              <div className="glass-card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <h3 className="font-semibold text-sm" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>All Payroll Runs</h3>
                  <button onClick={() => setShowRunModal(true)} className="btn-primary flex items-center gap-1.5 text-xs"><Play size={12} /> Run Payroll</button>
                </div>
                {runsLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }} />
                  </div>
                ) : runs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24">
                    <ClipboardList size={40} className="mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                    <p className="font-medium mb-1" style={{ color: 'var(--wz-text-primary)' }}>No payroll runs yet</p>
                    <p className="text-sm mb-4" style={{ color: 'var(--wz-text-muted)' }}>Start by running payroll for the current month</p>
                    <button onClick={() => setShowRunModal(true)} className="btn-primary flex items-center gap-2"><Play size={13} /> Run Payroll</button>
                  </div>
                ) : (
                  <>
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          {['Period', 'Employees', 'Gross', 'Deductions', 'Net Payable', 'Status', ''].map(h => (
                            <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--wz-text-muted)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {runs.map((run: any) => {
                          const cfg = RUN_STATUS[run.status] ?? RUN_STATUS.DRAFT;
                          const Icon = cfg.icon;
                          return (
                            <tr key={run.id} className="hover:bg-white/[0.015] cursor-pointer transition-colors"
                              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                              onClick={() => router.push(`/payroll/runs/${run.id}`)}>
                              <td className="px-5 py-4">
                                <p className="text-sm font-semibold" style={{ color: 'var(--wz-text-primary)' }}>{MONTH_FULL[run.month - 1]} {run.year}</p>
                                <p className="text-xs" style={{ color: 'var(--wz-text-muted)' }}>{formatDate(run.periodStart)} – {formatDate(run.periodEnd)}</p>
                              </td>
                              <td className="px-5 py-4 text-sm text-center" style={{ color: 'var(--wz-text-secondary)' }}>{run.totalEmployees}</td>
                              <td className="px-5 py-4 text-sm font-medium" style={{ color: 'var(--wz-text-primary)' }}>{formatCurrency(Number(run.totalGross ?? 0))}</td>
                              <td className="px-5 py-4 text-sm" style={{ color: '#f43f5e' }}>{formatCurrency(Number(run.totalDeductions ?? 0))}</td>
                              <td className="px-5 py-4 text-sm font-bold" style={{ color: '#10b981' }}>{formatCurrency(Number(run.totalNet ?? 0))}</td>
                              <td className="px-5 py-4">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                                  style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.ring}` }}>
                                  <Icon size={11} /> {cfg.label}
                                </span>
                              </td>
                              <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                                <div className="flex gap-1">
                                  {run.status === 'PENDING_APPROVAL' && (
                                    <button onClick={() => approveMut.mutate(run.id)} disabled={approveMut.isPending}
                                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                                      style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                                      <ThumbsUp size={11} /> Approve
                                    </button>
                                  )}
                                  {run.status === 'APPROVED' && (
                                    <button onClick={() => { if (confirm('Disburse payroll?')) disburseMut.mutate(run.id); }} disabled={disburseMut.isPending}
                                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                                      style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
                                      <CreditCard size={11} /> Disburse
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {runsMeta && runsMeta.totalPages > 1 && (
                      <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <p className="text-xs" style={{ color: 'var(--wz-text-muted)' }}>{runsMeta.total} runs</p>
                        <div className="flex gap-1 items-center">
                          <button disabled={runsPage === 1} onClick={() => setRunsPage(p => p - 1)} className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30">
                            <ChevronLeft size={15} style={{ color: 'var(--wz-text-muted)' }} />
                          </button>
                          <span className="text-xs px-2" style={{ color: 'var(--wz-text-muted)' }}>{runsPage}/{runsMeta.totalPages}</span>
                          <button disabled={runsPage === runsMeta.totalPages} onClick={() => setRunsPage(p => p + 1)} className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30">
                            <ChevronRight size={15} style={{ color: 'var(--wz-text-muted)' }} />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── SALARY SETUP ── */}
            {tab === 'salary' && (
              <div className="space-y-4">
                {/* Filter bar */}
                <div className="glass-card p-4 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 min-w-[200px]"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <Search size={13} style={{ color: 'var(--wz-text-muted)' }} />
                    <input value={salarySearch} onChange={e => { setSalarySearch(e.target.value); setSalaryPage(1); }}
                      className="bg-transparent text-sm outline-none flex-1" style={{ color: 'var(--wz-text-primary)' }}
                      placeholder="Search employee..." />
                  </div>
                  <select value={salaryTypeFilter} onChange={e => { setSalaryTypeFilter(e.target.value); setSalaryPage(1); }}
                    className="input-field text-sm">
                    <option value="">All Types</option>
                    <option value="PERMANENT">Office Staff</option>
                    <option value="CONTRACT">Contract/Site</option>
                    <option value="TEMPORARY">Temporary</option>
                  </select>
                  <button onClick={() => openSalaryModal()} className="btn-primary flex items-center gap-1.5 text-sm">
                    <Plus size={14} /> Assign Salary
                  </button>
                </div>

                <div className="glass-card overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        {['Employee', 'Type', 'Basic', 'DA', 'HRA', 'Special', 'Gross', 'Net (Est.)', 'From', ''].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--wz-text-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {salaryLoading && [...Array(5)].map((_, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          {[...Array(10)].map((_, j) => (
                            <td key={j} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} /></td>
                          ))}
                        </tr>
                      ))}
                      {!salaryLoading && structures.map((s: any) => {
                        const emp = s.employee;
                        const gross = Number(s.grossSalary);
                        const pf = Math.min(Number(s.basic) * 0.12, 1800);
                        const esi = gross <= 21000 ? gross * 0.0075 : 0;
                        const pt = gross <= 7500 ? 0 : gross <= 10000 ? 175 : 200;
                        const net = gross - pf - esi - pt;
                        const typeInfo = EMP_TYPE_CFG[emp?.employmentType] ?? EMP_TYPE_CFG.PERMANENT;
                        const TypeIcon = typeInfo.icon;
                        return (
                          <tr key={s.id} className="hover:bg-white/[0.015] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                                  style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>
                                  {getInitials(emp?.firstName, emp?.lastName)}
                                </div>
                                <div>
                                  <p className="text-sm font-medium" style={{ color: 'var(--wz-text-primary)' }}>{emp?.firstName} {emp?.lastName}</p>
                                  <p className="text-xs font-mono" style={{ color: 'var(--wz-text-muted)' }}>{emp?.employeeCode}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit"
                                style={{ background: typeInfo.bg, color: typeInfo.color }}>
                                <TypeIcon size={9} />{typeInfo.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm" style={{ color: 'var(--wz-text-secondary)' }}>{formatCurrency(Number(s.basic))}</td>
                            <td className="px-4 py-3 text-sm" style={{ color: 'var(--wz-text-muted)' }}>{formatCurrency(Number(s.da))}</td>
                            <td className="px-4 py-3 text-sm" style={{ color: 'var(--wz-text-muted)' }}>{formatCurrency(Number(s.hra))}</td>
                            <td className="px-4 py-3 text-sm" style={{ color: 'var(--wz-text-muted)' }}>{formatCurrency(Number(s.specialAllowance))}</td>
                            <td className="px-4 py-3 text-sm font-semibold" style={{ color: 'var(--wz-text-primary)' }}>{formatCurrency(gross)}</td>
                            <td className="px-4 py-3 text-sm font-bold" style={{ color: '#10b981' }}>{formatCurrency(net)}</td>
                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--wz-text-muted)' }}>{formatDate(s.effectiveFrom)}</td>
                            <td className="px-4 py-3">
                              <button onClick={() => openSalaryModal(s)} className="p-1.5 rounded-lg hover:bg-white/5">
                                <Pencil size={12} style={{ color: '#818cf8' }} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {!salaryLoading && structures.length === 0 && (
                        <tr><td colSpan={10} className="px-4 py-20 text-center">
                          <IndianRupee size={40} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                          <p className="font-medium mb-1" style={{ color: 'var(--wz-text-primary)' }}>No salary structures yet</p>
                          <p className="text-sm mb-4" style={{ color: 'var(--wz-text-muted)' }}>Assign salary to employees before running payroll</p>
                          <button onClick={() => openSalaryModal()} className="btn-primary flex items-center gap-2 mx-auto"><Plus size={13} /> Assign Salary</button>
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                  {salaryMeta && salaryMeta.totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <p className="text-xs" style={{ color: 'var(--wz-text-muted)' }}>{salaryMeta.total} records</p>
                      <div className="flex gap-1 items-center">
                        <button disabled={salaryPage === 1} onClick={() => setSalaryPage(p => p - 1)} className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30"><ChevronLeft size={15} style={{ color: 'var(--wz-text-muted)' }} /></button>
                        <span className="text-xs px-2" style={{ color: 'var(--wz-text-muted)' }}>{salaryPage}/{salaryMeta.totalPages}</span>
                        <button disabled={salaryPage === salaryMeta.totalPages} onClick={() => setSalaryPage(p => p + 1)} className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30"><ChevronRight size={15} style={{ color: 'var(--wz-text-muted)' }} /></button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
