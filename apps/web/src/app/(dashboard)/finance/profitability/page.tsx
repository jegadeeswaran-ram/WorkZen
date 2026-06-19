'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Minus, ChevronRight, X,
  IndianRupee, BarChart3, Loader2, Plus, Calendar,
  CheckSquare, Square, RefreshCw, ArrowUpRight, ArrowDownRight,
  FileText, Tag, DollarSign, PieChart, Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { tenderProfitabilityApi } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CostPeriod {
  revenue: number;
  salaryCost: number;
  pfCost: number;
  esiCost: number;
  adminCost: number;
  travelCost: number;
  uniformCost: number;
  assetCost: number;
  otherCost: number;
  grossProfit: number;
  netProfit: number;
  netMargin: number;
}

interface TenderDashboardItem {
  tenderId: string;
  tenderName: string;
  tenderNo: string;
  currentMonth: CostPeriod | null;
}

interface TenderProfitability {
  id: string;
  tenderId: string;
  period: string; // YYYY-MM
  revenue: number;
  salaryCost: number;
  pfCost: number;
  esiCost: number;
  adminCost: number;
  travelCost: number;
  uniformCost: number;
  assetCost: number;
  otherCost: number;
  grossProfit: number;
  netProfit: number;
  netMargin: number;
}

interface CostEntry {
  id: string;
  category: string;
  amount: number;
  period: string;
  description?: string;
  createdAt: string;
}

type CostCategory = 'SALARY' | 'PF' | 'ESI' | 'ADMIN' | 'TRAVEL' | 'UNIFORM' | 'ASSET' | 'OTHER';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const INR = (v: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(v ?? 0);

const INR_COMPACT = (v: number) => {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`;
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return INR(v);
};

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const fmtPeriod = (p: string) => {
  if (!p) return '—';
  const [y, m] = p.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
};

const totalCost = (p: CostPeriod) =>
  (p.salaryCost ?? 0) + (p.pfCost ?? 0) + (p.esiCost ?? 0) +
  (p.adminCost ?? 0) + (p.travelCost ?? 0) + (p.uniformCost ?? 0) +
  (p.assetCost ?? 0) + (p.otherCost ?? 0);

const grossMarginPct = (p: CostPeriod) =>
  p.revenue > 0 ? ((p.grossProfit ?? 0) / p.revenue) * 100 : 0;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className ?? ''}`}
      style={{ background: 'rgba(255,255,255,0.06)' }}
    />
  );
}

// ─── Margin Ring ──────────────────────────────────────────────────────────────

