'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, IndianRupee, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { mastersApi } from '@/lib/api';

interface RateMaster {
  id: string; rateType: string; amount: number;
  effectiveFrom: string; effectiveTo?: string;
  isActive?: boolean; notes?: string;
  designationId?: string; designation?: { name: string };
}

const RATE_TYPES = ['BASIC', 'DA', 'HRA', 'OVERTIME', 'SPECIAL_ALLOWANCE', 'MINIMUM_WAGE', 'CTC', 'GROSS'];

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-2xl" style={{ background: 'var(--wz-card-bg)', border: '1px solid var(--wz-card-border)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--wz-card-border)' }}>
          <h3 className="font-semibold text-sm" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5"><X size={16} style={{ color: 'var(--wz-text-muted)' }} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function RateMasterPanel() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<RateMaster | null>(null);
  const [form, setForm] = useState<Partial<RateMaster> & { effectiveFrom?: string; effectiveTo?: string }>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: rates = [], isLoading } = useQuery<RateMaster[]>({
    queryKey: ['masters-rate-masters'],
    queryFn: mastersApi.rateMasters,
  });

  const { data: designations = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['masters-designations'],
    queryFn: mastersApi.designations,
  });

  const saveMut = useMutation({
    mutationFn: (d: any) =>
      edit ? mastersApi.updateRateMaster(edit.id, d) : mastersApi.createRateMaster(d),
    onSuccess: () => {
      toast.success(edit ? 'Rate updated' : 'Rate created');
      qc.invalidateQueries({ queryKey: ['masters-rate-masters'] });
      setOpen(false);
    },
    onError: () => toast.error('Failed to save rate'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => mastersApi.deleteRateMaster(id),
    onSuccess: () => {
      toast.success('Rate deleted');
      qc.invalidateQueries({ queryKey: ['masters-rate-masters'] });
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to delete'),
  });

  const openAdd = () => {
    setEdit(null);
    setForm({ rateType: 'BASIC', effectiveFrom: new Date().toISOString().slice(0, 10), isActive: true });
    setOpen(true);
  };
  const openEdit = (r: RateMaster) => {
    setEdit(r);
    setForm({ ...r, effectiveFrom: r.effectiveFrom?.slice(0, 10), effectiveTo: r.effectiveTo?.slice(0, 10) });
    setOpen(true);
  };
  const save = () => {
    if (!form.rateType || !form.amount || !form.effectiveFrom) return toast.error('Rate type, amount and effective date are required');
    saveMut.mutate({ ...form, amount: Number(form.amount) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>Rate Master</h3>
          <p className="text-sm mt-0.5" style={{ color: 'var(--wz-text-muted)' }}>Pay rates and wage structures for tender deployments</p>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={14} /> Add Rate</button>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--wz-card-border)' }}>
              {['Rate Type', 'Designation', 'Amount', 'Effective From', 'Effective To', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wz-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && [...Array(4)].map((_, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--wz-card-border)' }}>
                {[...Array(7)].map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ background: 'var(--wz-input-bg)', width: '70%' }} /></td>
                ))}
              </tr>
            ))}
            {!isLoading && (rates as RateMaster[]).map(r => (
              <tr key={r.id} className="group hover:bg-white/[0.015] transition-colors" style={{ borderBottom: '1px solid var(--wz-card-border)' }}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                      <IndianRupee size={12} />
                    </div>
                    <span className="text-sm font-medium" style={{ color: 'var(--wz-text-primary)' }}>{r.rateType}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--wz-text-secondary)' }}>{r.designation?.name || '—'}</td>
                <td className="px-4 py-3">
                  <span className="text-sm font-semibold" style={{ color: '#10b981' }}>{fmt(Number(r.amount))}</span>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--wz-text-muted)' }}>{fmtDate(r.effectiveFrom)}</td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--wz-text-muted)' }}>{fmtDate(r.effectiveTo)}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                    style={{ background: r.isActive !== false ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)', color: r.isActive !== false ? '#10b981' : '#64748b' }}>
                    {r.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-white/5" title="Edit"><Pencil size={13} style={{ color: '#818cf8' }} /></button>
                    {deleteId === r.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => deleteMut.mutate(r.id)} className="px-2 py-1 rounded text-xs" style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e' }}>Confirm?</button>
                        <button onClick={() => setDeleteId(null)} className="p-1 rounded hover:bg-white/5"><X size={12} style={{ color: 'var(--wz-text-muted)' }} /></button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteId(r.id)} className="p-1.5 rounded-lg hover:bg-white/5" title="Delete"><Trash2 size={13} style={{ color: '#f43f5e' }} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && (rates as RateMaster[]).length === 0 && (
              <tr><td colSpan={7} className="px-4 py-16 text-center">
                <IndianRupee size={36} className="mx-auto mb-3" style={{ color: 'var(--wz-text-muted)' }} />
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--wz-text-primary)' }}>No rates defined yet</p>
                <p className="text-xs mb-4" style={{ color: 'var(--wz-text-muted)' }}>Define wage rates for tender deployments</p>
                <button className="btn-primary" onClick={openAdd}><Plus size={14} /> Add Rate</button>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={edit ? 'Edit Rate' : 'Add Rate'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>Rate Type *</label>
              <select value={form.rateType ?? ''} onChange={e => setForm(f => ({ ...f, rateType: e.target.value }))} className="input-field w-full">
                <option value="">Select type</option>
                {RATE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>Amount (₹/month) *</label>
              <input type="number" value={form.amount ?? ''} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))}
                className="input-field w-full" placeholder="e.g. 18000" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>Designation (optional)</label>
              <select value={form.designationId ?? ''} onChange={e => setForm(f => ({ ...f, designationId: e.target.value || undefined }))} className="input-field w-full">
                <option value="">— All Designations —</option>
                {(designations as any[]).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>Effective From *</label>
              <input type="date" value={form.effectiveFrom ?? ''} onChange={e => setForm(f => ({ ...f, effectiveFrom: e.target.value }))} className="input-field w-full" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>Effective To</label>
              <input type="date" value={form.effectiveTo ?? ''} onChange={e => setForm(f => ({ ...f, effectiveTo: e.target.value || undefined }))} className="input-field w-full" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>Notes</label>
              <input value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="input-field w-full" placeholder="Any additional notes..." />
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={form.isActive !== false} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 rounded" />
                <span className="text-sm" style={{ color: 'var(--wz-text-secondary)' }}>Active</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-primary" onClick={save} disabled={saveMut.isPending}>
              {saveMut.isPending ? 'Saving…' : <><Check size={14} />{edit ? 'Update Rate' : 'Add Rate'}</>}
            </button>
            <button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
