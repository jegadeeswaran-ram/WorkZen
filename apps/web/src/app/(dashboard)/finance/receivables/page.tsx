'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, X, ChevronRight, AlertTriangle, Bell,
  TrendingUp, Clock, AlertCircle, CheckCircle2, XCircle,
  CreditCard, BookOpen, ArrowUpRight, ArrowDownRight,
  Wallet, BarChart3, Users, ChevronDown, Loader2,
  Send, Eye, Calendar, Hash, IndianRupee,
} from 'lucide-react';
import { toast } from 'sonner';
import { arApi } from '@/lib/api';

// ─── Types ─────────────────────────────────────────────────────────────────

interface OutstandingClient {
  clientId: string;
  clientName: string;
  clientCode: string;
  creditLimit: number;
  totalOutstanding: number;
  overdueAmount: number;
  invoiceCount: number;
}

interface AgingData {
  current: number;
  days1_30: number;
  days31_60: number;
  days61_90: number;
  over90: number;
  total: number;
}

interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  reference: string;
  type: 'INVOICE' | 'PAYMENT' | 'CREDIT_NOTE' | 'ADJUSTMENT';
  debit: number;
  credit: number;
  balance: number;
}

interface CreditStatus {
  creditLimit: number;
  used: number;
  available: number;
  utilizationPct: number;
  isOverLimit: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ─── Skeleton ──────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className ?? ''}`}
      style={{ background: 'rgba(255,255,255,0.06)' }}
    />
  );
}

// ─── Aging Card ────────────────────────────────────────────────────────────

const AGING_CONFIG = [
  {
    key: 'current',
    label: 'Current',
    sublabel: 'Not yet due',
    color: '#10b981',
    glow: 'rgba(16,185,129,0.15)',
    icon: CheckCircle2,
  },
  {
    key: 'days1_30',
    label: '1–30 Days',
    sublabel: 'Early overdue',
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.15)',
    icon: Clock,
  },
  {
    key: 'days31_60',
    label: '31–60 Days',
    sublabel: 'Moderate risk',
    color: '#f97316',
    glow: 'rgba(249,115,22,0.15)',
    icon: AlertCircle,
  },
  {
    key: 'days61_90',
    label: '61–90 Days',
    sublabel: 'High risk',
    color: '#ef4444',
    glow: 'rgba(239,68,68,0.15)',
    icon: AlertTriangle,
  },
  {
    key: 'over90',
    label: '90+ Days',
    sublabel: 'Critical',
    color: '#be123c',
    glow: 'rgba(190,18,60,0.18)',
    icon: XCircle,
  },
];

function AgingCard({
  config,
  amount,
  total,
  loading,
  delay,
}: {
  config: (typeof AGING_CONFIG)[number];
  amount: number;
  total: number;
  loading: boolean;
  delay: number;
}) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="glass-card p-5 flex flex-col gap-3 relative overflow-hidden"
      style={{ borderColor: `${config.color}20` }}
    >
      {/* Ambient glow top-right */}
      <div
        className="absolute -top-4 -right-4 w-20 h-20 rounded-full pointer-events-none"
        style={{ background: config.glow, filter: 'blur(20px)' }}
      />

      <div className="flex items-start justify-between relative">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${config.color}18`, color: config.color }}
        >
          <Icon size={16} />
        </div>
        {loading ? null : (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: `${config.color}14`, color: config.color }}
          >
            {pct.toFixed(1)}%
          </span>
        )}
      </div>

      <div className="relative">
        <p
          className="text-xs font-medium uppercase tracking-wider mb-1"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          {config.label}
        </p>
        {loading ? (
          <Skeleton className="h-7 w-28 mb-1" />
        ) : (
          <p
            className="text-2xl font-bold leading-tight"
            style={{ color: 'white', fontFamily: 'Plus Jakarta Sans' }}
          >
            {INR_COMPACT(amount)}
          </p>
        )}
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {config.sublabel}
        </p>
      </div>

      {/* Progress fill bar at bottom */}
      <div
        className="absolute bottom-0 left-0 h-0.5 rounded-full transition-all duration-1000"
        style={{
          width: loading ? '0%' : `${pct}%`,
          background: `linear-gradient(90deg, ${config.color}80, ${config.color})`,
        }}
      />
    </motion.div>
  );
}

// ─── Credit Utilization Bar ────────────────────────────────────────────────

