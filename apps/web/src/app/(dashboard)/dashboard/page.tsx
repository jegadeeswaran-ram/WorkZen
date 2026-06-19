'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users, FileText, Receipt, CreditCard, TrendingUp, TrendingDown,
  AlertCircle, Clock, CheckCircle2, Building2,
  MapPin, ChevronRight, Calendar,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { reportsApi, billingApi, workflowsApi } from '@/lib/api';
import { AreaChart } from '@/components/charts/area-chart';
import { DonutChart } from '@/components/charts/donut-chart';
import { BarChart } from '@/components/charts/bar-chart';

const fadeIn = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

function StatCard({
  label, value, icon: Icon, color, change, changeLabel, index
}: {
  label: string; value: string | number; icon: React.ElementType;
  color: string; change?: number; changeLabel?: string; index: number;
}) {
  const positive = (change ?? 0) >= 0;
  return (
    <motion.div
      {...fadeIn}
      transition={{ delay: index * 0.07 }}
      className="stat-card"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-xs font-medium mb-1 uppercase tracking-wider" style={{ color: 'var(--wz-text-muted)' }}>{label}</p>
          <p className="text-2xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      {change !== undefined && (
        <div className="flex items-center gap-1.5">
          {positive ? <TrendingUp size={13} style={{ color: '#10b981' }} /> : <TrendingDown size={13} style={{ color: '#f43f5e' }} />}
          <span className="text-xs font-medium" style={{ color: positive ? '#10b981' : '#f43f5e' }}>
            {positive ? '+' : ''}{change}%
          </span>
          {changeLabel && <span className="text-xs" style={{ color: 'var(--wz-text-muted)' }}>{changeLabel}</span>}
        </div>
      )}
    </motion.div>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const currentMonth = new Date().getMonth();
const last6Months = Array.from({ length: 6 }, (_, i) => MONTHS[(currentMonth - 5 + i + 12) % 12]);

