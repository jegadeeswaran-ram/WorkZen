'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DUMMY_REQUISITIONS_DATA, DUMMY_CANDIDATES_DATA } from '@/lib/dummy-data';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Users,
  UserCheck,
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  Briefcase,
  MapPin,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, statusColor } from '@/lib/utils';
import { recruitmentApi } from '@/lib/api';
import { DonutChart } from '@/components/charts/donut-chart';
import { BarChart } from '@/components/charts/bar-chart';

// ────────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────────
const REQUISITION_STATUSES = ['ALL', 'OPEN', 'SCREENING', 'INTERVIEW', 'OFFER', 'JOINED', 'CLOSED'];
const CANDIDATE_STATUSES = ['APPLIED', 'SCREENING', 'INTERVIEW', 'ASSESSMENT', 'OFFERED', 'JOINED', 'REJECTED'];
const CANDIDATE_FILTER_STATUSES = ['ALL', ...CANDIDATE_STATUSES];
const URGENCY_OPTIONS = ['NORMAL', 'HIGH', 'URGENT'];
const SOURCE_OPTIONS = ['WALK-IN', 'REFERRAL', 'ONLINE', 'AGENCY', 'OTHER'];

// ────────────────────────────────────────────────────────────────────────────────
// Zod schemas
// ────────────────────────────────────────────────────────────────────────────────
const requisitionSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  vacancies: z.coerce.number().int().min(1, 'Must be at least 1'),
  location: z.string().min(2, 'Location is required'),
  urgency: z.enum(['NORMAL', 'HIGH', 'URGENT']),
  qualification: z.string().optional(),
  experience: z.string().optional(),
  targetDate: z.string().optional(),
});
type RequisitionForm = z.infer<typeof requisitionSchema>;

const candidateSchema = z.object({
  requisitionId: z.string().min(1, 'Please select a requisition'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(6, 'Phone is required'),
  email: z.string().email().optional().or(z.literal('')),
  qualification: z.string().optional(),
  experience: z.string().optional(),
  source: z.enum(['WALK-IN', 'REFERRAL', 'ONLINE', 'AGENCY', 'OTHER']).optional(),
});
type CandidateForm = z.infer<typeof candidateSchema>;

// ────────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────────
function urgencyBadge(urgency: string) {
  if (urgency === 'URGENT') return 'badge badge-danger';
  if (urgency === 'HIGH') return 'badge badge-warning';
  return 'badge badge-neutral';
}

// ────────────────────────────────────────────────────────────────────────────────
// Field component
// ────────────────────────────────────────────────────────────────────────────────
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--wz-text-secondary)' }}>
        {label}
      </label>
      {children}
      {error && <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>}
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2 rounded-xl text-sm outline-none transition-colors';
const inputStyle = {
  background: 'var(--wz-input-bg)',
  border: '1px solid var(--wz-input-border)',
  color: 'var(--wz-input-color)',
};

