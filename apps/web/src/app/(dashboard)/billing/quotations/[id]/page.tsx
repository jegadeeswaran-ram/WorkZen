'use client';

import { useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, FileText, PenLine, X, DollarSign, Calendar,
  CheckCircle2, Clock, AlertCircle, Send, ArrowRight,
  Building2, Receipt, LayoutGrid, Eye, Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';
import { quotationApi } from '@/lib/api';
import { TemplateClassic } from '@/components/billing/templates/TemplateClassic';
import { TemplateModern } from '@/components/billing/templates/TemplateModern';
import { DocumentActions } from '@/components/billing/DocumentActions';

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { color: string; bg: string; ring: string; label: string }> = {
  DRAFT:    { color: 'rgba(255,255,255,0.55)', bg: 'rgba(255,255,255,0.06)',  ring: 'rgba(255,255,255,0.15)', label: 'Draft'    },
  SENT:     { color: '#818cf8',               bg: 'rgba(99,102,241,0.12)',   ring: 'rgba(99,102,241,0.3)',  label: 'Sent'     },
  ACCEPTED: { color: '#10b981',               bg: 'rgba(16,185,129,0.12)',   ring: 'rgba(16,185,129,0.3)', label: 'Accepted' },
  REJECTED: { color: '#f43f5e',               bg: 'rgba(244,63,94,0.12)',    ring: 'rgba(244,63,94,0.3)',  label: 'Rejected' },
  EXPIRED:  { color: '#f59e0b',               bg: 'rgba(245,158,11,0.12)',   ring: 'rgba(245,158,11,0.3)', label: 'Expired'  },
};

// ── Tabs ───────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'details', label: 'Details', icon: LayoutGrid },
  { id: 'preview', label: 'Preview', icon: Eye },
] as const;
type TabId = typeof TABS[number]['id'];