function CreditBar({ pct }: { pct: number }) {
  const clampedPct = Math.min(pct, 100);
  const color = pct > 90 ? '#f43f5e' : pct > 70 ? '#f59e0b' : '#10b981';
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 h-1.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.07)', minWidth: 60 }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${clampedPct}%`, background: color }}
        />
      </div>
      <span
        className="text-xs font-semibold tabular-nums w-9 text-right"
        style={{ color }}
      >
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

// ─── Confirmation Dialog ────────────────────────────────────────────────────

function ConfirmDialog({
  open,
  clientName,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  clientName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  if (!open) return null;
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(6,14,26,0.8)', backdropFilter: 'blur(6px)' }}
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 10 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] glass-card p-6"
            style={{ borderColor: 'rgba(245,158,11,0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}
            >
              <Send size={20} />
            </div>
            <h3
              className="text-center text-base font-semibold text-white mb-1"
              style={{ fontFamily: 'Plus Jakarta Sans' }}
            >
              Send Payment Reminder
            </h3>
            <p className="text-center text-sm mb-5" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Send an overdue payment reminder to{' '}
              <span className="text-white font-medium">{clientName}</span>?
              This will notify them via email.
            </p>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.5)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                style={{
                  background: loading ? 'rgba(245,158,11,0.3)' : '#f59e0b',
                  color: loading ? 'rgba(255,255,255,0.5)' : '#000',
                }}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {loading ? 'Sending…' : 'Send Reminder'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Client Ledger Drawer ─────────────────────────────────────────────────

const ENTRY_TYPE_CFG: Record<string, { color: string; bg: string; label: string }> = {
  INVOICE:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   label: 'Invoice'     },
  PAYMENT:     { color: '#10b981', bg: 'rgba(16,185,129,0.1)',   label: 'Payment'     },
  CREDIT_NOTE: { color: '#818cf8', bg: 'rgba(129,140,248,0.1)',  label: 'Credit Note' },
  ADJUSTMENT:  { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', label: 'Adjustment'  },
};

function LedgerDrawer({
  open,
  clientId,
  clientName,
  onClose,
}: {
  open: boolean;
  clientId: string | null;
  clientName: string;
  onClose: () => void;
}) {
  const { data: ledgerRaw, isLoading: ledgerLoading } = useQuery({
    queryKey: ['ar-ledger', clientId],
    queryFn: () => arApi.getClientLedger(clientId!),
    enabled: !!clientId && open,
  });

  const { data: creditRaw, isLoading: creditLoading } = useQuery({
    queryKey: ['ar-credit-status', clientId],
    queryFn: () => arApi.getCreditStatus(clientId!),
    enabled: !!clientId && open,
  });

  const entries: LedgerEntry[] = Array.isArray((ledgerRaw as any)?.data)
    ? (ledgerRaw as any).data
    : Array.isArray(ledgerRaw)
    ? (ledgerRaw as any)
    : [];

  const credit: CreditStatus | null = (creditRaw as any) ?? null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(6,14,26,0.65)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="fixed right-0 top-0 h-full z-50 flex flex-col"
            style={{
              width: 'min(680px, 95vw)',
              background: '#0a1628',
              borderLeft: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-start justify-between px-6 py-5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <BookOpen size={15} style={{ color: '#818cf8' }} />
                  <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#818cf8' }}>
                    Client Ledger
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                  {clientName}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Credit Status Summary */}
            {creditLoading ? (
              <div className="px-6 py-4">
                <Skeleton className="h-20" />
              </div>
            ) : credit ? (
              <div
                className="mx-6 my-4 rounded-xl p-4"
                style={{
                  background: credit.isOverLimit
                    ? 'rgba(244,63,94,0.06)'
                    : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${credit.isOverLimit ? 'rgba(244,63,94,0.2)' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Wallet size={14} style={{ color: credit.isOverLimit ? '#f43f5e' : '#818cf8' }} />
                    <span
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: credit.isOverLimit ? '#f43f5e' : '#818cf8' }}
                    >
                      Credit Status
                    </span>
                    {credit.isOverLimit && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-semibold"
                        style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e' }}
                      >
                        OVER LIMIT
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold" style={{ color: credit.isOverLimit ? '#f43f5e' : '#10b981' }}>
                    {credit.utilizationPct?.toFixed(1)}% utilized
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {[
                    { label: 'Credit Limit', value: INR(credit.creditLimit), color: 'rgba(255,255,255,0.5)' },
                    { label: 'Used',         value: INR(credit.used),        color: '#f59e0b' },
                    { label: 'Available',    value: INR(credit.available),   color: '#10b981' },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</p>
                      <p className="text-sm font-semibold" style={{ color }}>{value}</p>
                    </div>
                  ))}
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.07)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(credit.utilizationPct ?? 0, 100)}%`,
                      background: credit.isOverLimit
                        ? '#f43f5e'
                        : credit.utilizationPct > 70
                        ? '#f59e0b'
                        : '#10b981',
                    }}
                  />
                </div>
              </div>
            ) : null}

            {/* Ledger Table */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Date', 'Description', 'Ref', 'Debit (₹)', 'Credit (₹)', 'Balance'].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                          style={{ color: 'rgba(255,255,255,0.3)' }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerLoading &&
                      [...Array(6)].map((_, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          {[...Array(6)].map((_, j) => (
                            <td key={j} className="px-3 py-3">
                              <Skeleton className="h-4" />
                            </td>
                          ))}
                        </tr>
                      ))}
                    {!ledgerLoading && entries.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center">
                          <BookOpen size={28} className="mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.15)' }} />
                          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            No ledger entries found
                          </p>
                        </td>
                      </tr>
                    )}
                    {!ledgerLoading &&
                      entries.map((entry) => {
                        const cfg = ENTRY_TYPE_CFG[entry.type] ?? ENTRY_TYPE_CFG.ADJUSTMENT;
                        const balance = Number(entry.balance ?? 0);
                        return (
                          <tr
                            key={entry.id}
                            className="hover:bg-white/[0.015] transition-colors"
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                          >
                            <td className="px-3 py-3">
                              <p className="text-xs whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                {fmtDate(entry.date)}
                              </p>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-start gap-2">
                                <span
                                  className="mt-0.5 flex-shrink-0 text-xs px-1.5 py-0.5 rounded font-medium"
                                  style={{ background: cfg.bg, color: cfg.color }}
                                >
                                  {cfg.label}
                                </span>
                                <p className="text-sm text-white truncate max-w-[140px]">
                                  {entry.description}
                                </p>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <p
                                className="text-xs font-mono"
                                style={{ color: 'rgba(255,255,255,0.4)' }}
                              >
                                {entry.reference || '—'}
                              </p>
                            </td>
                            <td className="px-3 py-3">
                              <p
                                className="text-sm font-medium tabular-nums"
                                style={{ color: entry.debit ? '#f43f5e' : 'rgba(255,255,255,0.2)' }}
                              >
                                {entry.debit ? INR(entry.debit) : '—'}
                              </p>
                            </td>
                            <td className="px-3 py-3">
                              <p
                                className="text-sm font-medium tabular-nums"
                                style={{ color: entry.credit ? '#10b981' : 'rgba(255,255,255,0.2)' }}
                              >
                                {entry.credit ? INR(entry.credit) : '—'}
                              </p>
                            </td>
                            <td className="px-3 py-3">
                              <p
                                className="text-sm font-semibold tabular-nums"
                                style={{ color: balance > 0 ? '#f59e0b' : '#10b981' }}
                              >
                                {INR(Math.abs(balance))}
                                {balance > 0 ? (
                                  <span className="text-xs ml-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Dr</span>
                                ) : balance < 0 ? (
                                  <span className="text-xs ml-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Cr</span>
                                ) : null}
                              </p>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function ReceivablesPage() {
  const [search, setSearch] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [drawerClientId, setDrawerClientId] = useState<string | null>(null);
  const [drawerClientName, setDrawerClientName] = useState('');
  const [reminderTarget, setReminderTarget] = useState<{ id: string; name: string } | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: outstandingRaw, isLoading: outLoading } = useQuery({
    queryKey: ['ar-outstanding'],
    queryFn: arApi.getOutstanding,
  });

  const { data: agingRaw, isLoading: agingLoading } = useQuery({
    queryKey: ['ar-aging'],
    queryFn: arApi.getAging,
  });

  const reminderMutation = useMutation({
    mutationFn: (clientId: string) => arApi.sendReminder(clientId),
    onSuccess: (data: any) => {
      toast.success(`Reminder sent to ${reminderTarget?.name ?? 'client'}`, {
        description: `${data?.invoices ?? 0} invoice(s) notified`,
      });
      setReminderTarget(null);
    },
    onError: () => {
      toast.error('Failed to send reminder. Please try again.');
      setReminderTarget(null);
    },
  });

  // ── Normalize data ───────────────────────────────────────────────────────
  const allClients: OutstandingClient[] = Array.isArray(outstandingRaw)
    ? (outstandingRaw as OutstandingClient[])
    : [];

  const aging: AgingData = (agingRaw as any) ?? {
    current: 0, days1_30: 0, days31_60: 0, days61_90: 0, over90: 0, total: 0,
  };

  const agingTotal =
    Number(aging.current ?? 0) +
    Number(aging.days1_30 ?? 0) +
    Number(aging.days31_60 ?? 0) +
    Number(aging.days61_90 ?? 0) +
    Number(aging.over90 ?? 0) || 1;

  // ── Filter clients ───────────────────────────────────────────────────────
  const filteredClients = allClients.filter((c) => {
    const matchSearch =
      !search ||
      c.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      c.clientCode?.toLowerCase().includes(search.toLowerCase());
    const matchOverdue = !overdueOnly || (c.overdueAmount ?? 0) > 0;
    return matchSearch && matchOverdue;
  });

  const grandTotal = allClients.reduce((s, c) => s + Number(c.totalOutstanding ?? 0), 0);
  const overdueTotal = allClients.reduce((s, c) => s + Number(c.overdueAmount ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* ── Confirm Dialog ─────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!reminderTarget}
        clientName={reminderTarget?.name ?? ''}
        onConfirm={() => reminderTarget && reminderMutation.mutate(reminderTarget.id)}
        onCancel={() => setReminderTarget(null)}
        loading={reminderMutation.isPending}
      />

      {/* ── Ledger Drawer ──────────────────────────────────────────────── */}
      <LedgerDrawer
        open={!!drawerClientId}
        clientId={drawerClientId}
        clientName={drawerClientName}
        onClose={() => setDrawerClientId(null)}
      />

      {/* ── Page Header ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
            >
              <IndianRupee size={14} />
            </div>
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: '#818cf8' }}
            >
              Finance / Receivables
            </span>
          </div>
          <h1
            className="text-xl font-bold text-white"
            style={{ fontFamily: 'Plus Jakarta Sans' }}
          >
            Accounts Receivable
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Track outstanding balances, aging, and client credit utilization
          </p>
        </div>

        {/* Grand total badges */}
        <div className="flex items-center gap-3">
          <div
            className="px-4 py-2 rounded-xl text-right"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}
          >
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Total Outstanding</p>
            <p className="text-base font-bold" style={{ color: '#f59e0b', fontFamily: 'Plus Jakarta Sans' }}>
              {outLoading ? '—' : INR_COMPACT(grandTotal)}
            </p>
          </div>
          <div
            className="px-4 py-2 rounded-xl text-right"
            style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)' }}
          >
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Total Overdue</p>
            <p className="text-base font-bold" style={{ color: '#f43f5e', fontFamily: 'Plus Jakarta Sans' }}>
              {outLoading ? '—' : INR_COMPACT(overdueTotal)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Aging Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {AGING_CONFIG.map((cfg, i) => {
          const amount = Number((aging as any)[cfg.key] ?? 0);
          return (
            <AgingCard
              key={cfg.key}
              config={cfg}
              amount={amount}
              total={agingTotal}
              loading={agingLoading}
              delay={i * 0.07}
            />
          );
        })}
      </div>

      {/* ── Outstanding Table ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="glass-card overflow-hidden"
      >
        {/* Table header + filters */}
        <div
          className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-2 flex-1">
            <Users size={15} style={{ color: '#818cf8' }} />
            <h2
              className="font-semibold text-white"
              style={{ fontFamily: 'Plus Jakarta Sans' }}
            >
              Outstanding by Client
            </h2>
            {!outLoading && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium ml-1"
                style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}
              >
                {filteredClients.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Overdue filter */}
            <button
              onClick={() => setOverdueOnly((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: overdueOnly ? 'rgba(244,63,94,0.12)' : 'rgba(255,255,255,0.04)',
                color: overdueOnly ? '#f43f5e' : 'rgba(255,255,255,0.4)',
                border: `1px solid ${overdueOnly ? 'rgba(244,63,94,0.25)' : 'rgba(255,255,255,0.07)'}`,
              }}
            >
              <AlertTriangle size={12} />
              Overdue Only
            </button>

            {/* Search */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <Search size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients…"
                className="bg-transparent text-sm outline-none w-40 text-white placeholder:text-white/25"
              />
              {search && (
                <button onClick={() => setSearch('')}>
                  <X size={12} style={{ color: 'rgba(255,255,255,0.3)' }} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {[
                  'Client Code',
                  'Client Name',
                  'Outstanding (₹)',
                  'Overdue (₹)',
                  'Invoices',
                  'Credit Utilization',
                  'Actions',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'rgba(255,255,255,0.28)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Skeleton rows */}
              {outLoading &&
                [...Array(6)].map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <Skeleton className="h-4" />
                      </td>
                    ))}
                  </tr>
                ))}

              {/* Empty state */}
              {!outLoading && filteredClients.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <BarChart3 size={32} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                    <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {search || overdueOnly ? 'No clients match your filter' : 'No outstanding receivables'}
                    </p>
                  </td>
                </tr>
              )}

              {/* Data rows */}
              {!outLoading &&
                filteredClients.map((client, idx) => {
                  const creditLimit = Number(client.creditLimit ?? 0);
                  const outstanding = Number(client.totalOutstanding ?? 0);
                  const overdue = Number(client.overdueAmount ?? 0);
                  const utilizationPct = creditLimit > 0 ? (outstanding / creditLimit) * 100 : 0;
                  const hasOverdue = overdue > 0;

                  return (
                    <motion.tr
                      key={client.clientId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.03 }}
                      className="hover:bg-white/[0.015] transition-colors group"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    >
                      {/* Client Code */}
                      <td className="px-4 py-3.5">
                        <span
                          className="font-mono text-xs font-semibold px-2 py-1 rounded"
                          style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}
                        >
                          {client.clientCode || '—'}
                        </span>
                      </td>

                      {/* Client Name */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white">{client.clientName}</p>
                          {hasOverdue && (
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ background: '#f43f5e' }}
                            />
                          )}
                        </div>
                      </td>

                      {/* Outstanding */}
                      <td className="px-4 py-3.5">
                        <p
                          className="text-sm font-semibold tabular-nums"
                          style={{ color: '#f59e0b' }}
                        >
                          {INR(outstanding)}
                        </p>
                      </td>

                      {/* Overdue */}
                      <td className="px-4 py-3.5">
                        {overdue > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle size={12} style={{ color: '#f43f5e' }} />
                            <p
                              className="text-sm font-semibold tabular-nums"
                              style={{ color: '#f43f5e' }}
                            >
                              {INR(overdue)}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>—</p>
                        )}
                      </td>

                      {/* Invoice Count */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Hash size={11} style={{ color: 'rgba(255,255,255,0.3)' }} />
                          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                            {client.invoiceCount ?? 0}
                          </span>
                        </div>
                      </td>

                      {/* Credit Utilization */}
                      <td className="px-4 py-3.5" style={{ minWidth: 160 }}>
                        {creditLimit > 0 ? (
                          <CreditBar pct={utilizationPct} />
                        ) : (
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                            No limit set
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setDrawerClientId(client.clientId);
                              setDrawerClientName(client.clientName);
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                            style={{
                              background: 'rgba(99,102,241,0.1)',
                              color: '#818cf8',
                              border: '1px solid rgba(99,102,241,0.2)',
                            }}
                          >
                            <Eye size={12} />
                            View Ledger
                          </button>
                          <button
                            onClick={() =>
                              setReminderTarget({ id: client.clientId, name: client.clientName })
                            }
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                            style={{
                              background: 'rgba(245,158,11,0.1)',
                              color: '#f59e0b',
                              border: '1px solid rgba(245,158,11,0.2)',
                            }}
                          >
                            <Bell size={12} />
                            Remind
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Footer summary */}
        {!outLoading && filteredClients.length > 0 && (
          <div
            className="px-6 py-3 flex items-center justify-between"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Showing {filteredClients.length} of {allClients.length} clients
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Filtered outstanding:
                </span>
                <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>
                  {INR(filteredClients.reduce((s, c) => s + Number(c.totalOutstanding ?? 0), 0))}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Filtered overdue:
                </span>
                <span className="text-xs font-semibold" style={{ color: '#f43f5e' }}>
                  {INR(filteredClients.reduce((s, c) => s + Number(c.overdueAmount ?? 0), 0))}
                </span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
