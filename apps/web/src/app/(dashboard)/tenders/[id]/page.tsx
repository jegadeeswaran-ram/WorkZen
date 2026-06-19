'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, FileText, Calendar, DollarSign, Users, MapPin,
  Briefcase, Building2, Clock, CheckCircle2, AlertCircle,
  Edit3, LayoutGrid, Layers, Receipt, ChevronRight, Hash,
  Shield, TrendingUp, Banknote, Info, ClipboardList,
} from 'lucide-react';
import { formatDate, formatCurrency, getInitials } from '@/lib/utils';
import { tendersApi } from '@/lib/api';
import { CreateTenderModal } from '../create-tender-modal';

// ── Status configs ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { color: string; bg: string; ring: string; label: string }> = {
  DRAFT:     { color: 'rgba(255,255,255,0.55)', bg: 'rgba(255,255,255,0.07)', ring: 'rgba(255,255,255,0.15)', label: 'Draft'     },
  SUBMITTED: { color: '#818cf8',               bg: 'rgba(99,102,241,0.12)',  ring: 'rgba(99,102,241,0.3)',  label: 'Submitted'  },
  AWARDED:   { color: '#10b981',               bg: 'rgba(16,185,129,0.12)', ring: 'rgba(16,185,129,0.3)', label: 'Awarded'    },
  ACTIVE:    { color: '#3b82f6',               bg: 'rgba(59,130,246,0.12)', ring: 'rgba(59,130,246,0.3)', label: 'Active'     },
  EXPIRED:   { color: '#f59e0b',               bg: 'rgba(245,158,11,0.12)', ring: 'rgba(245,158,11,0.3)', label: 'Expired'    },
  CANCELLED: { color: '#f43f5e',               bg: 'rgba(244,63,94,0.12)',  ring: 'rgba(244,63,94,0.3)',  label: 'Cancelled'  },
  REJECTED:  { color: '#f43f5e',               bg: 'rgba(244,63,94,0.12)',  ring: 'rgba(244,63,94,0.3)',  label: 'Rejected'   },
};

const WO_STATUS: Record<string, { color: string; bg: string; label: string }> = {
  DRAFT:     { color: 'rgba(255,255,255,0.45)', bg: 'rgba(255,255,255,0.06)', label: 'Draft'      },
  ISSUED:    { color: '#818cf8',               bg: 'rgba(99,102,241,0.12)',  label: 'Issued'     },
  ACTIVE:    { color: '#10b981',               bg: 'rgba(16,185,129,0.12)', label: 'Active'     },
  COMPLETED: { color: '#3b82f6',               bg: 'rgba(59,130,246,0.12)', label: 'Completed'  },
  CANCELLED: { color: '#f43f5e',               bg: 'rgba(244,63,94,0.12)',  label: 'Cancelled'  },
};

const CONTRACT_LABELS: Record<string, string> = {
  FIXED_TERM: 'Fixed Term',
  RUNNING:    'Running Account',
  RATE:       'Rate Contract',
  LUMPSUM:    'Lump Sum',
};

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',    label: 'Overview',    icon: LayoutGrid  },
  { id: 'workorders',  label: 'Work Orders', icon: ClipboardList },
  { id: 'deployment',  label: 'Deployment',  icon: Layers      },
  { id: 'financial',   label: 'Financial',   icon: TrendingUp  },
] as const;
type TabId = typeof TABS[number]['id'];

// ── Sub-components ────────────────────────────────────────────────────────────
function InfoBlock({ label, value, accent }: { label: string; value?: string | null; accent?: string }) {
  return (
    <div className="py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <p className="text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: 'var(--wz-text-muted)' }}>{label}</p>
      <p className="text-sm font-medium" style={{ color: value ? (accent ?? 'var(--wz-text-primary)') : 'rgba(255,255,255,0.2)' }}>
        {value || '—'}
      </p>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, color }}>
          <Icon size={13} />
        </div>
        <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--wz-text-muted)' }}>{label}</p>
      </div>
      <p className="text-xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>{value}</p>
    </div>
  );
}

