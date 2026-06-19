'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, FileSpreadsheet, CheckCircle2, Clock, Send,
  ChevronLeft, ChevronRight, Layers, Receipt, AlertCircle,
  ChevronDown, Eye, Loader2, BadgeIndianRupee, BarChart3,
  ArrowRight, BookOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';
import { billingSheetApi } from '@/lib/api';

// ─── Types ─────────────────────────────────────────────────────────
interface BillingSheetLine {
  id: string;
  employeeName: string;
  days: number;
  halfDays: number;
  dailyRate: number;
  amount: number;
}

interface BillingSheet {
  id: string;
  sheetNo: string;
  month: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'POSTED';
  totalAmount: number;
  tenderId: string;
  clientId: string;
  client?: { name: string };
  tender?: { tenderName: string };
  lines?: BillingSheetLine[];
  _count?: { lines: number };
  createdAt: string;
  invoiceNo?: string;
}

// ─── Schemas ───────────────────────────────────────────────────────
const createSchema = z.object({
  tenderId: z.string().min(1, 'Tender ID is required'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Format must be YYYY-MM'),
});

// ─── Status config ─────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; label: string; icon: React.ElementType }> = {
  DRAFT:     { color: 'rgba(255,255,255,0.55)', bg: 'rgba(255,255,255,0.05)',  border: 'rgba(255,255,255,0.10)', label: 'Draft',     icon: Clock },
  SUBMITTED: { color: '#60a5fa',                bg: 'rgba(59,130,246,0.10)',   border: 'rgba(59,130,246,0.20)',  label: 'Submitted', icon: Send },
  APPROVED:  { color: '#34d399',                bg: 'rgba(52,211,153,0.10)',   border: 'rgba(52,211,153,0.20)',  label: 'Approved',  icon: CheckCircle2 },
  REJECTED:  { color: '#f87171',                bg: 'rgba(248,113,113,0.10)',  border: 'rgba(248,113,113,0.20)', label: 'Rejected',  icon: AlertCircle },
  POSTED:    { color: '#a78bfa',                bg: 'rgba(167,139,250,0.10)',  border: 'rgba(167,139,250,0.20)', label: 'Posted',    icon: BookOpen },
};

const STATUS_TABS = ['ALL', 'DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED'] as const;
type StatusTab = typeof STATUS_TABS[number];

// ─── Helpers ──────────────────────────────────────────────────────
function fmtMonth(m: string) {
  if (!m) return '—';
  const [y, mo] = m.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(mo, 10) - 1] ?? mo} ${y}`;
}

// ─── Status Badge ─────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

// ─── Modal Shell ──────────────────────────────────────────────────
function Modal({
  open, onClose, title, children, wide,
}: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18 }}
        className={`w-full ${wide ? 'max-w-3xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto rounded-2xl`}
        style={{ background: 'var(--wz-card-bg)', border: '1px solid var(--wz-card-border)' }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
          style={{ background: 'var(--wz-card-bg)', borderBottom: '1px solid var(--wz-card-border)' }}
        >
          <h3 className="font-semibold text-base" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/[0.06]"
          >
            <X size={16} style={{ color: 'var(--wz-text-muted)' }} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────
function F({
  label, error, children, hint,
}: {
  label: string; error?: string; children: React.ReactNode; hint?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>{label}</label>
      {children}
      {hint && !error && <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{hint}</p>}
      {error && <p className="text-xs mt-1.5" style={{ color: '#f87171' }}>{error}</p>}
    </div>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────
function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div
            className="h-4 rounded-lg animate-pulse"
            style={{ background: 'rgba(255,255,255,0.05)', width: i === 0 ? '80px' : i === cols - 1 ? '60px' : '100%' }}
          />
        </td>
      ))}
    </tr>
  );
}

