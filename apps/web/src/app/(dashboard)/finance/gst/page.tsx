'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Download, X, Check, Loader2,
  FileText, TrendingUp, TrendingDown, Scale,
  Receipt, BookOpen, BarChart3, Hash,
} from 'lucide-react';
import { toast } from 'sonner';
import { gstApi } from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

type Direction = 'INPUT' | 'OUTPUT';
type Tab = 'ledger' | 'gstr1' | 'gstr3b' | 'hsn';

interface GSTLedger {
  id: string;
  invoiceId: string;
  invoice?: { invoiceNumber: string };
  direction: Direction;
  igstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalTax: number;
  transactionDate: string;
  hsnCode: string;
  period: string;
}

interface GSTR1Invoice {
  id?: string;
  gstin: string;
  invoiceNumber: string;
  invoiceValue: number;
  taxRate: number;
  cgst: number;
  sgst: number;
  igst: number;
}

interface GSTR3BSummary {
  totalTaxableValue: number;
  outputTax: number;
  inputTaxCredit: number;
  netTaxPayable: number;
  details?: Array<{
    description: string;
    taxableValue: number;
    igst: number;
    cgst: number;
    sgst: number;
  }>;
}

interface HSNCode {
  id: string;
  hsnCode: string;
  description: string;
  taxRate: number;
  unit: string;
}

interface HSNFormData {
  hsnCode: string;
  description: string;
  taxRate: string;
  unit: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EMPTY_HSN_FORM: HSNFormData = {
  hsnCode: '',
  description: '',
  taxRate: '',
  unit: '',
};

const TAB_CONFIG: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
  { id: 'ledger', label: 'GST Ledger', icon: BookOpen },
  { id: 'gstr1', label: 'GSTR-1', icon: FileText },
  { id: 'gstr3b', label: 'GSTR-3B', icon: BarChart3 },
  { id: 'hsn', label: 'HSN Master', icon: Hash },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (v?: number) =>
  v != null
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(v)
    : '₹0.00';

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      {[...Array(cols)].map((_, j) => (
        <td key={j} className="px-4 py-3">
          <div
            className="h-4 rounded animate-pulse"
            style={{ background: 'rgba(255,255,255,0.05)', width: j === 0 ? '70%' : '55%' }}
          />
        </td>
      ))}
    </tr>
  );
}

