'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Shield, Users, Key, Activity, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { securityApi } from '@/lib/api';

const ACTION_COLORS: Record<string, string> = {
  CREATE: '#10b981',
  UPDATE: '#6366f1',
  DELETE: '#f43f5e',
  LOGIN: '#8b5cf6',
  LOGOUT: '#f59e0b',
  EXPORT: '#f59e0b',
  APPROVE: '#22d3ee',
};

const ACTION_BG: Record<string, string> = {
  CREATE: 'rgba(16,185,129,0.12)',
  UPDATE: 'rgba(99,102,241,0.12)',
  DELETE: 'rgba(244,63,94,0.12)',
  LOGIN: 'rgba(139,92,246,0.12)',
  LOGOUT: 'rgba(245,158,11,0.12)',
  EXPORT: 'rgba(245,158,11,0.12)',
  APPROVE: 'rgba(34,211,238,0.12)',
};

const RESOURCES = ['ALL', 'employee', 'payroll', 'tender', 'compliance', 'billing', 'user'];

const fadeIn = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35 },
};

export default function SecurityPage() {
  const [tab, setTab] = useState<'audit' | 'users'>('audit');
  const [page, setPage] = useState(1);
  const [resourceFilter, setResourceFilter] = useState('ALL');

  const auditQuery = useQuery({
    queryKey: ['audit-logs', page, resourceFilter],
    queryFn: () =>
      securityApi.auditLogs({
        page,
        limit: 20,
        ...(resourceFilter !== 'ALL' && { resource: resourceFilter }),
      }),
  });

  const usersQuery = useQuery({
    queryKey: ['security-users'],
    queryFn: securityApi.users,
  });

  const rolesQuery = useQuery({
    queryKey: ['security-roles'],
    queryFn: securityApi.roles,
  });

  const auditData = auditQuery.data?.data ?? [];
  const auditMeta = auditQuery.data?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 1 };
  const users: Record<string, unknown>[] = usersQuery.data ?? [];
  const roles: Record<string, unknown>[] = rolesQuery.data ?? [];

  const kpiCards = [
    {
      label: 'Total Users',
      value: usersQuery.isLoading ? '—' : users.length,
      icon: Users,
      color: '#6366f1',
      bg: 'rgba(99,102,241,0.12)',
    },
    {
      label: 'Active Roles',
      value: rolesQuery.isLoading ? '—' : roles.length,
      icon: Key,
      color: '#8b5cf6',
      bg: 'rgba(139,92,246,0.12)',
    },
    {
      label: 'Audit Events Today',
      value: 0,
      icon: Activity,
      color: '#22d3ee',
      bg: 'rgba(34,211,238,0.12)',
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div {...fadeIn} className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#4f46e5,#6366f1)', boxShadow: '0 0 18px rgba(99,102,241,0.35)' }}
        >
          <Shield size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Security & Audit</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Monitor system access, audit trail, and role management
          </p>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
      >
        {kpiCards.map((card) => (
          <div key={card.label} className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>{card.label}</p>
                <p className="text-3xl font-bold text-white">{card.value}</p>
              </div>
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: card.bg }}
              >
                <card.icon size={22} style={{ color: card.color }} />
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="flex gap-1 p-1 rounded-xl w-fit"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {(['audit', 'users'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200"
            style={
              tab === t
                ? { background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }
                : { color: 'rgba(255,255,255,0.45)', border: '1px solid transparent' }
            }
          >
            {t === 'audit' ? 'Audit Log' : 'Users & Roles'}
          </button>
        ))}
      </motion.div>

      {/* Tab Content */}
      {tab === 'audit' && (
        <motion.div
          key="audit"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="glass-card space-y-4"
        >
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Search size={15} style={{ color: 'rgba(255,255,255,0.35)' }} />
              <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Filter by Resource:
              </span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {RESOURCES.map((r) => (
                <button
                  key={r}
                  onClick={() => { setResourceFilter(r); setPage(1); }}
                  className="px-3 py-1 rounded-lg text-xs font-medium transition-all duration-150"
                  style={
                    resourceFilter === r
                      ? { background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.35)' }
                      : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.08)' }
                  }
                >
                  {r}
                </button>
              ))}
            </div>
            {auditQuery.isFetching && (
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Refreshing…</span>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Resource ID</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {auditQuery.isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j}><div className="skeleton h-4 rounded w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : auditData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      No audit events found
                    </td>
                  </tr>
                ) : (
                  auditData.map((log: Record<string, unknown>) => {
                    const action = String(log.action ?? '').toUpperCase();
                    const actionColor = ACTION_COLORS[action] ?? '#94a3b8';
                    const actionBg = ACTION_BG[action] ?? 'rgba(148,163,184,0.1)';
                    const user = log.user as Record<string, string> | null;
                    return (
                      <tr key={String(log.id)}>
                        <td className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {formatDate(String(log.createdAt), 'dd MMM yyyy HH:mm')}
                        </td>
                        <td>
                          {user ? (
                            <div>
                              <div className="text-sm text-white">{user.name ?? '—'}</div>
                              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{user.email}</div>
                            </div>
                          ) : (
                            <span style={{ color: 'rgba(255,255,255,0.3)' }}>System</span>
                          )}
                        </td>
                        <td>
                          <span
                            className="px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide"
                            style={{ background: actionBg, color: actionColor, border: `1px solid ${actionColor}28` }}
                          >
                            {log.action as string}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-info capitalize">{log.resource as string}</span>
                        </td>
                        <td className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.45)' }}>
                          {log.resourceId ? String(log.resourceId).slice(0, 12) + '…' : '—'}
                        </td>
                        <td className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {(log.ipAddress as string) ?? '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {auditMeta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {auditMeta.total} total events · Page {auditMeta.page} of {auditMeta.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1 disabled:opacity-40"
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(auditMeta.totalPages, p + 1))}
                  disabled={page >= auditMeta.totalPages}
                  className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1 disabled:opacity-40"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {tab === 'users' && (
        <motion.div
          key="users"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="glass-card"
        >
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersQuery.isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j}><div className="skeleton h-4 rounded w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const isActive = String(user.status ?? 'ACTIVE').toUpperCase() === 'ACTIVE';
                    const role = user.role as Record<string, unknown> | string | null;
                    const roleName = typeof role === 'object' && role !== null
                      ? String(role.name ?? role.displayName ?? '—')
                      : String(role ?? '—');
                    return (
                      <tr key={String(user.id)}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{ background: 'linear-gradient(135deg,#4f46e5,#8b5cf6)', color: 'white' }}
                            >
                              {String(user.name ?? user.firstName ?? '?')[0].toUpperCase()}
                            </div>
                            <span className="text-sm text-white">
                              {(user.name as string) ?? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()}
                            </span>
                          </div>
                        </td>
                        <td className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                          {user.email as string}
                        </td>
                        <td>
                          <span className="badge badge-info">{roleName}</span>
                        </td>
                        <td>
                          <span className={isActive ? 'badge' : 'badge badge-warning'}
                            style={isActive ? { background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' } : {}}>
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {user.lastLoginAt
                            ? formatDate(String(user.lastLoginAt), 'dd MMM yyyy HH:mm')
                            : '—'}
                        </td>
                        <td>
                          <button
                            onClick={() => toast.info('Role management coming soon')}
                            className="text-xs px-3 py-1.5 rounded-lg transition-all duration-150"
                            style={{
                              background: 'rgba(99,102,241,0.1)',
                              color: '#818cf8',
                              border: '1px solid rgba(99,102,241,0.2)',
                            }}
                          >
                            Edit Role
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
