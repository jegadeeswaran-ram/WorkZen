'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, User, Phone, Mail, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { clientsApi } from '@/lib/api';

interface Contact {
  id: string; name: string; designation?: string; email?: string;
  phone?: string; isPrimary?: boolean; clientId: string;
  client?: { name: string };
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

interface Props { clients: { id: string; name: string }[] }

export function ContactsMaster({ clients }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Contact | null>(null);
  const [form, setForm] = useState<Partial<Contact>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterClientId, setFilterClientId] = useState('');

  const { data: allContacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ['all-contacts'],
    queryFn: () => clientsApi.listAllContacts(),
  });

  const contacts = filterClientId
    ? (allContacts as Contact[]).filter(c => c.clientId === filterClientId)
    : (allContacts as Contact[]);

  const saveMut = useMutation({
    mutationFn: (d: Partial<Contact>) =>
      edit
        ? clientsApi.updateContact(edit.clientId, edit.id, d as any)
        : clientsApi.createContact(d.clientId!, d as any),
    onSuccess: () => {
      toast.success(edit ? 'Contact updated' : 'Contact created');
      qc.invalidateQueries({ queryKey: ['all-contacts'] });
      setOpen(false);
    },
    onError: () => toast.error('Failed to save contact'),
  });

  const deleteMut = useMutation({
    mutationFn: ({ clientId, id }: { clientId: string; id: string }) =>
      clientsApi.deleteContact(clientId, id),
    onSuccess: () => {
      toast.success('Contact deleted');
      qc.invalidateQueries({ queryKey: ['all-contacts'] });
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to delete'),
  });

  const openAdd = () => { setEdit(null); setForm({ isPrimary: false }); setOpen(true); };
  const openEdit = (c: Contact) => { setEdit(c); setForm({ ...c }); setOpen(true); };
  const save = () => {
    if (!form.name?.trim()) return toast.error('Name is required');
    if (!form.clientId) return toast.error('Select a client');
    saveMut.mutate(form);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>Client Contacts</h3>
          <p className="text-sm mt-0.5" style={{ color: 'var(--wz-text-muted)' }}>Key contacts and point-of-contact persons for each client</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={filterClientId} onChange={e => setFilterClientId(e.target.value)} className="input-field text-sm" style={{ minWidth: 160 }}>
            <option value="">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="btn-primary" onClick={openAdd}><Plus size={14} /> Add Contact</button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--wz-card-border)' }}>
              {['Contact Name', 'Client', 'Designation', 'Phone', 'Email', 'Primary', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wz-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && [...Array(3)].map((_, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--wz-card-border)' }}>
                {[...Array(7)].map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ background: 'var(--wz-input-bg)', width: '70%' }} /></td>
                ))}
              </tr>
            ))}
            {!isLoading && contacts.map(c => (
              <tr key={c.id} className="group hover:bg-white/[0.015] transition-colors" style={{ borderBottom: '1px solid var(--wz-card-border)' }}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                      {c.name[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-medium" style={{ color: 'var(--wz-text-primary)' }}>{c.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--wz-text-secondary)' }}>{c.client?.name || '—'}</td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--wz-text-muted)' }}>{c.designation || '—'}</td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--wz-text-secondary)' }}>{c.phone || '—'}</td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--wz-text-secondary)' }}>{c.email || '—'}</td>
                <td className="px-4 py-3">
                  {c.isPrimary && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>Primary</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-white/5"><Pencil size={13} style={{ color: '#818cf8' }} /></button>
                    {deleteId === c.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => deleteMut.mutate({ clientId: c.clientId, id: c.id })} className="px-2 py-1 rounded text-xs" style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e' }}>Confirm?</button>
                        <button onClick={() => setDeleteId(null)} className="p-1 rounded hover:bg-white/5"><X size={12} style={{ color: 'var(--wz-text-muted)' }} /></button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded-lg hover:bg-white/5"><Trash2 size={13} style={{ color: '#f43f5e' }} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && contacts.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-16 text-center">
                <User size={36} className="mx-auto mb-3" style={{ color: 'var(--wz-text-muted)' }} />
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--wz-text-primary)' }}>No contacts found</p>
                <p className="text-xs mb-4" style={{ color: 'var(--wz-text-muted)' }}>Add key contacts for your client organizations</p>
                <button className="btn-primary" onClick={openAdd}><Plus size={14} /> Add Contact</button>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={edit ? 'Edit Contact' : 'Add Contact'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>Client *</label>
              <select value={form.clientId ?? ''} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))} className="input-field w-full" disabled={!!edit}>
                <option value="">Select client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>Contact Name *</label>
              <div className="relative">
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--wz-text-muted)' }} />
                <input value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="input-field w-full pl-8" placeholder="e.g. Ramesh Kumar" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>Designation / Role</label>
              <input value={form.designation ?? ''} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
                className="input-field w-full" placeholder="e.g. Contract Manager" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>Phone</label>
              <div className="relative">
                <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--wz-text-muted)' }} />
                <input value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="input-field w-full pl-8" placeholder="+91 98765 43210" />
              </div>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>Email</label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--wz-text-muted)' }} />
                <input type="email" value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="input-field w-full pl-8" placeholder="contact@client.gov.in" />
              </div>
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={!!form.isPrimary} onChange={e => setForm(f => ({ ...f, isPrimary: e.target.checked }))} className="w-4 h-4 rounded" />
                <span className="text-sm" style={{ color: 'var(--wz-text-secondary)' }}>Primary contact for this client</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-primary" onClick={save} disabled={saveMut.isPending}>
              {saveMut.isPending ? 'Saving…' : <><Check size={14} />{edit ? 'Update Contact' : 'Add Contact'}</>}
            </button>
            <button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
