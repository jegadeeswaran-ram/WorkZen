'use client';

import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, FileText, Edit3, Save, X, DollarSign, Calendar,
  CheckCircle2, Clock, AlertCircle, Send, CreditCard, Printer,
  Building2, Receipt, Minus, ChevronRight, LayoutGrid, Eye, PenLine,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';
import { billingApi } from '@/lib/api';
import { TemplateClassic } from '@/components/billing/templates/TemplateClassic';
import { TemplateModern } from '@/components/billing/templates/TemplateModern';
import { DocumentActions } from '@/components/billing/DocumentActions';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { color: string; bg: string; ring: string; label: string }> = {
  DRAFT:          { color: 'rgba(255,255,255,0.55)', bg: 'rgba(255,255,255,0.06)',  ring: 'rgba(255,255,255,0.15)', label: 'Draft'          },
  SENT:           { color: '#818cf8',               bg: 'rgba(99,102,241,0.12)',   ring: 'rgba(99,102,241,0.3)',  label: 'Sent'           },
  PARTIALLY_PAID: { color: '#f59e0b',               bg: 'rgba(245,158,11,0.12)',   ring: 'rgba(245,158,11,0.3)', label: 'Partially Paid' },
  PAID:           { color: '#10b981',               bg: 'rgba(16,185,129,0.12)',   ring: 'rgba(16,185,129,0.3)', label: 'Paid'           },
  OVERDUE:        { color: '#f43f5e',               bg: 'rgba(244,63,94,0.12)',    ring: 'rgba(244,63,94,0.3)',  label: 'Overdue'        },
  CANCELLED:      { color: '#6b7280',               bg: 'rgba(107,114,128,0.08)',  ring: 'rgba(107,114,128,0.2)', label: 'Cancelled'     },
};

const PAYMENT_METHODS = ['BANK_TRANSFER', 'CHEQUE', 'CASH', 'UPI', 'NEFT', 'RTGS', 'IMPS', 'DD'];

// ── Schemas ───────────────────────────────────────────────────────────────────
const editSchema = z.object({
  issueDate: z.string().min(1, 'Required'),
  dueDate:   z.string().min(1, 'Required'),
  notes:     z.string().optional(),
  termsConditions: z.string().optional(),
});

const paymentSchema = z.object({
  amount:        z.coerce.number().min(0.01, 'Amount required'),
  paymentDate:   z.string().min(1, 'Required'),
  paymentMethod: z.string().min(1, 'Required'),
  referenceNo:   z.string().optional(),
  notes:         z.string().optional(),
});

const creditSchema = z.object({
  description: z.string().min(1, 'Required'),
  amount:      z.coerce.number().min(0.01, 'Amount required'),
  notes:       z.string().optional(),
});

type EditForm    = z.infer<typeof editSchema>;
type PaymentForm = z.infer<typeof paymentSchema>;
type CreditForm  = z.infer<typeof creditSchema>;

// ── Mini Modal wrapper ────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: 'var(--wz-card-bg)', border: '1px solid var(--wz-card-border)' }}>
        <div className="flex items-center justify-between p-5 sticky top-0"
          style={{ background: 'var(--wz-card-bg)', borderBottom: '1px solid var(--wz-card-border)' }}>
          <h3 className="font-semibold text-sm" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5">
            <X size={16} style={{ color: 'var(--wz-text-muted)' }} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </motion.div>
    </div>
  );
}

function F({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>{label}</label>
      {children}
      {error && <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>{error}</p>}
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'details',  label: 'Details',  icon: LayoutGrid },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'preview',  label: 'Preview',  icon: Eye },
] as const;
type TabId = typeof TABS[number]['id'];