export default function DashboardPage() {
  const { data: summary } = useQuery({ queryKey: ['summary'], queryFn: reportsApi.summary });
  const { data: billingDash } = useQuery({ queryKey: ['billing-dash'], queryFn: billingApi.dashboard });
  const { data: approvals = [] } = useQuery({
    queryKey: ['dashboard-approvals'],
    queryFn: workflowsApi.myApprovals,
  });

  const recentActivities = [
    { action: 'New employee joined', name: 'Rajesh Kumar', time: '2 min ago', type: 'employee', color: '#10b981' },
    { action: 'Invoice generated', name: 'INV-2024-00045', time: '15 min ago', type: 'billing', color: '#6366f1' },
    { action: 'Payroll approved', name: 'December 2024', time: '1 hr ago', type: 'payroll', color: '#f59e0b' },
    { action: 'Tender awarded', name: 'NHAI Contract #0087', time: '2 hrs ago', type: 'tender', color: '#3b82f6' },
    { action: 'Leave request', name: 'Priya Sharma — 3 days', time: '3 hrs ago', type: 'attendance', color: '#8b5cf6' },
  ];

  const pendingApprovals = (approvals as Record<string, unknown>[]).slice(0, 4).map((a) => ({
    type: ((a.instance as Record<string, unknown>)?.workflow as Record<string, string>)?.name ?? 'Approval',
    detail: `${(a.instance as Record<string, unknown>)?.entityType ?? ''} ${String((a.instance as Record<string, unknown>)?.entityId ?? '').slice(-6)}`,
    urgency: 'MEDIUM' as const,
    dueDate: a.createdAt as string,
  }));

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(79,70,229,0.15) 0%, rgba(99,102,241,0.08) 50%, rgba(59,130,246,0.05) 100%)',
          border: '1px solid rgba(99,102,241,0.2)',
        }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)', transform: 'translate(30%, -40%)' }} />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-1" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>
              Good morning, John 👋
            </h2>
            <p style={{ color: 'var(--wz-text-muted)', fontSize: '0.9rem' }}>
              Here's what's happening with your operations today.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl text-sm" style={{ background: 'var(--wz-input-bg)', color: 'var(--wz-text-muted)' }}>
              <Calendar size={14} className="inline mr-2" />
              {formatDate(new Date().toISOString())}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Employees" value={summary?.employees ?? '—'} icon={Users} color="#6366f1" change={4.2} changeLabel="vs last month" index={0} />
        <StatCard label="Active Tenders" value={summary?.activeTenders ?? '—'} icon={FileText} color="#3b82f6" change={2} changeLabel="new this month" index={1} />
        <StatCard label="Monthly Billing" value={formatCurrency(summary?.invoicesThisMonth ?? 0)} icon={Receipt} color="#10b981" change={8.5} changeLabel="vs last month" index={2} />
        <StatCard label="Last Payroll" value={formatCurrency(summary?.payrollThisMonth?.totalNet ?? 0)} icon={CreditCard} color="#f59e0b" change={-1.2} changeLabel="vs last month" index={3} />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Outstanding" value={formatCurrency(billingDash?.outstanding ?? 0)} icon={AlertCircle} color="#f43f5e" index={4} />
        <StatCard label="Compliance Due" value={`${summary?.complianceOverdue ?? 0} Items`} icon={CheckCircle2} color="#8b5cf6" index={5} />
        <StatCard label="Deployed Staff" value={summary?.deploymentsActive ?? '—'} icon={MapPin} color="#06b6d4" index={6} />
        <StatCard label="Active Clients" value={summary?.totalClients ?? '—'} icon={Building2} color="#f97316" index={7} />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue trend */}
        <div className="glass-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>Revenue Trend</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--wz-text-muted)' }}>Last 6 months</p>
            </div>
            <div className="flex gap-2">
              {['Revenue', 'Expenses'].map((l, i) => (
                <div key={l} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: i === 0 ? '#6366f1' : '#10b981' }} />
                  <span className="text-xs" style={{ color: 'var(--wz-text-muted)' }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
          <AreaChart
            series={[
              { name: 'Revenue', data: [2850000, 3120000, 2980000, 3450000, 3200000, 3780000], color: '#6366f1' },
              { name: 'Expenses', data: [1950000, 2100000, 1980000, 2200000, 2150000, 2400000], color: '#10b981' },
            ]}
            categories={last6Months}
            height={200}
          />
        </div>

        {/* Tender status */}
        <div className="glass-card p-5">
          <div className="mb-4">
            <h3 className="font-semibold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>Tender Status</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--wz-text-muted)' }}>Distribution</p>
          </div>
          <DonutChart
            series={[12, 5, 3, 8]}
            labels={['Active', 'Completed', 'Expired', 'Draft']}
            colors={['#6366f1', '#10b981', '#f43f5e', '#94a3b8']}
            height={220}
          />
        </div>
      </div>

      {/* Attendance + Payroll charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>Attendance Overview</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--wz-text-muted)' }}>This month</p>
            </div>
          </div>
          <BarChart
            series={[
              { name: 'Present', data: [220, 215, 218, 225, 210, 222, 228] },
              { name: 'Absent', data: [14, 19, 16, 9, 24, 12, 6] },
            ]}
            categories={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
            height={200}
          />
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>Payroll by Department</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--wz-text-muted)' }}>December 2024</p>
            </div>
          </div>
          <BarChart
            series={[{ name: 'Net Pay (₹)', data: [850000, 620000, 480000, 390000, 280000] }]}
            categories={['Security', 'Housekeeping', 'Technical', 'Admin', 'Others']}
            colors={['#f59e0b']}
            height={200}
            horizontal
          />
        </div>
      </div>

      {/* Activity + Pending Approvals */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>Recent Activity</h3>
            <button className="text-xs font-medium" style={{ color: '#818cf8' }}>View all</button>
          </div>
          <div className="space-y-3">
            {recentActivities.map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'var(--wz-input-bg)', border: '1px solid var(--wz-card-border)' }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${a.color}15`, border: `1px solid ${a.color}25` }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: a.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--wz-text-primary)' }}>{a.action}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--wz-text-muted)' }}>{a.name}</p>
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--wz-text-muted)' }}>{a.time}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>Pending Approvals</h3>
            <span className="text-xs px-2 py-0.5 rounded-full badge-danger">{pendingApprovals.length}</span>
          </div>
          <div className="space-y-3">
            {pendingApprovals.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 size={28} style={{ color: 'var(--wz-text-muted)' }} className="mx-auto mb-2" />
                <p className="text-sm" style={{ color: 'var(--wz-text-muted)' }}>No pending approvals</p>
              </div>
            ) : pendingApprovals.map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer group"
                style={{ background: 'var(--wz-input-bg)', border: '1px solid var(--wz-card-border)' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium" style={{ color: 'var(--wz-text-primary)' }}>{a.type}</p>
                    <span className={`badge text-xs ${a.urgency === 'HIGH' ? 'badge-danger' : a.urgency === 'MEDIUM' ? 'badge-warning' : 'badge-neutral'}`}>
                      {a.urgency}
                    </span>
                  </div>
                  <p className="text-xs truncate" style={{ color: 'var(--wz-text-muted)' }}>{a.detail}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--wz-text-muted)' }}>
                    <Clock size={10} className="inline mr-1" />Due {formatDate(a.dueDate)}
                  </p>
                </div>
                <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.2)' }}
                  className="group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
