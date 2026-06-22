'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Save, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { tendersApi, clientsApi } from '@/lib/api';

const schema = z.object({
  tenderName: z.string().min(2, 'Tender name required'),
  tenderNumber: z.string().optional(),
  tenderValue: z.coerce.number().min(1, 'Tender value required'),
  departmentId: z.string().optional(),
  status: z.string().optional(),
  contractType: z.string().optional(),
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
interface Props { open: boolean; onClose: () => void; tender?: Record<string, any> | null; clientsAll?: any[]; }

export function CreateTenderModal({ open, onClose, tender, clientsAll = [] }: Props) {
  const qc = useQueryClient();

  const { data: fetchedClients, isLoading: clientsLoading, isError: clientsError, refetch: refetchClients } = useQuery({
    queryKey: ['clients-select-all'],
    queryFn: clientsApi.selectAll,
    staleTime: 5 * 60_000,
    retry: 2,
    enabled: open,
  });

  // Merge fetched + prop fallback; prop comes from the page's own pre-load
  const clients: any[] = (fetchedClients as any[] | undefined)?.length
    ? (fetchedClients as any[])
    : clientsAll;

  // Only show error/loading state when we truly have no clients to display
  const noData = clients.length === 0;

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (tender) {
      reset({
        tenderName: tender.tenderName ?? '',
        tenderNumber: tender.tenderNumber ?? '',
        tenderValue: Number(tender.tenderValue) || 0,
        departmentId: tender.departmentId ?? '',
        status: tender.status ?? 'DRAFT',
        contractType: tender.contractType ?? '',
        bidDate: tender.bidDate?.split('T')[0] ?? '',
        awardDate: tender.awardDate?.split('T')[0] ?? '',
        startDate: tender.startDate?.split('T')[0] ?? '',
        endDate: tender.endDate?.split('T')[0] ?? '',
        requiredEmployees: tender.requiredEmployees ?? 0,
        emdAmount: Number(tender.emdAmount) || 0,
        securityDeposit: Number(tender.securityDeposit) || 0,
        description: tender.description ?? '',
      });
    } else {
      reset({ status: 'DRAFT', contractType: 'FIXED_TERM' });
    }
  }, [tender, reset, open]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload: Record<string, unknown> = {};
      Object.entries(data).forEach(([k, v]) => {
        if (v !== '' && v !== undefined && v !== 0) payload[k] = v;
        else if (k === 'tenderValue') payload[k] = v; // always include
      });
      return tender ? tendersApi.update(tender.id, payload) : tendersApi.create(payload);
    },
    onSuccess: () => {
      toast.success(tender ? 'Tender updated' : 'Tender created successfully');
      qc.invalidateQueries({ queryKey: ['tenders'] });
      qc.invalidateQueries({ queryKey: ['tender-dash'] });
      onClose();
      reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed to save tender'),
  });

  if (!open) return null;

  const F = ({ label, required, error, children, span2 }: { label: string; required?: boolean; error?: string; children: React.ReactNode; span2?: boolean }) => (
    <div className={span2 ? 'col-span-2' : ''}>
      <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>
        {label}{required && <span style={{ color: '#f43f5e' }}> *</span>}
      </label>
      {children}
      {error && <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>{error}</p>}
    </div>
  );

  const Section = ({ color, children }: { color: string; children: React.ReactNode }) => (
    <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color }}>{children}</p>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: 'var(--wz-card-bg)', border: '1px solid var(--wz-card-border)' }}>

        <div className="flex items-center justify-between p-6 sticky top-0 z-10"
          style={{ background: 'var(--wz-card-bg)', borderBottom: '1px solid var(--wz-card-border)' }}>
          <div>
            <h3 className="font-semibold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>
              {tender ? 'Edit Tender' : 'New Tender'}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--wz-text-muted)' }}>
              {tender ? `Editing: ${tender.tenderName}` : 'Fill in tender details below'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
            <X size={18} style={{ color: 'var(--wz-text-muted)' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="p-6 space-y-5">
          <Section color="#6366f1">Tender Information</Section>
          <div className="grid grid-cols-2 gap-4">
            <F label="Tender Name" required error={errors.tenderName?.message} span2>
              <input {...register('tenderName')} className="input-field w-full"
                placeholder="Security Services at NHAI Headquarters" />
            </F>
            <F label="Tender Number (auto-generated if blank)">
              <input {...register('tenderNumber')} className="input-field w-full" placeholder="TND2026-00001" />
            </F>
            <F label="Tender Value (₹)" required error={errors.tenderValue?.message}>
              <input {...register('tenderValue')} type="number" className="input-field w-full" placeholder="5000000" />
            </F>
            <F label="Client / Department">
              <div className="relative">
                <select {...register('departmentId')} className="input-field w-full pr-8"
                  disabled={clientsLoading && noData}>
                  <option value="">
                    {clientsLoading && noData
                      ? 'Loading clients…'
                      : clientsError && noData
                      ? 'Error loading clients'
                      : noData
                      ? 'No clients — create one first'
                      : 'Select client'}
                  </option>
                  {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {clientsLoading && noData && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin" style={{ color: 'var(--wz-text-muted)', pointerEvents: 'none' }} />}
                {clientsError && noData && !clientsLoading && (
                  <button type="button" onClick={() => refetchClients()} title="Retry" className="absolute right-3 top-1/2 -translate-y-1/2">
                    <AlertCircle size={13} style={{ color: '#f59e0b' }} />
                  </button>
                )}
              </div>
            </F>
            <F label="Status">
              <select {...register('status')} className="input-field w-full">
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="UNDER_EVALUATION">Under Evaluation</option>
                <option value="AWARDED">Awarded</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </F>
            <F label="Contract Type">
              <select {...register('contractType')} className="input-field w-full">
                <option value="">Select type</option>
                <option value="FIXED_TERM">Fixed Term</option>
                <option value="OPEN_ENDED">Open Ended</option>
                <option value="ANNUAL">Annual</option>
                <option value="MULTI_YEAR">Multi-Year</option>
              </select>
            </F>
            <F label="Required Employees">
              <input {...register('requiredEmployees')} type="number" className="input-field w-full" placeholder="50" />
            </F>
          </div>

          <Section color="#3b82f6">Key Dates</Section>
          <div className="grid grid-cols-2 gap-4">
            <F label="Bid Submission Date">
              <input {...register('bidDate')} type="date" className="input-field w-full" />
            </F>
            <F label="Award Date">
              <input {...register('awardDate')} type="date" className="input-field w-full" />
            </F>
            <F label="Contract Start Date">
              <input {...register('startDate')} type="date" className="input-field w-full" />
            </F>
            <F label="Contract End Date">
              <input {...register('endDate')} type="date" className="input-field w-full" />
            </F>
          </div>

          <Section color="#10b981">Financial Details</Section>
          <div className="grid grid-cols-2 gap-4">
            <F label="EMD Amount (₹)">
              <input {...register('emdAmount')} type="number" className="input-field w-full" placeholder="100000" />
            </F>
            <F label="Security Deposit (₹)">
              <input {...register('securityDeposit')} type="number" className="input-field w-full" placeholder="250000" />
            </F>
          </div>

          <F label="Description / Scope of Work">
            <textarea {...register('description')} rows={3} className="input-field w-full resize-none"
              placeholder="Provide security services at the client premises including 24/7 guarding..." />
          </F>

          <div className="flex gap-3 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <button type="submit" className="btn-primary flex-1" disabled={mutation.isPending}>
              <Save size={14} />
              {mutation.isPending ? 'Saving...' : tender ? 'Update Tender' : 'Create Tender'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
