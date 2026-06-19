'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Plus, Search, Users, UserCheck, MapPin, Clock,
  Pencil, Trash2, ChevronLeft, ChevronRight, Download,
  LayoutList, Settings2, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, getInitials } from '@/lib/utils';
import { employeesApi } from '@/lib/api';
import { CreateEmployeeModal } from './create-employee-modal';
import { EmployeeMasters } from './employee-masters';

const STATUS_FILTERS = ['ALL', 'ACTIVE', 'INACTIVE', 'ON_LEAVE', 'DEPLOYED', 'TERMINATED'];

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  ACTIVE:     { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Active' },
  INACTIVE:   { color: '#64748b', bg: 'rgba(100,116,139,0.1)', label: 'Inactive' },
  ON_LEAVE:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'On Leave' },
  DEPLOYED:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: 'Deployed' },
  TERMINATED: { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)', label: 'Terminated' },
};

export default function EmployeesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Record<string, any> | null>(null);
  const [activeTab, setActiveTab] = useState<'employees' | 'masters'>('employees');
  const qc = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ['employee-stats'],
    queryFn: employeesApi.stats,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['employees', { search, status, page }],
    queryFn: () => employeesApi.list({
      search: search || undefined,
      status: status === 'ALL' ? undefined : status,
      page,
      limit: 15,
    }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => employeesApi.remove(id),
    onSuccess: () => {
      toast.success('Employee removed successfully');
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['employee-stats'] });
    },
    onError: () => toast.error('Failed to remove employee'),
  });

  const employees = (data as any)?.data ?? [];
  const meta = (data as any)?.meta;

  const statCards = [
    { label: 'Total Employees', value: stats?.total ?? 0, icon: Users, color: '#6366f1' },
    { label: 'Active', value: stats?.active ?? 0, icon: UserCheck, color: '#10b981' },
    { label: 'On Leave', value: stats?.onLeave ?? 0, icon: Clock, color: '#f59e0b' },
    { label: 'Deployed', value: stats?.deployed ?? 0, icon: MapPin, color: '#3b82f6' },
  ];

  const handleEdit = (emp: Record<string, any>) => {
    setEditEmployee(emp);
    setShowModal(true);
  };

  const handleDelete = (emp: Record<string, any>) => {
    if (confirm(`Remove ${emp.firstName} ${emp.lastName} from the system?`)) {
      deleteMut.mutate(emp.id);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setEditEmployee(null);
  };

  return (
    <div className="space-y-6">
      <CreateEmployeeModal open={showModal} onClose={handleClose} employee={editEmployee} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>
            Employees
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--wz-text-muted)' }}>
            Manage your workforce — onboard, update, and track all employees
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'employees' && (
            <>
              <button className="btn-secondary"><Download size={14} /> Export</button>
              <button className="btn-primary" onClick={() => { setEditEmployee(null); setShowModal(true); }}>
                <Plus size={16} /> Add Employee
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {([
          { key: 'employees', label: 'All Employees', icon: LayoutList },
          { key: 'masters',   label: 'Masters',       icon: Settings2  },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all"
            style={{
              background: activeTab === key ? 'rgba(99,102,241,0.18)' : 'transparent',
              color: activeTab === key ? '#818cf8' : 'rgba(255,255,255,0.35)',
              border: activeTab === key ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
            }}>
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      {/* Masters tab */}
      {activeTab === 'masters' && <EmployeeMasters />}

      {/* Employees tab content */}
      {activeTab === 'employees' && (<>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="glass-card p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--wz-text-muted)' }}>
                {s.label}
              </p>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${s.color}15`, color: s.color }}>
                <s.icon size={15} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>
              {s.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Filters bar */}
      <div className="glass-card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-52">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, code, or phone..."
            className="input-field w-full pl-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: status === s ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                color: status === s ? '#818cf8' : 'rgba(255,255,255,0.5)',
                border: `1px solid ${status === s ? 'rgba(99,102,241,0.35)' : 'transparent'}`,
              }}
            >
              {s === 'ALL' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {['Employee', 'Contact', 'Designation', 'Department', 'Joining Date', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && [...Array(6)].map((_, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                {[...Array(7)].map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)', width: j === 0 ? '80%' : '60%' }} />
                  </td>
                ))}
              </tr>
            ))}

            {!isLoading && employees.map((emp: any) => {
              const cfg = STATUS_CONFIG[emp.status] ?? STATUS_CONFIG.INACTIVE;
              return (
                <tr key={emp.id} className="group transition-colors hover:bg-white/[0.015]"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push(`/employees/${emp.id}`)}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                        {getInitials(emp.firstName, emp.lastName)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white hover:text-indigo-400 transition-colors">{emp.firstName} {emp.lastName}</p>
                        <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>{emp.employeeCode}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{emp.personalPhone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{emp.designation?.name ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{emp.department?.name ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{formatDate(emp.joiningDate)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                      style={{ background: cfg.bg, color: cfg.color }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => router.push(`/employees/${emp.id}`)} title="View Profile"
                        className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                        <Eye size={13} style={{ color: '#10b981' }} />
                      </button>
                      <button onClick={() => handleEdit(emp)} title="Edit"
                        className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                        <Pencil size={13} style={{ color: '#818cf8' }} />
                      </button>
                      <button onClick={() => handleDelete(emp)} title="Remove"
                        className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                        <Trash2 size={13} style={{ color: '#f43f5e' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {!isLoading && employees.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-20 text-center">
                  <Users size={40} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                  <p className="font-medium text-white mb-1">No employees found</p>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {search || status !== 'ALL' ? 'Try adjusting your filters' : 'Get started by adding your first employee'}
                  </p>
                  {!search && status === 'ALL' && (
                    <button className="btn-primary mt-4" onClick={() => { setEditEmployee(null); setShowModal(true); }}>
                      <Plus size={14} /> Add First Employee
                    </button>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Showing {((page - 1) * 15) + 1}–{Math.min(page * 15, meta.total)} of {meta.total} employees
            </p>
            <div className="flex items-center gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
              <span className="text-xs px-2" style={{ color: 'rgba(255,255,255,0.4)' }}>{page} / {meta.totalPages}</span>
              <button disabled={page === meta.totalPages} onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>
          </div>
        )}
      </div>
      </>)}
    </div>
  );
}
