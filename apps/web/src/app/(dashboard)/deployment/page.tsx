'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import {
  Plus, MapPin, Users, Clock, ChevronLeft, ChevronRight,
  X, Save, Building2, Layers, CheckCircle2, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { deploymentApi, employeesApi, tendersApi } from '@/lib/api';

// ─── Schemas ───────────────────────────────────────────────────────
const siteSchema = z.object({
  name: z.string().min(2, 'Site name required'),
  code: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  address: z.object({ street: z.string().optional(), city: z.string().optional(), state: z.string().optional() }).optional(),
});

const shiftSchema = z.object({
  name: z.string().min(1, 'Shift name required'),
  startTime: z.string().min(1, 'Start time required'),
  endTime: z.string().min(1, 'End time required'),
  shiftType: z.string().optional(),
  breakDuration: z.coerce.number().optional(),
});

const deploySchema = z.object({
  employeeId: z.string().min(1, 'Select an employee'),
  siteId: z.string().optional(),
  tenderId: z.string().optional(),
  shiftId: z.string().optional(),
  startDate: z.string().min(1, 'Start date required'),
  endDate: z.string().optional(),
  notes: z.string().optional(),
});

// ─── Mini Modal ─────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg rounded-2xl" style={{ background: 'var(--wz-card-bg)', border: '1px solid var(--wz-card-border)' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--wz-card-border)' }}>
          <h3 className="font-semibold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><X size={18} style={{ color: 'var(--wz-text-muted)' }} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const F = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div>
    <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>{label}</label>
    {children}
    {error && <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>{error}</p>}
  </div>
);