// ────────────────────────────────────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────────────────────────────────────
export default function RecruitmentPage() {
  const queryClient = useQueryClient();

  // Tab
  const [activeTab, setActiveTab] = useState<'requisitions' | 'candidates'>('requisitions');

  // Requisition filters
  const [reqStatus, setReqStatus] = useState('ALL');
  const [reqSearch, setReqSearch] = useState('');
  const [reqPage, setReqPage] = useState(1);

  // Candidate filters
  const [candStatus, setCandStatus] = useState('ALL');
  const [candSearch, setCandSearch] = useState('');
  const [candPage, setCandPage] = useState(1);

  // Modals
  const [showReqModal, setShowReqModal] = useState(false);
  const [showCandModal, setShowCandModal] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: reqData, isLoading: reqLoading } = useQuery({
    queryKey: ['recruitment-requisitions', { reqStatus, reqSearch, reqPage }],
    queryFn: () =>
      recruitmentApi.requisitions({
        status: reqStatus === 'ALL' ? undefined : reqStatus,
        search: reqSearch || undefined,
        page: reqPage,
        limit: 10,
      }),
    placeholderData: DUMMY_REQUISITIONS_DATA,
  });

  const { data: candData, isLoading: candLoading } = useQuery({
    queryKey: ['recruitment-candidates', { candStatus, candSearch, candPage }],
    queryFn: () =>
      recruitmentApi.candidates({
        status: candStatus === 'ALL' ? undefined : candStatus,
        search: candSearch || undefined,
        page: candPage,
        limit: 10,
      }),
    placeholderData: DUMMY_CANDIDATES_DATA,
  });

  const { data: openReqData } = useQuery({
    queryKey: ['recruitment-open-count'],
    queryFn: () => recruitmentApi.requisitions({ status: 'OPEN', limit: 1, page: 1 }),
  });

  const { data: offeredData } = useQuery({
    queryKey: ['recruitment-offered-count'],
    queryFn: () => recruitmentApi.candidates({ status: 'OFFERED', limit: 1, page: 1 }),
  });

  // Full list for select dropdowns — independent of table filters/pagination
  const { data: allOpenReqs } = useQuery({
    queryKey: ['recruitment-all-open-reqs'],
    queryFn: recruitmentApi.allOpenRequisitions,
  });

  const reqs: Record<string, unknown>[] = reqData?.data?.length ? reqData.data : (DUMMY_REQUISITIONS_DATA.data as any);
  const reqMeta = reqData?.meta;
  const candidates: Record<string, unknown>[] = candData?.data?.length ? candData.data : (DUMMY_CANDIDATES_DATA.data as any);
  const candMeta = candData?.meta;

  // KPI derived values
  const openCount = openReqData?.meta?.total ?? 0;
  const totalCandidates = candMeta?.total ?? 0;
  const offeredCount = offeredData?.meta?.total ?? 0;

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const {
    register: regReq,
    handleSubmit: handleReqSubmit,
    reset: resetReq,
    formState: { errors: reqErrors },
  } = useForm<RequisitionForm>({ resolver: zodResolver(requisitionSchema) });

  const { mutate: createRequisition, isPending: creatingReq } = useMutation({
    mutationFn: (data: RequisitionForm) =>
      recruitmentApi.createRequisition(data as unknown as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment-requisitions'] });
      toast.success('Requisition created');
      setShowReqModal(false);
      resetReq();
    },
    onError: () => toast.error('Failed to create requisition'),
  });

  const {
    register: regCand,
    handleSubmit: handleCandSubmit,
    reset: resetCand,
    formState: { errors: candErrors },
  } = useForm<CandidateForm>({ resolver: zodResolver(candidateSchema) });

  const { mutate: addCandidate, isPending: addingCand } = useMutation({
    mutationFn: (data: CandidateForm) => {
      const { requisitionId, ...rest } = data;
      return recruitmentApi.addCandidate(requisitionId, rest as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment-candidates'] });
      queryClient.invalidateQueries({ queryKey: ['recruitment-requisitions'] });
      toast.success('Candidate added');
      setShowCandModal(false);
      resetCand();
    },
    onError: () => toast.error('Failed to add candidate'),
  });

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      recruitmentApi.updateCandidateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment-candidates'] });
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Recruitment Pipeline
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Job requisitions, candidates, and interview scheduling
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'requisitions' && (
            <button className="btn-primary" onClick={() => setShowReqModal(true)}>
              <Plus size={14} /> New Requisition
            </button>
          )}
          {activeTab === 'candidates' && (
            <button className="btn-primary" onClick={() => setShowCandModal(true)}>
              <Plus size={14} /> Add Candidate
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Open Positions', value: openCount, color: '#6366f1', icon: <Briefcase size={16} /> },
          { label: 'Active Candidates', value: totalCandidates, color: '#3b82f6', icon: <Users size={16} /> },
          { label: 'Scheduled Today', value: 0, color: '#f59e0b', icon: <Calendar size={16} /> },
          { label: 'Offers Pending', value: offeredCount, color: '#10b981', icon: <FileText size={16} /> },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="stat-card"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {s.label}
                </p>
                <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                  {s.value}
                </p>
              </div>
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}25` }}
              >
                {s.icon}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white mb-3" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Candidate Funnel
          </h3>
          <DonutChart
            series={[87, 54, 28, 12, 9]}
            labels={['Screening', 'Interview', 'Assessment', 'Offer', 'Joined']}
            colors={['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#10b981']}
            height={200}
          />
        </div>
        <div className="glass-card p-5 lg:col-span-2">
          <h3 className="font-semibold text-white mb-4" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Monthly Hires vs Requisitions
          </h3>
          <BarChart
            series={[
              { name: 'Requisitions', data: [18, 22, 15, 28, 20, 25] },
              { name: 'Joined', data: [12, 18, 10, 22, 16, 20] },
            ]}
            categories={['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']}
            height={180}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {(['requisitions', 'candidates'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all"
            style={{
              background: activeTab === tab ? 'rgba(99,102,241,0.2)' : 'transparent',
              color: activeTab === tab ? '#818cf8' : 'rgba(255,255,255,0.4)',
              border: activeTab === tab ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
            }}
          >
            {tab === 'requisitions' ? (
              <span className="flex items-center gap-1.5"><Briefcase size={13} /> Requisitions</span>
            ) : (
              <span className="flex items-center gap-1.5"><UserCheck size={13} /> Candidates</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Requisitions View ─────────────────────────────────────────────────── */}
      {activeTab === 'requisitions' && (
        <div className="glass-card overflow-hidden">
          {/* Toolbar */}
          <div
            className="p-4 border-b flex flex-wrap gap-3 items-center"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="flex items-center gap-2 flex-1 min-w-48 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <Search size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input
                value={reqSearch}
                onChange={(e) => { setReqSearch(e.target.value); setReqPage(1); }}
                placeholder="Search requisitions..."
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {REQUISITION_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => { setReqStatus(s); setReqPage(1); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: reqStatus === s ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                    color: reqStatus === s ? '#818cf8' : 'rgba(255,255,255,0.4)',
                    border: `1px solid ${reqStatus === s ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {reqLoading ? (
              <div className="p-8 space-y-3">
                {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-14" />)}
              </div>
            ) : reqs.length === 0 ? (
              <div className="p-16 text-center">
                <Briefcase size={40} style={{ color: 'rgba(255,255,255,0.1)' }} className="mx-auto mb-3" />
                <p className="text-white font-medium">No requisitions found</p>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Create your first job requisition to start hiring
                </p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Role / Title</th>
                    <th>Location</th>
                    <th>Vacancies</th>
                    <th>Applied</th>
                    <th>Urgency</th>
                    <th>Target Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reqs.map((r: Record<string, unknown>, i: number) => (
                    <motion.tr
                      key={r.id as string}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <td>
                        <div className="font-medium text-white text-sm">{r.title as string}</div>
                        {r.qualification && (
                          <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            {r.qualification as string}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="flex items-center gap-1 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          <MapPin size={11} />
                          {(r.location as string) ?? '—'}
                        </span>
                      </td>
                      <td>
                        <span className="font-bold text-white">{r.vacancies as number}</span>
                        <span className="text-xs ml-1" style={{ color: 'rgba(255,255,255,0.4)' }}>pos</span>
                      </td>
                      <td style={{ color: '#818cf8' }}>
                        {((r._count as Record<string, unknown>)?.candidates as number) ?? 0}
                      </td>
                      <td>
                        <span className={urgencyBadge(r.urgency as string)}>{r.urgency as string}</span>
                      </td>
                      <td style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {r.targetDate ? formatDate(r.targetDate as string) : '—'}
                      </td>
                      <td>
                        <span className={`badge ${statusColor(r.status as string)}`}>{r.status as string}</span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {reqMeta && reqMeta.totalPages > 1 && (
            <div
              className="px-4 py-3 border-t flex items-center justify-between"
              style={{ borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {reqMeta.total} requisitions
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setReqPage((p) => Math.max(1, p - 1))}
                  disabled={reqPage === 1}
                  className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-white/5"
                >
                  <ChevronLeft size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
                </button>
                <span className="text-xs px-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {reqPage} / {reqMeta.totalPages}
                </span>
                <button
                  onClick={() => setReqPage((p) => Math.min(reqMeta.totalPages, p + 1))}
                  disabled={reqPage === reqMeta.totalPages}
                  className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-white/5"
                >
                  <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Candidates View ───────────────────────────────────────────────────── */}
      {activeTab === 'candidates' && (
        <div className="glass-card overflow-hidden">
          {/* Toolbar */}
          <div
            className="p-4 border-b flex flex-wrap gap-3 items-center"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="flex items-center gap-2 flex-1 min-w-48 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <Search size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input
                value={candSearch}
                onChange={(e) => { setCandSearch(e.target.value); setCandPage(1); }}
                placeholder="Search candidates..."
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {CANDIDATE_FILTER_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => { setCandStatus(s); setCandPage(1); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: candStatus === s ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                    color: candStatus === s ? '#818cf8' : 'rgba(255,255,255,0.4)',
                    border: `1px solid ${candStatus === s ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {candLoading ? (
              <div className="p-8 space-y-3">
                {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-14" />)}
              </div>
            ) : candidates.length === 0 ? (
              <div className="p-16 text-center">
                <Users size={40} style={{ color: 'rgba(255,255,255,0.1)' }} className="mx-auto mb-3" />
                <p className="text-white font-medium">No candidates found</p>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Add candidates to job requisitions to track them here
                </p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Qualification</th>
                    <th>Experience</th>
                    <th>Applied</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c: Record<string, unknown>, i: number) => (
                    <motion.tr
                      key={c.id as string}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <td>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
                          >
                            {((c.firstName as string)?.[0] ?? '') + ((c.lastName as string)?.[0] ?? '')}
                          </div>
                          <div>
                            <div className="font-medium text-white text-sm">
                              {(c.firstName as string)} {(c.lastName as string)}
                            </div>
                            {c.source && (
                              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                {c.source as string}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'rgba(255,255,255,0.6)' }}>{(c.phone as string) ?? '—'}</td>
                      <td style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>{(c.email as string) ?? '—'}</td>
                      <td style={{ color: 'rgba(255,255,255,0.5)' }}>{(c.qualification as string) ?? '—'}</td>
                      <td style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {c.experience ? (
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {c.experience as string}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                        {formatDate(c.createdAt as string)}
                      </td>
                      <td>
                        <select
                          value={c.status as string}
                          onChange={(e) => updateStatus({ id: c.id as string, status: e.target.value })}
                          className="text-xs rounded-lg px-2 py-1 cursor-pointer"
                          style={{
                            background: 'rgba(99,102,241,0.15)',
                            color: '#818cf8',
                            border: '1px solid rgba(99,102,241,0.3)',
                            outline: 'none',
                          }}
                        >
                          {CANDIDATE_STATUSES.map((s) => (
                            <option key={s} value={s} style={{ background: 'var(--wz-card-bg)', color: 'var(--wz-text-primary)' }}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {candMeta && candMeta.totalPages > 1 && (
            <div
              className="px-4 py-3 border-t flex items-center justify-between"
              style={{ borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {candMeta.total} candidates
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCandPage((p) => Math.max(1, p - 1))}
                  disabled={candPage === 1}
                  className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-white/5"
                >
                  <ChevronLeft size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
                </button>
                <span className="text-xs px-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {candPage} / {candMeta.totalPages}
                </span>
                <button
                  onClick={() => setCandPage((p) => Math.min(candMeta.totalPages, p + 1))}
                  disabled={candPage === candMeta.totalPages}
                  className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-white/5"
                >
                  <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Create Requisition Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showReqModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowReqModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                  New Job Requisition
                </h3>
                <button
                  onClick={() => setShowReqModal(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
                </button>
              </div>

              <form onSubmit={handleReqSubmit((d) => createRequisition(d))} className="space-y-4">
                <Field label="Job Title *" error={reqErrors.title?.message}>
                  <input {...regReq('title')} placeholder="e.g. Security Guard" className={inputCls} style={inputStyle} />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Vacancies *" error={reqErrors.vacancies?.message}>
                    <input {...regReq('vacancies')} type="number" min={1} placeholder="10" className={inputCls} style={inputStyle} />
                  </Field>
                  <Field label="Urgency *" error={reqErrors.urgency?.message}>
                    <select {...regReq('urgency')} className={inputCls} style={inputStyle}>
                      {URGENCY_OPTIONS.map((o) => (
                        <option key={o} value={o} style={{ background: 'var(--wz-card-bg)' }}>{o}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="Location *" error={reqErrors.location?.message}>
                  <input {...regReq('location')} placeholder="e.g. Chennai, Tamil Nadu" className={inputCls} style={inputStyle} />
                </Field>

                <Field label="Qualification" error={reqErrors.qualification?.message}>
                  <input {...regReq('qualification')} placeholder="e.g. 10th Pass / Graduate" className={inputCls} style={inputStyle} />
                </Field>

                <Field label="Experience Required" error={reqErrors.experience?.message}>
                  <input {...regReq('experience')} placeholder="e.g. 1-3 years" className={inputCls} style={inputStyle} />
                </Field>

                <Field label="Target Date" error={reqErrors.targetDate?.message}>
                  <input {...regReq('targetDate')} type="date" className={inputCls} style={inputStyle} />
                </Field>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReqModal(false)}
                    className="flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      color: 'rgba(255,255,255,0.6)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={creatingReq} className="btn-primary flex-1 justify-center">
                    {creatingReq ? 'Creating...' : 'Create Requisition'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Candidate Modal ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCandModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowCandModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                  Add Candidate
                </h3>
                <button
                  onClick={() => setShowCandModal(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
                </button>
              </div>

              <form onSubmit={handleCandSubmit((d) => addCandidate(d))} className="space-y-4">
                <Field label="Job Requisition *" error={candErrors.requisitionId?.message}>
                  <select {...regCand('requisitionId')} className={inputCls} style={inputStyle}>
                    <option value="" style={{ background: 'var(--wz-card-bg)' }}>Select a requisition...</option>
                    {(allOpenReqs ?? reqs).map((r) => (
                      <option key={r.id as string} value={r.id as string} style={{ background: 'var(--wz-card-bg)' }}>
                        {r.requisitionNo as string} — {r.title as string}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="First Name *" error={candErrors.firstName?.message}>
                    <input {...regCand('firstName')} placeholder="First name" className={inputCls} style={inputStyle} />
                  </Field>
                  <Field label="Last Name *" error={candErrors.lastName?.message}>
                    <input {...regCand('lastName')} placeholder="Last name" className={inputCls} style={inputStyle} />
                  </Field>
                </div>

                <Field label="Phone *" error={candErrors.phone?.message}>
                  <input {...regCand('phone')} placeholder="+91 98765 43210" className={inputCls} style={inputStyle} />
                </Field>

                <Field label="Email" error={candErrors.email?.message}>
                  <input {...regCand('email')} type="email" placeholder="candidate@email.com" className={inputCls} style={inputStyle} />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Qualification" error={candErrors.qualification?.message}>
                    <input {...regCand('qualification')} placeholder="e.g. B.Sc" className={inputCls} style={inputStyle} />
                  </Field>
                  <Field label="Experience" error={candErrors.experience?.message}>
                    <input {...regCand('experience')} placeholder="e.g. 2 years" className={inputCls} style={inputStyle} />
                  </Field>
                </div>

                <Field label="Source" error={candErrors.source?.message}>
                  <select {...regCand('source')} className={inputCls} style={inputStyle}>
                    <option value="" style={{ background: 'var(--wz-card-bg)' }}>Select source...</option>
                    {SOURCE_OPTIONS.map((o) => (
                      <option key={o} value={o} style={{ background: 'var(--wz-card-bg)' }}>{o}</option>
                    ))}
                  </select>
                </Field>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCandModal(false)}
                    className="flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      color: 'rgba(255,255,255,0.6)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={addingCand} className="btn-primary flex-1 justify-center">
                    {addingCand ? 'Adding...' : 'Add Candidate'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
