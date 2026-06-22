'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Plus, Search, Building2, Users, Phone, Mail,
  Pencil, Trash2, ChevronLeft, ChevronRight, Globe, TrendingUp,
  LayoutList, Settings2, Contact,
} from 'lucide-react';
import { toast } from 'sonner';
import { clientsApi } from '@/lib/api';
import { CreateClientModal } from './create-client-modal';
import { ClientTypeMaster } from './client-type-master';
import { ContactsMaster } from './contacts-master';
import { RateMasterPanel } from '../tenders/tender-masters/rate-master';

const TYPE_COLORS: Record<string, { color: string; bg: string; short: string }> = {
  GOVERNMENT_DEPARTMENT: { color: '#6366f1', bg: 'rgba(99,102,241,0.12)', short: 'Govt' },
  PSU:                   { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', short: 'PSU' },
  PRIVATE_ORGANIZATION:  { color: '#10b981', bg: 'rgba(16,185,129,0.12)', short: 'Private' },
  MUNICIPAL_BODY:        { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', short: 'Municipal' },
};

export default function ClientsPage() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editClient, setEditClient] = useState<Record<string, any> | null>(null);
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [activeTab, setActiveTab] = useState<'clients' | 'masters' | 'contacts' | 'rate-master'>('clients');
  const qc = useQueryClient();

  useEffect(() => {
    if (searchParams.get('create') === 'true') setShowModal(true);
  }, [searchParams]);

  const { data: dash } = useQuery({ queryKey: ['clients-dash'], queryFn: clientsApi.dashboard });
  const { data: clientsAll = [] } = useQuery({ queryKey: ['clients-select-all'], queryFn: clientsApi.selectAll });
  const { data, isLoading } = useQuery({
    queryKey: ['clients', { search, page }],
    queryFn: () => clientsApi.list({ search: search || undefined, page, limit: 12 }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => clientsApi.remove(id),
    onSuccess: () => {
      toast.success('Client removed');
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['clients-dash'] });
    },
    onError: () => toast.error('Failed to remove client'),
  });

  const clients = (data as any)?.data ?? [];
  const meta = (data as any)?.meta;

  const handleClose = () => { setShowModal(false); setEditClient(null); };
  const handleEdit = (c: any) => { setEditClient(c); setShowModal(true); };
  const handleDelete = (c: any) => { if (confirm(`Remove client "${c.name}"?`)) deleteMut.mutate(c.id); };

  const statCards = [
    { label: 'Total Clients', value: (dash as any)?.total ?? 0, color: '#6366f1', icon: Building2 },
    { label: 'Govt Depts', value: (dash as any)?.govt ?? 0, color: '#818cf8', icon: Globe },
    { label: 'PSUs', value: (dash as any)?.psu ?? 0, color: '#3b82f6', icon: TrendingUp },
    { label: 'Private', value: (dash as any)?.private ?? 0, color: '#10b981', icon: Users },
  ];

  return (
    <div className="space-y-6">
      <CreateClientModal open={showModal} onClose={handleClose} client={editClient} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>Clients</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--wz-text-muted)' }}>Government departments, PSUs, and private organizations</p>
        </div>
        {activeTab === 'clients' && (
          <div className="flex gap-2">
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              {(['grid', 'table'] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className="px-3 py-1.5 text-xs transition-colors"
                  style={{ background: view === v ? 'rgba(99,102,241,0.2)' : 'transparent', color: view === v ? '#818cf8' : 'rgba(255,255,255,0.4)' }}>
                  {v === 'grid' ? '⊞ Grid' : '☰ Table'}
                </button>
              ))}
            </div>
            <button className="btn-primary" onClick={() => { setEditClient(null); setShowModal(true); }}>
              <Plus size={16} /> Add Client
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', width: 'fit-content' }}>
        {([
          { key: 'clients',     label: 'All Clients',  icon: LayoutList },
          { key: 'contacts',    label: 'Contacts',     icon: Users },
          { key: 'rate-master', label: 'Rate Master',  icon: TrendingUp },
          { key: 'masters',     label: 'Type Config',  icon: Settings2 },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all"
            style={{
              background: activeTab === key ? 'rgba(99,102,241,0.18)' : 'transparent',
              color: activeTab === key ? '#818cf8' : 'rgba(255,255,255,0.35)',
              border: activeTab === key ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
            }}>
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Masters tab */}
      {activeTab === 'masters' && (
        <ClientTypeMaster dashboard={(dash as any) ?? null} />
      )}

      {/* Contacts tab */}
      {activeTab === 'contacts' && (
        <ContactsMaster clients={(clientsAll as any[] ?? []).map((c: any) => ({ id: c.id, name: c.name }))} />
      )}

      {/* Rate Master tab */}
      {activeTab === 'rate-master' && <RateMasterPanel />}

      {/* Clients tab content */}
      {activeTab === 'clients' && (<>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--wz-text-muted)' }}>{s.label}</p>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${s.color}15`, color: s.color }}><s.icon size={15} /></div>
            </div>
            <p className="text-2xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search clients by name..." className="input-field w-full pl-9" />
        </div>
      </div>

      {/* Grid View */}
      {view === 'grid' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading && [...Array(6)].map((_, i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-5 w-32 rounded mb-3" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="h-3 w-24 rounded mb-2" style={{ background: 'rgba(255,255,255,0.04)' }} />
              <div className="h-3 w-20 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
          ))}
          {!isLoading && clients.map((c: any) => {
            const tc = TYPE_COLORS[c.clientType] ?? TYPE_COLORS.PRIVATE_ORGANIZATION;
            return (
              <motion.div key={c.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-5 group relative">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: tc.bg, border: `1px solid ${tc.color}20` }}>
                    <Building2 size={18} style={{ color: tc.color }} />
                  </div>
                  <span className="text-xs px-2 py-1 rounded-lg font-medium" style={{ background: tc.bg, color: tc.color }}>
                    {tc.short}
                  </span>
                </div>
                <h3 className="font-semibold text-sm mb-1 leading-snug" style={{ color: 'var(--wz-text-primary)' }}>{c.name}</h3>
                <div className="space-y-1 mt-3">
                  {c.phone && <p className="text-xs flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}><Phone size={11} />{c.phone}</p>}
                  {c.email && <p className="text-xs flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}><Mail size={11} />{c.email}</p>}
                </div>
                <div className="flex items-center gap-3 mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {c._count?.tenders ?? 0} tenders
                  </span>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {c._count?.contacts ?? 0} contacts
                  </span>
                  <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(c)} className="p-1.5 rounded hover:bg-white/5"><Pencil size={12} style={{ color: '#818cf8' }} /></button>
                    <button onClick={() => handleDelete(c)} className="p-1.5 rounded hover:bg-white/5"><Trash2 size={12} style={{ color: '#f43f5e' }} /></button>
                  </div>
                </div>
              </motion.div>
            );
          })}
          {!isLoading && clients.length === 0 && (
            <div className="col-span-3 py-20 text-center">
              <Building2 size={40} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
              <p className="font-medium mb-1" style={{ color: 'var(--wz-text-primary)' }}>No clients yet</p>
              <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Add your first government department or client</p>
              <button className="btn-primary" onClick={() => { setEditClient(null); setShowModal(true); }}><Plus size={14} /> Add Client</button>
            </div>
          )}
        </div>
      )}

      {/* Table View */}
      {view === 'table' && (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['Client Name', 'Type', 'Phone', 'Email', 'Tenders', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && [...Array(4)].map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  {[...Array(6)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} /></td>)}
                </tr>
              ))}
              {!isLoading && clients.map((c: any) => {
                const tc = TYPE_COLORS[c.clientType] ?? TYPE_COLORS.PRIVATE_ORGANIZATION;
                return (
                  <tr key={c.id} className="group hover:bg-white/[0.015] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium" style={{ color: 'var(--wz-text-primary)' }}>{c.name}</p>
                      {c.gstin && <p className="text-xs font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>GST: {c.gstin}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded-lg font-medium" style={{ background: tc.bg, color: tc.color }}>{tc.short}</span>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{c.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{c.email ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>{c._count?.tenders ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(c)} className="p-1.5 rounded hover:bg-white/5"><Pencil size={13} style={{ color: '#818cf8' }} /></button>
                        <button onClick={() => handleDelete(c)} className="p-1.5 rounded hover:bg-white/5"><Trash2 size={13} style={{ color: '#f43f5e' }} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Showing {((page-1)*12)+1}–{Math.min(page*12, meta.total)} of {meta.total}
          </p>
          <div className="flex gap-1">
            <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30"><ChevronLeft size={16} style={{ color: 'rgba(255,255,255,0.5)' }} /></button>
            <span className="text-xs px-2 py-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{page}/{meta.totalPages}</span>
            <button disabled={page===meta.totalPages} onClick={() => setPage(p=>p+1)} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30"><ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.5)' }} /></button>
          </div>
        </div>
      )}
      </>)}
    </div>
  );
}
