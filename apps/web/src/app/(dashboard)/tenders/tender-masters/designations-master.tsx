'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Briefcase, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { mastersApi } from '@/lib/api';

interface Designation { id: string; name: string; code?: string; level?: number; description?: string; }

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

const LEVEL_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Executive', color: '#f43f5e' },
  2: { label: 'Senior', color: '#f59e0b' },
  3: { label: 'Mid-level', color: '#6366f1' },
  4: { label: 'Junior', color: '#10b981' },
  5: { label: 'Trainee', color: '#64748b' },
};

export function DesignationsMaster() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Designation | null>(null);
  const [form, setForm] = useState<Partial<Designation>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: designations = [], isLoading } = useQuery<Designation[]>({
    queryKey: ['masters-designations'],
    queryFn: mastersApi.designations,
  });

  const saveMut = useMutation({
    mutationFn: (d: Partial<Designation>) =>
      edit ? mastersApi.updateDesignation(edit.id, d as any) : mastersApi.createDesignation(d as any),
    onSuccess: () => {
      toast.success(edit ? 'Designation updated' : 'Designation created');
      qc.invalidateQueries({ queryKey: ['masters-designations'] });
      setOpen(false);
    },
    onError: () => toast.error('Failed to save designation'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => mastersApi.deleteDesignation(id),
    onSuccess: () => {
      toast.success('Designation deleted');
      qc.invalidateQueries({ queryKey: ['masters-designations'] });
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to delete'),
  });

  const openAdd = () => { setEdit(null); setForm({}); setOpen(true); };
  const openEdit = (d: Designation) => { setEdit(d); setForm({ ...d }); setOpen(true); };
  const save = () => {
    if (!form.name?.trim()) return toast.error('Name is required');
    saveMut.mutate(form);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>Designations</h3>
          <p className="text-sm mt-0.5" style={{ color: 'var(--wz-text-muted)' }}>Job roles and designations for deployed staff under tender contracts</p>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={14} /> Add Designation</button>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--wz-card-border)' }}>
              {['Designation', 'Code', 'Level', 'Description', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wz-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && [...Array(4)].map((_, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--wz-card-border)' }}>
                {[...Array(5)].map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ background: 'var(--wz-input-bg)', width: '70%' }} /></td>
                ))}
              </tr>
            ))}
            {!isLoading && (designations as Designation[]).map(d => {
              const lvl = LEVEL_LABELS[d.level ?? 0];
              return (
                <tr key={d.id} className="group hover:bg-white/[0.015] transition-colors" style={{ borderBottom: '1px solid var(--wz-card-border)' }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>
                        <Briefcase size={13} />
                      </div>
                      <span className="text-sm font-medium" style={{ color: 'var(--wz-text-primary)' }}>{d.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--wz-text-muted)' }}>{d.code || '—'}</td>
                  <td className="px-4 py-3">
                    {lvl ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" style={{ background: `${lvl.color}18`, color: lvl.color }}>
                        L{d.level} · {lvl.label}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--wz-text-muted)' }} className="text-sm">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--wz-text-secondary)', maxWidth: 200 }}>
                    <span className="truncate block">{d.description || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg hover:bg-white/5" title="Edit"><Pencil size={13} style={{ color: '#818cf8' }} /></button>
                      {deleteId === d.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => deleteMut.mutate(d.id)} className="px-2 py-1 rounded text-xs" style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e' }}>Confirm?</button>
                          <button onClick={() => setDeleteId(null)} className="p-1 rounded hover:bg-white/5"><X size={12} style={{ color: 'var(--wz-text-muted)' }} /></button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteId(d.id)} className="p-1.5 rounded-lg hover:bg-white/5" title="Delete"><Trash2 size={13} style={{ color: '#f43f5e' }} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!isLoading && (designations as Designation[]).length === 0 && (
              <tr><td colSpan={5} className="px-4 py-16 text-center">
                <Briefcase size={36} className="mx-auto mb-3" style={{ color: 'var(--wz-text-muted)' }} />
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--wz-text-primary)' }}>No designations added yet</p>
                <p className="text-xs mb-4" style={{ color: 'var(--wz-text-muted)' }}>Define job roles like Guard, Supervisor, Helper etc.</p>
                <button className="btn-primary" onClick={openAdd}><Plus size={14} /> Add Designation</button>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={edit ? 'Edit Designation' : 'Add Designation'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>Designation Name *</label>
              <input value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="input-field w-full" placeholder="e.g. Security Guard, Site Supervisor" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>Code</label>
              <input value={form.code ?? ''} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                className="input-field w-full" placeholder="e.g. SG" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>Level (1 = Senior, 5 = Trainee)</label>
              <select value={form.level ?? ''} onChange={e => setForm(f => ({ ...f, level: e.target.value ? Number(e.target.value) : undefined }))}
                className="input-field w-full">
                <option value="">— None —</option>
                {[1, 2, 3, 4, 5].map(l => (
                  <option key={l} value={l}>L{l} · {LEVEL_LABELS[l].label}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>Description</label>
              <input value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="input-field w-full" placeholder="Brief description of this role..." />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-primary" onClick={save} disabled={saveMut.isPending}>
              {saveMut.isPending ? 'Saving…' : <><Check size={14} />{edit ? 'Update' : 'Create'}</>}
            </button>
            <button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
