'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Calendar, Users, Shield,
  CreditCard, Gift, Clock, X,
  CheckCircle2, FileText, Cake, Star, Plus,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  mastersApi, attendanceApi, complianceApi, payrollApi, employeesApi,
} from '@/lib/api';

// ── Event type config ─────────────────────────────────────────────────────────
const EVENT_TYPES = {
  holiday:     { label: 'Holiday',          color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   ring: 'rgba(239,68,68,0.3)',   icon: Star         },
  leave:       { label: 'Leave Approved',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  ring: 'rgba(245,158,11,0.3)',  icon: Users        },
  leaveP:      { label: 'Leave Pending',    color: '#f97316', bg: 'rgba(249,115,22,0.1)',   ring: 'rgba(249,115,22,0.25)', icon: Clock        },
  payroll:     { label: 'Payroll',          color: '#10b981', bg: 'rgba(16,185,129,0.12)',  ring: 'rgba(16,185,129,0.3)', icon: CreditCard   },
  compliance:  { label: 'Compliance Due',   color: '#6366f1', bg: 'rgba(99,102,241,0.12)',  ring: 'rgba(99,102,241,0.3)', icon: Shield       },
  birthday:    { label: 'Birthday',         color: '#ec4899', bg: 'rgba(236,72,153,0.1)',   ring: 'rgba(236,72,153,0.25)',icon: Cake         },
  anniversary: { label: 'Work Anniversary', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  ring: 'rgba(139,92,246,0.3)', icon: Gift         },
  tender:      { label: 'Tender Deadline',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  ring: 'rgba(59,130,246,0.3)', icon: FileText     },
} as const;
type EventType = keyof typeof EVENT_TYPES;

