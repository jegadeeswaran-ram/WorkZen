'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Target, Star, TrendingUp, CheckCircle2, Clock, Users, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { performanceApi, employeesApi } from '@/lib/api';

// ─── Helpers ────────────────────────────────────────────────────────────────

const CARD = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 };
const INPUT_S = { background: 'var(--wz-input-bg)', border: '1px solid var(--wz-input-border)', borderRadius: 8, color: 'var(--wz-input-color)', padding: '8px 12px', width: '100%', outline: 'none', fontSize: 14 };
const BTN = { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 8, color: 'white', padding: '8px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 600 };

const TABS = ['Reviews', 'Goals', 'Cycles'] as const;
type Tab = typeof TABS[number];

const REVIEW_STATUSES = ['PENDING_SELF', 'PENDING_MANAGER', 'PENDING_HR', 'COMPLETED'];
const GOAL_TYPES = ['PERFORMANCE', 'ATTENDANCE', 'QUALITY', 'SAFETY', 'TRAINING', 'COMPLIANCE'];
const CYCLE_TYPES = ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL', 'PROBATION'];

const statusCfg: Record<string, { label: string; color: string; bg: string }> = {
  PENDING_SELF:    { label: 'Self Pending',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  PENDING_MANAGER: { label: 'Mgr Pending',     color: '#818cf8', bg: 'rgba(99,102,241,0.12)' },
  PENDING_HR:      { label: 'HR Pending',      color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  COMPLETED:       { label: 'Completed',       color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  ACTIVE:          { label: 'Active',          color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  PLANNED:         { label: 'Planned',         color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  IN_PROGRESS:     { label: 'In Progress',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
};

function Badge({ status }: { status: string }) {
  const c = statusCfg[status] ?? { label: status, color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.06)' };
  return <span style={{ background: c.bg, color: c.color, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{c.label}</span>;
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: any; sub?: string; color: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ ...CARD, padding: 20 }}>
      <div className="flex items-start gap-3">
        <div style={{ background: `${color}20`, borderRadius: 10, padding: 10 }}><Icon size={20} style={{ color }} /></div>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginBottom: 2 }}>{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {sub && <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 }}>{sub}</p>}
        </div>
      </div>
    </motion.div>
  );
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg rounded-2xl" style={{ background: 'var(--wz-card-bg)', border: '1px solid var(--wz-card-border)' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--wz-card-border)' }}>
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

// ─── Page ───────────────────────────────────────────────────────────────────

export default function PerformancePage() {
  const [tab, setTab] = useState<Tab>('Reviews');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const qc = useQueryClient();

  const { data: dash } = useQuery({ queryKey: ['perf-dash'], queryFn: performanceApi.dashboard });
  const { data: reviewsData, isLoading: loadingReviews } = useQuery({
    queryKey: ['perf-reviews', page],
    queryFn: () => performanceApi.reviews({ page, limit: 15 }),
    enabled: tab === 'Reviews',
  });
  const { data: goalsData, isLoading: loadingGoals } = useQuery({
    queryKey: ['perf-goals', page],
    queryFn: () => performanceApi.goals({ page, limit: 15 }),
    enabled: tab === 'Goals',
  });
  const { data: cycles } = useQuery({
    queryKey: ['perf-cycles'],
    queryFn: performanceApi.cycles,
    enabled: tab === 'Cycles',
  });
  const { data: employees } = useQuery({ queryKey: ['employees-select-all'], queryFn: () => employeesApi.selectAll() });

  const createReviewMut = useMutation({
    mutationFn: (d: any) => performanceApi.createReview(d),
    onSuccess: () => { toast.success('Review created'); qc.invalidateQueries({ queryKey: ['perf-reviews'] }); setShowModal(false); setForm({}); },
    onError: () => toast.error('Failed to create review'),
  });

  const createGoalMut = useMutation({
    mutationFn: (d: any) => performanceApi.createGoal(d),
    onSuccess: () => { toast.success('Goal created'); qc.invalidateQueries({ queryKey: ['perf-goals'] }); setShowModal(false); setForm({}); },
    onError: () => toast.error('Failed to create goal'),
  });

  const createCycleMut = useMutation({
    mutationFn: (d: any) => performanceApi.createCycle(d),
    onSuccess: () => { toast.success('Cycle created'); qc.invalidateQueries({ queryKey: ['perf-cycles'] }); setShowModal(false); setForm({}); },
    onError: () => toast.error('Failed to create cycle'),
  });

  const updateReviewMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => performanceApi.updateReview(id, data),
    onSuccess: () => { toast.success('Review updated'); qc.invalidateQueries({ queryKey: ['perf-reviews'] }); },
    onError: () => toast.error('Failed to update'),
  });

  const reviews = (reviewsData as any)?.data ?? [];
  const reviewMeta = (reviewsData as any)?.meta;
  const goals = (goalsData as any)?.data ?? [];
  const goalMeta = (goalsData as any)?.meta;
  const empList: any[] = Array.isArray(employees) ? employees : (employees as any)?.data ?? [];

  const handleCreate = () => {
    if (tab === 'Reviews') createReviewMut.mutate(form);
    else if (tab === 'Goals') createGoalMut.mutate(form);
    else createCycleMut.mutate(form);
  };

  const TD = ({ children, muted }: { children: React.ReactNode; muted?: boolean }) => (
    <td className="px-4 py-3.5" style={{ color: muted ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.85)', fontSize: 13 }}>{children}</td>
  );

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Performance Management</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Manage reviews, goals, and review cycles</p>
        </div>
        <button style={BTN} onClick={() => { setShowModal(true); setForm({}); }}>
          <Plus size={14} className="inline mr-1" />New {tab === 'Reviews' ? 'Review' : tab === 'Goals' ? 'Goal' : 'Cycle'}
        </button>
      </div>

      {/* KPI Cards */}
      {dash && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard icon={Users} label="Total Reviews" value={dash.totalReviews} color="#6366f1" />
          <StatCard icon={Clock} label="Pending" value={dash.pending} color="#f59e0b" />
          <StatCard icon={CheckCircle2} label="Completed" value={dash.completed} color="#10b981" />
          <StatCard icon={Target} label="Total Goals" value={dash.totalGoals} color="#a78bfa" />
          <StatCard icon={TrendingUp} label="Active Goals" value={dash.activeGoals} color="#3b82f6" />
          <StatCard icon={Star} label="Avg Rating" value={dash.avgRating ? `${Number(dash.avgRating).toFixed(1)}/5` : '—'} color="#f59e0b" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => { setTab(t); setPage(1); }}
            style={{ padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all .2s', background: tab === t ? 'rgba(99,102,241,0.3)' : 'transparent', color: tab === t ? '#818cf8' : 'rgba(255,255,255,0.45)' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Reviews Table */}
      {tab === 'Reviews' && (
        <div style={CARD}>
          <table className="w-full">
            <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Employee', 'Period', 'Self', 'Manager', 'HR', 'Final', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loadingReviews ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} /></td></tr>
                ))
              ) : reviews.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>No reviews yet</td></tr>
              ) : reviews.map((r: any) => (
                <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <TD><span className="font-medium text-white">{r.employee?.firstName} {r.employee?.lastName}</span><br /><span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{r.employee?.employeeCode}</span></TD>
                  <TD muted>{formatDate(r.reviewPeriodStart)} – {formatDate(r.reviewPeriodEnd)}</TD>
                  <TD muted>{r.selfRating ?? '—'}</TD>
                  <TD muted>{r.managerRating ?? '—'}</TD>
                  <TD muted>{r.hrRating ?? '—'}</TD>
                  <TD muted>{r.finalRating ? <span style={{ color: '#10b981', fontWeight: 700 }}>{r.finalRating}/5</span> : '—'}</TD>
                  <TD><Badge status={r.status} /></TD>
                  <td className="px-4 py-3.5">
                    {r.status === 'PENDING_SELF' && (
                      <button onClick={() => updateReviewMut.mutate({ id: r.id, data: { selfRating: 4, status: 'PENDING_MANAGER' } })}
                        style={{ fontSize: 11, color: '#818cf8', background: 'rgba(99,102,241,0.1)', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                        Submit Self
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {reviewMeta && reviewMeta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{reviewMeta.total} reviews</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ ...BTN, padding: '5px 10px', opacity: page === 1 ? 0.4 : 1 }}><ChevronLeft size={14} /></button>
                <button onClick={() => setPage(p => Math.min(reviewMeta.totalPages, p + 1))} disabled={page >= reviewMeta.totalPages} style={{ ...BTN, padding: '5px 10px', opacity: page >= reviewMeta.totalPages ? 0.4 : 1 }}><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Goals Table */}
      {tab === 'Goals' && (
        <div style={CARD}>
          <table className="w-full">
            <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Employee', 'Goal', 'Type', 'Progress', 'Due Date', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loadingGoals ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} /></td></tr>
                ))
              ) : goals.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>No goals yet</td></tr>
              ) : goals.map((g: any) => (
                <tr key={g.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <TD><span className="font-medium text-white">{g.employee?.firstName} {g.employee?.lastName}</span></TD>
                  <TD>{g.title}</TD>
                  <TD muted>{g.goalType}</TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
                        <div style={{ width: `${g.progress}%`, height: '100%', background: '#6366f1', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{g.progress}%</span>
                    </div>
                  </TD>
                  <TD muted>{g.dueDate ? formatDate(g.dueDate) : '—'}</TD>
                  <TD><Badge status={g.status} /></TD>
                </tr>
              ))}
            </tbody>
          </table>
          {goalMeta && goalMeta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{goalMeta.total} goals</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ ...BTN, padding: '5px 10px', opacity: page === 1 ? 0.4 : 1 }}><ChevronLeft size={14} /></button>
                <button onClick={() => setPage(p => Math.min(goalMeta.totalPages, p + 1))} disabled={page >= goalMeta.totalPages} style={{ ...BTN, padding: '5px 10px', opacity: page >= goalMeta.totalPages ? 0.4 : 1 }}><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cycles */}
      {tab === 'Cycles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {!cycles || (cycles as any[]).length === 0 ? (
            <div style={{ ...CARD, padding: 32, gridColumn: '1/-1', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No review cycles yet</div>
          ) : (cycles as any[]).map((c: any) => (
            <div key={c.id} style={{ ...CARD, padding: 20 }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-white">{c.name}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{c.cycleType}</p>
                </div>
                <Badge status={c.status} />
              </div>
              <div className="flex gap-4" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                <span>Start: {formatDate(c.startDate)}</span>
                <span>End: {formatDate(c.endDate)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setForm({}); }} title={`New ${tab === 'Reviews' ? 'Review' : tab === 'Goals' ? 'Goal' : 'Cycle'}`}>
        {tab === 'Reviews' && (<>
          <F label="Employee">
            <select style={INPUT_S} value={form.employeeId ?? ''} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}>
              <option value="">Select employee</option>
              {empList.map((e: any) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>)}
            </select>
          </F>
          <F label="Period Start"><input type="date" style={INPUT_S} value={form.reviewPeriodStart ?? ''} onChange={e => setForm(f => ({ ...f, reviewPeriodStart: e.target.value }))} /></F>
          <F label="Period End"><input type="date" style={INPUT_S} value={form.reviewPeriodEnd ?? ''} onChange={e => setForm(f => ({ ...f, reviewPeriodEnd: e.target.value }))} /></F>
        </>)}
        {tab === 'Goals' && (<>
          <F label="Employee">
            <select style={INPUT_S} value={form.employeeId ?? ''} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}>
              <option value="">Select employee</option>
              {empList.map((e: any) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>)}
            </select>
          </F>
          <F label="Goal Title"><input style={INPUT_S} placeholder="e.g. Improve attendance to 98%" value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></F>
          <F label="Goal Type">
            <select style={INPUT_S} value={form.goalType ?? 'PERFORMANCE'} onChange={e => setForm(f => ({ ...f, goalType: e.target.value }))}>
              {GOAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </F>
          <F label="Due Date"><input type="date" style={INPUT_S} value={form.dueDate ?? ''} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></F>
        </>)}
        {tab === 'Cycles' && (<>
          <F label="Cycle Name"><input style={INPUT_S} placeholder="e.g. Annual Review 2026" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></F>
          <F label="Cycle Type">
            <select style={INPUT_S} value={form.cycleType ?? 'ANNUAL'} onChange={e => setForm(f => ({ ...f, cycleType: e.target.value }))}>
              {CYCLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </F>
          <F label="Start Date"><input type="date" style={INPUT_S} value={form.startDate ?? ''} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></F>
          <F label="End Date"><input type="date" style={INPUT_S} value={form.endDate ?? ''} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></F>
        </>)}
        <div className="flex gap-2 pt-2">
          <button style={{ ...BTN, flex: 1 }} onClick={handleCreate} disabled={createReviewMut.isPending || createGoalMut.isPending || createCycleMut.isPending}>
            {createReviewMut.isPending || createGoalMut.isPending || createCycleMut.isPending ? 'Saving…' : 'Save'}
          </button>
          <button onClick={() => { setShowModal(false); setForm({}); }} style={{ flex: 1, background: 'var(--wz-btn-secondary-bg)', border: '1px solid var(--wz-btn-secondary-border)', borderRadius: 8, color: 'var(--wz-btn-secondary-color)', padding: '8px 16px', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
        </div>
      </Modal>
    </div>
  );
}
