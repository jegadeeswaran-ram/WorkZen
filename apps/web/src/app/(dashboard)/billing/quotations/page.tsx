'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { quotationApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  DRAFT:    { color: 'rgba(255,255,255,0.45)', bg: 'rgba(255,255,255,0.06)', label: 'Draft' },
  SENT:     { color: '#818cf8', bg: 'rgba(99,102,241,0.12)', label: 'Sent' },
  ACCEPTED: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Accepted' },
  REJECTED: { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)', label: 'Rejected' },
  EXPIRED:  { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', label: 'Expired' },
};

const SkeletonRow = () => (
  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
    {[...Array(7)].map((_, j) => (
      <td key={j} className="px-4 py-3">
        <div className="h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)', width: j === 0 ? '60%' : '80%' }} />
      </td>
    ))}
  </tr>
);

export default function QuotationsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [clientSearch, setClientSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', page, statusFilter, clientSearch],
    queryFn: () => quotationApi.list({ page, limit: 15, status: statusFilter || undefined, clientSearch: clientSearch || undefined }),
  });

  const quotations: any[] = (data as any)?.data ?? [];
  const meta = (data as any)?.meta;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>Quotations</h2>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Create and manage client quotations</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => router.push('/billing/quotations/new')}>
          <Plus size={16} /> New Quotation
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <Filter size={13} style={{ color: 'rgba(255,255,255,0.35)' }} />
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-transparent text-sm outline-none"
              style={{ color: statusFilter ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)' }}>
              <option value="">All Status</option>
              {Object.entries(STATUS_CFG).map(([v, cfg]) => <option key={v} value={v}>{cfg.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 min-w-[180px]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <Search size={13} style={{ color: 'rgba(255,255,255,0.35)' }} />
            <input value={clientSearch} onChange={e => { setClientSearch(e.target.value); setPage(1); }}
              className="bg-transparent text-sm outline-none flex-1"
              style={{ color: 'rgba(255,255,255,0.85)' }}
              placeholder="Search client..." />
          </div>
          {(statusFilter || clientSearch) && (
            <button onClick={() => { setStatusFilter(''); setClientSearch(''); setPage(1); }}
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{ color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)' }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['Quotation No.', 'Client', 'Tender', 'Issue Date', 'Valid Until', 'Total', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && [...Array(6)].map((_, i) => <SkeletonRow key={i} />)}
              {!isLoading && quotations.map((q: any) => {
                const cfg = STATUS_CFG[q.status] ?? STATUS_CFG.DRAFT;
                return (
                  <motion.tr key={q.id}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.015)' }}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    onClick={() => router.push(`/billing/quotations/${q.id}`)}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-mono font-medium" style={{ color: '#38bdf8' }}>{q.quotationNo}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-white">{q.client?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{q.tender?.tenderName ?? '—'}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.5)' }}>{formatDate(q.issueDate)}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.5)' }}>{formatDate(q.validUntil)}</td>
                    <td className="px-4 py-3 text-sm font-semibold whitespace-nowrap" style={{ color: '#10b981' }}>{formatCurrency(Number(q.totalAmount))}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                        style={{ background: cfg.bg, color: cfg.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
                        {cfg.label}
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
              {!isLoading && quotations.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-20 text-center">
                    <FileText size={40} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                    <p className="font-medium text-white mb-1">No quotations found</p>
                    <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {statusFilter || clientSearch ? 'Try adjusting your filters' : 'Create your first quotation'}
                    </p>
                    {!statusFilter && !clientSearch && (
                      <button className="btn-primary flex items-center gap-2 mx-auto"
                        onClick={() => router.push('/billing/quotations/new')}>
                        <Plus size={14} /> New Quotation
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{meta.total} quotations</p>
            <div className="flex gap-1 items-center">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30">
                <ChevronLeft size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
              <span className="text-xs px-2 py-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {page} / {meta.totalPages}
              </span>
              <button disabled={page === meta.totalPages} onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30">
                <ChevronRight size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