function MarginRing({ margin }: { margin: number }) {
  const color = margin > 15 ? '#10b981' : margin > 5 ? '#f59e0b' : '#f43f5e';
  const glow  = margin > 15 ? 'rgba(16,185,129,0.3)' : margin > 5 ? 'rgba(245,158,11,0.3)' : 'rgba(244,63,94,0.3)';
  const clamped = Math.min(Math.max(margin, 0), 100);
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = (clamped / 100) * circ;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 64, height: 64 }}>
      <svg width={64} height={64} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={32} cy={32} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
        <circle
          cx={32} cy={32} r={r}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${glow})`, transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-xs font-bold leading-none" style={{ color }}>{margin.toFixed(1)}%</p>
      </div>
    </div>
  );
}

// ─── Cost Breakdown Bar ───────────────────────────────────────────────────────

const COST_SEGMENTS = [
  { key: 'salaryCost',  label: 'Salary',  color: '#818cf8' },
  { key: 'pfCost',      label: 'PF',      color: '#38bdf8' },
  { key: 'esiCost',     label: 'ESI',     color: '#34d399' },
  { key: 'adminCost',   label: 'Admin',   color: '#f59e0b' },
  { key: 'travelCost',  label: 'Travel',  color: '#fb923c' },
  { key: 'uniformCost', label: 'Uniform', color: '#c084fc' },
  { key: 'assetCost',   label: 'Asset',   color: '#f472b6' },
  { key: 'otherCost',   label: 'Other',   color: '#6b7280' },
] as const;

function CostBreakdownBar({ period }: { period: CostPeriod }) {
  const tot = totalCost(period) || 1;
  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden gap-px">
        {COST_SEGMENTS.map(({ key, color }) => {
          const val = Number((period as any)[key] ?? 0);
          const pct = (val / tot) * 100;
          if (pct < 0.5) return null;
          return (
            <div
              key={key}
              style={{ width: `${pct}%`, background: color, transition: 'width 0.8s ease' }}
              title={`${key}: ${pct.toFixed(1)}%`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {COST_SEGMENTS.map(({ key, label, color }) => {
          const val = Number((period as any)[key] ?? 0);
          const pct = (val / tot) * 100;
          return (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: color }} />
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {label}
              </span>
              <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {pct.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, color, delay,
}: { label: string; value: string; sub?: string; color: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay ?? 0, duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className="glass-card p-4 relative overflow-hidden"
      style={{ borderColor: `${color}20` }}
    >
      <div
        className="absolute -top-4 -right-4 w-16 h-16 rounded-full pointer-events-none"
        style={{ background: `${color}18`, filter: 'blur(18px)' }}
      />
      <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
        {label}
      </p>
      <p className="text-xl font-bold leading-tight" style={{ color: 'white', fontFamily: 'Plus Jakarta Sans' }}>
        {value}
      </p>
      {sub && <p className="text-xs mt-1" style={{ color }}>{sub}</p>}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5"
        style={{ background: `linear-gradient(90deg, ${color}60, transparent)` }}
      />
    </motion.div>
  );
}

// ─── Category Badge ──────────────────────────────────────────────────────────

const CATEGORY_CFG: Record<string, { color: string; bg: string }> = {
  SALARY:  { color: '#818cf8', bg: 'rgba(129,140,248,0.1)' },
  PF:      { color: '#38bdf8', bg: 'rgba(56,189,248,0.1)'  },
  ESI:     { color: '#34d399', bg: 'rgba(52,211,153,0.1)'  },
  ADMIN:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  TRAVEL:  { color: '#fb923c', bg: 'rgba(251,146,60,0.1)'  },
  UNIFORM: { color: '#c084fc', bg: 'rgba(192,132,252,0.1)' },
  ASSET:   { color: '#f472b6', bg: 'rgba(244,114,182,0.1)' },
  OTHER:   { color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
};

function CategoryBadge({ cat }: { cat: string }) {
  const cfg = CATEGORY_CFG[cat] ?? CATEGORY_CFG.OTHER;
  return (
    <span
      className="text-xs px-2 py-0.5 rounded font-medium"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cat}
    </span>
  );
}

// ─── Add Cost Dialog ──────────────────────────────────────────────────────────

function AddCostDialog({
  open,
  tenderId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  tenderId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [category, setCategory] = useState<CostCategory>('SALARY');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(currentMonth());
  const [description, setDescription] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      tenderProfitabilityApi.addCost(tenderId, {
        category,
        amount: parseFloat(amount),
        month,
        description,
      }),
    onSuccess: () => {
      toast.success('Cost entry added successfully');
      setAmount('');
      setDescription('');
      onSuccess();
      onClose();
    },
    onError: () => toast.error('Failed to add cost entry'),
  });

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(6,14,26,0.8)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 16 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] glass-card p-6"
            style={{ borderColor: 'rgba(129,140,248,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(129,140,248,0.12)', color: '#818cf8' }}
                >
                  <Plus size={15} />
                </div>
                <h3 className="text-base font-semibold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                  Add Cost Entry
                </h3>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CostCategory)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  {(['SALARY', 'PF', 'ESI', 'ADMIN', 'TRAVEL', 'UNIFORM', 'ASSET', 'OTHER'] as CostCategory[]).map(
                    (c) => <option key={c} value={c} style={{ background: '#0a1628' }}>{c}</option>
                  )}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Amount (₹)
                </label>
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <IndianRupee size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/20"
                  />
                </div>
              </div>

              {/* Month */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Month (YYYY-MM)
                </label>
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <Calendar size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
                  <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-white outline-none"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description…"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none placeholder:text-white/20"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-5">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  color: 'rgba(255,255,255,0.45)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => mutation.mutate()}
                disabled={!amount || mutation.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                style={{
                  background: mutation.isPending || !amount ? 'rgba(129,140,248,0.3)' : '#818cf8',
                  color: mutation.isPending || !amount ? 'rgba(255,255,255,0.4)' : '#fff',
                }}
              >
                {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {mutation.isPending ? 'Adding…' : 'Add Cost'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Tender Dashboard Card ─────────────────────────────────────────────────────

function TenderCard({
  item,
  selected,
  onClick,
  onCompute,
  computing,
  delay,
}: {
  item: TenderDashboardItem;
  selected: boolean;
  onClick: () => void;
  onCompute: (e: React.MouseEvent) => void;
  computing: boolean;
  delay: number;
}) {
  const p = item.currentMonth;
  const margin = p?.netMargin ?? 0;
  const marginColor = margin > 15 ? '#10b981' : margin > 5 ? '#f59e0b' : '#f43f5e';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      onClick={onClick}
      className="glass-card p-5 cursor-pointer relative overflow-hidden transition-all hover:scale-[1.01]"
      style={{
        borderColor: selected ? `${marginColor}40` : 'rgba(255,255,255,0.07)',
        boxShadow: selected ? `0 0 0 1px ${marginColor}30` : 'none',
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none"
        style={{ background: `${marginColor}10`, filter: 'blur(24px)' }}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-4 relative">
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded inline-block mb-1.5"
             style={{ background: 'rgba(129,140,248,0.1)', color: '#818cf8' }}>
            {item.tenderNo}
          </p>
          <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2"
              style={{ fontFamily: 'Plus Jakarta Sans' }}>
            {item.tenderName}
          </h3>
        </div>
        {p ? <MarginRing margin={margin} /> : (
          <div className="w-16 h-16 flex items-center justify-center rounded-full"
               style={{ border: '2px solid rgba(255,255,255,0.07)' }}>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>N/A</span>
          </div>
        )}
      </div>

      {/* Metrics */}
      {p ? (
        <div className="grid grid-cols-2 gap-3 mb-4 relative">
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Revenue</p>
            <p className="text-base font-bold" style={{ color: 'white', fontFamily: 'Plus Jakarta Sans' }}>
              {INR_COMPACT(p.revenue ?? 0)}
            </p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Net Profit</p>
            <p className="text-base font-bold" style={{ color: marginColor, fontFamily: 'Plus Jakarta Sans' }}>
              {INR_COMPACT(p.netProfit ?? 0)}
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-4 py-3 text-center rounded-lg relative"
             style={{ background: 'rgba(255,255,255,0.02)' }}>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>No data for current month</p>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between relative">
        <button
          onClick={onCompute}
          disabled={computing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
          style={{
            background: 'rgba(129,140,248,0.1)',
            color: '#818cf8',
            border: '1px solid rgba(129,140,248,0.2)',
          }}
        >
          {computing
            ? <Loader2 size={11} className="animate-spin" />
            : <RefreshCw size={11} />}
          {computing ? 'Computing…' : 'Compute'}
        </button>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
          View Detail
          <ChevronRight size={12} />
        </div>
      </div>

      {/* Selected indicator */}
      {selected && (
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{ background: `linear-gradient(90deg, transparent, ${marginColor}, transparent)` }}
        />
      )}
    </motion.div>
  );
}

// ─── Historical Trend Table ───────────────────────────────────────────────────

function TrendArrow({ curr, prev }: { curr: number; prev: number | null }) {
  if (prev === null) return <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>;
  if (curr > prev) return <ArrowUpRight size={14} style={{ color: '#10b981' }} />;
  if (curr < prev) return <ArrowDownRight size={14} style={{ color: '#f43f5e' }} />;
  return <Minus size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />;
}

function HistoricalTable({ history, loading }: { history: TenderProfitability[]; loading: boolean }) {
  return (
    <div className="glass-card overflow-hidden">
      <div
        className="px-5 py-4 flex items-center gap-2"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <TrendingUp size={15} style={{ color: '#10b981' }} />
        <h3 className="font-semibold text-white text-sm" style={{ fontFamily: 'Plus Jakarta Sans' }}>
          Historical Trend
        </h3>
        {!loading && (
          <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
            {history.length} months
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {['Month', 'Revenue', 'Gross Profit', 'Net Profit', 'Net Margin %', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'rgba(255,255,255,0.28)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && [...Array(5)].map((_, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                {[...Array(6)].map((_, j) => (
                  <td key={j} className="px-4 py-3"><Skeleton className="h-4" /></td>
                ))}
              </tr>
            ))}
            {!loading && history.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center">
                  <BarChart3 size={26} className="mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.1)' }} />
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No historical data yet</p>
                </td>
              </tr>
            )}
            {!loading && history.map((row, idx) => {
              const prev = history[idx + 1] ?? null;
              const margin = Number(row.netMargin ?? 0);
              const marginColor = margin > 15 ? '#10b981' : margin > 5 ? '#f59e0b' : '#f43f5e';
              return (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.04 }}
                  className="hover:bg-white/[0.015] transition-colors"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                >
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-medium text-white">{fmtPeriod(row.period)}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm tabular-nums" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      {INR(row.revenue ?? 0)}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-medium tabular-nums"
                       style={{ color: (row.grossProfit ?? 0) >= 0 ? '#10b981' : '#f43f5e' }}>
                      {INR(row.grossProfit ?? 0)}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-semibold tabular-nums"
                       style={{ color: (row.netProfit ?? 0) >= 0 ? '#10b981' : '#f43f5e' }}>
                      {INR(row.netProfit ?? 0)}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: `${marginColor}14`, color: marginColor }}
                    >
                      {margin.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <TrendArrow curr={row.netMargin ?? 0} prev={prev?.netMargin ?? null} />
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Comparison Tab ───────────────────────────────────────────────────────────

function ComparisonTab({ tenders }: { tenders: TenderDashboardItem[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [month, setMonth] = useState(currentMonth());
  const [results, setResults] = useState<TenderProfitability[]>([]);
  const [loading, setLoading] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const compare = async () => {
    setLoading(true);
    try {
      const all = await Promise.all(
        [...selected].map((id) =>
          tenderProfitabilityApi.compute(id, month).catch(() => null)
        )
      );
      setResults(all.filter(Boolean) as TenderProfitability[]);
    } catch {
      toast.error('Comparison failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers size={15} style={{ color: '#c084fc' }} />
            <h3 className="font-semibold text-white text-sm" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              Compare Tenders
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Calendar size={12} style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="bg-transparent text-sm text-white outline-none"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <button
              onClick={compare}
              disabled={selected.size === 0 || loading}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: selected.size === 0 || loading ? 'rgba(192,132,252,0.2)' : '#c084fc',
                color: selected.size === 0 || loading ? 'rgba(255,255,255,0.3)' : '#fff',
              }}
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <BarChart3 size={13} />}
              Compare
            </button>
          </div>
        </div>

        {/* Tender checkboxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {tenders.map((t) => {
            const checked = selected.has(t.tenderId);
            return (
              <button
                key={t.tenderId}
                onClick={() => toggle(t.tenderId)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all"
                style={{
                  background: checked ? 'rgba(192,132,252,0.08)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${checked ? 'rgba(192,132,252,0.25)' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                {checked
                  ? <CheckSquare size={14} style={{ color: '#c084fc', flexShrink: 0 }} />
                  : <Square size={14} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />}
                <div className="min-w-0">
                  <p className="text-xs font-mono" style={{ color: '#818cf8' }}>{t.tenderNo}</p>
                  <p className="text-sm text-white truncate">{t.tenderName}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Results table */}
      {results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card overflow-hidden"
        >
          <div
            className="px-5 py-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            <p className="text-sm font-semibold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              Comparison — {fmtPeriod(month)}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Tender', 'Revenue', 'Total Cost', 'Gross Profit', 'Net Profit', 'Net Margin %'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                        style={{ color: 'rgba(255,255,255,0.28)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((row, idx) => {
                  const tender = tenders.find((t) => t.tenderId === row.tenderId);
                  const margin = Number(row.netMargin ?? 0);
                  const marginColor = margin > 15 ? '#10b981' : margin > 5 ? '#f59e0b' : '#f43f5e';
                  const cost = totalCost(row as unknown as CostPeriod);
                  return (
                    <tr
                      key={idx}
                      className="hover:bg-white/[0.015] transition-colors"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    >
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium text-white">
                          {tender?.tenderName ?? row.tenderId}
                        </p>
                        <p className="text-xs font-mono mt-0.5" style={{ color: '#818cf8' }}>
                          {tender?.tenderNo ?? ''}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm tabular-nums" style={{ color: 'rgba(255,255,255,0.7)' }}>
                          {INR(row.revenue ?? 0)}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm tabular-nums" style={{ color: '#f43f5e' }}>
                          {INR(cost)}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium tabular-nums"
                           style={{ color: (row.grossProfit ?? 0) >= 0 ? '#10b981' : '#f43f5e' }}>
                          {INR(row.grossProfit ?? 0)}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-semibold tabular-nums"
                           style={{ color: (row.netProfit ?? 0) >= 0 ? '#10b981' : '#f43f5e' }}>
                          {INR(row.netProfit ?? 0)}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className="text-xs font-bold px-2.5 py-1 rounded-full"
                          style={{ background: `${marginColor}14`, color: marginColor }}
                        >
                          {margin.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProfitabilityPage() {
  const qc = useQueryClient();
  const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null);
  const [computingId, setComputingId] = useState<string | null>(null);
  const [addCostOpen, setAddCostOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'comparison'>('overview');

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: dashRaw, isLoading: dashLoading } = useQuery({
    queryKey: ['tp-dashboard'],
    queryFn: tenderProfitabilityApi.getDashboard,
  });

  const { data: historyRaw, isLoading: historyLoading } = useQuery({
    queryKey: ['tp-history', selectedTenderId],
    queryFn: () => tenderProfitabilityApi.getHistory(selectedTenderId!),
    enabled: !!selectedTenderId,
  });

  const { data: costsRaw, isLoading: costsLoading } = useQuery({
    queryKey: ['tp-costs', selectedTenderId],
    queryFn: () => tenderProfitabilityApi.getCosts(selectedTenderId!, {}),
    enabled: !!selectedTenderId,
  });

  // ── Normalize ────────────────────────────────────────────────────────────
  const tenders: TenderDashboardItem[] = Array.isArray(dashRaw) ? dashRaw : [];
  const history: TenderProfitability[] = Array.isArray(historyRaw) ? historyRaw
    : Array.isArray((historyRaw as any)?.data) ? (historyRaw as any).data : [];
  const costs: CostEntry[] = Array.isArray(costsRaw) ? costsRaw
    : Array.isArray((costsRaw as any)?.data) ? (costsRaw as any).data : [];

  const selectedTender = tenders.find((t) => t.tenderId === selectedTenderId) ?? null;
  const period = selectedTender?.currentMonth ?? null;

  // ── Compute handler ───────────────────────────────────────────────────────
  const handleCompute = async (e: React.MouseEvent, tenderId: string) => {
    e.stopPropagation();
    setComputingId(tenderId);
    try {
      await tenderProfitabilityApi.compute(tenderId, currentMonth());
      await qc.invalidateQueries({ queryKey: ['tp-dashboard'] });
      if (selectedTenderId === tenderId) {
        await qc.invalidateQueries({ queryKey: ['tp-history', tenderId] });
      }
      toast.success('Profitability computed successfully');
    } catch {
      toast.error('Failed to compute profitability');
    } finally {
      setComputingId(null);
    }
  };

  // ── Summary stats ─────────────────────────────────────────────────────────
  const totalRevenue = useMemo(
    () => tenders.reduce((s, t) => s + Number(t.currentMonth?.revenue ?? 0), 0),
    [tenders],
  );
  const totalNetProfit = useMemo(
    () => tenders.reduce((s, t) => s + Number(t.currentMonth?.netProfit ?? 0), 0),
    [tenders],
  );
  const avgMargin = useMemo(() => {
    const withData = tenders.filter((t) => t.currentMonth);
    if (!withData.length) return 0;
    return withData.reduce((s, t) => s + Number(t.currentMonth!.netMargin ?? 0), 0) / withData.length;
  }, [tenders]);

  return (
    <div className="space-y-6">
      {/* ── Add Cost Dialog ──────────────────────────────────────────────── */}
      {selectedTenderId && (
        <AddCostDialog
          open={addCostOpen}
          tenderId={selectedTenderId}
          onClose={() => setAddCostOpen(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['tp-costs', selectedTenderId] });
            qc.invalidateQueries({ queryKey: ['tp-dashboard'] });
          }}
        />
      )}

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}
            >
              <PieChart size={14} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#10b981' }}>
              Finance / Profitability
            </span>
          </div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Tender Profitability
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Monitor revenue, cost breakdown, and margins across all tenders
          </p>
        </div>

        {/* Summary badges */}
        <div className="flex items-center gap-3">
          <div
            className="px-4 py-2 rounded-xl text-right"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}
          >
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Total Revenue</p>
            <p className="text-base font-bold" style={{ color: '#10b981', fontFamily: 'Plus Jakarta Sans' }}>
              {dashLoading ? '—' : INR_COMPACT(totalRevenue)}
            </p>
          </div>
          <div
            className="px-4 py-2 rounded-xl text-right"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}
          >
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Net Profit</p>
            <p className="text-base font-bold"
               style={{ color: totalNetProfit >= 0 ? '#818cf8' : '#f43f5e', fontFamily: 'Plus Jakarta Sans' }}>
              {dashLoading ? '—' : INR_COMPACT(totalNetProfit)}
            </p>
          </div>
          <div
            className="px-4 py-2 rounded-xl text-right"
            style={{
              background: avgMargin > 15 ? 'rgba(16,185,129,0.08)' : avgMargin > 5 ? 'rgba(245,158,11,0.08)' : 'rgba(244,63,94,0.08)',
              border: `1px solid ${avgMargin > 15 ? 'rgba(16,185,129,0.15)' : avgMargin > 5 ? 'rgba(245,158,11,0.15)' : 'rgba(244,63,94,0.15)'}`,
            }}
          >
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Avg Margin</p>
            <p className="text-base font-bold"
               style={{
                 color: avgMargin > 15 ? '#10b981' : avgMargin > 5 ? '#f59e0b' : '#f43f5e',
                 fontFamily: 'Plus Jakarta Sans',
               }}>
              {dashLoading ? '—' : `${avgMargin.toFixed(1)}%`}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 p-1 rounded-xl w-fit"
           style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {(['overview', 'comparison'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize"
            style={{
              background: activeTab === tab ? 'rgba(255,255,255,0.07)' : 'transparent',
              color: activeTab === tab ? 'white' : 'rgba(255,255,255,0.4)',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'comparison' ? (
        <ComparisonTab tenders={tenders} />
      ) : (
        <>
          {/* ── Dashboard Grid ─────────────────────────────────────────── */}
          {dashLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-52" />
              ))}
            </div>
          ) : tenders.length === 0 ? (
            <div className="glass-card py-20 text-center">
              <PieChart size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
              <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>
                No tenders found
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {tenders.map((item, i) => (
                <TenderCard
                  key={item.tenderId}
                  item={item}
                  selected={selectedTenderId === item.tenderId}
                  onClick={() =>
                    setSelectedTenderId(
                      selectedTenderId === item.tenderId ? null : item.tenderId
                    )
                  }
                  onCompute={(e) => handleCompute(e, item.tenderId)}
                  computing={computingId === item.tenderId}
                  delay={i * 0.06}
                />
              ))}
            </div>
          )}

          {/* ── Tender Detail ─────────────────────────────────────────────── */}
          <AnimatePresence>
            {selectedTender && (
              <motion.div
                key={selectedTenderId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="space-y-5"
              >
                {/* Detail header */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(129,140,248,0.1)', color: '#818cf8' }}>
                        {selectedTender.tenderNo}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                      {selectedTender.tenderName}
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedTenderId(null)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* ── Main detail: Left + Right ──────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Left: KPI cards + cost bar */}
                  <div className="space-y-5">
                    {/* KPI grid */}
                    {period ? (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <KpiCard
                            label="Revenue"
                            value={INR_COMPACT(period.revenue ?? 0)}
                            color="#10b981"
                            delay={0}
                          />
                          <KpiCard
                            label="Total Cost"
                            value={INR_COMPACT(totalCost(period))}
                            color="#f43f5e"
                            delay={0.05}
                          />
                          <KpiCard
                            label="Gross Profit"
                            value={INR_COMPACT(period.grossProfit ?? 0)}
                            sub={`${grossMarginPct(period).toFixed(1)}% Gross Margin`}
                            color="#818cf8"
                            delay={0.1}
                          />
                          <KpiCard
                            label="Net Profit"
                            value={INR_COMPACT(period.netProfit ?? 0)}
                            sub={`${(period.netMargin ?? 0).toFixed(1)}% Net Margin`}
                            color={
                              (period.netMargin ?? 0) > 15 ? '#10b981'
                              : (period.netMargin ?? 0) > 5 ? '#f59e0b'
                              : '#f43f5e'
                            }
                            delay={0.15}
                          />
                        </div>

                        {/* Cost breakdown bar */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="glass-card p-5"
                        >
                          <div className="flex items-center gap-2 mb-4">
                            <BarChart3 size={14} style={{ color: '#f59e0b' }} />
                            <h4 className="text-sm font-semibold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                              Cost Breakdown
                            </h4>
                          </div>
                          <CostBreakdownBar period={period} />
                        </motion.div>
                      </>
                    ) : (
                      <div className="glass-card py-16 text-center">
                        <DollarSign size={28} className="mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.1)' }} />
                        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          No data for current month. Click Compute to generate.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right: Cost entry table */}
                  <div className="glass-card overflow-hidden flex flex-col">
                    <div
                      className="px-5 py-4 flex items-center justify-between"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <div className="flex items-center gap-2">
                        <Tag size={14} style={{ color: '#f59e0b' }} />
                        <h4 className="text-sm font-semibold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                          Cost Entries
                        </h4>
                        {!costsLoading && (
                          <span className="text-xs px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                            {costs.length}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setAddCostOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                        style={{
                          background: 'rgba(16,185,129,0.1)',
                          color: '#10b981',
                          border: '1px solid rgba(16,185,129,0.2)',
                        }}
                      >
                        <Plus size={12} />
                        Add Cost Entry
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto" style={{ maxHeight: 380 }}>
                      <table className="w-full">
                        <thead className="sticky top-0" style={{ background: '#0a1628' }}>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            {['Period', 'Category', 'Amount', 'Description'].map((h) => (
                              <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider"
                                  style={{ color: 'rgba(255,255,255,0.28)' }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {costsLoading && [...Array(5)].map((_, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                              {[...Array(4)].map((_, j) => (
                                <td key={j} className="px-4 py-3"><Skeleton className="h-4" /></td>
                              ))}
                            </tr>
                          ))}
                          {!costsLoading && costs.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-4 py-12 text-center">
                                <FileText size={24} className="mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.1)' }} />
                                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                  No cost entries yet
                                </p>
                              </td>
                            </tr>
                          )}
                          {!costsLoading && costs.map((entry) => (
                            <tr
                              key={entry.id}
                              className="hover:bg-white/[0.015] transition-colors"
                              style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                            >
                              <td className="px-4 py-3">
                                <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                  {entry.period}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                <CategoryBadge cat={entry.category} />
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-sm font-semibold tabular-nums" style={{ color: '#f59e0b' }}>
                                  {INR(entry.amount ?? 0)}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-xs truncate max-w-[140px]"
                                   style={{ color: 'rgba(255,255,255,0.45)' }}>
                                  {entry.description || '—'}
                                </p>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* ── Historical Trend ────────────────────────────────────── */}
                <HistoricalTable history={history} loading={historyLoading} />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