// ─── Lines Detail Drawer ──────────────────────────────────────────
function SheetDetailDrawer({
  sheet,
  onClose,
}: {
  sheet: BillingSheet | null;
  onClose: () => void;
}) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['billing-sheet-detail', sheet?.id],
    queryFn: () => billingSheetApi.get(sheet!.id),
    enabled: !!sheet?.id,
  });

  const lines: BillingSheetLine[] = (detail as any)?.lines ?? [];
  const totalDays = lines.reduce((s, l) => s + (l.days ?? 0), 0);
  const totalHalf = lines.reduce((s, l) => s + (l.halfDays ?? 0), 0);
  const totalAmt = lines.reduce((s, l) => s + Number(l.amount ?? 0), 0);

  return (
    <AnimatePresence>
      {sheet && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}
            onClick={onClose}
          />
          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="fixed top-0 right-0 h-full z-50 overflow-y-auto"
            style={{
              width: '620px',
              maxWidth: '95vw',
              background: '#0a1220',
              borderLeft: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {/* Header */}
            <div
              className="sticky top-0 z-10 flex items-start justify-between px-6 py-5"
              style={{ background: '#0a1220', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <p className="font-mono text-sm font-bold" style={{ color: '#818cf8' }}>
                    {sheet.sheetNo}
                  </p>
                  <StatusBadge status={sheet.status} />
                </div>
                <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                  {sheet.client?.name ?? 'Billing Sheet'}
                </h2>
                <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {sheet.tender?.tenderName ?? sheet.tenderId} &middot; {fmtMonth(sheet.month)}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl transition-colors hover:bg-white/[0.06] mt-1"
              >
                <X size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Summary strip */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Days', value: totalDays, color: '#60a5fa' },
                  { label: 'Half Days', value: totalHalf, color: '#f59e0b' },
                  { label: 'Total Amount', value: formatCurrency(totalAmt), color: '#34d399' },
                ].map(s => (
                  <div
                    key={s.label}
                    className="rounded-xl p-3.5"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</p>
                    <p className="text-base font-bold" style={{ color: s.color, fontFamily: 'Plus Jakarta Sans' }}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Lines table */}
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Employee', 'Days', 'Half Days', 'Rate / Day', 'Amount'].map(h => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                          style={{ color: 'rgba(255,255,255,0.3)' }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={5} />)}
                    {!isLoading && lines.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-14 text-center">
                          <Layers size={32} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No billing lines found</p>
                        </td>
                      </tr>
                    )}
                    {!isLoading && lines.map((line, idx) => (
                      <motion.tr
                        key={line.id}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="hover:bg-white/[0.015] transition-colors"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-white">{line.employeeName}</p>
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: '#60a5fa' }}>
                          {line.days ?? 0}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: '#f59e0b' }}>
                          {line.halfDays ?? 0}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {formatCurrency(Number(line.dailyRate ?? 0))}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold" style={{ color: '#34d399' }}>
                          {formatCurrency(Number(line.amount ?? 0))}
                        </td>
                      </motion.tr>
                    ))}
                    {/* Total row */}
                    {!isLoading && lines.length > 0 && (
                      <tr style={{ background: 'rgba(99,102,241,0.06)', borderTop: '1px solid rgba(99,102,241,0.15)' }}>
                        <td className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          Total
                        </td>
                        <td className="px-4 py-3 text-sm font-bold" style={{ color: '#60a5fa' }}>{totalDays}</td>
                        <td className="px-4 py-3 text-sm font-bold" style={{ color: '#f59e0b' }}>{totalHalf}</td>
                        <td />
                        <td className="px-4 py-3 text-sm font-bold" style={{ color: '#34d399' }}>
                          {formatCurrency(totalAmt)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Row Actions ──────────────────────────────────────────────────
function RowActions({
  sheet,
  onRefresh,
}: {
  sheet: BillingSheet;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);

  const submitMut = useMutation({
    mutationFn: () => billingSheetApi.submit(sheet.id),
    onSuccess: () => { toast.success('Sheet submitted for approval'); onRefresh(); setOpen(false); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to submit sheet'),
  });

  const approveMut = useMutation({
    mutationFn: () => billingSheetApi.approve(sheet.id),
    onSuccess: () => { toast.success('Sheet approved'); onRefresh(); setOpen(false); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to approve sheet'),
  });

  const postMut = useMutation({
    mutationFn: () => billingSheetApi.post(sheet.id),
    onSuccess: (res: any) => {
      const invoiceNo = res?.invoiceNo ?? res?.invoice?.invoiceNo ?? 'Generated';
      toast.success(`Invoice ${invoiceNo} created successfully`, { duration: 5000 });
      onRefresh();
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to post sheet'),
  });

  const isPending = submitMut.isPending || approveMut.isPending || postMut.isPending;

  const actions: { label: string; fn: () => void; color: string; bg: string; icon: React.ElementType }[] = [];

  if (sheet.status === 'DRAFT') {
    actions.push({
      label: 'Submit for Approval',
      fn: () => submitMut.mutate(),
      color: '#60a5fa',
      bg: 'rgba(59,130,246,0.12)',
      icon: Send,
    });
  }
  if (sheet.status === 'SUBMITTED') {
    actions.push({
      label: 'Approve',
      fn: () => approveMut.mutate(),
      color: '#34d399',
      bg: 'rgba(52,211,153,0.12)',
      icon: CheckCircle2,
    });
    actions.push({
      label: 'Reject',
      fn: () => { toast.info('Rejection flow not yet implemented'); setOpen(false); },
      color: '#f87171',
      bg: 'rgba(248,113,113,0.08)',
      icon: AlertCircle,
    });
  }
  if (sheet.status === 'APPROVED') {
    actions.push({
      label: 'Post & Generate Invoice',
      fn: () => postMut.mutate(),
      color: '#a78bfa',
      bg: 'rgba(167,139,250,0.12)',
      icon: Receipt,
    });
  }

  if (actions.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}
        disabled={isPending}
      >
        {isPending ? <Loader2 size={12} className="animate-spin" /> : 'Actions'}
        <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 mt-1.5 z-20 rounded-xl overflow-hidden min-w-[200px]"
            style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
          >
            {actions.map(a => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  onClick={a.fn}
                  disabled={isPending}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left transition-colors hover:bg-white/[0.04] disabled:opacity-50"
                  style={{ color: a.color, borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <span className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ background: a.bg }}>
                    <Icon size={12} />
                  </span>
                  {a.label}
                  <ArrowRight size={12} className="ml-auto opacity-40" />
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Create Sheet Dialog ──────────────────────────────────────────
function CreateSheetDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: { tenderId: '', month: '' },
  });

  const createMut = useMutation({
    mutationFn: (d: z.infer<typeof createSchema>) =>
      billingSheetApi.create({ tenderId: d.tenderId, month: d.month }),
    onSuccess: () => {
      toast.success('Billing sheet generated successfully');
      reset();
      onCreated();
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to generate billing sheet'),
  });

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="Generate Billing Sheet"
    >
      <form onSubmit={handleSubmit(d => createMut.mutate(d))} className="space-y-5">
        {/* Info banner */}
        <div
          className="flex items-start gap-3 rounded-xl p-3.5"
          style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}
        >
          <BarChart3 size={16} style={{ color: '#818cf8', marginTop: '2px', flexShrink: 0 }} />
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            A billing sheet will be auto-generated from attendance records for all deployed employees
            under the selected tender for the given month.
          </p>
        </div>

        <F
          label="Tender ID *"
          error={errors.tenderId?.message}
          hint="Enter the UUID of the tender to generate sheet for"
        >
          <input
            {...register('tenderId')}
            className="input-field w-full"
            placeholder="e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
          />
        </F>

        <F
          label="Month *"
          error={errors.month?.message}
          hint="Format: YYYY-MM (e.g. 2026-06)"
        >
          <input
            {...register('month')}
            type="month"
            className="input-field w-full"
            placeholder="2026-06"
          />
        </F>

        <div className="flex gap-2.5 pt-1">
          <button
            type="submit"
            disabled={createMut.isPending}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {createMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
            {createMut.isPending ? 'Generating...' : 'Generate Sheet'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => { reset(); onClose(); }}
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
export default function BillingSheetsPage() {
  const [activeTab, setActiveTab] = useState<StatusTab>('ALL');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<BillingSheet | null>(null);
  const qc = useQueryClient();

  const statusParam = activeTab === 'ALL' ? undefined : activeTab;

  const { data, isLoading } = useQuery({
    queryKey: ['billing-sheets', page, activeTab],
    queryFn: () =>
      billingSheetApi.list({
        page: String(page),
        limit: '15',
        ...(statusParam ? { status: statusParam } : {}),
      }),
  });

  const sheets: BillingSheet[] = (data as any)?.data ?? [];
  const meta = (data as any)?.meta;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['billing-sheets'] });
  };

  const tabCounts: Partial<Record<StatusTab, number>> = {};
  // Show count for active tab from meta if available
  if (meta?.total !== undefined) tabCounts[activeTab] = meta.total;

  return (
    <div className="space-y-6">
      {/* Create Dialog */}
      <CreateSheetDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={refresh}
      />

      {/* Detail Drawer */}
      <SheetDetailDrawer
        sheet={selectedSheet}
        onClose={() => setSelectedSheet(null)}
      />

      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: 'Plus Jakarta Sans' }}
          >
            Billing Sheets
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Generate, review, and post billing sheets to create invoices
          </p>
        </div>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => setShowCreate(true)}
        >
          <Plus size={15} />
          Generate Sheet
        </button>
      </motion.div>

      {/* Status Tabs */}
      <div
        className="flex items-center gap-1 p-1 rounded-xl w-fit"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        {STATUS_TABS.map(tab => {
          const isActive = activeTab === tab;
          const cfg = tab === 'ALL' ? null : STATUS_CONFIG[tab];
          return (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setPage(1); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                background: isActive
                  ? cfg
                    ? cfg.bg
                    : 'rgba(99,102,241,0.15)'
                  : 'transparent',
                color: isActive
                  ? cfg ? cfg.color : '#818cf8'
                  : 'rgba(255,255,255,0.45)',
                border: isActive
                  ? `1px solid ${cfg ? cfg.border : 'rgba(99,102,241,0.3)'}`
                  : '1px solid transparent',
              }}
            >
              {cfg && <cfg.icon size={13} />}
              {tab === 'ALL' ? 'All' : cfg!.label}
              {isActive && meta?.total !== undefined && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-md font-semibold"
                  style={{
                    background: cfg ? `${cfg.color}22` : 'rgba(99,102,241,0.2)',
                    color: cfg ? cfg.color : '#818cf8',
                  }}
                >
                  {meta.total}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="glass-card overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                {['Sheet No', 'Month', 'Client / Tender', 'Total Amount', 'Lines', 'Status', 'Created', 'Actions'].map(h => (
                  <th
                    key={h}
                    className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={8} />)}

              {!isLoading && sheets.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-20 text-center">
                    <FileSpreadsheet
                      size={44}
                      className="mx-auto mb-4"
                      style={{ color: 'rgba(255,255,255,0.08)' }}
                    />
                    <p className="font-semibold text-white mb-1" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                      No billing sheets found
                    </p>
                    <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {activeTab !== 'ALL'
                        ? `No sheets with status "${STATUS_CONFIG[activeTab]?.label ?? activeTab}" yet`
                        : 'Generate your first billing sheet from attendance data'}
                    </p>
                    {activeTab === 'ALL' && (
                      <button
                        className="btn-primary inline-flex items-center gap-2 mx-auto"
                        onClick={() => setShowCreate(true)}
                      >
                        <Plus size={14} />
                        Generate Sheet
                      </button>
                    )}
                  </td>
                </tr>
              )}

              {!isLoading &&
                sheets.map((sheet, idx) => {
                  const linesCount = sheet._count?.lines ?? sheet.lines?.length ?? 0;
                  return (
                    <motion.tr
                      key={sheet.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.035 }}
                      className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.035)' }}
                      onClick={() => setSelectedSheet(sheet)}
                    >
                      {/* Sheet No */}
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-mono font-semibold" style={{ color: '#818cf8' }}>
                          {sheet.sheetNo}
                        </p>
                      </td>

                      {/* Month */}
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium text-white">
                          {fmtMonth(sheet.month)}
                        </p>
                      </td>

                      {/* Client / Tender */}
                      <td className="px-4 py-3.5" style={{ maxWidth: '200px' }}>
                        <p className="text-sm font-medium text-white truncate">
                          {sheet.client?.name ?? '—'}
                        </p>
                        {sheet.tender?.tenderName && (
                          <p
                            className="text-xs mt-0.5 truncate"
                            style={{ color: 'rgba(255,255,255,0.4)' }}
                          >
                            {sheet.tender.tenderName}
                          </p>
                        )}
                      </td>

                      {/* Total Amount */}
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-semibold" style={{ color: '#34d399' }}>
                          {formatCurrency(Number(sheet.totalAmount ?? 0))}
                        </p>
                      </td>

                      {/* Lines count */}
                      <td className="px-4 py-3.5">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)' }}
                        >
                          <Layers size={11} />
                          {linesCount}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <StatusBadge status={sheet.status} />
                      </td>

                      {/* Created date */}
                      <td className="px-4 py-3.5">
                        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {formatDate(sheet.createdAt)}
                        </p>
                      </td>

                      {/* Actions */}
                      <td
                        className="px-4 py-3.5"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedSheet(sheet)}
                            className="p-1.5 rounded-lg transition-colors hover:bg-white/[0.06]"
                            title="View detail"
                          >
                            <Eye size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
                          </button>
                          <RowActions sheet={sheet} onRefresh={refresh} />
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div
            className="flex items-center justify-between px-5 py-3.5"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {meta.total} total sheet{meta.total !== 1 ? 's' : ''}
              <span style={{ color: 'rgba(255,255,255,0.2)' }}> &middot; page {page} of {meta.totalPages}</span>
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/[0.06] disabled:opacity-30"
              >
                <ChevronLeft size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
              {Array.from({ length: Math.min(meta.totalPages, 5) }).map((_, i) => {
                const pg = i + 1;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className="w-7 h-7 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: page === pg ? 'rgba(99,102,241,0.2)' : 'transparent',
                      color: page === pg ? '#818cf8' : 'rgba(255,255,255,0.4)',
                    }}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                disabled={page === meta.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/[0.06] disabled:opacity-30"
              >
                <ChevronRight size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
