'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Package,
  Wrench,
  CheckCircle2,
  User,
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Tag,
  Hash,
  DollarSign,
  Calendar,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatCurrency, statusColor } from '@/lib/utils';
import { assetsApi, employeesApi } from '@/lib/api';
import { DonutChart } from '@/components/charts/donut-chart';

// ─── Zod schema ──────────────────────────────────────────────────────────────
const assetSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  category: z.enum(['VEHICLE', 'EQUIPMENT', 'IT', 'FURNITURE', 'TOOL', 'OTHER']),
  purchaseValue: z.coerce.number().positive('Enter a valid value'),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  serialNumber: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
});
type AssetForm = z.infer<typeof assetSchema>;

const CATEGORIES = ['ALL', 'VEHICLE', 'EQUIPMENT', 'IT', 'FURNITURE', 'TOOL'];
const CAT_OPTIONS = ['VEHICLE', 'EQUIPMENT', 'IT', 'FURNITURE', 'TOOL', 'OTHER'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const inputCls =
  'w-full px-3 py-2 rounded-xl text-sm outline-none transition-colors placeholder:text-white/25 text-white/80';
const inputStyle = {
  background: 'var(--wz-input-bg)',
  border: '1px solid var(--wz-input-border)',
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AssetsPage() {
  const qc = useQueryClient();

  // Filters
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [assigningAssetId, setAssigningAssetId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  // ── Queries ──
  const { data: dashData } = useQuery({
    queryKey: ['assets-dash'],
    queryFn: assetsApi.dashboard,
  });
  const { data: allEmployees = [] } = useQuery({
    queryKey: ['employees-select-all'],
    queryFn: () => employeesApi.selectAll('ACTIVE'),
    enabled: !!assigningAssetId,
  });
  const dash = dashData as Record<string, number> | undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['assets', { category, search, page }],
    queryFn: () =>
      assetsApi.list({
        category: category === 'ALL' ? undefined : category,
        search: search || undefined,
        page,
        limit: 12,
      }),
  });

  const assets = (data as Record<string, unknown>)?.data ?? [] as Record<string, unknown>[];
  const meta = (data as Record<string, unknown>)?.meta as Record<string, number> | undefined;

  // ── Mutations ──
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssetForm>({ resolver: zodResolver(assetSchema) });

  const { mutate: createAsset, isPending: creating } = useMutation({
    mutationFn: (formData: AssetForm) => assetsApi.create(formData as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['assets-dash'] });
      toast.success('Asset added');
      setShowAddModal(false);
      reset();
    },
    onError: () => toast.error('Failed to add asset'),
  });

  const { mutate: assignAsset, isPending: assigning } = useMutation({
    mutationFn: ({ assetId, employeeId }: { assetId: string; employeeId: string }) =>
      assetsApi.assign(assetId, employeeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['assets-dash'] });
      toast.success('Asset assigned');
      setAssigningAssetId(null);
      setSelectedEmployeeId('');
    },
    onError: () => toast.error('Failed to assign'),
  });

  // ── KPI cards ──
  const kpis = [
    { label: 'Total Assets', value: dash?.total ?? 0, color: '#6366f1', icon: <Package size={16} /> },
    { label: 'Available', value: dash?.available ?? 0, color: '#10b981', icon: <CheckCircle2 size={16} /> },
    { label: 'Assigned', value: dash?.assigned ?? 0, color: '#818cf8', icon: <User size={16} /> },
    { label: 'Under Maintenance', value: dash?.underMaintenance ?? 0, color: '#f59e0b', icon: <Wrench size={16} /> },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Asset Management
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Track, assign, and maintain company assets
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={14} /> Add Asset
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="stat-card"
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="text-xs uppercase tracking-wider mb-1"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  {s.label}
                </p>
                <p
                  className="text-2xl font-bold text-white"
                  style={{ fontFamily: 'Plus Jakarta Sans' }}
                >
                  {s.value}
                </p>
              </div>
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{
                  background: `${s.color}15`,
                  color: s.color,
                  border: `1px solid ${s.color}25`,
                }}
              >
                {s.icon}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Charts row ── */}
      <div className="grid lg:grid-cols-4 gap-6">
        <div className="glass-card p-5">
          <h3
            className="font-semibold text-white mb-3"
            style={{ fontFamily: 'Plus Jakarta Sans' }}
          >
            By Category
          </h3>
          <DonutChart
            series={[42, 35, 28, 18, 12]}
            labels={['IT', 'Vehicle', 'Equipment', 'Furniture', 'Tools']}
            colors={['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']}
            height={200}
          />
        </div>
        <div className="glass-card p-5 lg:col-span-3">
          <h3
            className="font-semibold text-white mb-4"
            style={{ fontFamily: 'Plus Jakarta Sans' }}
          >
            Asset Status Overview
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Available', count: dash?.available ?? 0, color: '#10b981', pct: 50 },
              { label: 'Assigned', count: dash?.assigned ?? 0, color: '#6366f1', pct: 34 },
              { label: 'Maintenance', count: dash?.underMaintenance ?? 0, color: '#f59e0b', pct: 8 },
              { label: 'Total', count: dash?.total ?? 0, color: '#818cf8', pct: 100 },
            ].map((s) => (
              <div
                key={s.label}
                className="p-3 rounded-xl"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {s.label}
                  </p>
                  <p className="text-sm font-bold" style={{ color: s.color }}>
                    {s.count}
                  </p>
                </div>
                <div
                  className="h-1 rounded-full overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${s.pct}%`, background: s.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Asset Table ── */}
      <div className="glass-card overflow-hidden">
        {/* Filters */}
        <div
          className="p-4 border-b flex flex-wrap gap-3 items-center"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <div
            className="flex items-center gap-2 flex-1 min-w-48 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <Search size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search assets..."
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: 'rgba(255,255,255,0.7)' }}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => { setCategory(c); setPage(1); }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: category === c ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                  color: category === c ? '#818cf8' : 'rgba(255,255,255,0.4)',
                  border: `1px solid ${category === c ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Table body */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton h-14" />
              ))}
            </div>
          ) : (assets as unknown[]).length === 0 ? (
            <div className="p-12 text-center">
              <Package
                size={36}
                style={{ color: 'rgba(255,255,255,0.1)' }}
                className="mx-auto mb-2"
              />
              <p className="text-white text-sm">No assets found</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Asset Code</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Value</th>
                  <th>Location</th>
                  <th>Serial No.</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(assets as Record<string, unknown>[]).map((a, i) => (
                  <motion.tr
                    key={a.id as string}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <td>
                      <span className="font-mono text-xs" style={{ color: '#818cf8' }}>
                        {a.assetCode as string}
                      </span>
                    </td>
                    <td className="font-medium text-white text-sm">{a.name as string}</td>
                    <td>
                      <span className="badge badge-info">{a.category as string}</span>
                    </td>
                    <td style={{ color: '#fbbf24' }}>
                      {formatCurrency((a.purchaseValue as number) ?? 0)}
                    </td>
                    <td style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {(a.location as string) ?? '—'}
                    </td>
                    <td style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {(a.serialNumber as string) ?? '—'}
                    </td>
                    <td>
                      <span className={`badge ${statusColor(a.status as string)}`}>
                        {a.status as string}
                      </span>
                    </td>
                    <td>
                      {a.status === 'AVAILABLE' && (
                        <button
                          onClick={() => setAssigningAssetId(a.id as string)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                          style={{
                            background: 'rgba(99,102,241,0.15)',
                            color: '#818cf8',
                            border: '1px solid rgba(99,102,241,0.25)',
                          }}
                        >
                          Assign
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {meta && (meta.totalPages as number) > 1 && (
          <div
            className="px-4 py-3 border-t flex items-center justify-between"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {meta.total} assets
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-white/5"
              >
                <ChevronLeft size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
              <span className="text-xs px-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {page} / {meta.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages as number, p + 1))}
                disabled={page === (meta.totalPages as number)}
                className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-white/5"
              >
                <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ADD ASSET MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="glass-card w-full max-w-lg p-6 space-y-5 relative max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <button
                onClick={() => { setShowAddModal(false); reset(); }}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>

              <div>
                <h3
                  className="text-base font-bold text-white"
                  style={{ fontFamily: 'Plus Jakarta Sans' }}
                >
                  Add New Asset
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Register a new asset in the system
                </p>
              </div>

              <form onSubmit={handleSubmit((d) => createAsset(d))} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    <Tag size={11} className="inline mr-1" />Asset Name *
                  </label>
                  <input
                    {...register('name')}
                    placeholder="e.g. Dell Laptop XPS 15"
                    className={inputCls}
                    style={inputStyle}
                  />
                  {errors.name && (
                    <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>{errors.name.message}</p>
                  )}
                </div>

                {/* Category + Value row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      Category *
                    </label>
                    <select
                      {...register('category')}
                      className={inputCls}
                      style={{ ...inputStyle, appearance: 'none' }}
                    >
                      {CAT_OPTIONS.map((c) => (
                        <option key={c} value={c} style={{ background: '#1e1e2e' }}>
                          {c}
                        </option>
                      ))}
                    </select>
                    {errors.category && (
                      <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>{errors.category.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      <DollarSign size={11} className="inline mr-1" />Purchase Value *
                    </label>
                    <input
                      {...register('purchaseValue')}
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className={inputCls}
                      style={inputStyle}
                    />
                    {errors.purchaseValue && (
                      <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>{errors.purchaseValue.message}</p>
                    )}
                  </div>
                </div>

                {/* Purchase Date + Serial No row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      <Calendar size={11} className="inline mr-1" />Purchase Date *
                    </label>
                    <input
                      {...register('purchaseDate')}
                      type="date"
                      className={inputCls}
                      style={inputStyle}
                    />
                    {errors.purchaseDate && (
                      <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>{errors.purchaseDate.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      <Hash size={11} className="inline mr-1" />Serial Number
                    </label>
                    <input
                      {...register('serialNumber')}
                      placeholder="Optional"
                      className={inputCls}
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    <MapPin size={11} className="inline mr-1" />Location
                  </label>
                  <input
                    {...register('location')}
                    placeholder="e.g. Head Office – Floor 2"
                    className={inputCls}
                    style={inputStyle}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    <FileText size={11} className="inline mr-1" />Description
                  </label>
                  <textarea
                    {...register('description')}
                    rows={2}
                    placeholder="Optional notes about this asset"
                    className={inputCls}
                    style={{ ...inputStyle, resize: 'none' }}
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); reset(); }}
                    className="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      color: 'rgba(255,255,255,0.6)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="btn-primary flex-1 justify-center disabled:opacity-50"
                  >
                    {creating ? 'Adding…' : 'Add Asset'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════════
          ASSIGN ASSET MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {assigningAssetId && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="glass-card w-full max-w-sm p-6 space-y-5 relative"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <button
                onClick={() => { setAssigningAssetId(null); setEmployeeIdInput(''); }}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>

              <div>
                <h3
                  className="text-base font-bold text-white"
                  style={{ fontFamily: 'Plus Jakarta Sans' }}
                >
                  Assign Asset
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Enter the employee ID to assign this asset
                </p>
              </div>

              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  <User size={11} className="inline mr-1" />Select Employee *
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className={inputCls}
                  style={{ ...inputStyle, appearance: 'none' }}
                >
                  <option value="">— Choose employee —</option>
                  {(allEmployees as any[]).map((e: any) => (
                    <option key={e.id} value={e.id} style={{ background: '#1e1e2e' }}>
                      {e.firstName} {e.lastName} — {e.employeeCode}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setAssigningAssetId(null); setSelectedEmployeeId(''); }}
                  className="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.6)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  Cancel
                </button>
                <button
                  disabled={!selectedEmployeeId || assigning}
                  onClick={() =>
                    assignAsset({ assetId: assigningAssetId!, employeeId: selectedEmployeeId })
                  }
                  className="btn-primary flex-1 justify-center disabled:opacity-50"
                >
                  {assigning ? 'Assigning…' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
