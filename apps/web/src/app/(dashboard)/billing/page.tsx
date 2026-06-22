'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DUMMY_BILLING_DASH, DUMMY_INVOICES_DATA, DUMMY_BILLING_AGING, DUMMY_BILLING_DSO } from '@/lib/dummy-data';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, Save, Receipt, TrendingUp, AlertCircle, CheckCircle2,
  ChevronLeft, ChevronRight, DollarSign, Clock, FileText, Filter,
  MoreHorizontal, Send, CreditCard, FileX, Eye, Activity, Search,
  CheckSquare, Square, Minus
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';
import { billingApi, clientsApi, tendersApi } from '@/lib/api';

// ─── Schemas ────────────────────────────────────────────────────────
const invoiceSchema = z.object({
  clientId: z.string().min(1, 'Select a client'),
  tenderId: z.string().optional(),
  issueDate: z.string().min(1, 'Issue date required'),
  dueDate: z.string().min(1, 'Due date required'),
  subtotal: z.coerce.number().min(1, 'Amount required'),
  gstRate: z.coerce.number().default(18),
  notes: z.string().optional(),
});

const paymentSchema = z.object({
  amount: z.coerce.number().min(1, 'Amount required'),
  paymentDate: z.string().min(1, 'Payment date required'),
  paymentMethod: z.string().min(1, 'Payment method required'),
  referenceNo: z.string().optional(),
  notes: z.string().optional(),
});

const creditNoteSchema = z.object({
  description: z.string().min(1, 'Description required'),
  amount: z.coerce.number().min(1, 'Amount required'),
  notes: z.string().optional(),
});

