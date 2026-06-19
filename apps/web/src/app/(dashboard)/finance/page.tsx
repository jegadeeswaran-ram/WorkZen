'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, DollarSign, AlertCircle,
  Clock, Percent, Calendar, BarChart2, ArrowUpRight,
  ArrowDownRight, CreditCard, Users,
} from 'lucide-react';
import { financeApi, revenueApi, arApi } from '@/lib/api';

// ─── Helpers ────────────────────────────────────────────────────────────────

const INR = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

// ─── Invoice status config ───────────────────────────────────────────────────
const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  DRAFT:          { color: 'rgba(255,255,255,0.5)',  bg: 'rgba(255,255,255,0.06)',  label: 'Draft' },
  SENT:           { color: '#818cf8',                bg: 'rgba(99,102,241,0.12)',   label: 'Sent' },
  PARTIALLY_PAID: { color: '#f59e0b',                bg: 'rgba(245,158,11,0.12)',   label: 'Partially Paid' },
  PAID:           { color: '#10b981',                bg: 'rgba(16,185,129,0.12)',   label: 'Paid' },
  OVERDUE:        { color: '#f43f5e',                bg: 'rgba(244,63,94,0.12)',    label: 'Overdue' },
  CANCELLED:      { color: '#6b7280',                bg: 'rgba(107,114,128,0.1)',   label: 'Cancelled' },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className ?? ''}`}
      style={{ background: 'rgba(255,255,255,0.06)' }}
    />
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────
function KpiCard({
  label, value, icon: Icon, color, sub, badge, loading,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  sub?: string;
  badge?: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {label}
        </p>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${color}18`, color }}
        >
          <Icon size={15} />
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-32" />
      ) : (
        <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
          {value}
        </p>
      )}
      {sub && (
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {sub}
        </p>
      )}
      {badge}
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────
export default function FinanceDashboardPage() {
  // ── Data fetching ──────────────────────────────────────────────────────
  const { data: dashRaw, isLoading: dashLoading } = useQuery({
    queryKey: ['finance-dashboard'],
    queryFn: financeApi.dashboard,
  });

  const { data: chartRaw, isLoading: chartLoading } = useQuery({
    queryKey: ['revenue-monthly-chart'],
    queryFn: () => revenueApi.getMonthlyChart(12),
  });

  const { data: agingRaw, isLoading: agingLoading } = useQuery({
    queryKey: ['ar-aging'],
    queryFn: arApi.getAging,
  });

  // ── Normalise ──────────────────────────────────────────────────────────
  const kpis = (dashRaw as any)?.kpis ?? {};
  const topClients: any[] = (dashRaw as any)?.topClients ?? [];
  const recentInvoices: any[] = (dashRaw as any)?.recentInvoices ?? [];

  const aging = (agingRaw as any) ?? {};
  const agingBuckets = [
    { label: 'Current',     value: Number(aging.current  ?? 0), color: '#10b981' },
    { label: '1–30 Days',   value: Number(aging.days30   ?? 0), color: '#6366f1' },
    { label: '31–60 Days',  value: Number(aging.days60   ?? 0), color: '#f59e0b' },
    { label: '61–90 Days',  value: Number(aging.days90   ?? 0), color: '#f97316' },
    { label: '90+ Days',    value: Number(aging.over90   ?? 0), color: '#f43f5e' },
  ];
  const agingTotal = agingBuckets.reduce((s, b) => s + b.value, 0) || 1;

  const chartData: { month: string; revenue: number }[] = Array.isArray(chartRaw) ? chartRaw : [];
  const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 1);

  // ── Top clients total for progress bars ───────────────────────────────
  const clientTotal = topClients.reduce((s: number, c: any) => s + Number(c.outstanding ?? 0), 0) || 1;

  // ── Revenue growth badge ───────────────────────────────────────────────
  const growth = Number(kpis.revenueGrowth ?? 0);
  const GrowthBadge = () => (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{
        background: growth >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)',
        color: growth >= 0 ? '#10b981' : '#f43f5e',
      }}
    >
      {growth >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
      {Math.abs(growth).toFixed(1)}% vs last month
    </span>
  );

  // ── KPI cards config ───────────────────────────────────────────────────
  const kpiCards = [
    {
      label: 'FY Revenue',
      value: INR(Number(kpis.fyRevenue ?? 0)),
      icon: TrendingUp,
      color: '#10b981',
      badge: <GrowthBadge />,
    },
    {
      label: 'This Month Billing',
      value: INR(Number(kpis.thisMonthBilling ?? 0)),
      icon: DollarSign,
      color: '#6366f1',
    },
    {
      label: 'AR Outstanding',
      value: INR(Number(kpis.arOutstanding ?? 0)),
      icon: Clock,
      color: '#f59e0b',
      sub: `Collection Efficiency: ${Number(kpis.collectionEfficiency ?? 0).toFixed(1)}%`,
    },
    {
      label: 'Overdue Amount',
      value: INR(Number(kpis.overdueAmount ?? 0)),
      icon: AlertCircle,
      color: '#f43f5e',
      sub: `${kpis.overdueCount ?? 0} invoices overdue`,
    },
    {
      label: 'GST Liability',
      value: INR(Number(kpis.gstLiability ?? 0)),
      icon: Percent,
      color: '#a855f7',
    },
    {
      label: 'DSO',
      value: `${Number(kpis.dso ?? 0).toFixed(0)} days`,
      icon: Calendar,
      color: '#6b7280',
      sub: 'Days Sales Outstanding',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-bold text-white"
            style={{ fontFamily: 'Plus Jakarta Sans' }}
          >
            Finance Dashboard
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Revenue, receivables, billing, and compliance at a glance
          </p>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass-card p-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <p
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                {card.label}
              </p>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${card.color}18`, color: card.color }}
              >
                <card.icon size={15} />
              </div>
            </div>
            {dashLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <p
                className="text-xl font-bold text-white leading-tight"
                style={{ fontFamily: 'Plus Jakarta Sans' }}
              >
                {card.value}
              </p>
            )}
            {card.badge && !dashLoading && card.badge}
            {card.sub && !dashLoading && (
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {card.sub}
              </p>
            )}
          </motion.div>
        ))}
      </div>

      {/* ── Middle Row: Aging + Chart ──────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Aging Summary */}
        <div className="glass-card p-6">
          <h3
            className="font-semibold text-white mb-5"
            style={{ fontFamily: 'Plus Jakarta Sans' }}
          >
            AR Aging Summary
          </h3>
          {agingLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {agingBuckets.map((bucket) => {
                const pct = (bucket.value / agingTotal) * 100;
                return (
                  <div key={bucket.label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span style={{ color: 'rgba(255,255,255,0.6)' }}>{bucket.label}</span>
                      <span className="font-medium" style={{ color: bucket.color }}>
                        {INR(bucket.value)}
                        <span
                          className="ml-2 text-xs"
                          style={{ color: 'rgba(255,255,255,0.3)' }}
                        >
                          {pct.toFixed(1)}%
                        </span>
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: bucket.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* 5-column totals */}
          {!agingLoading && (
            <div className="grid grid-cols-5 gap-2 mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {agingBuckets.map((b) => (
                <div key={b.label} className="text-center">
                  <div
                    className="w-2 h-2 rounded-full mx-auto mb-1"
                    style={{ background: b.color }}
                  />
                  <p className="text-xs font-medium" style={{ color: b.color }}>
                    {INR(b.value)}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {b.label}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Monthly Revenue Chart */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3
              className="font-semibold text-white"
              style={{ fontFamily: 'Plus Jakarta Sans' }}
            >
              Monthly Revenue
            </h3>
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
              style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}
            >
              <BarChart2 size={11} /> Last 12 Months
            </div>
          </div>
          {chartLoading ? (
            <div className="flex items-end gap-2 h-40">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="flex-1" style={{ height: `${30 + Math.random() * 70}%` }}>
                  <Skeleton className="w-full h-full" />
                </div>
              ))}
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-40 flex items-center justify-center">
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                No revenue data available
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-end gap-1.5 h-40">
                {chartData.map((d, i) => {
                  const heightPct = (d.revenue / maxRevenue) * 100;
                  const isLatest = i === chartData.length - 1;
                  return (
                    <div
                      key={d.month ?? i}
                      className="flex-1 flex flex-col items-center gap-1 group relative"
                    >
                      {/* Tooltip */}
                      <div
                        className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap"
                        style={{
                          background: 'var(--wz-card-bg)',
                          border: '1px solid var(--wz-card-border)',
                          borderRadius: 6,
                          padding: '4px 8px',
                        }}
                      >
                        <p className="text-xs font-medium" style={{ color: 'var(--wz-text-primary)' }}>{INR(d.revenue)}</p>
                        <p className="text-xs" style={{ color: 'var(--wz-text-muted)' }}>
                          {d.month}
                        </p>
                      </div>
                      <div
                        className="w-full rounded-t transition-all duration-500"
                        style={{
                          height: `${Math.max(heightPct, 4)}%`,
                          background: isLatest
                            ? '#6366f1'
                            : 'rgba(99,102,241,0.35)',
                          minHeight: 4,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-1.5 mt-2">
                {chartData.map((d, i) => (
                  <p
                    key={i}
                    className="flex-1 text-center text-xs truncate"
                    style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}
                  >
                    {(d.month ?? '').slice(0, 3)}
                  </p>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Bottom Row: Top Clients + Recent Invoices ──────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top Clients */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Users size={16} style={{ color: '#818cf8' }} />
            <h3
              className="font-semibold text-white"
              style={{ fontFamily: 'Plus Jakarta Sans' }}
            >
              Top Clients by Outstanding
            </h3>
          </div>
          {dashLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-2" />
                </div>
              ))}
            </div>
          ) : topClients.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                No outstanding amounts
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {topClients.slice(0, 5).map((client: any, i: number) => {
                const outstanding = Number(client.outstanding ?? 0);
                const pct = (outstanding / clientTotal) * 100;
                return (
                  <div key={client.clientId ?? i}>
                    <div className="flex justify-between items-center mb-1.5">
                      <p className="text-sm text-white font-medium truncate pr-4">
                        {client.clientName ?? '—'}
                      </p>
                      <p
                        className="text-sm font-semibold whitespace-nowrap"
                        style={{ color: '#f59e0b' }}
                      >
                        {INR(outstanding)}
                      </p>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background: `hsl(${220 + i * 20}, 80%, 60%)`,
                        }}
                      />
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      {pct.toFixed(1)}% of total outstanding
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Invoices */}
        <div className="glass-card overflow-hidden">
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            <CreditCard size={16} style={{ color: '#818cf8' }} />
            <h3
              className="font-semibold text-white"
              style={{ fontFamily: 'Plus Jakarta Sans' }}
            >
              Recent Invoices
            </h3>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['Invoice No.', 'Client', 'Amount', 'Status', 'Date'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dashLoading &&
                [...Array(6)].map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4" />
                      </td>
                    ))}
                  </tr>
                ))}
              {!dashLoading && recentInvoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      No recent invoices
                    </p>
                  </td>
                </tr>
              )}
              {!dashLoading &&
                recentInvoices.map((inv: any) => {
                  const cfg = STATUS_CFG[inv.status] ?? STATUS_CFG.DRAFT;
                  return (
                    <tr
                      key={inv.invoiceNo ?? inv.id}
                      className="hover:bg-white/[0.015] transition-colors"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    >
                      <td className="px-4 py-3">
                        <p
                          className="text-sm font-mono font-medium"
                          style={{ color: '#818cf8' }}
                        >
                          {inv.invoiceNo}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-white truncate max-w-[120px]">
                          {inv.client?.name ?? '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p
                          className="text-sm font-medium"
                          style={{ color: '#10b981' }}
                        >
                          {INR(Number(inv.totalAmount ?? 0))}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: cfg.color }}
                          />
                          {cfg.label}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-sm"
                        style={{ color: 'rgba(255,255,255,0.4)' }}
                      >
                        {inv.createdAt ? formatDate(inv.createdAt) : '—'}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
