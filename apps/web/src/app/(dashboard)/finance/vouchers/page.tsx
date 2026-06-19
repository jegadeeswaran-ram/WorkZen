'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, X, Check, Loader2, ChevronDown,
  FileText, ArrowRightLeft, ArrowDownLeft, ArrowUpRight,
  RefreshCw, AlertCircle, Trash2, BookOpen, Scale,
  CalendarDays, Hash, AlignLeft, Filter, CheckCircle2,
  XCircle, Clock, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { voucherApi, statementsApi } from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

type VoucherType = 'JOURNAL' | 'RECEIPT' | 'PAYMENT' | 'CONTRA';
type VoucherStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

interface Account {
  id: string;
  name: string;
  code?: string;
  type?: string;
}

interface VoucherLine {
  id: string; // local row id
  accountId: string;
  narration: string;
  debit: string;
  credit: string;
}

interface Voucher {
  id: string;
  voucherNo?: string;
  voucherType: VoucherType;
  date: string;
  narration: string;
  referenceNo?: string;
  amount: number;
  status: VoucherStatus;
  lines?: VoucherLine[];
  createdAt?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const INR = (v: number | string) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(Number(v) || 0);

const parseNum = (s: string) => {
  const n = parseFloat(s.replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
};

const today = () => new Date().toISOString().slice(0, 10);

const uid = () => Math.random().toString(36).slice(2, 9);

const formatDate = (d: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ── Voucher type config ───────────────────────────────────────────────────────

const VOUCHER_TYPES: { type: VoucherType; label: string; icon: React.ElementType; color: string; desc: string }[] = [
  { type: 'JOURNAL',  label: 'Journal',  icon: ArrowRightLeft, color: '#6366f1', desc: 'General ledger entry' },
  { type: 'RECEIPT',  label: 'Receipt',  icon: ArrowDownLeft,  color: '#10b981', desc: 'Money received' },
  { type: 'PAYMENT',  label: 'Payment',  icon: ArrowUpRight,   color: '#f43f5e', desc: 'Money paid out' },
  { type: 'CONTRA',   label: 'Contra',   icon: RefreshCw,      color: '#f59e0b', desc: 'Bank ↔ Cash transfer' },
];

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<VoucherStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  DRAFT:     { label: 'Draft',     color: 'rgba(255,255,255,0.5)',  bg: 'rgba(255,255,255,0.06)', icon: Clock },
  POSTED:    { label: 'Posted',    color: '#10b981',                bg: 'rgba(16,185,129,0.12)',  icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', color: '#f43f5e',               bg: 'rgba(244,63,94,0.12)',   icon: XCircle },
};

const emptyLine = (): VoucherLine => ({
  id: uid(),
  accountId: '',
  narration: '',
  debit: '',
  credit: '',
});

// ── Account Searchable Select ─────────────────────────────────────────────────

function AccountSelect({
  accounts,
  value,
  onChange,
}: {
  accounts: Account[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selected = accounts.find((a) => a.id === value);
  const filtered = accounts.filter(
    (a) =>
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      (a.code ?? '').toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-sm text-left transition-colors"
        style={{
          background: open ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${open ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.07)'}`,
          color: selected ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)',
          minWidth: 0,
        }}
      >
        <span className="truncate">
          {selected ? `${selected.code ? selected.code + ' — ' : ''}${selected.name}` : 'Select account…'}
        </span>
        <ChevronDown size={13} style={{ flexShrink: 0, color: 'rgba(255,255,255,0.3)' }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 top-full mt-1 w-72 rounded-xl overflow-hidden"
            style={{
              background: 'var(--wz-card-bg)',
              border: '1px solid var(--wz-card-border)',
              boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div className="p-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <Search size={13} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search accounts…"
                  className="flex-1 bg-transparent text-sm outline-none text-white placeholder:text-white/30"
                />
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  No accounts found
                </p>
              ) : (
                filtered.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      onChange(acc.id);
                      setOpen(false);
                      setQuery('');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
                    style={{
                      background: acc.id === value ? 'rgba(99,102,241,0.15)' : 'transparent',
                      color: acc.id === value ? '#818cf8' : 'rgba(255,255,255,0.75)',
                    }}
                    onMouseEnter={(e) => {
                      if (acc.id !== value) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                    }}
                    onMouseLeave={(e) => {
                      if (acc.id !== value) (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    {acc.code && (
                      <span className="text-xs font-mono w-12 shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {acc.code}
                      </span>
                    )}
                    <span className="text-sm truncate">{acc.name}</span>
                    {acc.id === value && <Check size={13} className="ml-auto shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className ?? ''}`}
      style={{ background: 'rgba(255,255,255,0.05)' }}
    />
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  confirmColor,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card p-6 w-full max-w-sm mx-4"
      >
        <h3 className="text-base font-semibold text-white mb-2" style={{ fontFamily: 'Plus Jakarta Sans' }}>
          {title}
        </h3>
        <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ background: `${confirmColor}22`, color: confirmColor, border: `1px solid ${confirmColor}44` }}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function VouchersPage() {
  // ── Accounts ───────────────────────────────────────────────────────────────
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);

  useEffect(() => {
    statementsApi
      .getChartOfAccounts()
      .then((data: unknown) => {
        const list = Array.isArray(data) ? data : (data as any)?.accounts ?? [];
        setAccounts(list);
      })
      .catch(() => setAccounts([]))
      .finally(() => setAccountsLoading(false));
  }, []);

  // ── Voucher List ───────────────────────────────────────────────────────────
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listPage, setListPage] = useState(1);
  const [listTotal, setListTotal] = useState(0);

  // filters
  const [filterType, setFilterType] = useState<VoucherType | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<VoucherStatus | 'ALL'>('ALL');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const fetchVouchers = useCallback(async () => {
    setListLoading(true);
    try {
      const params: Record<string, string> = { page: String(listPage), limit: '20' };
      if (filterType !== 'ALL') params.voucherType = filterType;
      if (filterStatus !== 'ALL') params.status = filterStatus;
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;
      if (filterSearch) params.search = filterSearch;

      const res = await voucherApi.list(params);
      const items: Voucher[] = Array.isArray(res) ? res : (res as any)?.data ?? [];
      setVouchers(items);
      setListTotal((res as any)?.total ?? items.length);
    } catch {
      setVouchers([]);
    } finally {
      setListLoading(false);
    }
  }, [listPage, filterType, filterStatus, filterFrom, filterTo, filterSearch]);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  // ── Form State ─────────────────────────────────────────────────────────────
  type PanelMode = 'LIST_ONLY' | 'NEW' | 'VIEW';
  const [panelMode, setPanelMode] = useState<PanelMode>('LIST_ONLY');
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);

  const [vType, setVType] = useState<VoucherType>('JOURNAL');
  const [vDate, setVDate] = useState(today());
  const [vNarration, setVNarration] = useState('');
  const [vRef, setVRef] = useState('');
  const [lines, setLines] = useState<VoucherLine[]>([emptyLine(), emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [postingId, setPostingId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'post' | 'cancel';
    voucherId: string;
  }>({ open: false, type: 'post', voucherId: '' });

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totalDebit  = lines.reduce((s, l) => s + parseNum(l.debit), 0);
  const totalCredit = lines.reduce((s, l) => s + parseNum(l.credit), 0);
  const difference  = totalDebit - totalCredit;
  const isBalanced  = Math.abs(difference) < 0.005;

  // ── Open new form ──────────────────────────────────────────────────────────
  const openNew = () => {
    setSelectedVoucher(null);
    setVType('JOURNAL');
    setVDate(today());
    setVNarration('');
    setVRef('');
    setLines([emptyLine(), emptyLine()]);
    setPanelMode('NEW');
  };

  // ── Click row → view ───────────────────────────────────────────────────────
  const openView = (v: Voucher) => {
    setSelectedVoucher(v);
    setPanelMode('VIEW');
  };

  // ── Lines helpers ──────────────────────────────────────────────────────────
  const addLine = () => setLines((ls) => [...ls, emptyLine()]);
  const removeLine = (id: string) => setLines((ls) => ls.filter((l) => l.id !== id));
  const updateLine = (id: string, field: keyof VoucherLine, val: string) => {
    setLines((ls) =>
      ls.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: val };
        // auto-clear opposite
        if (field === 'debit' && val) updated.credit = '';
        if (field === 'credit' && val) updated.debit = '';
        return updated;
      }),
    );
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    // validation
    if (!vDate) return toast.error('Please select a date');
    if (!vNarration.trim()) return toast.error('Narration is required');
    const validLines = lines.filter((l) => l.accountId && (parseNum(l.debit) > 0 || parseNum(l.credit) > 0));
    if (validLines.length < 2) return toast.error('At least 2 valid lines required');
    if (vType === 'JOURNAL' && !isBalanced) return toast.error('Journal voucher must be balanced (Debit = Credit)');

    setSaving(true);
    try {
      const payload = {
        voucherType: vType,
        date: vDate,
        narration: vNarration,
        referenceNo: vRef || undefined,
        amount: totalDebit || totalCredit,
        lines: validLines.map(({ accountId, narration, debit, credit }) => ({
          accountId,
          narration,
          debit: parseNum(debit),
          credit: parseNum(credit),
        })),
      };
      const created = await voucherApi.create(payload);
      toast.success('Voucher saved as Draft');
      setVouchers((prev) => [created as Voucher, ...prev]);
      setPanelMode('VIEW');
      setSelectedVoucher(created as Voucher);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to create voucher');
    } finally {
      setSaving(false);
    }
  };

  // ── Post ───────────────────────────────────────────────────────────────────
  const handlePost = async (id: string) => {
    setPostingId(id);
    try {
      const updated = await voucherApi.post(id);
      toast.success('Voucher posted successfully');
      setVouchers((prev) => prev.map((v) => (v.id === id ? { ...v, status: 'POSTED' } : v)));
      if (selectedVoucher?.id === id)
        setSelectedVoucher((prev) => prev && { ...prev, status: 'POSTED' });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to post voucher');
    } finally {
      setPostingId(null);
      setConfirmDialog({ open: false, type: 'post', voucherId: '' });
    }
  };

  // ── Cancel ─────────────────────────────────────────────────────────────────
  const handleCancel = async (id: string) => {
    setCancelId(id);
    try {
      await voucherApi.cancel(id);
      toast.success('Voucher cancelled');
      setVouchers((prev) => prev.map((v) => (v.id === id ? { ...v, status: 'CANCELLED' } : v)));
      if (selectedVoucher?.id === id)
        setSelectedVoucher((prev) => prev && { ...prev, status: 'CANCELLED' });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to cancel voucher');
    } finally {
      setCancelId(null);
      setConfirmDialog({ open: false, type: 'cancel', voucherId: '' });
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Voucher Entry
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Tally-style accounting vouchers — Journal, Receipt, Payment, Contra
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            color: '#fff',
            boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
          }}
        >
          <Plus size={16} />
          New Voucher
        </button>
      </div>

      {/* Split layout */}
      <div className="flex gap-4 flex-1 min-h-0" style={{ height: 'calc(100vh - 180px)' }}>
        {/* LEFT: Voucher List */}
        <div
          className="flex flex-col gap-3"
          style={{ width: panelMode === 'LIST_ONLY' ? '100%' : '40%', minWidth: 340, flexShrink: 0 }}
        >
          {/* Filters */}
          <div className="glass-card p-3 flex flex-col gap-2">
            {/* Search */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <Search size={14} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
              <input
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="Search voucher no, narration…"
                className="flex-1 bg-transparent text-sm outline-none text-white placeholder:text-white/30"
              />
              {filterSearch && (
                <button onClick={() => setFilterSearch('')}>
                  <X size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
                </button>
              )}
            </div>

            {/* Type filter */}
            <div className="flex gap-1.5 flex-wrap">
              {(['ALL', 'JOURNAL', 'RECEIPT', 'PAYMENT', 'CONTRA'] as const).map((t) => {
                const cfg = t === 'ALL' ? null : VOUCHER_TYPES.find((vt) => vt.type === t);
                const active = filterType === t;
                return (
                  <button
                    key={t}
                    onClick={() => { setFilterType(t); setListPage(1); }}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: active ? (cfg ? `${cfg.color}22` : 'rgba(255,255,255,0.1)') : 'rgba(255,255,255,0.04)',
                      color: active ? (cfg ? cfg.color : '#fff') : 'rgba(255,255,255,0.4)',
                      border: `1px solid ${active ? (cfg ? `${cfg.color}44` : 'rgba(255,255,255,0.2)') : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    {t === 'ALL' ? 'All Types' : t.charAt(0) + t.slice(1).toLowerCase()}
                  </button>
                );
              })}
            </div>

            {/* Status filter + Date range */}
            <div className="flex gap-2 flex-wrap items-center">
              {(['ALL', 'DRAFT', 'POSTED', 'CANCELLED'] as const).map((s) => {
                const cfg = s === 'ALL' ? null : STATUS_CFG[s];
                const active = filterStatus === s;
                return (
                  <button
                    key={s}
                    onClick={() => { setFilterStatus(s); setListPage(1); }}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: active ? (cfg ? cfg.bg : 'rgba(255,255,255,0.1)') : 'rgba(255,255,255,0.03)',
                      color: active ? (cfg ? cfg.color : '#fff') : 'rgba(255,255,255,0.35)',
                      border: `1px solid ${active ? (cfg ? `${cfg.color}44` : 'rgba(255,255,255,0.15)') : 'rgba(255,255,255,0.05)'}`,
                    }}
                  >
                    {s === 'ALL' ? 'All Status' : cfg!.label}
                  </button>
                );
              })}
              <div className="flex items-center gap-1.5 ml-auto">
                <input
                  type="date"
                  value={filterFrom}
                  onChange={(e) => setFilterFrom(e.target.value)}
                  className="px-2 py-1 rounded-lg text-xs outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    color: 'rgba(255,255,255,0.6)',
                  }}
                />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>–</span>
                <input
                  type="date"
                  value={filterTo}
                  onChange={(e) => setFilterTo(e.target.value)}
                  className="px-2 py-1 rounded-lg text-xs outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    color: 'rgba(255,255,255,0.6)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="glass-card overflow-hidden flex flex-col flex-1 min-h-0">
            <div className="overflow-y-auto flex-1">
              <table className="w-full">
                <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                  <tr style={{ background: '#0a1220', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Voucher No', 'Type', 'Date', 'Narration', 'Amount', 'Status'].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider"
                        style={{ color: 'rgba(255,255,255,0.3)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {listLoading &&
                    [...Array(8)].map((_, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        {[...Array(6)].map((_, j) => (
                          <td key={j} className="px-3 py-2.5">
                            <Skeleton className="h-4" />
                          </td>
                        ))}
                      </tr>
                    ))}

                  {!listLoading && vouchers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center"
                            style={{ background: 'rgba(99,102,241,0.1)' }}
                          >
                            <BookOpen size={20} style={{ color: '#6366f1' }} />
                          </div>
                          <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            No vouchers found
                          </p>
                          <button
                            onClick={openNew}
                            className="text-xs px-3 py-1.5 rounded-lg"
                            style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}
                          >
                            Create your first voucher
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {!listLoading &&
                    vouchers.map((v) => {
                      const typeCfg = VOUCHER_TYPES.find((t) => t.type === v.voucherType)!;
                      const statusCfg = STATUS_CFG[v.status];
                      const isActive = selectedVoucher?.id === v.id && panelMode === 'VIEW';
                      return (
                        <motion.tr
                          key={v.id}
                          layout
                          onClick={() => openView(v)}
                          className="cursor-pointer transition-colors"
                          style={{
                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                            background: isActive ? 'rgba(99,102,241,0.08)' : 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.015)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                          }}
                        >
                          <td className="px-3 py-2.5">
                            <span className="text-xs font-mono" style={{ color: '#818cf8' }}>
                              {v.voucherNo ?? '—'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
                              style={{ background: `${typeCfg.color}18`, color: typeCfg.color }}
                            >
                              <typeCfg.icon size={10} />
                              {typeCfg.label}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                              {formatDate(v.date)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 max-w-[120px]">
                            <p className="text-xs text-white truncate">{v.narration}</p>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-xs font-mono font-medium" style={{ color: typeCfg.color }}>
                              {INR(v.amount)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
                              style={{ background: statusCfg.bg, color: statusCfg.color }}
                            >
                              <statusCfg.icon size={10} />
                              {statusCfg.label}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!listLoading && listTotal > 20 && (
              <div
                className="flex items-center justify-between px-4 py-2.5"
                style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
              >
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {listTotal} vouchers
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setListPage((p) => Math.max(1, p - 1))}
                    disabled={listPage === 1}
                    className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  >
                    <ChevronLeft size={13} style={{ color: 'rgba(255,255,255,0.5)' }} />
                  </button>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {listPage} / {Math.ceil(listTotal / 20)}
                  </span>
                  <button
                    onClick={() => setListPage((p) => p + 1)}
                    disabled={listPage >= Math.ceil(listTotal / 20)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  >
                    <ChevronRight size={13} style={{ color: 'rgba(255,255,255,0.5)' }} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Form or View */}
        <AnimatePresence mode="wait">
          {panelMode !== 'LIST_ONLY' && (
            <motion.div
              key={panelMode === 'NEW' ? 'new' : selectedVoucher?.id ?? 'view'}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.18 }}
              className="glass-card flex flex-col overflow-hidden flex-1 min-w-0"
            >
              {/* Panel header */}
              <div
                className="flex items-center justify-between px-5 py-3.5"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center gap-2.5">
                  {panelMode === 'NEW' ? (
                    <>
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
                      >
                        <Plus size={14} />
                      </div>
                      <span className="font-semibold text-sm text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                        New Voucher
                      </span>
                    </>
                  ) : selectedVoucher ? (
                    <>
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{
                          background: `${VOUCHER_TYPES.find((t) => t.type === selectedVoucher.voucherType)?.color ?? '#6366f1'}18`,
                          color: VOUCHER_TYPES.find((t) => t.type === selectedVoucher.voucherType)?.color ?? '#818cf8',
                        }}
                      >
                        <FileText size={14} />
                      </div>
                      <span className="font-semibold text-sm text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                        {selectedVoucher.voucherNo ?? 'Voucher'}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
                        style={{
                          background: STATUS_CFG[selectedVoucher.status].bg,
                          color: STATUS_CFG[selectedVoucher.status].color,
                        }}
                      >
                        {(() => { const Ic = STATUS_CFG[selectedVoucher.status].icon; return <Ic size={10} />; })()}
                        {STATUS_CFG[selectedVoucher.status].label}
                      </span>
                    </>
                  ) : null}
                </div>
                <button
                  onClick={() => setPanelMode('LIST_ONLY')}
                  className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Panel content */}
              <div className="flex-1 overflow-y-auto p-5">
                {panelMode === 'NEW' ? (
                  <VoucherForm
                    vType={vType}
                    setVType={setVType}
                    vDate={vDate}
                    setVDate={setVDate}
                    vNarration={vNarration}
                    setVNarration={setVNarration}
                    vRef={vRef}
                    setVRef={setVRef}
                    lines={lines}
                    addLine={addLine}
                    removeLine={removeLine}
                    updateLine={updateLine}
                    totalDebit={totalDebit}
                    totalCredit={totalCredit}
                    difference={difference}
                    isBalanced={isBalanced}
                    accounts={accounts}
                    accountsLoading={accountsLoading}
                    saving={saving}
                    onSubmit={handleSubmit}
                    onCancel={() => setPanelMode('LIST_ONLY')}
                  />
                ) : selectedVoucher ? (
                  <VoucherDetail
                    voucher={selectedVoucher}
                    accounts={accounts}
                    postingId={postingId}
                    cancelId={cancelId}
                    onPost={() =>
                      setConfirmDialog({ open: true, type: 'post', voucherId: selectedVoucher.id })
                    }
                    onCancel={() =>
                      setConfirmDialog({ open: true, type: 'cancel', voucherId: selectedVoucher.id })
                    }
                  />
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.type === 'post' ? 'Post Voucher' : 'Cancel Voucher'}
        message={
          confirmDialog.type === 'post'
            ? 'This will post the voucher and create accounting entries. This action cannot be undone.'
            : 'This will permanently cancel the voucher. Are you sure?'
        }
        confirmLabel={confirmDialog.type === 'post' ? 'Post Voucher' : 'Cancel Voucher'}
        confirmColor={confirmDialog.type === 'post' ? '#10b981' : '#f43f5e'}
        onConfirm={() => {
          if (confirmDialog.type === 'post') handlePost(confirmDialog.voucherId);
          else handleCancel(confirmDialog.voucherId);
        }}
        onCancel={() => setConfirmDialog({ open: false, type: 'post', voucherId: '' })}
      />
    </div>
  );
}

// ── Voucher Form ──────────────────────────────────────────────────────────────

function VoucherForm({
  vType, setVType,
  vDate, setVDate,
  vNarration, setVNarration,
  vRef, setVRef,
  lines, addLine, removeLine, updateLine,
  totalDebit, totalCredit, difference, isBalanced,
  accounts, accountsLoading,
  saving, onSubmit, onCancel,
}: {
  vType: VoucherType; setVType: (t: VoucherType) => void;
  vDate: string; setVDate: (d: string) => void;
  vNarration: string; setVNarration: (s: string) => void;
  vRef: string; setVRef: (s: string) => void;
  lines: VoucherLine[];
  addLine: () => void;
  removeLine: (id: string) => void;
  updateLine: (id: string, field: keyof VoucherLine, val: string) => void;
  totalDebit: number; totalCredit: number; difference: number; isBalanced: boolean;
  accounts: Account[]; accountsLoading: boolean;
  saving: boolean; onSubmit: () => void; onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {/* Voucher Type Tabs */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Voucher Type
        </p>
        <div className="grid grid-cols-4 gap-2">
          {VOUCHER_TYPES.map(({ type, label, icon: Icon, color, desc }) => {
            const active = vType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setVType(type)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all text-center"
                style={{
                  background: active ? `${color}18` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? `${color}44` : 'rgba(255,255,255,0.06)'}`,
                  boxShadow: active ? `0 0 16px ${color}18` : 'none',
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: active ? `${color}22` : 'rgba(255,255,255,0.05)', color: active ? color : 'rgba(255,255,255,0.35)' }}
                >
                  <Icon size={16} />
                </div>
                <span
                  className="text-xs font-semibold"
                  style={{ color: active ? color : 'rgba(255,255,255,0.45)' }}
                >
                  {label}
                </span>
                <span className="text-xs leading-tight" style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>
                  {desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Date / Ref / Narration */}
      <div className="grid grid-cols-2 gap-3">
        {/* Date */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <CalendarDays size={11} className="inline mr-1" />Date *
          </label>
          <input
            type="date"
            value={vDate}
            onChange={(e) => setVDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.8)',
            }}
          />
        </div>
        {/* Ref No */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <Hash size={11} className="inline mr-1" />Reference No
          </label>
          <input
            type="text"
            value={vRef}
            onChange={(e) => setVRef(e.target.value)}
            placeholder="e.g. INV-2024-001"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none placeholder:text-white/20"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.8)',
            }}
          />
        </div>
      </div>

      {/* Narration */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <AlignLeft size={11} className="inline mr-1" />Narration *
        </label>
        <input
          type="text"
          value={vNarration}
          onChange={(e) => setVNarration(e.target.value)}
          placeholder="Being amount…"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none placeholder:text-white/20"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.8)',
          }}
        />
      </div>

      {/* Debit / Credit Lines */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Ledger Lines
          </p>
          <button
            type="button"
            onClick={addLine}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
            style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}
          >
            <Plus size={11} /> Add Line
          </button>
        </div>

        {/* Lines table */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* Header */}
          <div
            className="grid text-xs font-semibold uppercase tracking-wider px-3 py-2"
            style={{
              gridTemplateColumns: '1fr 120px 90px 90px 32px',
              background: 'rgba(255,255,255,0.03)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.3)',
            }}
          >
            <span>Account</span>
            <span>Narration</span>
            <span className="text-right">Debit (Dr)</span>
            <span className="text-right">Credit (Cr)</span>
            <span />
          </div>

          {/* Rows */}
          <AnimatePresence>
            {lines.map((line, idx) => (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="grid items-center gap-2 px-3 py-2"
                style={{
                  gridTemplateColumns: '1fr 120px 90px 90px 32px',
                  borderBottom: idx < lines.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}
              >
                {/* Account */}
                <AccountSelect
                  accounts={accounts}
                  value={line.accountId}
                  onChange={(id) => updateLine(line.id, 'accountId', id)}
                />
                {/* Narration */}
                <input
                  value={line.narration}
                  onChange={(e) => updateLine(line.id, 'narration', e.target.value)}
                  placeholder="Narration…"
                  className="w-full px-2 py-1.5 rounded-lg text-xs outline-none placeholder:text-white/20"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.75)',
                  }}
                />
                {/* Debit */}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.debit}
                  onChange={(e) => updateLine(line.id, 'debit', e.target.value)}
                  placeholder="0.00"
                  className="w-full px-2 py-1.5 rounded-lg text-xs text-right outline-none placeholder:text-white/15"
                  style={{
                    background: line.debit ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${line.debit ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    color: line.debit ? '#818cf8' : 'rgba(255,255,255,0.4)',
                  }}
                />
                {/* Credit */}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.credit}
                  onChange={(e) => updateLine(line.id, 'credit', e.target.value)}
                  placeholder="0.00"
                  className="w-full px-2 py-1.5 rounded-lg text-xs text-right outline-none placeholder:text-white/15"
                  style={{
                    background: line.credit ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${line.credit ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    color: line.credit ? '#10b981' : 'rgba(255,255,255,0.4)',
                  }}
                />
                {/* Delete */}
                <button
                  type="button"
                  onClick={() => removeLine(line.id)}
                  disabled={lines.length <= 2}
                  className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors disabled:opacity-20"
                  style={{ background: 'rgba(244,63,94,0.08)', color: '#f43f5e' }}
                >
                  <Trash2 size={12} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Totals row */}
          <div
            className="grid items-center px-3 py-2.5"
            style={{
              gridTemplateColumns: '1fr 120px 90px 90px 32px',
              borderTop: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Total
            </span>
            <span />
            <span className="text-right text-xs font-mono font-semibold" style={{ color: '#818cf8' }}>
              {INR(totalDebit)}
            </span>
            <span className="text-right text-xs font-mono font-semibold" style={{ color: '#10b981' }}>
              {INR(totalCredit)}
            </span>
            <span />
          </div>
        </div>

        {/* Balance indicator */}
        <motion.div
          animate={{ opacity: 1 }}
          className="mt-3 flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
          style={{
            background: isBalanced ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)',
            border: `1px solid ${isBalanced ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`,
          }}
        >
          <Scale size={15} style={{ color: isBalanced ? '#10b981' : '#f43f5e', flexShrink: 0 }} />
          <div className="flex-1">
            <p className="text-xs font-semibold" style={{ color: isBalanced ? '#10b981' : '#f43f5e' }}>
              {isBalanced ? 'Balanced — Ready to post' : 'Unbalanced'}
            </p>
            {!isBalanced && (
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Difference: {INR(Math.abs(difference))} {difference > 0 ? '(Debit excess)' : '(Credit excess)'}
              </p>
            )}
          </div>
          {isBalanced && <CheckCircle2 size={15} style={{ color: '#10b981' }} />}
          {!isBalanced && <AlertCircle size={15} style={{ color: '#f43f5e' }} />}
        </motion.div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}
        >
          Discard
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            color: '#fff',
            boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
          }}
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          {saving ? 'Saving…' : 'Save as Draft'}
        </button>
      </div>
    </div>
  );
}

// ── Voucher Detail (View Mode) ─────────────────────────────────────────────────

function VoucherDetail({
  voucher,
  accounts,
  postingId,
  cancelId,
  onPost,
  onCancel,
}: {
  voucher: Voucher;
  accounts: Account[];
  postingId: string | null;
  cancelId: string | null;
  onPost: () => void;
  onCancel: () => void;
}) {
  const typeCfg = VOUCHER_TYPES.find((t) => t.type === voucher.voucherType)!;
  const statusCfg = STATUS_CFG[voucher.status];

  const viewLines: VoucherLine[] = Array.isArray(voucher.lines) ? voucher.lines : [];
  const totalDebit = viewLines.reduce((s, l) => s + parseNum(l.debit), 0);
  const totalCredit = viewLines.reduce((s, l) => s + parseNum(l.credit), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.005;

  const getAccountName = (id: string) =>
    accounts.find((a) => a.id === id)?.name ?? id;

  return (
    <div className="flex flex-col gap-5">
      {/* Meta */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="p-3 rounded-xl"
          style={{ background: `${typeCfg.color}10`, border: `1px solid ${typeCfg.color}22` }}
        >
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Type</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <typeCfg.icon size={13} style={{ color: typeCfg.color }} />
            <p className="text-sm font-semibold" style={{ color: typeCfg.color }}>
              {typeCfg.label}
            </p>
          </div>
        </div>
        <div
          className="p-3 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Date</p>
          <p className="text-sm font-semibold text-white mt-0.5">{formatDate(voucher.date)}</p>
        </div>
        <div
          className="p-3 rounded-xl col-span-2"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Narration</p>
          <p className="text-sm text-white mt-0.5">{voucher.narration || '—'}</p>
        </div>
        {voucher.referenceNo && (
          <div
            className="p-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Reference No</p>
            <p className="text-sm font-mono text-white mt-0.5">{voucher.referenceNo}</p>
          </div>
        )}
        <div
          className="p-3 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Amount</p>
          <p className="text-sm font-mono font-bold mt-0.5" style={{ color: typeCfg.color }}>
            {INR(voucher.amount)}
          </p>
        </div>
      </div>

      {/* Lines Table */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Ledger Entries
        </p>
        {viewLines.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
            No line items on record
          </p>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <div
              className="grid text-xs font-semibold uppercase tracking-wider px-3 py-2"
              style={{
                gridTemplateColumns: '2fr 1fr 1fr 1fr',
                background: 'rgba(255,255,255,0.03)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.3)',
              }}
            >
              <span>Account</span>
              <span>Narration</span>
              <span className="text-right">Debit</span>
              <span className="text-right">Credit</span>
            </div>
            {viewLines.map((line, idx) => (
              <div
                key={line.id ?? idx}
                className="grid items-center px-3 py-2 gap-2"
                style={{
                  gridTemplateColumns: '2fr 1fr 1fr 1fr',
                  borderBottom: idx < viewLines.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}
              >
                <p className="text-sm text-white truncate">{getAccountName(line.accountId)}</p>
                <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {line.narration || '—'}
                </p>
                <p className="text-right text-xs font-mono" style={{ color: parseNum(line.debit) > 0 ? '#818cf8' : 'rgba(255,255,255,0.2)' }}>
                  {parseNum(line.debit) > 0 ? INR(parseNum(line.debit)) : '—'}
                </p>
                <p className="text-right text-xs font-mono" style={{ color: parseNum(line.credit) > 0 ? '#10b981' : 'rgba(255,255,255,0.2)' }}>
                  {parseNum(line.credit) > 0 ? INR(parseNum(line.credit)) : '—'}
                </p>
              </div>
            ))}
            {/* Totals */}
            <div
              className="grid items-center px-3 py-2.5"
              style={{
                gridTemplateColumns: '2fr 1fr 1fr 1fr',
                borderTop: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <span className="text-xs font-semibold uppercase tracking-wider col-span-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Total
              </span>
              <span className="text-right text-xs font-mono font-semibold" style={{ color: '#818cf8' }}>
                {INR(totalDebit)}
              </span>
              <span className="text-right text-xs font-mono font-semibold" style={{ color: '#10b981' }}>
                {INR(totalCredit)}
              </span>
            </div>
          </div>
        )}

        {/* Balance badge */}
        {viewLines.length > 0 && (
          <div
            className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
            style={{
              background: isBalanced ? 'rgba(16,185,129,0.06)' : 'rgba(244,63,94,0.06)',
              border: `1px solid ${isBalanced ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)'}`,
              color: isBalanced ? '#10b981' : '#f43f5e',
            }}
          >
            <Scale size={12} />
            {isBalanced ? 'Balanced' : `Difference: ${INR(Math.abs(totalDebit - totalCredit))}`}
          </div>
        )}
      </div>

      {/* Actions */}
      {voucher.status === 'DRAFT' && (
        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            disabled={cancelId === voucher.id}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-60 flex-1"
            style={{
              background: 'rgba(244,63,94,0.08)',
              color: '#f43f5e',
              border: '1px solid rgba(244,63,94,0.2)',
            }}
          >
            {cancelId === voucher.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
            Cancel Voucher
          </button>
          <button
            onClick={onPost}
            disabled={postingId === voucher.id}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 flex-1"
            style={{
              background: 'linear-gradient(135deg, #059669, #10b981)',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
            }}
          >
            {postingId === voucher.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {postingId === voucher.id ? 'Posting…' : 'Post Voucher'}
          </button>
        </div>
      )}

      {voucher.status === 'POSTED' && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', color: '#10b981' }}
        >
          <CheckCircle2 size={15} />
          <span className="font-medium">Posted — Accounting entries are locked</span>
        </div>
      )}

      {voucher.status === 'CANCELLED' && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)', color: '#f43f5e' }}
        >
          <XCircle size={15} />
          <span className="font-medium">Cancelled — This voucher is void</span>
        </div>
      )}
    </div>
  );
}
