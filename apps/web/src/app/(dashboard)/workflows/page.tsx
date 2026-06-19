'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, CheckCircle2, Clock, Check, X, ChevronRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { workflowsApi } from '@/lib/api';

type WorkflowStep = {
  name: string;
  approverRole: string;
  order?: number;
};

type WorkflowDefinition = {
  id: string;
  name: string;
  module: string;
  description?: string;
  isActive: boolean;
  steps: WorkflowStep[];
};

type ApprovalInstance = {
  workflow: { name: string; module: string };
  entityType: string;
  entityId: string;
  status: string;
};

type Approval = {
  id: string;
  workflowInstanceId: string;
  action?: string;
  comments?: string;
  createdAt?: string;
  instance: ApprovalInstance;
};

const MODULE_COLORS: Record<string, string> = {
  PAYROLL: '#6366f1',
  LEAVE: '#10b981',
  BILLING: '#f59e0b',
  RECRUITMENT: '#3b82f6',
  COMPLIANCE: '#8b5cf6',
  ASSETS: '#f43f5e',
  TENDER: '#06b6d4',
  DEFAULT: '#6366f1',
};

function moduleBadgeStyle(module: string) {
  const color = MODULE_COLORS[module] ?? MODULE_COLORS.DEFAULT;
  return {
    background: `${color}22`,
    color: color,
    border: `1px solid ${color}33`,
  };
}

