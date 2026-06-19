'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Plus, Search, FileText, TrendingUp, Clock, AlertCircle,
  Pencil, Trash2, ChevronLeft, ChevronRight, Building2,
  Tag, Layers, Globe, Users, CheckCircle2, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';
import { tendersApi, clientsApi } from '@/lib/api';
import { CreateTenderModal } from './create-tender-modal';
import { CreateClientModal } from '../clients/create-client-modal';
import { SitesMaster } from './tender-masters/sites-master';
import { DesignationsMaster } from './tender-masters/designations-master';
import { RateMasterPanel } from './tender-masters/rate-master';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_FILTERS = ['ALL', 'ACTIVE', 'DRAFT', 'AWARDED', 'SUBMITTED', 'COMPLETED', 'EXPIRED'];

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; description: string }> = {
  DRAFT:            { color: '#64748b', bg: 'rgba(100,116,139,0.1)', label: 'Draft',           description: 'Tender is being prepared, not yet submitted' },
  SUBMITTED:        { color: '#818cf8', bg: 'rgba(99,102,241,0.12)', label: 'Submitted',        description: 'Bid submitted to the client, awaiting evaluation' },
  UNDER_EVALUATION: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Under Evaluation', description: 'Client is evaluating the submitted bid' },
  AWARDED:          { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', label: 'Awarded',          description: 'Contract awarded; work order pending' },
  ACTIVE:           { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Active',            description: 'Contract is live and work is in progress' },
  COMPLETED:        { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: 'Completed',         description: 'Contract period ended successfully' },
  CANCELLED:        { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)', label: 'Cancelled',          description: 'Tender was withdrawn or cancelled' },
  EXPIRED:          { color: '#f43f5e', bg: 'rgba(244,63,94,0.08)', label: 'Expired',            description: 'Contract period lapsed without renewal' },
};

const CONTRACT_TYPES: { value: string; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'FIXED_TERM',  label: 'Fixed Term',  description: 'Contract runs for a defined period (e.g. 1 year, 2 years). Most common for government tenders.', icon: <Clock size={18} /> },
  { value: 'OPEN_ENDED',  label: 'Open Ended',  description: 'No fixed end date. Either party may terminate with notice. Used for ongoing operational contracts.', icon: <Layers size={18} /> },
  { value: 'ANNUAL',      label: 'Annual',      description: 'Renewed each financial year (Apr–Mar). Typically follows government budget cycles.', icon: <CheckCircle2 size={18} /> },
  { value: 'MULTI_YEAR',  label: 'Multi-Year',  description: 'Spans 3–5 years with built-in renewal clauses. Suitable for large infrastructure projects.', icon: <TrendingUp size={18} /> },
];

const TYPE_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  GOVERNMENT_DEPARTMENT: { color: '#6366f1', bg: 'rgba(99,102,241,0.12)',  label: 'Government Dept' },
  PSU:                   { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  label: 'PSU' },
  PRIVATE_ORGANIZATION:  { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Private Org' },
  MUNICIPAL_BODY:        { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Municipal Body' },
};

type Section = 'list' | 'masters';
type MastersTab = 'clients' | 'sites' | 'designations' | 'rate-master' | 'status' | 'contract-types';

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TendersPage() {
  const router = useRouter();
  const [section, setSection] = useState<Section>('list');
  const [mastersTab, setMastersTab] = useState<MastersTab>('clients');

  // Tender list state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [showTenderModal, setShowTenderModal] = useState(false);
  const [editTender, setEditTender] = useState<Record<string, any> | null>(null);

  // Client master state
  const [clientSearch, setClientSearch] = useState('');
  const [clientPage, setClientPage] = useState(1);
  const [showClientModal, setShowClientModal] = useState(false);
  const [editClient, setEditClient] = useState<Record<string, any> | null>(null);

  const qc = useQueryClient();

  // ── Tender queries ──
  const { data: dash } = useQuery({ queryKey: ['tender-dash'], queryFn: tendersApi.dashboard });
  const { data, isLoading } = useQuery({
    queryKey: ['tenders', { search, status, page }],
    queryFn: () => tendersApi.list({ search: search || undefined, status: status === 'ALL' ? undefined : status, page, limit: 15 }),
  });

  // ── Client queries (preloaded so tender-form dropdown is instant) ──
  const { data: clientsAll = [] } = useQuery({
    queryKey: ['clients-select-all'],
    queryFn: clientsApi.selectAll,
    staleTime: 0, // always fresh — ensures post-seed data shows immediately
  });
  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients-master', { clientSearch, clientPage }],
    queryFn: () => clientsApi.list({ search: clientSearch || undefined, page: clientPage, limit: 12 }),
    enabled: section === 'masters' && mastersTab === 'clients',
  });

  // ── Mutations ──
  const deleteTenderMut = useMutation({
    mutationFn: (id: string) => tendersApi.remove(id),
    onSuccess: () => { toast.success('Tender removed'); qc.invalidateQueries({ queryKey: ['tenders'] }); qc.invalidateQueries({ queryKey: ['tender-dash'] }); },
    onError: () => toast.error('Failed to remove tender'),
  });
  const deleteClientMut = useMutation({
    mutationFn: (id: string) => clientsApi.remove(id),
    onSuccess: () => { toast.success('Client removed'); qc.invalidateQueries({ queryKey: ['clients'] }); qc.invalidateQueries({ queryKey: ['clients-select-all'] }); qc.invalidateQueries({ queryKey: ['clients-master'] }); },
    onError: () => toast.error('Failed to remove client'),
  });

  const tenders = (data as any)?.data ?? [];
  const meta = (data as any)?.meta;
  const clients = (clientsData as any)?.data ?? [];
  const clientMeta = (clientsData as any)?.meta;

  const statCards = [
    { label: 'Active Tenders', value: (dash as any)?.active ?? 0, icon: FileText, color: '#6366f1' },
    { label: 'Expiring Soon',  value: (dash as any)?.upcoming ?? 0, icon: Clock, color: '#f59e0b' },
    { label: 'Expired',        value: (dash as any)?.expired ?? 0, icon: AlertCircle, color: '#f43f5e' },
    { label: 'Total Value',    value: formatCurrency(tenders.reduce((s: number, t: any) => s + Number(t.tenderValue || 0), 0)), icon: TrendingUp, color: '#10b981', isText: true },
  ];

  const MASTERS_TABS: { id: MastersTab; label: string; icon: React.ReactNode }[] = [
    { id: 'clients',        label: 'Clients',             icon: <Building2 size={14} /> },
    { id: 'sites',          label: 'Sites',               icon: <Globe size={14} /> },
    { id: 'designations',   label: 'Designations',        icon: <Users size={14} /> },
    { id: 'rate-master',    label: 'Rate Master',         icon: <Tag size={14} /> },
    { id: 'status',         label: 'Status Types',        icon: <CheckCircle2 size={14} /> },
    { id: 'contract-types', label: 'Contract Types',      icon: <Layers size={14} /> },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <CreateTenderModal open={showTenderModal} onClose={() => { setShowTenderModal(false); setEditTender(null); }} tender={editTender} clientsAll={clientsAll as any[]} />
      <CreateClientModal open={showClientModal} onClose={() => { setShowClientModal(false); setEditClient(null); qc.invalidateQueries({ queryKey: ['clients-select-all'] }); }} client={editClient} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>Tenders</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--wz-text-muted)' }}>Manage government contracts, bids, and work orders</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditTender(null); setShowTenderModal(true); }}>
          <Plus size={16} /> New Tender
        </button>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--wz-input-bg)', border: '1px solid var(--wz-card-border)' }}>
        {([['list', 'Tenders List', <FileText size={14} />], ['masters', 'Masters', <Layers size={14} />]] as const).map(([id, label, icon]) => (
          <button key={id} onClick={() => setSection(id as Section)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: section === id ? '#6366f1' : 'transparent',
              color: section === id ? '#fff' : 'var(--wz-text-secondary)',
            }}>
            {icon}{label}
          </button>
        ))}
      </div>

      {/* ── TENDERS LIST ── */}
      {section === 'list' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }} className="glass-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--wz-text-muted)' }}>{s.label}</p>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${s.color}15`, color: s.color }}><s.icon size={15} /></div>
                </div>
                <p className="text-2xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>{s.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Filters */}
          <div className="glass-card p-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-52">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--wz-text-muted)' }} />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search tenders..." className="input-field w-full pl-9" />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {STATUS_FILTERS.map(s => (
                <button key={s} onClick={() => { setStatus(s); setPage(1); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: status === s ? 'rgba(99,102,241,0.2)' : 'var(--wz-btn-secondary-bg)',
                    color: status === s ? '#818cf8' : 'var(--wz-text-secondary)',
                    border: `1px solid ${status === s ? 'rgba(99,102,241,0.35)' : 'transparent'}`,
                  }}>
                  {s === 'ALL' ? 'All' : STATUS_CONFIG[s]?.label ?? s}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--wz-card-border)' }}>
                  {['Tender', 'Client', 'Value', 'Start Date', 'End Date', 'Employees', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wz-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading && [...Array(5)].map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--wz-card-border)' }}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded animate-pulse" style={{ background: 'var(--wz-input-bg)', width: j === 0 ? '80%' : '60%' }} />
                      </td>
                    ))}
                  </tr>
                ))}
                {!isLoading && tenders.map((t: any) => {
                  const cfg = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.DRAFT;
                  return (
                    <tr key={t.id} className="group hover:bg-white/[0.015] transition-colors" style={{ borderBottom: '1px solid var(--wz-card-border)' }}>
                      <td className="px-4 py-3 cursor-pointer" onClick={() => router.push(`/tenders/${t.id}`)}>
                        <p className="text-sm font-medium hover:text-indigo-400 transition-colors" style={{ color: 'var(--wz-text-primary)' }}>{t.tenderName}</p>
                        <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--wz-text-muted)' }}>{t.tenderNumber}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm" style={{ color: 'var(--wz-text-secondary)' }}>{t.department?.name ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium" style={{ color: '#10b981' }}>{formatCurrency(t.tenderValue)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm" style={{ color: 'var(--wz-text-muted)' }}>{formatDate(t.startDate)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm" style={{ color: 'var(--wz-text-muted)' }}>{formatDate(t.endDate)}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <p className="text-sm" style={{ color: 'var(--wz-text-secondary)' }}>{t.requiredEmployees ?? 0}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={{ background: cfg.bg, color: cfg.color }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />{cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => router.push(`/tenders/${t.id}`)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" title="View Details">
                            <Eye size={13} style={{ color: '#10b981' }} />
                          </button>
                          <button onClick={() => { setEditTender(t); setShowTenderModal(true); }} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" title="Edit">
                            <Pencil size={13} style={{ color: '#818cf8' }} />
                          </button>
                          <button onClick={() => { if (confirm(`Remove "${t.tenderName}"?`)) deleteTenderMut.mutate(t.id); }} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" title="Delete">
                            <Trash2 size={13} style={{ color: '#f43f5e' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!isLoading && tenders.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-20 text-center">
                    <FileText size={40} className="mx-auto mb-3" style={{ color: 'var(--wz-text-muted)' }} />
                    <p className="font-medium mb-1" style={{ color: 'var(--wz-text-primary)' }}>No tenders found</p>
                    <p className="text-sm mb-4" style={{ color: 'var(--wz-text-muted)' }}>
                      {search || status !== 'ALL' ? 'Try adjusting your filters' : 'Start by creating your first tender'}
                    </p>
                    {!search && status === 'ALL' && (
                      <button className="btn-primary" onClick={() => { setEditTender(null); setShowTenderModal(true); }}>
                        <Plus size={14} /> Create First Tender
                      </button>
                    )}
                  </td></tr>
                )}
              </tbody>
            </table>
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--wz-card-border)' }}>
                <p className="text-xs" style={{ color: 'var(--wz-text-muted)' }}>
                  Showing {((page - 1) * 15) + 1}–{Math.min(page * 15, meta.total)} of {meta.total} tenders
                </p>
                <div className="flex items-center gap-1">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors">
                    <ChevronLeft size={16} style={{ color: 'var(--wz-text-secondary)' }} />
                  </button>
                  <span className="text-xs px-2" style={{ color: 'var(--wz-text-muted)' }}>{page}/{meta.totalPages}</span>
                  <button disabled={page === meta.totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors">
                    <ChevronRight size={16} style={{ color: 'var(--wz-text-secondary)' }} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── MASTERS ── */}
      {section === 'masters' && (
        <div className="space-y-5">
          {/* Masters sub-tabs */}
          <div className="glass-card p-1 flex gap-1 w-fit">
            {MASTERS_TABS.map(t => (
              <button key={t.id} onClick={() => setMastersTab(t.id)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: mastersTab === t.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                  color: mastersTab === t.id ? '#818cf8' : 'var(--wz-text-secondary)',
                  border: mastersTab === t.id ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                }}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {/* ── Client / Department ── */}
          {mastersTab === 'clients' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>Client / Department</h3>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--wz-text-muted)' }}>Government departments, PSUs, and private organizations linked to tenders</p>
                </div>
                <button className="btn-primary" onClick={() => { setEditClient(null); setShowClientModal(true); }}>
                  <Plus size={14} /> Add Client
                </button>
              </div>

              {/* Search */}
              <div className="relative max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--wz-text-muted)' }} />
                <input value={clientSearch} onChange={e => { setClientSearch(e.target.value); setClientPage(1); }}
                  placeholder="Search clients..." className="input-field w-full pl-9" />
              </div>

              {/* Client table */}
              <div className="glass-card overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--wz-card-border)' }}>
                      {['Client Name', 'Type', 'GSTIN', 'City', 'Tenders', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wz-text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {clientsLoading && [...Array(4)].map((_, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--wz-card-border)' }}>
                        {[...Array(6)].map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ background: 'var(--wz-input-bg)', width: '70%' }} /></td>
                        ))}
                      </tr>
                    ))}
                    {!clientsLoading && clients.map((c: any) => {
                      const tc = TYPE_COLORS[c.clientType] ?? TYPE_COLORS.PRIVATE_ORGANIZATION;
                      return (
                        <tr key={c.id} className="group hover:bg-white/[0.015] transition-colors" style={{ borderBottom: '1px solid var(--wz-card-border)' }}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${tc.color}15`, color: tc.color }}>
                                <Building2 size={14} />
                              </div>
                              <div>
                                <p className="text-sm font-medium" style={{ color: 'var(--wz-text-primary)' }}>{c.name}</p>
                                {c.shortName && <p className="text-xs" style={{ color: 'var(--wz-text-muted)' }}>{c.shortName}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: tc.bg, color: tc.color }}>{tc.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs font-mono" style={{ color: 'var(--wz-text-secondary)' }}>{c.gstin ?? '—'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm" style={{ color: 'var(--wz-text-secondary)' }}>{(c.address as any)?.city ?? c.city ?? '—'}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-medium" style={{ color: '#6366f1' }}>{c._count?.tenders ?? 0}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditClient(c); setShowClientModal(true); }} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" title="Edit">
                                <Pencil size={13} style={{ color: '#818cf8' }} />
                              </button>
                              <button onClick={() => { if (confirm(`Remove client "${c.name}"?`)) deleteClientMut.mutate(c.id); }} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" title="Delete">
                                <Trash2 size={13} style={{ color: '#f43f5e' }} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!clientsLoading && clients.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-16 text-center">
                        <Building2 size={36} className="mx-auto mb-3" style={{ color: 'var(--wz-text-muted)' }} />
                        <p className="font-medium mb-1" style={{ color: 'var(--wz-text-primary)' }}>No clients found</p>
                        <p className="text-sm mb-4" style={{ color: 'var(--wz-text-muted)' }}>Add your first government department or client</p>
                        <button className="btn-primary" onClick={() => { setEditClient(null); setShowClientModal(true); }}>
                          <Plus size={14} /> Add Client
                        </button>
                      </td></tr>
                    )}
                  </tbody>
                </table>
                {clientMeta && clientMeta.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--wz-card-border)' }}>
                    <p className="text-xs" style={{ color: 'var(--wz-text-muted)' }}>
                      Showing {((clientPage - 1) * 12) + 1}–{Math.min(clientPage * 12, clientMeta.total)} of {clientMeta.total} clients
                    </p>
                    <div className="flex items-center gap-1">
                      <button disabled={clientPage === 1} onClick={() => setClientPage(p => p - 1)} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors">
                        <ChevronLeft size={16} style={{ color: 'var(--wz-text-secondary)' }} />
                      </button>
                      <span className="text-xs px-2" style={{ color: 'var(--wz-text-muted)' }}>{clientPage}/{clientMeta.totalPages}</span>
                      <button disabled={clientPage === clientMeta.totalPages} onClick={() => setClientPage(p => p + 1)} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors">
                        <ChevronRight size={16} style={{ color: 'var(--wz-text-secondary)' }} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Sites ── */}
          {mastersTab === 'sites' && <SitesMaster />}

          {/* ── Designations ── */}
          {mastersTab === 'designations' && <DesignationsMaster />}

          {/* ── Rate Master ── */}
          {mastersTab === 'rate-master' && <RateMasterPanel />}

          {/* ── Status Types ── */}
          {mastersTab === 'status' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>Tender Status Types</h3>
                <p className="text-sm mt-0.5" style={{ color: 'var(--wz-text-muted)' }}>Reference guide for all tender lifecycle statuses</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <div key={key} className="glass-card p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--wz-text-secondary)' }}>{cfg.description}</p>
                    <p className="text-xs font-mono" style={{ color: 'var(--wz-text-muted)' }}>{key}</p>
                  </div>
                ))}
              </div>
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>
                    <Tag size={15} />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--wz-text-primary)' }}>Typical Tender Lifecycle</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {['DRAFT', 'SUBMITTED', 'UNDER_EVALUATION', 'AWARDED', 'ACTIVE', 'COMPLETED'].map((s, i, arr) => (
                        <div key={s} className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: STATUS_CONFIG[s].bg, color: STATUS_CONFIG[s].color }}>{STATUS_CONFIG[s].label}</span>
                          {i < arr.length - 1 && <span style={{ color: 'var(--wz-text-muted)' }}>→</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Contract Types ── */}
          {mastersTab === 'contract-types' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>Contract Types</h3>
                <p className="text-sm mt-0.5" style={{ color: 'var(--wz-text-muted)' }}>Reference guide for contract duration and renewal structures</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {CONTRACT_TYPES.map((ct, i) => (
                  <div key={ct.value} className="glass-card p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: ['rgba(99,102,241,0.12)', 'rgba(59,130,246,0.12)', 'rgba(16,185,129,0.12)', 'rgba(245,158,11,0.12)'][i], color: ['#6366f1', '#3b82f6', '#10b981', '#f59e0b'][i] }}>
                        {ct.icon}
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: 'var(--wz-text-primary)' }}>{ct.label}</p>
                        <p className="text-xs font-mono" style={{ color: 'var(--wz-text-muted)' }}>{ct.value}</p>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--wz-text-secondary)' }}>{ct.description}</p>
                  </div>
                ))}
              </div>
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>
                    <Layers size={15} />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--wz-text-primary)' }}>Usage in government tenders</p>
                    <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--wz-text-secondary)' }}>
                      Most central government and PSU tenders use <strong>Fixed Term</strong> (1–3 years). Municipal bodies often prefer <strong>Annual</strong> contracts tied to their budget year. <strong>Multi-Year</strong> contracts are common for large infra projects (airports, highways).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