interface CalEvent {
  id: string;
  type: EventType;
  date: string;   // YYYY-MM-DD
  title: string;
  subtitle?: string;
  meta?: string;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const today  = new Date();

function pad2(n: number) { return String(n).padStart(2, '0'); }
function toYMD(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }

// ── Main Page ─────────────────────────────────────────────────────────────────
const HOLIDAY_TYPES = ['NATIONAL', 'STATE', 'REGIONAL', 'OPTIONAL'] as const;

export default function CalendarPage() {
  const [curYear,  setCurYear]  = useState(today.getFullYear());
  const [curMonth, setCurMonth] = useState(today.getMonth()); // 0-indexed
  const [selected, setSelected] = useState<string>(toYMD(today));
  const [filters,  setFilters]  = useState<Set<EventType>>(new Set());

  // New Holiday modal
  const [showNewHoliday, setShowNewHoliday] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ name: '', date: toYMD(today), type: 'NATIONAL', isOptional: false });
  const [formErr, setFormErr] = useState('');

  const qc = useQueryClient();
  const createHolidayMutation = useMutation({
    mutationFn: (data: typeof newHoliday) => mastersApi.createHoliday(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holidays'] });
      setShowNewHoliday(false);
      setNewHoliday({ name: '', date: selected, type: 'NATIONAL', isOptional: false });
      setFormErr('');
    },
    onError: (e: any) => setFormErr(e?.response?.data?.message ?? 'Failed to create holiday'),
  });

  const handleNewHolidaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHoliday.name.trim()) { setFormErr('Name is required'); return; }
    if (!newHoliday.date) { setFormErr('Date is required'); return; }
    setFormErr('');
    createHolidayMutation.mutate(newHoliday);
  };

  // ── Data fetching ─────────────────────────────────────────────────────────
  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays', curYear],
    queryFn: () => mastersApi.holidays(curYear),
    staleTime: 10 * 60_000,
  });

  const { data: leaveData } = useQuery({
    queryKey: ['leave-requests-cal', curYear, curMonth + 1],
    queryFn: () => attendanceApi.leaveRequests({ limit: 200, year: curYear, month: curMonth + 1 }),
    staleTime: 60_000,
  });

  const { data: complianceData } = useQuery({
    queryKey: ['compliance-cal', curMonth + 1, curYear],
    queryFn: () => complianceApi.calendar(curMonth + 1, curYear),
    staleTime: 5 * 60_000,
  });

  const { data: payrollRunsData } = useQuery({
    queryKey: ['payroll-runs-cal'],
    queryFn: () => payrollApi.runs({ limit: 24 }),
    staleTime: 10 * 60_000,
  });

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['employees-bday-cal'],
    queryFn: () => employeesApi.selectAll('ACTIVE'),
    staleTime: 30 * 60_000,
  });

  // ── Build event list ──────────────────────────────────────────────────────
  const events = useMemo<CalEvent[]>(() => {
    const list: CalEvent[] = [];

    // Holidays
    const hols: any[] = Array.isArray(holidays) ? holidays : (holidays as any)?.data ?? [];
    for (const h of hols) {
      if (!h.date) continue;
      list.push({ id: `hol-${h.id}`, type: 'holiday', date: h.date.split('T')[0], title: h.name, subtitle: h.type?.replace(/_/g, ' ') });
    }

    // Leave requests
    const leaves: any[] = (leaveData as any)?.data ?? [];
    for (const l of leaves) {
      if (!l.startDate) continue;
      const type: EventType = l.status === 'APPROVED' ? 'leave' : 'leaveP';
      const name = l.employee ? `${l.employee.firstName} ${l.employee.lastName}` : 'Employee';
      const start = new Date(l.startDate);
      const end   = l.endDate ? new Date(l.endDate) : start;
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        list.push({ id: `lv-${l.id}-${toYMD(d)}`, type, date: toYMD(new Date(d)), title: name, subtitle: l.leaveType?.name ?? 'Leave' });
      }
    }

    // Compliance items
    const compItems: any[] = Array.isArray(complianceData) ? complianceData : (complianceData as any)?.data ?? [];
    for (const c of compItems) {
      if (!c.dueDate) continue;
      list.push({ id: `comp-${c.id}`, type: 'compliance', date: c.dueDate.split('T')[0], title: `${c.type} Filing`, subtitle: c.period, meta: c.amount ? formatCurrency(Number(c.amount)) : undefined });
    }

    // Payroll runs
    const runs: any[] = (payrollRunsData as any)?.data ?? [];
    for (const r of runs) {
      if (!r.periodEnd) continue;
      const payDate = new Date(r.periodEnd);
      payDate.setDate(payDate.getDate() + 5); // assume paid 5 days after period end
      list.push({ id: `pay-${r.id}`, type: 'payroll', date: toYMD(payDate), title: `${MONTHS[r.month-1]} ${r.year} Payroll`, subtitle: r.status, meta: r.totalNet ? formatCurrency(Number(r.totalNet)) : undefined });
    }

    // Birthdays & Anniversaries (this month and next)
    const emps: any[] = Array.isArray(allEmployees) ? allEmployees : [];
    for (const emp of emps) {
      const name = `${emp.firstName} ${emp.lastName}`;
      // Birthday
      if (emp.dateOfBirth) {
        const dob = new Date(emp.dateOfBirth);
        const bdayThisYear = `${curYear}-${pad2(dob.getMonth()+1)}-${pad2(dob.getDate())}`;
        list.push({ id: `bday-${emp.id}`, type: 'birthday', date: bdayThisYear, title: `${name}'s Birthday`, subtitle: emp.designation?.name });
      }
      // Work Anniversary
      if (emp.joiningDate) {
        const jd = new Date(emp.joiningDate);
        const annivDate = `${curYear}-${pad2(jd.getMonth()+1)}-${pad2(jd.getDate())}`;
        const years = curYear - jd.getFullYear();
        if (years > 0) {
          list.push({ id: `ann-${emp.id}`, type: 'anniversary', date: annivDate, title: `${name}'s ${years}yr Anniversary`, subtitle: emp.designation?.name });
        }
      }
    }

    return list;
  }, [holidays, leaveData, complianceData, payrollRunsData, allEmployees, curYear]);

  // ── Filtered events ───────────────────────────────────────────────────────
  const visibleEvents = useMemo(() =>
    filters.size === 0 ? events : events.filter(e => filters.has(e.type)),
    [events, filters]
  );

  // ── Calendar grid ─────────────────────────────────────────────────────────
  const firstDay  = new Date(curYear, curMonth, 1).getDay();
  const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
  const prevMonthDays = new Date(curYear, curMonth, 0).getDate();

  // Build 6×7 grid
  const grid: { date: string; day: number; isCurrentMonth: boolean; isToday: boolean; isWeekend: boolean }[] = [];
  // Prev month fill
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = curMonth === 0 ? 12 : curMonth;
    const y = curMonth === 0 ? curYear - 1 : curYear;
    grid.push({ date: `${y}-${pad2(m)}-${pad2(d)}`, day: d, isCurrentMonth: false, isToday: false, isWeekend: [0,6].includes((firstDay - 1 - i + 7) % 7) });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${curYear}-${pad2(curMonth+1)}-${pad2(d)}`;
    const dow  = new Date(curYear, curMonth, d).getDay();
    grid.push({ date, day: d, isCurrentMonth: true, isToday: date === toYMD(today), isWeekend: dow === 0 || dow === 6 });
  }
  // Next month fill
  const remaining = 42 - grid.length;
  for (let d = 1; d <= remaining; d++) {
    const m = curMonth === 11 ? 1 : curMonth + 2;
    const y = curMonth === 11 ? curYear + 1 : curYear;
    grid.push({ date: `${y}-${pad2(m)}-${pad2(d)}`, day: d, isCurrentMonth: false, isToday: false, isWeekend: false });
  }

  // Events grouped by date
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    for (const e of visibleEvents) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return map;
  }, [visibleEvents]);

  // Selected day events
  const selectedEvents = eventsByDate[selected] ?? [];

  // Upcoming events (next 7 days from today)
  const upcomingEvents = useMemo(() => {
    const start = toYMD(today);
    const end7  = new Date(today); end7.setDate(today.getDate() + 14);
    const endS  = toYMD(end7);
    return visibleEvents
      .filter(e => e.date >= start && e.date <= endS)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 10);
  }, [visibleEvents]);

  const prevMonth = () => {
    if (curMonth === 0) { setCurMonth(11); setCurYear(y => y - 1); }
    else setCurMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (curMonth === 11) { setCurMonth(0); setCurYear(y => y + 1); }
    else setCurMonth(m => m + 1);
  };

  const toggleFilter = (type: EventType) => {
    setFilters(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>
            Company Calendar
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--wz-text-muted)' }}>
            Holidays, leave, payroll, compliance & milestones
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { setCurYear(today.getFullYear()); setCurMonth(today.getMonth()); setSelected(toYMD(today)); }}
            className="btn-secondary text-sm">Today</button>
          <button onClick={() => { setNewHoliday(h => ({ ...h, date: selected })); setShowNewHoliday(true); }}
            className="btn-primary text-sm flex items-center gap-1.5">
            <Plus size={14} /> New Holiday
          </button>
        </div>
      </div>

      {/* ── Filter pills ── */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(EVENT_TYPES) as [EventType, typeof EVENT_TYPES[EventType]][]).map(([key, cfg]) => {
          const active = filters.has(key);
          const Icon = cfg.icon;
          return (
            <button key={key} onClick={() => toggleFilter(key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: active ? cfg.bg : 'var(--wz-input-bg)',
                color: active ? cfg.color : 'var(--wz-text-muted)',
                border: `1px solid ${active ? cfg.ring : 'var(--wz-card-border)'}`,
              }}>
              <Icon size={11} />
              {cfg.label}
            </button>
          );
        })}
        {filters.size > 0 && (
          <button onClick={() => setFilters(new Set())} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs"
            style={{ color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)' }}>
            <X size={11} /> Clear
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-4 gap-5">
        {/* ── Main calendar ── */}
        <div className="lg:col-span-3">
          <div className="glass-card overflow-hidden">
            {/* Month navigation */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--wz-card-border)' }}>
              <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <ChevronLeft size={18} style={{ color: 'var(--wz-text-secondary)' }} />
              </button>
              <div className="text-center">
                <h3 className="text-lg font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>
                  {MONTHS[curMonth]} {curYear}
                </h3>
              </div>
              <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <ChevronRight size={18} style={{ color: 'var(--wz-text-secondary)' }} />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 px-2 pt-3 pb-1">
              {DAYS.map(d => (
                <div key={d} className="text-center text-[11px] font-bold uppercase tracking-wider py-1"
                  style={{ color: 'var(--wz-text-muted)' }}>{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-px px-2 pb-3" style={{ background: 'var(--wz-card-border)' }}>
              <AnimatePresence mode="wait">
                {grid.map((cell, idx) => {
                  const cellEvents = eventsByDate[cell.date] ?? [];
                  const isSelected = cell.date === selected;
                  const maxShow = 2;
                  const overflow = cellEvents.length - maxShow;
                  return (
                    <motion.button
                      key={cell.date}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.003, duration: 0.15 }}
                      onClick={() => setSelected(cell.date)}
                      className="relative flex flex-col p-1.5 min-h-[88px] text-left transition-all"
                      style={{
                        background: isSelected
                          ? 'rgba(99,102,241,0.1)'
                          : 'var(--wz-card-bg)',
                        outline: isSelected ? '2px solid rgba(99,102,241,0.5)' : 'none',
                        outlineOffset: '-2px',
                        opacity: cell.isCurrentMonth ? 1 : 0.3,
                      }}>
                      {/* Day number */}
                      <div className="flex items-center justify-end mb-1">
                        <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold ${
                          cell.isToday ? 'text-white' : ''
                        }`}
                          style={{
                            background: cell.isToday ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'transparent',
                            color: cell.isToday ? '#fff' : cell.isWeekend ? '#f43f5e' : 'var(--wz-text-secondary)',
                            boxShadow: cell.isToday ? '0 0 12px rgba(99,102,241,0.5)' : 'none',
                          }}>
                          {cell.day}
                        </span>
                      </div>

                      {/* Event pills */}
                      <div className="flex flex-col gap-0.5 flex-1">
                        {cellEvents.slice(0, maxShow).map(ev => {
                          const cfg = EVENT_TYPES[ev.type];
                          const Icon = cfg.icon;
                          return (
                            <div key={ev.id}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium truncate"
                              style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.ring}` }}>
                              <Icon size={9} className="flex-shrink-0" />
                              <span className="truncate">{ev.title}</span>
                            </div>
                          );
                        })}
                        {overflow > 0 && (
                          <div className="text-[10px] font-medium px-1.5" style={{ color: 'var(--wz-text-muted)' }}>
                            +{overflow} more
                          </div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Selected day detail ── */}
          <AnimatePresence>
            {selected && (
              <motion.div
                key={selected}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="glass-card overflow-hidden mt-5">
                <div className="flex items-center justify-between px-5 py-4"
                  style={{ borderBottom: '1px solid var(--wz-card-border)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
                      <Calendar size={16} style={{ color: '#818cf8' }} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>
                        {(() => {
                          const [y, m, d] = selected.split('-');
                          return new Date(Number(y), Number(m)-1, Number(d)).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                        })()}
                      </h4>
                      <p className="text-xs" style={{ color: 'var(--wz-text-muted)' }}>{selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>

                {selectedEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <CheckCircle2 size={32} className="mb-2" style={{ color: 'var(--wz-text-muted)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--wz-text-muted)' }}>No events on this day</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--wz-text-muted)' }}>Enjoy the clear schedule!</p>
                  </div>
                ) : (
                  <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {selectedEvents.map(ev => {
                      const cfg = EVENT_TYPES[ev.type];
                      const Icon = cfg.icon;
                      return (
                        <motion.div key={ev.id}
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-start gap-3 p-3 rounded-xl"
                          style={{ background: cfg.bg, border: `1px solid ${cfg.ring}` }}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: `${cfg.color}20`, color: cfg.color }}>
                            <Icon size={15} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--wz-text-primary)' }}>{ev.title}</p>
                            {ev.subtitle && <p className="text-xs truncate" style={{ color: cfg.color }}>{ev.subtitle}</p>}
                            {ev.meta && <p className="text-xs font-bold mt-0.5" style={{ color: cfg.color }}>{ev.meta}</p>}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4">
          {/* Event legend */}
          <div className="glass-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--wz-text-muted)' }}>Event Types</p>
            <div className="space-y-2">
              {(Object.entries(EVENT_TYPES) as [EventType, typeof EVENT_TYPES[EventType]][]).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button key={key} onClick={() => toggleFilter(key)}
                    className="w-full flex items-center gap-2.5 text-left transition-all p-1.5 rounded-lg"
                    style={{ opacity: filters.size > 0 && !filters.has(key) ? 0.4 : 1 }}>
                    <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: cfg.bg, color: cfg.color }}>
                      <Icon size={11} />
                    </div>
                    <span className="text-xs font-medium" style={{ color: 'var(--wz-text-secondary)' }}>{cfg.label}</span>
                    <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: cfg.bg, color: cfg.color }}>
                      {events.filter(e => e.type === key).length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Upcoming events */}
          <div className="glass-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--wz-text-muted)' }}>Upcoming (14 days)</p>
            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: 'var(--wz-text-muted)' }}>No upcoming events</p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map(ev => {
                  const cfg  = EVENT_TYPES[ev.type];
                  const Icon = cfg.icon;
                  const [y, m, d] = ev.date.split('-');
                  const evDate = new Date(Number(y), Number(m)-1, Number(d));
                  const diffDays = Math.round((evDate.getTime() - today.getTime()) / 86400000);
                  return (
                    <button key={ev.id} onClick={() => { setSelected(ev.date); setCurYear(Number(y)); setCurMonth(Number(m)-1); }}
                      className="w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition-all"
                      style={{ background: 'var(--wz-input-bg)', border: '1px solid var(--wz-card-border)' }}
                      onMouseOver={e => e.currentTarget.style.borderColor = cfg.ring}
                      onMouseOut={e => e.currentTarget.style.borderColor = 'var(--wz-card-border)'}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: cfg.bg, color: cfg.color }}>
                        <Icon size={12} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--wz-text-primary)' }}>{ev.title}</p>
                        <p className="text-[10px]" style={{ color: 'var(--wz-text-muted)' }}>
                          {diffDays === 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : `In ${diffDays} days`}
                          {' · '}{evDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mini stats */}
          <div className="glass-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--wz-text-muted)' }}>
              {MONTHS[curMonth]} Summary
            </p>
            <div className="space-y-2">
              {[
                { label: 'Holidays', count: events.filter(e => e.type === 'holiday' && e.date.startsWith(`${curYear}-${pad2(curMonth+1)}`)).length, color: '#ef4444' },
                { label: 'On Leave', count: events.filter(e => e.type === 'leave' && e.date.startsWith(`${curYear}-${pad2(curMonth+1)}`)).length, color: '#f59e0b' },
                { label: 'Compliance', count: events.filter(e => e.type === 'compliance' && e.date.startsWith(`${curYear}-${pad2(curMonth+1)}`)).length, color: '#6366f1' },
                { label: 'Birthdays', count: events.filter(e => e.type === 'birthday' && e.date.startsWith(`${curYear}-${pad2(curMonth+1)}`)).length, color: '#ec4899' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--wz-text-secondary)' }}>{s.label}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${s.color}15`, color: s.color }}>
                    {s.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* ── New Holiday Modal ── */}
      {showNewHoliday && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowNewHoliday(false); }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-md rounded-2xl p-6"
            style={{ background: 'var(--wz-card-bg)', border: '1px solid var(--wz-card-border)' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <Star size={15} style={{ color: '#ef4444' }} />
                </div>
                <h3 className="text-base font-bold" style={{ color: 'var(--wz-text-primary)' }}>Add Holiday</h3>
              </div>
              <button onClick={() => setShowNewHoliday(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: 'var(--wz-input-bg)' }}>
                <X size={14} style={{ color: 'var(--wz-text-muted)' }} />
              </button>
            </div>

            <form onSubmit={handleNewHolidaySubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--wz-text-secondary)' }}>
                  Holiday Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Republic Day"
                  value={newHoliday.name}
                  onChange={e => setNewHoliday(h => ({ ...h, name: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors"
                  style={{ background: 'var(--wz-input-bg)', border: '1px solid var(--wz-card-border)', color: 'var(--wz-text-primary)' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'var(--wz-card-border)'}
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--wz-text-secondary)' }}>
                  Date <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={newHoliday.date}
                  onChange={e => setNewHoliday(h => ({ ...h, date: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors"
                  style={{ background: 'var(--wz-input-bg)', border: '1px solid var(--wz-card-border)', color: 'var(--wz-text-primary)' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'var(--wz-card-border)'}
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--wz-text-secondary)' }}>Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {HOLIDAY_TYPES.map(t => (
                    <button key={t} type="button"
                      onClick={() => setNewHoliday(h => ({ ...h, type: t }))}
                      className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                      style={{
                        background: newHoliday.type === t ? 'rgba(99,102,241,0.15)' : 'var(--wz-input-bg)',
                        border: `1px solid ${newHoliday.type === t ? 'rgba(99,102,241,0.4)' : 'var(--wz-card-border)'}`,
                        color: newHoliday.type === t ? '#818cf8' : 'var(--wz-text-secondary)',
                      }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input type="checkbox" className="sr-only"
                    checked={newHoliday.isOptional}
                    onChange={e => setNewHoliday(h => ({ ...h, isOptional: e.target.checked }))} />
                  <div className="w-10 h-5 rounded-full transition-colors"
                    style={{ background: newHoliday.isOptional ? '#6366f1' : 'var(--wz-input-bg)', border: '1px solid var(--wz-card-border)' }}>
                    <div className="w-4 h-4 rounded-full bg-white mt-0.5 transition-transform shadow-sm"
                      style={{ transform: newHoliday.isOptional ? 'translateX(21px)' : 'translateX(1px)' }} />
                  </div>
                </div>
                <span className="text-sm" style={{ color: 'var(--wz-text-secondary)' }}>Optional holiday</span>
              </label>

              {formErr && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)' }}>
                  {formErr}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowNewHoliday(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  style={{ background: 'var(--wz-input-bg)', color: 'var(--wz-text-secondary)', border: '1px solid var(--wz-card-border)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={createHolidayMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#4f46e5,#6366f1)' }}>
                  {createHolidayMutation.isPending ? 'Saving…' : 'Add Holiday'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
