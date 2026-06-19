'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import {
  Plus, X, Save, FileText, DollarSign, Users, CheckCircle2, Clock,
  ChevronLeft, ChevronRight, AlertCircle, Target, CreditCard, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';
import { workOrdersApi, tendersApi, employeesApi } from '@/lib/api';

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto rounded-2xl`}
        style={{ background: 'var(--wz-card-bg)', border: '1px solid var(--wz-card-border)' }}>
        <div className="flex items-center justify-between p-5 sticky top-0 z-10"
          style={{ background: 'var(--wz-card-bg)', borderBottom: '1px solid var(--wz-card-border)' }}>
          <h3 className="font-semibold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><X size={18} style={{ color: 'var(--wz-text-muted)' }} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const F = ({ label, error, children, span2 }: { label: string; error?: string; children: React.ReactNode; span2?: boolean }) => (
  <div className={span2 ? 'col-span-2' : ''}>
    <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>{label}</label>
    {children}
    {error && <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>{error}</p>}
  </div>
);

const STATUS_CFG: Record<string, { color: string; bg: string }> = {
  ACTIVE:               { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  PARTIALLY_FULFILLED:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  FULFILLED:            { color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
  DRAFT:                { color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  CLOSED:               { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  CANCELLED:            { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)' },
};

const INVOICE_STATUS_CFG: Record<string, { color: string; bg: string }> = {
  DRAFT:          { color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  SUBMITTED:      { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  ACKNOWLEDGED:   { color: '#818cf8', bg: 'rgba(99,102,241,0.12)' },
  PARTIALLY_PAID: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  PAID:           { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  REJECTED:       { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)' },
};

type Tab = 'list' | 'detail';

export default function WorkOrdersPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('list');
  const [selectedWO, setSelectedWO] = useState<any>(null);
  const [innerTab, setInnerTab] = useState<'overview' | 'positions' | 'milestones' | 'fulfillments' | 'invoices' | 'payments' | 'amendments'>('overview');
  const [page, setPage] = useState(1);

  // Modals
  const [showWOModal, setShowWOModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAmendModal, setShowAmendModal] = useState(false);
  const [showFulfillModal, setShowFulfillModal] = useState(false);

  const woForm = useForm<any>();
  const msForm = useForm<any>();
  const invForm = useForm<any>();
  const payForm = useForm<any>();
  const amendForm = useForm<any>();
  const fulfillForm = useForm<any>();

  // ── Queries ──────────────────────────────────────────────────────
  const { data: dash } = useQuery({ queryKey: ['wo-dash'], queryFn: workOrdersApi.dashboard });
  const { data: woData, isLoading } = useQuery({
    queryKey: ['work-orders', page],
    queryFn: () => workOrdersApi.list({ page, limit: 15 }),
    enabled: tab === 'list',
  });
  const { data: woDetail } = useQuery({
    queryKey: ['wo-detail', selectedWO?.id],
    queryFn: () => workOrdersApi.get(selectedWO.id),
    enabled: !!selectedWO?.id && tab === 'detail',
  });
  const { data: tenders = [] } = useQuery({
    queryKey: ['tenders-select-all'],
    queryFn: tendersApi.selectAll,
    enabled: showWOModal,
  });
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-select-all'],
    queryFn: () => employeesApi.selectAll('ACTIVE'),
    enabled: showFulfillModal,
  });

  const wos = (woData as any)?.data ?? [];
  const meta = (woData as any)?.meta;
  const d = dash as any;

  // ── Mutations ─────────────────────────────────────────────────────
  const createWOMut = useMutation({
    mutationFn: (data: any) => workOrdersApi.create(data),
    onSuccess: () => { toast.success('Work order created'); qc.invalidateQueries({ queryKey: ['work-orders'] }); qc.invalidateQueries({ queryKey: ['wo-dash'] }); setShowWOModal(false); woForm.reset(); },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed'),
  });
  const createMsMut = useMutation({
    mutationFn: (data: any) => workOrdersApi.createMilestone(selectedWO.id, data),
    onSuccess: () => { toast.success('Milestone added'); qc.invalidateQueries({ queryKey: ['wo-detail', selectedWO.id] }); setShowMilestoneModal(false); msForm.reset(); },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed'),
  });
  const createInvMut = useMutation({
    mutationFn: (data: any) => workOrdersApi.createInvoice(selectedWO.id, data),
    onSuccess: () => { toast.success('Invoice raised'); qc.invalidateQueries({ queryKey: ['wo-detail', selectedWO.id] }); setShowInvoiceModal(false); invForm.reset(); },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed'),
  });
  const recordPayMut = useMutation({
    mutationFn: (data: any) => workOrdersApi.recordPayment(selectedWO.id, data),
    onSuccess: () => { toast.success('Payment recorded'); qc.invalidateQueries({ queryKey: ['wo-detail', selectedWO.id] }); qc.invalidateQueries({ queryKey: ['wo-dash'] }); setShowPaymentModal(false); payForm.reset(); },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed'),
  });
  const amendMut = useMutation({
    mutationFn: (data: any) => workOrdersApi.createAmendment(selectedWO.id, data),
    onSuccess: () => { toast.success('Amendment recorded'); qc.invalidateQueries({ queryKey: ['wo-detail', selectedWO.id] }); setShowAmendModal(false); amendForm.reset(); },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed'),
  });
  const fulfillMut = useMutation({
    mutationFn: (data: any) => workOrdersApi.addFulfillment(selectedWO.id, data),
    onSuccess: () => { toast.success('Employee deployed'); qc.invalidateQueries({ queryKey: ['wo-detail', selectedWO.id] }); setShowFulfillModal(false); fulfillForm.reset(); },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed'),
  });
  const updateInvStatusMut = useMutation({
    mutationFn: ({ id, status }: any) => workOrdersApi.updateInvoiceStatus(id, status),
    onSuccess: () => { toast.success('Invoice updated'); qc.invalidateQueries({ queryKey: ['wo-detail', selectedWO?.id] }); },
  });

  const openDetail = (wo: any) => { setSelectedWO(wo); setTab('detail'); setInnerTab('overview'); };

  const wo = woDetail as any;

  const INNER_TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'positions', label: 'Positions' },
    { id: 'milestones', label: 'Milestones' },
    { id: 'fulfillments', label: 'Deployed Staff' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'payments', label: 'Payments' },
    { id: 'amendments', label: 'Amendments' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* ── Create WO Modal ────────────────────────────────────────── */}
      <Modal open={showWOModal} onClose={() => { setShowWOModal(false); woForm.reset(); }} title="New Work Order" wide>
        <form onSubmit={woForm.handleSubmit(d => createWOMut.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <F label="Tender *" span2>
              <select {...woForm.register('tenderId')} className="input-field w-full">
                <option value="">Select tender</option>
                {(tenders as any[]).map((t: any) => <option key={t.id} value={t.id}>{t.tenderName} — {t.tenderNumber}</option>)}
              </select>
            </F>
            <F label="WO Number *">
              <input {...woForm.register('workOrderNo')} className="input-field w-full" placeholder="WO/TN/2026/001" />
            </F>
            <F label="Govt Reference No.">
              <input {...woForm.register('governmentRef')} className="input-field w-full" placeholder="GO(Ms) No. 123" />
            </F>
            <F label="Title *" span2>
              <input {...woForm.register('title')} className="input-field w-full" placeholder="Supply of Security Personnel" />
            </F>
            <F label="WO Value (₹) *">
              <input {...woForm.register('value', { valueAsNumber: true })} type="number" className="input-field w-full" placeholder="5000000" />
            </F>
            <F label="Sanctioned Strength">
              <input {...woForm.register('sanctionedStrength', { valueAsNumber: true })} type="number" className="input-field w-full" placeholder="100" />
            </F>
            <F label="Issued Date">
              <input {...woForm.register('issuedDate')} type="date" className="input-field w-full" />
            </F>
            <F label="Start Date *">
              <input {...woForm.register('startDate')} type="date" className="input-field w-full" />
            </F>
            <F label="End Date">
              <input {...woForm.register('endDate')} type="date" className="input-field w-full" />
            </F>
          </div>
          <F label="Description">
            <textarea {...woForm.register('description')} rows={2} className="input-field w-full resize-none" placeholder="Scope of work..." />
          </F>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={createWOMut.isPending}>
              <Save size={14} /> {createWOMut.isPending ? 'Creating...' : 'Create Work Order'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowWOModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* ── Milestone Modal ─────────────────────────────────────────── */}
      <Modal open={showMilestoneModal} onClose={() => { setShowMilestoneModal(false); msForm.reset(); }} title="Add Milestone">
        <form onSubmit={msForm.handleSubmit(d => createMsMut.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <F label="Milestone Title *">
              <input {...msForm.register('title')} className="input-field w-full" placeholder="1st Installment" />
            </F>
            <F label="Completion %">
              <input {...msForm.register('percentage', { valueAsNumber: true })} type="number" min={1} max={100} className="input-field w-full" placeholder="25" />
            </F>
            <F label="Amount (₹) *">
              <input {...msForm.register('amount', { valueAsNumber: true })} type="number" className="input-field w-full" />
            </F>
            <F label="Due Date">
              <input {...msForm.register('dueDate')} type="date" className="input-field w-full" />
            </F>
          </div>
          <F label="Description">
            <textarea {...msForm.register('description')} rows={2} className="input-field w-full resize-none" />
          </F>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={createMsMut.isPending}>
              <Save size={14} /> {createMsMut.isPending ? 'Saving...' : 'Add Milestone'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowMilestoneModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* ── Invoice Modal ───────────────────────────────────────────── */}
      <Modal open={showInvoiceModal} onClose={() => { setShowInvoiceModal(false); invForm.reset(); }} title="Raise Invoice" wide>
        <form onSubmit={invForm.handleSubmit(d => createInvMut.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <F label="Milestone (optional)">
              <select {...invForm.register('milestoneId')} className="input-field w-full">
                <option value="">— Select milestone —</option>
                {(wo?.milestones ?? []).filter((m: any) => m.status !== 'PAID').map((m: any) => (
                  <option key={m.id} value={m.id}>{m.title} ({m.percentage}%) — {formatCurrency(m.amount)}</option>
                ))}
              </select>
            </F>
            <F label="Period (e.g. Jun-2026) *">
              <input {...invForm.register('period')} className="input-field w-full" placeholder="Jun-2026" />
            </F>
            <F label="Invoice Date *">
              <input {...invForm.register('invoiceDate')} type="date" className="input-field w-full" />
            </F>
            <F label="Deployed Count (actual)">
              <input {...invForm.register('deployedCount', { valueAsNumber: true })} type="number" className="input-field w-full" />
            </F>
            <F label="Base Amount (₹) *">
              <input {...invForm.register('amount', { valueAsNumber: true })} type="number" className="input-field w-full" />
            </F>
            <F label="GST Amount (₹)">
              <input {...invForm.register('gstAmount', { valueAsNumber: true })} type="number" className="input-field w-full" defaultValue={0} />
            </F>
            <F label="Total Amount (₹) *">
              <input {...invForm.register('totalAmount', { valueAsNumber: true })} type="number" className="input-field w-full" />
            </F>
          </div>
          <F label="Notes">
            <textarea {...invForm.register('notes')} rows={2} className="input-field w-full resize-none" />
          </F>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={createInvMut.isPending}>
              <Save size={14} /> {createInvMut.isPending ? 'Raising...' : 'Raise Invoice'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowInvoiceModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* ── Payment Modal ───────────────────────────────────────────── */}
      <Modal open={showPaymentModal} onClose={() => { setShowPaymentModal(false); payForm.reset(); }} title="Record Payment">
        <form onSubmit={payForm.handleSubmit(d => recordPayMut.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <F label="Against Invoice (optional)">
              <select {...payForm.register('invoiceId')} className="input-field w-full">
                <option value="">— Direct payment —</option>
                {(wo?.woInvoices ?? []).filter((i: any) => i.status !== 'PAID').map((i: any) => (
                  <option key={i.id} value={i.id}>{i.invoiceNumber} — {formatCurrency(Number(i.totalAmount) - Number(i.paidAmount))} due</option>
                ))}
              </select>
            </F>
            <F label="Payment Date *">
              <input {...payForm.register('paymentDate')} type="date" className="input-field w-full" />
            </F>
            <F label="Amount Received (₹) *">
              <input {...payForm.register('amount', { valueAsNumber: true })} type="number" className="input-field w-full" />
            </F>
            <F label="Payment Mode *">
              <select {...payForm.register('paymentMode')} className="input-field w-full">
                <option value="">Select mode</option>
                {['NEFT', 'RTGS', 'CHEQUE', 'DD', 'CASH', 'UPI'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </F>
            <F label="Reference / Cheque No.">
              <input {...payForm.register('referenceNumber')} className="input-field w-full" placeholder="TXN12345678" />
            </F>
          </div>
          <F label="Remarks">
            <textarea {...payForm.register('remarks')} rows={2} className="input-field w-full resize-none" />
          </F>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={recordPayMut.isPending}>
              <Save size={14} /> {recordPayMut.isPending ? 'Recording...' : 'Record Payment'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowPaymentModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* ── Amendment Modal ─────────────────────────────────────────── */}
      <Modal open={showAmendModal} onClose={() => { setShowAmendModal(false); amendForm.reset(); }} title="Record Amendment" wide>
        <form onSubmit={amendForm.handleSubmit(d => amendMut.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <F label="Amendment Ref No.">
              <input {...amendForm.register('amendmentRef')} className="input-field w-full" placeholder="AMD-001" />
            </F>
            <F label="Effective Date *">
              <input {...amendForm.register('effectiveDate')} type="date" className="input-field w-full" />
            </F>
            <F label="Previous WO Value (₹)">
              <input {...amendForm.register('previousValue', { valueAsNumber: true })} type="number" className="input-field w-full" defaultValue={wo ? Number(wo.value) : 0} />
            </F>
            <F label="Revised WO Value (₹)">
              <input {...amendForm.register('newValue', { valueAsNumber: true })} type="number" className="input-field w-full" />
            </F>
            <F label="Previous Strength">
              <input {...amendForm.register('previousStrength', { valueAsNumber: true })} type="number" className="input-field w-full" defaultValue={wo?.sanctionedStrength} />
            </F>
            <F label="Revised Strength">
              <input {...amendForm.register('newStrength', { valueAsNumber: true })} type="number" className="input-field w-full" />
            </F>
            <F label="Previous End Date">
              <input {...amendForm.register('previousEndDate')} type="date" className="input-field w-full" />
            </F>
            <F label="Revised End Date">
              <input {...amendForm.register('newEndDate')} type="date" className="input-field w-full" />
            </F>
          </div>
          <F label="Change Description *">
            <textarea {...amendForm.register('changeDescription')} rows={3} className="input-field w-full resize-none" placeholder="Describe what changed and why..." />
          </F>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={amendMut.isPending}>
              <Save size={14} /> {amendMut.isPending ? 'Saving...' : 'Record Amendment'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowAmendModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* ── Deploy Staff Modal ──────────────────────────────────────── */}
      <Modal open={showFulfillModal} onClose={() => { setShowFulfillModal(false); fulfillForm.reset(); }} title="Deploy Employee">
        <form onSubmit={fulfillForm.handleSubmit(d => fulfillMut.mutate(d))} className="space-y-4">
          <F label="Position *">
            <select {...fulfillForm.register('positionId')} className="input-field w-full">
              <option value="">Select position</option>
              {(wo?.positions ?? []).map((p: any) => (
                <option key={p.id} value={p.id}>{p.designation} ({p.deployedCount}/{p.requiredCount} deployed)</option>
              ))}
            </select>
          </F>
          <F label="Employee *">
            <select {...fulfillForm.register('employeeId')} className="input-field w-full">
              <option value="">Select employee</option>
              {(employees as any[]).map((e: any) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} — {e.employeeCode}</option>)}
            </select>
          </F>
          <F label="Deployed Date *">
            <input {...fulfillForm.register('deployedDate')} type="date" className="input-field w-full" />
          </F>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={fulfillMut.isPending}>
              <Save size={14} /> {fulfillMut.isPending ? 'Deploying...' : 'Deploy'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowFulfillModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          {tab === 'detail' && (
            <button onClick={() => { setTab('list'); setSelectedWO(null); }}
              className="flex items-center gap-1.5 text-sm mb-2 transition-colors hover:text-white"
              style={{ color: 'rgba(255,255,255,0.45)' }}>
              <ChevronLeft size={15} /> All Work Orders
            </button>
          )}
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            {tab === 'list' ? 'Work Orders' : (wo?.title ?? selectedWO?.title ?? '…')}
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {tab === 'list' ? 'Govt work orders, milestones, invoicing and payment tracking' : `${wo?.workOrderNo ?? ''} · v${wo?.currentVersion ?? 1}`}
          </p>
        </div>
        {tab === 'list' && (
          <button className="btn-primary" onClick={() => setShowWOModal(true)}><Plus size={16} /> New Work Order</button>
        )}
        {tab === 'detail' && (
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setShowAmendModal(true)}><RefreshCw size={14} /> Amendment</button>
            <button className="btn-secondary" onClick={() => setShowFulfillModal(true)}><Users size={14} /> Deploy Staff</button>
            <button className="btn-secondary" onClick={() => setShowMilestoneModal(true)}><Target size={14} /> Add Milestone</button>
            <button className="btn-primary" onClick={() => setShowInvoiceModal(true)}><Plus size={14} /> Raise Invoice</button>
          </div>
        )}
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────── */}
      {tab === 'list' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total WOs', value: d?.total ?? 0, color: '#6366f1', icon: FileText },
            { label: 'Active', value: d?.active ?? 0, color: '#10b981', icon: CheckCircle2 },
            { label: 'Total Value', value: formatCurrency(d?.totalValue ?? 0), color: '#f59e0b', icon: DollarSign },
            { label: 'Payments Collected', value: formatCurrency(d?.totalPaymentsReceived ?? 0), color: '#3b82f6', icon: CreditCard },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</p>
                  <p className="text-xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>{s.value}</p>
                </div>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${s.color}15`, color: s.color }}>
                  <s.icon size={16} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Work Orders List ────────────────────────────────────────── */}
      {tab === 'list' && (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['WO Number', 'Title', 'Tender', 'Value', 'Strength', 'Period', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && [...Array(5)].map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  {[...Array(8)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} /></td>)}
                </tr>
              ))}
              {!isLoading && wos.map((w: any) => {
                const cfg = STATUS_CFG[w.status] ?? STATUS_CFG.DRAFT;
                return (
                  <tr key={w.id} className="group hover:bg-white/[0.015] transition-colors cursor-pointer"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    onClick={() => openDetail(w)}>
                    <td className="px-4 py-3"><p className="text-sm font-mono" style={{ color: '#818cf8' }}>{w.workOrderNo}</p></td>
                    <td className="px-4 py-3"><p className="text-sm font-medium text-white">{w.title}</p></td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{w.tender?.tenderName?.substring(0, 25)}…</td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: '#fbbf24' }}>{formatCurrency(Number(w.value))}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{w.sanctionedStrength}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{formatDate(w.startDate)} → {w.endDate ? formatDate(w.endDate) : '∞'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: cfg.bg, color: cfg.color }}>{w.status.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-3 text-xs opacity-0 group-hover:opacity-100" style={{ color: '#818cf8' }}>View →</td>
                  </tr>
                );
              })}
              {!isLoading && wos.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-16 text-center">
                  <FileText size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                  <p className="text-white font-medium mb-1">No work orders yet</p>
                  <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Create a work order from a won tender</p>
                  <button className="btn-primary" onClick={() => setShowWOModal(true)}><Plus size={14} /> New Work Order</button>
                </td></tr>
              )}
            </tbody>
          </table>
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Total: {meta.total}</p>
              <div className="flex gap-1">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30"><ChevronLeft size={16} style={{ color: 'rgba(255,255,255,0.5)' }} /></button>
                <span className="text-xs px-2 py-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{page}/{meta.totalPages}</span>
                <button disabled={page === meta.totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30"><ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.5)' }} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Detail View ─────────────────────────────────────────────── */}
      {tab === 'detail' && wo && (
        <div className="space-y-4">
          {/* Inner tab bar */}
          <div className="flex gap-1 p-1 rounded-xl w-fit flex-wrap" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {INNER_TABS.map(t => (
              <button key={t.id} onClick={() => setInnerTab(t.id)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{ background: innerTab === t.id ? 'rgba(99,102,241,0.2)' : 'transparent', color: innerTab === t.id ? '#818cf8' : 'rgba(255,255,255,0.5)' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Overview */}
          {innerTab === 'overview' && (
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="glass-card p-5 lg:col-span-2 space-y-4">
                <h3 className="font-semibold text-white text-sm">Work Order Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { l: 'WO Number', v: wo.workOrderNo },
                    { l: 'Govt Reference', v: wo.governmentRef ?? '—' },
                    { l: 'Tender', v: `${wo.tender?.tenderName}` },
                    { l: 'Total Value', v: formatCurrency(Number(wo.value)) },
                    { l: 'Sanctioned Strength', v: wo.sanctionedStrength },
                    { l: 'Version', v: `v${wo.currentVersion}` },
                    { l: 'Start Date', v: formatDate(wo.startDate) },
                    { l: 'End Date', v: wo.endDate ? formatDate(wo.endDate) : 'Open-ended' },
                    { l: 'Status', v: wo.status.replace('_', ' ') },
                  ].map(({ l, v }) => (
                    <div key={l}>
                      <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{l}</p>
                      <p className="font-medium text-white">{String(v)}</p>
                    </div>
                  ))}
                </div>
                {wo.description && <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{wo.description}</p>}
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Milestones', value: wo.milestones?.length ?? 0, color: '#818cf8' },
                  { label: 'Deployed Staff', value: wo.fulfillments?.filter((f: any) => f.status === 'ACTIVE').length ?? 0, color: '#10b981' },
                  { label: 'Invoices Raised', value: wo.woInvoices?.length ?? 0, color: '#f59e0b' },
                  { label: 'Payments Received', value: wo.woPayments?.length ?? 0, color: '#3b82f6' },
                ].map(s => (
                  <div key={s.label} className="glass-card p-4 flex items-center justify-between">
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{s.label}</p>
                    <p className="text-2xl font-bold" style={{ color: s.color, fontFamily: 'Plus Jakarta Sans' }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Positions */}
          {innerTab === 'positions' && (
            <div className="glass-card overflow-hidden">
              <table className="w-full">
                <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Designation', 'Required', 'Deployed', 'Rate', 'Rate Type'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {(wo.positions ?? []).map((p: any) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td className="px-4 py-3 text-sm font-medium text-white">{p.designation}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{p.requiredCount}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${p.deployedCount < p.requiredCount ? 'text-yellow-400' : 'text-green-400'}`}>{p.deployedCount}</span>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: '#fbbf24' }}>{formatCurrency(Number(p.rate))}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{p.rateType}</td>
                    </tr>
                  ))}
                  {(wo.positions ?? []).length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No positions defined</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Milestones */}
          {innerTab === 'milestones' && (
            <div className="space-y-3">
              {(wo.milestones ?? []).map((m: any) => {
                const pct = { PENDING: 0, IN_PROGRESS: 33, COMPLETED: 66, INVOICED: 80, PAID: 100 }[m.status] ?? 0;
                const color = m.status === 'PAID' ? '#10b981' : m.status === 'INVOICED' ? '#f59e0b' : '#6366f1';
                return (
                  <div key={m.id} className="glass-card p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-white text-sm">{m.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {m.percentage}% · {formatCurrency(Number(m.amount))} {m.dueDate ? `· Due ${formatDate(m.dueDate)}` : ''}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: `${color}15`, color }}>
                        {m.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
              {(wo.milestones ?? []).length === 0 && (
                <div className="glass-card p-8 text-center">
                  <Target size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                  <p className="text-white font-medium mb-1">No milestones</p>
                  <button className="btn-primary mt-3" onClick={() => setShowMilestoneModal(true)}><Plus size={14} /> Add Milestone</button>
                </div>
              )}
            </div>
          )}

          {/* Deployed Staff */}
          {innerTab === 'fulfillments' && (
            <div className="glass-card overflow-hidden">
              <table className="w-full">
                <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Employee', 'Position', 'Deployed On', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {(wo.fulfillments ?? []).map((f: any) => (
                    <tr key={f.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-white">{f.employee?.firstName} {f.employee?.lastName}</p>
                        <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>{f.employee?.employeeCode}</p>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{f.position?.designation}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{formatDate(f.deployedDate)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={{ background: f.status === 'ACTIVE' ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)', color: f.status === 'ACTIVE' ? '#10b981' : 'rgba(255,255,255,0.4)' }}>
                          {f.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(wo.fulfillments ?? []).length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No staff deployed yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Invoices */}
          {innerTab === 'invoices' && (
            <div className="glass-card overflow-hidden">
              <table className="w-full">
                <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Invoice No.', 'Period', 'Deployed', 'Amount', 'GST', 'Total', 'Paid', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {(wo.woInvoices ?? []).map((inv: any) => {
                    const cfg = INVOICE_STATUS_CFG[inv.status] ?? INVOICE_STATUS_CFG.DRAFT;
                    return (
                      <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td className="px-4 py-3 text-sm font-mono" style={{ color: '#818cf8' }}>{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{inv.period}</td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{inv.deployedCount}</td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{formatCurrency(Number(inv.amount))}</td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{formatCurrency(Number(inv.gstAmount))}</td>
                        <td className="px-4 py-3 text-sm font-medium" style={{ color: '#fbbf24' }}>{formatCurrency(Number(inv.totalAmount))}</td>
                        <td className="px-4 py-3 text-sm" style={{ color: '#10b981' }}>{formatCurrency(Number(inv.paidAmount))}</td>
                        <td className="px-4 py-3">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: cfg.bg, color: cfg.color }}>{inv.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          {inv.status === 'DRAFT' && (
                            <button onClick={() => updateInvStatusMut.mutate({ id: inv.id, status: 'SUBMITTED' })}
                              className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
                              Submit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {(wo.woInvoices ?? []).length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No invoices raised yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Payments */}
          {innerTab === 'payments' && (
            <div className="glass-card overflow-hidden">
              <div className="p-4 flex justify-end" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <button className="btn-primary" onClick={() => setShowPaymentModal(true)}><Plus size={14} /> Record Payment</button>
              </div>
              <table className="w-full">
                <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Date', 'Invoice', 'Amount', 'Mode', 'Reference', 'Remarks'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {(wo.woPayments ?? []).map((pay: any) => (
                    <tr key={pay.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{formatDate(pay.paymentDate)}</td>
                      <td className="px-4 py-3 text-sm font-mono" style={{ color: '#818cf8' }}>{pay.invoice?.invoiceNumber ?? '—'}</td>
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: '#10b981' }}>{formatCurrency(Number(pay.amount))}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{pay.paymentMode}</td>
                      <td className="px-4 py-3 text-sm font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>{pay.referenceNumber ?? '—'}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{pay.remarks ?? '—'}</td>
                    </tr>
                  ))}
                  {(wo.woPayments ?? []).length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No payments recorded yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Amendments */}
          {innerTab === 'amendments' && (
            <div className="space-y-3">
              {(wo.amendments ?? []).map((a: any) => (
                <div key={a.id} className="glass-card p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-white text-sm">Amendment v{a.version} {a.amendmentRef ? `· ${a.amendmentRef}` : ''}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Effective: {formatDate(a.effectiveDate)}</p>
                    </div>
                  </div>
                  <p className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>{a.changeDescription}</p>
                  <div className="flex flex-wrap gap-4 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {a.previousValue && <span>Value: {formatCurrency(Number(a.previousValue))} → {formatCurrency(Number(a.newValue))}</span>}
                    {a.previousStrength && <span>Strength: {a.previousStrength} → {a.newStrength}</span>}
                    {a.previousEndDate && <span>End Date: {formatDate(a.previousEndDate)} → {formatDate(a.newEndDate)}</span>}
                  </div>
                </div>
              ))}
              {(wo.amendments ?? []).length === 0 && (
                <div className="glass-card p-8 text-center">
                  <AlertCircle size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                  <p className="text-white font-medium mb-1">No amendments</p>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Record when Govt revises scope, value or duration</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
