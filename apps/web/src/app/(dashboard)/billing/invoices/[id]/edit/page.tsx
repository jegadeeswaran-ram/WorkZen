'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { billingApi, clientsApi, tendersApi } from '@/lib/api';
import { LineItemsEditor } from '@/components/billing/LineItemsEditor';
import { formatCurrency } from '@/lib/utils';

// ── Schema ────────────────────────────────────────────────────────────────────
const schema = z.object({
  clientId:        z.string().min(1, 'Select a client'),
  tenderId:        z.string().optional(),
  issueDate:       z.string().min(1, 'Required'),
  dueDate:         z.string().min(1, 'Required'),
  discount:        z.coerce.number().min(0).default(0),
  notes:           z.string().optional(),
  termsConditions: z.string().optional(),
  lineItems: z.array(z.object({
    description: z.string().min(1, 'Description required'),
    hsn:         z.string().optional(),
    quantity:    z.number().min(0.01, 'Required'),
    rate:        z.number().min(0, 'Required'),
    taxRate:     z.number().default(18),
  })).min(1, 'Add at least one line item'),
});
type FormValues = z.infer<typeof schema>;

// ── Field wrapper ─────────────────────────────────────────────────────────────
function F({ label, error, children, span2 }: {
  label: string; error?: string; children: React.ReactNode; span2?: boolean;
}) {
  return (
    <div className={span2 ? 'col-span-2' : ''}>
      <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>{label}</label>
      {children}
      {error && <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>{error}</p>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function EditInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  // ── Fetch existing invoice ───────────────────────────────────────────────
  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => billingApi.invoice(id),
    enabled: !!id,
  });

  const { data: clients = [] } = useQuery({ queryKey: ['clients-select-all'], queryFn: clientsApi.selectAll });
  const { data: tenders = [] } = useQuery({ queryKey: ['tenders-select-all'], queryFn: tendersApi.selectAll });

  // ── Form ─────────────────────────────────────────────────────────────────
  const { control, register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: '', tenderId: '', issueDate: '', dueDate: '',
      discount: 0, notes: '', termsConditions: '',
      lineItems: [{ description: '', hsn: '', quantity: 1, rate: 0, taxRate: 18 }],
    },
  });

  // Pre-populate once invoice loads
  useEffect(() => {
    if (!invoice) return;
    reset({
      clientId:        invoice.clientId ?? '',
      tenderId:        invoice.tenderId ?? '',
      issueDate:       invoice.issueDate ? String(invoice.issueDate).split('T')[0] : '',
      dueDate:         invoice.dueDate   ? String(invoice.dueDate).split('T')[0]   : '',
      discount:        Number(invoice.discount ?? 0),
      notes:           invoice.notes ?? '',
      termsConditions: invoice.termsConditions ?? '',
      lineItems: (invoice.lineItems ?? []).length > 0
        ? (invoice.lineItems ?? []).map((li: any) => ({
            description: li.description ?? '',
            hsn:         li.hsn ?? '',
            quantity:    Number(li.quantity),
            rate:        Number(li.rate),
            taxRate:     Number(li.taxRate),
          }))
        : [{ description: '', hsn: '', quantity: 1, rate: 0, taxRate: 18 }],
    });
  }, [invoice, reset]);

  // ── Save mutation ─────────────────────────────────────────────────────────
  const saveMut = useMutation({
    mutationFn: (values: FormValues) =>
      billingApi.update(id, {
        clientId:        values.clientId,
        tenderId:        values.tenderId || undefined,
        issueDate:       values.issueDate,
        dueDate:         values.dueDate,
        discount:        values.discount,
        notes:           values.notes,
        termsConditions: values.termsConditions,
        lineItems:       values.lineItems,
      }),
    onSuccess: () => {
      toast.success('Invoice updated successfully');
      qc.invalidateQueries({ queryKey: ['invoice', id] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      router.push(`/billing/invoices/${id}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Failed to save invoice'),
  });

  // ── Live totals preview ───────────────────────────────────────────────────
  const watchedItems = watch('lineItems') ?? [];
  const watchedDiscount = watch('discount') ?? 0;
  const subtotal = watchedItems.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.rate) || 0), 0);
  const totalTax = watchedItems.reduce((s, i) => {
    const amt = (Number(i.quantity) || 0) * (Number(i.rate) || 0);
    return s + (amt * (Number(i.taxRate) || 0)) / 100;
  }, 0);
  const taxableAmount = subtotal - Number(watchedDiscount);
  const grandTotal = taxableAmount + totalTax;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }} />
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          style={{ color: 'var(--wz-text-muted)' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>
            Edit Invoice
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--wz-text-muted)' }}>
            {invoice.invoiceNo} · {invoice.client?.name}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(d => saveMut.mutate(d))} className="space-y-5">

        {/* ── Client & Tender ── */}
        <div className="glass-card p-5 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#6366f1' }}>Invoice Details</p>
          <div className="grid grid-cols-2 gap-4">
            <F label="Client *" error={errors.clientId?.message}>
              <select {...register('clientId')} className="input-field w-full">
                <option value="">Select client</option>
                {(clients as any[]).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </F>
            <F label="Linked Tender">
              <select {...register('tenderId')} className="input-field w-full">
                <option value="">None</option>
                {(tenders as any[]).map((t: any) => (
                  <option key={t.id} value={t.id}>{t.tenderName}</option>
                ))}
              </select>
            </F>
            <F label="Issue Date *" error={errors.issueDate?.message}>
              <input {...register('issueDate')} type="date" className="input-field w-full" />
            </F>
            <F label="Due Date *" error={errors.dueDate?.message}>
              <input {...register('dueDate')} type="date" className="input-field w-full" />
            </F>
          </div>
        </div>

        {/* ── Line Items ── */}
        <div className="glass-card p-5 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#10b981' }}>Line Items</p>
          {errors.lineItems && (
            <p className="text-xs" style={{ color: '#f43f5e' }}>
              {(errors.lineItems as any)?.message ?? 'Check line items'}
            </p>
          )}
          <LineItemsEditor control={control} watch={watch} />
        </div>

        {/* ── Discount & Totals ── */}
        <div className="glass-card p-5 grid grid-cols-2 gap-6 items-start">
          <div className="space-y-3">
            <F label="Discount (₹)" error={errors.discount?.message}>
              <input {...register('discount')} type="number" step="0.01" min="0"
                className="input-field w-full" placeholder="0.00" />
            </F>
          </div>

          {/* Live totals */}
          <div className="rounded-xl p-4 space-y-2"
            style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: '#818cf8' }}>Summary</p>
            {[
              { label: 'Subtotal',       val: subtotal,       color: 'var(--wz-text-primary)' },
              { label: 'Discount',       val: -Number(watchedDiscount), color: '#f43f5e' },
              { label: 'Taxable Amount', val: taxableAmount,  color: 'var(--wz-text-secondary)' },
              { label: 'CGST (9%)',      val: totalTax / 2,   color: '#818cf8' },
              { label: 'SGST (9%)',      val: totalTax / 2,   color: '#818cf8' },
            ].map(r => (
              <div key={r.label} className="flex justify-between text-xs">
                <span style={{ color: 'var(--wz-text-muted)' }}>{r.label}</span>
                <span style={{ color: r.color }}>{formatCurrency(r.val)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-bold pt-2"
              style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ color: 'var(--wz-text-primary)' }}>Grand Total</span>
              <span style={{ color: '#10b981' }}>{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* ── Notes & Terms ── */}
        <div className="glass-card p-5 grid grid-cols-2 gap-4">
          <F label="Notes">
            <textarea {...register('notes')} rows={4} className="input-field w-full resize-none"
              placeholder="Payment terms, special instructions..." />
          </F>
          <F label="Terms & Conditions">
            <textarea {...register('termsConditions')} rows={4} className="input-field w-full resize-none"
              placeholder="Standard terms and conditions..." />
          </F>
        </div>

        {/* ── Action bar ── */}
        <div className="glass-card p-4 flex items-center justify-between">
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: 'var(--wz-text-muted)' }}>
              Total: <strong style={{ color: '#10b981' }}>{formatCurrency(grandTotal)}</strong>
            </span>
            <button type="submit" disabled={saveMut.isPending}
              className="btn-primary flex items-center gap-2 px-8">
              <Save size={14} />
              {saveMut.isPending ? 'Saving…' : 'Save Invoice'}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