// ─── Main Page ──────────────────────────────────────────────────────
export default function DeploymentPage() {
  const [tab, setTab] = useState<'deployments' | 'sites' | 'shifts'>('deployments');
  const [page, setPage] = useState(1);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const qc = useQueryClient();

  // Data queries
  const { data: deplyData, isLoading: loadDeploy } = useQuery({
    queryKey: ['deployments', page],
    queryFn: () => deploymentApi.list({ page, limit: 15, status: 'ACTIVE' }),
    enabled: tab === 'deployments',
  });
  const { data: sites = [], isLoading: loadSites } = useQuery({
    queryKey: ['sites'],
    queryFn: deploymentApi.sites,
    enabled: tab === 'sites',
  });
  const { data: shifts = [], isLoading: loadShifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: deploymentApi.shifts,
    enabled: tab === 'shifts',
  });
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-select-all'],
    queryFn: () => employeesApi.selectAll('ACTIVE'),
    enabled: showDeployModal,
  });
  const { data: tendersData = [] } = useQuery({
    queryKey: ['tenders-select-all'],
    queryFn: tendersApi.selectAll,
    enabled: showDeployModal,
  });
  // Load sites/shifts for the modal regardless of which tab is active
  const { data: modalSites = [] } = useQuery({
    queryKey: ['sites-all'],
    queryFn: deploymentApi.sites,
    enabled: showDeployModal,
  });
  const { data: modalShifts = [] } = useQuery({
    queryKey: ['shifts-all'],
    queryFn: deploymentApi.shifts,
    enabled: showDeployModal,
  });

  const deployments = (deplyData as any)?.data ?? [];
  const meta = (deplyData as any)?.meta;

  // Forms
  const deployForm = useForm({ resolver: zodResolver(deploySchema) });
  const siteForm = useForm({ resolver: zodResolver(siteSchema) });
  const shiftForm = useForm({ resolver: zodResolver(shiftSchema), defaultValues: { shiftType: 'GENERAL', breakDuration: 30 } });

  // Mutations
  const deployMut = useMutation({
    mutationFn: (data: any) => deploymentApi.create(data),
    onSuccess: () => { toast.success('Deployment created'); qc.invalidateQueries({ queryKey: ['deployments'] }); setShowDeployModal(false); deployForm.reset(); },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed'),
  });
  const siteMut = useMutation({
    mutationFn: (data: any) => deploymentApi.createSite({ ...data, address: JSON.stringify(data.address ?? {}) }),
    onSuccess: () => { toast.success('Site created'); qc.invalidateQueries({ queryKey: ['sites'] }); setShowSiteModal(false); siteForm.reset(); },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed'),
  });
  const shiftMut = useMutation({
    mutationFn: (data: any) => deploymentApi.createShift(data),
    onSuccess: () => { toast.success('Shift created'); qc.invalidateQueries({ queryKey: ['shifts'] }); setShowShiftModal(false); shiftForm.reset(); },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed'),
  });
  const endMut = useMutation({
    mutationFn: ({ id }: { id: string }) => deploymentApi.end(id, new Date().toISOString()),
    onSuccess: () => { toast.success('Deployment ended'); qc.invalidateQueries({ queryKey: ['deployments'] }); },
    onError: () => toast.error('Failed to end deployment'),
  });

  const TABS = [
    { id: 'deployments', label: 'Deployments', icon: Users },
    { id: 'sites', label: 'Sites', icon: MapPin },
    { id: 'shifts', label: 'Shifts', icon: Clock },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Deploy Modal */}
      <Modal open={showDeployModal} onClose={() => { setShowDeployModal(false); deployForm.reset(); }} title="New Deployment">
        <form onSubmit={deployForm.handleSubmit(d => deployMut.mutate(d))} className="space-y-4">
          <F label="Employee *" error={deployForm.formState.errors.employeeId?.message}>
            <select {...deployForm.register('employeeId')} className="input-field w-full">
              <option value="">Select employee</option>
              {(employees as any[]).map((e: any) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} — {e.employeeCode}</option>)}
            </select>
          </F>
          <F label="Site">
            <select {...deployForm.register('siteId')} className="input-field w-full">
              <option value="">Select site (optional)</option>
              {(modalSites as any[]).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </F>
          <F label="Tender">
            <select {...deployForm.register('tenderId')} className="input-field w-full">
              <option value="">Select tender (optional)</option>
              {(tendersData as any[]).map((t: any) => <option key={t.id} value={t.id}>{t.tenderName}</option>)}
            </select>
          </F>
          <F label="Shift">
            <select {...deployForm.register('shiftId')} className="input-field w-full">
              <option value="">Select shift (optional)</option>
              {(modalShifts as any[]).map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.startTime}–{s.endTime})</option>)}
            </select>
          </F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Start Date *" error={deployForm.formState.errors.startDate?.message}>
              <input {...deployForm.register('startDate')} type="date" className="input-field w-full" />
            </F>
            <F label="End Date">
              <input {...deployForm.register('endDate')} type="date" className="input-field w-full" />
            </F>
          </div>
          <F label="Notes">
            <textarea {...deployForm.register('notes')} rows={2} className="input-field w-full resize-none" placeholder="Any special instructions..." />
          </F>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={deployMut.isPending}>
              <Save size={14} /> {deployMut.isPending ? 'Creating...' : 'Create Deployment'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowDeployModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Site Modal */}
      <Modal open={showSiteModal} onClose={() => { setShowSiteModal(false); siteForm.reset(); }} title="Add New Site">
        <form onSubmit={siteForm.handleSubmit(d => siteMut.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <F label="Site Name *" error={siteForm.formState.errors.name?.message}>
              <input {...siteForm.register('name')} className="input-field w-full" placeholder="NHAI Head Office" />
            </F>
            <F label="Site Code">
              <input {...siteForm.register('code')} className="input-field w-full" placeholder="NHAI-001" />
            </F>
          </div>
          <F label="Street / Location">
            <input {...siteForm.register('address.street')} className="input-field w-full" placeholder="Plot 12, Dwarka, New Delhi" />
          </F>
          <div className="grid grid-cols-2 gap-3">
            <F label="City">
              <input {...siteForm.register('address.city')} className="input-field w-full" placeholder="New Delhi" />
            </F>
            <F label="State">
              <input {...siteForm.register('address.state')} className="input-field w-full" placeholder="Delhi" />
            </F>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Site In-charge Name">
              <input {...siteForm.register('contactName')} className="input-field w-full" placeholder="Ramesh Kumar" />
            </F>
            <F label="Contact Phone">
              <input {...siteForm.register('contactPhone')} className="input-field w-full" placeholder="+91 98765 43210" />
            </F>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={siteMut.isPending}>
              <Save size={14} /> {siteMut.isPending ? 'Creating...' : 'Create Site'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowSiteModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Shift Modal */}
      <Modal open={showShiftModal} onClose={() => { setShowShiftModal(false); shiftForm.reset(); }} title="Add New Shift">
        <form onSubmit={shiftForm.handleSubmit(d => shiftMut.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <F label="Shift Name *" error={shiftForm.formState.errors.name?.message}>
              <input {...shiftForm.register('name')} className="input-field w-full" placeholder="Morning Shift" />
            </F>
            <F label="Shift Type">
              <select {...shiftForm.register('shiftType')} className="input-field w-full">
                <option value="GENERAL">General</option>
                <option value="MORNING">Morning</option>
                <option value="EVENING">Evening</option>
                <option value="NIGHT">Night</option>
                <option value="ROTATING">Rotating</option>
              </select>
            </F>
            <F label="Start Time *" error={shiftForm.formState.errors.startTime?.message}>
              <input {...shiftForm.register('startTime')} type="time" className="input-field w-full" />
            </F>
            <F label="End Time *" error={shiftForm.formState.errors.endTime?.message}>
              <input {...shiftForm.register('endTime')} type="time" className="input-field w-full" />
            </F>
            <F label="Break Duration (min)">
              <input {...shiftForm.register('breakDuration')} type="number" className="input-field w-full" placeholder="30" />
            </F>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={shiftMut.isPending}>
              <Save size={14} /> {shiftMut.isPending ? 'Creating...' : 'Create Shift'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowShiftModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>Deployment</h2>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Manage site deployments, shifts, and manpower strength</p>
        </div>
        <div className="flex gap-2">
          {tab === 'deployments' && <button className="btn-primary" onClick={() => setShowDeployModal(true)}><Plus size={16} /> New Deployment</button>}
          {tab === 'sites' && <button className="btn-primary" onClick={() => setShowSiteModal(true)}><Plus size={16} /> Add Site</button>}
          {tab === 'shifts' && <button className="btn-primary" onClick={() => setShowShiftModal(true)}><Plus size={16} /> Add Shift</button>}
        </div>
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

      {/* DEPLOYMENTS TAB */}
      {tab === 'deployments' && (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['Employee', 'Site', 'Tender', 'Shift', 'Start Date', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadDeploy && [...Array(5)].map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  {[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} /></td>)}
                </tr>
              ))}
              {!loadDeploy && deployments.map((d: any) => (
                <tr key={d.id} className="group hover:bg-white/[0.015] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-white">{d.employee?.firstName} {d.employee?.lastName}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{d.employee?.designation?.name}</p>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{d.site?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{d.tender?.tenderName ? d.tender.tenderName.substring(0, 30) + '...' : '—'}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{d.shift?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{formatDate(d.startDate)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                      style={{ background: d.status === 'ACTIVE' ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)', color: d.status === 'ACTIVE' ? '#10b981' : 'rgba(255,255,255,0.5)' }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: d.status === 'ACTIVE' ? '#10b981' : 'rgba(255,255,255,0.4)' }} />
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {d.status === 'ACTIVE' && (
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 rounded-lg"
                        style={{ background: 'rgba(244,63,94,0.1)', color: '#f87171', border: '1px solid rgba(244,63,94,0.2)' }}
                        onClick={() => { if (confirm('End this deployment?')) endMut.mutate({ id: d.id }); }}>
                        End
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!loadDeploy && deployments.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-16 text-center">
                  <Users size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                  <p className="text-white font-medium mb-1">No active deployments</p>
                  <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Deploy employees to sites to see them here</p>
                  <button className="btn-primary" onClick={() => setShowDeployModal(true)}><Plus size={14} /> New Deployment</button>
                </td></tr>
              )}
            </tbody>
          </table>
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Total: {meta.total} deployments</p>
              <div className="flex gap-1">
                <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30"><ChevronLeft size={16} style={{ color: 'rgba(255,255,255,0.5)' }} /></button>
                <span className="text-xs px-2 py-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{page}/{meta.totalPages}</span>
                <button disabled={page===meta.totalPages} onClick={() => setPage(p=>p+1)} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30"><ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.5)' }} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SITES TAB */}
      {tab === 'sites' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loadSites && [...Array(6)].map((_, i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-5 w-32 rounded mb-3" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="h-3 w-24 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
          ))}
          {!loadSites && (sites as any[]).map((s: any) => (
            <motion.div key={s.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.15)' }}>
                  <MapPin size={18} style={{ color: '#818cf8' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-sm truncate">{s.name}</h3>
                  {s.code && <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.code}</p>}
                </div>
                <span className={`badge ${s.isActive ? 'badge-success' : 'badge-neutral'} text-xs`}>{s.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              {s.contactName && (
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>In-charge: {s.contactName}</p>
              )}
              {s.contactPhone && (
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>📞 {s.contactPhone}</p>
              )}
            </motion.div>
          ))}
          {!loadSites && (sites as any[]).length === 0 && (
            <div className="col-span-3 py-20 text-center">
              <MapPin size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
              <p className="text-white font-medium mb-1">No sites yet</p>
              <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Add your first deployment site</p>
              <button className="btn-primary" onClick={() => setShowSiteModal(true)}><Plus size={14} /> Add Site</button>
            </div>
          )}
        </div>
      )}

      {/* SHIFTS TAB */}
      {tab === 'shifts' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loadShifts && [...Array(4)].map((_, i) => <div key={i} className="glass-card p-5 h-28 animate-pulse" />)}
          {!loadShifts && (shifts as any[]).map((s: any) => (
            <motion.div key={s.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,130,246,0.15)' }}>
                  <Clock size={18} style={{ color: '#60a5fa' }} />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">{s.name}</h3>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.shiftType}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                <span>⏰ {s.startTime} – {s.endTime}</span>
                {s.breakDuration && <span>☕ {s.breakDuration}m break</span>}
              </div>
            </motion.div>
          ))}
          {!loadShifts && (shifts as any[]).length === 0 && (
            <div className="col-span-3 py-20 text-center">
              <Clock size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
              <p className="text-white font-medium mb-1">No shifts defined</p>
              <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Create your first shift schedule</p>
              <button className="btn-primary" onClick={() => setShowShiftModal(true)}><Plus size={14} /> Add Shift</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
