'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { complaintsApi, api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'LABOUR_HR', label: 'Labour / HR — Dispute, misconduct, absenteeism, harassment' },
  { value: 'SAFETY', label: 'Safety — Accident, near-miss, unsafe equipment, hazard' },
  { value: 'OPERATIONS', label: 'Operations — Material shortage, breakdown, work stoppage' },
  { value: 'COMPLIANCE', label: 'Compliance — Contractor violation, document expiry, labour law' },
  { value: 'CLIENT_SITE', label: 'Client / Site — Client complaint, scope change, access problem' },
  { value: 'RESOURCE', label: 'Resource — Headcount shortage, skill gap, overtime overrun' },
];
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

interface Props { onSuccess?: () => void; }

export function ComplaintForm({ onSuccess }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<any>();
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');
  const [siteId, setSiteId] = useState('');
  const qc = useQueryClient();

  const { data: sites } = useQuery({ queryKey: ['sites'], queryFn: () => api.get('/sites').then(r => r.data.data) });

  const mutation = useMutation({
    mutationFn: (data: any) => complaintsApi.create({ ...data, category, severity, siteId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['complaints'] }); toast.success('Complaint submitted'); onSuccess?.(); },
    onError: () => toast.error('Failed to submit complaint'),
  });

  return (
    <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
      <div>
        <Label>Site</Label>
        <Select onValueChange={setSiteId}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Select site" /></SelectTrigger>
          <SelectContent>{(sites ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Category</Label>
        <Select onValueChange={setCategory}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Severity</Label>
        <Select defaultValue="MEDIUM" onValueChange={setSeverity}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Title</Label>
        <Input {...register('title', { required: true })} placeholder="Brief summary of the issue" />
        {errors.title && <p className="text-xs text-destructive mt-1">Title is required</p>}
      </div>
      <div>
        <Label>Description</Label>
        <Textarea {...register('description', { required: true })} rows={4} placeholder="Provide full details of the complaint..." />
        {errors.description && <p className="text-xs text-destructive mt-1">Description is required</p>}
      </div>
      <Button type="submit" disabled={mutation.isPending} className="w-full">
        {mutation.isPending ? 'Submitting...' : 'Submit Complaint'}
      </Button>
    </form>
  );
}
