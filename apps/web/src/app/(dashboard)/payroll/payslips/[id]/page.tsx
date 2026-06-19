'use client';

import { useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer, AlertCircle, Building2, MapPin, Phone, Calendar, Hash, Briefcase } from 'lucide-react';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import { payrollApi } from '@/lib/api';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span className="text-sm" style={{ color: 'var(--wz-text-muted)' }}>{label}</span>
      <span className={`text-sm ${bold ? 'font-bold' : 'font-medium'}`}
        style={{ color: accent ?? 'var(--wz-text-primary)' }}>{value}</span>
    </div>
  );
}

export default function PayslipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);

  const { data: payslip, isLoading } = useQuery({
    queryKey: ['payslip', id],
    queryFn: () => payrollApi.payslip(id),
    enabled: !!id,
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }} />
    </div>
  );

  if (!payslip) return (
    <div className="flex flex-col items-center justify-center py-32">
      <AlertCircle size={40} className="mb-4" style={{ color: 'rgba(255,255,255,0.15)' }} />
      <p className="text-sm" style={{ color: 'var(--wz-text-muted)' }}>Payslip not found</p>
      <button onClick={() => router.back()} className="btn-secondary mt-4 flex items-center gap-2"><ArrowLeft size={14} /> Go back</button>
    </div>
  );

  const emp = payslip.employee;
  const run = payslip.payrollRun;
  const isOffice = ['PERMANENT', 'CONTRACT_EMPLOYEE'].includes(emp?.employmentType ?? '');
  const site = emp?.deployments?.[0]?.site?.name ?? emp?.deployments?.[0]?.tender?.tenderName;
  const bankDetails = emp?.bankDetails?.[0];

  const gross         = Number(payslip.grossEarnings ?? 0);
  const basic         = Number(payslip.basic ?? 0);
  const da            = Number(payslip.da ?? 0);
  const hra           = Number(payslip.hra ?? 0);
  const special       = Number(payslip.specialAllowance ?? 0);
  const otherEarnings = payslip.otherEarnings as Record<string, number> ?? {};
  const pfEmp         = Number(payslip.pfEmployee ?? 0);
  const esiEmp        = Number(payslip.esiEmployee ?? 0);
  const pt            = Number(payslip.professionalTax ?? 0);
  const totalDed      = Number(payslip.totalDeductions ?? 0);
  const net           = Number(payslip.netPay ?? 0);
  const pfEmployer    = Math.min(basic * 0.12, 1800);
  const esiEmployer   = gross <= 21000 ? gross * 0.0325 : 0;

  const workingDays   = payslip.workingDays ?? 26;
  const presentDays   = Number(payslip.presentDays ?? 0);
  const absentDays    = Number(payslip.absentDays ?? 0);
  const leaveDays     = Number(payslip.leaveDays ?? 0);
  const overtimeHours = Number(payslip.overtimeHours ?? 0);

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Screen-only controls */}
      <div className="flex items-center justify-between no-print">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm transition-colors"
          style={{ color: 'var(--wz-text-muted)' }}
          onMouseOver={e => e.currentTarget.style.color = 'var(--wz-text-secondary)'}
          onMouseOut={e => e.currentTarget.style.color = 'var(--wz-text-muted)'}>
          <ArrowLeft size={15} /> Payroll Run
        </button>
        <button onClick={handlePrint} className="btn-primary flex items-center gap-2">
          <Printer size={14} /> Print Payslip
        </button>
      </div>

      {/* ── Payslip document ── */}
      <div ref={printRef} className="glass-card overflow-hidden"
        style={{ fontFamily: 'DM Sans, sans-serif' }}>
        {/* Color top bar */}
        <div className="h-2" style={{ background: isOffice ? 'linear-gradient(90deg,#6366f1,#3b82f6)' : 'linear-gradient(90deg,#f59e0b,#ef4444)' }} />

        {/* Header */}
        <div className="px-8 py-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-0.5" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>
                WorkZen ERP
              </h1>
              <p className="text-sm" style={{ color: 'var(--wz-text-muted)' }}>Payroll Management System</p>
            </div>
            <div className="text-right">
              <div className="inline-block px-4 py-1.5 rounded-xl mb-1"
                style={{ background: isOffice ? 'rgba(99,102,241,0.12)' : 'rgba(245,158,11,0.12)', border: `1px solid ${isOffice ? 'rgba(99,102,241,0.25)' : 'rgba(245,158,11,0.25)'}` }}>
                <span className="text-sm font-bold" style={{ color: isOffice ? '#818cf8' : '#f59e0b' }}>
                  {isOffice ? 'SALARY SLIP' : 'WAGE SLIP'}
                </span>
              </div>
              <p className="text-base font-bold" style={{ color: 'var(--wz-text-primary)' }}>
                {MONTHS[payslip.month - 1]} {payslip.year}
              </p>
              <p className="text-xs" style={{ color: 'var(--wz-text-muted)' }}>
                {formatDate(run?.periodStart)} – {formatDate(run?.periodEnd)}
              </p>
            </div>
          </div>
        </div>

        {/* Employee info */}
        <div className="px-8 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.015)' }}>
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0"
              style={{
                background: isOffice ? 'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(59,130,246,0.15))' : 'linear-gradient(135deg,rgba(245,158,11,0.25),rgba(239,68,68,0.15))',
                border: `2px solid ${isOffice ? 'rgba(99,102,241,0.3)' : 'rgba(245,158,11,0.3)'}`,
                color: isOffice ? '#818cf8' : '#f59e0b', fontFamily: 'Plus Jakarta Sans',
              }}>
              {getInitials(emp?.firstName, emp?.lastName)}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-1" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>
                {emp?.firstName} {emp?.lastName}
              </h2>
              <div className="flex flex-wrap gap-4 text-xs" style={{ color: 'var(--wz-text-muted)' }}>
                <span className="flex items-center gap-1"><Hash size={10} /> {emp?.employeeCode}</span>
                {emp?.designation?.name && <span className="flex items-center gap-1"><Briefcase size={10} /> {emp.designation.name}</span>}
                {emp?.department?.name && <span className="flex items-center gap-1"><Building2 size={10} /> {emp.department.name}</span>}
                {site && !isOffice && <span className="flex items-center gap-1"><MapPin size={10} /> {site}</span>}
                {emp?.personalPhone && <span className="flex items-center gap-1"><Phone size={10} /> {emp.personalPhone}</span>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--wz-text-muted)' }}>Employment</p>
              <p className="text-sm font-semibold" style={{ color: isOffice ? '#818cf8' : '#f59e0b' }}>
                {isOffice ? 'Office Staff' : 'Contract / Site'}
              </p>
              {emp?.uanNumber && (
                <p className="text-[10px] mt-1" style={{ color: 'var(--wz-text-muted)' }}>UAN: {emp.uanNumber}</p>
              )}
              {emp?.esiNumber && (
                <p className="text-[10px]" style={{ color: 'var(--wz-text-muted)' }}>ESI: {emp.esiNumber}</p>
              )}
            </div>
          </div>
        </div>

        {/* Attendance summary */}
        <div className="px-8 py-4 flex gap-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.01)' }}>
          {[
            { l: 'Working Days', v: workingDays,              c: 'var(--wz-text-secondary)' },
            { l: 'Present',      v: presentDays,              c: '#10b981'                  },
            { l: 'Absent',       v: absentDays,               c: '#f43f5e'                  },
            { l: 'Leave',        v: leaveDays,                c: '#f59e0b'                  },
            { l: 'Overtime Hrs', v: overtimeHours.toFixed(1), c: '#818cf8'                  },
          ].map(s => (
            <div key={s.l} className="flex-1 text-center p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--wz-text-muted)' }}>{s.l}</p>
              <p className="text-base font-bold" style={{ color: s.c, fontFamily: 'Plus Jakarta Sans' }}>{s.v}</p>
            </div>
          ))}
        </div>

        {/* Earnings + Deductions */}
        <div className="px-8 py-6">
          <div className="grid grid-cols-2 gap-8">

            {/* Earnings */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-3 w-1 rounded-full" style={{ background: '#10b981' }} />
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#10b981' }}>Earnings</p>
              </div>
              <Row label="Basic Salary" value={formatCurrency(basic)} />
              {da > 0     && <Row label="Dearness Allowance (DA)" value={formatCurrency(da)} />}
              {hra > 0    && <Row label="House Rent Allowance (HRA)" value={formatCurrency(hra)} />}
              {special > 0 && <Row label="Special Allowance" value={formatCurrency(special)} />}
              {Object.entries(otherEarnings).map(([k, v]) => (
                <Row key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} value={formatCurrency(v)} />
              ))}
              <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '2px solid rgba(16,185,129,0.2)' }}>
                <span className="text-sm font-bold" style={{ color: 'var(--wz-text-primary)' }}>Gross Earnings</span>
                <span className="text-base font-bold" style={{ color: '#10b981' }}>{formatCurrency(gross)}</span>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-3 w-1 rounded-full" style={{ background: '#f43f5e' }} />
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#f43f5e' }}>Deductions</p>
              </div>
              <Row label="PF (Employee 12%)" value={formatCurrency(pfEmp)} accent="#f43f5e" />
              {esiEmp > 0 && <Row label="ESI (Employee 0.75%)" value={formatCurrency(esiEmp)} accent="#f43f5e" />}
              {pt > 0     && <Row label="Professional Tax" value={formatCurrency(pt)} accent="#f43f5e" />}
              <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '2px solid rgba(244,63,94,0.2)' }}>
                <span className="text-sm font-bold" style={{ color: 'var(--wz-text-primary)' }}>Total Deductions</span>
                <span className="text-base font-bold" style={{ color: '#f43f5e' }}>{formatCurrency(totalDed)}</span>
              </div>

              {/* Employer contributions (informational) */}
              <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-[10px] uppercase tracking-wider font-bold mb-2" style={{ color: 'var(--wz-text-muted)' }}>Employer Contributions (CTC)</p>
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'var(--wz-text-muted)' }}>PF (Employer 12%)</span>
                  <span style={{ color: 'var(--wz-text-secondary)' }}>{formatCurrency(pfEmployer)}</span>
                </div>
                {esiEmployer > 0 && (
                  <div className="flex justify-between text-xs mt-1">
                    <span style={{ color: 'var(--wz-text-muted)' }}>ESI (Employer 3.25%)</span>
                    <span style={{ color: 'var(--wz-text-secondary)' }}>{formatCurrency(esiEmployer)}</span>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Net Pay banner */}
          <div className="mt-6 flex items-center justify-between px-8 py-5 rounded-2xl"
            style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.12),rgba(59,130,246,0.08))', border: '1.5px solid rgba(16,185,129,0.25)' }}>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: 'var(--wz-text-muted)' }}>Net Pay</p>
              <p className="text-sm" style={{ color: 'var(--wz-text-muted)' }}>Gross {formatCurrency(gross)} − Deductions {formatCurrency(totalDed)}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black" style={{ fontFamily: 'Plus Jakarta Sans', color: '#10b981' }}>
                {formatCurrency(net)}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--wz-text-muted)' }}>
                {payslip.paymentStatus === 'PAID' ? `✓ Paid${payslip.paidAt ? ' on ' + formatDate(payslip.paidAt) : ''}` : 'Pending'}
              </p>
            </div>
          </div>
        </div>

        {/* Bank details */}
        {bankDetails && (
          <div className="px-8 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.01)' }}>
            <p className="text-[10px] uppercase tracking-wider font-bold mb-2" style={{ color: 'var(--wz-text-muted)' }}>Bank Details</p>
            <div className="flex gap-6 text-xs">
              <span style={{ color: 'var(--wz-text-secondary)' }}>
                <span style={{ color: 'var(--wz-text-muted)' }}>Bank: </span>{bankDetails.bankName}
              </span>
              <span style={{ color: 'var(--wz-text-secondary)' }}>
                <span style={{ color: 'var(--wz-text-muted)' }}>A/C: </span>{bankDetails.accountNumber}
              </span>
              <span style={{ color: 'var(--wz-text-secondary)' }}>
                <span style={{ color: 'var(--wz-text-muted)' }}>IFSC: </span>{bankDetails.ifscCode ?? '—'}
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-8 py-4 flex items-center justify-between text-xs"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)', color: 'var(--wz-text-muted)' }}>
          <p>This is a system-generated payslip and does not require a signature.</p>
          <p>Generated by WorkZen ERP · {new Date().toLocaleDateString('en-IN')}</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          header, nav, aside, [class*="sidebar"] { display: none !important; }
          body { background: white !important; }
          .glass-card { background: white !important; border: 1px solid #e5e7eb !important; box-shadow: none !important; }
          * { color: #000 !important; }
        }
      `}</style>
    </div>
  );
}