export default function WorkflowsPage() {
  const [activeTab, setActiveTab] = useState<'approvals' | 'definitions'>('approvals');
  const [comments, setComments] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const { data: myApprovals, isLoading: approvalsLoading } = useQuery<Approval[]>({
    queryKey: ['my-approvals'],
    queryFn: workflowsApi.myApprovals,
  });

  const { data: definitions, isLoading: definitionsLoading } = useQuery<WorkflowDefinition[]>({
    queryKey: ['workflow-definitions'],
    queryFn: workflowsApi.definitions,
  });

  const { mutate: takeAction, isPending: actioning } = useMutation({
    mutationFn: ({
      id,
      action,
      comments: c,
    }: {
      id: string;
      action: 'APPROVED' | 'REJECTED';
      comments?: string;
    }) => workflowsApi.action(id, action, c),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-approvals'] });
      toast.success('Action taken successfully');
    },
    onError: () => toast.error('Failed to take action'),
  });

  const approvalsList: Approval[] = myApprovals ?? [];
  const definitionsList: WorkflowDefinition[] = definitions ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Workflow &amp; Approvals
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Multi-level approval workflows
          </p>
        </div>
        {approvalsList.length > 0 && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{
              background: 'rgba(244,63,94,0.1)',
              border: '1px solid rgba(244,63,94,0.2)',
            }}
          >
            <AlertCircle size={14} style={{ color: '#fb7185' }} />
            <span className="text-sm font-semibold" style={{ color: '#fb7185' }}>
              {approvalsList.length} Pending
            </span>
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(244,63,94,0.15)' }}
            >
              <AlertCircle size={20} style={{ color: '#fb7185' }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{approvalsList.length}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Pending Approvals
              </p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(99,102,241,0.15)' }}
            >
              <GitBranch size={20} style={{ color: '#818cf8' }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{definitionsList.length}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Active Workflows
              </p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(16,185,129,0.15)' }}
            >
              <CheckCircle2 size={20} style={{ color: '#34d399' }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">0</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Completed Today
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl w-fit"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {(
          [
            { key: 'approvals', label: 'My Approvals' },
            { key: 'definitions', label: 'Workflow Definitions' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={
              activeTab === tab.key
                ? {
                    background: 'rgba(99,102,241,0.2)',
                    color: '#818cf8',
                    border: '1px solid rgba(99,102,241,0.3)',
                  }
                : {
                    color: 'rgba(255,255,255,0.4)',
                    border: '1px solid transparent',
                  }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* My Approvals tab */}
      <AnimatePresence mode="wait">
        {activeTab === 'approvals' && (
          <motion.div
            key="approvals"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {approvalsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="skeleton h-48 rounded-2xl" />
                ))}
              </div>
            ) : approvalsList.length === 0 ? (
              <div
                className="glass-card p-16 text-center"
                style={{ border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <CheckCircle2
                  size={48}
                  className="mx-auto mb-4"
                  style={{ color: 'rgba(16,185,129,0.5)' }}
                />
                <p className="text-white font-semibold text-base mb-1">All caught up!</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  No pending approvals.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {approvalsList.map((approval, i) => (
                  <motion.div
                    key={approval.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="glass-card p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-white text-sm">
                            {approval.instance.workflow.name}
                          </p>
                          <span
                            className="badge text-xs mt-1 inline-block px-2 py-0.5 rounded-lg font-medium"
                            style={moduleBadgeStyle(approval.instance.workflow.module)}
                          >
                            {approval.instance.workflow.module}
                          </span>
                        </div>
                        <span
                          className="text-xs flex-shrink-0 ml-2"
                          style={{ color: 'rgba(255,255,255,0.4)' }}
                        >
                          {approval.createdAt ? formatDate(approval.createdAt) : '—'}
                        </span>
                      </div>
                      <p className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        {approval.instance.entityType} #
                        {(approval.instance.entityId as string).slice(-6)}
                      </p>
                      <input
                        placeholder="Add comment (optional)"
                        value={comments[approval.id] ?? ''}
                        onChange={(e) =>
                          setComments((prev) => ({ ...prev, [approval.id]: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-xl text-sm outline-none mb-3"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: 'white',
                        }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            takeAction({
                              id: approval.id,
                              action: 'APPROVED',
                              comments: comments[approval.id],
                            })
                          }
                          disabled={actioning}
                          className="flex-1 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5"
                          style={{
                            background: 'rgba(16,185,129,0.15)',
                            color: '#34d399',
                            border: '1px solid rgba(16,185,129,0.25)',
                          }}
                        >
                          <Check size={14} />
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            takeAction({
                              id: approval.id,
                              action: 'REJECTED',
                              comments: comments[approval.id],
                            })
                          }
                          disabled={actioning}
                          className="flex-1 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5"
                          style={{
                            background: 'rgba(244,63,94,0.15)',
                            color: '#fb7185',
                            border: '1px solid rgba(244,63,94,0.25)',
                          }}
                        >
                          <X size={14} />
                          Reject
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Workflow Definitions tab */}
        {activeTab === 'definitions' && (
          <motion.div
            key="definitions"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {definitionsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="skeleton h-48 rounded-2xl" />
                ))}
              </div>
            ) : definitionsList.length === 0 ? (
              <div className="glass-card p-16 text-center">
                <GitBranch
                  size={48}
                  className="mx-auto mb-4"
                  style={{ color: 'rgba(99,102,241,0.4)' }}
                />
                <p className="text-white font-semibold mb-1">No workflow definitions</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Workflow definitions will appear here once created.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {definitionsList.map((wf, i) => {
                  const color = MODULE_COLORS[wf.module] ?? MODULE_COLORS.DEFAULT;
                  return (
                    <motion.div
                      key={wf.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="glass-card p-5"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-bold text-white text-sm truncate">{wf.name}</p>
                          {wf.description && (
                            <p
                              className="text-xs mt-0.5 line-clamp-1"
                              style={{ color: 'rgba(255,255,255,0.4)' }}
                            >
                              {wf.description}
                            </p>
                          )}
                        </div>
                        <span
                          className={`badge text-xs flex-shrink-0 ${wf.isActive ? 'badge-info' : 'badge-neutral'}`}
                        >
                          {wf.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className="inline-block px-2 py-0.5 rounded-lg text-xs font-medium"
                          style={moduleBadgeStyle(wf.module)}
                        >
                          {wf.module}
                        </span>
                        <span
                          className="flex items-center gap-1 text-xs"
                          style={{ color: 'rgba(255,255,255,0.4)' }}
                        >
                          <Clock size={11} />
                          {wf.steps.length} step{wf.steps.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {wf.steps.length > 0 && (
                        <div className="space-y-1.5">
                          {wf.steps.map((step, j) => (
                            <div key={j} className="flex items-center gap-2">
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                style={{
                                  background: `${color}22`,
                                  color: color,
                                  border: `1px solid ${color}33`,
                                }}
                              >
                                {j + 1}
                              </div>
                              <div className="flex items-center gap-1 min-w-0">
                                <span
                                  className="text-xs truncate"
                                  style={{ color: 'rgba(255,255,255,0.7)' }}
                                >
                                  {step.name}
                                </span>
                                <ChevronRight size={10} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
                                <span
                                  className="text-xs truncate"
                                  style={{ color: 'rgba(255,255,255,0.4)' }}
                                >
                                  {step.approverRole}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
