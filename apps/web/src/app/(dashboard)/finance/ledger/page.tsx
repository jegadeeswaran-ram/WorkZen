'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Calendar, ChevronDown, ChevronRight,
  Printer, Download, Search, TrendingUp, TrendingDown,
  RefreshCw, AlertCircle, Hash, FileText, Layers,
} from 'lucide-react';
import { voucherApi, statementsApi } from '@/lib/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const INR = (v: number | string) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(v) || 0);

const toDateInput = (d: Date) => d.toISOString().slice(0, 10);

const today = toDateInput(new Date());
const firstOfMonth = toDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

// ─── Types ────────────────────────────────────────────────────────────────────

interface VoucherLine {
  accountName?: string;
  accountCode?: string;
  debit?: number | string;
  credit?: number | string;
  narration?: string;
}

interface Voucher {
  id: string;
  voucherNo: string;
  type: string;
  narration?: string;
  amount?: number | string;
  lines?: VoucherLine[];
  lineCount?: number;
}

interface LedgerEntry {
  date: string;
  voucherNo?: string;
  voucherType?: string;
  narration?: string;
  debit?: number | string;
  credit?: number | string;
  balance?: number | string;
}

interface Account {
  id: string;
  name: string;
  code?: string;
  type?: string;
  subType?: string;
  openingBalance?: number | string;
  currentBalance?: number | string;
}

// ─── Voucher type colors ──────────────────────────────────────────────────────

const VOUCHER_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  PAYMENT:    { bg: 'rgba(244,63,94,0.12)',   color: '#f43f5e',  label: 'PMT' },
  RECEIPT:    { bg: 'rgba(16,185,129,0.12)',  color: '#10b981',  label: 'RCT' },
  JOURNAL:    { bg: 'rgba(99,102,241,0.12)',  color: '#818cf8',  label: 'JNL' },
  SALES:      { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b',  label: 'SAL' },
  PURCHASE:   { bg: 'rgba(168,85,247,0.12)',  color: '#a855f7',  label: 'PUR' },
  CONTRA:     { bg: 'rgba(107,114,128,0.1)',  color: '#9ca3af',  label: 'CON' },
  CREDIT_NOTE:{ bg: 'rgba(236,72,153,0.12)',  color: '#ec4899',  label: 'CN' },
  DEBIT_NOTE: { bg: 'rgba(249,115,22,0.12)',  color: '#f97316',  label: 'DN' },
};

const getVoucherCfg = (type: string) =>
  VOUCHER_COLORS[type?.toUpperCase()] ?? { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', label: type?.slice(0,3).toUpperCase() ?? 'N/A' };

// ─── Account type palette ─────────────────────────────────────────────────────

const ACCOUNT_TYPE_CFG: Record<string, { bg: string; color: string; ring: string }> = {
  ASSET:     { bg: 'rgba(16,185,129,0.08)',  color: '#10b981', ring: 'rgba(16,185,129,0.2)' },
  LIABILITY: { bg: 'rgba(244,63,94,0.08)',   color: '#f43f5e', ring: 'rgba(244,63,94,0.2)' },
  EQUITY:    { bg: 'rgba(99,102,241,0.08)',  color: '#818cf8', ring: 'rgba(99,102,241,0.2)' },
  INCOME:    { bg: 'rgba(79,70,229,0.08)',   color: '#6366f1', ring: 'rgba(79,70,229,0.2)' },
  EXPENSE:   { bg: 'rgba(249,115,22,0.08)',  color: '#f97316', ring: 'rgba(249,115,22,0.2)' },
};

const getAccountTypeCfg = (type: string) =>
  ACCOUNT_TYPE_CFG[type?.toUpperCase()] ?? { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', ring: 'rgba(255,255,255,0.1)' };

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className ?? ''}`}
      style={{ background: 'rgba(255,255,255,0.06)' }}
    />
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabButton({ active, onClick, icon: Icon, label }: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all duration-200"
      style={{
        color: active ? '#fff' : 'rgba(255,255,255,0.4)',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
      }}
    >
      <Icon size={15} />
      {label}
      {active && (
        <motion.span
          layoutId="ledger-tab-indicator"
          className="absolute inset-0 rounded-xl"
          style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
    </button>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, icon: Icon, color, loading }: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
}) {
  return (
    <div
      className="flex-1 p-4 rounded-xl"
      style={{ background: `${color}0d`, border: `1px solid ${color}22` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}18`, color }}>
          <Icon size={13} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {label}
        </p>
      </div>
      {loading ? (
        <Skeleton className="h-7 w-28 mt-1" />
      ) : (
        <p className="text-xl font-bold" style={{ color, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          {value}
        </p>
      )}
    </div>
  );
}

