'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale, TrendingUp, TrendingDown, LayoutList, Waves,
  Calendar, Printer, RefreshCw, CheckCircle2, XCircle,
  ChevronRight, Minus, ArrowUpRight, ArrowDownRight,
  BarChart3, BookOpen, Landmark, Activity,
} from 'lucide-react';
import { statementsApi } from '@/lib/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const INR = (v: number | string | undefined) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(v ?? 0));

const today = () => new Date().toISOString().slice(0, 10);
const firstOfYear = () => `${new Date().getFullYear()}-01-01`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrialBalanceRow {
  code: string;
  name: string;
  type: string;
  closingDebit: number;
  closingCredit: number;
}
interface TrialBalance {
  asOf: string;
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

interface ProfitLossLine { name: string; amount: number }
interface ProfitLoss {
  income: ProfitLossLine[];
  expenses: ProfitLossLine[];
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  netMargin: number;
}

interface BSLine { name: string; balance: number }
interface BalanceSheet {
  assets: BSLine[];
  liabilities: BSLine[];
  equity: BSLine[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  isBalanced: boolean;
}

interface CashFlow {
  operatingReceipts: number;
  operatingPayments: number;
  netCashFlow: number;
}

type TabId = 'trial' | 'pl' | 'bs' | 'cash';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skel({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md ${className ?? ''}`}
      style={{ background: 'rgba(255,255,255,0.06)' }}
    />
  );
}

// ─── Balance Badge ────────────────────────────────────────────────────────────

function BalanceBadge({ balanced }: { balanced: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
      style={{
        background: balanced ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)',
        color: balanced ? '#10b981' : '#f43f5e',
        border: `1px solid ${balanced ? 'rgba(16,185,129,0.25)' : 'rgba(244,63,94,0.25)'}`,
      }}
    >
      {balanced ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
      {balanced ? 'Balanced ✓' : 'Unbalanced ✗'}
    </span>
  );
}

// ─── Section Header (for grouped table rows) ─────────────────────────────────

const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  ASSET:     { label: 'Assets',      color: '#6366f1', bg: 'rgba(99,102,241,0.08)'  },
  LIABILITY: { label: 'Liabilities', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  EQUITY:    { label: 'Equity',      color: '#a855f7', bg: 'rgba(168,85,247,0.08)' },
  INCOME:    { label: 'Income',      color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
  EXPENSE:   { label: 'Expenses',    color: '#f43f5e', bg: 'rgba(244,63,94,0.08)'  },
};

// ─── Trial Balance Tab ────────────────────────────────────────────────────────

function TrialBalanceTab({ data, loading }: { data?: TrialBalance; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3 p-6">
        {[...Array(8)].map((_, i) => (
          <Skel key={i} className="h-10" />
        ))}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <BookOpen size={36} style={{ color: 'rgba(255,255,255,0.12)' }} />
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Set a date and click Generate to view the Trial Balance.
        </p>
      </div>
    );
  }

  const grouped = (data.rows ?? []).reduce<Record<string, TrialBalanceRow[]>>((acc, row) => {
    const t = row.type ?? 'OTHER';
    if (!acc[t]) acc[t] = [];
    acc[t].push(row);
    return acc;
  }, {});

  const typeOrder = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];
  const allTypes = [...typeOrder, ...Object.keys(grouped).filter((t) => !typeOrder.includes(t))];

  return (
    <div>
      {/* Balance status bar */}
      <div
        className="flex items-center justify-between px-6 py-3 print:px-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
          As of {data.asOf ? new Date(data.asOf).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
        </p>
        <BalanceBadge balanced={data.isBalanced} />
      </div>

      {/* Table */}
      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Code', 'Account Name', 'Closing Debit (₹)', 'Closing Credit (₹)'].map((h, i) => (
                <th
                  key={h}
                  className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider ${i >= 2 ? 'text-right' : 'text-left'}`}
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allTypes.map((type) => {
              const rows = grouped[type];
              if (!rows?.length) return null;
              const meta = TYPE_META[type] ?? { label: type, color: 'rgba(255,255,255,0.6)', bg: 'rgba(255,255,255,0.04)' };
              const typeDebit = rows.reduce((s, r) => s + Number(r.closingDebit), 0);
              const typeCredit = rows.reduce((s, r) => s + Number(r.closingCredit), 0);
              return (
                <>
                  {/* Group header */}
                  <tr key={`hdr-${type}`} style={{ background: meta.bg }}>
                    <td
                      colSpan={4}
                      className="px-6 py-2 text-xs font-bold uppercase tracking-widest"
                      style={{ color: meta.color }}
                    >
                      {meta.label}
                    </td>
                  </tr>
                  {/* Account rows */}
                  {rows.map((row) => (
                    <tr
                      key={row.code}
                      className="hover:bg-white/[0.015] transition-colors print:hover:bg-transparent"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    >
                      <td className="px-6 py-3">
                        <span className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {row.code}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-white">{row.name}</td>
                      <td className="px-6 py-3 text-right text-sm font-medium" style={{ color: '#818cf8' }}>
                        {row.closingDebit ? INR(row.closingDebit) : <Minus size={12} className="ml-auto" style={{ color: 'rgba(255,255,255,0.2)' }} />}
                      </td>
                      <td className="px-6 py-3 text-right text-sm font-medium" style={{ color: '#6ee7b7' }}>
                        {row.closingCredit ? INR(row.closingCredit) : <Minus size={12} className="ml-auto" style={{ color: 'rgba(255,255,255,0.2)' }} />}
                      </td>
                    </tr>
                  ))}
                  {/* Type subtotal */}
                  <tr key={`sub-${type}`} style={{ borderBottom: '2px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.02)' }}>
                    <td colSpan={2} className="px-6 py-2.5 text-xs font-semibold" style={{ color: meta.color }}>
                      Subtotal — {meta.label}
                    </td>
                    <td className="px-6 py-2.5 text-right text-sm font-semibold" style={{ color: '#818cf8' }}>
                      {INR(typeDebit)}
                    </td>
                    <td className="px-6 py-2.5 text-right text-sm font-semibold" style={{ color: '#6ee7b7' }}>
                      {INR(typeCredit)}
                    </td>
                  </tr>
                </>
              );
            })}