// ── Page ───────────────────────────────────────────────────────────────────────
export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const docRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [template, setTemplate]   = useState<'classic' | 'modern'>('classic');

  const { data: quotation, isLoading } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => quotationApi.get(id),
    enabled: !!id,
    staleTime: 30_000,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['quotation', id] });

  const statusMut = useMutation({
    mutationFn: (status: string) => quotationApi.update(id, { status }),
    onSuccess: () => { toast.success('Status updated'); refresh(); },
    onError: () => toast.error('Failed to update status'),
  });

  const convertMut = useMutation({
    mutationFn: () => quotationApi.convert(id),
    onSuccess: (inv: any) => {
      toast.success('Converted to invoice');
      qc.invalidateQueries({ queryKey: ['quotations'] });
      router.push(`/billing/invoices/${inv.id}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Conversion failed'),
  });

  const sendWaMut = useMutation({
    mutationFn: ({ phone, message }: { phone: string; message: string }) =>
      quotationApi.sendWhatsApp(id, phone, message),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }} />
    </div>
  );

  if (!quotation) return (
    <div className="flex flex-col items-center justify-center py-32">
      <AlertCircle size={40} className="mb-4" style={{ color: 'rgba(255,255,255,0.15)' }} />
      <p className="text-sm" style={{ color: 'var(--wz-text-muted)' }}>Quotation not found</p>
      <button onClick={() => router.back()} className="btn-secondary mt-4 flex items-center gap-2">
        <ArrowLeft size={14} /> Go back
      </button>
    </div>
  );

  const st = STATUS_CFG[quotation.status] ?? STATUS_CFG.DRAFT;
  const canEdit    = !['ACCEPTED', 'REJECTED'].includes(quotation.status);
  const canSend    = quotation.status === 'DRAFT';
  const canAccept  = quotation.status === 'SENT';
  const canReject  = ['DRAFT', 'SENT'].includes(quotation.status);
  const canConvert = !['ACCEPTED', 'REJECTED'].includes(quotation.status);

  const docData = {
    type: 'quotation' as const,
    no: quotation.quotationNo,
    issueDate: quotation.issueDate,
    validUntil: quotation.validUntil,
    status: quotation.status,
    client: quotation.client,
    tender: quotation.tender,
    lineItems: quotation.lineItems ?? [],
    subtotal: quotation.subtotal,
    discount: quotation.discount,
    taxableAmount: quotation.taxableAmount,
    cgstAmount: quotation.cgstAmount,
    sgstAmount: quotation.sgstAmount,
    igstAmount: quotation.igstAmount,
    totalAmount: quotation.totalAmount,
    notes: quotation.notes,
    termsConditions: quotation.termsConditions,
  };

  return (
    <div className="space-y-5">
      {/* Back */}
      <button onClick={() => router.back()}
        className="flex items-center gap-2 text-sm transition-colors"
        style={{ color: 'var(--wz-text-muted)' }}
        onMouseOver={e => e.currentTarget.style.color = 'var(--wz-text-secondary)'}
        onMouseOut={e => e.currentTarget.style.color = 'var(--wz-text-muted)'}>
        <ArrowLeft size={15} /> Quotations
      </button>

      {/* ── Hero card ── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden">
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0ea5e9,#6366f1,#10b981)' }} />

        <div className="p-6 flex flex-col sm:flex-row gap-4 items-start">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,rgba(14,165,233,0.18),rgba(99,102,241,0.1))', border: '1.5px solid rgba(14,165,233,0.2)' }}>
            <FileText size={20} style={{ color: '#38bdf8' }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>
                {quotation.quotationNo}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: st.bg, color: st.color, border: `1px solid ${st.ring}` }}>
                {st.label}
              </span>
            </div>
            <p className="text-sm mb-3" style={{ color: 'var(--wz-text-secondary)' }}>
              {quotation.client?.name ?? '—'}
              {quotation.tender && <span style={{ color: 'var(--wz-text-muted)' }}> · {quotation.tender.tenderName}</span>}
            </p>
            <div className="flex flex-wrap gap-4 text-xs" style={{ color: 'var(--wz-text-muted)' }}>
              <span className="flex items-center gap-1.5"><Calendar size={11} /> Issue: {formatDate(quotation.issueDate)}</span>
              {quotation.validUntil && (
                <span className="flex items-center gap-1.5"><Clock size={11} /> Valid until: {formatDate(quotation.validUntil)}</span>
              )}
              <span className="flex items-center gap-1.5">
                <DollarSign size={11} />
                <span style={{ color: '#10b981', fontWeight: 600 }}>{formatCurrency(Number(quotation.totalAmount))}</span>
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 flex-shrink-0">
            {canSend && (
              <button onClick={() => statusMut.mutate('SENT')} disabled={statusMut.isPending}
                className="btn-secondary flex items-center gap-1.5 text-xs">
                <Send size={12} /> Mark Sent
              </button>
            )}
            {canAccept && (
              <button onClick={() => statusMut.mutate('ACCEPTED')} disabled={statusMut.isPending}
                className="btn-primary flex items-center gap-1.5 text-xs" style={{ background: '#10b981' }}>
                <CheckCircle2 size={12} /> Accept
              </button>
            )}
            {canConvert && (
              <button onClick={() => convertMut.mutate()} disabled={convertMut.isPending}
                className="btn-primary flex items-center gap-1.5 text-xs">
                <ArrowRight size={12} />
                {convertMut.isPending ? 'Converting…' : 'Convert to Invoice'}
              </button>
            )}
            {canEdit && (
              <button onClick={() => router.push(`/billing/quotations/${id}/edit`)}
                className="btn-primary flex items-center gap-1.5 text-xs" style={{ background: '#0ea5e9' }}>
                <PenLine size={12} /> Edit Quotation
              </button>
            )}
            {canReject && (
              <button onClick={() => { if (confirm('Reject this quotation?')) statusMut.mutate('REJECTED'); }}
                className="btn-secondary flex items-center gap-1.5 text-xs" style={{ color: '#f43f5e' }}>
                <X size={12} /> Reject
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 px-6 overflow-x-auto" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold transition-all relative whitespace-nowrap"
                style={{ color: active ? '#38bdf8' : 'var(--wz-text-muted)' }}>
                <tab.icon size={13} />
                {tab.label}
                {active && (
                  <motion.div layoutId="qt-tab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ background: 'linear-gradient(90deg,#0ea5e9,#6366f1)' }} />
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>

          {/* DETAILS */}
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* Line items */}
              <div className="lg:col-span-2 glass-card overflow-hidden">
                <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(14,165,233,0.04)' }}>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#38bdf8' }}>Line Items</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        {['Description', 'HSN', 'Qty', 'Rate', 'Tax%', 'Amount'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider"
                            style={{ color: 'var(--wz-text-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(quotation.lineItems ?? []).length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--wz-text-muted)' }}>No line items</td></tr>
                      ) : (quotation.lineItems ?? []).map((item: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td className="px-4 py-3 text-sm" style={{ color: 'var(--wz-text-primary)' }}>{item.description}</td>
                          <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--wz-text-muted)' }}>{item.hsn ?? '—'}</td>
                          <td className="px-4 py-3 text-sm" style={{ color: 'var(--wz-text-secondary)' }}>{Number(item.quantity)}</td>
                          <td className="px-4 py-3 text-sm" style={{ color: 'var(--wz-text-secondary)' }}>{formatCurrency(Number(item.rate))}</td>
                          <td className="px-4 py-3 text-sm" style={{ color: 'var(--wz-text-muted)' }}>{Number(item.taxRate)}%</td>
                          <td className="px-4 py-3 text-sm font-semibold" style={{ color: 'var(--wz-text-primary)' }}>{formatCurrency(Number(item.amount))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Totals */}
                <div className="px-5 py-4 space-y-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.015)' }}>
                  {[
                    { label: 'Subtotal',       val: Number(quotation.subtotal) },
                    { label: 'Discount',       val: -Number(quotation.discount ?? 0) },
                    { label: 'Taxable Amount', val: Number(quotation.taxableAmount) },
                    { label: 'CGST',           val: Number(quotation.cgstAmount) },
                    { label: 'SGST',           val: Number(quotation.sgstAmount) },
                    ...(Number(quotation.igstAmount) > 0 ? [{ label: 'IGST', val: Number(quotation.igstAmount) }] : []),
                  ].map(r => (
                    <div key={r.label} className="flex justify-between text-sm">
                      <span style={{ color: 'var(--wz-text-muted)' }}>{r.label}</span>
                      <span style={{ color: 'var(--wz-text-secondary)' }}>{formatCurrency(r.val)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-base font-bold pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ color: 'var(--wz-text-primary)' }}>Total</span>
                    <span style={{ color: '#10b981' }}>{formatCurrency(Number(quotation.totalAmount))}</span>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                {/* Client */}
                <div className="glass-card p-4 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#0ea5e9' }}>Client</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(14,165,233,0.1)', color: '#38bdf8' }}>
                      <Building2 size={15} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--wz-text-primary)' }}>{quotation.client?.name ?? '—'}</p>
                      {quotation.client?.gstin && <p className="text-xs" style={{ color: 'var(--wz-text-muted)' }}>GSTIN: {quotation.client.gstin}</p>}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {(quotation.notes || quotation.termsConditions) && (
                  <div className="glass-card p-4 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--wz-text-muted)' }}>Notes & Terms</p>
                    {quotation.notes && <p className="text-xs leading-relaxed" style={{ color: 'var(--wz-text-secondary)' }}>{quotation.notes}</p>}
                    {quotation.termsConditions && <p className="text-xs leading-relaxed" style={{ color: 'var(--wz-text-muted)' }}>{quotation.termsConditions}</p>}
                  </div>
                )}

                {/* Quick actions */}
                <div className="glass-card p-4 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--wz-text-muted)' }}>Actions</p>
                  {canEdit && (
                    <button onClick={() => router.push(`/billing/quotations/${id}/edit`)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors"
                      style={{ background: 'rgba(14,165,233,0.08)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.15)' }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(14,165,233,0.15)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(14,165,233,0.08)'}>
                      <PenLine size={13} /> Edit Quotation
                    </button>
                  )}
                  {canConvert && (
                    <button onClick={() => convertMut.mutate()} disabled={convertMut.isPending}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors"
                      style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.15)' }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(16,185,129,0.15)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(16,185,129,0.08)'}>
                      <ArrowRight size={13} /> Convert to Invoice
                    </button>
                  )}
                  <button onClick={() => setActiveTab('preview')}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--wz-text-secondary)', border: '1px solid rgba(255,255,255,0.06)' }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}>
                    <Printer size={13} /> Print / Download
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between glass-card p-4">
                <div className="flex gap-1">
                  {(['classic', 'modern'] as const).map(t => (
                    <button key={t} onClick={() => setTemplate(t)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                      style={{
                        background: template === t ? 'rgba(14,165,233,0.2)' : 'transparent',
                        color: template === t ? '#38bdf8' : 'var(--wz-text-muted)',
                      }}>
                      {t}
                    </button>
                  ))}
                </div>
                <DocumentActions
                  documentRef={docRef}
                  documentNo={quotation.quotationNo}
                  onSendWhatsApp={(phone, message) => sendWaMut.mutateAsync({ phone, message })}
                  clientPhone={quotation.client?.phone}
                />
              </div>
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                {template === 'classic'
                  ? <TemplateClassic ref={docRef} data={docData} />
                  : <TemplateModern ref={docRef} data={docData} />}
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
