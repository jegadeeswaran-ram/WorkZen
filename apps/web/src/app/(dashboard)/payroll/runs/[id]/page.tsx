'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Building2, MapPin, Users, CheckCircle2, Clock,
  AlertCircle, ThumbsUp, CreditCard, Eye, ChevronRight, Download,
  LayoutGrid, Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import { payrollApi } from '@/lib/api';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const RUN_STATUS: Record<string, { color: string; bg: string; ring: string; label: string; icon: React.ElementType }> = {
  DRAFT:            { color: 'rgba(255,255,255,0.5)',  bg: 'rgba(255,255,255,0.06)',  ring: 'rgba(255,255,255,0.1)',  label: 'Draft',            icon: Clock       },
  PROCESSING:       { color: '#818cf8',                bg: 'rgba(99,102,241,0.12)',   ring: 'rgba(99,102,241,0.2)',   label: 'Processing',       icon: Clock       },
  PENDING_APPROVAL: { color: '#f59e0b',                bg: 'rgba(245,158,11,0.12)',   ring: 'rgba(245,158,11,0.25)', label: 'Pending Approval', icon: AlertCircle },
  APPROVED:         { color: '#10b981',                bg: 'rgba(16,185,129,0.12)',   ring: 'rgba(16,185,129,0.25)', label: 'Approved',         icon: CheckCircle2 },
  PAID:             { color: '#3b82f6',                bg: 'rgba(59,130,246,0.12)',   ring: 'rgba(59,130,246,0.25)', label: 'Disbursed',        icon: CheckCircle2 },
  CANCELLED:        { color: '#f43f5e',                bg: 'rgba(244,63,94,0.12)',    ring: 'rgba(244,63,94,0.2)',   label: 'Cancelled',        icon: AlertCircle  },
};

const EMP_TABS = [
  { id: 'all',        label: 'All Employees',  icon: LayoutGrid, type: undefined       },
  { id: 'office',     label: 'Office Staff',   icon: Building2,  type: 'PERMANENT'     },
  { id: 'contract',   label: 'Site/Contract',  icon: MapPin,     type: 'CONTRACT'      },
] as const;
type EmpTab = typeof EMP_TABS[number]['id'];

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="glass-card p-4 text-center">
      <p className="text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: 'var(--wz-text-muted)' }}>{label}</p>
      <p className="text-xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: color ?? 'var(--wz-text-primary)' }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--wz-text-muted)' }}>{sub}</p>}
    </div>
  );
}

