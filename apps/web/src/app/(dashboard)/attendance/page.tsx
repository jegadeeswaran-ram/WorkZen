'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import {
  Clock, UserCheck, UserX, AlertCircle, Plus, X, Save,
  CheckCircle2, XCircle, ChevronLeft, ChevronRight, Calendar,
  FileText, Settings, BookOpen, ChevronDown, ChevronUp, Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { attendanceApi, employeesApi } from '@/lib/api';

// ─── Schemas ────────────────────────────────────────────────────────
const markSchema = z.object({
  employeeId: z.string().min(1, 'Select employee'),
  date: z.string().min(1, 'Date required'),
  status: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY', 'WEEKLY_OFF']),
  method: z.string().default('MANUAL'),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
});

const leaveSchema = z.object({
  employeeId: z.string().min(1, 'Select employee'),
  leaveTypeId: z.string().min(1, 'Select leave type'),
  startDate: z.string().min(1, 'Start date required'),
  endDate: z.string().min(1, 'End date required'),
  leaveDays: z.coerce.number().min(0.5, 'Min 0.5 days'),
  reason: z.string().min(5, 'Reason required (min 5 chars)'),
});

const timesheetSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID required'),
  periodStart: z.string().min(1, 'Start date required'),
  periodEnd: z.string().min(1, 'End date required'),
});

const timesheetEntrySchema = z.object({
  date: z.string().min(1, 'Date required'),
  siteTender: z.string().optional(),
  hours: z.coerce.number().min(0, 'Hours required'),
  otHours: z.coerce.number().min(0).default(0),
  task: z.string().optional(),
});

const regularizationSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID required'),
  date: z.string().min(1, 'Date required'),
  requestType: z.enum(['MISSING_PUNCH', 'LATE_MARK', 'WRONG_SHIFT', 'WRONG_SITE']),
  reason: z.string().min(5, 'Reason required'),
  requestedIn: z.string().optional(),
  requestedOut: z.string().optional(),
});

const policySchema = z.object({
  name: z.string().min(1, 'Name required'),
  lateGraceMinutes: z.coerce.number().min(0).default(15),
  halfDayMinutes: z.coerce.number().min(0).default(240),
  fullDayMinutes: z.coerce.number().min(0).default(480),
  overtimeAfterMin: z.coerce.number().min(0).default(480),
  lopAfterHalfDays: z.coerce.number().min(0).default(2),
  isDefault: z.boolean().default(false),
});

const leavePolicySchema = z.object({
  leaveTypeId: z.string().min(1, 'Leave type required'),
  name: z.string().min(1, 'Name required'),
  accrualType: z.enum(['MONTHLY', 'YEARLY', 'PER_WORKING_DAY', 'NONE']),
  accrualValue: z.coerce.number().min(0, 'Accrual value required'),
  maxAccrual: z.coerce.number().min(0).optional(),
  carryForwardMax: z.coerce.number().min(0).optional(),
  encashable: z.boolean().default(false),
  encashMax: z.coerce.number().min(0).optional(),
  probationApply: z.boolean().default(false),
  contractApply: z.boolean().default(false),
  sandwichRule: z.boolean().default(false),
  minServiceDays: z.coerce.number().min(0).optional(),
});

// ─── Tiny Modal ─────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className={`w-full ${maxWidth} rounded-2xl max-h-[90vh] overflow-y-auto`} style={{ background: 'var(--wz-card-bg)', border: '1px solid var(--wz-card-border)' }}>
        <div className="flex items-center justify-between p-5 sticky top-0" style={{ borderBottom: '1px solid var(--wz-card-border)', background: 'var(--wz-card-bg)' }}>
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

const F = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div>
    <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>{label}</label>
    {children}
    {error && <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>{error}</p>}
  </div>
);

const LEAVE_STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  PENDING:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Pending' },
  APPROVED: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Approved' },
  REJECTED: { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)', label: 'Rejected' },
};

const TIMESHEET_STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  DRAFT:     { color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', label: 'Draft' },
  SUBMITTED: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Submitted' },
  APPROVED:  { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Approved' },
};

const REG_TYPE_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  MISSING_PUNCH: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: 'Missing Punch' },
  LATE_MARK:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Late Mark' },
  WRONG_SHIFT:   { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', label: 'Wrong Shift' },
  WRONG_SITE:    { color: '#f97316', bg: 'rgba(249,115,22,0.12)', label: 'Wrong Site' },
};

const ACCRUAL_TYPE_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  MONTHLY:         { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: 'Monthly' },
  YEARLY:          { color: '#6366f1', bg: 'rgba(99,102,241,0.12)', label: 'Yearly' },
  PER_WORKING_DAY: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Per Working Day' },
  NONE:            { color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', label: 'None' },
};

function StatusBadge({ config }: { config: { color: string; bg: string; label: string } }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: config.bg, color: config.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.color }} />
      {config.label}
    </span>
  );
}

