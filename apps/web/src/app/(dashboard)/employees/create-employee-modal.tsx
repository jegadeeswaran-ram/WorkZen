'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { employeesApi } from '@/lib/api';
import { useEmploymentTypes } from '@/hooks/use-employment-types';

const schema = z.object({
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  personalPhone: z.string().min(10, 'Valid phone required'),
  personalEmail: z.string().email('Valid email').optional().or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  dateOfBirth: z.string().optional(),
  joiningDate: z.string().optional(),
  designationId: z.string().optional(),
  departmentId: z.string().optional(),
  employmentType: z.string().optional(),
  aadhaarNumber: z.string().optional(),
  panNumber: z.string().optional(),
  uanNumber: z.string().optional(),
  esiNumber: z.string().optional(),
});

type FormData = z.infer<typeof schema>;
interface Props { open: boolean; onClose: () => void; employee?: Record<string, any> | null; }

export function CreateEmployeeModal({ open, onClose, employee }: Props) {
  const qc = useQueryClient();
  const { data: designations = [] } = useQuery({ queryKey: ['designations'], queryFn: employeesApi.designations, enabled: open });
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: employeesApi.departments, enabled: open });
  const { activeTypes: empTypes } = useEmploymentTypes();

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (employee) {
      reset({
        firstName: employee.firstName ?? '',
        lastName: employee.lastName ?? '',
        personalPhone: employee.personalPhone ?? '',
        personalEmail: employee.personalEmail ?? '',
        gender: employee.gender,
        dateOfBirth: employee.dateOfBirth?.split('T')[0],
        joiningDate: employee.joiningDate?.split('T')[0],
        designationId: employee.designation?.id ?? employee.designationId ?? '',
        departmentId: employee.department?.id ?? employee.departmentId ?? '',
        employmentType: employee.employmentType ?? '',
        aadhaarNumber: employee.aadhaarNumber ?? '',
        panNumber: employee.panNumber ?? '',
        uanNumber: employee.uanNumber ?? '',
        esiNumber: employee.esiNumber ?? '',
      });
    } else {
      reset({});
    }
  }, [employee, reset, open]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload: Record<string, unknown> = {};
      Object.entries(data).forEach(([k, v]) => { if (v !== '' && v !== undefined) payload[k] = v; });
      return employee ? employeesApi.update(employee.id, payload) : employeesApi.create(payload);
    },
    onSuccess: () => {
      toast.success(employee ? 'Employee updated successfully' : 'Employee created successfully');
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['employee-stats'] });
      onClose();
      reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed to save employee'),
  });

  if (!open) return null;

  const F = ({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) => (
    <div>
      <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>
        {label}{required && <span style={{ color: '#f43f5e' }}> *</span>}
      </label>
      {children}
      {error && <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>{error}</p>}
    </div>
  );

  const SectionTitle = ({ color, children }: { color: string; children: React.ReactNode }) => (
    <p className="text-xs font-bold uppercase tracking-wider mb-4 mt-2" style={{ color }}>{children}</p>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl" style={{ background: 'var(--wz-card-bg)', border: '1px solid var(--wz-card-border)' }}>
        <div className="flex items-center justify-between p-6 sticky top-0 z-10" style={{ background: 'var(--wz-card-bg)', borderBottom: '1px solid var(--wz-card-border)' }}>
          <div>
            <h3 className="font-semibold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>
              {employee ? 'Edit Employee' : 'Add New Employee'}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--wz-text-muted)' }}>
              {employee ? `Editing ${employee.firstName} ${employee.lastName}` : 'Fill in the employee details below'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5">
            <X size={18} style={{ color: 'var(--wz-text-muted)' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="p-6 space-y-5">
          <SectionTitle color="#6366f1">Personal Information</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <F label="First Name" required error={errors.firstName?.message}>
              <input {...register('firstName')} className="input-field w-full" placeholder="Rajesh" />
            </F>
            <F label="Last Name" required error={errors.lastName?.message}>
              <input {...register('lastName')} className="input-field w-full" placeholder="Kumar" />
            </F>
            <F label="Mobile Number" required error={errors.personalPhone?.message}>
              <input {...register('personalPhone')} className="input-field w-full" placeholder="+91 98765 43210" />
            </F>
            <F label="Personal Email" error={errors.personalEmail?.message}>
              <input {...register('personalEmail')} type="email" className="input-field w-full" placeholder="rajesh@gmail.com" />
            </F>
            <F label="Gender">
              <select {...register('gender')} className="input-field w-full">
                <option value="">Select gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </F>
            <F label="Date of Birth">
              <input {...register('dateOfBirth')} type="date" className="input-field w-full" />
            </F>
          </div>

          <SectionTitle color="#3b82f6">Employment Details</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <F label="Joining Date">
              <input {...register('joiningDate')} type="date" className="input-field w-full" />
            </F>
            <F label="Employment Type">
              <select {...register('employmentType')} className="input-field w-full">
                <option value="">Select type</option>
                {empTypes.map(t => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </F>
            <F label="Designation">
              <select {...register('designationId')} className="input-field w-full">
                <option value="">Select designation</option>
                {(designations as any[]).map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </F>
            <F label="Department">
              <select {...register('departmentId')} className="input-field w-full">
                <option value="">Select department</option>
                {(departments as any[]).map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </F>
          </div>

          <SectionTitle color="#10b981">Statutory & Compliance</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <F label="Aadhaar Number">
              <input {...register('aadhaarNumber')} className="input-field w-full" placeholder="1234 5678 9012" />
            </F>
            <F label="PAN Number">
              <input {...register('panNumber')} className="input-field w-full" placeholder="ABCDE1234F" />
            </F>
            <F label="UAN (PF) Number">
              <input {...register('uanNumber')} className="input-field w-full" placeholder="100123456789" />
            </F>
            <F label="ESI Number">
              <input {...register('esiNumber')} className="input-field w-full" placeholder="12-34-567890-000-0001" />
            </F>
          </div>

          <div className="flex gap-3 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <button type="submit" className="btn-primary flex-1" disabled={mutation.isPending}>
              <Save size={14} />
              {mutation.isPending ? 'Saving...' : employee ? 'Update Employee' : 'Create Employee'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
