'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { clientsApi } from '@/lib/api';

const schema = z.object({
  name: z.string().min(2, 'Client name required'),
  clientType: z.enum(['GOVERNMENT_DEPARTMENT', 'PSU', 'PRIVATE_ORGANIZATION', 'MUNICIPAL_BODY']).optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  creditLimit: z.coerce.number().optional(),
  creditPeriod: z.coerce.number().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
  contactDesignation: z.string().optional(),
});

type FormData = z.infer<typeof schema>;
interface Props { open: boolean; onClose: () => void; client?: Record<string, any> | null; }

export function CreateClientModal({ open, onClose, client }: Props) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (client) {
      reset({
        name: client.name ?? '',
        clientType: client.clientType,
        gstin: client.gstin ?? '',
        pan: client.pan ?? '',
        phone: client.phone ?? '',
        email: client.email ?? '',
        address: typeof client.address === 'string' ? client.address : '',
        city: client.city ?? '',
        state: client.state ?? '',
        pincode: client.pincode ?? '',
        creditLimit: client.creditLimit ?? 0,
        creditPeriod: client.paymentTerms ?? 30,
      });
    } else {
      reset({ creditPeriod: 30, clientType: 'GOVERNMENT_DEPARTMENT' });
    }
  }, [client, reset, open]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload: Record<string, unknown> = {};
      Object.entries(data).forEach(([k, v]) => { if (v !== '' && v !== undefined) payload[k] = v; });
      return client ? clientsApi.update(client.id, payload) : clientsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(client ? 'Client updated' : 'Client created');
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['clients-dash'] });
      onClose(); reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed to save'),
  });

  if (!open) return null;

  const F = ({ label, error, children, span2 }: { label: string; error?: string; children: React.ReactNode; span2?: boolean }) => (
    <div className={span2 ? 'col-span-2' : ''}>
      <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>{label}</label>
      {children}
      {error && <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>{error}</p>}
    </div>
  );

  const Section = ({ color, children }: { color: string; children: React.ReactNode }) => (
    <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color }}>{children}</p>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl" style={{ background: 'var(--wz-card-bg)', border: '1px solid var(--wz-card-border)' }}>
        <div className="flex items-center justify-between p-6 sticky top-0 z-10" style={{ background: 'var(--wz-card-bg)', borderBottom: '1px solid var(--wz-card-border)' }}>
          <div>
            <h3 className="font-semibold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>{client ? 'Edit Client' : 'Add New Client'}</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--wz-text-muted)' }}>{client ? `Editing: ${client.name}` : 'Add a government department, PSU, or private client'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5"><X size={18} style={{ color: 'var(--wz-text-muted)' }} /></button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="p-6 space-y-5">
          <Section color="#6366f1">Client Information</Section>
          <div className="grid grid-cols-2 gap-4">
            <F label="Client Name *" error={errors.name?.message} span2>
              <input {...register('name')} className="input-field w-full" placeholder="Ministry of Home Affairs" />
            </F>
            <F label="Client Type">
              <select {...register('clientType')} className="input-field w-full">
                <option value="GOVERNMENT_DEPARTMENT">Government Department</option>
                <option value="PSU">PSU (Public Sector)</option>
                <option value="PRIVATE_ORGANIZATION">Private Organization</option>
                <option value="MUNICIPAL_BODY">Municipal Body</option>
              </select>
            </F>
            <F label="GST Number">
              <input {...register('gstin')} className="input-field w-full" placeholder="27AADCB2230M1ZT" />
            </F>
            <F label="PAN Number">
              <input {...register('pan')} className="input-field w-full" placeholder="AADCB2230M" />
            </F>
            <F label="Phone">
              <input {...register('phone')} className="input-field w-full" placeholder="+91 11 2345 6789" />
            </F>
            <F label="Email">
              <input {...register('email')} type="email" className="input-field w-full" placeholder="procurement@ministry.gov.in" />
            </F>
          </div>

          <Section color="#3b82f6">Address</Section>
          <div className="grid grid-cols-2 gap-4">
            <F label="Street Address" span2>
              <input {...register('address')} className="input-field w-full" placeholder="North Block, New Delhi" />
            </F>
            <F label="City">
              <input {...register('city')} className="input-field w-full" placeholder="New Delhi" />
            </F>
            <F label="State">
              <input {...register('state')} className="input-field w-full" placeholder="Delhi" />
            </F>
            <F label="PIN Code">
              <input {...register('pincode')} className="input-field w-full" placeholder="110001" />
            </F>
          </div>

          <Section color="#10b981">Primary Contact</Section>
          <div className="grid grid-cols-2 gap-4">
            <F label="Contact Name">
              <input {...register('contactName')} className="input-field w-full" placeholder="Rajesh Sharma" />
            </F>
            <F label="Designation">
              <input {...register('contactDesignation')} className="input-field w-full" placeholder="Procurement Officer" />
            </F>
            <F label="Contact Phone">
              <input {...register('contactPhone')} className="input-field w-full" placeholder="+91 98765 43210" />
            </F>
            <F label="Contact Email">
              <input {...register('contactEmail')} className="input-field w-full" placeholder="rajesh@ministry.gov.in" />
            </F>
          </div>

          <Section color="#f59e0b">Payment Terms</Section>
          <div className="grid grid-cols-2 gap-4">
            <F label="Credit Limit (₹)">
              <input {...register('creditLimit')} type="number" className="input-field w-full" placeholder="5000000" />
            </F>
            <F label="Credit Period (days)">
              <input {...register('creditPeriod')} type="number" className="input-field w-full" placeholder="30" />
            </F>
          </div>

          <div className="flex gap-3 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <button type="submit" className="btn-primary flex-1" disabled={mutation.isPending}>
              <Save size={14} /> {mutation.isPending ? 'Saving...' : client ? 'Update Client' : 'Add Client'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
