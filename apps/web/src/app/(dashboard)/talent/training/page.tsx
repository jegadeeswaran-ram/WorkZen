'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, GraduationCap, BookOpen, Users, Award, CheckCircle2, Clock, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { trainingApi, employeesApi } from '@/lib/api';

const CARD = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 };
const INPUT_S = { background: 'var(--wz-input-bg)', border: '1px solid var(--wz-input-border)', borderRadius: 8, color: 'var(--wz-input-color)', padding: '8px 12px', width: '100%', outline: 'none', fontSize: 14 };
const BTN = { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 8, color: 'white', padding: '8px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 600 };

const TABS = ['Programs', 'Sessions', 'Enrollments', 'Certificates'] as const;
type Tab = typeof TABS[number];

const PROGRAM_TYPES = ['INDUCTION', 'SAFETY', 'TECHNICAL', 'SOFT_SKILLS', 'COMPLIANCE', 'LEADERSHIP', 'REFRESHER', 'CERTIFICATION'];
const SESSION_TYPES = ['CLASSROOM', 'ONLINE', 'SITE', 'PRACTICAL'];
const ENROLL_STATUSES = ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'];

const statusCfg: Record<string, { label: string; color: string; bg: string }> = {
  ASSIGNED:    { label: 'Assigned',    color: '#818cf8', bg: 'rgba(99,102,241,0.12)' },
  IN_PROGRESS: { label: 'In Progress', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  COMPLETED:   { label: 'Completed',   color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  FAILED:      { label: 'Failed',      color: '#f43f5e', bg: 'rgba(244,63,94,0.12)' },
  SCHEDULED:   { label: 'Scheduled',   color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
};

function Badge({ status }: { status: string }) {
  const c = statusCfg[status] ?? { label: status, color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.06)' };
  return <span style={{ background: c.bg, color: c.color, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{c.label}</span>;
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ ...CARD, padding: 20 }}>
      <div className="flex items-start gap-3">
        <div style={{ background: `${color}20`, borderRadius: 10, padding: 10 }}><Icon size={20} style={{ color }} /></div>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginBottom: 2 }}>{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
      </div>
    </motion.div>
  );
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto" style={{ background: 'var(--wz-card-bg)', border: '1px solid var(--wz-card-border)' }}>
        <div className="flex items-center justify-between p-5 sticky top-0" style={{ borderBottom: '1px solid var(--wz-card-border)', background: 'var(--wz-card-bg)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--wz-text-primary)' }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><X size={18} style={{ color: 'var(--wz-text-muted)' }} /></button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
      </div>
    </div>
  );
}

const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><label style={{ color: 'var(--wz-text-secondary)', fontSize: 12, display: 'block', marginBottom: 4 }}>{label}</label>{children}</div>
);

const TD = ({ children, muted }: { children: React.ReactNode; muted?: boolean }) => (
  <td className="px-4 py-3.5" style={{ color: muted ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.85)', fontSize: 13 }}>{children}</td>
);

export default function TrainingPage() {
  const [tab, setTab] = useState<Tab>('Programs');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const qc = useQueryClient();

  const { data: dash } = useQuery({ queryKey: ['training-dash'], queryFn: trainingApi.dashboard });
  const { data: programsData, isLoading: loadingPrograms } = useQuery({
    queryKey: ['training-programs', page],
    queryFn: () => trainingApi.programs({ page, limit: 15 }),
    enabled: tab === 'Programs',
  });
  const { data: sessionsData, isLoading: loadingSessions } = useQuery({
    queryKey: ['training-sessions', page],
    queryFn: () => trainingApi.sessions({ page, limit: 15 }),
    enabled: tab === 'Sessions',
  });
  const { data: enrollData, isLoading: loadingEnroll } = useQuery({
    queryKey: ['training-enroll', page],
    queryFn: () => trainingApi.enrollments({ page, limit: 15 }),
    enabled: tab === 'Enrollments',
  });
  const { data: certData, isLoading: loadingCerts } = useQuery({
    queryKey: ['training-certs', page],
    queryFn: () => trainingApi.certificates({ page, limit: 15 }),
    enabled: tab === 'Certificates',
  });
  const { data: employees } = useQuery({ queryKey: ['employees-select-all'], queryFn: () => employeesApi.selectAll() });
  const { data: programsAll } = useQuery({ queryKey: ['training-programs-all'], queryFn: () => trainingApi.programs({ limit: 200 }) });

  const createProgramMut = useMutation({ mutationFn: (d: any) => trainingApi.createProgram(d), onSuccess: () => { toast.success('Program created'); qc.invalidateQueries({ queryKey: ['training-programs'] }); setShowModal(false); setForm({}); }, onError: () => toast.error('Failed') });
  const createSessionMut = useMutation({ mutationFn: (d: any) => trainingApi.createSession(d), onSuccess: () => { toast.success('Session created'); qc.invalidateQueries({ queryKey: ['training-sessions'] }); setShowModal(false); setForm({}); }, onError: () => toast.error('Failed') });
  const assignMut = useMutation({ mutationFn: (d: any) => trainingApi.assign(d), onSuccess: () => { toast.success('Training assigned'); qc.invalidateQueries({ queryKey: ['training-enroll'] }); setShowModal(false); setForm({}); }, onError: () => toast.error('Failed') });
  const issueCertMut = useMutation({ mutationFn: (d: any) => trainingApi.issueCertificate(d), onSuccess: () => { toast.success('Certificate issued'); qc.invalidateQueries({ queryKey: ['training-certs'] }); setShowModal(false); setForm({}); }, onError: () => toast.error('Failed') });

  const programs = (programsData as any)?.data ?? [];
  const programMeta = (programsData as any)?.meta;
  const sessions = (sessionsData as any)?.data ?? [];
  const sessionMeta = (sessionsData as any)?.meta;
  const enrollments = (enrollData as any)?.data ?? [];
  const enrollMeta = (enrollData as any)?.meta;
  const certs = (certData as any)?.data ?? [];
  const certMeta = (certData as any)?.meta;
  const empList: any[] = Array.isArray(employees) ? employees : (employees as any)?.data ?? [];
  const allPrograms = (programsAll as any)?.data ?? [];

  const handleCreate = () => {
    if (tab === 'Programs') createProgramMut.mutate(form);
    else if (tab === 'Sessions') createSessionMut.mutate(form);
    else if (tab === 'Enrollments') assignMut.mutate(form);
    else issueCertMut.mutate(form);
  };

  const isSaving = createProgramMut.isPending || createSessionMut.isPending || assignMut.isPending || issueCertMut.isPending;

  const Pagination = ({ meta }: { meta: any }) => meta?.totalPages > 1 ? (
    <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{meta.total} records</span>
      <div className="flex gap-2">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ ...BTN, padding: '5px 10px', opacity: page === 1 ? 0.4 : 1 }}><ChevronLeft size={14} /></button>
        <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages} style={{ ...BTN, padding: '5px 10px', opacity: page >= meta.totalPages ? 0.4 : 1 }}><ChevronRight size={14} /></button>
      </div>
    </div>
  ) : null;

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Training & Development</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Manage programs, sessions, enrollments, and certificates</p>
        </div>
        <button style={BTN} onClick={() => { setShowModal(true); setForm({}); }}>
          <Plus size={14} className="inline mr-1" />
          {tab === 'Programs' ? 'New Program' : tab === 'Sessions' ? 'New Session' : tab === 'Enrollments' ? 'Assign Training' : 'Issue Certificate'}
        </button>
      </div>

      {dash && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard icon={BookOpen} label="Active Programs" value={dash.programs} color="#6366f1" />
          <StatCard icon={Clock} label="Upcoming Sessions" value={dash.upcomingSessions} color="#f59e0b" />
          <StatCard icon={Users} label="Total Enrollments" value={dash.totalEnrollments} color="#3b82f6" />
          <StatCard icon={CheckCircle2} label="Completed" value={dash.completed} color="#10b981" />
          <StatCard icon={GraduationCap} label="Pending" value={dash.pending} color="#a78bfa" />
          <StatCard icon={Award} label="Active Certs" value={dash.activeCerts} color="#f59e0b" />
        </div>
      )}

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => { setTab(t); setPage(1); }}
            style={{ padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all .2s', background: tab === t ? 'rgba(99,102,241,0.3)' : 'transparent', color: tab === t ? '#818cf8' : 'rgba(255,255,255,0.45)' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Programs */}
      {tab === 'Programs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loadingPrograms ? Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ ...CARD, padding: 20, height: 120 }} className="animate-pulse" />) :
            programs.length === 0 ? <div style={{ ...CARD, padding: 32, gridColumn: '1/-1', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No programs yet</div> :
            programs.map((p: any) => (
              <div key={p.id} style={{ ...CARD, padding: 20 }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-white">{p.name}</h3>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{p.code ?? p.programType}</p>
                  </div>
                  {p.isMandatory && <span style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>MANDATORY</span>}
                </div>
                <div className="flex gap-4 mt-3" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                  <span>{p.durationHours ? `${p.durationHours}h` : '—'}</span>
                  <span>Pass: {p.passScore ?? 60}%</span>
                  <span>{p._count?.sessions ?? 0} sessions</span>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* Sessions */}
      {tab === 'Sessions' && (
        <div style={CARD}>
          <table className="w-full">
            <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Program', 'Session', 'Type', 'Date', 'Trainer', 'Enrolled', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loadingSessions ? Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} /></td></tr>) :
                sessions.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>No sessions yet</td></tr> :
                sessions.map((s: any) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <TD muted>{s.program?.name}</TD>
                    <TD><span className="font-medium text-white">{s.title}</span></TD>
                    <TD muted>{s.sessionType}</TD>
                    <TD muted>{formatDate(s.scheduledDate)}</TD>
                    <TD muted>{s.trainerName ?? '—'}</TD>
                    <TD muted>{s._count?.enrollments ?? 0}{s.maxCapacity ? `/${s.maxCapacity}` : ''}</TD>
                    <TD><Badge status={s.status} /></TD>
                  </tr>
                ))}
            </tbody>
          </table>
          <Pagination meta={sessionMeta} />
        </div>
      )}

      {/* Enrollments */}
      {tab === 'Enrollments' && (
        <div style={CARD}>
          <table className="w-full">
            <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Employee', 'Session', 'Enrolled', 'Completed', 'Score', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loadingEnroll ? Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} /></td></tr>) :
                enrollments.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>No enrollments yet</td></tr> :
                enrollments.map((e: any) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <TD><span className="font-medium text-white">{e.employee?.firstName} {e.employee?.lastName}</span><br /><span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{e.employee?.employeeCode}</span></TD>
                    <TD muted>{e.session?.title ?? '—'}</TD>
                    <TD muted>{formatDate(e.enrolledAt)}</TD>
                    <TD muted>{e.completedAt ? formatDate(e.completedAt) : '—'}</TD>
                    <TD muted>{e.score != null ? `${e.score}%` : '—'}</TD>
                    <TD><Badge status={e.status} /></TD>
                  </tr>
                ))}
            </tbody>
          </table>
          <Pagination meta={enrollMeta} />
        </div>
      )}

      {/* Certificates */}
      {tab === 'Certificates' && (
        <div style={CARD}>
          <table className="w-full">
            <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Employee', 'Cert No', 'Issued', 'Expiry', 'Valid'].map(h => (
                <th key={h} className="px-4 py-3 text-left" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loadingCerts ? Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} /></td></tr>) :
                certs.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>No certificates yet</td></tr> :
                certs.map((c: any) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <TD><span className="font-medium text-white">{c.employee?.firstName} {c.employee?.lastName}</span><br /><span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{c.employee?.employeeCode}</span></TD>
                    <TD><span style={{ fontFamily: 'monospace', color: '#818cf8' }}>{c.certificateNo}</span></TD>
                    <TD muted>{formatDate(c.issuedDate)}</TD>
                    <TD muted>{c.expiryDate ? formatDate(c.expiryDate) : 'No Expiry'}</TD>
                    <TD><span style={{ color: c.isValid ? '#10b981' : '#f43f5e' }}>{c.isValid ? '✓ Valid' : '✗ Revoked'}</span></TD>
                  </tr>
                ))}
            </tbody>
          </table>
          <Pagination meta={certMeta} />
        </div>
      )}

      {/* Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setForm({}); }} title={tab === 'Programs' ? 'New Training Program' : tab === 'Sessions' ? 'New Session' : tab === 'Enrollments' ? 'Assign Training' : 'Issue Certificate'}>
        {tab === 'Programs' && (<>
          <F label="Program Name"><input style={INPUT_S} placeholder="e.g. Security Guard Training" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></F>
          <F label="Program Code"><input style={INPUT_S} placeholder="e.g. SGT-01" value={form.code ?? ''} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} /></F>
          <F label="Type"><select style={INPUT_S} value={form.programType ?? 'INDUCTION'} onChange={e => setForm(f => ({ ...f, programType: e.target.value }))}>{PROGRAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></F>
          <F label="Duration (hours)"><input type="number" style={INPUT_S} value={form.durationHours ?? ''} onChange={e => setForm(f => ({ ...f, durationHours: Number(e.target.value) }))} /></F>
          <F label="Pass Score (%)"><input type="number" style={INPUT_S} value={form.passScore ?? 60} onChange={e => setForm(f => ({ ...f, passScore: Number(e.target.value) }))} /></F>
          <div className="flex items-center gap-2"><input type="checkbox" checked={form.isMandatory ?? false} onChange={e => setForm(f => ({ ...f, isMandatory: e.target.checked }))} /><label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Mandatory Training</label></div>
        </>)}
        {tab === 'Sessions' && (<>
          <F label="Program"><select style={INPUT_S} value={form.programId ?? ''} onChange={e => setForm(f => ({ ...f, programId: e.target.value }))}><option value="">Select program</option>{allPrograms.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></F>
          <F label="Session Title"><input style={INPUT_S} placeholder="e.g. Batch 1 - June 2026" value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></F>
          <F label="Type"><select style={INPUT_S} value={form.sessionType ?? 'CLASSROOM'} onChange={e => setForm(f => ({ ...f, sessionType: e.target.value }))}>{SESSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></F>
          <F label="Scheduled Date"><input type="date" style={INPUT_S} value={form.scheduledDate ?? ''} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} /></F>
          <F label="Trainer Name"><input style={INPUT_S} value={form.trainerName ?? ''} onChange={e => setForm(f => ({ ...f, trainerName: e.target.value }))} /></F>
          <F label="Venue"><input style={INPUT_S} value={form.venue ?? ''} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} /></F>
          <F label="Max Capacity"><input type="number" style={INPUT_S} value={form.maxCapacity ?? ''} onChange={e => setForm(f => ({ ...f, maxCapacity: Number(e.target.value) }))} /></F>
        </>)}
        {tab === 'Enrollments' && (<>
          <F label="Employee"><select style={INPUT_S} value={form.employeeId ?? ''} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}><option value="">Select employee</option>{empList.map((e: any) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>)}</select></F>
          <F label="Program"><select style={INPUT_S} value={form.programId ?? ''} onChange={e => setForm(f => ({ ...f, programId: e.target.value }))}><option value="">Select program</option>{allPrograms.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></F>
        </>)}
        {tab === 'Certificates' && (<>
          <F label="Employee"><select style={INPUT_S} value={form.employeeId ?? ''} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}><option value="">Select employee</option>{empList.map((e: any) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>)}</select></F>
          <F label="Program"><select style={INPUT_S} value={form.programId ?? ''} onChange={e => setForm(f => ({ ...f, programId: e.target.value }))}><option value="">Select program</option>{allPrograms.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></F>
          <F label="Issued Date"><input type="date" style={INPUT_S} value={form.issuedDate ?? ''} onChange={e => setForm(f => ({ ...f, issuedDate: e.target.value }))} /></F>
          <F label="Expiry Date"><input type="date" style={INPUT_S} value={form.expiryDate ?? ''} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} /></F>
        </>)}
        <div className="flex gap-2 pt-2">
          <button style={{ ...BTN, flex: 1 }} onClick={handleCreate} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save'}</button>
          <button onClick={() => { setShowModal(false); setForm({}); }} style={{ flex: 1, background: 'var(--wz-btn-secondary-bg)', border: '1px solid var(--wz-btn-secondary-border)', borderRadius: 8, color: 'var(--wz-btn-secondary-color)', padding: '8px 16px', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
        </div>
      </Modal>
    </div>
  );
}
