'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import {
  Plus, X, Save, UserCheck, UserX, Clock, Users,
  LogIn, LogOut, Shield, ShieldOff, Search, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { visitorsApi } from '@/lib/api';

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
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5"><X size={18} style={{ color: 'rgba(255,255,255,0.5)' }} /></button>
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

const PURPOSE_CATEGORIES = ['OFFICIAL', 'INTERVIEW', 'DELIVERY', 'VENDOR', 'PERSONAL', 'INSPECTION', 'OTHER'];
const ID_TYPES = ['AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE', 'VOTER_ID', 'OTHER'];

type Tab = 'logs' | 'visitors' | 'blacklist';

function formatTime(dt: string | undefined) {
  if (!dt) return '—';
  return new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(dt: string | undefined) {
  if (!dt) return '—';
  const d = new Date(dt);
  return `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function VisitorsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('logs');
  const [search, setSearch] = useState('');
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [blacklistTarget, setBlacklistTarget] = useState<any>(null);
  const [page, setPage] = useState(1);

  const checkInForm = useForm<any>();
  const blacklistForm = useForm<any>();

  const { data: dash } = useQuery({ queryKey: ['visitors-dash'], queryFn: visitorsApi.dashboard });
  const { data: logs, isLoading: loadLogs } = useQuery({
    queryKey: ['visitor-logs', page, logDate, search],
    queryFn: () => visitorsApi.logs({ page, limit: 15, date: logDate, search }),
    enabled: tab === 'logs',
  });
  const { data: visitors, isLoading: loadVisitors } = useQuery({
    queryKey: ['visitors-list', page, search],
    queryFn: () => visitorsApi.list({ page, limit: 20, search }),
    enabled: tab === 'visitors' || tab === 'blacklist',
  });

  const d = dash as any;
  const logList = (logs as any)?.data ?? [];
  const logMeta = (logs as any)?.meta;
  const visitorList = ((visitors as any)?.data ?? []) as any[];

  const blacklisted = tab === 'blacklist' ? visitorList.filter((v: any) => v.isBlacklisted) : visitorList;

  const checkInMut = useMutation({
    mutationFn: (data: any) => visitorsApi.checkIn(data),
    onSuccess: () => {
      toast.success('Visitor checked in');
      qc.invalidateQueries({ queryKey: ['visitor-logs'] });
      qc.invalidateQueries({ queryKey: ['visitors-dash'] });
      setShowCheckInModal(false);
      checkInForm.reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Check-in failed'),
  });

  const checkOutMut = useMutation({
    mutationFn: (logId: string) => visitorsApi.checkOut(logId),
    onSuccess: () => {
      toast.success('Visitor checked out');
      qc.invalidateQueries({ queryKey: ['visitor-logs'] });
      qc.invalidateQueries({ queryKey: ['visitors-dash'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Check-out failed'),
  });

  const blacklistMut = useMutation({
    mutationFn: ({ id, data }: any) => visitorsApi.toggleBlacklist(id, data.isBlacklisted, data.blacklistReason),
    onSuccess: (_, vars) => {
      toast.success(vars.data.isBlacklisted ? 'Visitor blacklisted' : 'Visitor removed from blacklist');
      qc.invalidateQueries({ queryKey: ['visitors-list'] });
      qc.invalidateQueries({ queryKey: ['visitors-dash'] });
      setBlacklistTarget(null);
      blacklistForm.reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed'),
  });

  const TABS = [
    { id: 'logs' as Tab, label: "Today's Log", icon: LogIn },
    { id: 'visitors' as Tab, label: 'All Visitors', icon: Users },
    { id: 'blacklist' as Tab, label: 'Blacklist', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      {/* Check-In Modal */}
      <Modal open={showCheckInModal} onClose={() => { setShowCheckInModal(false); checkInForm.reset(); }} title="Visitor Check-In" wide>
        <form onSubmit={checkInForm.handleSubmit(d => checkInMut.mutate(d))} className="space-y-4">
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>If the visitor has visited before, their details will be auto-filled using the phone number.</p>
          <div className="grid grid-cols-2 gap-3">
            <F label="Phone Number *">
              <input {...checkInForm.register('phone')} className="input-field w-full" placeholder="+91 98765 43210" />
            </F>
            <F label="Full Name *">
              <input {...checkInForm.register('name')} className="input-field w-full" placeholder="Visitor name" />
            </F>
            <F label="Company / Organisation">
              <input {...checkInForm.register('company')} className="input-field w-full" placeholder="Company name (if any)" />
            </F>
            <F label="ID Type">
              <select {...checkInForm.register('idType')} className="input-field w-full">
                <option value="">Select</option>
                {ID_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </F>
            <F label="ID Number">
              <input {...checkInForm.register('idNumber')} className="input-field w-full" placeholder="XXXX XXXX XXXX" />
            </F>
            <F label="Purpose Category *">
              <select {...checkInForm.register('purposeCategory')} className="input-field w-full">
                <option value="">Select purpose</option>
                {PURPOSE_CATEGORIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </F>
            <F label="Purpose (details)">
              <input {...checkInForm.register('purpose')} className="input-field w-full" placeholder="Meeting with HR Manager" />
            </F>
            <F label="Person to Meet">
              <input {...checkInForm.register('personToMeet')} className="input-field w-full" placeholder="Employee name" />
            </F>
            <F label="Badge Number">
              <input {...checkInForm.register('badgeNumber')} className="input-field w-full" placeholder="V-001" />
            </F>
            <F label="Vehicle Number">
              <input {...checkInForm.register('vehicleNumber')} className="input-field w-full" placeholder="TN 01 AB 1234" />
            </F>
            <F label="No. of Accompanying Persons">
              <input {...checkInForm.register('noOfPersons', { valueAsNumber: true })} type="number" min="0" className="input-field w-full" defaultValue={0} />
            </F>
          </div>
          <F label="Remarks">
            <textarea {...checkInForm.register('remarks')} rows={2} className="input-field w-full resize-none" />
          </F>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={checkInMut.isPending}>
              <LogIn size={14} /> {checkInMut.isPending ? 'Checking in...' : 'Check In Visitor'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowCheckInModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Blacklist Modal */}
      <Modal open={!!blacklistTarget} onClose={() => { setBlacklistTarget(null); blacklistForm.reset(); }} title={blacklistTarget?.isBlacklisted ? 'Remove from Blacklist' : 'Blacklist Visitor'}>
        {blacklistTarget && (
          <form onSubmit={blacklistForm.handleSubmit(d => blacklistMut.mutate({
            id: blacklistTarget.id,
            data: { isBlacklisted: !blacklistTarget.isBlacklisted, blacklistReason: d.blacklistReason },
          }))} className="space-y-4">
            <div className="p-3 rounded-xl" style={{ background: blacklistTarget.isBlacklisted ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)', border: `1px solid ${blacklistTarget.isBlacklisted ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}` }}>
              <p className="text-sm font-medium" style={{ color: blacklistTarget.isBlacklisted ? '#10b981' : '#f43f5e' }}>
                {blacklistTarget.isBlacklisted ? `Remove "${blacklistTarget.name}" from the blacklist?` : `Blacklist "${blacklistTarget.name}"?`}
              </p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{blacklistTarget.phone}</p>
            </div>
            {!blacklistTarget.isBlacklisted && (
              <F label="Reason for Blacklisting *">
                <textarea {...blacklistForm.register('blacklistReason')} rows={3} className="input-field w-full resize-none" placeholder="Describe the reason..." />
              </F>
            )}
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 py-2 px-4 rounded-xl font-medium text-sm transition-all"
                style={{ background: blacklistTarget.isBlacklisted ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)', color: blacklistTarget.isBlacklisted ? '#10b981' : '#f43f5e' }}
                disabled={blacklistMut.isPending}>
                {blacklistTarget.isBlacklisted ? <><ShieldOff size={14} className="inline mr-1" /> Remove from Blacklist</> : <><Shield size={14} className="inline mr-1" /> Confirm Blacklist</>}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setBlacklistTarget(null)}>Cancel</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>Visitor Management</h2>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Head office visitor check-in and access control</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCheckInModal(true)}>
          <LogIn size={16} /> Check In Visitor
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Check-Ins", value: d?.todayCheckedIn ?? 0, color: '#6366f1', icon: LogIn },
          { label: 'Currently Inside', value: d?.currentlyInside ?? 0, color: '#10b981', icon: UserCheck },
          { label: 'Checked Out Today', value: d?.todayCheckedOut ?? 0, color: '#3b82f6', icon: LogOut },
          { label: 'Blacklisted', value: d?.blacklisted ?? 0, color: '#f43f5e', icon: UserX },
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

      {/* Tabs + Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setPage(1); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: tab === t.id ? 'rgba(99,102,241,0.2)' : 'transparent', color: tab === t.id ? '#818cf8' : 'rgba(255,255,255,0.5)' }}>
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>
        {tab === 'logs' && (
          <input type="date" value={logDate} onChange={e => { setLogDate(e.target.value); setPage(1); }}
            className="input-field text-sm" style={{ width: 160 }} />
        )}
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="input-field w-full pl-9 text-sm" placeholder="Search name, phone..." />
        </div>
      </div>

      {/* Visitor Logs */}
      {tab === 'logs' && (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {['Visitor', 'Purpose', 'Person to Meet', 'Check In', 'Check Out', 'Duration', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loadLogs && [...Array(5)].map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  {[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} /></td>)}
                </tr>
              ))}
              {!loadLogs && logList.map((log: any) => {
                const inside = !log.checkOut;
                let duration = '—';
                if (log.checkOut) {
                  const mins = Math.round((new Date(log.checkOut).getTime() - new Date(log.checkIn).getTime()) / 60000);
                  duration = mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
                }
                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-white">{log.visitor?.name}</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{log.visitor?.phone} {log.visitor?.company ? `• ${log.visitor.company}` : ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>
                        {log.purposeCategory}
                      </span>
                      {log.purpose && <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{log.purpose}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{log.personToMeet ?? '—'}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{formatTime(log.checkIn)}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: inside ? '#f59e0b' : 'rgba(255,255,255,0.5)' }}>
                      {inside ? (
                        <span className="inline-flex items-center gap-1 text-xs" style={{ color: '#f59e0b' }}>
                          <Clock size={11} /> Inside
                        </span>
                      ) : formatTime(log.checkOut)}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>{duration}</td>
                    <td className="px-4 py-3">
                      {inside && (
                        <button onClick={() => checkOutMut.mutate(log.id)}
                          disabled={checkOutMut.isPending}
                          className="text-xs px-2 py-1 rounded-lg transition-colors"
                          style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                          <LogOut size={11} className="inline mr-1" /> Check Out
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loadLogs && logList.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-16 text-center">
                  <UserCheck size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                  <p className="text-white font-medium mb-1">No visitors {logDate === new Date().toISOString().slice(0, 10) ? 'today' : `on ${formatDate(logDate)}`}</p>
                  <button className="btn-primary mt-3" onClick={() => setShowCheckInModal(true)}><LogIn size={14} /> Check In First Visitor</button>
                </td></tr>
              )}
            </tbody>
          </table>
          {logMeta && logMeta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Total: {logMeta.total}</p>
              <div className="flex gap-1">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-xs rounded-lg hover:bg-white/5 disabled:opacity-30" style={{ color: 'rgba(255,255,255,0.5)' }}>Prev</button>
                <span className="text-xs px-2 py-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{page}/{logMeta.totalPages}</span>
                <button disabled={page === logMeta.totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-xs rounded-lg hover:bg-white/5 disabled:opacity-30" style={{ color: 'rgba(255,255,255,0.5)' }}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* All Visitors */}
      {tab === 'visitors' && (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {['Name', 'Phone', 'Company', 'ID', 'Total Visits', 'Last Visit', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loadVisitors && [...Array(5)].map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  {[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} /></td>)}
                </tr>
              ))}
              {!loadVisitors && visitorList.map((v: any) => (
                <tr key={v.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-white">{v.name}</p>
                    {v.isBlacklisted && (
                      <span className="inline-flex items-center gap-1 text-xs mt-0.5" style={{ color: '#f43f5e' }}>
                        <AlertTriangle size={10} /> Blacklisted
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>{v.phone}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{v.company ?? '—'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {v.idType ? `${v.idType.replace(/_/g, ' ')} • ${v.idNumber ?? ''}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold" style={{ color: '#818cf8' }}>{v._count?.logs ?? 0}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {v.logs?.[0]?.checkIn ? formatDateTime(v.logs[0].checkIn) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setBlacklistTarget(v)}
                      className="text-xs px-2 py-1 rounded-lg transition-colors"
                      style={{ background: v.isBlacklisted ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)', color: v.isBlacklisted ? '#10b981' : '#f43f5e' }}>
                      {v.isBlacklisted ? <><ShieldOff size={11} className="inline mr-1" /> Unblock</> : <><Shield size={11} className="inline mr-1" /> Blacklist</>}
                    </button>
                  </td>
                </tr>
              ))}
              {!loadVisitors && visitorList.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-16 text-center">
                  <Users size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                  <p className="text-white font-medium">No visitors recorded yet</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Blacklist */}
      {tab === 'blacklist' && (
        <div className="space-y-3">
          {loadVisitors && [...Array(3)].map((_, i) => (
            <div key={i} className="glass-card p-4 animate-pulse" style={{ height: 80 }} />
          ))}
          {!loadVisitors && blacklisted.map((v: any) => (
            <motion.div key={v.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(244,63,94,0.12)' }}>
                    <UserX size={16} style={{ color: '#f43f5e' }} />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{v.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{v.phone} {v.company ? `• ${v.company}` : ''}</p>
                    {v.blacklistReason && (
                      <p className="text-xs mt-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(244,63,94,0.08)', color: '#f87171' }}>
                        <AlertTriangle size={10} className="inline mr-1" /> {v.blacklistReason}
                      </p>
                    )}
                  </div>
                </div>
                <button onClick={() => setBlacklistTarget(v)}
                  className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0"
                  style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                  <ShieldOff size={12} className="inline mr-1" /> Remove
                </button>
              </div>
            </motion.div>
          ))}
          {!loadVisitors && blacklisted.length === 0 && (
            <div className="py-20 text-center">
              <Shield size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
              <p className="text-white font-medium">No blacklisted visitors</p>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Blacklisted visitors are blocked from check-in</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
