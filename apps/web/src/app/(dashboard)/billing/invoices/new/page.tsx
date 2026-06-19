'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { billingApi, clientsApi, tendersApi } from '@/lib/api';
import { LineItemsEditor } from '@/components/billing/LineItemsEditor';

const schema = z.object({
  clientId: z.string().min(1, 'Select a client'),
  tenderId: z.string().optional(),
  issueDate: z.string().min(1, 'Required'),
  dueDate: z.string().min(1, 'Required'),
  notes: z.string().optional(),
  termsConditions: z.string().optional(),
  lineItems: z.array(z.object({
    description: z.string().min(1, 'Required'),
    hsn: z.string().optional(),
    quantity: z.number().min(0.01, 'Required'),
    rate: z.number().min(0, 'Required'),
    taxRate: z.number().default(18),
  })).min(1, 'Add at least one line item'),
});
type FormValues = z.infer<typeof schema>;

const F = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div>
    <label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</label>
    {children}
    {error && <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>{error}</p>}
  </div>
);

export default function NewInvoicePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const now = new Date();

  const { control, register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: '', tenderId: '',
      issueDate: now.toISOString().split('T')[0],
      dueDate: new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0],
      notes: '', termsConditions: '',
      lineItems: [{ description: '', hsn: '', quantity: 1, rate: 0, taxRate: 18 }],
    },
  });

  const { data: clients = [] } = useQuery({ queryKey: ['clients-select-all'], queryFn: clientsApi.selectAll });
  const { data: tenders = [] } = useQuery({ queryKey: ['tenders-select-all'], queryFn: tendersApi.selectAll });

  const createMut = useMutation({
    mutationFn: (values: FormValues) => {
      const items = values.lineItems.map(item => {
        const amount = item.quantity * item.rate;
        const taxAmount = (amount * item.taxRate) / 100;
        return { ...item, amount, taxAmount };
      });
      const subtotal = items.reduce((s, i) => s + i.amount, 0);
      const totalTax = items.reduce((s, i) => s + i.taxAmount, 0);
      const cgst = totalTax / 2;
      return billingApi.create({
        clientId: values.clientId,
        tenderId: values.tenderId || undefined,
        issueDate: values.issueDate,
        dueDate: values.dueDate,
        notes: values.notes,
        termsConditions: values.termsConditions,
        subtotal, discount: 0, taxableAmount: subtotal,
        cgstAmount: cgst, sgstAmount: cgst, igstAmount: 0,
        totalAmount: subtotal + totalTax,
        paidAmount: 0, balanceAmount: subtotal + totalTax,
        status: 'DRAFT',
        lineItems: items,
      });
    },
    onSuccess: (inv: any) => {
      toast.success('Invoice created');
      qc.invalidateQueries({ queryKey: ['invoices'] });
      router.push(`/billing/invoices/${inv.id}`);
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed to create invoice'),
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-white/5" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>New Invoice</h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Create a detailed invoice with line items</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(d => createMut.mutate(d))} className="space-y-5">
        {/* Client + Tender */}
        <div className="glass-card p-5 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#6366f1' }}>Invoice Details</p>
          <div className="grid grid-cols-2 gap-4">
            <F label="Client *" error={errors.clientId?.message}>
              <select {...register('clientId')} className="input-field w-full">
                <option value="">Select client</option>
                {(clients as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </F>
            <F label="Linked Tender">
              <select {...register('tenderId')} className="input-field w-full">
                <option value="">None</option>
                {(tenders as any[]).map((t: any) => <option key={t.id} value={t.id}>{t.tenderName}</option>)}
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

        {/* Line Items */}
        <div className="glass-card p-5 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#10b981' }}>Line Items</p>
          {errors.lineItems && <p className="text-xs" style={{ color: '#f43f5e' }}>{(errors.lineItems as any)?.message ?? 'Check line items'}</p>}
          <LineItemsEditor control={control} watch={watch} />
        </div>

        {/* Notes + Terms */}
        <div className="glass-card p-5 grid grid-cols-2 gap-4">
          <F label="Notes">
            <textarea {...register('notes')} rows={3} className="input-field w-full resize-none" placeholder="Payment terms, notes..." />
          </F>
          <F label="Terms & Conditions">
            <textarea {...register('termsConditions')} rows={3} className="input-field w-full resize-none" placeholder="Terms..." />
          </F>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => router.back()} className="btn-secondary px-6">Cancel</button>
          <button type="submit" disabled={createMut.isPending} className="btn-primary px-8 flex items-center gap-2">
            <Save size={14} /> {createMut.isPending ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}