            {/* Grand total */}
            <tr style={{ background: 'rgba(255,255,255,0.04)', borderTop: '2px solid rgba(255,255,255,0.1)' }}>
              <td colSpan={2} className="px-6 py-4 text-sm font-bold text-white uppercase tracking-wide">
                Grand Total
              </td>
              <td className="px-6 py-4 text-right text-sm font-bold" style={{ color: '#818cf8' }}>
                {INR(data.totalDebit)}
              </td>
              <td className="px-6 py-4 text-right text-sm font-bold" style={{ color: '#6ee7b7' }}>
                {INR(data.totalCredit)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Profit & Loss Tab ────────────────────────────────────────────────────────

function ProfitLossTab({ data, loading }: { data?: ProfitLoss; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3 p-6">
        {[...Array(6)].map((_, i) => <Skel key={i} className="h-10" />)}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <TrendingUp size={36} style={{ color: 'rgba(255,255,255,0.12)' }} />
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Set a date range and click Generate to view the P&L Statement.
        </p>
      </div>
    );
  }

  const isProfit = Number(data.netProfit ?? 0) >= 0;

  return (
    <div>
      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-left" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Account
              </th>
              <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Amount (₹)
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Income section */}
            <tr style={{ background: TYPE_META.INCOME.bg }}>
              <td colSpan={2} className="px-6 py-2 text-xs font-bold uppercase tracking-widest" style={{ color: TYPE_META.INCOME.color }}>
                Income
              </td>
            </tr>
            {(data.income ?? []).map((line, i) => (
              <tr
                key={i}
                className="hover:bg-white/[0.015] transition-colors"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
              >
                <td className="px-6 py-3 text-sm text-white pl-10">{line.name}</td>
                <td className="px-6 py-3 text-right text-sm font-medium" style={{ color: '#6ee7b7' }}>
                  {INR(line.amount)}
                </td>
              </tr>
            ))}
            {/* Total income */}
            <tr style={{ background: 'rgba(16,185,129,0.06)', borderBottom: '2px solid rgba(16,185,129,0.15)' }}>
              <td className="px-6 py-3 text-sm font-bold" style={{ color: '#10b981' }}>
                Total Income
              </td>
              <td className="px-6 py-3 text-right text-sm font-bold" style={{ color: '#10b981' }}>
                {INR(data.totalIncome)}
              </td>
            </tr>

            {/* Spacer */}
            <tr><td colSpan={2} className="py-1" /></tr>

            {/* Expenses section */}
            <tr style={{ background: TYPE_META.EXPENSE.bg }}>
              <td colSpan={2} className="px-6 py-2 text-xs font-bold uppercase tracking-widest" style={{ color: TYPE_META.EXPENSE.color }}>
                Expenses
              </td>
            </tr>
            {(data.expenses ?? []).map((line, i) => (
              <tr
                key={i}
                className="hover:bg-white/[0.015] transition-colors"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
              >
                <td className="px-6 py-3 text-sm text-white pl-10">{line.name}</td>
                <td className="px-6 py-3 text-right text-sm font-medium" style={{ color: '#fca5a5' }}>
                  {INR(line.amount)}
                </td>
              </tr>
            ))}
            {/* Total expenses */}
            <tr style={{ background: 'rgba(244,63,94,0.06)', borderBottom: '2px solid rgba(244,63,94,0.15)' }}>
              <td className="px-6 py-3 text-sm font-bold" style={{ color: '#f43f5e' }}>
                Total Expenses
              </td>
              <td className="px-6 py-3 text-right text-sm font-bold" style={{ color: '#f43f5e' }}>
                {INR(data.totalExpense)}
              </td>
            </tr>

            {/* Net Profit / Loss */}
            <tr style={{ background: isProfit ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)', borderTop: '2px solid rgba(255,255,255,0.12)' }}>
              <td className="px-6 py-4 font-bold text-base flex items-center gap-2" style={{ color: isProfit ? '#10b981' : '#f43f5e' }}>
                {isProfit ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                Net {isProfit ? 'Profit' : 'Loss'}
                <span
                  className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: isProfit ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)',
                    color: isProfit ? '#6ee7b7' : '#fca5a5',
                  }}
                >
                  Margin: {Number(data.netMargin ?? 0).toFixed(1)}%
                </span>
              </td>
              <td className="px-6 py-4 text-right text-base font-bold" style={{ color: isProfit ? '#10b981' : '#f43f5e' }}>
                {INR(Math.abs(Number(data.netProfit)))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Balance Sheet Tab ────────────────────────────────────────────────────────

function BalanceSheetTab({ data, loading }: { data?: BalanceSheet; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-6 p-6">
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skel key={i} className="h-10" />)}</div>
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skel key={i} className="h-10" />)}</div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Landmark size={36} style={{ color: 'rgba(255,255,255,0.12)' }} />
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Set a date and click Generate to view the Balance Sheet.
        </p>
      </div>
    );
  }

  function BSSide({ title, lines, total, color }: { title: string; lines: BSLine[]; total: number; color: string }) {
    return (
      <div>
        <div
          className="px-5 py-2.5 text-xs font-bold uppercase tracking-widest rounded-t-lg"
          style={{ background: `${color}14`, color }}
        >
          {title}
        </div>
        <table className="w-full">
          <tbody>
            {(lines ?? []).map((line, i) => (
              <tr
                key={i}
                className="hover:bg-white/[0.015] transition-colors"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              >
                <td className="px-5 py-3 text-sm text-white">{line.name}</td>
                <td className="px-5 py-3 text-right text-sm font-medium" style={{ color }}>
                  {INR(line.balance)}
                </td>
              </tr>
            ))}
            {/* Total row */}
            <tr style={{ background: `${color}10`, borderTop: `2px solid ${color}30` }}>
              <td className="px-5 py-3 text-sm font-bold" style={{ color }}>
                Total {title}
              </td>
              <td className="px-5 py-3 text-right text-sm font-bold" style={{ color }}>
                {INR(total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      {/* Balance indicator */}
      <div
        className="flex items-center justify-between px-6 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Balance Sheet Overview
        </p>
        <BalanceBadge balanced={data.isBalanced} />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 print:grid-cols-2">
        {/* Left: Assets */}
        <div
          className="p-6 print:border-r print:border-white/10"
          style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}
        >
          <BSSide
            title="Assets"
            lines={data.assets ?? []}
            total={data.totalAssets}
            color="#6366f1"
          />
        </div>

        {/* Right: Liabilities + Equity */}
        <div className="p-6 space-y-8">
          <BSSide
            title="Liabilities"
            lines={data.liabilities ?? []}
            total={data.totalLiabilities}
            color="#f59e0b"
          />
          <BSSide
            title="Equity"
            lines={data.equity ?? []}
            total={data.totalEquity}
            color="#a855f7"
          />

          {/* L+E combined */}
          <div
            className="rounded-lg px-5 py-3 flex items-center justify-between"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span className="text-sm font-bold text-white">Total Liabilities + Equity</span>
            <span className="text-sm font-bold" style={{ color: '#a78bfa' }}>
              {INR(Number(data.totalLiabilities) + Number(data.totalEquity))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Cash Flow Tab ────────────────────────────────────────────────────────────

function CashFlowTab({ data, loading }: { data?: CashFlow; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
        {[...Array(3)].map((_, i) => <Skel key={i} className="h-32" />)}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Activity size={36} style={{ color: 'rgba(255,255,255,0.12)' }} />
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Set a date range and click Generate to view the Cash Flow Statement.
        </p>
      </div>
    );
  }

  const net = Number(data.netCashFlow ?? 0);
  const isPositive = net >= 0;

  const cards = [
    {
      label: 'Operating Receipts',
      value: data.operatingReceipts,
      icon: ArrowUpRight,
      color: '#10b981',
      bg: 'rgba(16,185,129,0.08)',
      border: 'rgba(16,185,129,0.2)',
      desc: 'Cash received from operations',
    },
    {
      label: 'Operating Payments',
      value: data.operatingPayments,
      icon: ArrowDownRight,
      color: '#f43f5e',
      bg: 'rgba(244,63,94,0.08)',
      border: 'rgba(244,63,94,0.2)',
      desc: 'Cash paid for operations',
    },
    {
      label: 'Net Cash Flow',
      value: Math.abs(net),
      icon: isPositive ? TrendingUp : TrendingDown,
      color: isPositive ? '#10b981' : '#f43f5e',
      bg: isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
      border: isPositive ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)',
      desc: isPositive ? 'Net positive cash position' : 'Net negative cash position',
      prefix: isPositive ? '+' : '−',
      featured: true,
    },
  ];

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-xl p-5 flex flex-col gap-3"
            style={{
              background: card.bg,
              border: `1px solid ${card.border}`,
              ...(card.featured ? { boxShadow: `0 0 32px ${card.color}18` } : {}),
            }}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {card.label}
              </p>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${card.color}20`, color: card.color }}
              >
                <card.icon size={18} />
              </div>
            </div>
            <p
              className="text-2xl font-bold"
              style={{ color: card.color, fontFamily: 'Plus Jakarta Sans' }}
            >
              {card.prefix ?? ''}{INR(card.value)}
            </p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {card.desc}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Simple visual bar */}
      <div
        className="mt-8 rounded-xl p-5"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Cash Flow Summary
        </p>
        <div className="space-y-3">
          {[
            { label: 'Receipts', val: Number(data.operatingReceipts), color: '#10b981' },
            { label: 'Payments', val: Number(data.operatingPayments), color: '#f43f5e' },
          ].map((item) => {
            const maxVal = Math.max(Number(data.operatingReceipts), Number(data.operatingPayments), 1);
            const pct = (item.val / maxVal) * 100;
            return (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>{item.label}</span>
                  <span className="font-medium" style={{ color: item.color }}>{INR(item.val)}</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: item.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Tab Config ───────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.ElementType; shortLabel: string }[] = [
  { id: 'trial', label: 'Trial Balance',       icon: Scale,     shortLabel: 'Trial' },
  { id: 'pl',    label: 'Profit & Loss',        icon: TrendingUp, shortLabel: 'P&L' },
  { id: 'bs',    label: 'Balance Sheet',        icon: Landmark,  shortLabel: 'B/S' },
  { id: 'cash',  label: 'Cash Flow Statement',  icon: Waves,     shortLabel: 'Cash Flow' },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FinancialStatementsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('trial');
  const [asOfDate, setAsOfDate] = useState(today());
  const [fromDate, setFromDate] = useState(firstOfYear());
  const [toDate, setToDate] = useState(today());
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const [trialBalance, setTrialBalance] = useState<TrialBalance | undefined>();
  const [profitLoss, setProfitLoss] = useState<ProfitLoss | undefined>();
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | undefined>();
  const [cashFlow, setCashFlow] = useState<CashFlow | undefined>();
  const [generated, setGenerated] = useState(false);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      const [tb, pl, bs, cf] = await Promise.allSettled([
        statementsApi.getTrialBalance({ asOf: asOfDate }),
        statementsApi.getProfitLoss({ from: fromDate, to: toDate }),
        statementsApi.getBalanceSheet({ asOf: asOfDate }),
        statementsApi.getCashFlow({ from: fromDate, to: toDate }),
      ]);

      if (tb.status === 'fulfilled') setTrialBalance(tb.value as TrialBalance);
      if (pl.status === 'fulfilled') setProfitLoss(pl.value as ProfitLoss);
      if (bs.status === 'fulfilled') setBalanceSheet(bs.value as BalanceSheet);
      if (cf.status === 'fulfilled') setCashFlow(cf.value as CashFlow);
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  }, [asOfDate, fromDate, toDate]);

  const handlePrint = () => window.print();

  return (
    <div className="space-y-5 print:space-y-4" ref={printRef}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h2
            className="text-xl font-bold text-white"
            style={{ fontFamily: 'Plus Jakarta Sans' }}
          >
            Financial Statements
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Trial Balance, P&L, Balance Sheet &amp; Cash Flow
          </p>
        </div>
      </div>

      {/* ── Controls Bar ───────────────────────────────────────── */}
      <div
        className="glass-card p-4 flex flex-wrap items-end gap-4 print:hidden"
      >
        {/* As-of Date (Trial Balance + Balance Sheet) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>
            As of Date
          </label>
          <div className="relative flex items-center">
            <Calendar size={13} className="absolute left-3 pointer-events-none" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="pl-8 pr-3 py-2 rounded-lg text-sm text-white bg-transparent outline-none"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                colorScheme: 'dark',
                minWidth: 148,
              }}
            />
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>For Trial Balance &amp; B/S</p>
        </div>

        <div
          className="h-12 w-px hidden sm:block"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        />

        {/* From Date */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>
            From
          </label>
          <div className="relative flex items-center">
            <Calendar size={13} className="absolute left-3 pointer-events-none" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="pl-8 pr-3 py-2 rounded-lg text-sm text-white bg-transparent outline-none"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                colorScheme: 'dark',
                minWidth: 148,
              }}
            />
          </div>
        </div>

        {/* To Date */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>
            To
          </label>
          <div className="relative flex items-center">
            <Calendar size={13} className="absolute left-3 pointer-events-none" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="pl-8 pr-3 py-2 rounded-lg text-sm text-white bg-transparent outline-none"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                colorScheme: 'dark',
                minWidth: 148,
              }}
            />
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>For P&L &amp; Cash Flow</p>
        </div>

        <div
          className="h-12 w-px hidden sm:block"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        />

        {/* Action buttons */}
        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={handlePrint}
            disabled={!generated}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            <Printer size={14} /> Print
          </button>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95"
            style={{
              background: loading ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,1)',
              color: '#fff',
              boxShadow: loading ? 'none' : '0 0 20px rgba(99,102,241,0.4)',
            }}
          >
            {loading ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <BarChart3 size={14} />
            )}
            {loading ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>

      {/* ── Print Header (only visible in print) ───────────────── */}
      <div className="hidden print:block print:mb-4">
        <h1 className="text-2xl font-bold">WorkZen ERP — Financial Statements</h1>
        <p className="text-sm mt-1 text-gray-600">
          As of {asOfDate} &nbsp;|&nbsp; Period: {fromDate} – {toDate}
        </p>
        <hr className="mt-3 border-gray-300" />
      </div>

      {/* ── Tab Bar ────────────────────────────────────────────── */}
      <div className="glass-card overflow-hidden">
        {/* Tabs */}
        <div
          className="flex border-b print:hidden"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative flex items-center gap-2 px-5 py-4 text-sm font-medium transition-all flex-1 justify-center sm:justify-start sm:flex-none"
                style={{
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
                  background: isActive ? 'rgba(255,255,255,0.04)' : 'transparent',
                }}
              >
                <tab.icon size={14} />
                <span className="hidden sm:block">{tab.label}</span>
                <span className="block sm:hidden">{tab.shortLabel}</span>
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ background: '#6366f1' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === 'trial' && (
              <TrialBalanceTab data={trialBalance} loading={loading} />
            )}
            {activeTab === 'pl' && (
              <ProfitLossTab data={profitLoss} loading={loading} />
            )}
            {activeTab === 'bs' && (
              <BalanceSheetTab data={balanceSheet} loading={loading} />
            )}
            {activeTab === 'cash' && (
              <CashFlowTab data={cashFlow} loading={loading} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Print: all 4 sections stacked ───────────────────────── */}
      <div className="hidden print:block space-y-12">
        {trialBalance && (
          <div>
            <h2 className="text-xl font-bold mb-4">Trial Balance</h2>
            <TrialBalanceTab data={trialBalance} loading={false} />
          </div>
        )}
        {profitLoss && (
          <div className="print:break-before-page">
            <h2 className="text-xl font-bold mb-4">Profit &amp; Loss Statement</h2>
            <ProfitLossTab data={profitLoss} loading={false} />
          </div>
        )}
        {balanceSheet && (
          <div className="print:break-before-page">
            <h2 className="text-xl font-bold mb-4">Balance Sheet</h2>
            <BalanceSheetTab data={balanceSheet} loading={false} />
          </div>
        )}
        {cashFlow && (
          <div className="print:break-before-page">
            <h2 className="text-xl font-bold mb-4">Cash Flow Statement</h2>
            <CashFlowTab data={cashFlow} loading={false} />
          </div>
        )}
      </div>
    </div>
  );
}