function SectionCard({ title, icon: Icon, color = '#6366f1', children }: {
  title: string; icon: React.ElementType; color?: string; children: React.ReactNode;
}) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: `${color}08` }}>
        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${color}15`, color }}>
          <Icon size={12} />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{title}</h3>
      </div>
      <div className="px-5 pb-4">{children}</div>
    </div>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg ${className}`} style={{ background: 'rgba(255,255,255,0.05)' }} />;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TenderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showEdit, setShowEdit] = useState(false);

  const { data: tender, isLoading } = useQuery({
    queryKey: ['tender', id],
    queryFn: () => tendersApi.get(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-44 w-full" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <AlertCircle size={40} className="mb-4" style={{ color: 'rgba(255,255,255,0.15)' }} />
        <p className="font-semibold" style={{ color: 'var(--wz-text-primary)' }}>Tender not found</p>
        <button onClick={() => router.back()} className="btn-secondary mt-4 flex items-center gap-2">
          <ArrowLeft size={14} /> Go back
        </button>
      </div>
    );
  }

  const st = STATUS_CFG[tender.status] ?? STATUS_CFG.DRAFT;
  const workOrders: any[] = tender.workOrders ?? [];
  const deployments: any[] = tender.deployments ?? [];
  const daysLeft = tender.endDate
    ? Math.ceil((new Date(tender.endDate).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <>
      <CreateTenderModal open={showEdit} onClose={() => setShowEdit(false)} tender={tender} />

      <div className="space-y-5">
        {/* Back */}
        <button onClick={() => router.back()}
          className="flex items-center gap-2 text-sm transition-colors"
          style={{ color: 'var(--wz-text-muted)' }}
          onMouseOver={e => e.currentTarget.style.color = 'var(--wz-text-secondary)'}
          onMouseOut={e => e.currentTarget.style.color = 'var(--wz-text-muted)'}>
          <ArrowLeft size={15} /> Tenders
        </button>

        {/* ── Hero ── */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden">
          <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#6366f1,#3b82f6,#10b981)' }} />

          <div className="p-6 flex flex-col sm:flex-row gap-5 items-start">
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(59,130,246,0.12))', border: '1.5px solid rgba(99,102,241,0.25)' }}>
              <FileText size={22} style={{ color: '#818cf8' }} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>
                  {tender.tenderName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: st.bg, color: st.color, border: `1px solid ${st.ring}` }}>
                  {st.label}
                </span>
              </div>

              <div className="flex flex-wrap gap-4 text-xs mb-3" style={{ color: 'var(--wz-text-muted)' }}>
                <span className="flex items-center gap-1.5">
                  <Hash size={11} />
                  <code style={{ color: 'var(--wz-text-secondary)' }}>{tender.tenderNumber}</code>
                </span>
                {tender.department && (
                  <span className="flex items-center gap-1.5">
                    <Building2 size={11} /> {tender.department.name}
                  </span>
                )}
                {tender.contractType && (
                  <span className="flex items-center gap-1.5">
                    <Briefcase size={11} /> {CONTRACT_LABELS[tender.contractType] ?? tender.contractType}
                  </span>
                )}
                {tender.startDate && (
                  <span className="flex items-center gap-1.5">
                    <Calendar size={11} /> {formatDate(tender.startDate)} → {tender.endDate ? formatDate(tender.endDate) : 'Open'}
                  </span>
                )}
              </div>

              {/* Value + days left pills */}
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <DollarSign size={12} style={{ color: '#10b981' }} />
                  <span className="text-sm font-bold" style={{ color: '#10b981' }}>
                    {formatCurrency(Number(tender.tenderValue))}
                  </span>
                </div>
                {daysLeft !== null && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                    style={{
                      background: daysLeft < 0 ? 'rgba(244,63,94,0.08)' : daysLeft < 30 ? 'rgba(245,158,11,0.08)' : 'rgba(59,130,246,0.08)',
                      border: `1px solid ${daysLeft < 0 ? 'rgba(244,63,94,0.2)' : daysLeft < 30 ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.2)'}`,
                    }}>
                    <Clock size={12} style={{ color: daysLeft < 0 ? '#f43f5e' : daysLeft < 30 ? '#f59e0b' : '#3b82f6' }} />
                    <span className="text-xs font-semibold" style={{ color: daysLeft < 0 ? '#f43f5e' : daysLeft < 30 ? '#f59e0b' : '#3b82f6' }}>
                      {daysLeft < 0 ? `Expired ${Math.abs(daysLeft)}d ago` : `${daysLeft}d remaining`}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                  style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <Users size={12} style={{ color: '#818cf8' }} />
                  <span className="text-xs font-semibold" style={{ color: '#818cf8' }}>
                    {tender.requiredEmployees ?? 0} required
                  </span>
                </div>
              </div>
            </div>

            <button onClick={() => setShowEdit(true)} className="btn-secondary flex items-center gap-1.5 text-sm flex-shrink-0">
              <Edit3 size={13} /> Edit
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex gap-0 px-6 overflow-x-auto" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold transition-all relative whitespace-nowrap"
                  style={{ color: active ? '#818cf8' : 'var(--wz-text-muted)' }}>
                  <tab.icon size={13} />
                  {tab.label}
                  {active && (
                    <motion.div layoutId="tender-tab-ind"
                      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                      style={{ background: 'linear-gradient(90deg,#6366f1,#3b82f6)' }} />
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Contract Value" value={formatCurrency(Number(tender.tenderValue))} icon={DollarSign} color="#10b981" />
          <StatCard label="Deployed Staff" value={String(deployments.length)} icon={Users} color="#6366f1" />
          <StatCard label="Work Orders" value={String(workOrders.length)} icon={ClipboardList} color="#3b82f6" />
          <StatCard label="EMD Amount" value={tender.emdAmount ? formatCurrency(Number(tender.emdAmount)) : '—'} icon={Shield} color="#f59e0b" />
        </div>

        {/* ── Tab content ── */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>

            {/* ── OVERVIEW ── */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <SectionCard title="Contract Details" icon={FileText}>
                  <InfoBlock label="Tender Number" value={tender.tenderNumber} accent="#818cf8" />
                  <InfoBlock label="Contract Type" value={CONTRACT_LABELS[tender.contractType] ?? tender.contractType} />
                  <InfoBlock label="Required Employees" value={String(tender.requiredEmployees ?? 0)} />
                  <InfoBlock label="Bid Reference" value={tender.bidReference} />
                  <InfoBlock label="Description" value={tender.description} />
                </SectionCard>

                <SectionCard title="Key Dates" icon={Calendar} color="#3b82f6">
                  <InfoBlock label="Bid Date" value={tender.bidDate ? formatDate(tender.bidDate) : null} />
                  <InfoBlock label="Award Date" value={tender.awardDate ? formatDate(tender.awardDate) : null} accent="#10b981" />
                  <InfoBlock label="Start Date" value={tender.startDate ? formatDate(tender.startDate) : null} />
                  <InfoBlock label="End Date" value={tender.endDate ? formatDate(tender.endDate) : null} accent={daysLeft !== null && daysLeft < 30 ? '#f59e0b' : undefined} />
                </SectionCard>

                <SectionCard title="Security & EMD" icon={Shield} color="#f59e0b">
                  <InfoBlock label="EMD Amount" value={tender.emdAmount ? formatCurrency(Number(tender.emdAmount)) : null} accent="#10b981" />
                  <InfoBlock label="EMD Paid Date" value={tender.emdPaidDate ? formatDate(tender.emdPaidDate) : null} />
                  <InfoBlock label="EMD Refund Date" value={tender.emdRefundDate ? formatDate(tender.emdRefundDate) : null} />
                  <InfoBlock label="Security Deposit" value={tender.securityDeposit ? formatCurrency(Number(tender.securityDeposit)) : null} accent="#10b981" />
                  <InfoBlock label="Security Paid Date" value={tender.securityPaidDate ? formatDate(tender.securityPaidDate) : null} />
                </SectionCard>

                {/* Work Locations */}
                {tender.workLocations && Array.isArray(tender.workLocations) && tender.workLocations.length > 0 && (
                  <div className="lg:col-span-3">
                    <SectionCard title="Work Locations" icon={MapPin} color="#8b5cf6">
                      <div className="pt-2 flex flex-wrap gap-2">
                        {(tender.workLocations as string[]).map((loc: string, i: number) => (
                          <span key={i} className="px-3 py-1.5 rounded-lg text-xs font-medium"
                            style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' }}>
                            <MapPin size={10} className="inline mr-1" />{loc}
                          </span>
                        ))}
                      </div>
                    </SectionCard>
                  </div>
                )}

                {/* Notes */}
                {tender.notes && (
                  <div className="lg:col-span-3">
                    <SectionCard title="Notes" icon={Info}>
                      <p className="pt-2 text-sm leading-relaxed" style={{ color: 'var(--wz-text-secondary)' }}>{tender.notes}</p>
                    </SectionCard>
                  </div>
                )}
              </div>
            )}

            {/* ── WORK ORDERS ── */}
            {activeTab === 'workorders' && (
              <div className="glass-card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <h3 className="font-semibold text-sm" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>Work Orders</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                    {workOrders.length} orders
                  </span>
                </div>
                {workOrders.length ? (
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        {['Work Order No.', 'Title', 'Start Date', 'End Date', 'Value', 'Status'].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider"
                            style={{ color: 'var(--wz-text-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {workOrders.map((wo: any) => {
                        const ws = WO_STATUS[wo.status] ?? WO_STATUS.DRAFT;
                        return (
                          <tr key={wo.id} className="hover:bg-white/[0.015] transition-colors"
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td className="px-5 py-3.5">
                              <p className="text-sm font-mono font-medium" style={{ color: '#38bdf8' }}>{wo.workOrderNo}</p>
                            </td>
                            <td className="px-5 py-3.5">
                              <p className="text-sm font-medium" style={{ color: 'var(--wz-text-primary)' }}>{wo.title}</p>
                              {wo.governmentRef && (
                                <p className="text-xs" style={{ color: 'var(--wz-text-muted)' }}>Ref: {wo.governmentRef}</p>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-sm whitespace-nowrap" style={{ color: 'var(--wz-text-muted)' }}>
                              {formatDate(wo.startDate)}
                            </td>
                            <td className="px-5 py-3.5 text-sm whitespace-nowrap" style={{ color: 'var(--wz-text-muted)' }}>
                              {wo.endDate ? formatDate(wo.endDate) : '—'}
                            </td>
                            <td className="px-5 py-3.5 text-sm font-semibold" style={{ color: '#10b981' }}>
                              {formatCurrency(Number(wo.value ?? 0))}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                                style={{ background: ws.bg, color: ws.color }}>
                                {ws.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-24">
                    <ClipboardList size={40} className="mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                    <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>No work orders yet</p>
                  </div>
                )}
              </div>
            )}

            {/* ── DEPLOYMENT ── */}
            {activeTab === 'deployment' && (
              <div className="glass-card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <h3 className="font-semibold text-sm" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>Deployed Employees</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>
                    {deployments.length} staff
                  </span>
                </div>
                {deployments.length ? (
                  <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {deployments.map((d: any) => {
                      const emp = d.employee;
                      const ini = emp ? getInitials(emp.firstName, emp.lastName) : '??';
                      return (
                        <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                            {ini}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: 'var(--wz-text-primary)' }}>
                              {emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown'}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--wz-text-muted)' }}>
                              {d.startDate ? formatDate(d.startDate) : '?'} → {d.endDate ? formatDate(d.endDate) : 'Present'}
                            </p>
                          </div>
                          <div className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: d.status === 'ACTIVE' ? '#10b981' : 'rgba(255,255,255,0.2)' }} />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-24">
                    <Users size={40} className="mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                    <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>No employees deployed</p>
                  </div>
                )}
              </div>
            )}

            {/* ── FINANCIAL ── */}
            {activeTab === 'financial' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <SectionCard title="Contract Value Breakdown" icon={DollarSign} color="#10b981">
                  <InfoBlock label="Tender Value (Contract)" value={formatCurrency(Number(tender.tenderValue))} accent="#10b981" />
                  <InfoBlock label="Estimated Value" value={tender.estimatedValue ? formatCurrency(Number(tender.estimatedValue)) : null} />
                  <InfoBlock label="EMD Amount" value={tender.emdAmount ? formatCurrency(Number(tender.emdAmount)) : null} accent="#f59e0b" />
                  <InfoBlock label="Security Deposit" value={tender.securityDeposit ? formatCurrency(Number(tender.securityDeposit)) : null} accent="#f59e0b" />
                </SectionCard>

                <SectionCard title="Work Order Summary" icon={Receipt} color="#3b82f6">
                  <InfoBlock
                    label="Total Work Orders"
                    value={String(workOrders.length)} />
                  <InfoBlock
                    label="Active Work Orders"
                    value={String(workOrders.filter((wo: any) => wo.status === 'ACTIVE').length)}
                    accent="#10b981" />
                  <InfoBlock
                    label="Total WO Value"
                    value={formatCurrency(workOrders.reduce((s: number, wo: any) => s + Number(wo.value ?? 0), 0))}
                    accent="#10b981" />
                  <InfoBlock
                    label="Deployed Employees"
                    value={`${deployments.length} / ${tender.requiredEmployees ?? 0} required`}
                    accent={deployments.length >= (tender.requiredEmployees ?? 0) ? '#10b981' : '#f59e0b'} />
                </SectionCard>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
