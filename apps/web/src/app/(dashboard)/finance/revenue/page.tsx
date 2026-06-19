'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, Clock, BarChart3, AlertCircle,
  Calendar, RefreshCw, Plus, Lock, Info,
  CheckCircle2, ChevronLeft, ChevronRight,
  Search, Filter, X, DollarSign,
} from 'lucide-react';
import { revenueApi } from '@/lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INR = (v: number | string | undefined) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(v ?? 0));

const today = () => new Date().toISOString().slice(0, 10);
const currentYYYYMM = () => new Date().toISOString().slice(0, 7);

// ─── Types ────────────────────────────────────────────────────────────────────

interface RevenueSummary {
  billedRevenue: number;
  recognizedRevenue: number;
  deferredRevenue: number;
  unbilledRevenue: number;
}

interface RevenueSchedule {
  id: string;
  invoiceId: string;
  period: string;
  scheduledAmount: number;
  recognizedAmount: number;
  isRecognized: boolean;
  recognizedAt?: string;
  notes?: string;
  invoice?: {
    invoiceNo: string;
    client: { name: string };
  };
  status?: 'SCHEDULED' | 'RECOGNIZED' | 'DEFERRED';
}

interface MonthlyChartPoint {
  month: string; // YYYY-MM
  revenue: number;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skel({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md ${className ?? ''}`}
      style={{ background: 'rgba(255,255,255,0.06)' }}
    />
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'SCHEDULED' | 'RECOGNIZED' | 'DEFERRED' }) {
  const cfg = {
    SCHEDULED:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)',  label: 'Scheduled'  },
    RECOGNIZED: { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.25)',  label: 'Recognized' },
    DEFERRED:   { color: '#f97316', bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.25)',  label: 'Deferred'   },
  }[status];

  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

function SummaryCards({ summary, loading }: { summary?: RevenueSummary; loading: boolean }) {
  const cards = [
    {
      label: 'Billed Revenue',
      desc: 'Total invoiced this FY',
      value: summary?.billedRevenue,
      icon: DollarSign,
      color: '#818cf8',
      bg: 'rgba(99,102,241,0.08)',
      border: 'rgba(99,102,241,0.2)',
      glow: 'rgba(99,102,241,0.15)',
    },
    {
      label: 'Recognized Revenue',
      desc: 'Revenue earned & booked',
      value: summary?.recognizedRevenue,
      icon: CheckCircle2,
      color: '#10b981',
      bg: 'rgba(16,185,129,0.08)',
      border: 'rgba(16,185,129,0.2)',
      glow: 'rgba(16,185,129,0.12)',
    },
    {
      label: 'Deferred Revenue',
      desc: 'Billed but not yet earned',
      value: summary?.deferredRevenue,
      icon: Clock,
      color: '#f97316',
      bg: 'rgba(249,115,22,0.08)',
      border: 'rgba(249,115,22,0.2)',
      glow: 'rgba(249,115,22,0.12)',
    },
    {
      label: 'Unbilled Revenue',
      desc: 'Scheduled, not yet billed',
      value: summary?.unbilledRevenue,
      icon: AlertCircle,
      color: '#eab308',
      bg: 'rgba(234,179,8,0.08)',
      border: 'rgba(234,179,8,0.2)',
      glow: 'rgba(234,179,8,0.12)',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
          className="glass-card p-5 flex flex-col gap-3"
          style={{ border: `1px solid ${card.border}`, boxShadow: `0 0 24px ${card.glow}` }}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {card.label}
            </p>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: `${card.color}20`, color: card.color }}
            >
              <card.icon size={17} />
            </div>
          </div>
          {loading ? (
            <>
              <Skel className="h-8 w-2/3" />
              <Skel className="h-4 w-1/2" />
            </>
          ) : (
            <>
              <p className="text-2xl font-bold" style={{ color: card.color, fontFamily: 'Plus Jakarta Sans' }}>
                {INR(card.value ?? 0)}
              </p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{card.desc}</p>
            </>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ─── Monthly Chart ────────────────────────────────────────────────────────────

function MonthlyChart({ data, loading }: { data: MonthlyChartPoint[]; loading: boolean }) {
  const [tooltip, setTooltip] = useState<{ idx: number; x: number; y: number } | null>(null);
  const curMonth = currentYYYYMM();
  const maxVal = Math.max(...data.map((d) => d.revenue), 1);

  const fmtMonth = (ym: string) => {
    const [y, m] = ym.split('-');
    return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  };

  return (
    <div
      className="glass-card p-6"
      style={{ border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Monthly Revenue
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>12-month trend</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm" style={{ background: '#6366f1' }} />
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Revenue</span>
          <span className="w-3 h-3 rounded-sm ml-3" style={{ background: '#a78bfa' }} />
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Current month</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-end gap-2 h-40">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="flex-1" style={{ height: `${30 + Math.random() * 70}%` }}><Skel className="w-full h-full" /></div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-2">
          <BarChart3 size={32} style={{ color: 'rgba(255,255,255,0.1)' }} />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No chart data available</p>
        </div>
      ) : (
        <div className="relative">
          {/* Y-axis grid lines */}
          <div className="absolute inset-x-0 top-0 bottom-6 pointer-events-none">
            {[0, 25, 50, 75, 100].map((pct) => (
              <div
                key={pct}
                className="absolute w-full"
                style={{
                  bottom: `${pct}%`,
                  borderTop: '1px dashed rgba(255,255,255,0.04)',
                }}
              />
            ))}
          </div>

          {/* Bars */}
          <div className="relative flex items-end gap-1.5 h-44 pb-6">
            {data.map((d, i) => {
              const isCurrent = d.month === curMonth;
              const heightPct = Math.max((d.revenue / maxVal) * 100, 2);
              const isHovered = tooltip?.idx === i;
              return (
                <div
                  key={d.month}
                  className="flex-1 flex flex-col items-center gap-1 cursor-pointer group"
                  onMouseEnter={(e) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setTooltip({ idx: i, x: rect.left, y: rect.top });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-sm transition-all duration-300"
                      style={{
                        height: `${heightPct}%`,
                        background: isCurrent
                          ? 'linear-gradient(180deg,#a78bfa,#7c3aed)'
                          : isHovered
                          ? 'rgba(99,102,241,0.85)'
                          : 'rgba(99,102,241,0.5)',
                        boxShadow: isCurrent ? '0 0 12px rgba(167,139,250,0.4)' : undefined,
                        transform: isHovered ? 'scaleX(0.88)' : 'scaleX(1)',
                        transformOrigin: 'bottom',
                      }}
                    />
                  </div>
                  <span
                    className="text-[9px] font-medium truncate w-full text-center"
                    style={{ color: isCurrent ? '#a78bfa' : 'rgba(255,255,255,0.25)' }}
                  >
                    {fmtMonth(d.month)}
                  </span>

                  {/* Tooltip */}
                  {isHovered && (
                    <div
                      className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <div
                        className="px-3 py-2 rounded-lg text-xs font-medium shadow-xl"
                        style={{
                          background: 'rgba(20,20,35,0.95)',
                          border: '1px solid rgba(99,102,241,0.3)',
                          color: '#fff',
                        }}
                      >
                        <p style={{ color: 'rgba(255,255,255,0.5)' }}>{fmtMonth(d.month)}</p>
                        <p className="font-bold mt-0.5" style={{ color: '#818cf8' }}>{INR(d.revenue)}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Create Schedule Dialog ───────────────────────────────────────────────────

function CreateScheduleDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({ invoiceId: '', period: currentYYYYMM(), scheduledAmount: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.invoiceId || !form.period || !form.scheduledAmount) {
      setError('Invoice ID, Period, and Amount are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await revenueApi.createSchedule({
        invoiceId: form.invoiceId,
        period: form.period,
        scheduledAmount: Number(form.scheduledAmount),
        notes: form.notes,
      });
      setForm({ invoiceId: '', period: currentYYYYMM(), scheduledAmount: '', notes: '' });
      onCreated();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create schedule.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="dialog-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      >
        <motion.div
          key="dialog-panel"
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="w-full max-w-md rounded-2xl p-6 space-y-5"
          style={{
            background: 'rgba(15,15,25,0.98)',
            border: '1px solid rgba(99,102,241,0.25)',
            boxShadow: '0 0 60px rgba(99,102,241,0.15)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                Add Revenue Schedule
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Create a new revenue recognition schedule
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Invoice ID */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Invoice ID *
              </label>
              <input
                type="text"
                value={form.invoiceId}
                onChange={(e) => setForm((f) => ({ ...f, invoiceId: e.target.value }))}
                placeholder="e.g. inv_123abc"
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  colorScheme: 'dark',
                }}
              />
            </div>

            {/* Period */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Period (YYYY-MM) *
              </label>
              <div className="relative flex items-center">
                <Calendar size={13} className="absolute left-3 pointer-events-none" style={{ color: 'rgba(255,255,255,0.3)' }} />
                <input
                  type="month"
                  value={form.period}
                  onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
                  className="w-full pl-8 pr-3 py-2.5 rounded-lg text-sm text-white outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    colorScheme: 'dark',
                  }}
                />
              </div>
            </div>

            {/* Scheduled Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Scheduled Amount (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.scheduledAmount}
                onChange={(e) => setForm((f) => ({ ...f, scheduledAmount: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  colorScheme: 'dark',
                }}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Notes
              </label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes..."
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none resize-none"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  colorScheme: 'dark',
                }}
              />
            </div>

            {error && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)' }}>
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
                style={{
                  background: saving ? 'rgba(99,102,241,0.4)' : '#6366f1',
                  color: '#fff',
                  boxShadow: saving ? 'none' : '0 0 20px rgba(99,102,241,0.35)',
                }}
              >
                {saving ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
                {saving ? 'Creating…' : 'Create Schedule'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div
        key="confirm-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
        onClick={onCancel}
      >
        <motion.div
          key="confirm-panel"
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="w-full max-w-sm rounded-2xl p-6 space-y-4"
          style={{
            background: 'rgba(15,15,25,0.98)',
            border: '1px solid rgba(16,185,129,0.25)',
            boxShadow: '0 0 40px rgba(16,185,129,0.1)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
              <CheckCircle2 size={20} style={{ color: '#10b981' }} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{title}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{message}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: '#10b981', color: '#fff', boxShadow: '0 0 16px rgba(16,185,129,0.3)' }}
            >
              {loading ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              {loading ? 'Processing…' : 'Confirm'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Revenue Schedules Table ──────────────────────────────────────────────────

function SchedulesTable({
  schedules,
  loading,
  meta,
  page,
  onPageChange,
  onRecognize,
  recognizingId,
}: {
  schedules: RevenueSchedule[];
  loading: boolean;
  meta?: PaginationMeta;
  page: number;
  onPageChange: (p: number) => void;
  onRecognize: (id: string) => void;
  recognizingId: string | null;
}) {
  const getStatus = (s: RevenueSchedule): 'SCHEDULED' | 'RECOGNIZED' | 'DEFERRED' => {
    if (s.status) return s.status;
    if (s.isRecognized) return 'RECOGNIZED';
    return 'SCHEDULED';
  };

  if (loading) {
    return (
      <div className="space-y-3 p-6">
        {[...Array(6)].map((_, i) => <Skel key={i} className="h-12" />)}
      </div>
    );
  }

  if (!schedules.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <BarChart3 size={36} style={{ color: 'rgba(255,255,255,0.1)' }} />
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No revenue schedules found.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Invoice No', 'Client Name', 'Period', 'Scheduled (₹)', 'Recognized (₹)', 'Status', 'Notes', 'Actions'].map((h, i) => (
                <th
                  key={h}
                  className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider ${i >= 3 && i <= 4 ? 'text-right' : 'text-left'}`}
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedules.map((s, idx) => {
              const status = getStatus(s);
              const isRecognizing = recognizingId === s.id;
              return (
                <motion.tr
                  key={s.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="group hover:bg-white/[0.015] transition-colors"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  {/* Invoice No */}
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-sm font-medium" style={{ color: '#818cf8' }}>
                      {s.invoice?.invoiceNo ?? s.invoiceId.slice(0, 8) + '…'}
                    </span>
                  </td>

                  {/* Client Name */}
                  <td className="px-5 py-3.5 text-sm text-white">
                    {s.invoice?.client?.name ?? '—'}
                  </td>

                  {/* Period */}
                  <td className="px-5 py-3.5">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
                    >
                      <Calendar size={10} />
                      {s.period}
                    </span>
                  </td>

                  {/* Scheduled Amount */}
                  <td className="px-5 py-3.5 text-right text-sm font-medium" style={{ color: '#fde68a' }}>
                    {INR(s.scheduledAmount)}
                  </td>

                  {/* Recognized Amount */}
                  <td className="px-5 py-3.5 text-right text-sm font-medium" style={{ color: '#6ee7b7' }}>
                    {INR(s.recognizedAmount)}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3.5">
                    <StatusBadge status={status} />
                  </td>

                  {/* Notes */}
                  <td className="px-5 py-3.5 max-w-[140px]">
                    {s.notes ? (
                      <span
                        className="text-xs truncate block max-w-full"
                        title={s.notes}
                        style={{ color: 'rgba(255,255,255,0.4)' }}
                      >
                        {s.notes}
                      </span>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5">
                    {status === 'RECOGNIZED' ? (
                      <div
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                        title={`Recognized at ${s.recognizedAt ? new Date(s.recognizedAt).toLocaleDateString('en-IN') : 'N/A'}`}
                        style={{ background: 'rgba(16,185,129,0.08)', color: 'rgba(16,185,129,0.5)', cursor: 'default' }}
                      >
                        <Lock size={11} /> Locked
                      </div>
                    ) : status === 'SCHEDULED' ? (
                      <button
                        onClick={() => onRecognize(s.id)}
                        disabled={isRecognizing}
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all active:scale-95"
                        style={{
                          background: isRecognizing ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.15)',
                          color: '#10b981',
                          border: '1px solid rgba(16,185,129,0.25)',
                        }}
                      >
                        {isRecognizing ? <RefreshCw size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                        Recognize
                      </button>
                    ) : (
                      /* DEFERRED: show Recognize + Reason */
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onRecognize(s.id)}
                          disabled={isRecognizing}
                          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all active:scale-95"
                          style={{
                            background: isRecognizing ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.15)',
                            color: '#10b981',
                            border: '1px solid rgba(16,185,129,0.25)',
                          }}
                        >
                          {isRecognizing ? <RefreshCw size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                          Recognize
                        </button>
                        {s.notes && (
                          <button
                            title={`Deferred reason: ${s.notes}`}
                            className="w-6 h-6 rounded flex items-center justify-center"
                            style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316' }}
                          >
                            <Info size={11} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Showing {((page - 1) * meta.limit) + 1}–{Math.min(page * meta.limit, meta.total)} of {meta.total}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
            >
              <ChevronLeft size={14} />
            </button>
            {[...Array(Math.min(meta.totalPages, 5))].map((_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className="w-8 h-8 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: page === p ? '#6366f1' : 'rgba(255,255,255,0.06)',
                    color: page === p ? '#fff' : 'rgba(255,255,255,0.5)',
                    boxShadow: page === p ? '0 0 12px rgba(99,102,241,0.35)' : undefined,
                  }}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= meta.totalPages}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RevenueManagementPage() {
  const currentFY = () => {
    const now = new Date();
    const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return { from: `${year}-04-01`, to: `${year + 1}-03-31` };
  };

  const fy = currentFY();

  // ── State
  const [summary, setSummary] = useState<RevenueSummary | undefined>();
  const [chartData, setChartData] = useState<MonthlyChartPoint[]>([]);
  const [schedules, setSchedules] = useState<RevenueSchedule[]>([]);
  const [scheduleMeta, setScheduleMeta] = useState<PaginationMeta | undefined>();

  const [summaryLoading, setSummaryLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SCHEDULED' | 'RECOGNIZED' | 'DEFERRED'>('ALL');
  const [fromDate, setFromDate] = useState(fy.from);
  const [toDate, setToDate] = useState(fy.to);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [recognizingId, setRecognizingId] = useState<string | null>(null);

  // ── Data fetching
  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const data = await revenueApi.getSummary({ from: fromDate, to: toDate }) as RevenueSummary;
      setSummary(data);
    } catch {
      // silently handle
    } finally {
      setSummaryLoading(false);
    }
  }, [fromDate, toDate]);

  const fetchChart = useCallback(async () => {
    setChartLoading(true);
    try {
      const data = await revenueApi.getMonthlyChart(12) as MonthlyChartPoint[];
      setChartData(data ?? []);
    } catch {
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  }, []);

  const fetchSchedules = useCallback(async () => {
    setTableLoading(true);
    try {
      const rawParams: Record<string, string | undefined> = {
        page: String(page),
        limit: '10',
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        from: fromDate,
        to: toDate,
        search: search || undefined,
      };
      // Strip undefined values
      const params = Object.fromEntries(
        Object.entries(rawParams).filter(([, v]) => v !== undefined)
      ) as Record<string, string>;
      const result = await revenueApi.getSchedules(params) as { data: RevenueSchedule[]; meta: PaginationMeta };
      setSchedules(result.data ?? []);
      setScheduleMeta(result.meta);
    } catch {
      setSchedules([]);
    } finally {
      setTableLoading(false);
    }
  }, [page, statusFilter, fromDate, toDate, search]);

  useEffect(() => { fetchSummary(); fetchChart(); }, [fetchSummary, fetchChart]);
  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  // ── Actions
  const handleRecognize = async (id: string) => {
    setConfirmId(id);
  };

  const handleConfirmRecognize = async () => {
    if (!confirmId) return;
    setRecognizingId(confirmId);
    setConfirmId(null);
    try {
      await revenueApi.recognize(confirmId);
      fetchSchedules();
      fetchSummary();
    } catch {
      // silently handle
    } finally {
      setRecognizingId(null);
    }
  };

  const handleCreated = () => {
    fetchSchedules();
    fetchSummary();
  };

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Revenue Management
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Track billed, recognized, deferred, and unbilled revenue
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{
            background: '#6366f1',
            color: '#fff',
            boxShadow: '0 0 20px rgba(99,102,241,0.4)',
          }}
        >
          <Plus size={15} />
          Add Schedule
        </button>
      </div>

      {/* ── Summary Cards ───────────────────────────────────────── */}
      <SummaryCards summary={summary} loading={summaryLoading} />

      {/* ── Monthly Chart ───────────────────────────────────────── */}
      <MonthlyChart data={chartData} loading={chartLoading} />

      {/* ── Schedules Section ───────────────────────────────────── */}
      <div
        className="glass-card overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Filters Bar */}
        <div
          className="flex flex-wrap items-end gap-3 p-5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input
                type="text"
                placeholder="Search invoice..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-8 pr-3 py-2 rounded-lg text-sm text-white outline-none"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  colorScheme: 'dark',
                }}
              />
            </div>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {(['ALL', 'SCHEDULED', 'RECOGNIZED', 'DEFERRED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: statusFilter === s ? 'rgba(99,102,241,0.8)' : 'transparent',
                  color: statusFilter === s ? '#fff' : 'rgba(255,255,255,0.45)',
                  boxShadow: statusFilter === s ? '0 0 10px rgba(99,102,241,0.25)' : undefined,
                }}
              >
                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              <Calendar size={12} className="absolute left-2.5 pointer-events-none" style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                className="pl-7 pr-2 py-2 rounded-lg text-xs text-white outline-none"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  colorScheme: 'dark',
                  width: 130,
                }}
              />
            </div>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>to</span>
            <div className="relative flex items-center">
              <Calendar size={12} className="absolute left-2.5 pointer-events-none" style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                className="pl-7 pr-2 py-2 rounded-lg text-xs text-white outline-none"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  colorScheme: 'dark',
                  width: 130,
                }}
              />
            </div>
          </div>

          <button
            onClick={() => { fetchSchedules(); fetchSummary(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
            style={{
              background: 'rgba(99,102,241,0.15)',
              color: '#818cf8',
              border: '1px solid rgba(99,102,241,0.25)',
            }}
          >
            <Filter size={12} /> Apply
          </button>
        </div>

        {/* Table */}
        <SchedulesTable
          schedules={schedules}
          loading={tableLoading}
          meta={scheduleMeta}
          page={page}
          onPageChange={setPage}
          onRecognize={handleRecognize}
          recognizingId={recognizingId}
        />
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────── */}
      <CreateScheduleDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
      <ConfirmDialog
        open={!!confirmId}
        title="Recognize Revenue"
        message="Are you sure you want to mark this schedule as recognized? This action cannot be undone."
        onConfirm={handleConfirmRecognize}
        onCancel={() => setConfirmId(null)}
        loading={!!recognizingId}
      />
    </div>
  );
}
