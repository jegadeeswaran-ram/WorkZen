'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BarChart3,
  FileText,
  Download,
  Play,
  TrendingUp,
  Users,
  Receipt,
  Shield,
  Clock,
  Search,
  Briefcase,
  Building2,
  MapPin,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { BarChart } from '@/components/charts/bar-chart';
import { DonutChart } from '@/components/charts/donut-chart';
import { reportsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const REPORT_TEMPLATES = [
  { id: 'employee-report', name: 'Employee Report', description: 'Complete employee roster with status', icon: Users, color: '#6366f1', category: 'HR' },
  { id: 'attendance-summary', name: 'Attendance Summary', description: 'Monthly attendance + leave analysis', icon: Clock, color: '#10b981', category: 'HR' },
  { id: 'payroll-register', name: 'Payroll Register', description: 'Salary details with deductions', icon: Receipt, color: '#f59e0b', category: 'Finance' },
  { id: 'tender-revenue', name: 'Tender Revenue', description: 'Revenue per tender and profitability', icon: TrendingUp, color: '#3b82f6', category: 'Tender' },
  { id: 'billing-aging', name: 'Billing Aging', description: 'Outstanding invoices by age', icon: FileText, color: '#f43f5e', category: 'Finance' },
  { id: 'compliance-status', name: 'Compliance Status', description: 'PF/ESI/PT filing status', icon: Shield, color: '#8b5cf6', category: 'Compliance' },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEK_DATA = [
  { day: 'Mon', present: 248, absent: 19 },
  { day: 'Tue', present: 251, absent: 16 },
  { day: 'Wed', present: 244, absent: 23 },
  { day: 'Thu', present: 256, absent: 11 },
  { day: 'Fri', present: 239, absent: 28 },
  { day: 'Sat', present: 187, absent: 80 },
  { day: 'Sun', present: 42, absent: 225 },
];

// ---------------------------------------------------------------------------
// KPI card component
// ---------------------------------------------------------------------------

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
  danger?: boolean;
}

function KpiCard({ label, value, icon: Icon, color, loading, danger }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 flex items-center gap-4"
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18`, color, border: `1px solid ${color}28` }}
      >
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
        {loading ? (
          <div className="h-5 w-16 mt-1 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.08)' }} />
        ) : (
          <p
            className="text-lg font-bold mt-0.5 leading-none"
            style={{ color: danger && Number(value) > 0 ? '#f43f5e' : 'white', fontFamily: 'Plus Jakarta Sans' }}
          >
            {value}
          </p>
        )}
      </div>
      {danger && !loading && Number(value) > 0 && (
        <div className="ml-auto">
          <AlertTriangle size={16} className="text-red-400" />
        </div>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');

  // Live KPI summary
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['reports-summary'],
    queryFn: reportsApi.summary,
    staleTime: 60_000,
  });

  // Run report mutation
  const { mutate: runReport, isPending: running } = useMutation({
    mutationFn: (id: string) => reportsApi.generate(id, {}),
    onSuccess: () => toast.success('Report queued for generation'),
    onError: () => toast.error('Failed to run report'),
  });

  const filtered = REPORT_TEMPLATES.filter(
    (r) =>
      (category === 'ALL' || r.category === category) &&
      r.name.toLowerCase().includes(search.toLowerCase()),
  );

  const kpis: KpiCardProps[] = [
    {
      label: 'Active Employees',
      value: summaryLoading ? '' : (summary?.employees ?? '—'),
      icon: Users,
      color: '#6366f1',
      loading: summaryLoading,
    },
    {
      label: 'Active Tenders',
      value: summaryLoading ? '' : (summary?.activeTenders ?? '—'),
      icon: Briefcase,
      color: '#3b82f6',
      loading: summaryLoading,
    },
    {
      label: 'Active Clients',
      value: summaryLoading ? '' : (summary?.totalClients ?? '—'),
      icon: Building2,
      color: '#10b981',
      loading: summaryLoading,
    },
    {
      label: 'Active Deployments',
      value: summaryLoading ? '' : (summary?.deploymentsActive ?? '—'),
      icon: MapPin,
      color: '#f59e0b',
      loading: summaryLoading,
    },
    {
      label: 'Monthly Billing',
      value: summaryLoading ? '' : formatCurrency(summary?.invoicesThisMonth ?? 0),
      icon: Receipt,
      color: '#22d3ee',
      loading: summaryLoading,
    },
    {
      label: 'Outstanding',
      value: summaryLoading ? '' : formatCurrency(summary?.outstanding ?? 0),
      icon: TrendingUp,
      color: '#f43f5e',
      loading: summaryLoading,
    },
    {
      label: 'Compliance Overdue',
      value: summaryLoading ? '' : (summary?.complianceOverdue ?? '—'),
      icon: Shield,
      color: '#8b5cf6',
      loading: summaryLoading,
      danger: true,
    },
    {
      label: 'Monthly Payroll',
      value: summaryLoading ? '' : formatCurrency(summary?.payrollThisMonth?.totalNet ?? 0),
      icon: BarChart3,
      color: '#a855f7',
      loading: summaryLoading,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Reports & Analytics
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Real-time dashboards and exportable reports
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Download size={14} /> Export All
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* KPI row — 8 cards, 2 rows of 4                                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <KpiCard {...kpi} />
          </motion.div>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Charts row                                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="glass-card p-5 lg:col-span-2">
          <h3 className="font-semibold text-white mb-4" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            YTD Revenue vs Expenses
          </h3>
          <BarChart
            series={[
              { name: 'Revenue', data: [2800000, 3100000, 2950000, 3400000, 3200000, 3750000, 3550000, 3900000, 3800000, 4100000, 3950000, 4300000] },
              { name: 'Expenses', data: [2200000, 2400000, 2300000, 2600000, 2500000, 2800000, 2750000, 2950000, 2900000, 3100000, 3000000, 3200000] },
            ]}
            categories={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']}
            height={240}
          />
        </div>
        <div className="space-y-6">
          <div className="glass-card p-5">
            <h3 className="font-semibold text-white mb-3" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              Workforce Distribution
            </h3>
            <DonutChart
              series={[185, 42, 28, 12]}
              labels={['Security', 'Housekeeping', 'Technical', 'Others']}
              height={200}
            />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Tender profitability                                                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="glass-card p-5">
        <h3 className="font-semibold text-white mb-4" style={{ fontFamily: 'Plus Jakarta Sans' }}>
          Tender-wise Profitability
        </h3>
        <BarChart
          series={[
            { name: 'Revenue', data: [1250000, 890000, 1100000, 650000, 920000] },
            { name: 'Cost', data: [980000, 720000, 850000, 540000, 730000] },
          ]}
          categories={['NHAI #0087', 'PWD #0023', 'Municipal #0056', 'DDA #0012', 'BRO #0089']}
          height={200}
          horizontal
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Weekly attendance heatmap-style overview                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="glass-card p-5">
        <h3 className="font-semibold text-white mb-5" style={{ fontFamily: 'Plus Jakarta Sans' }}>
          Weekly Attendance Overview
        </h3>
        <div className="grid grid-cols-7 gap-3">
          {WEEK_DATA.map((d, i) => {
            const total = d.present + d.absent;
            const pct = Math.round((d.present / total) * 100);
            const isWeekend = i >= 5;
            return (
              <motion.div
                key={d.day}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="flex flex-col items-center gap-2"
              >
                <span className="text-xs font-medium" style={{ color: isWeekend ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.5)' }}>
                  {d.day}
                </span>
                {/* stacked bar */}
                <div className="w-full h-20 rounded-lg overflow-hidden flex flex-col-reverse" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div
                    className="w-full rounded-b-lg transition-all"
                    style={{ height: `${pct}%`, background: isWeekend ? 'rgba(99,102,241,0.35)' : 'rgba(16,185,129,0.45)' }}
                  />
                </div>
                <span className="text-xs font-bold" style={{ color: isWeekend ? 'rgba(255,255,255,0.3)' : '#10b981' }}>
                  {pct}%
                </span>
                <div className="text-center">
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{d.present} in</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>{d.absent} out</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Report Templates                                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Report Templates
          </h3>
          <div className="flex gap-2 flex-wrap">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <Search size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="bg-transparent text-sm outline-none w-32"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              />
            </div>
            {['ALL', 'HR', 'Finance', 'Tender', 'Compliance'].map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: category === c ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                  color: category === c ? '#818cf8' : 'rgba(255,255,255,0.4)',
                  border: `1px solid ${category === c ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass-card-hover p-4 flex items-start gap-4"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${r.color}15`, color: r.color, border: `1px solid ${r.color}25` }}
              >
                <r.icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white text-sm">{r.name}</p>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {r.description}
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => runReport(r.id)}
                    disabled={running}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:opacity-80 disabled:opacity-50"
                    style={{ background: `${r.color}15`, color: r.color, border: `1px solid ${r.color}25` }}
                  >
                    {running ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                    Run
                  </button>
                  <button
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      color: 'rgba(255,255,255,0.5)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <Download size={11} /> Export
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