// ─── Status config ───────────────────────────────────────────────────
const INVOICE_STATUS: Record<string, { color: string; bg: string; label: string; strikethrough?: boolean }> = {
  DRAFT:          { color: 'rgba(255,255,255,0.45)', bg: 'rgba(255,255,255,0.06)', label: 'Draft' },
  SENT:           { color: '#818cf8', bg: 'rgba(99,102,241,0.12)', label: 'Sent' },
  PARTIALLY_PAID: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Partial' },
  PARTIAL:        { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Partial' },
  PAID:           { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Paid' },
  OVERDUE:        { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)', label: 'Overdue' },
  CANCELLED:      { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', label: 'Cancelled', strikethrough: true },
};

// ─── Modal ───────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto rounded-2xl`}
        style={{ background: 'var(--wz-card-bg)', border: '1px solid var(--wz-card-border)' }}>
        <div className="flex items-center justify-between p-5 sticky top-0 z-10"
          style={{ background: 'var(--wz-card-bg)', borderBottom: '1px solid var(--wz-card-border)' }}>
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

const F = ({ label, error, children, span2 }: {
  label: string; error?: string; children: React.ReactNode; span2?: boolean;
}) => (
  <div className={span2 ? 'col-span-2' : ''}>
    <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>{label}</label>
    {children}
    {error && <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>{error}</p>}
  </div>
);

// ─── Skeleton row ────────────────────────────────────────────────────
const SkeletonRow = ({ cols }: { cols: number }) => (
  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
    {[...Array(cols)].map((_, j) => (
      <td key={j} className="px-4 py-3">
        <div className="h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)', width: j === 0 ? '60%' : '80%' }} />
      </td>
    ))}
  </tr>
);

// ─── Aging bar ────────────────────────────────────────────────────────
function AgingBar({ buckets }: { buckets: { current: number; days30: number; days60: number; days90: number; over90: number } }) {
  const total = (buckets.current + buckets.days30 + buckets.days60 + buckets.days90 + buckets.over90) || 1;
  const segments = [
    { label: 'Current', value: buckets.current, color: '#10b981' },
    { label: '1–30d', value: buckets.days30, color: '#6366f1' },
    { label: '31–60d', value: buckets.days60, color: '#f59e0b' },
    { label: '61–90d', value: buckets.days90, color: '#f97316' },
    { label: '90+ d', value: buckets.over90, color: '#f43f5e' },
  ];
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>Aging Analysis</h3>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Total outstanding {formatCurrency(total)}</span>
      </div>
      {/* Bar */}
      <div className="flex h-3 rounded-full overflow-hidden gap-px">
        {segments.map(s => (
          <div key={s.label} style={{ width: `${(s.value / total) * 100}%`, background: s.color, minWidth: s.value > 0 ? 4 : 0 }} />
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{s.label}</span>
            <span className="text-xs font-semibold text-white">{formatCurrency(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DSO Card ────────────────────────────────────────────────────────
function DSOCard({ dso, arTotal }: { dso: number; arTotal: number }) {
  const color = dso < 30 ? '#10b981' : dso < 60 ? '#f59e0b' : '#f43f5e';
  const label = dso < 30 ? 'Healthy' : dso < 60 ? 'Watch' : 'Critical';
  const pct = Math.min((dso / 90) * 100, 100);
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Days Sales Outstanding</p>
        <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: `${color}18`, color }}>{label}</span>
      </div>
      <p className="text-3xl font-bold mb-1" style={{ color, fontFamily: 'Plus Jakarta Sans' }}>{dso.toFixed(1)}<span className="text-base font-normal ml-1" style={{ color: 'rgba(255,255,255,0.35)' }}>days</span></p>
      <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>AR Total: {formatCurrency(arTotal)}</p>
    </div>
  );
}

// ─── Per-row actions dropdown ──────────────────────────────────────────
function InvoiceActions({ inv, onPayment, onCreditNote }: {
  inv: any;
  onPayment: (id: string) => void;
  onCreditNote: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const canPay = !['PAID', 'CANCELLED'].includes(inv.status);
  const canCredit = !['DRAFT', 'CANCELLED'].includes(inv.status);

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
        style={{ color: 'rgba(255,255,255,0.4)' }}>
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-40 w-44 rounded-xl overflow-hidden py-1"
            style={{ background: '#0f1b2e', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            {[
              { icon: Eye, label: 'View Invoice', action: () => { setOpen(false); }, always: true },
              { icon: Send, label: 'Send Invoice', action: () => { setOpen(false); }, always: !['PAID', 'CANCELLED'].includes(inv.status) },
              { icon: CreditCard, label: 'Record Payment', action: () => { onPayment(inv.id); setOpen(false); }, always: canPay },
              { icon: Minus, label: 'Credit Note', action: () => { onCreditNote(inv.id); setOpen(false); }, always: canCredit },
              { icon: FileText, label: 'Debit Note', action: () => { setOpen(false); }, always: canCredit },
              { icon: FileX, label: 'Cancel Invoice', action: () => { setOpen(false); }, always: !['PAID', 'CANCELLED'].includes(inv.status) },
            ].filter(a => a.always).map(item => (
              <button key={item.label} onClick={item.action}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                style={{ color: item.label.includes('Cancel') ? '#f43f5e' : 'rgba(255,255,255,0.65)' }}>
                <item.icon size={13} />
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────
export default function BillingPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'dashboard' | 'invoices' | 'quotations'>('dashboard');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null);
  const [creditNoteInvoiceId, setCreditNoteInvoiceId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const qc = useQueryClient();
  const now = new Date();

  // ── Queries ──────────────────────────────────────────────────────
  const { data: dash } = useQuery({ queryKey: ['billing-dash'], queryFn: billingApi.dashboard, placeholderData: DUMMY_BILLING_DASH });

  const { data: agingData, isLoading: agingLoading } = useQuery({
    queryKey: ['billing-aging'],
    queryFn: billingApi.getAgingAnalysis,
    enabled: tab === 'dashboard',
    staleTime: 5 * 60 * 1000,
    placeholderData: DUMMY_BILLING_AGING,
  });

  const { data: dsoData, isLoading: dsoLoading } = useQuery({
    queryKey: ['billing-dso'],
    queryFn: billingApi.getDso,
    enabled: tab === 'dashboard',
    staleTime: 5 * 60 * 1000,
    placeholderData: DUMMY_BILLING_DSO,
  });

  const { data: invoicesData, isLoading: loadInvoices } = useQuery({
    queryKey: ['invoices', page, statusFilter, clientSearch, dateFrom, dateTo],
    queryFn: () => billingApi.invoices({
      page, limit: 15,
      status: statusFilter || undefined,
      clientSearch: clientSearch || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    enabled: tab === 'invoices',
    placeholderData: DUMMY_INVOICES_DATA,
  });

  const { data: clientsList = [] } = useQuery({
    queryKey: ['clients-select-all'],
    queryFn: clientsApi.selectAll,
    enabled: showInvoiceModal,
  });

  const { data: tendersList = [] } = useQuery({
    queryKey: ['tenders-select-all'],
    queryFn: tendersApi.selectAll,
    enabled: showInvoiceModal,
  });

  const invoices: any[] = (invoicesData as any)?.data?.length ? (invoicesData as any).data : DUMMY_INVOICES_DATA.data;
  const invoicesMeta = (invoicesData as any)?.meta;

  // ── Forms ────────────────────────────────────────────────────────
  const invoiceForm = useForm<z.infer<typeof invoiceSchema>>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      clientId: '', tenderId: '',
      issueDate: now.toISOString().split('T')[0],
      dueDate: new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0],
      subtotal: 0, gstRate: 18, notes: '',
    },
  });
  const paymentForm = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: 0, paymentDate: now.toISOString().split('T')[0], paymentMethod: 'NEFT', referenceNo: '', notes: '' },
  });
  const creditNoteForm = useForm<z.infer<typeof creditNoteSchema>>({
    resolver: zodResolver(creditNoteSchema),
    defaultValues: { description: '', amount: 0, notes: '' },
  });

  const subtotal = invoiceForm.watch('subtotal') || 0;
  const gstRate = invoiceForm.watch('gstRate') || 18;
  const gstAmount = (Number(subtotal) * Number(gstRate)) / 100;
  const totalAmount = Number(subtotal) + gstAmount;

  // ── Mutations ────────────────────────────────────────────────────
  const createInvoiceMut = useMutation({
    mutationFn: (data: any) => {
      const gst = (Number(data.subtotal) * Number(data.gstRate)) / 100;
      const halfGst = gst / 2;
      return billingApi.create({
        clientId: data.clientId, tenderId: data.tenderId || undefined,
        issueDate: data.issueDate, dueDate: data.dueDate, notes: data.notes,
        subtotal: Number(data.subtotal), discount: 0, taxableAmount: Number(data.subtotal),
        cgstAmount: halfGst, sgstAmount: halfGst, igstAmount: 0,
        totalAmount: Number(data.subtotal) + gst, paidAmount: 0,
        balanceAmount: Number(data.subtotal) + gst, status: 'DRAFT',
      });
    },
    onSuccess: () => {
      toast.success('Invoice created successfully');
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['billing-dash'] });
      qc.invalidateQueries({ queryKey: ['billing-aging'] });
      qc.invalidateQueries({ queryKey: ['billing-dso'] });
      setShowInvoiceModal(false);
      invoiceForm.reset({ clientId: '', tenderId: '', issueDate: now.toISOString().split('T')[0], dueDate: new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0], subtotal: 0, gstRate: 18, notes: '' });
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed to create invoice'),
  });

  const paymentMut = useMutation({
    mutationFn: (data: any) => billingApi.payment(paymentInvoiceId!, data),
    onSuccess: () => {
      toast.success('Payment recorded successfully');
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['billing-dash'] });
      qc.invalidateQueries({ queryKey: ['billing-dso'] });
      setPaymentInvoiceId(null);
      paymentForm.reset({ amount: 0, paymentDate: now.toISOString().split('T')[0], paymentMethod: 'NEFT', referenceNo: '', notes: '' });
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed to record payment'),
  });

  const creditNoteMut = useMutation({
    mutationFn: (data: z.infer<typeof creditNoteSchema>) =>
      billingApi.createCreditNote(creditNoteInvoiceId!, data as { description: string; amount: number; notes?: string }),
    onSuccess: () => {
      toast.success('Credit note created');
      qc.invalidateQueries({ queryKey: ['invoices'] });
      setCreditNoteInvoiceId(null);
      creditNoteForm.reset({ description: '', amount: 0, notes: '' });
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed to create credit note'),
  });

  const bulkStatusMut = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: string }) =>
      billingApi.bulkStatusUpdate(ids, status),
    onSuccess: (_, vars) => {
      toast.success(`${vars.ids.length} invoice(s) updated`);
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['billing-dash'] });
      setSelectedIds(new Set());
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Bulk update failed'),
  });

  // ── Selection helpers ────────────────────────────────────────────
  const allSelected = invoices.length > 0 && invoices.every((inv: any) => selectedIds.has(inv.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(invoices.map((inv: any) => inv.id)));
  };
  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Dashboard summary cards ──────────────────────────────────────
  const summaryCards = [
    { label: 'Total Invoiced', value: formatCurrency(Number(dash?.totalRevenue ?? 0)), color: '#6366f1', icon: TrendingUp },
    { label: 'Total Collected', value: formatCurrency(Number(dash?.collected ?? 0)), color: '#10b981', icon: CheckCircle2 },
    { label: 'Outstanding', value: formatCurrency(Number(dash?.outstanding ?? 0)), color: '#f59e0b', icon: Clock },
    { label: 'Overdue', value: `${dash?.overdueCount ?? 0} invoices`, color: '#f43f5e', icon: AlertCircle },
  ];

  const TABS = [
    { id: 'dashboard', label: 'Overview', icon: TrendingUp },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'quotations', label: 'Quotations', icon: Receipt },
  ] as const;

  const agingBuckets = (agingData as any)?.buckets ?? { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
  const dso = (dsoData as any)?.dso ?? 0;
  const arTotal = (dsoData as any)?.arTotal ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Create Invoice Modal ─────────────────────────────────── */}
      <Modal open={showInvoiceModal}
        onClose={() => { setShowInvoiceModal(false); invoiceForm.reset({ clientId: '', tenderId: '', issueDate: now.toISOString().split('T')[0], dueDate: new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0], subtotal: 0, gstRate: 18, notes: '' }); }}
        title="Create Invoice" wide>
        <form onSubmit={invoiceForm.handleSubmit(d => createInvoiceMut.mutate(d))} className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#6366f1' }}>Invoice Details</p>
          <div className="grid grid-cols-2 gap-3">
            <F label="Client *" error={invoiceForm.formState.errors.clientId?.message} span2>
              <select {...invoiceForm.register('clientId')} className="input-field w-full">
                <option value="">Select client</option>
                {(clientsList as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </F>
            <F label="Linked Tender">
              <select {...invoiceForm.register('tenderId')} className="input-field w-full">
                <option value="">Select tender (optional)</option>
                {(tendersList as any[] ?? []).map((t: any) => <option key={t.id} value={t.id}>{t.tenderName}</option>)}
              </select>
            </F>
            <F label="Issue Date *" error={invoiceForm.formState.errors.issueDate?.message}>
              <input {...invoiceForm.register('issueDate')} type="date" className="input-field w-full" />
            </F>
            <F label="Due Date *" error={invoiceForm.formState.errors.dueDate?.message}>
              <input {...invoiceForm.register('dueDate')} type="date" className="input-field w-full" />
            </F>
          </div>

          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#10b981' }}>Amount</p>
          <div className="grid grid-cols-2 gap-3">
            <F label="Sub-Total (₹) *" error={invoiceForm.formState.errors.subtotal?.message}>
              <input {...invoiceForm.register('subtotal')} type="number" step="0.01" className="input-field w-full" placeholder="500000" />
            </F>
            <F label="GST Rate (%)">
              <select {...invoiceForm.register('gstRate')} className="input-field w-full">
                <option value={0}>0% (Exempt)</option>
                <option value={5}>5%</option>
                <option value={12}>12%</option>
                <option value={18}>18%</option>
              </select>
            </F>
          </div>

          {Number(subtotal) > 0 && (
            <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Sub-Total</span>
                <span className="text-white">{formatCurrency(Number(subtotal))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>CGST ({gstRate / 2}%)</span>
                <span style={{ color: '#818cf8' }}>{formatCurrency(gstAmount / 2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>SGST ({gstRate / 2}%)</span>
                <span style={{ color: '#818cf8' }}>{formatCurrency(gstAmount / 2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-white">Total Amount</span>
                <span style={{ color: '#10b981' }}>{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          )}

          <F label="Notes">
            <textarea {...invoiceForm.register('notes')} rows={2} className="input-field w-full resize-none" placeholder="Payment terms, notes..." />
          </F>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={createInvoiceMut.isPending}>
              <Save size={14} /> {createInvoiceMut.isPending ? 'Creating...' : 'Create Invoice'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowInvoiceModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* ── Record Payment Modal ─────────────────────────────────── */}
      <Modal open={!!paymentInvoiceId}
        onClose={() => { setPaymentInvoiceId(null); paymentForm.reset({ amount: 0, paymentDate: now.toISOString().split('T')[0], paymentMethod: 'NEFT', referenceNo: '', notes: '' }); }}
        title="Record Payment">
        <form onSubmit={paymentForm.handleSubmit(d => paymentMut.mutate(d))} className="space-y-4">
          <F label="Amount Received (₹) *" error={paymentForm.formState.errors.amount?.message}>
            <input {...paymentForm.register('amount')} type="number" step="0.01" className="input-field w-full" placeholder="100000" />
          </F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Payment Date *" error={paymentForm.formState.errors.paymentDate?.message}>
              <input {...paymentForm.register('paymentDate')} type="date" className="input-field w-full" />
            </F>
            <F label="Payment Method *" error={paymentForm.formState.errors.paymentMethod?.message}>
              <select {...paymentForm.register('paymentMethod')} className="input-field w-full">
                <option value="NEFT">NEFT</option>
                <option value="RTGS">RTGS</option>
                <option value="IMPS">IMPS</option>
                <option value="CHEQUE">Cheque</option>
                <option value="DD">Demand Draft</option>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
              </select>
            </F>
          </div>
          <F label="Reference / UTR / Cheque No.">
            <input {...paymentForm.register('referenceNo')} className="input-field w-full" placeholder="UTR2026001234" />
          </F>
          <F label="Notes">
            <textarea {...paymentForm.register('notes')} rows={2} className="input-field w-full resize-none" placeholder="Any notes about this payment..." />
          </F>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={paymentMut.isPending}>
              <CheckCircle2 size={14} /> {paymentMut.isPending ? 'Recording...' : 'Record Payment'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setPaymentInvoiceId(null)}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* ── Credit Note Modal ────────────────────────────────────── */}
      <Modal open={!!creditNoteInvoiceId}
        onClose={() => { setCreditNoteInvoiceId(null); creditNoteForm.reset(); }}
        title="Create Credit Note">
        <form onSubmit={creditNoteForm.handleSubmit(d => creditNoteMut.mutate(d))} className="space-y-4">
          <F label="Description *" error={creditNoteForm.formState.errors.description?.message}>
            <input {...creditNoteForm.register('description')} className="input-field w-full" placeholder="Reason for credit note..." />
          </F>
          <F label="Credit Amount (₹) *" error={creditNoteForm.formState.errors.amount?.message}>
            <input {...creditNoteForm.register('amount')} type="number" step="0.01" className="input-field w-full" placeholder="5000" />
          </F>
          <F label="Internal Notes">
            <textarea {...creditNoteForm.register('notes')} rows={2} className="input-field w-full resize-none" placeholder="Additional notes..." />
          </F>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={creditNoteMut.isPending}>
              <Minus size={14} /> {creditNoteMut.isPending ? 'Creating...' : 'Create Credit Note'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setCreditNoteInvoiceId(null)}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>Billing & Invoicing</h2>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Create invoices, track collections, and manage payments</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => router.push('/billing/invoices/new')}>
          <Plus size={16} /> Create Invoice
        </button>
      </div>

      {/* ── Summary Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</p>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${s.color}15`, color: s.color }}>
                <s.icon size={15} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────── */}
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

      {/* ══════════ DASHBOARD TAB ══════════ */}
      {tab === 'dashboard' && (
        <div className="space-y-5">
          {/* DSO + Aging row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              {dsoLoading ? (
                <div className="glass-card p-5 h-32 animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
              ) : (
                <DSOCard dso={Number(dso)} arTotal={Number(arTotal)} />
              )}
            </div>
            <div className="lg:col-span-2">
              {agingLoading ? (
                <div className="glass-card p-5 h-32 animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
              ) : (
                <AgingBar buckets={agingBuckets} />
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-white mb-4" style={{ fontFamily: 'Plus Jakarta Sans' }}>Quick Actions</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <button onClick={() => router.push('/billing/invoices/new')} className="p-4 rounded-xl text-left transition-colors hover:bg-white/5" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <Plus size={20} style={{ color: '#6366f1' }} className="mb-2" />
                <p className="text-sm font-medium text-white">New Invoice</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Create and send invoice</p>
              </button>
              <button onClick={() => { setTab('invoices'); setStatusFilter('OVERDUE'); }} className="p-4 rounded-xl text-left transition-colors hover:bg-white/5" style={{ border: '1px solid rgba(244,63,94,0.2)' }}>
                <AlertCircle size={20} style={{ color: '#f43f5e' }} className="mb-2" />
                <p className="text-sm font-medium text-white">Overdue Invoices</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{dash?.overdueCount ?? 0} invoices overdue</p>
              </button>
              <button onClick={() => { setTab('invoices'); setStatusFilter('SENT'); }} className="p-4 rounded-xl text-left transition-colors hover:bg-white/5" style={{ border: '1px solid rgba(99,102,241,0.2)' }}>
                <Clock size={20} style={{ color: '#818cf8' }} className="mb-2" />
                <p className="text-sm font-medium text-white">Pending Collection</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{formatCurrency(Number(dash?.outstanding ?? 0))} outstanding</p>
              </button>
              <button onClick={() => router.push('/billing/quotations/new')} className="p-4 rounded-xl text-left transition-colors hover:bg-white/5" style={{ border: '1px solid rgba(56,189,248,0.2)' }}>
                <FileText size={20} style={{ color: '#38bdf8' }} className="mb-2" />
                <p className="text-sm font-medium text-white">New Quotation</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Create and send quotation</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ INVOICES TAB ══════════ */}
      {tab === 'invoices' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="glass-card p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <Filter size={13} style={{ color: 'rgba(255,255,255,0.35)' }} />
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                  className="bg-transparent text-sm outline-none" style={{ color: statusFilter ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)' }}>
                  <option value="">All Status</option>
                  {Object.entries(INVOICE_STATUS).map(([v, cfg]) => <option key={v} value={v}>{cfg.label}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 min-w-[180px]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <Search size={13} style={{ color: 'rgba(255,255,255,0.35)' }} />
                <input
                  value={clientSearch} onChange={e => { setClientSearch(e.target.value); setPage(1); }}
                  className="bg-transparent text-sm outline-none flex-1"
                  style={{ color: 'rgba(255,255,255,0.85)' }}
                  placeholder="Search client..." />
              </div>

              <div className="flex items-center gap-2">
                <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                  className="input-field text-sm py-2" style={{ width: 'auto' }} />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>to</span>
                <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
                  className="input-field text-sm py-2" style={{ width: 'auto' }} />
              </div>

              {(statusFilter || clientSearch || dateFrom || dateTo) && (
                <button onClick={() => { setStatusFilter(''); setClientSearch(''); setDateFrom(''); setDateTo(''); setPage(1); }}
                  className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                  style={{ color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)' }}>
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Bulk Actions Toolbar */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap"
                style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
                <span className="text-sm font-medium" style={{ color: '#818cf8' }}>{selectedIds.size} selected</span>
                <div className="h-4 w-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
                {[
                  { label: 'Mark as Sent', status: 'SENT', color: '#818cf8' },
                  { label: 'Mark as Overdue', status: 'OVERDUE', color: '#f43f5e' },
                  { label: 'Cancel Selected', status: 'CANCELLED', color: '#6b7280' },
                ].map(action => (
                  <button key={action.status}
                    onClick={() => bulkStatusMut.mutate({ ids: Array.from(selectedIds), status: action.status })}
                    disabled={bulkStatusMut.isPending}
                    className="text-xs px-3 py-1.5 rounded-lg transition-colors font-medium disabled:opacity-50"
                    style={{ background: `${action.color}15`, color: action.color, border: `1px solid ${action.color}30` }}>
                    {action.label}
                  </button>
                ))}
                <button onClick={() => setSelectedIds(new Set())} className="ml-auto p-1 rounded hover:bg-white/5">
                  <X size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Table */}
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {/* Checkbox */}
                    <th className="px-4 py-3 w-10">
                      <button onClick={toggleAll} className="flex items-center justify-center">
                        {allSelected
                          ? <CheckSquare size={15} style={{ color: '#818cf8' }} />
                          : someSelected
                            ? <div className="w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center" style={{ borderColor: '#818cf8' }}><div className="w-2 h-0.5 rounded" style={{ background: '#818cf8' }} /></div>
                            : <Square size={15} style={{ color: 'rgba(255,255,255,0.25)' }} />
                        }
                      </button>
                    </th>
                    {['Invoice No.', 'Client', 'Tender', 'Issue Date', 'Due Date', 'Total', 'Paid', 'Balance', 'Status', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                        style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadInvoices && [...Array(6)].map((_, i) => <SkeletonRow key={i} cols={11} />)}

                  {!loadInvoices && invoices.map((inv: any) => {
                    const cfg = INVOICE_STATUS[inv.status] ?? INVOICE_STATUS.DRAFT;
                    const isOverdue = inv.status !== 'PAID' && new Date(inv.dueDate) < now;
                    const isSelected = selectedIds.has(inv.id);
                    return (
                      <tr key={inv.id}
                        className="hover:bg-white/[0.015] transition-colors cursor-pointer"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: isSelected ? 'rgba(99,102,241,0.04)' : undefined }}
                        onClick={(e) => { if ((e.target as HTMLElement).closest('button, select, input')) return; router.push(`/billing/invoices/${inv.id}`); }}>
                        {/* Checkbox */}
                        <td className="px-4 py-3">
                          <button onClick={() => toggleOne(inv.id)} className="flex items-center justify-center">
                            {isSelected
                              ? <CheckSquare size={15} style={{ color: '#818cf8' }} />
                              : <Square size={15} style={{ color: 'rgba(255,255,255,0.2)' }} />
                            }
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-mono font-medium whitespace-nowrap" style={{ color: '#818cf8' }}>{inv.invoiceNo}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-white">{inv.client?.name ?? '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{inv.tender?.tenderName ?? '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {formatDate(inv.issueDate)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm" style={{ color: isOverdue ? '#f43f5e' : 'rgba(255,255,255,0.5)' }}>
                            {formatDate(inv.dueDate)}
                          </span>
                          {isOverdue && <span className="text-xs ml-1 font-bold" style={{ color: '#f43f5e' }}>●</span>}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold whitespace-nowrap" style={{ color: '#10b981' }}>
                          {formatCurrency(Number(inv.totalAmount ?? 0))}
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.55)' }}>
                          {formatCurrency(Number(inv.paidAmount ?? 0))}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold whitespace-nowrap" style={{ color: Number(inv.balanceAmount) > 0 ? '#f59e0b' : '#10b981' }}>
                          {formatCurrency(Number(inv.balanceAmount ?? 0))}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${cfg.strikethrough ? 'line-through opacity-60' : ''}`}
                            style={{ background: cfg.bg, color: cfg.color }}>
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <InvoiceActions
                            inv={inv}
                            onPayment={setPaymentInvoiceId}
                            onCreditNote={setCreditNoteInvoiceId}
                          />
                        </td>
                      </tr>
                    );
                  })}

                  {!loadInvoices && invoices.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-4 py-20 text-center">
                        <Receipt size={40} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                        <p className="font-medium text-white mb-1">No invoices found</p>
                        <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          {statusFilter || clientSearch ? 'Try adjusting your filters' : 'Create your first invoice'}
                        </p>
                        {!statusFilter && !clientSearch && (
                          <button className="btn-primary flex items-center gap-2 mx-auto" onClick={() => setShowInvoiceModal(true)}>
                            <Plus size={14} /> Create Invoice
                          </button>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {invoicesMeta && invoicesMeta.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{invoicesMeta.total} invoices</p>
                <div className="flex gap-1 items-center">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30">
                    <ChevronLeft size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
                  </button>
                  <span className="text-xs px-2 py-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{page} / {invoicesMeta.totalPages}</span>
                  <button disabled={page === invoicesMeta.totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30">
                    <ChevronRight size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════ QUOTATIONS TAB ══════════ */}
      {tab === 'quotations' && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Receipt size={48} style={{ color: 'rgba(56,189,248,0.3)' }} />
          <p className="text-white font-semibold text-lg" style={{ fontFamily: 'Plus Jakarta Sans' }}>Quotations</p>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Manage all your client quotations</p>
          <div className="flex gap-3">
            <button className="btn-primary flex items-center gap-2" onClick={() => router.push('/billing/quotations/new')}>
              <Plus size={16} /> New Quotation
            </button>
            <button className="btn-secondary flex items-center gap-2" onClick={() => router.push('/billing/quotations')}>
              <Receipt size={16} /> View All Quotations
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
