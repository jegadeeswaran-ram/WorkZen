'use client';

import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Landmark, CreditCard, CheckCircle2, Clock, AlertCircle,
  TrendingUp, TrendingDown, Upload, ChevronDown, ChevronUp,
  RefreshCw, FileText, Check, X, Filter, ArrowLeftRight,
  Info, Hash, BarChart3,
} from 'lucide-react';
import { bankingApi } from '@/lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INR = (v: number | string) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(v) || 0);

const fmtDate = (d: string) =>
  d
    ? new Date(d + (d.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
      })
    : '—';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BankAccount {
  id: string;
  name: string;
  code?: string;
  type?: string;
  currentBalance?: number | string;
}

interface BankStatementLine {
  id: string;
  date: string;
  description: string;
  debit?: number | string;
  credit?: number | string;
  balance?: number | string;
  referenceNo?: string;
  isReconciled?: boolean;
  voucherId?: string;
  reconcileNote?: string;
}

interface ReconciliationSummary {
  bankAccount?: BankAccount;
  bookBalance?: number | string;
  totalLines?: number;
  reconciledLines?: number;
  unreconciledLines?: number;
  unreconciledCredit?: number | string;
  unreconciledDebit?: number | string;
}

type LineFilter = 'all' | 'unreconciled' | 'reconciled';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className ?? ''}`}
      style={{ background: 'rgba(255,255,255,0.06)' }}
    />
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
  loading,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
  sub?: string;
}) {
  return (
    <div
      className="flex-1 min-w-[140px] p-4 rounded-xl"
      style={{ background: `${color}0d`, border: `1px solid ${color}22` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18`, color }}
        >
          <Icon size={13} />
        </div>
        <p
          className="text-xs font-semibold uppercase tracking-wider truncate"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          {label}
        </p>
      </div>
      {loading ? (
        <Skeleton className="h-7 w-28 mt-1" />
      ) : (
        <>
          <p
            className="text-xl font-bold"
            style={{ color, fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            {value}
          </p>
          {sub && (
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {sub}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─── Reconcile Inline Form ────────────────────────────────────────────────────

function ReconcileForm({
  lineId,
  onDone,
  onCancel,
}: {
  lineId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [voucherId, setVoucherId] = useState('');
  const [note, setNote] = useState('');
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => bankingApi.reconcileLine(lineId, voucherId, note || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banking-unreconciled'] });
      qc.invalidateQueries({ queryKey: ['banking-summary'] });
      onDone();
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div
        className="px-4 py-3 flex flex-wrap items-end gap-3"
        style={{
          background: 'rgba(99,102,241,0.06)',
          borderTop: '1px solid rgba(99,102,241,0.15)',
        }}
      >
        <div className="flex-1 min-w-[160px]">
          <label
            className="block text-xs font-semibold mb-1"
            style={{ color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            Voucher No *
          </label>
          <input
            type="text"
            placeholder="e.g. PMT-0042"
            value={voucherId}
            onChange={(e) => setVoucherId(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(99,102,241,0.3)',
              color: 'rgba(255,255,255,0.85)',
            }}
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label
            className="block text-xs font-semibold mb-1"
            style={{ color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            Note
          </label>
          <input
            type="text"
            placeholder="Optional note…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.85)',
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => mutation.mutate()}
            disabled={!voucherId.trim() || mutation.isPending}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all active:scale-95 disabled:opacity-40"
            style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}
          >
            {mutation.isPending ? (
              <RefreshCw size={12} className="animate-spin" />
            ) : (
              <Check size={12} />
            )}
            Confirm
          </button>
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <X size={12} />
            Cancel
          </button>
        </div>
        {mutation.isError && (
          <p className="w-full text-xs" style={{ color: '#f43f5e' }}>
            Failed to reconcile. Please try again.
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─── CSV Import Panel ─────────────────────────────────────────────────────────

function ImportPanel({
  accountId,
  onClose,
}: {
  accountId: string;
  onClose: () => void;
}) {
  const [csv, setCsv]             = useState('');
  const [preview, setPreview]     = useState<Array<Record<string, string>>>([]);
  const [parseError, setParseError] = useState('');
  const qc                        = useQueryClient();

  const parseCsv = useCallback(() => {
    setParseError('');
    try {
      const lines = csv
        .trim()
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length === 0) {
        setParseError('No data found.');
        return;
      }

      const rows = lines.map((line) => {
        // simple CSV split — handles quoted commas roughly
        const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
        return {
          date:        parts[0] ?? '',
          description: parts[1] ?? '',
          debit:       parts[2] ?? '',
          credit:      parts[3] ?? '',
          balance:     parts[4] ?? '',
        };
      });

      // Skip header row if first row looks like headers
      const first = rows[0];
      if (
        isNaN(Number(first.debit)) &&
        isNaN(Number(first.credit)) &&
        first.date.toLowerCase().includes('date')
      ) {
        setPreview(rows.slice(1));
      } else {
        setPreview(rows);
      }
    } catch {
      setParseError('Failed to parse CSV. Please check the format.');
    }
  }, [csv]);

  const importMutation = useMutation({
    mutationFn: () =>
      bankingApi.importStatement(
        accountId,
        preview.map((r) => ({
          date:        r.date,
          description: r.description,
          debit:       Number(r.debit) || 0,
          credit:      Number(r.credit) || 0,
          balance:     Number(r.balance) || 0,
        })),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banking-unreconciled'] });
      qc.invalidateQueries({ queryKey: ['banking-summary'] });
      setCsv('');
      setPreview([]);
      onClose();
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden"
    >
      <div
        className="p-5 rounded-2xl space-y-4"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Instructions */}
        <div
          className="flex items-start gap-3 p-3 rounded-xl"
          style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}
        >
          <Info size={14} style={{ color: '#818cf8', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className="text-xs font-semibold" style={{ color: '#818cf8' }}>
              CSV Format
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Paste data with columns:{' '}
              <span className="font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>
                date, description, debit, credit, balance
              </span>
              . Header row is optional.
            </p>
          </div>
        </div>

        {/* Textarea */}
        <div>
          <label
            className="block text-xs font-semibold mb-1.5"
            style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            Paste CSV Data
          </label>
          <textarea
            rows={6}
            placeholder={`2024-01-15, NEFT Credit - ABC Corp, 0, 50000, 150000\n2024-01-16, Vendor Payment - XYZ Ltd, 25000, 0, 125000`}
            value={csv}
            onChange={(e) => { setCsv(e.target.value); setPreview([]); setParseError(''); }}
            className="w-full px-3 py-2.5 rounded-xl text-sm font-mono outline-none resize-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.8)',
            }}
          />
          {parseError && (
            <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>
              {parseError}
            </p>
          )}
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-3">
          <button
            onClick={parseCsv}
            disabled={!csv.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-40"
            style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}
          >
            <FileText size={13} />
            Parse & Preview
          </button>
          {preview.length > 0 && (
            <button
              onClick={() => importMutation.mutate()}
              disabled={importMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}
            >
              {importMutation.isPending ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Upload size={13} />
              )}
              Import {preview.length} Lines
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <X size={13} />
            Close
          </button>
        </div>

        {/* Import result */}
        {importMutation.isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 rounded-xl"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
          >
            <CheckCircle2 size={14} style={{ color: '#10b981' }} />
            <p className="text-sm" style={{ color: '#10b981' }}>
              Statement imported successfully.
            </p>
          </motion.div>
        )}

        {/* Preview table */}
        {preview.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div
              className="grid text-xs font-semibold uppercase tracking-wider px-4 py-2.5"
              style={{
                gridTemplateColumns: '90px 1fr 90px 90px 100px',
                background: 'rgba(255,255,255,0.03)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.3)',
              }}
            >
              <span>Date</span>
              <span>Description</span>
              <span className="text-right">Debit</span>
              <span className="text-right">Credit</span>
              <span className="text-right">Balance</span>
            </div>
            {preview.slice(0, 10).map((row, i) => (
              <div
                key={i}
                className="grid items-center px-4 py-2"
                style={{
                  gridTemplateColumns: '90px 1fr 90px 90px 100px',
                  borderBottom: i < Math.min(preview.length, 10) - 1 ? '1px solid rgba(255,255,255,0.03)' : undefined,
                }}
              >
                <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {row.date}
                </p>
                <p className="text-sm truncate pr-4" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {row.description}
                </p>
                <p className="text-sm text-right" style={{ color: Number(row.debit) > 0 ? '#f43f5e' : 'rgba(255,255,255,0.2)' }}>
                  {Number(row.debit) > 0 ? INR(Number(row.debit)) : '—'}
                </p>
                <p className="text-sm text-right" style={{ color: Number(row.credit) > 0 ? '#10b981' : 'rgba(255,255,255,0.2)' }}>
                  {Number(row.credit) > 0 ? INR(Number(row.credit)) : '—'}
                </p>
                <p className="text-sm text-right" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {row.balance ? INR(Number(row.balance)) : '—'}
                </p>
              </div>
            ))}
            {preview.length > 10 && (
              <div
                className="px-4 py-2 text-center text-xs"
                style={{ background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.3)' }}
              >
                + {preview.length - 10} more rows
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Lines Table ──────────────────────────────────────────────────────────────

function LinesTable({
  accountId,
  filter,
}: {
  accountId: string;
  filter: LineFilter;
}) {
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);

  const params: Record<string, string> = {};
  if (filter === 'unreconciled') params.reconciled = 'false';
  if (filter === 'reconciled')   params.reconciled = 'true';

  const { data: raw, isLoading } = useQuery({
    queryKey: ['banking-unreconciled', accountId, filter],
    queryFn:  () => bankingApi.getUnreconciled(accountId, params),
    enabled:  !!accountId,
  });

  const lines: BankStatementLine[] = Array.isArray(raw)
    ? raw
    : (raw as any)?.data ?? [];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Table Header */}
      <div
        className="grid text-xs font-semibold uppercase tracking-wider px-4 py-3"
        style={{
          gridTemplateColumns: '90px 1fr 110px 90px 90px 100px 140px',
          background: 'rgba(255,255,255,0.03)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          color: 'rgba(255,255,255,0.3)',
        }}
      >
        <span>Date</span>
        <span>Description</span>
        <span>Reference No</span>
        <span className="text-right">Debit (₹)</span>
        <span className="text-right">Credit (₹)</span>
        <span className="text-right">Bank Balance</span>
        <span className="text-right">Actions</span>
      </div>

      {/* Skeleton rows */}
      {isLoading &&
        [...Array(7)].map((_, i) => (
          <div
            key={i}
            className="grid items-center gap-4 px-4 py-3"
            style={{
              gridTemplateColumns: '90px 1fr 110px 90px 90px 100px 140px',
              borderBottom: '1px solid rgba(255,255,255,0.03)',
            }}
          >
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-full max-w-xs" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16 ml-auto" />
            <Skeleton className="h-4 w-16 ml-auto" />
            <Skeleton className="h-4 w-20 ml-auto" />
            <Skeleton className="h-7 w-24 ml-auto rounded-lg" />
          </div>
        ))}

      {/* Empty state */}
      {!isLoading && lines.length === 0 && (
        <div className="py-16 text-center">
          <ArrowLeftRight size={28} style={{ color: 'rgba(255,255,255,0.1)', margin: '0 auto 8px' }} />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            No{filter !== 'all' ? ` ${filter}` : ''} statement lines found
          </p>
        </div>
      )}

      {/* Rows */}
      {!isLoading &&
        lines.map((line, idx) => {
          const isReconciled = !!line.isReconciled;
          const isReconciling = reconcilingId === line.id;
          return (
            <motion.div
              key={line.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.025 }}
              style={{
                background: isReconciled ? 'rgba(16,185,129,0.04)' : undefined,
                borderBottom: '1px solid rgba(255,255,255,0.03)',
              }}
            >
              {/* Main row */}
              <div
                className="grid items-center px-4 py-3 hover:bg-white/[0.015] transition-colors"
                style={{ gridTemplateColumns: '90px 1fr 110px 90px 90px 100px 140px' }}
              >
                <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {fmtDate(line.date)}
                </p>

                <div className="min-w-0 pr-4">
                  <p className="text-sm truncate" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    {line.description}
                  </p>
                  {line.reconcileNote && (
                    <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {line.reconcileNote}
                    </p>
                  )}
                </div>

                <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {line.referenceNo ?? '—'}
                </p>

                <p
                  className="text-sm font-medium text-right"
                  style={{ color: Number(line.debit) > 0 ? '#f43f5e' : 'rgba(255,255,255,0.2)' }}
                >
                  {Number(line.debit) > 0 ? INR(Number(line.debit)) : '—'}
                </p>

                <p
                  className="text-sm font-medium text-right"
                  style={{ color: Number(line.credit) > 0 ? '#10b981' : 'rgba(255,255,255,0.2)' }}
                >
                  {Number(line.credit) > 0 ? INR(Number(line.credit)) : '—'}
                </p>

                <p className="text-sm text-right" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {line.balance != null ? INR(Number(line.balance)) : '—'}
                </p>

                <div className="flex items-center justify-end">
                  {isReconciled ? (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}
                    >
                      <CheckCircle2 size={11} />
                      Reconciled
                    </span>
                  ) : (
                    <button
                      onClick={() =>
                        setReconcilingId(isReconciling ? null : line.id)
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95"
                      style={{
                        background: isReconciling
                          ? 'rgba(99,102,241,0.2)'
                          : 'rgba(255,255,255,0.05)',
                        color: isReconciling ? '#818cf8' : 'rgba(255,255,255,0.5)',
                        border: `1px solid ${isReconciling ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.1)'}`,
                      }}
                    >
                      <ArrowLeftRight size={11} />
                      Reconcile
                    </button>
                  )}
                </div>
              </div>

              {/* Inline reconcile form */}
              <AnimatePresence>
                {isReconciling && !isReconciled && (
                  <ReconcileForm
                    lineId={line.id}
                    onDone={() => setReconcilingId(null)}
                    onCancel={() => setReconcilingId(null)}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BankingPage() {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [lineFilter, setLineFilter]               = useState<LineFilter>('all');
  const [importOpen, setImportOpen]               = useState(false);

  // ── Fetch bank accounts ──────────────────────────────────────────────────
  const { data: accountsRaw, isLoading: accountsLoading } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn:  bankingApi.getBankAccounts,
  });

  const accounts: BankAccount[] = Array.isArray(accountsRaw)
    ? accountsRaw
    : (accountsRaw as any)?.accounts ?? [];

  // Auto-select first account
  const effectiveAccountId =
    selectedAccountId ?? accounts[0]?.id ?? null;

  // ── Fetch reconciliation summary ─────────────────────────────────────────
  const { data: summaryRaw, isLoading: summaryLoading } = useQuery({
    queryKey: ['banking-summary', effectiveAccountId],
    queryFn:  () => bankingApi.getReconciliationSummary(effectiveAccountId!),
    enabled:  !!effectiveAccountId,
  });

  const summary: ReconciliationSummary = (summaryRaw as any) ?? {};
  const unreconciledCount = Number(summary.unreconciledLines ?? 0);
  const isReconciled      = !summaryLoading && unreconciledCount === 0 && !!effectiveAccountId;

  const selectedAccount = accounts.find((a) => a.id === effectiveAccountId);

  // Filter buttons
  const FILTERS: { id: LineFilter; label: string }[] = [
    { id: 'all',           label: 'All Lines' },
    { id: 'unreconciled',  label: 'Unreconciled' },
    { id: 'reconciled',    label: 'Reconciled' },
  ];

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
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
            Bank Reconciliation
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Match bank statement lines with accounting vouchers
          </p>
        </div>

        <div
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
          style={{
            background: 'rgba(16,185,129,0.08)',
            color: 'rgba(16,185,129,0.7)',
            border: '1px solid rgba(16,185,129,0.15)',
          }}
        >
          <Landmark size={12} />
          Banking Module
        </div>
      </motion.div>

      {/* ── Account Selector ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
      >
        {accountsLoading ? (
          <div className="flex gap-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 flex-1 rounded-2xl" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div
            className="rounded-2xl py-20 flex flex-col items-center gap-3"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}
          >
            <Landmark size={32} style={{ color: 'rgba(255,255,255,0.1)' }} />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
              No bank accounts configured
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {accounts.map((account) => {
              const isActive = account.id === effectiveAccountId;
              return (
                <button
                  key={account.id}
                  onClick={() => {
                    setSelectedAccountId(account.id);
                    setImportOpen(false);
                    setLineFilter('all');
                  }}
                  className="relative flex-1 min-w-[200px] max-w-xs text-left p-4 rounded-2xl transition-all duration-200"
                  style={{
                    background: isActive
                      ? 'rgba(99,102,241,0.12)'
                      : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isActive ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.07)'}`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{
                        background: isActive ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)',
                        color: isActive ? '#818cf8' : 'rgba(255,255,255,0.4)',
                      }}
                    >
                      <CreditCard size={13} />
                    </div>
                    {account.code && (
                      <span
                        className="text-xs font-mono px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}
                      >
                        {account.code}
                      </span>
                    )}
                    {isActive && (
                      <motion.span
                        layoutId="account-active-dot"
                        className="ml-auto w-2 h-2 rounded-full"
                        style={{ background: '#818cf8' }}
                      />
                    )}
                  </div>
                  <p
                    className="text-sm font-semibold truncate"
                    style={{
                      color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                      fontFamily: 'Plus Jakarta Sans, sans-serif',
                    }}
                  >
                    {account.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Book Balance:{' '}
                    <span
                      style={{ color: isActive ? '#818cf8' : 'rgba(255,255,255,0.55)' }}
                    >
                      {INR(Number(account.currentBalance ?? 0))}
                    </span>
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ── Content (only when an account is selected) ───────────────────── */}
      <AnimatePresence mode="wait">
        {effectiveAccountId && (
          <motion.div
            key={effectiveAccountId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="space-y-5"
          >
            {/* ── Summary Cards ────────────────────────────────────────── */}
            <div className="flex flex-wrap gap-3">
              <SummaryCard
                label="Book Balance"
                value={INR(Number(summary.bookBalance ?? selectedAccount?.currentBalance ?? 0))}
                icon={BarChart3}
                color="#818cf8"
                loading={summaryLoading}
                sub="Accounting records"
              />
              <SummaryCard
                label="Total Lines"
                value={String(summary.totalLines ?? 0)}
                icon={Hash}
                color="#94a3b8"
                loading={summaryLoading}
                sub="Statement entries"
              />
              <SummaryCard
                label="Reconciled"
                value={String(summary.reconciledLines ?? 0)}
                icon={CheckCircle2}
                color="#10b981"
                loading={summaryLoading}
                sub="Matched entries"
              />
              <SummaryCard
                label="Unreconciled Debit"
                value={INR(Number(summary.unreconciledDebit ?? 0))}
                icon={TrendingDown}
                color="#f43f5e"
                loading={summaryLoading}
                sub="Pending payments"
              />
              <SummaryCard
                label="Unreconciled Credit"
                value={INR(Number(summary.unreconciledCredit ?? 0))}
                icon={TrendingUp}
                color="#f59e0b"
                loading={summaryLoading}
                sub="Pending receipts"
              />

              {/* Reconciliation Status Badge */}
              {!summaryLoading && (
                <div
                  className="flex-1 min-w-[140px] p-4 rounded-xl flex flex-col justify-between"
                  style={{
                    background: isReconciled
                      ? 'rgba(16,185,129,0.06)'
                      : 'rgba(245,158,11,0.06)',
                    border: `1px solid ${isReconciled ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
                  }}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                  >
                    Status
                  </p>
                  <div
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg self-start"
                    style={{
                      background: isReconciled
                        ? 'rgba(16,185,129,0.15)'
                        : 'rgba(245,158,11,0.15)',
                      color: isReconciled ? '#10b981' : '#f59e0b',
                    }}
                  >
                    {isReconciled ? (
                      <CheckCircle2 size={13} />
                    ) : (
                      <Clock size={13} />
                    )}
                    <span className="text-sm font-bold">
                      {isReconciled
                        ? 'Reconciled'
                        : `Pending (${unreconciledCount} items)`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ── Import Section ───────────────────────────────────────── */}
            <div>
              <button
                onClick={() => setImportOpen((v) => !v)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
                style={{
                  background: importOpen ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                  color: importOpen ? '#818cf8' : 'rgba(255,255,255,0.55)',
                  border: `1px solid ${importOpen ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                <Upload size={13} />
                Import Bank Statement
                {importOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>

              <div className="mt-3">
                <AnimatePresence>
                  {importOpen && (
                    <ImportPanel
                      accountId={effectiveAccountId}
                      onClose={() => setImportOpen(false)}
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ── Lines Table ──────────────────────────────────────────── */}
            <div className="space-y-3">
              {/* Filter + heading row */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1">
                  <Filter size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
                  <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    Statement Lines
                  </p>
                </div>
                <div
                  className="flex items-center gap-1 p-1 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {FILTERS.map((f) => {
                    const active = lineFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setLineFilter(f.id)}
                        className="relative px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200"
                        style={{ color: active ? '#fff' : 'rgba(255,255,255,0.4)' }}
                      >
                        {f.label}
                        {active && (
                          <motion.span
                            layoutId="line-filter-indicator"
                            className="absolute inset-0 rounded-lg"
                            style={{
                              background: 'rgba(99,102,241,0.15)',
                              border: '1px solid rgba(99,102,241,0.3)',
                            }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <LinesTable accountId={effectiveAccountId} filter={lineFilter} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
