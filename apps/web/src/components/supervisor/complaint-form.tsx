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
  { value: 'LABOUR_HR', label: 'Labour / HR' },
  { value: 'SAFETY', label: 'Safety' },
  { value: 'OPERATIONS', label: 'Operations' },
  { value: 'COMPLIANCE', label: 'Compliance' },
  { value: 'CLIENT_SITE', label: 'Client / Site' },
  { value: 'RESOURCE', label: 'Resource' },
];
const SEVERITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

interface Props { onSuccess?: () => void; }

export function ComplaintForm({ onSuccess }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<any>();
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');
  const [siteId, setSiteId] = useState('');
  const qc = useQueryClient();

  const { data: sites } = useQuery({
    queryKey: ['sites'],
    queryFn: () => api.get('/deployment/sites').then(r => {
      const d = r.data?.data;
      return Array.isArray(d) ? d : Array.isArray((d as any)?.data) ? (d as any).data : [];
    }),
  });

  const mutation = useMutation({
    mutationFn: (data: any) => complaintsApi.create({ ...data, category, severity, siteId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['complaints'] });
      toast.success('Complaint submitted');
      onSuccess?.();
    },
    onError: () => toast.error('Failed to submit complaint'),
  });

  return (
    <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
      <div>
        <Label>Site</Label>
        <Select onValueChange={setSiteId}>
          <SelectTrigger className="w-full mt-1.5">
            <SelectValue placeholder="Select site" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-60 overflow-y-auto">
            {(sites ?? []).map((s: any) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Category</Label>
        <Select onValueChange={setCategory}>
          <SelectTrigger className="w-full mt-1.5">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent position="popper">
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Severity</Label>
        <Select defaultValue="MEDIUM" onValueChange={setSeverity}>
          <SelectTrigger className="w-full mt-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            {SEVERITIES.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Title</Label>
        <Input
          {...register('title', { required: true })}
          placeholder="Brief summary of the issue"
          className="mt-1.5"
        />
        {errors.title && <p className="text-xs text-destructive mt-1">Title is required</p>}
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          {...register('description', { required: true })}
          rows={4}
          placeholder="Provide full details of the complaint..."
          className="mt-1.5"
        />
        {errors.description && <p className="text-xs text-destructive mt-1">Description is required</p>}
      </div>

      <Button type="submit" disabled={mutation.isPending} className="w-full">
        {mutation.isPending ? 'Submitting...' : 'Submit Complaint'}
      </Button>
    </form>
  );
}