// ─── Tab 1: Day Book ─────────────────────────────────────────────────────────

function DayBookTab() {
  const [selectedDate, setSelectedDate] = useState(today);
  const [loadDate, setLoadDate]         = useState(today);
  const [expandedId, setExpandedId]     = useState<string | null>(null);

  const { data: raw, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['day-book', loadDate],
    queryFn:  () => voucherApi.getDayBook(loadDate),
    enabled:  !!loadDate,
  });

  const book = (raw as any) ?? {};
  const vouchers: Voucher[] = book.vouchers ?? [];
  const totalDebit  = Number(book.totalDebit  ?? 0);
  const totalCredit = Number(book.totalCredit ?? 0);

  const handleLoad = () => setLoadDate(selectedDate);

  // Export CSV
  const exportCsv = () => {
    const rows = [['Voucher No', 'Type', 'Narration', 'Amount', 'Lines']];
    vouchers.forEach((v) => {
      rows.push([v.voucherNo, v.type, v.narration ?? '', String(v.amount ?? ''), String(v.lineCount ?? v.lines?.length ?? 0)]);
      (v.lines ?? []).forEach((l) => {
        rows.push(['', '', l.accountName ?? '', String(l.debit ?? ''), String(l.credit ?? '')]);
      });
    });
    const csv  = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `day-book-${loadDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Calendar size={14} style={{ color: '#818cf8' }} />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-sm outline-none"
            style={{ color: 'rgba(255,255,255,0.85)', colorScheme: 'dark' }}
          />
        </div>
        <button
          onClick={handleLoad}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95"
          style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}
        >
          {isFetching ? <RefreshCw size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Load
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95 print:hidden"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Printer size={13} />
          Print
        </button>
        <button
          onClick={exportCsv}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Download size={13} />
          Export CSV
        </button>
        {loadDate && (
          <p className="text-xs ml-auto" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Day Book for{' '}
            <span className="font-mono" style={{ color: '#818cf8' }}>
              {new Date(loadDate + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          </p>
        )}
      </div>

      {/* Summary cards */}
      <div className="flex gap-4">
        <SummaryCard label="Total Debit"  value={INR(totalDebit)}  icon={TrendingDown} color="#f43f5e" loading={isLoading} />
        <SummaryCard label="Total Credit" value={INR(totalCredit)} icon={TrendingUp}   color="#10b981" loading={isLoading} />
        <div
          className="flex-1 p-4 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Hash size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Vouchers
            </p>
          </div>
          {isLoading ? (
            <Skeleton className="h-7 w-16 mt-1" />
          ) : (
            <p className="text-xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {vouchers.length}
            </p>
          )}
        </div>
      </div>

      {/* Voucher table */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        {/* Header */}
        <div
          className="grid text-xs font-semibold uppercase tracking-wider px-4 py-3"
          style={{
            gridTemplateColumns: '40px 1fr 100px 1fr 80px 80px',
            background: 'rgba(255,255,255,0.03)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.3)',
          }}
        >
          <span />
          <span>Voucher No</span>
          <span>Type</span>
          <span>Narration</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Lines</span>
        </div>

        {/* Rows */}
        {isLoading &&
          [...Array(6)].map((_, i) => (
            <div
              key={i}
              className="grid items-center gap-4 px-4 py-3"
              style={{ gridTemplateColumns: '40px 1fr 100px 1fr 80px 80px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}
            >
              <Skeleton className="w-6 h-6 rounded-lg" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-4 w-full max-w-xs" />
              <Skeleton className="h-4 w-16 ml-auto" />
              <Skeleton className="h-4 w-8 ml-auto" />
            </div>
          ))}

        {!isLoading && vouchers.length === 0 && (
          <div className="py-16 text-center">
            <AlertCircle size={28} style={{ color: 'rgba(255,255,255,0.15)', margin: '0 auto 8px' }} />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No vouchers for this date</p>
          </div>
        )}

        {!isLoading && vouchers.map((v, idx) => {
          const cfg      = getVoucherCfg(v.type);
          const isOpen   = expandedId === v.id;
          const lineCount = v.lines?.length ?? v.lineCount ?? 0;
          return (
            <motion.div
              key={v.id ?? idx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.03 }}
            >
              {/* Main row */}
              <button
                onClick={() => setExpandedId(isOpen ? null : v.id)}
                className="w-full grid items-center px-4 py-3 transition-colors text-left hover:bg-white/[0.02]"
                style={{
                  gridTemplateColumns: '40px 1fr 100px 1fr 80px 80px',
                  borderBottom: isOpen ? '1px solid rgba(99,102,241,0.15)' : '1px solid rgba(255,255,255,0.03)',
                }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-200"
                  style={{
                    background: isOpen ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                    color: isOpen ? '#818cf8' : 'rgba(255,255,255,0.3)',
                    transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                  }}
                >
                  <ChevronRight size={12} />
                </div>

                <span
                  className="text-sm font-mono font-semibold"
                  style={{ color: '#818cf8' }}
                >
                  {v.voucherNo}
                </span>

                <span>
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold tracking-wide"
                    style={{ background: cfg.bg, color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                </span>

                <span className="text-sm truncate pr-4" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {v.narration ?? '—'}
                </span>

                <span className="text-sm font-semibold text-right" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {INR(Number(v.amount ?? 0))}
                </span>

                <span
                  className="text-xs font-mono text-right rounded-full px-2 py-0.5 w-fit ml-auto"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
                >
                  {lineCount}
                </span>
              </button>

              {/* Expanded lines */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                    style={{ background: 'rgba(99,102,241,0.04)', borderBottom: '1px solid rgba(99,102,241,0.1)' }}
                  >
                    {/* Sub-header */}
                    <div
                      className="grid text-xs uppercase tracking-wider px-12 py-2"
                      style={{
                        gridTemplateColumns: '1fr 100px 100px',
                        color: 'rgba(255,255,255,0.25)',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      <span>Account</span>
                      <span className="text-right">Debit</span>
                      <span className="text-right">Credit</span>
                    </div>
                    {(v.lines ?? []).length === 0 && (
                      <p className="px-12 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                        No line details available
                      </p>
                    )}
                    {(v.lines ?? []).map((line, li) => (
                      <div
                        key={li}
                        className="grid items-center px-12 py-2.5"
                        style={{
                          gridTemplateColumns: '1fr 100px 100px',
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                        }}
                      >
                        <div>
                          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                            {line.accountName ?? '—'}
                          </p>
                          {line.accountCode && (
                            <p className="text-xs font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                              {line.accountCode}
                            </p>
                          )}
                        </div>
                        <p
                          className="text-sm font-semibold text-right"
                          style={{ color: Number(line.debit) > 0 ? '#f43f5e' : 'rgba(255,255,255,0.2)' }}
                        >
                          {Number(line.debit) > 0 ? INR(Number(line.debit)) : '—'}
                        </p>
                        <p
                          className="text-sm font-semibold text-right"
                          style={{ color: Number(line.credit) > 0 ? '#10b981' : 'rgba(255,255,255,0.2)' }}
                        >
                          {Number(line.credit) > 0 ? INR(Number(line.credit)) : '—'}
                        </p>
                      </div>
                    ))}
                    {/* Balance check row */}
                    <div
                      className="grid items-center px-12 py-2"
                      style={{
                        gridTemplateColumns: '1fr 100px 100px',
                        background: 'rgba(255,255,255,0.02)',
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.25)' }}>
                        Total
                      </p>
                      <p className="text-sm font-bold text-right" style={{ color: '#f43f5e' }}>
                        {INR((v.lines ?? []).reduce((s, l) => s + Number(l.debit ?? 0), 0))}
                      </p>
                      <p className="text-sm font-bold text-right" style={{ color: '#10b981' }}>
                        {INR((v.lines ?? []).reduce((s, l) => s + Number(l.credit ?? 0), 0))}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {/* Footer totals */}
        {!isLoading && vouchers.length > 0 && (
          <div
            className="grid items-center px-4 py-3"
            style={{
              gridTemplateColumns: '40px 1fr 100px 1fr 80px 80px',
              background: 'rgba(255,255,255,0.03)',
              borderTop: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <span />
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Grand Total
            </p>
            <span />
            <span />
            <p className="text-sm font-bold text-right" style={{ color: '#f43f5e' }}>
              {INR(totalDebit)}
            </p>
            <span />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 2: General Ledger ─────────────────────────────────────────────────────

function GeneralLedgerTab() {
  const [accountSearch, setAccountSearch] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showDropdown, setShowDropdown]   = useState(false);
  const [fromDate, setFromDate]           = useState(firstOfMonth);
  const [toDate, setToDate]               = useState(today);
  const [loadParams, setLoadParams]       = useState<{ id: string; from: string; to: string } | null>(null);

  const { data: accountsRaw, isLoading: accountsLoading } = useQuery({
    queryKey: ['chart-of-accounts-select'],
    queryFn:  statementsApi.getChartOfAccounts,
  });

  const accounts: Account[] = Array.isArray(accountsRaw) ? accountsRaw : (accountsRaw as any)?.accounts ?? [];

  const filtered = accounts.filter((a) => {
    const q = accountSearch.toLowerCase();
    return !q || a.name?.toLowerCase().includes(q) || a.code?.toLowerCase().includes(q);
  });

  const { data: ledgerRaw, isLoading: ledgerLoading, isFetching } = useQuery({
    queryKey: ['account-ledger', loadParams],
    queryFn:  () => voucherApi.getAccountLedger(loadParams!.id, { from: loadParams!.from, to: loadParams!.to }),
    enabled:  !!loadParams,
  });

  const ledger     = (ledgerRaw as any) ?? {};
  const entries: LedgerEntry[] = ledger.entries ?? [];
  const openBal    = Number(ledger.openingBalance ?? 0);
  const closeBal   = Number(ledger.closingBalance ?? 0);
  const totalDr    = entries.reduce((s, e) => s + Number(e.debit ?? 0), 0);
  const totalCr    = entries.reduce((s, e) => s + Number(e.credit ?? 0), 0);

  const handleLoad = () => {
    if (!selectedAccount) return;
    setLoadParams({ id: selectedAccount.id, from: fromDate, to: toDate });
  };

  const exportCsv = useCallback(() => {
    if (!entries.length) return;
    const rows = [['Date', 'Voucher No', 'Type', 'Narration', 'Debit', 'Credit', 'Balance']];
    entries.forEach((e) => {
      rows.push([e.date, e.voucherNo ?? '', e.voucherType ?? '', e.narration ?? '', String(e.debit ?? ''), String(e.credit ?? ''), String(e.balance ?? '')]);
    });
    const csv  = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `ledger-${selectedAccount?.code ?? 'account'}-${fromDate}-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [entries, selectedAccount, fromDate, toDate]);

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Account selector */}
        <div className="relative flex-1 min-w-52">
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Account
          </label>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <Search size={13} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search accounts…"
              value={selectedAccount ? `${selectedAccount.code ? `[${selectedAccount.code}] ` : ''}${selectedAccount.name}` : accountSearch}
              onChange={(e) => { setAccountSearch(e.target.value); setSelectedAccount(null); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              className="bg-transparent text-sm outline-none w-full"
              style={{ color: 'rgba(255,255,255,0.85)' }}
            />
            <ChevronDown size={13} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
          </div>
          {showDropdown && (
            <div
              className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden max-h-56 overflow-y-auto"
              style={{ background: 'var(--wz-card-bg)', border: '1px solid var(--wz-card-border)', boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}
            >
              {accountsLoading && (
                <div className="p-3 space-y-2">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8" />)}
                </div>
              )}
              {!accountsLoading && filtered.length === 0 && (
                <p className="p-3 text-xs text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>No accounts found</p>
              )}
              {!accountsLoading && filtered.map((a) => {
                const cfg = getAccountTypeCfg(a.type ?? '');
                return (
                  <button
                    key={a.id}
                    onClick={() => { setSelectedAccount(a); setShowDropdown(false); setAccountSearch(''); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold"
                      style={{ background: cfg.bg, color: cfg.color, minWidth: 28, textAlign: 'center' }}
                    >
                      {(a.type ?? '').slice(0, 3).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{a.name}</p>
                      {a.code && <p className="text-xs font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{a.code}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Date range */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            From
          </label>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Calendar size={13} style={{ color: '#818cf8' }} />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent text-sm outline-none"
              style={{ color: 'rgba(255,255,255,0.85)', colorScheme: 'dark' }}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            To
          </label>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Calendar size={13} style={{ color: '#818cf8' }} />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent text-sm outline-none"
              style={{ color: 'rgba(255,255,255,0.85)', colorScheme: 'dark' }}
            />
          </div>
        </div>

        <button
          onClick={handleLoad}
          disabled={!selectedAccount || isFetching}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 disabled:opacity-40"
          style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}
        >
          {isFetching ? <RefreshCw size={13} className="animate-spin" /> : <BookOpen size={13} />}
          Load Ledger
        </button>

        <button
          onClick={exportCsv}
          disabled={!entries.length}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95 disabled:opacity-40"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Download size={13} />
          Export CSV
        </button>
      </div>

      {/* Account header card */}
      {selectedAccount && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl"
          style={{
            background: `${getAccountTypeCfg(selectedAccount.type ?? '').color}08`,
            border: `1px solid ${getAccountTypeCfg(selectedAccount.type ?? '').ring}`,
          }}
        >
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 16 }}>
                  {selectedAccount.name}
                </p>
                {selectedAccount.code && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}>
                    {selectedAccount.code}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {selectedAccount.type && (
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: getAccountTypeCfg(selectedAccount.type).bg,
                      color: getAccountTypeCfg(selectedAccount.type).color,
                    }}
                  >
                    {selectedAccount.type}
                  </span>
                )}
                {selectedAccount.subType && (
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{selectedAccount.subType}</span>
                )}
              </div>
            </div>
            {ledger.openingBalance !== undefined && (
              <div className="ml-auto">
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Opening Balance</p>
                <p className="text-lg font-bold" style={{ color: openBal < 0 ? '#f43f5e' : 'rgba(255,255,255,0.85)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {INR(openBal)}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Ledger table */}
      {(loadParams || ledgerLoading) && (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          {/* Header */}
          <div
            className="grid text-xs font-semibold uppercase tracking-wider px-4 py-3"
            style={{
              gridTemplateColumns: '90px 100px 80px 1fr 90px 90px 110px',
              background: 'rgba(255,255,255,0.03)',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.3)',
            }}
          >
            <span>Date</span>
            <span>Voucher</span>
            <span>Type</span>
            <span>Narration</span>
            <span className="text-right">Debit</span>
            <span className="text-right">Credit</span>
            <span className="text-right">Balance</span>
          </div>

          {/* Opening balance row */}
          {!ledgerLoading && ledger.openingBalance !== undefined && (
            <div
              className="grid items-center px-4 py-2.5"
              style={{
                gridTemplateColumns: '90px 100px 80px 1fr 90px 90px 110px',
                background: 'rgba(255,255,255,0.015)',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {fromDate}
              </span>
              <span />
              <span />
              <p className="text-xs font-semibold italic" style={{ color: 'rgba(255,255,255,0.35)' }}>Opening Balance</p>
              <span />
              <span />
              <p className="text-sm font-bold text-right" style={{ color: openBal < 0 ? '#f43f5e' : 'rgba(255,255,255,0.7)' }}>
                {INR(openBal)}
              </p>
            </div>
          )}

          {/* Skeleton rows */}
          {ledgerLoading &&
            [...Array(8)].map((_, i) => (
              <div
                key={i}
                className="grid items-center gap-4 px-4 py-3"
                style={{ gridTemplateColumns: '90px 100px 80px 1fr 90px 90px 110px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}
              >
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-4 w-full max-w-xs" />
                <Skeleton className="h-4 w-16 ml-auto" />
                <Skeleton className="h-4 w-16 ml-auto" />
                <Skeleton className="h-4 w-20 ml-auto" />
              </div>
            ))}

          {!ledgerLoading && entries.length === 0 && (
            <div className="py-16 text-center">
              <AlertCircle size={28} style={{ color: 'rgba(255,255,255,0.15)', margin: '0 auto 8px' }} />
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No transactions in this period</p>
            </div>
          )}

          {/* Entry rows */}
          {!ledgerLoading && entries.map((e, i) => {
            const cfg = getVoucherCfg(e.voucherType ?? '');
            const bal = Number(e.balance ?? 0);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.025 }}
                className="grid items-center px-4 py-3 hover:bg-white/[0.015] transition-colors"
                style={{
                  gridTemplateColumns: '90px 100px 80px 1fr 90px 90px 110px',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                }}
              >
                <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {e.date ? new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                </p>
                <p className="text-xs font-mono font-semibold" style={{ color: '#818cf8' }}>
                  {e.voucherNo ?? '—'}
                </p>
                <span>
                  {e.voucherType && (
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold"
                      style={{ background: cfg.bg, color: cfg.color }}
                    >
                      {cfg.label}
                    </span>
                  )}
                </span>
                <p className="text-sm truncate pr-4" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {e.narration ?? '—'}
                </p>
                <p className="text-sm font-medium text-right" style={{ color: Number(e.debit) > 0 ? '#f43f5e' : 'rgba(255,255,255,0.2)' }}>
                  {Number(e.debit) > 0 ? INR(Number(e.debit)) : '—'}
                </p>
                <p className="text-sm font-medium text-right" style={{ color: Number(e.credit) > 0 ? '#10b981' : 'rgba(255,255,255,0.2)' }}>
                  {Number(e.credit) > 0 ? INR(Number(e.credit)) : '—'}
                </p>
                <p
                  className="text-sm font-bold text-right"
                  style={{ color: bal < 0 ? '#f43f5e' : 'rgba(255,255,255,0.85)' }}
                >
                  {INR(bal)}
                </p>
              </motion.div>
            );
          })}

          {/* Footer */}
          {!ledgerLoading && (entries.length > 0 || ledger.closingBalance !== undefined) && (
            <div
              className="grid items-center px-4 py-3"
              style={{
                gridTemplateColumns: '90px 100px 80px 1fr 90px 90px 110px',
                background: 'rgba(255,255,255,0.03)',
                borderTop: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span />
              <span />
              <span />
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Closing Balance
              </p>
              <p className="text-sm font-bold text-right" style={{ color: '#f43f5e' }}>
                {INR(totalDr)}
              </p>
              <p className="text-sm font-bold text-right" style={{ color: '#10b981' }}>
                {INR(totalCr)}
              </p>
              <p
                className="text-sm font-bold text-right"
                style={{ color: closeBal < 0 ? '#f43f5e' : '#10b981' }}
              >
                {INR(closeBal)}
              </p>
            </div>
          )}
        </div>
      )}

      {!loadParams && !ledgerLoading && (
        <div
          className="rounded-2xl py-20 flex flex-col items-center gap-3"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}
        >
          <BookOpen size={32} style={{ color: 'rgba(255,255,255,0.1)' }} />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Select an account and click Load Ledger to view transactions
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Chart of Accounts ─────────────────────────────────────────────────

const COA_ORDER = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];

function ChartOfAccountsTab() {
  const [search, setSearch] = useState('');

  const { data: raw, isLoading } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn:  statementsApi.getChartOfAccounts,
  });

  const accounts: Account[] = Array.isArray(raw) ? raw : (raw as any)?.accounts ?? [];

  const filtered = accounts.filter((a) => {
    const q = search.toLowerCase();
    return !q || a.name?.toLowerCase().includes(q) || a.code?.toLowerCase().includes(q) || a.type?.toLowerCase().includes(q);
  });

  // Group by type
  const grouped = COA_ORDER.reduce<Record<string, Account[]>>((acc, type) => {
    acc[type] = filtered.filter((a) => a.type?.toUpperCase() === type);
    return acc;
  }, {});
  // Catch unrecognized types
  const otherTypes = [...new Set(filtered.map((a) => a.type?.toUpperCase()).filter((t) => t && !COA_ORDER.includes(t as string)))] as string[];
  otherTypes.forEach((t) => { grouped[t] = filtered.filter((a) => a.type?.toUpperCase() === t); });

  const allTypes = [...COA_ORDER, ...otherTypes].filter((t) => grouped[t]?.length > 0);

  return (
    <div className="space-y-5">
      {/* Search bar */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 max-w-xs"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Search size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input
            type="text"
            placeholder="Search accounts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm outline-none w-full"
            style={{ color: 'rgba(255,255,255,0.85)' }}
          />
        </div>
        <p className="text-xs ml-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {filtered.length} of {accounts.length} accounts
        </p>
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-8 w-32" />
              {[...Array(4)].map((_, j) => <Skeleton key={j} className="h-12" />)}
            </div>
          ))}
        </div>
      )}

      {/* Grouped tables */}
      {!isLoading && allTypes.map((type) => {
        const cfg   = getAccountTypeCfg(type);
        const group = grouped[type];
        return (
          <motion.div
            key={type}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl overflow-hidden"
            style={{ border: `1px solid ${cfg.ring}` }}
          >
            {/* Group header */}
            <div
              className="flex items-center gap-3 px-5 py-3"
              style={{ background: cfg.bg, borderBottom: `1px solid ${cfg.ring}` }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
              <p className="text-sm font-bold tracking-wide" style={{ color: cfg.color, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {type}
              </p>
              <span
                className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: `${cfg.color}20`, color: cfg.color }}
              >
                {group.length} accounts
              </span>
            </div>

            {/* Table header */}
            <div
              className="grid text-xs font-semibold uppercase tracking-wider px-5 py-2.5"
              style={{
                gridTemplateColumns: '80px 1fr 90px 120px 110px 110px',
                background: 'rgba(255,255,255,0.02)',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.25)',
              }}
            >
              <span>Code</span>
              <span>Account Name</span>
              <span>Sub-Type</span>
              <span>Type</span>
              <span className="text-right">Opening Bal</span>
              <span className="text-right">Current Bal</span>
            </div>

            {/* Rows */}
            {group.map((a, i) => {
              const currentBal = Number(a.currentBalance ?? a.openingBalance ?? 0);
              return (
                <div
                  key={a.id}
                  className="grid items-center px-5 py-3 hover:bg-white/[0.02] transition-colors"
                  style={{
                    gridTemplateColumns: '80px 1fr 90px 120px 110px 110px',
                    borderBottom: i < group.length - 1 ? '1px solid rgba(255,255,255,0.03)' : undefined,
                  }}
                >
                  <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {a.code ?? '—'}
                  </p>
                  <p className="text-sm font-medium text-white">
                    {a.name}
                  </p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {a.subType ?? '—'}
                  </p>
                  <span>
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold"
                      style={{ background: cfg.bg, color: cfg.color }}
                    >
                      {a.type}
                    </span>
                  </span>
                  <p
                    className="text-sm text-right"
                    style={{ color: Number(a.openingBalance ?? 0) < 0 ? '#f43f5e' : 'rgba(255,255,255,0.65)' }}
                  >
                    {INR(Number(a.openingBalance ?? 0))}
                  </p>
                  <p
                    className="text-sm font-semibold text-right"
                    style={{ color: currentBal < 0 ? '#f43f5e' : cfg.color }}
                  >
                    {INR(currentBal)}
                  </p>
                </div>
              );
            })}

            {/* Group total */}
            <div
              className="grid items-center px-5 py-2.5"
              style={{
                gridTemplateColumns: '80px 1fr 90px 120px 110px 110px',
                background: `${cfg.color}08`,
                borderTop: `1px solid ${cfg.ring}`,
              }}
            >
              <span />
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: cfg.color }}>
                Subtotal
              </p>
              <span /><span />
              <p className="text-sm font-bold text-right" style={{ color: cfg.color }}>
                {INR(group.reduce((s, a) => s + Number(a.openingBalance ?? 0), 0))}
              </p>
              <p className="text-sm font-bold text-right" style={{ color: cfg.color }}>
                {INR(group.reduce((s, a) => s + Number(a.currentBalance ?? a.openingBalance ?? 0), 0))}
              </p>
            </div>
          </motion.div>
        );
      })}

      {!isLoading && filtered.length === 0 && (
        <div
          className="rounded-2xl py-20 flex flex-col items-center gap-3"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}
        >
          <Layers size={32} style={{ color: 'rgba(255,255,255,0.1)' }} />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {search ? 'No accounts match your search' : 'No accounts found'}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'daybook',  label: 'Day Book',          icon: FileText,  component: DayBookTab },
  { id: 'ledger',   label: 'General Ledger',     icon: BookOpen,  component: GeneralLedgerTab },
  { id: 'coa',      label: 'Chart of Accounts',  icon: Layers,    component: ChartOfAccountsTab },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LedgerPage() {
  const [activeTab, setActiveTab] = useState<TabId>('daybook');
  const ActiveTab = TABS.find((t) => t.id === activeTab)?.component ?? DayBookTab;

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1
            className="text-xl font-bold text-white"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            Accounting Books
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Day book, general ledger, and chart of accounts
          </p>
        </div>
        {/* Visual accent */}
        <div
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
          style={{ background: 'rgba(99,102,241,0.08)', color: 'rgba(99,102,241,0.7)', border: '1px solid rgba(99,102,241,0.15)' }}
        >
          <BookOpen size={12} />
          Double-Entry Accounting
        </div>
      </motion.div>

      {/* ── Tab Bar ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="flex items-center gap-1 p-1 rounded-2xl w-fit"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {TABS.map((tab) => (
          <TabButton
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            icon={tab.icon}
            label={tab.label}
          />
        ))}
      </motion.div>

      {/* ── Tab Content ──────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          <ActiveTab />
        </motion.div>
      </AnimatePresence>

      {/* ── Print styles (injected inline for portability) ────────────── */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
          [style*="background: rgba"] { background: transparent !important; }
          [style*="color: rgba"] { color: #333 !important; }
          .glass-card { border: 1px solid #ddd !important; box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