// ── Summary Card ──────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bg: string;
}) {
  return (
    <div
      className="rounded-2xl p-5 flex items-center gap-4"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: bg }}
      >
        <Icon size={20} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {label}
        </p>
        <p className="text-lg font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
          {fmt(value)}
        </p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function GSTPage() {
  const [activeTab, setActiveTab] = useState<Tab>('ledger');

  // ── Ledger state ──────────────────────────────────────────────────────────
  const [dirFilter, setDirFilter] = useState<Direction | ''>('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [ledger, setLedger] = useState<GSTLedger[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // ── GSTR1 state ───────────────────────────────────────────────────────────
  const [gstr1Period, setGstr1Period] = useState('');
  const [gstr1Data, setGstr1Data] = useState<GSTR1Invoice[]>([]);
  const [gstr1Loading, setGstr1Loading] = useState(false);

  // ── GSTR3B state ──────────────────────────────────────────────────────────
  const [gstr3bPeriod, setGstr3bPeriod] = useState('');
  const [gstr3b, setGstr3b] = useState<GSTR3BSummary | null>(null);
  const [gstr3bLoading, setGstr3bLoading] = useState(false);

  // ── HSN state ─────────────────────────────────────────────────────────────
  const [hsnList, setHsnList] = useState<HSNCode[]>([]);
  const [hsnLoading, setHsnLoading] = useState(false);
  const [hsnDialogOpen, setHsnDialogOpen] = useState(false);
  const [hsnForm, setHsnForm] = useState<HSNFormData>(EMPTY_HSN_FORM);
  const [hsnSaving, setHsnSaving] = useState(false);

  // ── Derived summary totals ────────────────────────────────────────────────
  const outputTax = ledger
    .filter(r => r.direction === 'OUTPUT')
    .reduce((s, r) => s + (r.totalTax ?? 0), 0);
  const inputTax = ledger
    .filter(r => r.direction === 'INPUT')
    .reduce((s, r) => s + (r.totalTax ?? 0), 0);
  const netPayable = outputTax - inputTax;

  // ── Fetch ledger ──────────────────────────────────────────────────────────

  const fetchLedger = useCallback(async () => {
    setLedgerLoading(true);
    try {
      const params: Record<string, string> = {};
      if (dirFilter) params.direction = dirFilter;
      if (periodFilter) params.period = periodFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const res = await (gstApi as any).getLedger(params);
      setLedger((res as any)?.data ?? res ?? []);
    } catch {
      toast.error('Failed to load GST ledger');
    } finally {
      setLedgerLoading(false);
    }
  }, [dirFilter, periodFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (activeTab === 'ledger') fetchLedger();
  }, [activeTab, fetchLedger]);

  // ── Fetch GSTR1 ───────────────────────────────────────────────────────────

  const fetchGSTR1 = useCallback(async () => {
    setGstr1Loading(true);
    try {
      const params: Record<string, string> = {};
      if (gstr1Period) params.period = gstr1Period;
      const res = await (gstApi as any).getGSTR1(params);
      setGstr1Data((res as any)?.data ?? res ?? []);
    } catch {
      toast.error('Failed to load GSTR-1 data');
    } finally {
      setGstr1Loading(false);
    }
  }, [gstr1Period]);

  useEffect(() => {
    if (activeTab === 'gstr1') fetchGSTR1();
  }, [activeTab, fetchGSTR1]);

  // ── Fetch GSTR3B ──────────────────────────────────────────────────────────

  const fetchGSTR3B = useCallback(async () => {
    setGstr3bLoading(true);
    try {
      const params: Record<string, string> = {};
      if (gstr3bPeriod) params.period = gstr3bPeriod;
      const res = await (gstApi as any).getGSTR3B(params);
      setGstr3b((res as any)?.data ?? res ?? null);
    } catch {
      toast.error('Failed to load GSTR-3B data');
    } finally {
      setGstr3bLoading(false);
    }
  }, [gstr3bPeriod]);

  useEffect(() => {
    if (activeTab === 'gstr3b') fetchGSTR3B();
  }, [activeTab, fetchGSTR3B]);

  // ── Fetch HSN ─────────────────────────────────────────────────────────────

  const fetchHSN = useCallback(async () => {
    setHsnLoading(true);
    try {
      const res = await (gstApi as any).getHSN();
      setHsnList((res as any)?.data ?? res ?? []);
    } catch {
      toast.error('Failed to load HSN codes');
    } finally {
      setHsnLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'hsn') fetchHSN();
  }, [activeTab, fetchHSN]);

  // ── HSN create ────────────────────────────────────────────────────────────

  const handleHSNSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hsnForm.hsnCode || !hsnForm.description || !hsnForm.taxRate) {
      toast.error('HSN Code, Description and Tax Rate are required');
      return;
    }
    setHsnSaving(true);
    try {
      await (gstApi as any).createHSN({
        hsnCode: hsnForm.hsnCode,
        description: hsnForm.description,
        taxRate: parseFloat(hsnForm.taxRate),
        unit: hsnForm.unit,
      });
      toast.success('HSN code created successfully');
      setHsnDialogOpen(false);
      setHsnForm(EMPTY_HSN_FORM);
      fetchHSN();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to create HSN code');
    } finally {
      setHsnSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── HSN Dialog ── */}
      <AnimatePresence>
        {hsnDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setHsnDialogOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="relative z-10 w-full max-w-md rounded-2xl overflow-hidden"
              style={{ background: 'rgba(15,15,25,0.98)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                <h3 className="font-semibold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                  Add HSN Code
                </h3>
                <button
                  onClick={() => setHsnDialogOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
                </button>
              </div>

              <form onSubmit={handleHSNSubmit} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    HSN Code <span className="text-red-400">*</span>
                  </label>
                  <input
                    className="input-field w-full font-mono"
                    placeholder="e.g. 998311"
                    value={hsnForm.hsnCode}
                    onChange={e => setHsnForm(f => ({ ...f, hsnCode: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Description <span className="text-red-400">*</span>
                  </label>
                  <input
                    className="input-field w-full"
                    placeholder="e.g. Manpower Supply Services"
                    value={hsnForm.description}
                    onChange={e => setHsnForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Tax Rate (%) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      className="input-field w-full"
                      placeholder="18"
                      value={hsnForm.taxRate}
                      onChange={e => setHsnForm(f => ({ ...f, taxRate: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Unit
                    </label>
                    <input
                      className="input-field w-full"
                      placeholder="e.g. NOS, KGS"
                      value={hsnForm.unit}
                      onChange={e => setHsnForm(f => ({ ...f, unit: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setHsnDialogOpen(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={hsnSaving} className="btn-primary">
                    {hsnSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Create HSN
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            GST Management
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            GST ledger, returns filing, reconciliation, and HSN master
          </p>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="Output Tax Liability"
          value={outputTax}
          icon={TrendingUp}
          color="#f97316"
          bg="rgba(249,115,22,0.12)"
        />
        <SummaryCard
          label="Input Tax Credit"
          value={inputTax}
          icon={TrendingDown}
          color="#3b82f6"
          bg="rgba(59,130,246,0.12)"
        />
        <SummaryCard
          label="Net GST Payable"
          value={netPayable}
          icon={Scale}
          color={netPayable >= 0 ? '#f43f5e' : '#10b981'}
          bg={netPayable >= 0 ? 'rgba(244,63,94,0.12)' : 'rgba(16,185,129,0.12)'}
        />
      </div>

      {/* ── Tabs ── */}
      <div className="glass-card overflow-hidden">
        {/* Tab bar */}
        <div
          className="flex items-center gap-1 p-1.5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          {TAB_CONFIG.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={
                activeTab === id
                  ? {
                      background: 'rgba(99,102,241,0.15)',
                      color: '#818cf8',
                      border: '1px solid rgba(99,102,241,0.2)',
                    }
                  : {
                      color: 'rgba(255,255,255,0.4)',
                      border: '1px solid transparent',
                    }
              }
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab 1: GST Ledger ── */}
        {activeTab === 'ledger' && (
          <div>
            {/* Filter bar */}
            <div
              className="flex flex-wrap items-center gap-3 p-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
            >
              <select
                className="input-field"
                value={dirFilter}
                onChange={e => setDirFilter(e.target.value as Direction | '')}
                style={{ minWidth: 150 }}
              >
                <option value="">All Directions</option>
                <option value="INPUT">INPUT</option>
                <option value="OUTPUT">OUTPUT</option>
              </select>

              <div className="space-y-0 flex items-center gap-2">
                <label className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Period:</label>
                <input
                  type="month"
                  className="input-field"
                  value={periodFilter}
                  onChange={e => setPeriodFilter(e.target.value)}
                  placeholder="YYYY-MM"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>From:</label>
                <input
                  type="date"
                  className="input-field"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>To:</label>
                <input
                  type="date"
                  className="input-field"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                />
              </div>

              <button onClick={fetchLedger} className="btn-primary" style={{ marginLeft: 'auto' }}>
                Apply Filters
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {['Invoice No', 'HSN Code', 'Direction', 'CGST', 'SGST', 'IGST', 'Total Tax', 'Date'].map(h => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                        style={{ color: 'rgba(255,255,255,0.3)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ledgerLoading && [...Array(6)].map((_, i) => <SkeletonRow key={i} cols={8} />)}

                  {!ledgerLoading && ledger.map(row => (
                    <tr
                      key={row.id}
                      className="hover:bg-white/[0.015] transition-colors"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Receipt size={13} style={{ color: '#818cf8' }} />
                          <span className="text-sm font-mono text-white">
                            {row.invoice?.invoiceNumber ?? row.invoiceId?.slice(0, 10) + '…'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>
                          {row.hsnCode || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={
                            row.direction === 'INPUT'
                              ? { background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }
                              : { background: 'rgba(249,115,22,0.12)', color: '#f97316' }
                          }
                        >
                          {row.direction}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                          {fmt(row.cgstAmount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                          {fmt(row.sgstAmount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                          {fmt(row.igstAmount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-white">{fmt(row.totalTax)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {fmtDate(row.transactionDate)}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {!ledgerLoading && ledger.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center">
                        <BookOpen size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.08)' }} />
                        <p className="text-sm font-medium text-white mb-1">No ledger entries found</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          Adjust your filters or check back after processing invoices
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* Summary footer */}
                {!ledgerLoading && ledger.length > 0 && (
                  <tfoot>
                    <tr style={{ borderTop: '2px solid rgba(255,255,255,0.08)' }}>
                      <td colSpan={6} className="px-4 py-3">
                        <div className="flex items-center gap-6 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          <span>
                            Total Output Tax:{' '}
                            <span style={{ color: '#f97316' }}>{fmt(outputTax)}</span>
                          </span>
                          <span>
                            Total Input Tax:{' '}
                            <span style={{ color: '#3b82f6' }}>{fmt(inputTax)}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3" colSpan={2}>
                        <div className="text-right text-xs font-semibold">
                          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Net Liability: </span>
                          <span style={{ color: netPayable >= 0 ? '#f43f5e' : '#10b981' }}>
                            {fmt(netPayable)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* ── Tab 2: GSTR-1 ── */}
        {activeTab === 'gstr1' && (
          <div>
            <div
              className="flex flex-wrap items-center gap-3 p-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
            >
              <div className="flex items-center gap-2">
                <label className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Period:</label>
                <input
                  type="month"
                  className="input-field"
                  value={gstr1Period}
                  onChange={e => setGstr1Period(e.target.value)}
                  placeholder="YYYY-MM"
                />
              </div>
              <button onClick={fetchGSTR1} className="btn-primary">
                Load GSTR-1
              </button>
              <button
                onClick={() => toast.info('GSTR-1 JSON export coming soon')}
                className="btn-secondary flex items-center gap-2"
                style={{ marginLeft: 'auto' }}
              >
                <Download size={14} /> Export JSON
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {['GSTIN', 'Invoice No', 'Invoice Value', 'Tax Rate', 'CGST', 'SGST', 'IGST'].map(h => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                        style={{ color: 'rgba(255,255,255,0.3)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gstr1Loading && [...Array(5)].map((_, i) => <SkeletonRow key={i} cols={7} />)}

                  {!gstr1Loading && gstr1Data.map((inv, idx) => (
                    <tr
                      key={inv.id ?? idx}
                      className="hover:bg-white/[0.015] transition-colors"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>
                          {inv.gstin || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText size={13} style={{ color: '#818cf8' }} />
                          <span className="text-sm font-mono text-white">{inv.invoiceNumber}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-white">{fmt(inv.invoiceValue)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                          style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa' }}
                        >
                          {inv.taxRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                          {fmt(inv.cgst)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                          {fmt(inv.sgst)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                          {fmt(inv.igst)}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {!gstr1Loading && gstr1Data.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center">
                        <FileText size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.08)' }} />
                        <p className="text-sm font-medium text-white mb-1">No GSTR-1 data</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          Select a period and click Load GSTR-1
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tab 3: GSTR-3B ── */}
        {activeTab === 'gstr3b' && (
          <div>
            <div
              className="flex flex-wrap items-center gap-3 p-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
            >
              <div className="flex items-center gap-2">
                <label className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Period:</label>
                <input
                  type="month"
                  className="input-field"
                  value={gstr3bPeriod}
                  onChange={e => setGstr3bPeriod(e.target.value)}
                />
              </div>
              <button onClick={fetchGSTR3B} className="btn-primary">
                Load GSTR-3B
              </button>
            </div>

            {gstr3bLoading && (
              <div className="p-8 flex items-center justify-center gap-3">
                <Loader2 size={20} className="animate-spin" style={{ color: 'rgba(255,255,255,0.3)' }} />
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Loading GSTR-3B…</span>
              </div>
            )}

            {!gstr3bLoading && gstr3b && (
              <div className="p-5 space-y-6">
                {/* Summary tiles */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Taxable Value', value: gstr3b.totalTaxableValue, color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
                    { label: 'Output Tax', value: gstr3b.outputTax, color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
                    { label: 'Input Tax Credit', value: gstr3b.inputTaxCredit, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
                    {
                      label: 'Net Tax Payable',
                      value: gstr3b.netTaxPayable,
                      color: gstr3b.netTaxPayable >= 0 ? '#f43f5e' : '#10b981',
                      bg: gstr3b.netTaxPayable >= 0 ? 'rgba(244,63,94,0.12)' : 'rgba(16,185,129,0.12)',
                    },
                  ].map(tile => (
                    <div
                      key={tile.label}
                      className="rounded-xl p-4"
                      style={{ background: tile.bg, border: `1px solid ${tile.color}22` }}
                    >
                      <p className="text-xs font-medium mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {tile.label}
                      </p>
                      <p className="text-xl font-bold" style={{ color: tile.color, fontFamily: 'Plus Jakarta Sans' }}>
                        {fmt(tile.value)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Detailed breakdown */}
                {gstr3b.details && gstr3b.details.length > 0 && (
                  <div>
                    <h4
                      className="text-xs font-semibold uppercase tracking-wider mb-3"
                      style={{ color: 'rgba(255,255,255,0.35)' }}
                    >
                      Detailed Breakdown
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[700px]">
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            {['Description', 'Taxable Value', 'IGST', 'CGST', 'SGST'].map(h => (
                              <th
                                key={h}
                                className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider"
                                style={{ color: 'rgba(255,255,255,0.3)' }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {gstr3b.details.map((row, idx) => (
                            <tr
                              key={idx}
                              className="hover:bg-white/[0.015] transition-colors"
                              style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                            >
                              <td className="px-4 py-3">
                                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                                  {row.description}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm font-medium text-white">{fmt(row.taxableValue)}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{fmt(row.igst)}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{fmt(row.cgst)}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{fmt(row.sgst)}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!gstr3bLoading && !gstr3b && (
              <div className="px-4 py-16 text-center">
                <BarChart3 size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.08)' }} />
                <p className="text-sm font-medium text-white mb-1">No GSTR-3B data</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Select a period and click Load GSTR-3B
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Tab 4: HSN Master ── */}
        {activeTab === 'hsn' && (
          <div>
            <div
              className="flex items-center justify-between p-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
            >
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {hsnList.length} HSN code{hsnList.length !== 1 ? 's' : ''} defined
              </p>
              <button
                onClick={() => { setHsnForm(EMPTY_HSN_FORM); setHsnDialogOpen(true); }}
                className="btn-primary"
              >
                <Plus size={14} /> Add HSN
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {['HSN Code', 'Description', 'Tax Rate', 'Unit'].map(h => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                        style={{ color: 'rgba(255,255,255,0.3)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hsnLoading && [...Array(5)].map((_, i) => <SkeletonRow key={i} cols={4} />)}

                  {!hsnLoading && hsnList.map(hsn => (
                    <tr
                      key={hsn.id}
                      className="hover:bg-white/[0.015] transition-colors"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Hash size={13} style={{ color: '#818cf8' }} />
                          <span className="text-sm font-mono font-medium text-white">{hsn.hsnCode}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                          {hsn.description}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold"
                          style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa' }}
                        >
                          {hsn.taxRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {hsn.unit || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {!hsnLoading && hsnList.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-16 text-center">
                        <Hash size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.08)' }} />
                        <p className="text-sm font-medium text-white mb-1">No HSN codes defined</p>
                        <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          Add HSN codes to link them to your invoices
                        </p>
                        <button
                          onClick={() => { setHsnForm(EMPTY_HSN_FORM); setHsnDialogOpen(true); }}
                          className="btn-primary"
                        >
                          <Plus size={14} /> Add First HSN
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