// ── Main page ─────────────────────────────────────────────────────────────────
export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const docRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab]         = useState<TabId>('details');
  const [template, setTemplate]           = useState<'classic' | 'modern'>('classic');
  const [showEdit, setShowEdit]           = useState(false);
  const [showPayment, setShowPayment]     = useState(false);
  const [showCreditNote, setShowCreditNote] = useState(false);

  // ── Fetch invoice ─────────────────────────────────────────────────────────
  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => billingApi.invoice(id),
    enabled: !!id,
    staleTime: 30_000,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const refresh = () => qc.invalidateQueries({ queryKey: ['invoice', id] });

  const updateMut = useMutation({
    mutationFn: (data: EditForm) => billingApi.update(id, data),
    onSuccess: () => { toast.success('Invoice updated'); refresh(); setShowEdit(false); },
    onError: () => toast.error('Failed to update invoice'),
  });

  const statusMut = useMutation({
    mutationFn: (status: string) => billingApi.update(id, { status }),
    onSuccess: () => { toast.success('Status updated'); refresh(); },
    onError: () => toast.error('Failed to update status'),
  });

  const paymentMut = useMutation({
    mutationFn: (data: PaymentForm) => billingApi.payment(id, data),
    onSuccess: () => { toast.success('Payment recorded'); refresh(); setShowPayment(false); },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed to record payment'),
  });

  const creditMut = useMutation({
    mutationFn: (data: CreditForm) => billingApi.createCreditNote(id, data),
    onSuccess: () => { toast.success('Credit note created'); refresh(); setShowCreditNote(false); },
    onError: () => toast.error('Failed to create credit note'),
  });

  const sendWaMut = useMutation({
    mutationFn: ({ phone, message }: { phone: string; message: string }) =>
      billingApi.sendWhatsApp(id, phone, message),
  });

  // ── Forms ─────────────────────────────────────────────────────────────────
  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      issueDate: invoice?.issueDate ? invoice.issueDate.split('T')[0] : '',
      dueDate:   invoice?.dueDate   ? invoice.dueDate.split('T')[0]   : '',
      notes:     invoice?.notes     ?? '',
      termsConditions: invoice?.termsConditions ?? '',
    },
  });

  const payForm = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentDate:   new Date().toISOString().split('T')[0],
      paymentMethod: 'BANK_TRANSFER',
      amount:        invoice ? Number(invoice.balanceAmount) : 0,
    },
  });

  const creditForm = useForm<CreditForm>({ resolver: zodResolver(creditSchema) });

  // ── Open edit modal with fresh values ────────────────────────────────────
  const openEdit = () => {
    editForm.reset({
      issueDate: invoice?.issueDate ? invoice.issueDate.split('T')[0] : '',
      dueDate:   invoice?.dueDate   ? invoice.dueDate.split('T')[0]   : '',
      notes:     invoice?.notes     ?? '',
      termsConditions: invoice?.termsConditions ?? '',
    });
    setShowEdit(true);
  };

  const openPayment = () => {
    payForm.reset({
      paymentDate:   new Date().toISOString().split('T')[0],
      paymentMethod: 'BANK_TRANSFER',
      amount:        invoice ? Number(invoice.balanceAmount) : 0,
    });
    setShowPayment(true);
  };

  // ── Loading / Not found ───────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }} />
      </div>
    );
  }
  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <AlertCircle size={40} className="mb-4" style={{ color: 'rgba(255,255,255,0.15)' }} />
        <p className="text-sm" style={{ color: 'var(--wz-text-muted)' }}>Invoice not found</p>
        <button onClick={() => router.back()} className="btn-secondary mt-4 flex items-center gap-2">
          <ArrowLeft size={14} /> Go back
        </button>
      </div>
    );
  }

  const st = STATUS_CFG[invoice.status] ?? STATUS_CFG.DRAFT;
  const payments: any[] = invoice.payments ?? [];
  const canPay    = !['PAID', 'CANCELLED'].includes(invoice.status);
  const canSend   = ['DRAFT', 'SENT'].includes(invoice.status);
  const canCancel = !['PAID', 'CANCELLED'].includes(invoice.status);

  const docData = {
    type: 'invoice' as const,
    no: invoice.invoiceNo,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    status: invoice.status,
    client: invoice.client,
    tender: invoice.tender,
    lineItems: invoice.lineItems ?? [],
    subtotal: invoice.subtotal,
    discount: invoice.discount,
    taxableAmount: invoice.taxableAmount,
    cgstAmount: invoice.cgstAmount,
    sgstAmount: invoice.sgstAmount,
    igstAmount: invoice.igstAmount,
    totalAmount: invoice.totalAmount,
    paidAmount: invoice.paidAmount,
    balanceAmount: invoice.balanceAmount,
    notes: invoice.notes,
    termsConditions: invoice.termsConditions,
  };

  return (
    <>
      {/* ── Edit Modal ── */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Invoice">
        <form onSubmit={editForm.handleSubmit(d => updateMut.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <F label="Issue Date *" error={editForm.formState.errors.issueDate?.message}>
              <input {...editForm.register('issueDate')} type="date" className="input-field w-full" />
            </F>
            <F label="Due Date *" error={editForm.formState.errors.dueDate?.message}>
              <input {...editForm.register('dueDate')} type="date" className="input-field w-full" />
            </F>
          </div>
          <F label="Notes">
            <textarea {...editForm.register('notes')} rows={3} className="input-field w-full resize-none" placeholder="Payment terms, notes..." />
          </F>
          <F label="Terms & Conditions">
            <textarea {...editForm.register('termsConditions')} rows={3} className="input-field w-full resize-none" placeholder="Terms..." />
          </F>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => setShowEdit(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={updateMut.isPending} className="btn-primary flex items-center gap-2">
              <Save size={13} /> {updateMut.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Payment Modal ── */}
      <Modal open={showPayment} onClose={() => setShowPayment(false)} title="Record Payment">
        <form onSubmit={payForm.handleSubmit(d => paymentMut.mutate(d))} className="space-y-4">
          <div className="p-3 rounded-xl mb-1" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Balance outstanding</p>
            <p className="text-xl font-bold" style={{ color: '#10b981', fontFamily: 'Plus Jakarta Sans' }}>
              {formatCurrency(Number(invoice.balanceAmount))}
            </p>
          </div>
          <F label="Amount (₹) *" error={payForm.formState.errors.amount?.message}>
            <input {...payForm.register('amount')} type="number" step="0.01" className="input-field w-full" />
          </F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Payment Date *" error={payForm.formState.errors.paymentDate?.message}>
              <input {...payForm.register('paymentDate')} type="date" className="input-field w-full" />
            </F>
            <F label="Method *" error={payForm.formState.errors.paymentMethod?.message}>
              <select {...payForm.register('paymentMethod')} className="input-field w-full">
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
              </select>
            </F>
          </div>
          <F label="Reference No.">
            <input {...payForm.register('referenceNo')} className="input-field w-full" placeholder="UTR / Cheque No." />
          </F>
          <F label="Notes">
            <input {...payForm.register('notes')} className="input-field w-full" placeholder="Optional note" />
          </F>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => setShowPayment(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={paymentMut.isPending} className="btn-primary flex items-center gap-2">
              <CheckCircle2 size={13} /> {paymentMut.isPending ? 'Recording…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Credit Note Modal ── */}
      <Modal open={showCreditNote} onClose={() => setShowCreditNote(false)} title="Create Credit Note">
        <form onSubmit={creditForm.handleSubmit(d => creditMut.mutate(d))} className="space-y-4">
          <F label="Description *" error={creditForm.formState.errors.description?.message}>
            <input {...creditForm.register('description')} className="input-field w-full" placeholder="Reason for credit..." />
          </F>
          <F label="Amount (₹) *" error={creditForm.formState.errors.amount?.message}>
            <input {...creditForm.register('amount')} type="number" step="0.01" className="input-field w-full" />
          </F>
          <F label="Notes">
            <textarea {...creditForm.register('notes')} rows={2} className="input-field w-full resize-none" />
          </F>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => setShowCreditNote(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={creditMut.isPending} className="btn-primary flex items-center gap-2">
              <Minus size={13} /> {creditMut.isPending ? 'Creating…' : 'Create Credit Note'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Page ── */}
      <div className="space-y-5">
        {/* Back */}
        <button onClick={() => router.back()}
          className="flex items-center gap-2 text-sm transition-colors"
          style={{ color: 'var(--wz-text-muted)' }}
          onMouseOver={e => e.currentTarget.style.color = 'var(--wz-text-secondary)'}
          onMouseOut={e => e.currentTarget.style.color = 'var(--wz-text-muted)'}>
          <ArrowLeft size={15} /> Invoices
        </button>

        {/* ── Hero card ── */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden">
          <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#6366f1,#3b82f6,#10b981)' }} />

          <div className="p-6 flex flex-col sm:flex-row gap-4 items-start">
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.18),rgba(59,130,246,0.1))', border: '1.5px solid rgba(99,102,241,0.2)' }}>
              <Receipt size={20} style={{ color: '#818cf8' }} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>
                  {invoice.invoiceNo}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: st.bg, color: st.color, border: `1px solid ${st.ring}` }}>
                  {st.label}
                </span>
              </div>
              <p className="text-sm mb-3" style={{ color: 'var(--wz-text-secondary)' }}>
                {invoice.client?.name ?? '—'}
                {invoice.tender && <span style={{ color: 'var(--wz-text-muted)' }}> · {invoice.tender.tenderName}</span>}
              </p>
              <div className="flex flex-wrap gap-4 text-xs" style={{ color: 'var(--wz-text-muted)' }}>
                <span className="flex items-center gap-1.5"><Calendar size={11} /> Issue: {formatDate(invoice.issueDate)}</span>
                {invoice.dueDate && <span className="flex items-center gap-1.5"><Clock size={11} /> Due: {formatDate(invoice.dueDate)}</span>}
                <span className="flex items-center gap-1.5">
                  <DollarSign size={11} />
                  <span style={{ color: '#10b981', fontWeight: 600 }}>{formatCurrency(Number(invoice.totalAmount))}</span>
                </span>
                {Number(invoice.balanceAmount) > 0 && (
                  <span className="flex items-center gap-1.5">
                    <AlertCircle size={11} style={{ color: '#f59e0b' }} />
                    <span style={{ color: '#f59e0b' }}>{formatCurrency(Number(invoice.balanceAmount))} outstanding</span>
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 flex-shrink-0">
              {canSend && (
                <button onClick={() => statusMut.mutate('SENT')} disabled={statusMut.isPending}
                  className="btn-secondary flex items-center gap-1.5 text-xs">
                  <Send size={12} /> Mark Sent
                </button>
              )}
              {canPay && (
                <button onClick={openPayment}
                  className="btn-primary flex items-center gap-1.5 text-xs" style={{ background: '#10b981' }}>
                  <CreditCard size={12} /> Record Payment
                </button>
              )}
              <button onClick={() => router.push(`/billing/invoices/${id}/edit`)}
                className="btn-primary flex items-center gap-1.5 text-xs">
                <PenLine size={12} /> Edit Invoice
              </button>
              {canCancel && (
                <button onClick={() => { if (confirm('Cancel this invoice?')) statusMut.mutate('CANCELLED'); }}
                  className="btn-secondary flex items-center gap-1.5 text-xs" style={{ color: '#f43f5e' }}>
                  <X size={12} /> Cancel
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 px-6 overflow-x-auto" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold transition-all relative whitespace-nowrap"
                  style={{ color: active ? '#818cf8' : 'var(--wz-text-muted)' }}>
                  <tab.icon size={13} />
                  {tab.label}
                  {tab.id === 'payments' && payments.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>{payments.length}</span>
                  )}
                  {active && (
                    <motion.div layoutId="inv-tab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                      style={{ background: 'linear-gradient(90deg,#6366f1,#3b82f6)' }} />
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Tab content ── */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>

            {/* DETAILS */}
            {activeTab === 'details' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Invoice summary */}
                <div className="lg:col-span-2 glass-card overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#6366f1' }}>Line Items</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          {['Description', 'HSN', 'Qty', 'Rate', 'Tax%', 'Amount'].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider"
                              style={{ color: 'var(--wz-text-muted)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(invoice.lineItems ?? []).length === 0 ? (
                          <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--wz-text-muted)' }}>No line items</td></tr>
                        ) : (invoice.lineItems ?? []).map((item: any, i: number) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td className="px-4 py-3 text-sm" style={{ color: 'var(--wz-text-primary)' }}>{item.description}</td>
                            <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--wz-text-muted)' }}>{item.hsn ?? '—'}</td>
                            <td className="px-4 py-3 text-sm" style={{ color: 'var(--wz-text-secondary)' }}>{item.quantity}</td>
                            <td className="px-4 py-3 text-sm" style={{ color: 'var(--wz-text-secondary)' }}>{formatCurrency(Number(item.rate))}</td>
                            <td className="px-4 py-3 text-sm" style={{ color: 'var(--wz-text-muted)' }}>{item.taxRate}%</td>
                            <td className="px-4 py-3 text-sm font-semibold" style={{ color: 'var(--wz-text-primary)' }}>{formatCurrency(Number(item.amount))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Totals */}
                  <div className="px-5 py-4 space-y-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.015)' }}>
                    {[
                      { label: 'Subtotal', val: Number(invoice.subtotal) },
                      { label: 'Discount', val: -Number(invoice.discount ?? 0) },
                      { label: 'Taxable Amount', val: Number(invoice.taxableAmount) },
                      { label: 'CGST', val: Number(invoice.cgstAmount) },
                      { label: 'SGST', val: Number(invoice.sgstAmount) },
                      ...(Number(invoice.igstAmount) > 0 ? [{ label: 'IGST', val: Number(invoice.igstAmount) }] : []),
                    ].map(r => (
                      <div key={r.label} className="flex justify-between text-sm">
                        <span style={{ color: 'var(--wz-text-muted)' }}>{r.label}</span>
                        <span style={{ color: 'var(--wz-text-secondary)' }}>{formatCurrency(r.val)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-base font-bold pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ color: 'var(--wz-text-primary)' }}>Total</span>
                      <span style={{ color: '#10b981' }}>{formatCurrency(Number(invoice.totalAmount))}</span>
                    </div>
                    {Number(invoice.paidAmount) > 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span style={{ color: 'var(--wz-text-muted)' }}>Paid</span>
                          <span style={{ color: '#10b981' }}>-{formatCurrency(Number(invoice.paidAmount))}</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold">
                          <span style={{ color: 'var(--wz-text-muted)' }}>Balance</span>
                          <span style={{ color: '#f59e0b' }}>{formatCurrency(Number(invoice.balanceAmount))}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Sidebar info */}
                <div className="space-y-4">
                  {/* Client */}
                  <div className="glass-card p-4 space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#3b82f6' }}>Client</p>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                        <Building2 size={15} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--wz-text-primary)' }}>{invoice.client?.name ?? '—'}</p>
                        {invoice.client?.gstin && <p className="text-xs" style={{ color: 'var(--wz-text-muted)' }}>GSTIN: {invoice.client.gstin}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {(invoice.notes || invoice.termsConditions) && (
                    <div className="glass-card p-4 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--wz-text-muted)' }}>Notes & Terms</p>
                      {invoice.notes && <p className="text-xs leading-relaxed" style={{ color: 'var(--wz-text-secondary)' }}>{invoice.notes}</p>}
                      {invoice.termsConditions && <p className="text-xs leading-relaxed" style={{ color: 'var(--wz-text-muted)' }}>{invoice.termsConditions}</p>}
                    </div>
                  )}

                  {/* Quick actions */}
                  <div className="glass-card p-4 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--wz-text-muted)' }}>Actions</p>
                    <button onClick={() => router.push(`/billing/invoices/${id}/edit`)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors"
                      style={{ background: 'rgba(99,102,241,0.08)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.15)' }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(99,102,241,0.15)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}>
                      <PenLine size={13} /> Edit Invoice
                    </button>
                    {canPay && (
                      <button onClick={openPayment} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors"
                        style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.15)' }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(16,185,129,0.15)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(16,185,129,0.08)'}>
                        <CreditCard size={13} /> Record Payment
                      </button>
                    )}
                    <button onClick={() => setShowCreditNote(true)} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors"
                      style={{ background: 'rgba(245,158,11,0.06)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.12)' }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(245,158,11,0.12)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(245,158,11,0.06)'}>
                      <Minus size={13} /> Credit Note
                    </button>
                    <button onClick={() => setActiveTab('preview')} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors"
                      style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--wz-text-secondary)', border: '1px solid rgba(255,255,255,0.06)' }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}>
                      <Printer size={13} /> Print / Download
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* PAYMENTS */}
            {activeTab === 'payments' && (
              <div className="glass-card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <h3 className="font-semibold text-sm" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>
                    Payment History
                  </h3>
                  {canPay && (
                    <button onClick={openPayment} className="btn-primary flex items-center gap-1.5 text-xs">
                      <CreditCard size={12} /> Record Payment
                    </button>
                  )}
                </div>
                {payments.length ? (
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        {['Date', 'Amount', 'Method', 'Reference', 'Notes'].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider"
                            style={{ color: 'var(--wz-text-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p: any) => (
                        <tr key={p.id} className="hover:bg-white/[0.015] transition-colors"
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--wz-text-secondary)' }}>{formatDate(p.paymentDate)}</td>
                          <td className="px-5 py-3.5 text-sm font-bold" style={{ color: '#10b981' }}>{formatCurrency(Number(p.amount))}</td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs px-2 py-0.5 rounded-lg font-medium"
                              style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>
                              {p.paymentMethod?.replace(/_/g, ' ') ?? '—'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-sm font-mono" style={{ color: 'var(--wz-text-muted)' }}>{p.referenceNo ?? '—'}</td>
                          <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--wz-text-muted)' }}>{p.notes ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-24">
                    <CreditCard size={40} className="mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                    <p className="text-sm font-medium mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>No payments recorded</p>
                    {canPay && (
                      <button onClick={openPayment} className="btn-primary flex items-center gap-2">
                        <CreditCard size={13} /> Record First Payment
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* PREVIEW */}
            {activeTab === 'preview' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between glass-card p-4">
                  <div className="flex gap-1">
                    {(['classic', 'modern'] as const).map(t => (
                      <button key={t} onClick={() => setTemplate(t)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                        style={{
                          background: template === t ? 'rgba(99,102,241,0.2)' : 'transparent',
                          color: template === t ? '#818cf8' : 'var(--wz-text-muted)',
                        }}>
                        {t}
                      </button>
                    ))}
                  </div>
                  <DocumentActions
                    documentRef={docRef}
                    documentNo={invoice.invoiceNo}
                    onSendWhatsApp={(phone, message) => sendWaMut.mutateAsync({ phone, message })}
                    clientPhone={invoice.client?.phone}
                  />
                </div>
                <div className="rounded-2xl overflow-hidden shadow-2xl">
                  {template === 'classic'
                    ? <TemplateClassic ref={docRef} data={docData} />
                    : <TemplateModern ref={docRef} data={docData} />}
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      <style>{`@media print { header,nav,aside,.no-print{display:none!important} }`}</style>
    </>
  );
}