export default function PayrollRunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [empTab, setEmpTab] = useState<EmpTab>('all');

  const { data: run, isLoading } = useQuery({
    queryKey: ['payroll-run', id],
    queryFn: () => payrollApi.run(id),
    enabled: !!id,
    staleTime: 30_000,
  });

  const currentType = EMP_TABS.find(t => t.id === empTab)?.type;

  const { data: payslips = [], isLoading: payslipsLoading } = useQuery({
    queryKey: ['run-payslips', id, empTab],
    queryFn: () => payrollApi.runPayslips(id, currentType),
    enabled: !!id,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['payroll-run', id] });
    qc.invalidateQueries({ queryKey: ['run-payslips', id] });
    qc.invalidateQueries({ queryKey: ['payroll-dashboard'] });
    qc.invalidateQueries({ queryKey: ['payroll-runs'] });
  };

  const approveMut = useMutation({
    mutationFn: () => payrollApi.approve(id),
    onSuccess: () => { toast.success('Payroll approved'); refresh(); },
    onError: () => toast.error('Failed to approve'),
  });

  const disburseMut = useMutation({
    mutationFn: () => payrollApi.disburse(id),
    onSuccess: () => { toast.success('Payroll disbursed'); refresh(); },
    onError: () => toast.error('Failed to disburse'),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }} />
    </div>
  );

  if (!run) return (
    <div className="flex flex-col items-center justify-center py-32">
      <AlertCircle size={40} className="mb-4" style={{ color: 'rgba(255,255,255,0.15)' }} />
      <p className="text-sm" style={{ color: 'var(--wz-text-muted)' }}>Payroll run not found</p>
      <button onClick={() => router.back()} className="btn-secondary mt-4 flex items-center gap-2"><ArrowLeft size={14} /> Go back</button>
    </div>
  );

  const st = RUN_STATUS[run.status] ?? RUN_STATUS.DRAFT;
  const Icon = st.icon;
  const list = Array.isArray(payslips) ? payslips : (payslips as any)?.data ?? [];

  // Computed totals from visible payslips
  const totals = list.reduce((acc: any, p: any) => ({
    gross: acc.gross + Number(p.grossEarnings ?? 0),
    deductions: acc.deductions + Number(p.totalDeductions ?? 0),
    net: acc.net + Number(p.netPay ?? 0),
    pf: acc.pf + Number(p.pfEmployee ?? 0),
    esi: acc.esi + Number(p.esiEmployee ?? 0),
  }), { gross: 0, deductions: 0, net: 0, pf: 0, esi: 0 });

  return (
    <div className="space-y-5">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm transition-colors"
        style={{ color: 'var(--wz-text-muted)' }}
        onMouseOver={e => e.currentTarget.style.color = 'var(--wz-text-secondary)'}
        onMouseOut={e => e.currentTarget.style.color = 'var(--wz-text-muted)'}>
        <ArrowLeft size={15} /> Payroll
      </button>

      {/* ── Hero ── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden">
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#6366f1,#10b981)' }} />
        <div className="p-6 flex flex-col sm:flex-row items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>
                {MONTH_FULL[run.month - 1]} {run.year} Payroll
              </h1>
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: st.bg, color: st.color, border: `1px solid ${st.ring}` }}>
                <Icon size={11} /> {st.label}
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--wz-text-muted)' }}>
              Period: {formatDate(run.periodStart)} – {formatDate(run.periodEnd)} · {run.totalEmployees} employees
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {run.status === 'PENDING_APPROVAL' && (
              <button onClick={() => approveMut.mutate()} disabled={approveMut.isPending}
                className="btn-primary flex items-center gap-1.5 text-sm" style={{ background: '#10b981' }}>
                <ThumbsUp size={13} /> {approveMut.isPending ? 'Approving…' : 'Approve'}
              </button>
            )}
            {run.status === 'APPROVED' && (
              <button onClick={() => { if (confirm('Disburse payroll to all employees?')) disburseMut.mutate(); }} disabled={disburseMut.isPending}
                className="btn-primary flex items-center gap-1.5 text-sm">
                <CreditCard size={13} /> {disburseMut.isPending ? 'Disbursing…' : 'Disburse'}
              </button>
            )}
          </div>
        </div>

        {/* Employee type tabs */}
        <div className="flex gap-0 px-6 overflow-x-auto" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {EMP_TABS.map(t => {
            const active = empTab === t.id;
            return (
              <button key={t.id} onClick={() => setEmpTab(t.id)}
                className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold transition-all relative whitespace-nowrap"
                style={{ color: active ? '#818cf8' : 'var(--wz-text-muted)' }}>
                <t.icon size={13} /> {t.label}
                {active && (
                  <motion.div layoutId="run-emp-tab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ background: 'linear-gradient(90deg,#6366f1,#3b82f6)' }} />
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard label="Employees" value={String(list.length)} />
        <SummaryCard label="Gross Earnings" value={formatCurrency(totals.gross)} color="var(--wz-text-primary)" />
        <SummaryCard label="PF Deduction" value={formatCurrency(totals.pf)} color="#f59e0b" />
        <SummaryCard label="ESI + PT" value={formatCurrency(totals.deductions - totals.pf)} color="#f59e0b" />
        <SummaryCard label="Net Payable" value={formatCurrency(totals.net)} color="#10b981" />
      </div>

      {/* ── Payslips table ── */}
      <AnimatePresence mode="wait">
        <motion.div key={empTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
          <div className="glass-card overflow-hidden">
            <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#6366f1' }}>
                {EMP_TABS.find(t => t.id === empTab)?.label ?? 'All'} Payslips
              </p>
            </div>

            {payslipsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }} />
              </div>
            ) : list.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Users size={40} className="mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                <p className="text-sm" style={{ color: 'var(--wz-text-muted)' }}>No payslips for this filter</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {['Employee', 'Type / Site', 'Days', 'Basic', 'DA+HRA+Spec', 'PF', 'ESI', 'PT', 'Net Pay', 'Status', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                          style={{ color: 'var(--wz-text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((p: any) => {
                      const emp = p.employee;
                      const isOffice = emp?.employmentType === 'PERMANENT';
                      const site = emp?.deployments?.[0]?.site?.name ?? emp?.deployments?.[0]?.tender?.tenderName ?? '—';
                      const isPaid = p.paymentStatus === 'PAID';
                      return (
                        <tr key={p.id} className="hover:bg-white/[0.015] transition-colors"
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                                style={{ background: isOffice ? 'rgba(99,102,241,0.12)' : 'rgba(245,158,11,0.12)', color: isOffice ? '#818cf8' : '#f59e0b' }}>
                                {getInitials(emp?.firstName, emp?.lastName)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate" style={{ color: 'var(--wz-text-primary)' }}>{emp?.firstName} {emp?.lastName}</p>
                                <p className="text-[10px] font-mono" style={{ color: 'var(--wz-text-muted)' }}>{emp?.employeeCode}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {isOffice ? (
                              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit"
                                style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>
                                <Building2 size={9} /> Office
                              </span>
                            ) : (
                              <div>
                                <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit mb-0.5"
                                  style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                                  <MapPin size={9} /> Site
                                </span>
                                <p className="text-[10px] truncate max-w-[100px]" style={{ color: 'var(--wz-text-muted)' }}>{site}</p>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-center" style={{ color: 'var(--wz-text-secondary)' }}>
                            <span style={{ color: '#10b981' }}>{Number(p.presentDays)}</span>
                            <span style={{ color: 'var(--wz-text-muted)' }}>/{p.workingDays}</span>
                          </td>
                          <td className="px-4 py-3 text-sm" style={{ color: 'var(--wz-text-secondary)' }}>{formatCurrency(Number(p.basic))}</td>
                          <td className="px-4 py-3 text-sm" style={{ color: 'var(--wz-text-secondary)' }}>
                            {formatCurrency(Number(p.da ?? 0) + Number(p.hra ?? 0) + Number(p.specialAllowance ?? 0))}
                          </td>
                          <td className="px-4 py-3 text-sm" style={{ color: '#f43f5e' }}>{formatCurrency(Number(p.pfEmployee ?? 0))}</td>
                          <td className="px-4 py-3 text-sm" style={{ color: '#f43f5e' }}>{formatCurrency(Number(p.esiEmployee ?? 0))}</td>
                          <td className="px-4 py-3 text-sm" style={{ color: '#f43f5e' }}>{formatCurrency(Number(p.professionalTax ?? 0))}</td>
                          <td className="px-4 py-3 text-sm font-bold" style={{ color: '#10b981' }}>{formatCurrency(Number(p.netPay ?? 0))}</td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: isPaid ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: isPaid ? '#10b981' : '#f59e0b' }}>
                              {isPaid ? 'Paid' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => router.push(`/payroll/payslips/${p.id}`)}
                              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" title="View Payslip">
                              <Eye size={13} style={{ color: '#818cf8' }} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
