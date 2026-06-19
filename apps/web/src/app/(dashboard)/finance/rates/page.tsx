'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Pencil, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, TrendingUp, DollarSign,
  X, Check, Loader2, Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { rateApi } from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

type RateType = 'DAILY' | 'MONTHLY' | 'HOURLY' | 'PIECE_RATE';
type EscalationType = 'FIXED' | 'PERCENTAGE';

interface Rate {
  id: string;
  rateCode: string;
  designationId: string;
  designation?: { name: string };
  clientId?: string;
  client?: { name: string };
  tenderId?: string;
  tender?: { tenderNumber: string };
  rateType: RateType;
  basicRate: number;
  otRate?: number;
  allowance?: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
}

interface Escalation {
  id: string;
  escalationType: EscalationType;
  value: number;
  effectiveDate: string;
}

interface RateFormData {
  designationId: string;
  clientId: string;
  tenderId: string;
  rateType: RateType;
  basicRate: string;
  otRate: string;
  allowance: string;
  effectiveFrom: string;
  effectiveTo: string;
}

interface EscalationFormData {
  escalationType: EscalationType;
  value: string;
  effectiveDate: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const RATE_TYPES: RateType[] = ['DAILY', 'MONTHLY', 'HOURLY', 'PIECE_RATE'];

const RATE_TYPE_LABELS: Record<RateType, string> = {
  DAILY: 'Daily',
  MONTHLY: 'Monthly',
  HOURLY: 'Hourly',
  PIECE_RATE: 'Piece Rate',
};

const RATE_TYPE_COLORS: Record<RateType, { color: string; bg: string }> = {
  DAILY:      { color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
  MONTHLY:    { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  HOURLY:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  PIECE_RATE: { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
};

const EMPTY_FORM: RateFormData = {
  designationId: '',
  clientId: '',
  tenderId: '',
  rateType: 'MONTHLY',
  basicRate: '',
  otRate: '',
  allowance: '',
  effectiveFrom: '',
  effectiveTo: '',
};

const EMPTY_ESC_FORM: EscalationFormData = {
  escalationType: 'PERCENTAGE',
  value: '',
  effectiveDate: '',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v?: number) =>
  v != null
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(v)
    : '—';

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      {[...Array(11)].map((_, j) => (
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RatesPage() {
  const [search, setSearch] = useState('');
  const [rateTypeFilter, setRateTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [rates, setRates] = useState<Rate[]>([]);
  const [meta, setMeta] = useState<{ total: number; totalPages: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRate, setEditRate] = useState<Rate | null>(null);
  const [form, setForm] = useState<RateFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Expanded row for escalations
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [escalations, setEscalations] = useState<Record<string, Escalation[]>>({});
  const [escalationLoading, setEscalationLoading] = useState<string | null>(null);

  // Escalation dialog
  const [escDialogOpen, setEscDialogOpen] = useState(false);
  const [escRateId, setEscRateId] = useState<string | null>(null);
  const [escForm, setEscForm] = useState<EscalationFormData>(EMPTY_ESC_FORM);
  const [escSaving, setEscSaving] = useState(false);

  // ── Fetch rates ────────────────────────────────────────────────────────────

  const fetchRates = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '15' };
      if (search) params.search = search;
      if (rateTypeFilter) params.rateType = rateTypeFilter;
      if (statusFilter) params.isActive = statusFilter === 'active' ? 'true' : 'false';

      const res = await rateApi.list(params);
      setRates((res as any)?.data ?? []);
      setMeta((res as any)?.meta ?? null);
    } catch {
      toast.error('Failed to load rates');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, rateTypeFilter, statusFilter, page]);

  // ── Escalation fetch ───────────────────────────────────────────────────────

  const fetchEscalations = async (rateId: string) => {
    if (escalations[rateId]) return;
    setEscalationLoading(rateId);
    try {
      const data = await rateApi.listEscalations(rateId);
      setEscalations(prev => ({ ...prev, [rateId]: data ?? [] }));
    } catch {
      toast.error('Failed to load escalations');
    } finally {
      setEscalationLoading(null);
    }
  };

  const toggleExpand = (rateId: string) => {
    if (expandedId === rateId) {
      setExpandedId(null);
    } else {
      setExpandedId(rateId);
      fetchEscalations(rateId);
    }
  };

  // ── Dialog handlers ────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditRate(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (rate: Rate) => {
    setEditRate(rate);
    setForm({
      designationId: rate.designationId ?? '',
      clientId: rate.clientId ?? '',
      tenderId: rate.tenderId ?? '',
      rateType: rate.rateType,
      basicRate: String(rate.basicRate),
      otRate: rate.otRate != null ? String(rate.otRate) : '',
      allowance: rate.allowance != null ? String(rate.allowance) : '',
      effectiveFrom: rate.effectiveFrom ? rate.effectiveFrom.slice(0, 10) : '',
      effectiveTo: rate.effectiveTo ? rate.effectiveTo.slice(0, 10) : '',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditRate(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.designationId || !form.basicRate || !form.effectiveFrom) {
      toast.error('Designation, Basic Rate, and Effective From are required');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        designationId: form.designationId,
        rateType: form.rateType,
        basicRate: parseFloat(form.basicRate),
        effectiveFrom: form.effectiveFrom,
      };
      if (form.clientId) payload.clientId = form.clientId;
      if (form.tenderId) payload.tenderId = form.tenderId;
      if (form.otRate) payload.otRate = parseFloat(form.otRate);
      if (form.allowance) payload.allowance = parseFloat(form.allowance);
      if (form.effectiveTo) payload.effectiveTo = form.effectiveTo;

      if (editRate) {
        await rateApi.update(editRate.id, payload);
        toast.success('Rate updated successfully');
      } else {
        await rateApi.create(payload);
        toast.success('Rate created successfully');
      }
      closeDialog();
      fetchRates();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to save rate');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (rate: Rate) => {
    if (!confirm(`Deactivate rate ${rate.rateCode}? This action cannot be undone.`)) return;
    try {
      await rateApi.deactivate(rate.id);
      toast.success('Rate deactivated');
      fetchRates();
    } catch {
      toast.error('Failed to deactivate rate');
    }
  };

  // ── Escalation dialog ──────────────────────────────────────────────────────

  const openEscDialog = (rateId: string) => {
    setEscRateId(rateId);
    setEscForm(EMPTY_ESC_FORM);
    setEscDialogOpen(true);
  };

  const closeEscDialog = () => {
    setEscDialogOpen(false);
    setEscRateId(null);
  };

  const handleEscSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escRateId || !escForm.value || !escForm.effectiveDate) {
      toast.error('Value and Effective Date are required');
      return;
    }
    setEscSaving(true);
    try {
      await rateApi.createEscalation(escRateId, {
        escalationType: escForm.escalationType,
        value: parseFloat(escForm.value),
        effectiveDate: escForm.effectiveDate,
      });
      toast.success('Escalation added');
      // Bust escalations cache for this rate
      setEscalations(prev => {
        const next = { ...prev };
        delete next[escRateId];
        return next;
      });
      if (expandedId === escRateId) {
        fetchEscalations(escRateId);
      }
      closeEscDialog();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to add escalation');
    } finally {
      setEscSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Rate Dialog ── */}
      <AnimatePresence>
        {dialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeDialog}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="relative z-10 w-full max-w-2xl rounded-2xl overflow-hidden"
              style={{ background: 'rgba(15,15,25,0.98)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {/* Dialog header */}
              <div className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 className="font-semibold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                  {editRate ? 'Edit Rate' : 'Add Rate'}
                </h3>
                <button onClick={closeDialog}
                  className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                  <X size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
                </button>
              </div>

              {/* Dialog body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Designation ID <span className="text-red-400">*</span>
                    </label>
                    <input
                      className="input-field w-full"
                      placeholder="e.g. uuid-designation"
                      value={form.designationId}
                      onChange={e => setForm(f => ({ ...f, designationId: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Rate Type <span className="text-red-400">*</span>
                    </label>
                    <select
                      className="input-field w-full"
                      value={form.rateType}
                      onChange={e => setForm(f => ({ ...f, rateType: e.target.value as RateType }))}
                    >
                      {RATE_TYPES.map(t => (
                        <option key={t} value={t}>{RATE_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Client ID
                    </label>
                    <input
                      className="input-field w-full"
                      placeholder="Optional client UUID"
                      value={form.clientId}
                      onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Tender ID
                    </label>
                    <input
                      className="input-field w-full"
                      placeholder="Optional tender UUID"
                      value={form.tenderId}
                      onChange={e => setForm(f => ({ ...f, tenderId: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Basic Rate (₹) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input-field w-full"
                      placeholder="0.00"
                      value={form.basicRate}
                      onChange={e => setForm(f => ({ ...f, basicRate: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      OT Rate (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input-field w-full"
                      placeholder="Optional"
                      value={form.otRate}
                      onChange={e => setForm(f => ({ ...f, otRate: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Allowance (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input-field w-full"
                      placeholder="Optional"
                      value={form.allowance}
                      onChange={e => setForm(f => ({ ...f, allowance: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Effective From <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      className="input-field w-full"
                      value={form.effectiveFrom}
                      onChange={e => setForm(f => ({ ...f, effectiveFrom: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Effective To
                    </label>
                    <input
                      type="date"
                      className="input-field w-full"
                      value={form.effectiveTo}
                      onChange={e => setForm(f => ({ ...f, effectiveTo: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={closeDialog} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    {editRate ? 'Update Rate' : 'Create Rate'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Escalation Dialog ── */}
      <AnimatePresence>
        {escDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeEscDialog}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="relative z-10 w-full max-w-md rounded-2xl overflow-hidden"
              style={{ background: 'rgba(15,15,25,0.98)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 className="font-semibold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                  Add Escalation
                </h3>
                <button onClick={closeEscDialog}
                  className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                  <X size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
                </button>
              </div>

              <form onSubmit={handleEscSubmit} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Escalation Type <span className="text-red-400">*</span>
                  </label>
                  <select
                    className="input-field w-full"
                    value={escForm.escalationType}
                    onChange={e => setEscForm(f => ({ ...f, escalationType: e.target.value as EscalationType }))}
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Value <span className="text-red-400">*</span>
                    <span className="ml-1 opacity-60">
                      {escForm.escalationType === 'PERCENTAGE' ? '(%)' : '(₹)'}
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input-field w-full"
                    placeholder={escForm.escalationType === 'PERCENTAGE' ? 'e.g. 5.5' : 'e.g. 500'}
                    value={escForm.value}
                    onChange={e => setEscForm(f => ({ ...f, value: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Effective Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    className="input-field w-full"
                    value={escForm.effectiveDate}
                    onChange={e => setEscForm(f => ({ ...f, effectiveDate: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={closeEscDialog} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={escSaving} className="btn-primary">
                    {escSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Add Escalation
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
            Rate Management
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Define and manage billing rates across designations, clients, and tenders
          </p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add Rate
        </button>
      </div>

      {/* ── Filter Bar ── */}
      <div className="glass-card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-52">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by rate code, designation..."
            className="input-field w-full pl-9"
          />
        </div>

        <select
          className="input-field"
          value={rateTypeFilter}
          onChange={e => { setRateTypeFilter(e.target.value); setPage(1); }}
          style={{ minWidth: 150 }}
        >
          <option value="">All Rate Types</option>
          {RATE_TYPES.map(t => (
            <option key={t} value={t}>{RATE_TYPE_LABELS[t]}</option>
          ))}
        </select>

        <select
          className="input-field"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ minWidth: 130 }}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['', 'Rate Code', 'Designation', 'Client', 'Tender', 'Rate Type', 'Basic Rate', 'OT Rate', 'Effective From', 'Effective To', 'Status', ''].map((h, i) => (
                  <th
                    key={`${h}-${i}`}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && [...Array(6)].map((_, i) => <SkeletonRow key={i} />)}

              {!isLoading && rates.map((rate) => {
                const rtColor = RATE_TYPE_COLORS[rate.rateType];
                const isExpanded = expandedId === rate.id;
                const rateEscalations = escalations[rate.id] ?? [];

                return (
                  <>
                    <tr
                      key={rate.id}
                      className="group transition-colors hover:bg-white/[0.015]"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    >
                      {/* Expand toggle */}
                      <td className="pl-4 pr-1 py-3 w-8">
                        <button
                          onClick={() => toggleExpand(rate.id)}
                          className="p-1 rounded hover:bg-white/5 transition-colors"
                          title={isExpanded ? 'Collapse' : 'Show escalations'}
                        >
                          {isExpanded
                            ? <ChevronUp size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
                            : <ChevronDown size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />}
                        </button>
                      </td>

                      {/* Rate Code */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Tag size={13} style={{ color: '#818cf8' }} />
                          <span className="text-sm font-mono font-medium text-white">
                            {rate.rateCode}
                          </span>
                        </div>
                      </td>

                      {/* Designation */}
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                          {rate.designation?.name ?? rate.designationId ?? '—'}
                        </span>
                      </td>

                      {/* Client */}
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {rate.client?.name ?? (rate.clientId ? rate.clientId.slice(0, 8) + '…' : '—')}
                        </span>
                      </td>

                      {/* Tender */}
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {rate.tender?.tenderNumber ?? (rate.tenderId ? rate.tenderId.slice(0, 8) + '…' : '—')}
                        </span>
                      </td>

                      {/* Rate Type */}
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={{ background: rtColor.bg, color: rtColor.color }}
                        >
                          {RATE_TYPE_LABELS[rate.rateType]}
                        </span>
                      </td>

                      {/* Basic Rate */}
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-white">{fmt(rate.basicRate)}</span>
                      </td>

                      {/* OT Rate */}
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {fmt(rate.otRate)}
                        </span>
                      </td>

                      {/* Effective From */}
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {fmtDate(rate.effectiveFrom)}
                        </span>
                      </td>

                      {/* Effective To */}
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {fmtDate(rate.effectiveTo)}
                        </span>
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={
                            rate.isActive
                              ? { background: 'rgba(16,185,129,0.12)', color: '#10b981' }
                              : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }
                          }
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: rate.isActive ? '#10b981' : 'rgba(255,255,255,0.3)' }}
                          />
                          {rate.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(rate)}
                            title="Edit"
                            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                          >
                            <Pencil size={13} style={{ color: '#818cf8' }} />
                          </button>
                          {rate.isActive && (
                            <button
                              onClick={() => handleDeactivate(rate)}
                              title="Deactivate"
                              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                            >
                              <X size={13} style={{ color: '#f43f5e' }} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* ── Escalations sub-row ── */}
                    {isExpanded && (
                      <tr key={`${rate.id}-esc`} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td colSpan={12} className="px-0 py-0">
                          <div
                            className="mx-4 my-2 rounded-xl overflow-hidden"
                            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}
                          >
                            {/* Sub-header */}
                            <div
                              className="flex items-center justify-between px-4 py-2.5"
                              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                            >
                              <div className="flex items-center gap-2">
                                <TrendingUp size={13} style={{ color: '#a78bfa' }} />
                                <span className="text-xs font-semibold uppercase tracking-wider"
                                  style={{ color: 'rgba(255,255,255,0.4)' }}>
                                  Rate Escalations
                                </span>
                              </div>
                              <button
                                onClick={() => openEscDialog(rate.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                                style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}
                              >
                                <Plus size={11} />
                                Add Escalation
                              </button>
                            </div>

                            {/* Sub-table */}
                            {escalationLoading === rate.id ? (
                              <div className="flex items-center gap-2 px-4 py-4">
                                <Loader2 size={14} className="animate-spin" style={{ color: 'rgba(255,255,255,0.3)' }} />
                                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Loading escalations…</span>
                              </div>
                            ) : rateEscalations.length === 0 ? (
                              <div className="px-4 py-5 text-center">
                                <TrendingUp size={24} className="mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.08)' }} />
                                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                  No escalations defined yet
                                </p>
                              </div>
                            ) : (
                              <table className="w-full">
                                <thead>
                                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                    {['Type', 'Value', 'Effective Date'].map(h => (
                                      <th key={h}
                                        className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider"
                                        style={{ color: 'rgba(255,255,255,0.25)' }}>
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {rateEscalations.map((esc) => (
                                    <tr key={esc.id}
                                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                      <td className="px-4 py-2.5">
                                        <span
                                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                                          style={
                                            esc.escalationType === 'PERCENTAGE'
                                              ? { background: 'rgba(167,139,250,0.12)', color: '#a78bfa' }
                                              : { background: 'rgba(16,185,129,0.10)', color: '#10b981' }
                                          }
                                        >
                                          {esc.escalationType === 'PERCENTAGE' ? 'Percentage' : 'Fixed'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-1">
                                          <DollarSign size={11} style={{ color: 'rgba(255,255,255,0.3)' }} />
                                          <span className="text-sm font-medium text-white">
                                            {esc.escalationType === 'PERCENTAGE'
                                              ? `${esc.value}%`
                                              : fmt(esc.value)}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                          {fmtDate(esc.effectiveDate)}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}

              {!isLoading && rates.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-20 text-center">
                    <Tag size={40} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                    <p className="font-medium text-white mb-1">No rates found</p>
                    <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {search || rateTypeFilter || statusFilter
                        ? 'Try adjusting your filters'
                        : 'Get started by creating your first rate'}
                    </p>
                    {!search && !rateTypeFilter && !statusFilter && (
                      <button className="btn-primary" onClick={openAdd}>
                        <Plus size={14} /> Add First Rate
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {meta && meta.totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Showing {((page - 1) * 15) + 1}–{Math.min(page * 15, meta.total)} of {meta.total} rates
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
              <span className="text-xs px-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {page} / {meta.totalPages}
              </span>
              <button
                disabled={page === meta.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
