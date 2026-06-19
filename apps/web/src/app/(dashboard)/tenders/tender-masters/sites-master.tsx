'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, MapPin, Phone, User, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { mastersApi } from '@/lib/api';

interface Site { id: string; name: string; code?: string; address?: any; contactName?: string; contactPhone?: string; }

function fmtAddress(address: any): string {
  if (!address) return '—';
  if (typeof address === 'string') return address;
  const { line1, city, state, pincode } = address as Record<string, string>;
  return [line1, city, state, pincode].filter(Boolean).join(', ') || '—';
}

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

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>{label}</label>
      {children}
    </div>
  );
}

export function SitesMaster() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Site | null>(null);
  const [form, setForm] = useState<Partial<Site>>({});
  const [addrForm, setAddrForm] = useState<{ line1: string; city: string; state: string; pincode: string }>({ line1: '', city: '', state: '', pincode: '' });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: sites = [], isLoading } = useQuery<Site[]>({ queryKey: ['masters-sites'], queryFn: mastersApi.sites });

  const saveMut = useMutation({
    mutationFn: (d: Partial<Site>) => edit ? mastersApi.updateSite(edit.id, d as any) : mastersApi.createSite(d as any),
    onSuccess: () => { toast.success(edit ? 'Site updated' : 'Site created'); qc.invalidateQueries({ queryKey: ['masters-sites'] }); setOpen(false); },
    onError: () => toast.error('Failed to save site'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => mastersApi.deleteSite(id),
    onSuccess: () => { toast.success('Site deleted'); qc.invalidateQueries({ queryKey: ['masters-sites'] }); setDeleteId(null); },
    onError: () => toast.error('Failed to delete site'),
  });

  const openAdd = () => { setEdit(null); setForm({}); setAddrForm({ line1: '', city: '', state: '', pincode: '' }); setOpen(true); };
  const openEdit = (s: Site) => {
    setEdit(s);
    setForm({ ...s });
    const addr = s.address ?? {};
    setAddrForm({ line1: addr.line1 ?? '', city: addr.city ?? '', state: addr.state ?? '', pincode: addr.pincode ?? '' });
    setOpen(true);
  };
  const save = () => {
    if (!form.name?.trim()) return toast.error('Name is required');
    const address = { line1: addrForm.line1, city: addrForm.city, state: addrForm.state, pincode: addrForm.pincode };
    saveMut.mutate({ ...form, address });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>Deployment Sites</h3>
          <p className="text-sm mt-0.5" style={{ color: 'var(--wz-text-muted)' }}>Work locations and deployment sites for tender contracts</p>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={14} /> Add Site</button>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--wz-card-border)' }}>
              {['Site Name', 'Code', 'Address', 'Contact', 'Phone', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wz-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && [...Array(4)].map((_, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--wz-card-border)' }}>
                {[...Array(6)].map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ background: 'var(--wz-input-bg)', width: '70%' }} /></td>
                ))}
              </tr>
            ))}
            {!isLoading && (sites as Site[]).map(s => (
              <tr key={s.id} className="group hover:bg-white/[0.015] transition-colors" style={{ borderBottom: '1px solid var(--wz-card-border)' }}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>
                      <MapPin size={13} />
                    </div>
                    <span className="text-sm font-medium" style={{ color: 'var(--wz-text-primary)' }}>{s.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--wz-text-muted)' }}>{s.code || '—'}</td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--wz-text-secondary)', maxWidth: 200 }}>
                  <span className="truncate block">{fmtAddress(s.address)}</span>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--wz-text-secondary)' }}>{s.contactName || '—'}</td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--wz-text-secondary)' }}>{s.contactPhone || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-white/5" title="Edit"><Pencil size={13} style={{ color: '#818cf8' }} /></button>
                    {deleteId === s.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => deleteMut.mutate(s.id)} className="px-2 py-1 rounded text-xs" style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e' }}>Confirm?</button>
                        <button onClick={() => setDeleteId(null)} className="p-1 rounded hover:bg-white/5"><X size={12} style={{ color: 'var(--wz-text-muted)' }} /></button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteId(s.id)} className="p-1.5 rounded-lg hover:bg-white/5" title="Delete"><Trash2 size={13} style={{ color: '#f43f5e' }} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && (sites as Site[]).length === 0 && (
              <tr><td colSpan={6} className="px-4 py-16 text-center">
                <MapPin size={36} className="mx-auto mb-3" style={{ color: 'var(--wz-text-muted)' }} />
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--wz-text-primary)' }}>No sites added yet</p>
                <p className="text-xs mb-4" style={{ color: 'var(--wz-text-muted)' }}>Add deployment locations for your tender contracts</p>
                <button className="btn-primary" onClick={openAdd}><Plus size={14} /> Add First Site</button>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={edit ? 'Edit Site' : 'Add Site'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <F label="Site Name *">
                <input value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="input-field w-full" placeholder="e.g. CISF Headquarters, Delhi" />
              </F>
            </div>
            <F label="Site Code">
              <input value={form.code ?? ''} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                className="input-field w-full" placeholder="e.g. CISF-HQ" />
            </F>
            <F label="Contact Name">
              <div className="relative">
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--wz-text-muted)' }} />
                <input value={form.contactName ?? ''} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                  className="input-field w-full pl-8" placeholder="Site manager" />
              </div>
            </F>
            <div className="col-span-2">
              <F label="Address Line 1">
                <input value={addrForm.line1} onChange={e => setAddrForm(a => ({ ...a, line1: e.target.value }))}
                  className="input-field w-full" placeholder="Street / Building / Area" />
              </F>
            </div>
            <div>
              <F label="City">
                <input value={addrForm.city} onChange={e => setAddrForm(a => ({ ...a, city: e.target.value }))}
                  className="input-field w-full" placeholder="e.g. New Delhi" />
              </F>
            </div>
            <div>
              <F label="State">
                <input value={addrForm.state} onChange={e => setAddrForm(a => ({ ...a, state: e.target.value }))}
                  className="input-field w-full" placeholder="e.g. Delhi" />
              </F>
            </div>
            <div>
              <F label="Pincode">
                <input value={addrForm.pincode} onChange={e => setAddrForm(a => ({ ...a, pincode: e.target.value }))}
                  className="input-field w-full" placeholder="110001" />
              </F>
            </div>
            <F label="Contact Phone">
              <div className="relative">
                <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--wz-text-muted)' }} />
                <input value={form.contactPhone ?? ''} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))}
                  className="input-field w-full pl-8" placeholder="+91 98765 43210" />
              </div>
            </F>
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-primary" onClick={save} disabled={saveMut.isPending}>
              {saveMut.isPending ? 'Saving…' : <><Check size={14} />{edit ? 'Update Site' : 'Add Site'}</>}
            </button>
            <button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
