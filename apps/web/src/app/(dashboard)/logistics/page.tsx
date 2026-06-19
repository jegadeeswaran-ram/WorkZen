'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import {
  Plus, X, Save, Truck, PackageCheck, Package, Building2,
  ChevronLeft, ChevronRight, CheckCircle2, Clock, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { logisticsApi } from '@/lib/api';

function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto rounded-2xl`}
        style={{ background: 'var(--wz-card-bg)', border: '1px solid var(--wz-card-border)' }}>
        <div className="flex items-center justify-between p-5 sticky top-0 z-10"
          style={{ background: 'var(--wz-card-bg)', borderBottom: '1px solid var(--wz-card-border)' }}>
          <h3 className="font-semibold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><X size={18} style={{ color: 'var(--wz-text-muted)' }} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const F = ({ label, error, children, span2 }: { label: string; error?: string; children: React.ReactNode; span2?: boolean }) => (
  <div className={span2 ? 'col-span-2' : ''}>
    <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>{label}</label>
    {children}
    {error && <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>{error}</p>}
  </div>
);

const CONTENT_TYPES = ['TENDER_DOC', 'WORK_ORDER', 'INVOICE', 'CHEQUE', 'DD', 'CONTRACT', 'COMPLIANCE', 'APPOINTMENT_LETTER', 'ID_CARD', 'OTHER'];
const DISPATCH_STATUSES = ['DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED', 'LOST'];

const STATUS_CFG: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  DISPATCHED: { color: '#818cf8', bg: 'rgba(99,102,241,0.12)', icon: Truck },
  IN_TRANSIT: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: Clock },
  DELIVERED:  { color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: CheckCircle2 },
  RETURNED:   { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)', icon: AlertCircle },
  LOST:       { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)', icon: AlertCircle },
};

type Tab = 'dispatches' | 'receipts' | 'vendors';

export default function LogisticsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('dispatches');
  const [dispPage, setDispPage] = useState(1);
  const [rcptPage, setRcptPage] = useState(1);
  const [showDispModal, setShowDispModal] = useState(false);
  const [showRcptModal, setShowRcptModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [updateDispatch, setUpdateDispatch] = useState<any>(null);

  const dispForm = useForm<any>();
  const rcptForm = useForm<any>();
  const vendorForm = useForm<any>();
  const updateForm = useForm<any>();

  const { data: dash } = useQuery({ queryKey: ['logistics-dash'], queryFn: logisticsApi.dashboard });
  const { data: dispatches, isLoading: loadDisp } = useQuery({
    queryKey: ['logistics-dispatches', dispPage],
    queryFn: () => logisticsApi.dispatches({ page: dispPage, limit: 15 }),
    enabled: tab === 'dispatches',
  });
  const { data: receipts, isLoading: loadRcpt } = useQuery({
    queryKey: ['logistics-receipts', rcptPage],
    queryFn: () => logisticsApi.receipts({ page: rcptPage, limit: 15 }),
    enabled: tab === 'receipts',
  });
  const { data: vendors = [] } = useQuery({
    queryKey: ['logistics-vendors'],
    queryFn: logisticsApi.vendors,
  });

  const d = dash as any;
  const dispList = (dispatches as any)?.data ?? [];
  const dispMeta = (dispatches as any)?.meta;
  const rcptList = (receipts as any)?.data ?? [];
  const rcptMeta = (receipts as any)?.meta;
  const vendorList: any[] = Array.isArray(vendors) ? (vendors as any[]) : [];

  const createDispMut = useMutation({
    mutationFn: (data: any) => logisticsApi.createDispatch(data),
    onSuccess: () => { toast.success('Dispatch recorded'); qc.invalidateQueries({ queryKey: ['logistics-dispatches'] }); qc.invalidateQueries({ queryKey: ['logistics-dash'] }); setShowDispModal(false); dispForm.reset(); },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed'),
  });
  const updateDispMut = useMutation({
    mutationFn: ({ id, data }: any) => logisticsApi.updateDispatch(id, data),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['logistics-dispatches'] }); qc.invalidateQueries({ queryKey: ['logistics-dash'] }); setUpdateDispatch(null); updateForm.reset(); },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed'),
  });
  const createRcptMut = useMutation({
    mutationFn: (data: any) => logisticsApi.createReceipt(data),
    onSuccess: () => { toast.success('Receipt logged'); qc.invalidateQueries({ queryKey: ['logistics-receipts'] }); qc.invalidateQueries({ queryKey: ['logistics-dash'] }); setShowRcptModal(false); rcptForm.reset(); },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed'),
  });
  const createVendorMut = useMutation({
    mutationFn: (data: any) => logisticsApi.createVendor(data),
    onSuccess: () => { toast.success('Vendor added'); qc.invalidateQueries({ queryKey: ['logistics-vendors'] }); setShowVendorModal(false); vendorForm.reset(); },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed'),
  });

  const TABS = [
    { id: 'dispatches' as Tab, label: 'Outgoing', icon: Truck },
    { id: 'receipts' as Tab, label: 'Incoming', icon: PackageCheck },
    { id: 'vendors' as Tab, label: 'Couriers', icon: Building2 },
  ];

  return (
    <div className="space-y-6">
      {/* Dispatch Modal */}
      <Modal open={showDispModal} onClose={() => { setShowDispModal(false); dispForm.reset(); }} title="New Outgoing Dispatch" wide>
        <form onSubmit={dispForm.handleSubmit(d => createDispMut.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <F label="To (Recipient) *">
              <input {...dispForm.register('toName')} className="input-field w-full" placeholder="Govt of Tamil Nadu — PWD Dept" />
            </F>
            <F label="Dispatch Date *">
              <input {...dispForm.register('dispatchDate')} type="date" className="input-field w-full" />
            </F>
            <F label="Content Type *">
              <select {...dispForm.register('contentType')} className="input-field w-full">
                <option value="">Select type</option>
                {CONTENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </F>
            <F label="Courier Vendor">
              <select {...dispForm.register('courierVendorId')} className="input-field w-full">
                <option value="">Select courier</option>
                {vendorList.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </F>
            <F label="Tracking / AWB Number">
              <input {...dispForm.register('trackingNumber')} className="input-field w-full" placeholder="123456789012" />
            </F>
            <F label="Expected Delivery">
              <input {...dispForm.register('expectedDelivery')} type="date" className="input-field w-full" />
            </F>
            <F label="To Address" span2>
              <input {...dispForm.register('toAddress')} className="input-field w-full" placeholder="Office of the Chief Engineer, Chennai - 600002" />
            </F>
            <F label="To Phone">
              <input {...dispForm.register('toPhone')} className="input-field w-full" placeholder="+91 44 2345 6789" />
            </F>
            <F label="Weight (kg)">
              <input {...dispForm.register('weight', { valueAsNumber: true })} type="number" step="0.1" className="input-field w-full" placeholder="0.5" />
            </F>
            <F label="Charges (₹)">
              <input {...dispForm.register('charges', { valueAsNumber: true })} type="number" className="input-field w-full" placeholder="150" />
            </F>
          </div>
          <F label="Content Description">
            <textarea {...dispForm.register('contentDescription')} rows={2} className="input-field w-full resize-none" placeholder="3 copies of Tender document + DD for EMD" />
          </F>
          <F label="Notes">
            <textarea {...dispForm.register('notes')} rows={1} className="input-field w-full resize-none" />
          </F>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={createDispMut.isPending}>
              <Save size={14} /> {createDispMut.isPending ? 'Saving...' : 'Record Dispatch'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowDispModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Update Status Modal */}
      <Modal open={!!updateDispatch} onClose={() => { setUpdateDispatch(null); updateForm.reset(); }} title="Update Dispatch Status">
        <form onSubmit={updateForm.handleSubmit(d => updateDispMut.mutate({ id: updateDispatch.id, data: d }))} className="space-y-4">
          <F label="Status *">
            <select {...updateForm.register('status')} className="input-field w-full" defaultValue={updateDispatch?.status}>
              {DISPATCH_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </F>
          <F label="Delivered Date">
            <input {...updateForm.register('deliveredDate')} type="date" className="input-field w-full" />
          </F>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={updateDispMut.isPending}>
              <Save size={14} /> Update
            </button>
            <button type="button" className="btn-secondary" onClick={() => setUpdateDispatch(null)}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Receipt Modal */}
      <Modal open={showRcptModal} onClose={() => { setShowRcptModal(false); rcptForm.reset(); }} title="Log Incoming Receipt" wide>
        <form onSubmit={rcptForm.handleSubmit(d => createRcptMut.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <F label="From (Sender) *">
              <input {...rcptForm.register('fromName')} className="input-field w-full" placeholder="Govt of Tamil Nadu — Collector Office" />
            </F>
            <F label="Received Date *">
              <input {...rcptForm.register('receivedDate')} type="date" className="input-field w-full" />
            </F>
            <F label="Content Type *">
              <select {...rcptForm.register('contentType')} className="input-field w-full">
                <option value="">Select type</option>
                {CONTENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </F>
            <F label="Courier Vendor">
              <select {...rcptForm.register('courierVendorId')} className="input-field w-full">
                <option value="">Select courier</option>
                {vendorList.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </F>
            <F label="Tracking Number">
              <input {...rcptForm.register('trackingNumber')} className="input-field w-full" placeholder="Optional" />
            </F>
            <F label="From Phone">
              <input {...rcptForm.register('fromPhone')} className="input-field w-full" />
            </F>
            <F label="Received By">
              <input {...rcptForm.register('receivedBy')} className="input-field w-full" placeholder="Front desk staff name" />
            </F>
            <F label="Handed To">
              <input {...rcptForm.register('handedTo')} className="input-field w-full" placeholder="Department / person" />
            </F>
          </div>
          <F label="Content Description">
            <textarea {...rcptForm.register('contentDescription')} rows={2} className="input-field w-full resize-none" placeholder="Original Work Order + 2 copies" />
          </F>
          <F label="Notes">
            <textarea {...rcptForm.register('notes')} rows={1} className="input-field w-full resize-none" />
          </F>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={createRcptMut.isPending}>
              <Save size={14} /> {createRcptMut.isPending ? 'Saving...' : 'Log Receipt'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowRcptModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Vendor Modal */}
      <Modal open={showVendorModal} onClose={() => { setShowVendorModal(false); vendorForm.reset(); }} title="Add Courier Vendor">
        <form onSubmit={vendorForm.handleSubmit(d => createVendorMut.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <F label="Vendor Name *">
              <input {...vendorForm.register('name')} className="input-field w-full" placeholder="Blue Dart Express" />
            </F>
            <F label="Short Code">
              <input {...vendorForm.register('code')} className="input-field w-full" placeholder="BLUEDART" />
            </F>
            <F label="Contact Phone">
              <input {...vendorForm.register('contactPhone')} className="input-field w-full" placeholder="1800-xxx-xxxx" />
            </F>
            <F label="Tracking URL">
              <input {...vendorForm.register('trackingUrl')} className="input-field w-full" placeholder="https://www.bluedart.com/tracking" />
            </F>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={createVendorMut.isPending}>
              <Save size={14} /> {createVendorMut.isPending ? 'Saving...' : 'Add Vendor'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowVendorModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>Logistics</h2>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Track courier dispatches and incoming receipts</p>
        </div>
        <div className="flex gap-2">
          {tab === 'dispatches' && <button className="btn-primary" onClick={() => setShowDispModal(true)}><Plus size={16} /> New Dispatch</button>}
          {tab === 'receipts' && <button className="btn-primary" onClick={() => setShowRcptModal(true)}><Plus size={16} /> Log Receipt</button>}
          {tab === 'vendors' && <button className="btn-primary" onClick={() => setShowVendorModal(true)}><Plus size={16} /> Add Courier</button>}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Dispatched', value: d?.totalDispatched ?? 0, color: '#6366f1', icon: Truck },
          { label: 'In Transit', value: d?.inTransit ?? 0, color: '#f59e0b', icon: Clock },
          { label: 'Delivered', value: d?.delivered ?? 0, color: '#10b981', icon: CheckCircle2 },
          { label: 'Received', value: d?.totalReceived ?? 0, color: '#3b82f6', icon: PackageCheck },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</p>
                <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>{s.value}</p>
              </div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${s.color}15`, color: s.color }}>
                <s.icon size={16} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: tab === t.id ? 'rgba(99,102,241,0.2)' : 'transparent', color: tab === t.id ? '#818cf8' : 'rgba(255,255,255,0.5)' }}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* Dispatches Table */}
      {tab === 'dispatches' && (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {['Dispatch No', 'Date', 'To', 'Content', 'Tracking', 'Courier', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loadDisp && [...Array(5)].map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  {[...Array(8)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} /></td>)}
                </tr>
              ))}
              {!loadDisp && dispList.map((d: any) => {
                const cfg = STATUS_CFG[d.status] ?? STATUS_CFG.DISPATCHED;
                const Icon = cfg.icon;
                return (
                  <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td className="px-4 py-3 text-sm font-mono" style={{ color: '#818cf8' }}>{d.dispatchNo}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{formatDate(d.dispatchDate)}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-white">{d.toName}</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{d.toPhone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>{d.contentType.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>{d.trackingNumber ?? '—'}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{d.courierVendor?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: cfg.bg, color: cfg.color }}>
                        <Icon size={11} /> {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {d.status !== 'DELIVERED' && d.status !== 'LOST' && (
                        <button onClick={() => { setUpdateDispatch(d); updateForm.setValue('status', d.status); }}
                          className="text-xs px-2 py-1 rounded-lg transition-colors"
                          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                          Update
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loadDisp && dispList.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-16 text-center">
                  <Truck size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                  <p className="text-white font-medium mb-1">No dispatches yet</p>
                  <button className="btn-primary mt-3" onClick={() => setShowDispModal(true)}><Plus size={14} /> New Dispatch</button>
                </td></tr>
              )}
            </tbody>
          </table>
          {dispMeta && dispMeta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Total: {dispMeta.total}</p>
              <div className="flex gap-1">
                <button disabled={dispPage === 1} onClick={() => setDispPage(p => p - 1)} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30"><ChevronLeft size={16} style={{ color: 'rgba(255,255,255,0.5)' }} /></button>
                <span className="text-xs px-2 py-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{dispPage}/{dispMeta.totalPages}</span>
                <button disabled={dispPage === dispMeta.totalPages} onClick={() => setDispPage(p => p + 1)} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30"><ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.5)' }} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Receipts Table */}
      {tab === 'receipts' && (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {['Receipt No', 'Date', 'From', 'Content', 'Tracking', 'Received By', 'Handed To'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loadRcpt && [...Array(5)].map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  {[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} /></td>)}
                </tr>
              ))}
              {!loadRcpt && rcptList.map((r: any) => (
                <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td className="px-4 py-3 text-sm font-mono" style={{ color: '#10b981' }}>{r.receiptNo}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{formatDate(r.receivedDate)}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-white">{r.fromName}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{r.courierVendor?.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>{r.contentType.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>{r.trackingNumber ?? '—'}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{r.receivedBy ?? '—'}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{r.handedTo ?? '—'}</td>
                </tr>
              ))}
              {!loadRcpt && rcptList.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-16 text-center">
                  <PackageCheck size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                  <p className="text-white font-medium mb-1">No receipts logged</p>
                  <button className="btn-primary mt-3" onClick={() => setShowRcptModal(true)}><Plus size={14} /> Log Receipt</button>
                </td></tr>
              )}
            </tbody>
          </table>
          {rcptMeta && rcptMeta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Total: {rcptMeta.total}</p>
              <div className="flex gap-1">
                <button disabled={rcptPage === 1} onClick={() => setRcptPage(p => p - 1)} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30"><ChevronLeft size={16} style={{ color: 'rgba(255,255,255,0.5)' }} /></button>
                <span className="text-xs px-2 py-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{rcptPage}/{rcptMeta.totalPages}</span>
                <button disabled={rcptPage === rcptMeta.totalPages} onClick={() => setRcptPage(p => p + 1)} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30"><ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.5)' }} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vendors */}
      {tab === 'vendors' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendorList.map((v: any) => (
            <motion.div key={v.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.15)' }}>
                  <Building2 size={18} style={{ color: '#818cf8' }} />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">{v.name}</h3>
                  {v.code && <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>{v.code}</p>}
                </div>
              </div>
              {v.contactPhone && <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>📞 {v.contactPhone}</p>}
              {v.trackingUrl && (
                <p className="text-xs truncate" style={{ color: '#818cf8' }}>🔗 {v.trackingUrl}</p>
              )}
            </motion.div>
          ))}
          {vendorList.length === 0 && (
            <div className="col-span-3 py-20 text-center">
              <Building2 size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
              <p className="text-white font-medium mb-1">No courier vendors</p>
              <button className="btn-primary mt-3" onClick={() => setShowVendorModal(true)}><Plus size={14} /> Add Courier</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