// ─── Timesheets Tab ──────────────────────────────────────────────────
function TimesheetsTab() {
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showEntryDialog, setShowEntryDialog] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: timesheetsData, isLoading } = useQuery({
    queryKey: ['timesheets'],
    queryFn: () => attendanceApi.timesheets({}),
  });
  const timesheets = (timesheetsData as any)?.data ?? (Array.isArray(timesheetsData) ? timesheetsData : []);

  const { data: tsDetail } = useQuery({
    queryKey: ['timesheet-detail', expandedId],
    queryFn: () => attendanceApi.getTimesheet(expandedId!),
    enabled: !!expandedId,
  });
  const entries = (tsDetail as any)?.entries ?? [];

  const form = useForm<z.infer<typeof timesheetSchema>>({ resolver: zodResolver(timesheetSchema), defaultValues: { employeeId: '', periodStart: '', periodEnd: '' } });
  const entryForm = useForm<z.infer<typeof timesheetEntrySchema>>({ resolver: zodResolver(timesheetEntrySchema), defaultValues: { date: '', siteTender: '', hours: 0, otHours: 0, task: '' } });

  const createMut = useMutation({
    mutationFn: (data: any) => attendanceApi.createTimesheet(data),
    onSuccess: () => { toast.success('Timesheet created'); qc.invalidateQueries({ queryKey: ['timesheets'] }); setShowNewDialog(false); form.reset(); },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed'),
  });
  const addEntryMut = useMutation({
    mutationFn: (data: any) => attendanceApi.addTimesheetEntry(showEntryDialog!, data),
    onSuccess: () => { toast.success('Entry added'); qc.invalidateQueries({ queryKey: ['timesheet-detail', showEntryDialog] }); setShowEntryDialog(null); entryForm.reset(); },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed'),
  });
  const submitMut = useMutation({
    mutationFn: (id: string) => attendanceApi.submitTimesheet(id),
    onSuccess: () => { toast.success('Timesheet submitted'); qc.invalidateQueries({ queryKey: ['timesheets'] }); },
    onError: () => toast.error('Failed to submit'),
  });
  const approveMut = useMutation({
    mutationFn: (id: string) => attendanceApi.approveTimesheet(id),
    onSuccess: () => { toast.success('Timesheet approved'); qc.invalidateQueries({ queryKey: ['timesheets'] }); },
    onError: () => toast.error('Failed to approve'),
  });

  return (
    <div className="space-y-4">
      <Modal open={showNewDialog} onClose={() => { setShowNewDialog(false); form.reset(); }} title="New Timesheet">
        <form onSubmit={form.handleSubmit(d => createMut.mutate(d))} className="space-y-4">
          <F label="Employee ID *" error={form.formState.errors.employeeId?.message}>
            <input {...form.register('employeeId')} className="input-field w-full" placeholder="Enter employee ID" />
          </F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Period Start *" error={form.formState.errors.periodStart?.message}>
              <input {...form.register('periodStart')} type="date" className="input-field w-full" />
            </F>
            <F label="Period End *" error={form.formState.errors.periodEnd?.message}>
              <input {...form.register('periodEnd')} type="date" className="input-field w-full" />
            </F>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={createMut.isPending}><Save size={14} /> {createMut.isPending ? 'Creating...' : 'Create Timesheet'}</button>
            <button type="button" className="btn-secondary" onClick={() => setShowNewDialog(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!showEntryDialog} onClose={() => { setShowEntryDialog(null); entryForm.reset(); }} title="Add Entry">
        <form onSubmit={entryForm.handleSubmit(d => addEntryMut.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <F label="Date *" error={entryForm.formState.errors.date?.message}>
              <input {...entryForm.register('date')} type="date" className="input-field w-full" />
            </F>
            <F label="Site / Tender">
              <input {...entryForm.register('siteTender')} className="input-field w-full" placeholder="Site or tender name" />
            </F>
            <F label="Hours *" error={entryForm.formState.errors.hours?.message}>
              <input {...entryForm.register('hours')} type="number" step="0.5" min="0" className="input-field w-full" />
            </F>
            <F label="OT Hours">
              <input {...entryForm.register('otHours')} type="number" step="0.5" min="0" className="input-field w-full" />
            </F>
          </div>
          <F label="Task">
            <input {...entryForm.register('task')} className="input-field w-full" placeholder="Task description" />
          </F>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={addEntryMut.isPending}><Save size={14} /> {addEntryMut.isPending ? 'Saving...' : 'Add Entry'}</button>
            <button type="button" className="btn-secondary" onClick={() => { setShowEntryDialog(null); entryForm.reset(); }}>Cancel</button>
          </div>
        </form>
      </Modal>

      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Manage employee timesheets and work hour records</p>
        <button className="btn-primary" onClick={() => setShowNewDialog(true)}><Plus size={14} /> New Timesheet</button>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {['Employee', 'Period', 'Total Hours', 'Status', 'Submitted At', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && [...Array(4)].map((_, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                {[...Array(6)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} /></td>)}
              </tr>
            ))}
            {!isLoading && timesheets.map((ts: any) => {
              const isExpanded = expandedId === ts.id;
              const statusCfg = TIMESHEET_STATUS_CONFIG[ts.status] ?? TIMESHEET_STATUS_CONFIG.DRAFT;
              return (
                <>
                  <tr key={ts.id} className="hover:bg-white/[0.015] transition-colors cursor-pointer" style={{ borderBottom: isExpanded ? 'none' : '1px solid rgba(255,255,255,0.03)' }}
                    onClick={() => setExpandedId(isExpanded ? null : ts.id)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronUp size={14} style={{ color: 'rgba(255,255,255,0.3)' }} /> : <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />}
                        <p className="text-sm font-medium text-white">{ts.employee?.firstName ?? ts.employeeId} {ts.employee?.lastName ?? ''}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{formatDate(ts.periodStart)} – {formatDate(ts.periodEnd)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-white">{ts.totalHours ?? 0}h</td>
                    <td className="px-4 py-3"><StatusBadge config={statusCfg} /></td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{ts.submittedAt ? formatDate(ts.submittedAt) : '—'}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        {ts.status === 'DRAFT' && (
                          <button className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                            style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}
                            onClick={() => submitMut.mutate(ts.id)}>Submit</button>
                        )}
                        {ts.status === 'SUBMITTED' && (
                          <button className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                            style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}
                            onClick={() => approveMut.mutate(ts.id)}>Approve</button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${ts.id}-expanded`} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td colSpan={6} className="px-6 pb-4">
                        <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>Entries</p>
                            <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                              style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
                              onClick={() => setShowEntryDialog(ts.id)}>
                              <Plus size={12} /> Add Entry
                            </button>
                          </div>
                          {entries.length === 0 ? (
                            <p className="text-xs text-center py-6" style={{ color: 'rgba(255,255,255,0.3)' }}>No entries yet. Click &ldquo;+ Add Entry&rdquo; to begin.</p>
                          ) : (
                            <table className="w-full">
                              <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                  {['Date', 'Site / Tender', 'Hours', 'OT Hours', 'Task'].map(h => (
                                    <th key={h} className="px-4 py-2 text-left text-xs font-medium" style={{ color: 'rgba(255,255,255,0.25)' }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {entries.map((en: any) => (
                                  <tr key={en.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <td className="px-4 py-2 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{formatDate(en.date)}</td>
                                    <td className="px-4 py-2 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{en.siteTender ?? '—'}</td>
                                    <td className="px-4 py-2 text-xs font-semibold text-white">{en.hours}h</td>
                                    <td className="px-4 py-2 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{en.otHours ?? 0}h</td>
                                    <td className="px-4 py-2 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{en.task ?? '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {!isLoading && timesheets.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-16 text-center">
                <FileText size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                <p className="text-white font-medium mb-1">No timesheets</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Create a timesheet to track work hours</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Regularization Tab ──────────────────────────────────────────────
function RegularizationTab() {
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const qc = useQueryClient();

  const { data: regsData, isLoading } = useQuery({
    queryKey: ['regularizations', statusFilter],
    queryFn: () => attendanceApi.regularizations(statusFilter ? { status: statusFilter } : {}),
  });
  const regs = (regsData as any)?.data ?? (Array.isArray(regsData) ? regsData : []);

  const form = useForm<z.infer<typeof regularizationSchema>>({
    resolver: zodResolver(regularizationSchema),
    defaultValues: { employeeId: '', date: '', requestType: 'MISSING_PUNCH', reason: '', requestedIn: '', requestedOut: '' },
  });

  const createMut = useMutation({
    mutationFn: (data: any) => attendanceApi.createRegularization(data),
    onSuccess: () => { toast.success('Regularization request submitted'); qc.invalidateQueries({ queryKey: ['regularizations'] }); setShowNewDialog(false); form.reset(); },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed'),
  });
  const reviewMut = useMutation({
    mutationFn: ({ id, action, remarks }: { id: string; action: string; remarks: string }) =>
      attendanceApi.reviewRegularization(id, action, remarks),
    onSuccess: () => { toast.success(`Request ${reviewAction === 'APPROVED' ? 'approved' : 'rejected'}`); qc.invalidateQueries({ queryKey: ['regularizations'] }); setReviewId(null); setReviewRemarks(''); },
    onError: () => toast.error('Failed to update request'),
  });

  return (
    <div className="space-y-4">
      <Modal open={showNewDialog} onClose={() => { setShowNewDialog(false); form.reset(); }} title="New Regularization Request">
        <form onSubmit={form.handleSubmit(d => createMut.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <F label="Employee ID *" error={form.formState.errors.employeeId?.message}>
              <input {...form.register('employeeId')} className="input-field w-full" placeholder="Employee ID" />
            </F>
            <F label="Date *" error={form.formState.errors.date?.message}>
              <input {...form.register('date')} type="date" className="input-field w-full" />
            </F>
          </div>
          <F label="Request Type *" error={form.formState.errors.requestType?.message}>
            <select {...form.register('requestType')} className="input-field w-full">
              <option value="MISSING_PUNCH">Missing Punch</option>
              <option value="LATE_MARK">Late Mark</option>
              <option value="WRONG_SHIFT">Wrong Shift</option>
              <option value="WRONG_SITE">Wrong Site</option>
            </select>
          </F>
          <F label="Reason *" error={form.formState.errors.reason?.message}>
            <textarea {...form.register('reason')} rows={3} className="input-field w-full resize-none" placeholder="Explain the reason..." />
          </F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Requested Check-in">
              <input {...form.register('requestedIn')} type="time" className="input-field w-full" />
            </F>
            <F label="Requested Check-out">
              <input {...form.register('requestedOut')} type="time" className="input-field w-full" />
            </F>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={createMut.isPending}><Save size={14} /> {createMut.isPending ? 'Submitting...' : 'Submit Request'}</button>
            <button type="button" className="btn-secondary" onClick={() => setShowNewDialog(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      {reviewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: 'var(--wz-card-bg)', border: '1px solid var(--wz-card-border)' }}>
            <h3 className="font-semibold mb-1" style={{ color: 'var(--wz-text-primary)' }}>{reviewAction === 'APPROVED' ? 'Approve' : 'Reject'} Request</h3>
            <p className="text-xs mb-4" style={{ color: 'var(--wz-text-muted)' }}>Add remarks (optional)</p>
            <textarea value={reviewRemarks} onChange={e => setReviewRemarks(e.target.value)} rows={3}
              className="input-field w-full resize-none mb-4" placeholder="Remarks..." />
            <div className="flex gap-2">
              <button className="btn-primary flex-1"
                style={reviewAction === 'REJECTED' ? { background: 'rgba(244,63,94,0.15)', borderColor: 'rgba(244,63,94,0.3)', color: '#f87171' } : {}}
                onClick={() => reviewMut.mutate({ id: reviewId, action: reviewAction, remarks: reviewRemarks })}>
                {reviewAction === 'APPROVED' ? 'Approve' : 'Reject'}
              </button>
              <button className="btn-secondary" onClick={() => { setReviewId(null); setReviewRemarks(''); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Attendance correction requests</p>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field" style={{ width: 'auto' }}>
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <button className="btn-primary" onClick={() => setShowNewDialog(true)}><Plus size={14} /> New Request</button>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {['Employee', 'Date', 'Request Type', 'Reason', 'Current Time', 'Requested Time', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && [...Array(4)].map((_, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                {[...Array(8)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} /></td>)}
              </tr>
            ))}
            {!isLoading && regs.map((r: any) => {
              const typeCfg = REG_TYPE_CONFIG[r.requestType] ?? REG_TYPE_CONFIG.MISSING_PUNCH;
              const statusCfg = LEAVE_STATUS_CONFIG[r.status] ?? LEAVE_STATUS_CONFIG.PENDING;
              return (
                <tr key={r.id} className="hover:bg-white/[0.015] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-white">{r.employee?.firstName ?? r.employeeId} {r.employee?.lastName ?? ''}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{r.employee?.employeeCode ?? ''}</p>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{formatDate(r.date)}</td>
                  <td className="px-4 py-3"><StatusBadge config={typeCfg} /></td>
                  <td className="px-4 py-3">
                    <p className="text-sm truncate max-w-28" style={{ color: 'rgba(255,255,255,0.5)' }} title={r.reason}>{r.reason}</p>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {r.currentIn ?? '—'} / {r.currentOut ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {r.requestedIn ?? '—'} / {r.requestedOut ?? '—'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge config={statusCfg} /></td>
                  <td className="px-4 py-3">
                    {r.status === 'PENDING' && (
                      <div className="flex gap-1">
                        <button className="px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}
                          onClick={() => { setReviewAction('APPROVED'); setReviewId(r.id); }}>Approve</button>
                        <button className="px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={{ background: 'rgba(244,63,94,0.12)', color: '#f87171' }}
                          onClick={() => { setReviewAction('REJECTED'); setReviewId(r.id); }}>Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {!isLoading && regs.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-16 text-center">
                <AlertCircle size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                <p className="text-white font-medium mb-1">No regularization requests</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Requests will appear here when submitted</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Policies Tab ────────────────────────────────────────────────────
function PoliciesTab() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);
  const qc = useQueryClient();

  const { data: policiesData, isLoading } = useQuery({
    queryKey: ['attendance-policies'],
    queryFn: () => attendanceApi.policies(),
  });
  const policies = (policiesData as any)?.data ?? (Array.isArray(policiesData) ? policiesData : []);

  const form = useForm<z.infer<typeof policySchema>>({
    resolver: zodResolver(policySchema),
    defaultValues: { name: '', lateGraceMinutes: 15, halfDayMinutes: 240, fullDayMinutes: 480, overtimeAfterMin: 480, lopAfterHalfDays: 2, isDefault: false },
  });

  const openEdit = (p: any) => {
    setEditingPolicy(p);
    form.reset({ name: p.name, lateGraceMinutes: p.lateGraceMinutes, halfDayMinutes: p.halfDayMinutes, fullDayMinutes: p.fullDayMinutes, overtimeAfterMin: p.overtimeAfterMin, lopAfterHalfDays: p.lopAfterHalfDays, isDefault: p.isDefault });
    setShowDialog(true);
  };
  const openNew = () => { setEditingPolicy(null); form.reset({ name: '', lateGraceMinutes: 15, halfDayMinutes: 240, fullDayMinutes: 480, overtimeAfterMin: 480, lopAfterHalfDays: 2, isDefault: false }); setShowDialog(true); };

  const saveMut = useMutation({
    mutationFn: (data: any) => editingPolicy ? attendanceApi.updatePolicy(editingPolicy.id, data) : attendanceApi.createPolicy(data),
    onSuccess: () => { toast.success(editingPolicy ? 'Policy updated' : 'Policy created'); qc.invalidateQueries({ queryKey: ['attendance-policies'] }); setShowDialog(false); },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed'),
  });
  const setDefaultMut = useMutation({
    mutationFn: (id: string) => attendanceApi.updatePolicy(id, { isDefault: true }),
    onSuccess: () => { toast.success('Default policy updated'); qc.invalidateQueries({ queryKey: ['attendance-policies'] }); },
    onError: () => toast.error('Failed'),
  });

  return (
    <div className="space-y-4">
      <Modal open={showDialog} onClose={() => { setShowDialog(false); form.reset(); }} title={editingPolicy ? 'Edit Policy' : 'New Attendance Policy'}>
        <form onSubmit={form.handleSubmit(d => saveMut.mutate(d))} className="space-y-4">
          <F label="Policy Name *" error={form.formState.errors.name?.message}>
            <input {...form.register('name')} className="input-field w-full" placeholder="e.g. Standard Policy" />
          </F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Late Grace (mins)" error={form.formState.errors.lateGraceMinutes?.message}>
              <input {...form.register('lateGraceMinutes')} type="number" min="0" className="input-field w-full" />
            </F>
            <F label="Half Day Threshold (mins)" error={form.formState.errors.halfDayMinutes?.message}>
              <input {...form.register('halfDayMinutes')} type="number" min="0" className="input-field w-full" />
            </F>
            <F label="Full Day Threshold (mins)" error={form.formState.errors.fullDayMinutes?.message}>
              <input {...form.register('fullDayMinutes')} type="number" min="0" className="input-field w-full" />
            </F>
            <F label="OT After (mins)" error={form.formState.errors.overtimeAfterMin?.message}>
              <input {...form.register('overtimeAfterMin')} type="number" min="0" className="input-field w-full" />
            </F>
            <F label="LOP After Half Days" error={form.formState.errors.lopAfterHalfDays?.message}>
              <input {...form.register('lopAfterHalfDays')} type="number" min="0" className="input-field w-full" />
            </F>
          </div>
          <div className="flex items-center gap-2">
            <input {...form.register('isDefault')} type="checkbox" id="pol-default" className="w-4 h-4 rounded" style={{ accentColor: '#6366f1' }} />
            <label htmlFor="pol-default" className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Set as default policy</label>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={saveMut.isPending}><Save size={14} /> {saveMut.isPending ? 'Saving...' : editingPolicy ? 'Update Policy' : 'Create Policy'}</button>
            <button type="button" className="btn-secondary" onClick={() => setShowDialog(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Configure attendance rules and thresholds</p>
        <button className="btn-primary" onClick={openNew}><Plus size={14} /> New Policy</button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="glass-card p-5 h-40 animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />)}
        </div>
      )}

      {!isLoading && policies.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Settings size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
          <p className="text-white font-medium mb-1">No policies configured</p>
          <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Create an attendance policy to define work hour rules</p>
          <button className="btn-primary" onClick={openNew}><Plus size={14} /> New Policy</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {!isLoading && policies.map((p: any) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-white text-sm" style={{ fontFamily: 'Plus Jakarta Sans' }}>{p.name}</p>
                {p.isDefault && (
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                    Default
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                <button className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" title="Edit" onClick={() => openEdit(p)}>
                  <Settings size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Grace Time', value: `${p.lateGraceMinutes ?? 15} min` },
                { label: 'Half Day', value: `${p.halfDayMinutes ?? 240} min` },
                { label: 'Full Day', value: `${p.fullDayMinutes ?? 480} min` },
                { label: 'OT After', value: `${p.overtimeAfterMin ?? 480} min` },
                { label: 'LOP After', value: `${p.lopAfterHalfDays ?? 2} half days` },
              ].map(item => (
                <div key={item.label} className="rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{item.label}</p>
                  <p className="text-xs font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
            {!p.isDefault && (
              <button className="w-full py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                style={{ background: 'rgba(99,102,241,0.08)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.15)' }}
                onClick={() => setDefaultMut.mutate(p.id)}>
                Set as Default
              </button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Leave Policies Tab ──────────────────────────────────────────────
function LeavePoliciesTab() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);
  const qc = useQueryClient();

  const { data: leavePoliciesData, isLoading } = useQuery({
    queryKey: ['leave-policies'],
    queryFn: () => attendanceApi.leavePolicies(),
  });
  const leavePolicies = (leavePoliciesData as any)?.data ?? (Array.isArray(leavePoliciesData) ? leavePoliciesData : []);

  const { data: leaveTypesData = [] } = useQuery({
    queryKey: ['leave-types-for-policy'],
    queryFn: () => attendanceApi.leaveTypes(),
    enabled: showDialog,
  });
  const leaveTypes = Array.isArray(leaveTypesData) ? leaveTypesData : (leaveTypesData as any)?.data ?? [];

  const form = useForm<z.infer<typeof leavePolicySchema>>({
    resolver: zodResolver(leavePolicySchema),
    defaultValues: { leaveTypeId: '', name: '', accrualType: 'MONTHLY', accrualValue: 0, maxAccrual: undefined, carryForwardMax: undefined, encashable: false, encashMax: undefined, probationApply: false, contractApply: false, sandwichRule: false, minServiceDays: undefined },
  });

  const openEdit = (p: any) => {
    setEditingPolicy(p);
    form.reset({ leaveTypeId: p.leaveTypeId, name: p.name, accrualType: p.accrualType, accrualValue: p.accrualValue, maxAccrual: p.maxAccrual, carryForwardMax: p.carryForwardMax, encashable: p.encashable, encashMax: p.encashMax, probationApply: p.probationApply, contractApply: p.contractApply, sandwichRule: p.sandwichRule, minServiceDays: p.minServiceDays });
    setShowDialog(true);
  };
  const openNew = () => { setEditingPolicy(null); form.reset({ leaveTypeId: '', name: '', accrualType: 'MONTHLY', accrualValue: 0, encashable: false, probationApply: false, contractApply: false, sandwichRule: false }); setShowDialog(true); };

  const saveMut = useMutation({
    mutationFn: (data: any) => editingPolicy ? attendanceApi.updateLeavePolicy(editingPolicy.id, data) : attendanceApi.createLeavePolicy(data),
    onSuccess: () => { toast.success(editingPolicy ? 'Leave policy updated' : 'Leave policy created'); qc.invalidateQueries({ queryKey: ['leave-policies'] }); setShowDialog(false); },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed'),
  });

  const encashable = form.watch('encashable');

  return (
    <div className="space-y-4">
      <Modal open={showDialog} onClose={() => { setShowDialog(false); form.reset(); }} title={editingPolicy ? 'Edit Leave Policy' : 'Add Leave Policy'} maxWidth="max-w-2xl">
        <form onSubmit={form.handleSubmit(d => saveMut.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <F label="Leave Type *" error={form.formState.errors.leaveTypeId?.message}>
              <select {...form.register('leaveTypeId')} className="input-field w-full">
                <option value="">Select leave type</option>
                {(leaveTypes as any[]).map((lt: any) => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
              </select>
            </F>
            <F label="Policy Name *" error={form.formState.errors.name?.message}>
              <input {...form.register('name')} className="input-field w-full" placeholder="e.g. Standard Earned Leave" />
            </F>
            <F label="Accrual Type *" error={form.formState.errors.accrualType?.message}>
              <select {...form.register('accrualType')} className="input-field w-full">
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
                <option value="PER_WORKING_DAY">Per Working Day</option>
                <option value="NONE">None (Fixed)</option>
              </select>
            </F>
            <F label="Accrual Value *" error={form.formState.errors.accrualValue?.message}>
              <input {...form.register('accrualValue')} type="number" step="0.5" min="0" className="input-field w-full" placeholder="Days per period" />
            </F>
            <F label="Max Accrual (days)">
              <input {...form.register('maxAccrual')} type="number" step="0.5" min="0" className="input-field w-full" placeholder="Optional" />
            </F>
            <F label="Carry Forward Max (days)">
              <input {...form.register('carryForwardMax')} type="number" step="0.5" min="0" className="input-field w-full" placeholder="Optional" />
            </F>
            <F label="Min Service Days">
              <input {...form.register('minServiceDays')} type="number" min="0" className="input-field w-full" placeholder="Optional" />
            </F>
          </div>

          <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>Rules</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'encashable' as const, label: 'Encashable' },
                { name: 'probationApply' as const, label: 'Apply during Probation' },
                { name: 'contractApply' as const, label: 'Apply for Contract Staff' },
                { name: 'sandwichRule' as const, label: 'Sandwich Rule' },
              ].map(item => (
                <div key={item.name} className="flex items-center gap-2">
                  <input {...form.register(item.name)} type="checkbox" id={`lp-${item.name}`} className="w-4 h-4 rounded" style={{ accentColor: '#6366f1' }} />
                  <label htmlFor={`lp-${item.name}`} className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{item.label}</label>
                </div>
              ))}
            </div>
            {encashable && (
              <F label="Encash Max (days)">
                <input {...form.register('encashMax')} type="number" step="0.5" min="0" className="input-field w-full" placeholder="Max days encashable" />
              </F>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={saveMut.isPending}><Save size={14} /> {saveMut.isPending ? 'Saving...' : editingPolicy ? 'Update Policy' : 'Add Policy'}</button>
            <button type="button" className="btn-secondary" onClick={() => setShowDialog(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Configure accrual and encashment rules per leave type</p>
        <button className="btn-primary" onClick={openNew}><Plus size={14} /> Add Policy</button>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {['Leave Type', 'Policy Name', 'Accrual Type', 'Accrual Value', 'Carry Forward', 'Encashable', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && [...Array(4)].map((_, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                {[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} /></td>)}
              </tr>
            ))}
            {!isLoading && leavePolicies.map((lp: any) => {
              const accrualCfg = ACCRUAL_TYPE_CONFIG[lp.accrualType] ?? ACCRUAL_TYPE_CONFIG.NONE;
              return (
                <tr key={lp.id} className="hover:bg-white/[0.015] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td className="px-4 py-3 text-sm font-medium text-white">{lp.leaveType?.name ?? lp.leaveTypeId}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{lp.name}</td>
                  <td className="px-4 py-3"><StatusBadge config={accrualCfg} /></td>
                  <td className="px-4 py-3 text-sm text-white">{lp.accrualValue}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{lp.carryForwardMax ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium"
                      style={lp.encashable ? { background: 'rgba(16,185,129,0.12)', color: '#10b981' } : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}>
                      {lp.encashable ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                      style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}
                      onClick={() => openEdit(lp)}>Edit</button>
                  </td>
                </tr>
              );
            })}
            {!isLoading && leavePolicies.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-16 text-center">
                <BookOpen size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                <p className="text-white font-medium mb-1">No leave policies</p>
                <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Add leave policies to control accrual and encashment</p>
                <button className="btn-primary" onClick={openNew}><Plus size={14} /> Add Policy</button>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────
export default function AttendancePage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'daily' | 'report' | 'leaves' | 'timesheets' | 'regularization' | 'policies' | 'leave-policies'>('daily');
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportPage, setReportPage] = useState(1);
  const [reportSearch, setReportSearch] = useState(searchParams.get('search') ?? '');
  const [leavePage, setLeavePage] = useState(1);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const qc = useQueryClient();

  // Queries
  const { data: todayStats } = useQuery({ queryKey: ['attendance-today'], queryFn: attendanceApi.today });
  const { data: reportData, isLoading: loadReport } = useQuery({
    queryKey: ['attendance-report', reportMonth, reportYear, reportPage, reportSearch],
    queryFn: () => attendanceApi.monthlyReport({ month: reportMonth, year: reportYear, page: reportPage, limit: 15, search: reportSearch || undefined }),
    enabled: tab === 'report',
  });
  const { data: leavesData, isLoading: loadLeaves } = useQuery({
    queryKey: ['leave-requests', leavePage],
    queryFn: () => attendanceApi.leaveRequests({ page: leavePage, limit: 15 }),
    enabled: tab === 'leaves',
  });
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-select-all'],
    queryFn: () => employeesApi.selectAll('ACTIVE'),
    enabled: showMarkModal || showLeaveModal,
  });
  const { data: leaveTypes = [] } = useQuery({
    queryKey: ['leave-types'],
    queryFn: attendanceApi.leaveTypes,
    enabled: showLeaveModal,
  });

  const reportRows = (reportData as any)?.data ?? [];
  const reportMeta = (reportData as any)?.meta;
  const leaves = (leavesData as any)?.data ?? [];
  const leavesMeta = (leavesData as any)?.meta;

  // Forms
  const markForm = useForm<z.infer<typeof markSchema>>({
    resolver: zodResolver(markSchema),
    defaultValues: { status: 'PRESENT', method: 'MANUAL', date: new Date().toISOString().split('T')[0], employeeId: '', checkInTime: '', checkOutTime: '' },
  });
  const leaveForm = useForm<z.infer<typeof leaveSchema>>({
    resolver: zodResolver(leaveSchema),
    defaultValues: { leaveDays: 1, employeeId: '', leaveTypeId: '', startDate: '', endDate: '', reason: '' },
  });

  // Mutations
  const markMut = useMutation({
    mutationFn: (data: any) => attendanceApi.mark(data),
    onSuccess: () => {
      toast.success('Attendance marked');
      qc.invalidateQueries({ queryKey: ['attendance-today'] });
      setShowMarkModal(false);
      markForm.reset({ status: 'PRESENT', method: 'MANUAL', date: new Date().toISOString().split('T')[0] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed to mark attendance'),
  });
  const leaveMut = useMutation({
    mutationFn: (data: any) => attendanceApi.createLeave(data),
    onSuccess: () => {
      toast.success('Leave request submitted');
      qc.invalidateQueries({ queryKey: ['leave-requests'] });
      setShowLeaveModal(false);
      leaveForm.reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed'),
  });
  const approveMut = useMutation({
    mutationFn: ({ id, action, remarks }: { id: string; action: 'APPROVED' | 'REJECTED'; remarks?: string }) =>
      attendanceApi.approveLeave(id, action, remarks),
    onSuccess: () => {
      toast.success('Leave request updated');
      qc.invalidateQueries({ queryKey: ['leave-requests'] });
      setRejectId(null);
      setRejectRemarks('');
    },
    onError: () => toast.error('Failed to update leave request'),
  });

  const TABS = [
    { id: 'daily', label: 'Today', icon: Clock },
    { id: 'report', label: 'Monthly Report', icon: Calendar },
    { id: 'leaves', label: 'Leave Requests', icon: UserX },
    { id: 'timesheets', label: 'Timesheets', icon: FileText },
    { id: 'regularization', label: 'Regularization', icon: UserCheck },
    { id: 'policies', label: 'Policies', icon: Settings },
    { id: 'leave-policies', label: 'Leave Policies', icon: BookOpen },
  ] as const;

  const statCards = [
    { label: 'Present Today', value: (todayStats as any)?.present ?? 0, color: '#10b981', icon: UserCheck },
    { label: 'Absent', value: (todayStats as any)?.absent ?? 0, color: '#f43f5e', icon: UserX },
    { label: 'On Leave', value: (todayStats as any)?.onLeave ?? 0, color: '#8b5cf6', icon: AlertCircle },
    { label: 'Total Active', value: (todayStats as any)?.total ?? 0, color: '#6366f1', icon: Clock },
  ];

  return (
    <div className="space-y-6">
      {/* Mark Attendance Modal */}
      <Modal open={showMarkModal} onClose={() => { setShowMarkModal(false); markForm.reset(); }} title="Mark Attendance">
        <form onSubmit={markForm.handleSubmit(d => markMut.mutate(d))} className="space-y-4">
          <F label="Employee *" error={markForm.formState.errors.employeeId?.message}>
            <select {...markForm.register('employeeId')} className="input-field w-full">
              <option value="">Select employee</option>
              {(employees as any[]).map((e: any) => (
                <option key={e.id} value={e.id}>{e.firstName} {e.lastName} — {e.employeeCode}</option>
              ))}
            </select>
          </F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Date *" error={markForm.formState.errors.date?.message}>
              <input {...markForm.register('date')} type="date" className="input-field w-full" />
            </F>
            <F label="Status *" error={markForm.formState.errors.status?.message}>
              <select {...markForm.register('status')} className="input-field w-full">
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="LEAVE">On Leave</option>
                <option value="HOLIDAY">Holiday</option>
                <option value="WEEKLY_OFF">Weekly Off</option>
              </select>
            </F>
            <F label="Check-in Time">
              <input {...markForm.register('checkInTime')} type="time" className="input-field w-full" />
            </F>
            <F label="Check-out Time">
              <input {...markForm.register('checkOutTime')} type="time" className="input-field w-full" />
            </F>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={markMut.isPending}>
              <Save size={14} /> {markMut.isPending ? 'Saving...' : 'Mark Attendance'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowMarkModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Leave Request Modal */}
      <Modal open={showLeaveModal} onClose={() => { setShowLeaveModal(false); leaveForm.reset(); }} title="Apply for Leave">
        <form onSubmit={leaveForm.handleSubmit(d => leaveMut.mutate(d))} className="space-y-4">
          <F label="Employee *" error={leaveForm.formState.errors.employeeId?.message}>
            <select {...leaveForm.register('employeeId')} className="input-field w-full">
              <option value="">Select employee</option>
              {(employees as any[]).map((e: any) => (
                <option key={e.id} value={e.id}>{e.firstName} {e.lastName} — {e.employeeCode}</option>
              ))}
            </select>
          </F>
          <F label="Leave Type *" error={leaveForm.formState.errors.leaveTypeId?.message}>
            <select {...leaveForm.register('leaveTypeId')} className="input-field w-full">
              <option value="">Select leave type</option>
              {(leaveTypes as any[]).map((lt: any) => (
                <option key={lt.id} value={lt.id}>{lt.name}</option>
              ))}
            </select>
          </F>
          <div className="grid grid-cols-2 gap-3">
            <F label="From Date *" error={leaveForm.formState.errors.startDate?.message}>
              <input {...leaveForm.register('startDate')} type="date" className="input-field w-full" />
            </F>
            <F label="To Date *" error={leaveForm.formState.errors.endDate?.message}>
              <input {...leaveForm.register('endDate')} type="date" className="input-field w-full" />
            </F>
            <F label="No. of Days *" error={leaveForm.formState.errors.leaveDays?.message}>
              <input {...leaveForm.register('leaveDays')} type="number" step="0.5" min="0.5" className="input-field w-full" />
            </F>
          </div>
          <F label="Reason *" error={leaveForm.formState.errors.reason?.message}>
            <textarea {...leaveForm.register('reason')} rows={3} className="input-field w-full resize-none" placeholder="Reason for leave..." />
          </F>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={leaveMut.isPending}>
              <Save size={14} /> {leaveMut.isPending ? 'Submitting...' : 'Submit Leave Request'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowLeaveModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Reject Remarks Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: 'var(--wz-card-bg)', border: '1px solid var(--wz-card-border)' }}>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--wz-text-primary)' }}>Reject Leave Request</h3>
            <textarea value={rejectRemarks} onChange={e => setRejectRemarks(e.target.value)} rows={3}
              className="input-field w-full resize-none mb-4" placeholder="Enter rejection reason..." />
            <div className="flex gap-2">
              <button className="btn-primary flex-1" style={{ background: 'rgba(244,63,94,0.15)', borderColor: 'rgba(244,63,94,0.3)', color: '#f87171' }}
                onClick={() => approveMut.mutate({ id: rejectId, action: 'REJECTED', remarks: rejectRemarks })}>
                Reject
              </button>
              <button className="btn-secondary" onClick={() => { setRejectId(null); setRejectRemarks(''); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>Attendance &amp; Leave</h2>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Track daily attendance and manage leave requests</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setShowLeaveModal(true)}><Plus size={14} /> Leave Request</button>
          <button className="btn-primary" onClick={() => setShowMarkModal(true)}><Plus size={16} /> Mark Attendance</button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</p>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${s.color}15`, color: s.color }}><s.icon size={15} /></div>
            </div>
            <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: tab === t.id ? 'rgba(99,102,241,0.2)' : 'transparent', color: tab === t.id ? '#818cf8' : 'rgba(255,255,255,0.5)' }}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* TODAY TAB */}
      {tab === 'daily' && (
        <div className="glass-card p-6 text-center">
          <Clock size={48} className="mx-auto mb-4" style={{ color: 'rgba(99,102,241,0.4)' }} />
          <p className="font-semibold text-white mb-2" style={{ fontFamily: 'Plus Jakarta Sans' }}>Today&apos;s Attendance</p>
          <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <div className="flex justify-center gap-6 mt-6">
            {[
              { label: 'Present', value: (todayStats as any)?.present ?? 0, color: '#10b981' },
              { label: 'Absent', value: (todayStats as any)?.absent ?? 0, color: '#f43f5e' },
              { label: 'On Leave', value: (todayStats as any)?.onLeave ?? 0, color: '#8b5cf6' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold" style={{ color: s.color, fontFamily: 'Plus Jakarta Sans' }}>{s.value}</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 w-full rounded-full h-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            {(todayStats as any)?.total ? (
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(((todayStats as any).present / (todayStats as any).total) * 100)}%`, background: 'linear-gradient(90deg, #10b981, #6366f1)' }} />
            ) : null}
          </div>
          <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {(todayStats as any)?.total
              ? `${Math.round(((todayStats as any).present / (todayStats as any).total) * 100)}% attendance rate`
              : 'No data for today'}
          </p>
          <button className="btn-primary mt-6" onClick={() => setShowMarkModal(true)}><Plus size={14} /> Mark Attendance</button>
        </div>
      )}

      {/* MONTHLY REPORT TAB */}
      {tab === 'report' && (
        <div className="space-y-4">
          <div className="glass-card p-4 flex items-center gap-4 flex-wrap">
            <div className="relative min-w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--wz-text-muted)' }} />
              <input value={reportSearch} onChange={e => { setReportSearch(e.target.value); setReportPage(1); }} placeholder="Search employees..." className="input-field w-full pl-9" />
            </div>
            <label className="text-sm font-medium" style={{ color: 'var(--wz-text-primary)' }}>Month:</label>
            <select value={reportMonth} onChange={e => { setReportMonth(+e.target.value); setReportPage(1); }} className="input-field" style={{ width: 'auto' }}>
              {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                <option key={i} value={i+1}>{m}</option>
              ))}
            </select>
            <select value={reportYear} onChange={e => { setReportYear(+e.target.value); setReportPage(1); }} className="input-field" style={{ width: 'auto' }}>
              {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Employee', 'Code', 'Present', 'Absent', 'On Leave', 'Total Days'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadReport && [...Array(5)].map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    {[...Array(6)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} /></td>)}
                  </tr>
                ))}
                {!loadReport && reportRows.map((r: any) => (
                  <tr key={r.id} className="hover:bg-white/[0.015] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td className="px-4 py-3 text-sm font-medium text-white">{r.firstName} {r.lastName}</td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>{r.employeeCode}</td>
                    <td className="px-4 py-3"><span className="text-sm font-semibold" style={{ color: '#10b981' }}>{r.present}</span></td>
                    <td className="px-4 py-3"><span className="text-sm font-semibold" style={{ color: '#f43f5e' }}>{r.absent}</span></td>
                    <td className="px-4 py-3"><span className="text-sm font-semibold" style={{ color: '#8b5cf6' }}>{r.leaves}</span></td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{r.total}</td>
                  </tr>
                ))}
                {!loadReport && reportRows.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    No attendance data for selected period
                  </td></tr>
                )}
              </tbody>
            </table>
            {reportMeta && reportMeta.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{reportMeta.total} employees</p>
                <div className="flex gap-1">
                  <button disabled={reportPage===1} onClick={() => setReportPage(p=>p-1)} className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30"><ChevronLeft size={15} style={{ color: 'rgba(255,255,255,0.5)' }} /></button>
                  <span className="text-xs px-2 py-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{reportPage}/{reportMeta.totalPages}</span>
                  <button disabled={reportPage===reportMeta.totalPages} onClick={() => setReportPage(p=>p+1)} className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30"><ChevronRight size={15} style={{ color: 'rgba(255,255,255,0.5)' }} /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LEAVE REQUESTS TAB */}
      {tab === 'leaves' && (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['Employee', 'Leave Type', 'From', 'To', 'Days', 'Reason', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadLeaves && [...Array(5)].map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  {[...Array(8)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} /></td>)}
                </tr>
              ))}
              {!loadLeaves && leaves.map((l: any) => {
                const cfg = LEAVE_STATUS_CONFIG[l.status] ?? LEAVE_STATUS_CONFIG.PENDING;
                return (
                  <tr key={l.id} className="hover:bg-white/[0.015] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-white">{l.employee?.firstName} {l.employee?.lastName}</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{l.employee?.employeeCode}</p>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{l.leaveType?.name ?? 'General'}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{formatDate(l.startDate)}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{formatDate(l.endDate)}</td>
                    <td className="px-4 py-3 text-sm text-center" style={{ color: 'rgba(255,255,255,0.6)' }}>{l.days}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm truncate max-w-32" style={{ color: 'rgba(255,255,255,0.5)' }} title={l.reason}>{l.reason}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: cfg.bg, color: cfg.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {l.status === 'PENDING' && (
                        <div className="flex gap-1">
                          <button title="Approve" onClick={() => approveMut.mutate({ id: l.id, action: 'APPROVED' })}
                            className="p-1.5 rounded hover:bg-white/5 transition-colors">
                            <CheckCircle2 size={15} style={{ color: '#10b981' }} />
                          </button>
                          <button title="Reject" onClick={() => setRejectId(l.id)}
                            className="p-1.5 rounded hover:bg-white/5 transition-colors">
                            <XCircle size={15} style={{ color: '#f43f5e' }} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loadLeaves && leaves.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-16 text-center">
                  <UserX size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                  <p className="text-white font-medium mb-1">No leave requests</p>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Leave requests submitted by employees appear here</p>
                </td></tr>
              )}
            </tbody>
          </table>
          {leavesMeta && leavesMeta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{leavesMeta.total} requests</p>
              <div className="flex gap-1">
                <button disabled={leavePage===1} onClick={() => setLeavePage(p=>p-1)} className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30"><ChevronLeft size={15} style={{ color: 'rgba(255,255,255,0.5)' }} /></button>
                <span className="text-xs px-2 py-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{leavePage}/{leavesMeta.totalPages}</span>
                <button disabled={leavePage===leavesMeta.totalPages} onClick={() => setLeavePage(p=>p+1)} className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30"><ChevronRight size={15} style={{ color: 'rgba(255,255,255,0.5)' }} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* NEW TABS */}
      {tab === 'timesheets' && <TimesheetsTab />}
      {tab === 'regularization' && <RegularizationTab />}
      {tab === 'policies' && <PoliciesTab />}
      {tab === 'leave-policies' && <LeavePoliciesTab />}
    </div>
  );
}
