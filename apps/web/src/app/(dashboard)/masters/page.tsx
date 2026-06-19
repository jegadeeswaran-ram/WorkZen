'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Briefcase, Building2, Clock, Calendar, CalendarDays, MapPin,
  DollarSign, TrendingUp, BookOpen, Landmark, Plus, Pencil,
  Trash2, X, Check, ChevronRight,
  Wallet, Globe, GitBranch, FileText, IndianRupee, Settings2,
  Map,
} from 'lucide-react';
import { mastersApi, costCenterApi, organizationApi } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BaseRecord { id: string }

interface Designation extends BaseRecord {
  name: string; code?: string; level?: number; description?: string;
}
interface Department extends BaseRecord {
  name: string; code?: string; parentId?: string; description?: string;
  parent?: { name: string };
}
interface Shift extends BaseRecord {
  name: string; shiftType: string; startTime: string; endTime: string;
  breakDuration?: number; isNightShift?: boolean; overtimeAfter?: number;
  weeklyOffs?: string[];
}
interface LeaveType extends BaseRecord {
  name: string; code: string; category: string; maxDays: number;
  isCarryForward?: boolean; isPaid?: boolean; description?: string;
}
interface Holiday extends BaseRecord {
  name: string; date: string; type: string; isOptional?: boolean;
}
interface Site extends BaseRecord {
  name: string; code?: string; address?: string;
  contactName?: string; contactPhone?: string;
}
interface SalaryComponent extends BaseRecord {
  name: string; code: string; type: string; calculationType: string;
  value?: number; isTaxable?: boolean;
}
interface FinancialYear extends BaseRecord {
  label: string; startDate: string; endDate: string; isCurrent?: boolean;
}
interface Account extends BaseRecord {
  code: string; name: string; type: string; parentId?: string;
  description?: string; openingBalance?: number;
  parent?: { name: string }; currentBalance?: number;
}
interface BankAccount extends BaseRecord {
  accountName: string; accountNumber: string; bankName: string;
  ifscCode?: string; branchName?: string; accountType: string;
  openingBalance?: number; currentBalance?: number;
}
interface CostCenter extends BaseRecord {
  name: string; code?: string; description?: string; parentId?: string;
  parent?: { name: string };
}
interface Zone extends BaseRecord {
  name: string; code?: string;
}
interface Region extends BaseRecord {
  name: string; code?: string; zoneId?: string; zone?: { name: string };
}
interface Branch extends BaseRecord {
  name: string; code: string; regionId?: string; gstin?: string; pan?: string;
  phone?: string; email?: string; isActive?: boolean; region?: { name: string };
}
interface HsnMaster extends BaseRecord {
  hsnCode: string; description: string; defaultTaxRate: number; isActive?: boolean;
}
interface RateMaster extends BaseRecord {
  rateType: string; amount: number; effectiveFrom: string; effectiveTo?: string;
  isActive?: boolean; notes?: string; designationId?: string;
  designation?: { name: string };
}

// ── Enum config (client-side labels) ─────────────────────
const ENUM_SECTIONS = [
  {
    key: 'assetCategories', label: 'Asset Categories', color: '#f59e0b',
    items: [
      { key: 'UNIFORM', label: 'Uniform', description: 'Clothing and uniform items issued to employees.' },
      { key: 'SAFETY_EQUIPMENT', label: 'Safety Equipment', description: 'PPE and safety gear for on-site use.' },
      { key: 'ID_CARD', label: 'ID Card', description: 'Employee identification cards.' },
      { key: 'LAPTOP', label: 'Laptop', description: 'Laptops and computing devices.' },
      { key: 'MOBILE', label: 'Mobile', description: 'Mobile phones and communication devices.' },
      { key: 'VEHICLE', label: 'Vehicle', description: 'Company-owned vehicles.' },
      { key: 'TOOLS', label: 'Tools', description: 'Work tools and equipment.' },
      { key: 'OTHER', label: 'Other', description: 'Miscellaneous asset items.' },
    ],
  },
  {
    key: 'documentTypes', label: 'Document Types', color: '#3b82f6',
    items: [
      { key: 'TENDER_DOCUMENT', label: 'Tender Document', description: 'Tender-related documents and contracts.' },
      { key: 'EMPLOYEE_DOCUMENT', label: 'Employee Document', description: 'General employee documents.' },
      { key: 'INVOICE', label: 'Invoice', description: 'Billing and invoice documents.' },
      { key: 'CONTRACT', label: 'Contract', description: 'Legal contracts and agreements.' },
      { key: 'COMPLIANCE_FILE', label: 'Compliance File', description: 'PF, ESI, TDS compliance documents.' },
      { key: 'OFFER_LETTER', label: 'Offer Letter', description: 'Job offer letters.' },
      { key: 'JOINING_LETTER', label: 'Joining Letter', description: 'Employee joining confirmation letters.' },
      { key: 'SALARY_SLIP', label: 'Salary Slip', description: 'Monthly payslips.' },
      { key: 'ID_PROOF', label: 'ID Proof', description: 'Aadhaar, PAN, passport copies.' },
      { key: 'ADDRESS_PROOF', label: 'Address Proof', description: 'Address verification documents.' },
      { key: 'EDUCATIONAL', label: 'Educational', description: 'Degrees and certificates.' },
      { key: 'EXPERIENCE', label: 'Experience', description: 'Work experience certificates.' },
      { key: 'MEDICAL', label: 'Medical', description: 'Medical fitness certificates.' },
      { key: 'OTHER', label: 'Other', description: 'Miscellaneous documents.' },
    ],
  },
  {
    key: 'complianceTypes', label: 'Compliance Types', color: '#ef4444',
    items: [
      { key: 'PF', label: 'Provident Fund (PF)', description: 'Employee Provident Fund contributions and returns.' },
      { key: 'ESI', label: 'ESI', description: 'Employee State Insurance contributions and returns.' },
      { key: 'PROFESSIONAL_TAX', label: 'Professional Tax (PT)', description: 'State-level professional tax filings.' },
      { key: 'TDS', label: 'TDS', description: 'Tax Deducted at Source filings.' },
      { key: 'LWF', label: 'Labour Welfare Fund (LWF)', description: 'Labour welfare fund contributions.' },
      { key: 'CLRA', label: 'CLRA', description: 'Contract Labour (Regulation & Abolition) compliance.' },
      { key: 'MLWF', label: 'MLWF', description: 'Maharashtra Labour Welfare Fund.' },
    ],
  },
  {
    key: 'awardTypes', label: 'Award Types', color: '#8b5cf6',
    items: [
      { key: 'EMPLOYEE_OF_MONTH', label: 'Employee of the Month', description: 'Monthly recognition award.' },
      { key: 'BEST_ATTENDANCE', label: 'Best Attendance', description: 'Award for perfect attendance record.' },
      { key: 'BEST_PERFORMER', label: 'Best Performer', description: 'Top performance recognition.' },
      { key: 'LONG_SERVICE', label: 'Long Service', description: 'Recognition for years of service.' },
      { key: 'SAFETY_AWARD', label: 'Safety Award', description: 'Award for safety compliance.' },
      { key: 'CUSTOM', label: 'Custom Award', description: 'User-defined custom award.' },
    ],
  },
  {
    key: 'announcementTypes', label: 'Announcement Types', color: '#06b6d4',
    items: [
      { key: 'COMPANY_NEWS', label: 'Company News', description: 'General company announcements.' },
      { key: 'HR_CIRCULAR', label: 'HR Circular', description: 'HR policies and circulars.' },
      { key: 'POLICY_UPDATE', label: 'Policy Update', description: 'Updates to company policies.' },
      { key: 'CONTRACT_NOTIFICATION', label: 'Contract Notification', description: 'Contract-related notices.' },
      { key: 'EMERGENCY_ALERT', label: 'Emergency Alert', description: 'Critical emergency communications.' },
      { key: 'NOTICE_BOARD', label: 'Notice Board', description: 'General notice board items.' },
    ],
  },
] as const;

const ENUM_META_KEY = 'workzen_enum_meta';
function loadEnumMeta(): Record<string, Record<string, { label: string; description: string; active: boolean }>> {
  if (typeof window === 'undefined') return {};
  try { const r = localStorage.getItem(ENUM_META_KEY); return r ? JSON.parse(r) : {}; } catch { return {}; }
}
function saveEnumMeta(m: Record<string, Record<string, { label: string; description: string; active: boolean }>>) {
  localStorage.setItem(ENUM_META_KEY, JSON.stringify(m));
}

// ─── Tab config ──────────────────────────────────────────────────────────────

const TABS = [
  { id: 'designations',       label: 'Designations',       icon: Briefcase   },
  { id: 'departments',        label: 'Departments',        icon: Building2   },
  { id: 'shifts',             label: 'Shifts',             icon: Clock       },
  { id: 'leave-types',        label: 'Leave Types',        icon: Calendar    },
  { id: 'holidays',           label: 'Holidays',           icon: CalendarDays },
  { id: 'sites',              label: 'Sites',              icon: MapPin      },
  { id: 'salary-components',  label: 'Salary Components',  icon: DollarSign  },
  { id: 'financial-years',    label: 'Financial Years',    icon: TrendingUp  },
  { id: 'accounts',           label: 'Chart of Accounts',  icon: BookOpen    },
  { id: 'bank-accounts',      label: 'Bank Accounts',      icon: Landmark    },
  { id: 'cost-centers',       label: 'Cost Centers',       icon: Wallet      },
  { id: 'zones',              label: 'Zones',              icon: Globe       },
  { id: 'regions',            label: 'Regions',            icon: Map         },
  { id: 'branches',           label: 'Branches',           icon: GitBranch   },
  { id: 'hsn-gst',            label: 'HSN / GST',          icon: FileText    },
  { id: 'rate-master',        label: 'Rate Master',        icon: IndianRupee },
  { id: 'enum-config',        label: 'Type Config',        icon: Settings2   },
] as const;

type TabId = typeof TABS[number]['id'];

const DAYS_OF_WEEK = ['MON','TUE','WED','THU','FRI','SAT','SUN'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d?: string) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

function fmtCurrency(n?: number) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--wz-text-secondary)' }}>
      {children}
    </label>
  );
}

function Input({ value, onChange, placeholder, type = 'text', className = '' }: {
  value: string | number | undefined; onChange: (v: string) => void;
  placeholder?: string; type?: string; className?: string;
}) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`input-field w-full ${className}`}
    />
  );
}

function SelectField({ value, onChange, children }: {
  value: string | undefined; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      className="input-field w-full"
    >
      {children}
    </select>
  );
}

function CheckboxField({ label, checked, onChange }: {
  label: string; checked?: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <div
        className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
        style={{
          background: checked ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'rgba(255,255,255,0.06)',
          border: checked ? 'none' : '1px solid rgba(255,255,255,0.12)',
          boxShadow: checked ? '0 0 10px rgba(99,102,241,0.35)' : 'none',
        }}
        onClick={() => onChange(!checked)}
      >
        {checked && <Check size={12} className="text-white" strokeWidth={3} />}
      </div>
      <span className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>{label}</span>
    </label>
  );
}

function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: 'var(--wz-card-bg)', border: '1px solid var(--wz-card-border)', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--wz-card-border)' }}>
          <h3 className="font-semibold" style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 15, color: 'var(--wz-text-primary)' }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5" style={{ color: 'var(--wz-text-muted)' }}>
            <X size={16} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i}>
          {[...Array(cols)].map((_, j) => (
            <td key={j} className="px-4 py-3.5">
              <div className="skeleton h-4 rounded" style={{ width: j === 0 ? '70%' : '55%' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <tr>
      <td colSpan={99} className="px-4 py-16 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <Plus size={20} style={{ color: 'rgba(255,255,255,0.2)' }} />
          </div>
          <p className="text-sm">No {label} found. Add one to get started.</p>
        </div>
      </td>
    </tr>
  );
}

function ActionBtn({ onEdit, onDelete, deleteConfirm, onDeleteConfirm, onDeleteCancel }: {
  onEdit: () => void;
  onDelete: () => void;
  deleteConfirm: boolean;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 justify-end">
      <button onClick={onEdit}
        className="p-1.5 rounded-lg transition-all"
        style={{ color: 'rgba(255,255,255,0.35)', background: 'transparent' }}
        onMouseOver={e => { e.currentTarget.style.color = '#818cf8'; e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; }}
        onMouseOut={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'transparent'; }}
        title="Edit">
        <Pencil size={14} />
      </button>
      {deleteConfirm ? (
        <div className="flex items-center gap-1">
          <button onClick={onDeleteConfirm}
            className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
            style={{ background: 'rgba(244,63,94,0.15)', color: '#fb7185', border: '1px solid rgba(244,63,94,0.25)' }}>
            Confirm?
          </button>
          <button onClick={onDeleteCancel}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: 'rgba(255,255,255,0.35)' }}>
            <X size={12} />
          </button>
        </div>
      ) : (
        <button onClick={onDelete}
          className="p-1.5 rounded-lg transition-all"
          style={{ color: 'rgba(255,255,255,0.35)', background: 'transparent' }}
          onMouseOver={e => { e.currentTarget.style.color = '#fb7185'; e.currentTarget.style.background = 'rgba(244,63,94,0.1)'; }}
          onMouseOut={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'transparent'; }}
          title="Delete">
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

function TH({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{children}</th>;
}

function TD({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return <td className="px-4 py-3.5 text-sm" style={{ color: muted ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.8)' }}>{children}</td>;
}

function TypeBadge({ children, color }: { children: React.ReactNode; color?: string }) {
  const c = color ?? '#818cf8';
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ background: `${c}18`, color: c, border: `1px solid ${c}30` }}>
      {children}
    </span>
  );
}

// ─── Form Field Grid ──────────────────────────────────────────────────────────

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>;
}

function FieldFull({ children }: { children: React.ReactNode }) {
  return <div className="col-span-2">{children}</div>;
}

// ─── Tab panel wrapper ────────────────────────────────────────────────────────

function TabPanel({ title, onAdd, children }: { title: string; onAdd: () => void; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-white" style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 16 }}>{title}</h3>
        </div>
        <button className="btn-primary" onClick={onAdd}>
          <Plus size={14} />
          Add {title.replace(/s$/, '')}
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
        <table className="w-full text-sm">
          {children}
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MastersPage() {
  const [activeTab, setActiveTab] = useState<TabId>('designations');

  // ── Designations ──
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loadingDesig, setLoadingDesig] = useState(false);
  const [desigDialog, setDesigDialog] = useState(false);
  const [desigEdit, setDesigEdit] = useState<Designation | null>(null);
  const [desigForm, setDesigForm] = useState<Partial<Designation>>({});
  const [desigDeleteId, setDesigDeleteId] = useState<string | null>(null);
  const [desigSaving, setDesigSaving] = useState(false);

  // ── Departments ──
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDept, setLoadingDept] = useState(false);
  const [deptDialog, setDeptDialog] = useState(false);
  const [deptEdit, setDeptEdit] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState<Partial<Department>>({});
  const [deptDeleteId, setDeptDeleteId] = useState<string | null>(null);
  const [deptSaving, setDeptSaving] = useState(false);

  // ── Shifts ──
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [shiftDialog, setShiftDialog] = useState(false);
  const [shiftEdit, setShiftEdit] = useState<Shift | null>(null);
  const [shiftForm, setShiftForm] = useState<Partial<Shift> & { weeklyOffs?: string[] }>({});
  const [shiftDeleteId, setShiftDeleteId] = useState<string | null>(null);
  const [shiftSaving, setShiftSaving] = useState(false);

  // ── Leave Types ──
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loadingLT, setLoadingLT] = useState(false);
  const [ltDialog, setLtDialog] = useState(false);
  const [ltEdit, setLtEdit] = useState<LeaveType | null>(null);
  const [ltForm, setLtForm] = useState<Partial<LeaveType>>({});
  const [ltDeleteId, setLtDeleteId] = useState<string | null>(null);
  const [ltSaving, setLtSaving] = useState(false);

  // ── Holidays ──
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loadingHol, setLoadingHol] = useState(false);
  const [holDialog, setHolDialog] = useState(false);
  const [holEdit, setHolEdit] = useState<Holiday | null>(null);
  const [holForm, setHolForm] = useState<Partial<Holiday>>({});
  const [holDeleteId, setHolDeleteId] = useState<string | null>(null);
  const [holSaving, setHolSaving] = useState(false);
  const [holYear, setHolYear] = useState(new Date().getFullYear());

  // ── Sites ──
  const [sites, setSites] = useState<Site[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [siteDialog, setSiteDialog] = useState(false);
  const [siteEdit, setSiteEdit] = useState<Site | null>(null);
  const [siteForm, setSiteForm] = useState<Partial<Site>>({});
  const [siteDeleteId, setSiteDeleteId] = useState<string | null>(null);
  const [siteSaving, setSiteSaving] = useState(false);

  // ── Salary Components ──
  const [salaryComponents, setSalaryComponents] = useState<SalaryComponent[]>([]);
  const [loadingSC, setLoadingSC] = useState(false);
  const [scDialog, setScDialog] = useState(false);
  const [scEdit, setScEdit] = useState<SalaryComponent | null>(null);
  const [scForm, setScForm] = useState<Partial<SalaryComponent>>({});
  const [scDeleteId, setScDeleteId] = useState<string | null>(null);
  const [scSaving, setScSaving] = useState(false);

  // ── Financial Years ──
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [loadingFY, setLoadingFY] = useState(false);
  const [fyDialog, setFyDialog] = useState(false);
  const [fyEdit, setFyEdit] = useState<FinancialYear | null>(null);
  const [fyForm, setFyForm] = useState<Partial<FinancialYear>>({});
  const [fySaving, setFySaving] = useState(false);
  const [fySettingCurrent, setFySettingCurrent] = useState<string | null>(null);

  // ── Accounts ──
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAcc, setLoadingAcc] = useState(false);
  const [accDialog, setAccDialog] = useState(false);
  const [accEdit, setAccEdit] = useState<Account | null>(null);
  const [accForm, setAccForm] = useState<Partial<Account>>({});
  const [accDeleteId, setAccDeleteId] = useState<string | null>(null);
  const [accSaving, setAccSaving] = useState(false);

  // ── Bank Accounts ──
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loadingBA, setLoadingBA] = useState(false);
  const [baDialog, setBaDialog] = useState(false);
  const [baEdit, setBaEdit] = useState<BankAccount | null>(null);
  const [baForm, setBaForm] = useState<Partial<BankAccount>>({});
  const [baDeleteId, setBaDeleteId] = useState<string | null>(null);
  const [baSaving, setBaSaving] = useState(false);

  // ── Cost Centers ──
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loadingCC, setLoadingCC] = useState(false);
  const [ccDialog, setCcDialog] = useState(false);
  const [ccEdit, setCcEdit] = useState<CostCenter | null>(null);
  const [ccForm, setCcForm] = useState<Partial<CostCenter>>({});
  const [ccDeleteId, setCcDeleteId] = useState<string | null>(null);
  const [ccSaving, setCcSaving] = useState(false);

  // ── Zones ──
  const [zones, setZones] = useState<Zone[]>([]);
  const [loadingZones, setLoadingZones] = useState(false);
  const [zoneDialog, setZoneDialog] = useState(false);
  const [zoneEdit, setZoneEdit] = useState<Zone | null>(null);
  const [zoneForm, setZoneForm] = useState<Partial<Zone>>({});
  const [zoneDeleteId, setZoneDeleteId] = useState<string | null>(null);
  const [zoneSaving, setZoneSaving] = useState(false);

  // ── Regions ──
  const [regions, setRegions] = useState<Region[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [regionDialog, setRegionDialog] = useState(false);
  const [regionEdit, setRegionEdit] = useState<Region | null>(null);
  const [regionForm, setRegionForm] = useState<Partial<Region>>({});
  const [regionDeleteId, setRegionDeleteId] = useState<string | null>(null);
  const [regionSaving, setRegionSaving] = useState(false);

  // ── Branches ──
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [branchDialog, setBranchDialog] = useState(false);
  const [branchEdit, setBranchEdit] = useState<Branch | null>(null);
  const [branchForm, setBranchForm] = useState<Partial<Branch>>({});
  const [branchDeleteId, setBranchDeleteId] = useState<string | null>(null);
  const [branchSaving, setBranchSaving] = useState(false);

  // ── HSN / GST ──
  const [hsnList, setHsnList] = useState<HsnMaster[]>([]);
  const [loadingHsn, setLoadingHsn] = useState(false);
  const [hsnDialog, setHsnDialog] = useState(false);
  const [hsnEdit, setHsnEdit] = useState<HsnMaster | null>(null);
  const [hsnForm, setHsnForm] = useState<Partial<HsnMaster>>({});
  const [hsnDeleteId, setHsnDeleteId] = useState<string | null>(null);
  const [hsnSaving, setHsnSaving] = useState(false);

  // ── Rate Master ──
  const [rateMasters, setRateMasters] = useState<RateMaster[]>([]);
  const [loadingRM, setLoadingRM] = useState(false);
  const [rmDialog, setRmDialog] = useState(false);
  const [rmEdit, setRmEdit] = useState<RateMaster | null>(null);
  const [rmForm, setRmForm] = useState<Partial<RateMaster>>({});
  const [rmDeleteId, setRmDeleteId] = useState<string | null>(null);
  const [rmSaving, setRmSaving] = useState(false);

  // ── Enum Config ──
  const [enumMeta, setEnumMeta] = useState<Record<string, Record<string, { label: string; description: string; active: boolean }>>>({});
  const [enumEditing, setEnumEditing] = useState<{ section: string; key: string } | null>(null);
  const [enumDraft, setEnumDraft] = useState<{ label: string; description: string }>({ label: '', description: '' });

  // ── Toast ──
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ─── Loaders ───────────────────────────────────────────────────────────────

  const loadDesignations = useCallback(async () => {
    setLoadingDesig(true);
    try { setDesignations(await mastersApi.designations()); }
    catch { showToast('Failed to load designations', 'error'); }
    finally { setLoadingDesig(false); }
  }, [showToast]);

  const loadDepartments = useCallback(async () => {
    setLoadingDept(true);
    try { setDepartments(await mastersApi.departments()); }
    catch { showToast('Failed to load departments', 'error'); }
    finally { setLoadingDept(false); }
  }, [showToast]);

  const loadShifts = useCallback(async () => {
    setLoadingShifts(true);
    try { setShifts(await mastersApi.shifts()); }
    catch { showToast('Failed to load shifts', 'error'); }
    finally { setLoadingShifts(false); }
  }, [showToast]);

  const loadLeaveTypes = useCallback(async () => {
    setLoadingLT(true);
    try { setLeaveTypes(await mastersApi.leaveTypes()); }
    catch { showToast('Failed to load leave types', 'error'); }
    finally { setLoadingLT(false); }
  }, [showToast]);

  const loadHolidays = useCallback(async (year: number) => {
    setLoadingHol(true);
    try { setHolidays(await mastersApi.holidays(year)); }
    catch { showToast('Failed to load holidays', 'error'); }
    finally { setLoadingHol(false); }
  }, [showToast]);

  const loadSites = useCallback(async () => {
    setLoadingSites(true);
    try { setSites(await mastersApi.sites()); }
    catch { showToast('Failed to load sites', 'error'); }
    finally { setLoadingSites(false); }
  }, [showToast]);

  const loadSalaryComponents = useCallback(async () => {
    setLoadingSC(true);
    try { setSalaryComponents(await mastersApi.salaryComponents()); }
    catch { showToast('Failed to load salary components', 'error'); }
    finally { setLoadingSC(false); }
  }, [showToast]);

  const loadFinancialYears = useCallback(async () => {
    setLoadingFY(true);
    try { setFinancialYears(await mastersApi.financialYears()); }
    catch { showToast('Failed to load financial years', 'error'); }
    finally { setLoadingFY(false); }
  }, [showToast]);

  const loadAccounts = useCallback(async () => {
    setLoadingAcc(true);
    try { setAccounts(await mastersApi.accounts()); }
    catch { showToast('Failed to load accounts', 'error'); }
    finally { setLoadingAcc(false); }
  }, [showToast]);

  const loadBankAccounts = useCallback(async () => {
    setLoadingBA(true);
    try { setBankAccounts(await mastersApi.bankAccounts()); }
    catch { showToast('Failed to load bank accounts', 'error'); }
    finally { setLoadingBA(false); }
  }, [showToast]);

  const loadCostCenters = useCallback(async () => {
    setLoadingCC(true);
    try { setCostCenters(await costCenterApi.list()); }
    catch { showToast('Failed to load cost centers', 'error'); }
    finally { setLoadingCC(false); }
  }, [showToast]);

  const loadZones = useCallback(async () => {
    setLoadingZones(true);
    try { setZones(await organizationApi.zones()); }
    catch { showToast('Failed to load zones', 'error'); }
    finally { setLoadingZones(false); }
  }, [showToast]);

  const loadRegions = useCallback(async () => {
    setLoadingRegions(true);
    try { setRegions(await organizationApi.regions()); }
    catch { showToast('Failed to load regions', 'error'); }
    finally { setLoadingRegions(false); }
  }, [showToast]);

  const loadBranches = useCallback(async () => {
    setLoadingBranches(true);
    try { setBranches(await organizationApi.branches()); }
    catch { showToast('Failed to load branches', 'error'); }
    finally { setLoadingBranches(false); }
  }, [showToast]);

  const loadHsn = useCallback(async () => {
    setLoadingHsn(true);
    try { setHsnList(await mastersApi.hsnList()); }
    catch { showToast('Failed to load HSN master', 'error'); }
    finally { setLoadingHsn(false); }
  }, [showToast]);

  const loadRateMasters = useCallback(async () => {
    setLoadingRM(true);
    try { setRateMasters(await mastersApi.rateMasters()); }
    catch { showToast('Failed to load rate masters', 'error'); }
    finally { setLoadingRM(false); }
  }, [showToast]);

  // Load all tabs in parallel on mount — tab switches are instant, no per-click fetch
  useEffect(() => {
    setEnumMeta(loadEnumMeta());
    Promise.allSettled([
      loadDesignations(),
      loadDepartments(),
      loadShifts(),
      loadLeaveTypes(),
      loadHolidays(new Date().getFullYear()),
      loadSites(),
      loadSalaryComponents(),
      loadFinancialYears(),
      loadAccounts(),
      loadBankAccounts(),
      loadCostCenters(),
      loadZones(),
      loadRegions(),
      loadBranches(),
      loadHsn(),
      loadRateMasters(),
    ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload holidays when the year filter changes
  useEffect(() => {
    loadHolidays(holYear);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holYear]);

  // ─── CRUD helpers ─────────────────────────────────────────────────────────

  // Designations
  function openDesigAdd() { setDesigEdit(null); setDesigForm({}); setDesigDialog(true); }
  function openDesigEdit(d: Designation) { setDesigEdit(d); setDesigForm({ ...d }); setDesigDialog(true); }
  async function saveDesig() {
    if (!desigForm.name?.trim()) return showToast('Name is required', 'error');
    setDesigSaving(true);
    try {
      if (desigEdit) await mastersApi.updateDesignation(desigEdit.id, desigForm);
      else await mastersApi.createDesignation(desigForm);
      showToast(desigEdit ? 'Designation updated' : 'Designation created');
      setDesigDialog(false); loadDesignations();
    } catch { showToast('Failed to save designation', 'error'); }
    finally { setDesigSaving(false); }
  }
  async function deleteDesig(id: string) {
    try { await mastersApi.deleteDesignation(id); showToast('Designation deleted'); loadDesignations(); }
    catch { showToast('Failed to delete', 'error'); }
    setDesigDeleteId(null);
  }

  // Departments
  function openDeptAdd() { setDeptEdit(null); setDeptForm({}); setDeptDialog(true); }
  function openDeptEdit(d: Department) { setDeptEdit(d); setDeptForm({ ...d }); setDeptDialog(true); }
  async function saveDept() {
    if (!deptForm.name?.trim()) return showToast('Name is required', 'error');
    setDeptSaving(true);
    try {
      if (deptEdit) await mastersApi.updateDepartment(deptEdit.id, deptForm);
      else await mastersApi.createDepartment(deptForm);
      showToast(deptEdit ? 'Department updated' : 'Department created');
      setDeptDialog(false); loadDepartments();
    } catch { showToast('Failed to save department', 'error'); }
    finally { setDeptSaving(false); }
  }
  async function deleteDept(id: string) {
    try { await mastersApi.deleteDepartment(id); showToast('Department deleted'); loadDepartments(); }
    catch { showToast('Failed to delete', 'error'); }
    setDeptDeleteId(null);
  }

  // Shifts
  function openShiftAdd() { setShiftEdit(null); setShiftForm({ weeklyOffs: [] }); setShiftDialog(true); }
  function openShiftEdit(s: Shift) { setShiftEdit(s); setShiftForm({ ...s, weeklyOffs: s.weeklyOffs ?? [] }); setShiftDialog(true); }
  async function saveShift() {
    if (!shiftForm.name?.trim() || !shiftForm.startTime || !shiftForm.endTime) return showToast('Name, start time and end time are required', 'error');
    setShiftSaving(true);
    try {
      if (shiftEdit) await mastersApi.updateShift(shiftEdit.id, shiftForm);
      else await mastersApi.createShift(shiftForm);
      showToast(shiftEdit ? 'Shift updated' : 'Shift created');
      setShiftDialog(false); loadShifts();
    } catch { showToast('Failed to save shift', 'error'); }
    finally { setShiftSaving(false); }
  }
  async function deleteShift(id: string) {
    try { await mastersApi.deleteShift(id); showToast('Shift deleted'); loadShifts(); }
    catch { showToast('Failed to delete', 'error'); }
    setShiftDeleteId(null);
  }

  // Leave Types
  function openLtAdd() { setLtEdit(null); setLtForm({}); setLtDialog(true); }
  function openLtEdit(l: LeaveType) { setLtEdit(l); setLtForm({ ...l }); setLtDialog(true); }
  async function saveLt() {
    if (!ltForm.name?.trim() || !ltForm.code?.trim()) return showToast('Name and code are required', 'error');
    setLtSaving(true);
    try {
      if (ltEdit) await mastersApi.updateLeaveType(ltEdit.id, ltForm);
      else await mastersApi.createLeaveType(ltForm);
      showToast(ltEdit ? 'Leave type updated' : 'Leave type created');
      setLtDialog(false); loadLeaveTypes();
    } catch { showToast('Failed to save leave type', 'error'); }
    finally { setLtSaving(false); }
  }
  async function deleteLt(id: string) {
    try { await mastersApi.deleteLeaveType(id); showToast('Leave type deleted'); loadLeaveTypes(); }
    catch { showToast('Failed to delete', 'error'); }
    setLtDeleteId(null);
  }

  // Holidays
  function openHolAdd() { setHolEdit(null); setHolForm({}); setHolDialog(true); }
  function openHolEdit(h: Holiday) { setHolEdit(h); setHolForm({ ...h }); setHolDialog(true); }
  async function saveHol() {
    if (!holForm.name?.trim() || !holForm.date) return showToast('Name and date are required', 'error');
    setHolSaving(true);
    try {
      if (holEdit) await mastersApi.updateHoliday(holEdit.id, holForm);
      else await mastersApi.createHoliday(holForm);
      showToast(holEdit ? 'Holiday updated' : 'Holiday created');
      setHolDialog(false); loadHolidays(holYear);
    } catch { showToast('Failed to save holiday', 'error'); }
    finally { setHolSaving(false); }
  }
  async function deleteHol(id: string) {
    try { await mastersApi.deleteHoliday(id); showToast('Holiday deleted'); loadHolidays(holYear); }
    catch { showToast('Failed to delete', 'error'); }
    setHolDeleteId(null);
  }

  // Sites
  function openSiteAdd() { setSiteEdit(null); setSiteForm({}); setSiteDialog(true); }
  function openSiteEdit(s: Site) {
    setSiteEdit(s);
    const addr = s.address && typeof s.address === 'object'
      ? Object.values(s.address as Record<string, string>).filter(Boolean).join(', ')
      : (s.address as any) || '';
    setSiteForm({ ...s, address: addr });
    setSiteDialog(true);
  }
  async function saveSite() {
    if (!siteForm.name?.trim()) return showToast('Name is required', 'error');
    setSiteSaving(true);
    try {
      if (siteEdit) await mastersApi.updateSite(siteEdit.id, siteForm);
      else await mastersApi.createSite(siteForm);
      showToast(siteEdit ? 'Site updated' : 'Site created');
      setSiteDialog(false); loadSites();
    } catch { showToast('Failed to save site', 'error'); }
    finally { setSiteSaving(false); }
  }
  async function deleteSite(id: string) {
    try { await mastersApi.deleteSite(id); showToast('Site deleted'); loadSites(); }
    catch { showToast('Failed to delete', 'error'); }
    setSiteDeleteId(null);
  }

  // Salary Components
  function openScAdd() { setScEdit(null); setScForm({}); setScDialog(true); }
  function openScEdit(s: SalaryComponent) { setScEdit(s); setScForm({ ...s }); setScDialog(true); }
  async function saveSc() {
    if (!scForm.name?.trim() || !scForm.code?.trim()) return showToast('Name and code are required', 'error');
    setScSaving(true);
    try {
      if (scEdit) await mastersApi.updateSalaryComponent(scEdit.id, scForm);
      else await mastersApi.createSalaryComponent(scForm);
      showToast(scEdit ? 'Component updated' : 'Component created');
      setScDialog(false); loadSalaryComponents();
    } catch { showToast('Failed to save component', 'error'); }
    finally { setScSaving(false); }
  }
  async function deleteSc(id: string) {
    try { await mastersApi.deleteSalaryComponent(id); showToast('Component deleted'); loadSalaryComponents(); }
    catch { showToast('Failed to delete', 'error'); }
    setScDeleteId(null);
  }

  // Financial Years
  function openFyAdd() { setFyEdit(null); setFyForm({}); setFyDialog(true); }
  function openFyEdit(f: FinancialYear) { setFyEdit(f); setFyForm({ ...f }); setFyDialog(true); }
  async function saveFy() {
    if (!fyForm.label?.trim() || !fyForm.startDate || !fyForm.endDate) return showToast('Label, start date and end date are required', 'error');
    setFySaving(true);
    try {
      if (fyEdit) await mastersApi.updateFinancialYear(fyEdit.id, fyForm);
      else await mastersApi.createFinancialYear(fyForm);
      showToast(fyEdit ? 'Financial year updated' : 'Financial year created');
      setFyDialog(false); loadFinancialYears();
    } catch { showToast('Failed to save financial year', 'error'); }
    finally { setFySaving(false); }
  }
  async function setCurrentFY(id: string) {
    setFySettingCurrent(id);
    try {
      await mastersApi.updateFinancialYear(id, { isCurrent: true });
      showToast('Financial year set as current');
      loadFinancialYears();
    } catch { showToast('Failed to update', 'error'); }
    finally { setFySettingCurrent(null); }
  }

  // Accounts
  function openAccAdd() { setAccEdit(null); setAccForm({}); setAccDialog(true); }
  function openAccEdit(a: Account) { setAccEdit(a); setAccForm({ ...a }); setAccDialog(true); }
  async function saveAcc() {
    if (!accForm.code?.trim() || !accForm.name?.trim()) return showToast('Code and name are required', 'error');
    setAccSaving(true);
    try {
      if (accEdit) await mastersApi.updateAccount(accEdit.id, accForm);
      else await mastersApi.createAccount(accForm);
      showToast(accEdit ? 'Account updated' : 'Account created');
      setAccDialog(false); loadAccounts();
    } catch { showToast('Failed to save account', 'error'); }
    finally { setAccSaving(false); }
  }
  async function deleteAcc(id: string) {
    try { await mastersApi.deleteAccount(id); showToast('Account deleted'); loadAccounts(); }
    catch { showToast('Failed to delete', 'error'); }
    setAccDeleteId(null);
  }

  // Bank Accounts
  function openBaAdd() { setBaEdit(null); setBaForm({}); setBaDialog(true); }
  function openBaEdit(b: BankAccount) { setBaEdit(b); setBaForm({ ...b }); setBaDialog(true); }
  async function saveBa() {
    if (!baForm.accountName?.trim() || !baForm.accountNumber?.trim() || !baForm.bankName?.trim()) {
      return showToast('Account name, number and bank name are required', 'error');
    }
    setBaSaving(true);
    try {
      if (baEdit) await mastersApi.updateBankAccount(baEdit.id, baForm);
      else await mastersApi.createBankAccount(baForm);
      showToast(baEdit ? 'Bank account updated' : 'Bank account created');
      setBaDialog(false); loadBankAccounts();
    } catch { showToast('Failed to save bank account', 'error'); }
    finally { setBaSaving(false); }
  }
  async function deleteBA(id: string) {
    try { await mastersApi.deleteBankAccount(id); showToast('Bank account deleted'); loadBankAccounts(); }
    catch { showToast('Failed to delete', 'error'); }
    setBaDeleteId(null);
  }

  // Cost Centers
  function openCcAdd() { setCcEdit(null); setCcForm({}); setCcDialog(true); }
  function openCcEdit(c: CostCenter) { setCcEdit(c); setCcForm({ ...c }); setCcDialog(true); }
  async function saveCc() {
    if (!ccForm.name?.trim()) return showToast('Name is required', 'error');
    setCcSaving(true);
    try {
      if (ccEdit) await costCenterApi.update(ccEdit.id, ccForm);
      else await costCenterApi.create(ccForm);
      showToast(ccEdit ? 'Cost center updated' : 'Cost center created');
      setCcDialog(false); loadCostCenters();
    } catch { showToast('Failed to save cost center', 'error'); }
    finally { setCcSaving(false); }
  }
  async function deleteCC(id: string) {
    try { await costCenterApi.remove(id); showToast('Cost center deleted'); loadCostCenters(); }
    catch { showToast('Failed to delete', 'error'); }
    setCcDeleteId(null);
  }

  // Zones
  function openZoneAdd() { setZoneEdit(null); setZoneForm({}); setZoneDialog(true); }
  function openZoneEdit(z: Zone) { setZoneEdit(z); setZoneForm({ ...z }); setZoneDialog(true); }
  async function saveZone() {
    if (!zoneForm.name?.trim()) return showToast('Name is required', 'error');
    setZoneSaving(true);
    try {
      if (zoneEdit) await organizationApi.updateZone(zoneEdit.id, zoneForm);
      else await organizationApi.createZone(zoneForm);
      showToast(zoneEdit ? 'Zone updated' : 'Zone created');
      setZoneDialog(false); loadZones();
    } catch { showToast('Failed to save zone', 'error'); }
    finally { setZoneSaving(false); }
  }
  async function deleteZone(id: string) {
    try { await organizationApi.deleteZone(id); showToast('Zone deleted'); loadZones(); }
    catch { showToast('Failed to delete', 'error'); }
    setZoneDeleteId(null);
  }

  // Regions
  function openRegionAdd() { setRegionEdit(null); setRegionForm({}); setRegionDialog(true); }
  function openRegionEdit(r: Region) { setRegionEdit(r); setRegionForm({ ...r }); setRegionDialog(true); }
  async function saveRegion() {
    if (!regionForm.name?.trim()) return showToast('Name is required', 'error');
    setRegionSaving(true);
    try {
      if (regionEdit) await organizationApi.updateRegion(regionEdit.id, regionForm);
      else await organizationApi.createRegion(regionForm);
      showToast(regionEdit ? 'Region updated' : 'Region created');
      setRegionDialog(false); loadRegions();
    } catch { showToast('Failed to save region', 'error'); }
    finally { setRegionSaving(false); }
  }
  async function deleteRegion(id: string) {
    try { await organizationApi.deleteRegion(id); showToast('Region deleted'); loadRegions(); }
    catch { showToast('Failed to delete', 'error'); }
    setRegionDeleteId(null);
  }

  // Branches
  function openBranchAdd() { setBranchEdit(null); setBranchForm({}); setBranchDialog(true); }
  function openBranchEdit(b: Branch) { setBranchEdit(b); setBranchForm({ ...b }); setBranchDialog(true); }
  async function saveBranch() {
    if (!branchForm.name?.trim() || !branchForm.code?.trim()) return showToast('Name and code are required', 'error');
    setBranchSaving(true);
    try {
      if (branchEdit) await organizationApi.updateBranch(branchEdit.id, branchForm);
      else await organizationApi.createBranch(branchForm);
      showToast(branchEdit ? 'Branch updated' : 'Branch created');
      setBranchDialog(false); loadBranches();
    } catch { showToast('Failed to save branch', 'error'); }
    finally { setBranchSaving(false); }
  }
  async function deleteBranch(id: string) {
    try { await organizationApi.deleteBranch(id); showToast('Branch deleted'); loadBranches(); }
    catch { showToast('Failed to delete', 'error'); }
    setBranchDeleteId(null);
  }

  // HSN / GST
  function openHsnAdd() { setHsnEdit(null); setHsnForm({ defaultTaxRate: 18 }); setHsnDialog(true); }
  function openHsnEdit(h: HsnMaster) { setHsnEdit(h); setHsnForm({ ...h }); setHsnDialog(true); }
  async function saveHsn() {
    if (!hsnForm.hsnCode?.trim() || !hsnForm.description?.trim()) return showToast('HSN code and description are required', 'error');
    setHsnSaving(true);
    try {
      if (hsnEdit) await mastersApi.hsnUpdate(hsnEdit.id, hsnForm);
      else await mastersApi.hsnCreate(hsnForm);
      showToast(hsnEdit ? 'HSN entry updated' : 'HSN entry created');
      setHsnDialog(false); loadHsn();
    } catch { showToast('Failed to save HSN entry', 'error'); }
    finally { setHsnSaving(false); }
  }
  async function deleteHsn(id: string) {
    try { await mastersApi.hsnDelete(id); showToast('HSN entry deleted'); loadHsn(); }
    catch { showToast('Failed to delete', 'error'); }
    setHsnDeleteId(null);
  }

  // Rate Master
  function openRmAdd() { setRmEdit(null); setRmForm({ rateType: 'BASIC', effectiveFrom: new Date().toISOString().slice(0, 10) }); setRmDialog(true); }
  function openRmEdit(r: RateMaster) { setRmEdit(r); setRmForm({ ...r, effectiveFrom: r.effectiveFrom?.slice(0, 10), effectiveTo: r.effectiveTo?.slice(0, 10) }); setRmDialog(true); }
  async function saveRm() {
    if (!rmForm.rateType || !rmForm.amount || !rmForm.effectiveFrom) return showToast('Rate type, amount, and effective date are required', 'error');
    setRmSaving(true);
    try {
      if (rmEdit) await mastersApi.updateRateMaster(rmEdit.id, rmForm);
      else await mastersApi.createRateMaster(rmForm);
      showToast(rmEdit ? 'Rate updated' : 'Rate created');
      setRmDialog(false); loadRateMasters();
    } catch { showToast('Failed to save rate', 'error'); }
    finally { setRmSaving(false); }
  }
  async function deleteRm(id: string) {
    try { await mastersApi.deleteRateMaster(id); showToast('Rate deleted'); loadRateMasters(); }
    catch { showToast('Failed to delete', 'error'); }
    setRmDeleteId(null);
  }

  // Enum Config
  function startEnumEdit(sectionKey: string, itemKey: string, current: { label: string; description: string }) {
    setEnumEditing({ section: sectionKey, key: itemKey });
    setEnumDraft({ label: current.label, description: current.description });
  }
  function saveEnumEdit() {
    if (!enumEditing) return;
    const next = {
      ...enumMeta,
      [enumEditing.section]: {
        ...(enumMeta[enumEditing.section] ?? {}),
        [enumEditing.key]: { ...enumDraft, active: enumMeta[enumEditing.section]?.[enumEditing.key]?.active ?? true },
      },
    };
    setEnumMeta(next);
    saveEnumMeta(next);
    setEnumEditing(null);
  }
  function toggleEnumActive(sectionKey: string, itemKey: string) {
    const current = enumMeta[sectionKey]?.[itemKey];
    const next = {
      ...enumMeta,
      [sectionKey]: {
        ...(enumMeta[sectionKey] ?? {}),
        [itemKey]: { label: current?.label ?? itemKey, description: current?.description ?? '', active: !(current?.active ?? true) },
      },
    };
    setEnumMeta(next);
    saveEnumMeta(next);
  }

  // ─── Account type colors ─────────────────────────────────────────────────
  function accTypeColor(type?: string) {
    const map: Record<string, string> = {
      ASSET: '#3b82f6', LIABILITY: '#f59e0b', EQUITY: '#8b5cf6',
      INCOME: '#10b981', EXPENSE: '#f43f5e',
    };
    return map[type ?? ''] ?? '#818cf8';
  }

  function scTypeColor(type?: string) {
    return type === 'EARNING' ? '#10b981' : type === 'DEDUCTION' ? '#f43f5e' : '#f59e0b';
  }

  function holTypeColor(type?: string) {
    const m: Record<string, string> = { NATIONAL: '#f43f5e', RESTRICTED: '#f59e0b', FESTIVAL: '#8b5cf6', OTHER: '#60a5fa' };
    return m[type ?? ''] ?? '#818cf8';
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl"
          style={{
            background: toast.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
            border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`,
            backdropFilter: 'blur(12px)',
            color: toast.type === 'success' ? '#34d399' : '#fb7185',
          }}
        >
          {toast.type === 'success' ? <Check size={16} /> : <X size={16} />}
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}

      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
          Masters &amp; Configuration
        </h2>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Manage all reference data used across the system
        </p>
      </div>

      {/* Tab Bar */}
      <div
        className="flex items-center gap-1 overflow-x-auto pb-0.5"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          scrollbarWidth: 'none',
        }}
      >
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200 relative flex-shrink-0 rounded-t-lg"
              style={{
                color: active ? '#818cf8' : 'rgba(255,255,255,0.45)',
                background: active ? 'rgba(99,102,241,0.08)' : 'transparent',
                borderBottom: active ? '2px solid #6366f1' : '2px solid transparent',
              }}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="glass-card p-6">

        {/* ═══ DESIGNATIONS ═══════════════════════════════════════════════ */}
        {activeTab === 'designations' && (
          <>
            <TabPanel title="Designations" onAdd={openDesigAdd}>
              <thead>
                <tr><TH>Name</TH><TH>Code</TH><TH>Level</TH><TH>Description</TH><TH></TH></tr>
              </thead>
              <tbody>
                {loadingDesig ? <SkeletonRows cols={5} /> :
                  designations.length === 0 ? <EmptyState label="designations" /> :
                  designations.map(d => (
                    <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <TD><span className="font-medium text-white">{d.name}</span></TD>
                      <TD muted>{d.code || '—'}</TD>
                      <TD muted>{d.level ?? '—'}</TD>
                      <TD muted>{d.description || '—'}</TD>
                      <td className="px-4 py-3.5">
                        <ActionBtn
                          onEdit={() => openDesigEdit(d)}
                          onDelete={() => setDesigDeleteId(d.id)}
                          deleteConfirm={desigDeleteId === d.id}
                          onDeleteConfirm={() => deleteDesig(d.id)}
                          onDeleteCancel={() => setDesigDeleteId(null)}
                        />
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </TabPanel>
            <Modal open={desigDialog} onClose={() => setDesigDialog(false)} title={desigEdit ? 'Edit Designation' : 'Add Designation'}>
              <div className="space-y-4">
                <FieldGrid>
                  <FieldFull>
                    <Label>Name *</Label>
                    <Input value={desigForm.name} onChange={v => setDesigForm(f => ({ ...f, name: v }))} placeholder="e.g. Site Supervisor" />
                  </FieldFull>
                  <div>
                    <Label>Code</Label>
                    <Input value={desigForm.code} onChange={v => setDesigForm(f => ({ ...f, code: v }))} placeholder="e.g. SS" />
                  </div>
                  <div>
                    <Label>Level</Label>
                    <Input type="number" value={desigForm.level} onChange={v => setDesigForm(f => ({ ...f, level: Number(v) }))} placeholder="e.g. 3" />
                  </div>
                  <FieldFull>
                    <Label>Description</Label>
                    <Input value={desigForm.description} onChange={v => setDesigForm(f => ({ ...f, description: v }))} placeholder="Brief description" />
                  </FieldFull>
                </FieldGrid>
                <div className="flex gap-3 pt-2">
                  <button className="btn-primary" onClick={saveDesig} disabled={desigSaving}>
                    {desigSaving ? 'Saving…' : <><Check size={14} />{desigEdit ? 'Update' : 'Create'}</>}
                  </button>
                  <button className="btn-secondary" onClick={() => setDesigDialog(false)}>Cancel</button>
                </div>
              </div>
            </Modal>
          </>
        )}

        {/* ═══ DEPARTMENTS ════════════════════════════════════════════════ */}
        {activeTab === 'departments' && (
          <>
            <TabPanel title="Departments" onAdd={openDeptAdd}>
              <thead>
                <tr><TH>Name</TH><TH>Code</TH><TH>Parent Dept</TH><TH>Description</TH><TH></TH></tr>
              </thead>
              <tbody>
                {loadingDept ? <SkeletonRows cols={5} /> :
                  departments.length === 0 ? <EmptyState label="departments" /> :
                  departments.map(d => (
                    <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <TD><span className="font-medium text-white">{d.name}</span></TD>
                      <TD muted>{d.code || '—'}</TD>
                      <TD muted>{d.parent?.name || (d.parentId ? '…' : '—')}</TD>
                      <TD muted>{d.description || '—'}</TD>
                      <td className="px-4 py-3.5">
                        <ActionBtn
                          onEdit={() => openDeptEdit(d)}
                          onDelete={() => setDeptDeleteId(d.id)}
                          deleteConfirm={deptDeleteId === d.id}
                          onDeleteConfirm={() => deleteDept(d.id)}
                          onDeleteCancel={() => setDeptDeleteId(null)}
                        />
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </TabPanel>
            <Modal open={deptDialog} onClose={() => setDeptDialog(false)} title={deptEdit ? 'Edit Department' : 'Add Department'}>
              <div className="space-y-4">
                <FieldGrid>
                  <FieldFull>
                    <Label>Name *</Label>
                    <Input value={deptForm.name} onChange={v => setDeptForm(f => ({ ...f, name: v }))} placeholder="e.g. Operations" />
                  </FieldFull>
                  <div>
                    <Label>Code</Label>
                    <Input value={deptForm.code} onChange={v => setDeptForm(f => ({ ...f, code: v }))} placeholder="e.g. OPS" />
                  </div>
                  <div>
                    <Label>Parent Department</Label>
                    <SelectField value={deptForm.parentId} onChange={v => setDeptForm(f => ({ ...f, parentId: v || undefined }))}>
                      <option value="">— None —</option>
                      {departments.filter(d => d.id !== deptEdit?.id).map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </SelectField>
                  </div>
                  <FieldFull>
                    <Label>Description</Label>
                    <Input value={deptForm.description} onChange={v => setDeptForm(f => ({ ...f, description: v }))} placeholder="Brief description" />
                  </FieldFull>
                </FieldGrid>
                <div className="flex gap-3 pt-2">
                  <button className="btn-primary" onClick={saveDept} disabled={deptSaving}>
                    {deptSaving ? 'Saving…' : <><Check size={14} />{deptEdit ? 'Update' : 'Create'}</>}
                  </button>
                  <button className="btn-secondary" onClick={() => setDeptDialog(false)}>Cancel</button>
                </div>
              </div>
            </Modal>
          </>
        )}

        {/* ═══ SHIFTS ═════════════════════════════════════════════════════ */}
        {activeTab === 'shifts' && (
          <>
            <TabPanel title="Shifts" onAdd={openShiftAdd}>
              <thead>
                <tr><TH>Name</TH><TH>Type</TH><TH>Start Time</TH><TH>End Time</TH><TH>Break (min)</TH><TH>Night Shift</TH><TH></TH></tr>
              </thead>
              <tbody>
                {loadingShifts ? <SkeletonRows cols={7} /> :
                  shifts.length === 0 ? <EmptyState label="shifts" /> :
                  shifts.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <TD><span className="font-medium text-white">{s.name}</span></TD>
                      <TD><TypeBadge>{s.shiftType}</TypeBadge></TD>
                      <TD muted>{s.startTime}</TD>
                      <TD muted>{s.endTime}</TD>
                      <TD muted>{s.breakDuration ?? '—'}</TD>
                      <TD>
                        {s.isNightShift
                          ? <span className="badge badge-info">Yes</span>
                          : <span className="badge badge-neutral">No</span>}
                      </TD>
                      <td className="px-4 py-3.5">
                        <ActionBtn
                          onEdit={() => openShiftEdit(s)}
                          onDelete={() => setShiftDeleteId(s.id)}
                          deleteConfirm={shiftDeleteId === s.id}
                          onDeleteConfirm={() => deleteShift(s.id)}
                          onDeleteCancel={() => setShiftDeleteId(null)}
                        />
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </TabPanel>
            <Modal open={shiftDialog} onClose={() => setShiftDialog(false)} title={shiftEdit ? 'Edit Shift' : 'Add Shift'}>
              <div className="space-y-4">
                <FieldGrid>
                  <FieldFull>
                    <Label>Name *</Label>
                    <Input value={shiftForm.name} onChange={v => setShiftForm(f => ({ ...f, name: v }))} placeholder="e.g. Morning Shift" />
                  </FieldFull>
                  <div>
                    <Label>Shift Type</Label>
                    <SelectField value={shiftForm.shiftType} onChange={v => setShiftForm(f => ({ ...f, shiftType: v }))}>
                      <option value="">Select type</option>
                      {['GENERAL','MORNING','EVENING','NIGHT','SPLIT'].map(t => <option key={t} value={t}>{t}</option>)}
                    </SelectField>
                  </div>
                  <div>
                    <Label>Overtime After (hrs)</Label>
                    <Input type="number" value={shiftForm.overtimeAfter} onChange={v => setShiftForm(f => ({ ...f, overtimeAfter: Number(v) }))} placeholder="8" />
                  </div>
                  <div>
                    <Label>Start Time *</Label>
                    <Input type="time" value={shiftForm.startTime} onChange={v => setShiftForm(f => ({ ...f, startTime: v }))} />
                  </div>
                  <div>
                    <Label>End Time *</Label>
                    <Input type="time" value={shiftForm.endTime} onChange={v => setShiftForm(f => ({ ...f, endTime: v }))} />
                  </div>
                  <div>
                    <Label>Break Duration (min)</Label>
                    <Input type="number" value={shiftForm.breakDuration} onChange={v => setShiftForm(f => ({ ...f, breakDuration: Number(v) }))} placeholder="30" />
                  </div>
                  <FieldFull>
                    <CheckboxField label="Night Shift" checked={shiftForm.isNightShift} onChange={v => setShiftForm(f => ({ ...f, isNightShift: v }))} />
                  </FieldFull>
                  <FieldFull>
                    <Label>Weekly Offs</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {DAYS_OF_WEEK.map(day => {
                        const selected = shiftForm.weeklyOffs?.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => setShiftForm(f => {
                              const offs = f.weeklyOffs ?? [];
                              return { ...f, weeklyOffs: selected ? offs.filter(d => d !== day) : [...offs, day] };
                            })}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                            style={{
                              background: selected ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                              color: selected ? '#818cf8' : 'rgba(255,255,255,0.5)',
                              border: selected ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.08)',
                            }}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </FieldFull>
                </FieldGrid>
                <div className="flex gap-3 pt-2">
                  <button className="btn-primary" onClick={saveShift} disabled={shiftSaving}>
                    {shiftSaving ? 'Saving…' : <><Check size={14} />{shiftEdit ? 'Update' : 'Create'}</>}
                  </button>
                  <button className="btn-secondary" onClick={() => setShiftDialog(false)}>Cancel</button>
                </div>
              </div>
            </Modal>
          </>
        )}

        {/* ═══ LEAVE TYPES ════════════════════════════════════════════════ */}
        {activeTab === 'leave-types' && (
          <>
            <TabPanel title="Leave Types" onAdd={openLtAdd}>
              <thead>
                <tr><TH>Name</TH><TH>Code</TH><TH>Category</TH><TH>Max Days</TH><TH>Carry Forward</TH><TH>Paid</TH><TH></TH></tr>
              </thead>
              <tbody>
                {loadingLT ? <SkeletonRows cols={7} /> :
                  leaveTypes.length === 0 ? <EmptyState label="leave types" /> :
                  leaveTypes.map(l => (
                    <tr key={l.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <TD><span className="font-medium text-white">{l.name}</span></TD>
                      <TD muted>{l.code}</TD>
                      <TD><TypeBadge color="#8b5cf6">{l.category}</TypeBadge></TD>
                      <TD muted>{l.maxDays}</TD>
                      <TD>
                        {l.isCarryForward
                          ? <span className="badge badge-success">Yes</span>
                          : <span className="badge badge-neutral">No</span>}
                      </TD>
                      <TD>
                        {l.isPaid
                          ? <span className="badge badge-success">Paid</span>
                          : <span className="badge badge-danger">Unpaid</span>}
                      </TD>
                      <td className="px-4 py-3.5">
                        <ActionBtn
                          onEdit={() => openLtEdit(l)}
                          onDelete={() => setLtDeleteId(l.id)}
                          deleteConfirm={ltDeleteId === l.id}
                          onDeleteConfirm={() => deleteLt(l.id)}
                          onDeleteCancel={() => setLtDeleteId(null)}
                        />
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </TabPanel>
            <Modal open={ltDialog} onClose={() => setLtDialog(false)} title={ltEdit ? 'Edit Leave Type' : 'Add Leave Type'}>
              <div className="space-y-4">
                <FieldGrid>
                  <div>
                    <Label>Name *</Label>
                    <Input value={ltForm.name} onChange={v => setLtForm(f => ({ ...f, name: v }))} placeholder="e.g. Casual Leave" />
                  </div>
                  <div>
                    <Label>Code *</Label>
                    <Input value={ltForm.code} onChange={v => setLtForm(f => ({ ...f, code: v }))} placeholder="e.g. CL" />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <SelectField value={ltForm.category} onChange={v => setLtForm(f => ({ ...f, category: v }))}>
                      <option value="">Select category</option>
                      {['CASUAL','EARNED','SICK','MATERNITY','PATERNITY','COMP_OFF','LWP'].map(c => <option key={c} value={c}>{c}</option>)}
                    </SelectField>
                  </div>
                  <div>
                    <Label>Max Days *</Label>
                    <Input type="number" value={ltForm.maxDays} onChange={v => setLtForm(f => ({ ...f, maxDays: Number(v) }))} placeholder="12" />
                  </div>
                  <FieldFull>
                    <Label>Description</Label>
                    <Input value={ltForm.description} onChange={v => setLtForm(f => ({ ...f, description: v }))} placeholder="Optional description" />
                  </FieldFull>
                  <div><CheckboxField label="Carry Forward" checked={ltForm.isCarryForward} onChange={v => setLtForm(f => ({ ...f, isCarryForward: v }))} /></div>
                  <div><CheckboxField label="Paid Leave" checked={ltForm.isPaid} onChange={v => setLtForm(f => ({ ...f, isPaid: v }))} /></div>
                </FieldGrid>
                <div className="flex gap-3 pt-2">
                  <button className="btn-primary" onClick={saveLt} disabled={ltSaving}>
                    {ltSaving ? 'Saving…' : <><Check size={14} />{ltEdit ? 'Update' : 'Create'}</>}
                  </button>
                  <button className="btn-secondary" onClick={() => setLtDialog(false)}>Cancel</button>
                </div>
              </div>
            </Modal>
          </>
        )}

        {/* ═══ HOLIDAYS ═══════════════════════════════════════════════════ */}
        {activeTab === 'holidays' && (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-white" style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 16 }}>Holidays</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setHolYear(y => y - 1)}
                    className="p-1.5 rounded-lg transition-all"
                    style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)' }}
                  >
                    <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
                  </button>
                  <span className="text-sm font-semibold px-2" style={{ color: 'rgba(255,255,255,0.85)', minWidth: 44, textAlign: 'center' }}>{holYear}</span>
                  <button
                    onClick={() => setHolYear(y => y + 1)}
                    className="p-1.5 rounded-lg transition-all"
                    style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)' }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
                <button className="btn-primary" onClick={openHolAdd}>
                  <Plus size={14} /> Add Holiday
                </button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr><TH>Name</TH><TH>Date</TH><TH>Type</TH><TH>Optional</TH><TH></TH></tr>
                </thead>
                <tbody>
                  {loadingHol ? <SkeletonRows cols={5} /> :
                    holidays.length === 0 ? <EmptyState label="holidays" /> :
                    holidays.map(h => (
                      <tr key={h.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <TD><span className="font-medium text-white">{h.name}</span></TD>
                        <TD muted>{fmtDate(h.date)}</TD>
                        <TD><TypeBadge color={holTypeColor(h.type)}>{h.type}</TypeBadge></TD>
                        <TD>
                          {h.isOptional
                            ? <span className="badge badge-warning">Optional</span>
                            : <span className="badge badge-success">Mandatory</span>}
                        </TD>
                        <td className="px-4 py-3.5">
                          <ActionBtn
                            onEdit={() => openHolEdit(h)}
                            onDelete={() => setHolDeleteId(h.id)}
                            deleteConfirm={holDeleteId === h.id}
                            onDeleteConfirm={() => deleteHol(h.id)}
                            onDeleteCancel={() => setHolDeleteId(null)}
                          />
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
            <Modal open={holDialog} onClose={() => setHolDialog(false)} title={holEdit ? 'Edit Holiday' : 'Add Holiday'}>
              <div className="space-y-4">
                <FieldGrid>
                  <FieldFull>
                    <Label>Name *</Label>
                    <Input value={holForm.name} onChange={v => setHolForm(f => ({ ...f, name: v }))} placeholder="e.g. Republic Day" />
                  </FieldFull>
                  <div>
                    <Label>Date *</Label>
                    <Input type="date" value={holForm.date ? holForm.date.substring(0, 10) : ''} onChange={v => setHolForm(f => ({ ...f, date: v }))} />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <SelectField value={holForm.type} onChange={v => setHolForm(f => ({ ...f, type: v }))}>
                      <option value="">Select type</option>
                      {['NATIONAL','RESTRICTED','FESTIVAL','OTHER'].map(t => <option key={t} value={t}>{t}</option>)}
                    </SelectField>
                  </div>
                  <FieldFull>
                    <CheckboxField label="Optional Holiday" checked={holForm.isOptional} onChange={v => setHolForm(f => ({ ...f, isOptional: v }))} />
                  </FieldFull>
                </FieldGrid>
                <div className="flex gap-3 pt-2">
                  <button className="btn-primary" onClick={saveHol} disabled={holSaving}>
                    {holSaving ? 'Saving…' : <><Check size={14} />{holEdit ? 'Update' : 'Create'}</>}
                  </button>
                  <button className="btn-secondary" onClick={() => setHolDialog(false)}>Cancel</button>
                </div>
              </div>
            </Modal>
          </>
        )}

        {/* ═══ SITES ══════════════════════════════════════════════════════ */}
        {activeTab === 'sites' && (
          <>
            <TabPanel title="Sites" onAdd={openSiteAdd}>
              <thead>
                <tr><TH>Name</TH><TH>Code</TH><TH>Contact Name</TH><TH>Contact Phone</TH><TH>Address</TH><TH></TH></tr>
              </thead>
              <tbody>
                {loadingSites ? <SkeletonRows cols={6} /> :
                  sites.length === 0 ? <EmptyState label="sites" /> :
                  sites.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <TD><span className="font-medium text-white">{s.name}</span></TD>
                      <TD muted>{s.code || '—'}</TD>
                      <TD muted>{s.contactName || '—'}</TD>
                      <TD muted>{s.contactPhone || '—'}</TD>
                      <TD muted>{s.address ? (() => { const a = typeof s.address === 'object' ? Object.values(s.address as Record<string, string>).filter(Boolean).join(', ') : String(s.address); return a.length > 40 ? a.substring(0, 40) + '…' : a; })() : '—'}</TD>
                      <td className="px-4 py-3.5">
                        <ActionBtn
                          onEdit={() => openSiteEdit(s)}
                          onDelete={() => setSiteDeleteId(s.id)}
                          deleteConfirm={siteDeleteId === s.id}
                          onDeleteConfirm={() => deleteSite(s.id)}
                          onDeleteCancel={() => setSiteDeleteId(null)}
                        />
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </TabPanel>
            <Modal open={siteDialog} onClose={() => setSiteDialog(false)} title={siteEdit ? 'Edit Site' : 'Add Site'}>
              <div className="space-y-4">
                <FieldGrid>
                  <div>
                    <Label>Name *</Label>
                    <Input value={siteForm.name} onChange={v => setSiteForm(f => ({ ...f, name: v }))} placeholder="e.g. Mumbai Main Gate" />
                  </div>
                  <div>
                    <Label>Code *</Label>
                    <Input value={siteForm.code} onChange={v => setSiteForm(f => ({ ...f, code: v }))} placeholder="e.g. MUM-01" />
                  </div>
                  <div>
                    <Label>Contact Name</Label>
                    <Input value={siteForm.contactName} onChange={v => setSiteForm(f => ({ ...f, contactName: v }))} placeholder="Site Manager Name" />
                  </div>
                  <div>
                    <Label>Contact Phone</Label>
                    <Input value={siteForm.contactPhone} onChange={v => setSiteForm(f => ({ ...f, contactPhone: v }))} placeholder="+91 98765 43210" />
                  </div>
                  <FieldFull>
                    <Label>Address</Label>
                    <Input value={siteForm.address} onChange={v => setSiteForm(f => ({ ...f, address: v }))} placeholder="Full site address" />
                  </FieldFull>
                </FieldGrid>
                <div className="flex gap-3 pt-2">
                  <button className="btn-primary" onClick={saveSite} disabled={siteSaving}>
                    {siteSaving ? 'Saving…' : <><Check size={14} />{siteEdit ? 'Update' : 'Create'}</>}
                  </button>
                  <button className="btn-secondary" onClick={() => setSiteDialog(false)}>Cancel</button>
                </div>
              </div>
            </Modal>
          </>
        )}

        {/* ═══ SALARY COMPONENTS ══════════════════════════════════════════ */}
        {activeTab === 'salary-components' && (
          <>
            <TabPanel title="Salary Components" onAdd={openScAdd}>
              <thead>
                <tr><TH>Name</TH><TH>Code</TH><TH>Type</TH><TH>Calc Type</TH><TH>Value</TH><TH>Taxable</TH><TH></TH></tr>
              </thead>
              <tbody>
                {loadingSC ? <SkeletonRows cols={7} /> :
                  salaryComponents.length === 0 ? <EmptyState label="salary components" /> :
                  salaryComponents.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <TD><span className="font-medium text-white">{s.name}</span></TD>
                      <TD muted>{s.code}</TD>
                      <TD><TypeBadge color={scTypeColor(s.type)}>{s.type}</TypeBadge></TD>
                      <TD muted>{s.calculationType}</TD>
                      <TD muted>{s.value != null ? s.value : '—'}</TD>
                      <TD>
                        {s.isTaxable
                          ? <span className="badge badge-warning">Taxable</span>
                          : <span className="badge badge-neutral">Exempt</span>}
                      </TD>
                      <td className="px-4 py-3.5">
                        <ActionBtn
                          onEdit={() => openScEdit(s)}
                          onDelete={() => setScDeleteId(s.id)}
                          deleteConfirm={scDeleteId === s.id}
                          onDeleteConfirm={() => deleteSc(s.id)}
                          onDeleteCancel={() => setScDeleteId(null)}
                        />
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </TabPanel>
            <Modal open={scDialog} onClose={() => setScDialog(false)} title={scEdit ? 'Edit Salary Component' : 'Add Salary Component'}>
              <div className="space-y-4">
                <FieldGrid>
                  <div>
                    <Label>Name *</Label>
                    <Input value={scForm.name} onChange={v => setScForm(f => ({ ...f, name: v }))} placeholder="e.g. Basic Salary" />
                  </div>
                  <div>
                    <Label>Code *</Label>
                    <Input value={scForm.code} onChange={v => setScForm(f => ({ ...f, code: v }))} placeholder="e.g. BASIC" />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <SelectField value={scForm.type} onChange={v => setScForm(f => ({ ...f, type: v }))}>
                      <option value="">Select type</option>
                      {['EARNING','DEDUCTION','CONTRIBUTION'].map(t => <option key={t} value={t}>{t}</option>)}
                    </SelectField>
                  </div>
                  <div>
                    <Label>Calculation Type</Label>
                    <SelectField value={scForm.calculationType} onChange={v => setScForm(f => ({ ...f, calculationType: v }))}>
                      <option value="">Select calc type</option>
                      {['FIXED','PERCENTAGE','FORMULA'].map(t => <option key={t} value={t}>{t}</option>)}
                    </SelectField>
                  </div>
                  <div>
                    <Label>Value</Label>
                    <Input type="number" value={scForm.value} onChange={v => setScForm(f => ({ ...f, value: Number(v) }))} placeholder="e.g. 50 (for %) or 5000 (fixed)" />
                  </div>
                  <div className="flex items-end pb-1">
                    <CheckboxField label="Taxable" checked={scForm.isTaxable} onChange={v => setScForm(f => ({ ...f, isTaxable: v }))} />
                  </div>
                </FieldGrid>
                <div className="flex gap-3 pt-2">
                  <button className="btn-primary" onClick={saveSc} disabled={scSaving}>
                    {scSaving ? 'Saving…' : <><Check size={14} />{scEdit ? 'Update' : 'Create'}</>}
                  </button>
                  <button className="btn-secondary" onClick={() => setScDialog(false)}>Cancel</button>
                </div>
              </div>
            </Modal>
          </>
        )}

        {/* ═══ FINANCIAL YEARS ════════════════════════════════════════════ */}
        {activeTab === 'financial-years' && (
          <>
            <TabPanel title="Financial Years" onAdd={openFyAdd}>
              <thead>
                <tr><TH>Label</TH><TH>Start Date</TH><TH>End Date</TH><TH>Status</TH><TH>Action</TH><TH></TH></tr>
              </thead>
              <tbody>
                {loadingFY ? <SkeletonRows cols={6} /> :
                  financialYears.length === 0 ? <EmptyState label="financial years" /> :
                  financialYears.map(f => (
                    <tr key={f.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <TD>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{f.label}</span>
                          {f.isCurrent && <span className="badge badge-success">Current</span>}
                        </div>
                      </TD>
                      <TD muted>{fmtDate(f.startDate)}</TD>
                      <TD muted>{fmtDate(f.endDate)}</TD>
                      <TD>
                        {f.isCurrent
                          ? <span className="badge badge-success">Active</span>
                          : <span className="badge badge-neutral">Inactive</span>}
                      </TD>
                      <td className="px-4 py-3.5">
                        {!f.isCurrent && (
                          <button
                            className="btn-secondary text-xs py-1 px-3"
                            onClick={() => setCurrentFY(f.id)}
                            disabled={fySettingCurrent === f.id}
                            style={{ fontSize: 11 }}
                          >
                            {fySettingCurrent === f.id ? 'Setting…' : 'Set as Current'}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button onClick={() => openFyEdit(f)}
                            className="p-1.5 rounded-lg transition-all"
                            style={{ color: 'rgba(255,255,255,0.35)' }}
                            onMouseOver={e => { e.currentTarget.style.color = '#818cf8'; e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; }}
                            onMouseOut={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'transparent'; }}>
                            <Pencil size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </TabPanel>
            <Modal open={fyDialog} onClose={() => setFyDialog(false)} title={fyEdit ? 'Edit Financial Year' : 'Add Financial Year'}>
              <div className="space-y-4">
                <FieldGrid>
                  <FieldFull>
                    <Label>Label *</Label>
                    <Input value={fyForm.label} onChange={v => setFyForm(f => ({ ...f, label: v }))} placeholder="e.g. FY 2025-26" />
                  </FieldFull>
                  <div>
                    <Label>Start Date *</Label>
                    <Input type="date" value={fyForm.startDate ? fyForm.startDate.substring(0, 10) : ''} onChange={v => setFyForm(f => ({ ...f, startDate: v }))} />
                  </div>
                  <div>
                    <Label>End Date *</Label>
                    <Input type="date" value={fyForm.endDate ? fyForm.endDate.substring(0, 10) : ''} onChange={v => setFyForm(f => ({ ...f, endDate: v }))} />
                  </div>
                  <FieldFull>
                    <CheckboxField label="Set as Current Financial Year" checked={fyForm.isCurrent} onChange={v => setFyForm(f => ({ ...f, isCurrent: v }))} />
                  </FieldFull>
                </FieldGrid>
                <div className="flex gap-3 pt-2">
                  <button className="btn-primary" onClick={saveFy} disabled={fySaving}>
                    {fySaving ? 'Saving…' : <><Check size={14} />{fyEdit ? 'Update' : 'Create'}</>}
                  </button>
                  <button className="btn-secondary" onClick={() => setFyDialog(false)}>Cancel</button>
                </div>
              </div>
            </Modal>
          </>
        )}

        {/* ═══ CHART OF ACCOUNTS ══════════════════════════════════════════ */}
        {activeTab === 'accounts' && (
          <>
            <TabPanel title="Chart of Accounts" onAdd={openAccAdd}>
              <thead>
                <tr><TH>Code</TH><TH>Name</TH><TH>Type</TH><TH>Parent</TH><TH>Balance</TH><TH></TH></tr>
              </thead>
              <tbody>
                {loadingAcc ? <SkeletonRows cols={6} /> :
                  accounts.length === 0 ? <EmptyState label="accounts" /> :
                  accounts.map(a => (
                    <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <TD muted>{a.code}</TD>
                      <TD><span className="font-medium text-white">{a.name}</span></TD>
                      <TD><TypeBadge color={accTypeColor(a.type)}>{a.type}</TypeBadge></TD>
                      <TD muted>{a.parent?.name || '—'}</TD>
                      <TD muted>{a.currentBalance != null ? fmtCurrency(a.currentBalance) : a.openingBalance != null ? fmtCurrency(a.openingBalance) : '—'}</TD>
                      <td className="px-4 py-3.5">
                        <ActionBtn
                          onEdit={() => openAccEdit(a)}
                          onDelete={() => setAccDeleteId(a.id)}
                          deleteConfirm={accDeleteId === a.id}
                          onDeleteConfirm={() => deleteAcc(a.id)}
                          onDeleteCancel={() => setAccDeleteId(null)}
                        />
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </TabPanel>
            <Modal open={accDialog} onClose={() => setAccDialog(false)} title={accEdit ? 'Edit Account' : 'Add Account'}>
              <div className="space-y-4">
                <FieldGrid>
                  <div>
                    <Label>Code *</Label>
                    <Input value={accForm.code} onChange={v => setAccForm(f => ({ ...f, code: v }))} placeholder="e.g. 1001" />
                  </div>
                  <div>
                    <Label>Name *</Label>
                    <Input value={accForm.name} onChange={v => setAccForm(f => ({ ...f, name: v }))} placeholder="e.g. Cash in Hand" />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <SelectField value={accForm.type} onChange={v => setAccForm(f => ({ ...f, type: v }))}>
                      <option value="">Select type</option>
                      {['ASSET','LIABILITY','EQUITY','INCOME','EXPENSE'].map(t => <option key={t} value={t}>{t}</option>)}
                    </SelectField>
                  </div>
                  <div>
                    <Label>Parent Account</Label>
                    <SelectField value={accForm.parentId} onChange={v => setAccForm(f => ({ ...f, parentId: v || undefined }))}>
                      <option value="">— None —</option>
                      {accounts.filter(a => a.id !== accEdit?.id).map(a => (
                        <option key={a.id} value={a.id}>{a.code} – {a.name}</option>
                      ))}
                    </SelectField>
                  </div>
                  <div>
                    <Label>Opening Balance</Label>
                    <Input type="number" value={accForm.openingBalance} onChange={v => setAccForm(f => ({ ...f, openingBalance: Number(v) }))} placeholder="0" />
                  </div>
                  <FieldFull>
                    <Label>Description</Label>
                    <Input value={accForm.description} onChange={v => setAccForm(f => ({ ...f, description: v }))} placeholder="Optional description" />
                  </FieldFull>
                </FieldGrid>
                <div className="flex gap-3 pt-2">
                  <button className="btn-primary" onClick={saveAcc} disabled={accSaving}>
                    {accSaving ? 'Saving…' : <><Check size={14} />{accEdit ? 'Update' : 'Create'}</>}
                  </button>
                  <button className="btn-secondary" onClick={() => setAccDialog(false)}>Cancel</button>
                </div>
              </div>
            </Modal>
          </>
        )}

        {/* ═══ BANK ACCOUNTS ══════════════════════════════════════════════ */}
        {activeTab === 'bank-accounts' && (
          <>
            <TabPanel title="Bank Accounts" onAdd={openBaAdd}>
              <thead>
                <tr><TH>Account Name</TH><TH>Account No</TH><TH>Bank Name</TH><TH>IFSC</TH><TH>Type</TH><TH>Balance</TH><TH></TH></tr>
              </thead>
              <tbody>
                {loadingBA ? <SkeletonRows cols={7} /> :
                  bankAccounts.length === 0 ? <EmptyState label="bank accounts" /> :
                  bankAccounts.map(b => (
                    <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <TD><span className="font-medium text-white">{b.accountName}</span></TD>
                      <TD muted>{'••••' + (b.accountNumber?.slice(-4) ?? '')}</TD>
                      <TD muted>{b.bankName}</TD>
                      <TD muted>{b.ifscCode || '—'}</TD>
                      <TD><TypeBadge color="#60a5fa">{b.accountType}</TypeBadge></TD>
                      <TD muted>{b.currentBalance != null ? fmtCurrency(b.currentBalance) : b.openingBalance != null ? fmtCurrency(b.openingBalance) : '—'}</TD>
                      <td className="px-4 py-3.5">
                        <ActionBtn
                          onEdit={() => openBaEdit(b)}
                          onDelete={() => setBaDeleteId(b.id)}
                          deleteConfirm={baDeleteId === b.id}
                          onDeleteConfirm={() => deleteBA(b.id)}
                          onDeleteCancel={() => setBaDeleteId(null)}
                        />
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </TabPanel>
            <Modal open={baDialog} onClose={() => setBaDialog(false)} title={baEdit ? 'Edit Bank Account' : 'Add Bank Account'}>
              <div className="space-y-4">
                <FieldGrid>
                  <FieldFull>
                    <Label>Account Name *</Label>
                    <Input value={baForm.accountName} onChange={v => setBaForm(f => ({ ...f, accountName: v }))} placeholder="e.g. WorkZen Operations Account" />
                  </FieldFull>
                  <div>
                    <Label>Account Number *</Label>
                    <Input value={baForm.accountNumber} onChange={v => setBaForm(f => ({ ...f, accountNumber: v }))} placeholder="e.g. 1234567890" />
                  </div>
                  <div>
                    <Label>Bank Name *</Label>
                    <Input value={baForm.bankName} onChange={v => setBaForm(f => ({ ...f, bankName: v }))} placeholder="e.g. State Bank of India" />
                  </div>
                  <div>
                    <Label>IFSC Code</Label>
                    <Input value={baForm.ifscCode} onChange={v => setBaForm(f => ({ ...f, ifscCode: v }))} placeholder="e.g. SBIN0001234" />
                  </div>
                  <div>
                    <Label>Branch Name</Label>
                    <Input value={baForm.branchName} onChange={v => setBaForm(f => ({ ...f, branchName: v }))} placeholder="e.g. Andheri West" />
                  </div>
                  <div>
                    <Label>Account Type</Label>
                    <SelectField value={baForm.accountType} onChange={v => setBaForm(f => ({ ...f, accountType: v }))}>
                      <option value="">Select type</option>
                      {['CURRENT','SAVINGS','OD','CC'].map(t => <option key={t} value={t}>{t}</option>)}
                    </SelectField>
                  </div>
                  <div>
                    <Label>Opening Balance</Label>
                    <Input type="number" value={baForm.openingBalance} onChange={v => setBaForm(f => ({ ...f, openingBalance: Number(v) }))} placeholder="0" />
                  </div>
                </FieldGrid>
                <div className="flex gap-3 pt-2">
                  <button className="btn-primary" onClick={saveBa} disabled={baSaving}>
                    {baSaving ? 'Saving…' : <><Check size={14} />{baEdit ? 'Update' : 'Create'}</>}
                  </button>
                  <button className="btn-secondary" onClick={() => setBaDialog(false)}>Cancel</button>
                </div>
              </div>
            </Modal>
          </>
        )}

        {/* ═══ COST CENTERS ═══════════════════════════════════════════════════ */}
        {activeTab === 'cost-centers' && (
          <>
            <TabPanel title="Cost Centers" onAdd={openCcAdd}>
              <thead><tr><TH>Name</TH><TH>Code</TH><TH>Description</TH><TH></TH></tr></thead>
              <tbody>
                {loadingCC ? <SkeletonRows cols={4} /> :
                  costCenters.length === 0 ? <EmptyState label="cost centers" /> :
                  costCenters.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <TD><span className="font-medium text-white">{c.name}</span></TD>
                      <TD muted>{c.code || '—'}</TD>
                      <TD muted>{(c.description as string | undefined) || '—'}</TD>
                      <td className="px-4 py-3.5">
                        <ActionBtn onEdit={() => openCcEdit(c)} onDelete={() => setCcDeleteId(c.id)}
                          deleteConfirm={ccDeleteId === c.id} onDeleteConfirm={() => deleteCC(c.id)} onDeleteCancel={() => setCcDeleteId(null)} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </TabPanel>
            <Modal open={ccDialog} onClose={() => setCcDialog(false)} title={ccEdit ? 'Edit Cost Center' : 'Add Cost Center'}>
              <div className="space-y-4">
                <FieldGrid>
                  <div><Label>Name *</Label><Input value={ccForm.name} onChange={v => setCcForm(f => ({ ...f, name: v }))} placeholder="e.g. Operations" /></div>
                  <div><Label>Code</Label><Input value={ccForm.code} onChange={v => setCcForm(f => ({ ...f, code: v }))} placeholder="e.g. CC001" /></div>
                  <FieldFull><Label>Description</Label><Input value={ccForm.description} onChange={v => setCcForm(f => ({ ...f, description: v }))} placeholder="Optional" /></FieldFull>
                </FieldGrid>
                <div className="flex gap-3 pt-2">
                  <button className="btn-primary" onClick={saveCc} disabled={ccSaving}>{ccSaving ? 'Saving…' : <><Check size={14} />{ccEdit ? 'Update' : 'Create'}</>}</button>
                  <button className="btn-secondary" onClick={() => setCcDialog(false)}>Cancel</button>
                </div>
              </div>
            </Modal>
          </>
        )}

        {/* ═══ ZONES ══════════════════════════════════════════════════════════ */}
        {activeTab === 'zones' && (
          <>
            <TabPanel title="Zones" onAdd={openZoneAdd}>
              <thead><tr><TH>Name</TH><TH>Code</TH><TH></TH></tr></thead>
              <tbody>
                {loadingZones ? <SkeletonRows cols={3} /> :
                  zones.length === 0 ? <EmptyState label="zones" /> :
                  zones.map(z => (
                    <tr key={z.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <TD><span className="font-medium text-white">{z.name}</span></TD>
                      <TD muted>{z.code || '—'}</TD>
                      <td className="px-4 py-3.5">
                        <ActionBtn onEdit={() => openZoneEdit(z)} onDelete={() => setZoneDeleteId(z.id)}
                          deleteConfirm={zoneDeleteId === z.id} onDeleteConfirm={() => deleteZone(z.id)} onDeleteCancel={() => setZoneDeleteId(null)} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </TabPanel>
            <Modal open={zoneDialog} onClose={() => setZoneDialog(false)} title={zoneEdit ? 'Edit Zone' : 'Add Zone'}>
              <div className="space-y-4">
                <FieldGrid>
                  <div><Label>Zone Name *</Label><Input value={zoneForm.name} onChange={v => setZoneForm(f => ({ ...f, name: v }))} placeholder="e.g. North Zone" /></div>
                  <div><Label>Code</Label><Input value={zoneForm.code} onChange={v => setZoneForm(f => ({ ...f, code: v }))} placeholder="e.g. NZ" /></div>
                </FieldGrid>
                <div className="flex gap-3 pt-2">
                  <button className="btn-primary" onClick={saveZone} disabled={zoneSaving}>{zoneSaving ? 'Saving…' : <><Check size={14} />{zoneEdit ? 'Update' : 'Create'}</>}</button>
                  <button className="btn-secondary" onClick={() => setZoneDialog(false)}>Cancel</button>
                </div>
              </div>
            </Modal>
          </>
        )}

        {/* ═══ REGIONS ════════════════════════════════════════════════════════ */}
        {activeTab === 'regions' && (
          <>
            <TabPanel title="Regions" onAdd={openRegionAdd}>
              <thead><tr><TH>Name</TH><TH>Code</TH><TH>Zone</TH><TH></TH></tr></thead>
              <tbody>
                {loadingRegions ? <SkeletonRows cols={4} /> :
                  regions.length === 0 ? <EmptyState label="regions" /> :
                  regions.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <TD><span className="font-medium text-white">{r.name}</span></TD>
                      <TD muted>{r.code || '—'}</TD>
                      <TD muted>{r.zone?.name || '—'}</TD>
                      <td className="px-4 py-3.5">
                        <ActionBtn onEdit={() => openRegionEdit(r)} onDelete={() => setRegionDeleteId(r.id)}
                          deleteConfirm={regionDeleteId === r.id} onDeleteConfirm={() => deleteRegion(r.id)} onDeleteCancel={() => setRegionDeleteId(null)} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </TabPanel>
            <Modal open={regionDialog} onClose={() => setRegionDialog(false)} title={regionEdit ? 'Edit Region' : 'Add Region'}>
              <div className="space-y-4">
                <FieldGrid>
                  <div><Label>Region Name *</Label><Input value={regionForm.name} onChange={v => setRegionForm(f => ({ ...f, name: v }))} placeholder="e.g. Delhi NCR" /></div>
                  <div><Label>Code</Label><Input value={regionForm.code} onChange={v => setRegionForm(f => ({ ...f, code: v }))} placeholder="e.g. DLNCR" /></div>
                  <FieldFull>
                    <Label>Zone</Label>
                    <SelectField value={regionForm.zoneId} onChange={v => setRegionForm(f => ({ ...f, zoneId: v || undefined }))}>
                      <option value="">— None —</option>
                      {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </SelectField>
                  </FieldFull>
                </FieldGrid>
                <div className="flex gap-3 pt-2">
                  <button className="btn-primary" onClick={saveRegion} disabled={regionSaving}>{regionSaving ? 'Saving…' : <><Check size={14} />{regionEdit ? 'Update' : 'Create'}</>}</button>
                  <button className="btn-secondary" onClick={() => setRegionDialog(false)}>Cancel</button>
                </div>
              </div>
            </Modal>
          </>
        )}

        {/* ═══ BRANCHES ═══════════════════════════════════════════════════════ */}
        {activeTab === 'branches' && (
          <>
            <TabPanel title="Branches" onAdd={openBranchAdd}>
              <thead><tr><TH>Name</TH><TH>Code</TH><TH>Region</TH><TH>Phone</TH><TH>GSTIN</TH><TH>Status</TH><TH></TH></tr></thead>
              <tbody>
                {loadingBranches ? <SkeletonRows cols={7} /> :
                  branches.length === 0 ? <EmptyState label="branches" /> :
                  branches.map(b => (
                    <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <TD><span className="font-medium text-white">{b.name}</span></TD>
                      <TD muted>{b.code}</TD>
                      <TD muted>{b.region?.name || '—'}</TD>
                      <TD muted>{b.phone || '—'}</TD>
                      <TD muted>{b.gstin || '—'}</TD>
                      <TD><TypeBadge color={b.isActive !== false ? '#10b981' : '#f43f5e'}>{b.isActive !== false ? 'Active' : 'Inactive'}</TypeBadge></TD>
                      <td className="px-4 py-3.5">
                        <ActionBtn onEdit={() => openBranchEdit(b)} onDelete={() => setBranchDeleteId(b.id)}
                          deleteConfirm={branchDeleteId === b.id} onDeleteConfirm={() => deleteBranch(b.id)} onDeleteCancel={() => setBranchDeleteId(null)} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </TabPanel>
            <Modal open={branchDialog} onClose={() => setBranchDialog(false)} title={branchEdit ? 'Edit Branch' : 'Add Branch'}>
              <div className="space-y-4">
                <FieldGrid>
                  <div><Label>Branch Name *</Label><Input value={branchForm.name} onChange={v => setBranchForm(f => ({ ...f, name: v }))} placeholder="e.g. Delhi HQ" /></div>
                  <div><Label>Code *</Label><Input value={branchForm.code} onChange={v => setBranchForm(f => ({ ...f, code: v }))} placeholder="e.g. DEL01" /></div>
                  <FieldFull>
                    <Label>Region</Label>
                    <SelectField value={branchForm.regionId} onChange={v => setBranchForm(f => ({ ...f, regionId: v || undefined }))}>
                      <option value="">— None —</option>
                      {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </SelectField>
                  </FieldFull>
                  <div><Label>Phone</Label><Input value={branchForm.phone} onChange={v => setBranchForm(f => ({ ...f, phone: v }))} placeholder="+91 11 2345 6789" /></div>
                  <div><Label>Email</Label><Input value={branchForm.email} onChange={v => setBranchForm(f => ({ ...f, email: v }))} placeholder="branch@company.com" /></div>
                  <div><Label>GSTIN</Label><Input value={branchForm.gstin} onChange={v => setBranchForm(f => ({ ...f, gstin: v }))} placeholder="27AADCB2230M1ZT" /></div>
                  <div><Label>PAN</Label><Input value={branchForm.pan} onChange={v => setBranchForm(f => ({ ...f, pan: v }))} placeholder="AADCB2230M" /></div>
                </FieldGrid>
                <div className="flex gap-3 pt-2">
                  <button className="btn-primary" onClick={saveBranch} disabled={branchSaving}>{branchSaving ? 'Saving…' : <><Check size={14} />{branchEdit ? 'Update' : 'Create'}</>}</button>
                  <button className="btn-secondary" onClick={() => setBranchDialog(false)}>Cancel</button>
                </div>
              </div>
            </Modal>
          </>
        )}

        {/* ═══ HSN / GST MASTER ═══════════════════════════════════════════════ */}
        {activeTab === 'hsn-gst' && (
          <>
            <TabPanel title="HSN / GST Master" onAdd={openHsnAdd}>
              <thead><tr><TH>HSN Code</TH><TH>Description</TH><TH>Default Tax Rate</TH><TH>Status</TH><TH></TH></tr></thead>
              <tbody>
                {loadingHsn ? <SkeletonRows cols={5} /> :
                  hsnList.length === 0 ? <EmptyState label="HSN entries" /> :
                  hsnList.map(h => (
                    <tr key={h.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <TD><code className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>{h.hsnCode}</code></TD>
                      <TD>{h.description}</TD>
                      <TD><TypeBadge color="#10b981">{Number(h.defaultTaxRate)}%</TypeBadge></TD>
                      <TD><TypeBadge color={h.isActive !== false ? '#10b981' : '#f43f5e'}>{h.isActive !== false ? 'Active' : 'Inactive'}</TypeBadge></TD>
                      <td className="px-4 py-3.5">
                        <ActionBtn onEdit={() => openHsnEdit(h)} onDelete={() => setHsnDeleteId(h.id)}
                          deleteConfirm={hsnDeleteId === h.id} onDeleteConfirm={() => deleteHsn(h.id)} onDeleteCancel={() => setHsnDeleteId(null)} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </TabPanel>
            <Modal open={hsnDialog} onClose={() => setHsnDialog(false)} title={hsnEdit ? 'Edit HSN Entry' : 'Add HSN Entry'}>
              <div className="space-y-4">
                <FieldGrid>
                  <div><Label>HSN Code *</Label><Input value={hsnForm.hsnCode} onChange={v => setHsnForm(f => ({ ...f, hsnCode: v }))} placeholder="e.g. 998311" /></div>
                  <div>
                    <Label>Default Tax Rate (%)</Label>
                    <SelectField value={String(hsnForm.defaultTaxRate ?? 18)} onChange={v => setHsnForm(f => ({ ...f, defaultTaxRate: Number(v) }))}>
                      {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                    </SelectField>
                  </div>
                  <FieldFull><Label>Description *</Label><Input value={hsnForm.description} onChange={v => setHsnForm(f => ({ ...f, description: v }))} placeholder="e.g. Management consulting services" /></FieldFull>
                </FieldGrid>
                <div className="flex gap-3 pt-2">
                  <button className="btn-primary" onClick={saveHsn} disabled={hsnSaving}>{hsnSaving ? 'Saving…' : <><Check size={14} />{hsnEdit ? 'Update' : 'Create'}</>}</button>
                  <button className="btn-secondary" onClick={() => setHsnDialog(false)}>Cancel</button>
                </div>
              </div>
            </Modal>
          </>
        )}

        {/* ═══ RATE MASTER ════════════════════════════════════════════════════ */}
        {activeTab === 'rate-master' && (
          <>
            <TabPanel title="Rate Master" onAdd={openRmAdd}>
              <thead><tr><TH>Rate Type</TH><TH>Amount (₹)</TH><TH>Designation</TH><TH>Effective From</TH><TH>Effective To</TH><TH>Status</TH><TH></TH></tr></thead>
              <tbody>
                {loadingRM ? <SkeletonRows cols={7} /> :
                  rateMasters.length === 0 ? <EmptyState label="rate entries" /> :
                  rateMasters.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <TD><TypeBadge color="#6366f1">{r.rateType}</TypeBadge></TD>
                      <TD><span className="font-semibold">₹{Number(r.amount).toLocaleString('en-IN')}</span></TD>
                      <TD muted>{r.designation?.name || '—'}</TD>
                      <TD muted>{fmtDate(r.effectiveFrom)}</TD>
                      <TD muted>{r.effectiveTo ? fmtDate(r.effectiveTo) : 'Ongoing'}</TD>
                      <TD><TypeBadge color={r.isActive !== false ? '#10b981' : '#f43f5e'}>{r.isActive !== false ? 'Active' : 'Inactive'}</TypeBadge></TD>
                      <td className="px-4 py-3.5">
                        <ActionBtn onEdit={() => openRmEdit(r)} onDelete={() => setRmDeleteId(r.id)}
                          deleteConfirm={rmDeleteId === r.id} onDeleteConfirm={() => deleteRm(r.id)} onDeleteCancel={() => setRmDeleteId(null)} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </TabPanel>
            <Modal open={rmDialog} onClose={() => setRmDialog(false)} title={rmEdit ? 'Edit Rate' : 'Add Rate'}>
              <div className="space-y-4">
                <FieldGrid>
                  <div>
                    <Label>Rate Type *</Label>
                    <SelectField value={rmForm.rateType} onChange={v => setRmForm(f => ({ ...f, rateType: v }))}>
                      <option value="">Select type</option>
                      {['BASIC','OT','HOLIDAY','NIGHT_SHIFT'].map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                    </SelectField>
                  </div>
                  <div><Label>Amount (₹/day) *</Label><Input type="number" value={rmForm.amount} onChange={v => setRmForm(f => ({ ...f, amount: Number(v) }))} placeholder="e.g. 500" /></div>
                  <div>
                    <Label>Designation</Label>
                    <SelectField value={rmForm.designationId} onChange={v => setRmForm(f => ({ ...f, designationId: v || undefined }))}>
                      <option value="">— All Designations —</option>
                      {/* Designations loaded from existing master */}
                    </SelectField>
                  </div>
                  <div><Label>Effective From *</Label><Input type="date" value={rmForm.effectiveFrom} onChange={v => setRmForm(f => ({ ...f, effectiveFrom: v }))} /></div>
                  <div><Label>Effective To</Label><Input type="date" value={rmForm.effectiveTo} onChange={v => setRmForm(f => ({ ...f, effectiveTo: v || undefined }))} /></div>
                  <FieldFull><Label>Notes</Label><Input value={rmForm.notes} onChange={v => setRmForm(f => ({ ...f, notes: v }))} placeholder="Optional notes" /></FieldFull>
                </FieldGrid>
                <div className="flex gap-3 pt-2">
                  <button className="btn-primary" onClick={saveRm} disabled={rmSaving}>{rmSaving ? 'Saving…' : <><Check size={14} />{rmEdit ? 'Update' : 'Create'}</>}</button>
                  <button className="btn-secondary" onClick={() => setRmDialog(false)}>Cancel</button>
                </div>
              </div>
            </Modal>
          </>
        )}

        {/* ═══ ENUM / TYPE CONFIG ═════════════════════════════════════════════ */}
        {activeTab === 'enum-config' && (
          <div className="space-y-8">
            <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
              <Settings2 size={15} style={{ color: '#818cf8', marginTop: 2, flexShrink: 0 }} />
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                These types are defined in the database schema and cannot be added or removed. You can customize their display labels and descriptions here — changes are stored locally and applied across the UI.
              </p>
            </div>
            {ENUM_SECTIONS.map(section => (
              <div key={section.key}>
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: section.color }}>{section.label}</p>
                <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr><TH>Key</TH><TH>Display Label</TH><TH>Description</TH><TH>Status</TH><TH></TH></tr>
                    </thead>
                    <tbody>
                      {section.items.map((item) => {
                        const saved = enumMeta[section.key]?.[item.key];
                        const label = saved?.label ?? item.label;
                        const description = saved?.description ?? item.description;
                        const active = saved?.active ?? true;
                        const isEditing = enumEditing?.section === section.key && enumEditing?.key === item.key;
                        return (
                          <tr key={item.key} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: active ? 1 : 0.45 }}>
                            <td className="px-4 py-3"><code className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>{item.key}</code></td>
                            {isEditing ? (
                              <>
                                <td className="px-4 py-2"><input value={enumDraft.label} onChange={e => setEnumDraft(d => ({ ...d, label: e.target.value }))} className="input-field w-full text-xs" /></td>
                                <td className="px-4 py-2"><input value={enumDraft.description} onChange={e => setEnumDraft(d => ({ ...d, description: e.target.value }))} className="input-field w-full text-xs" /></td>
                                <TD muted>—</TD>
                                <td className="px-4 py-2">
                                  <div className="flex gap-1">
                                    <button onClick={saveEnumEdit} className="p-1.5 rounded-lg" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}><Check size={12} /></button>
                                    <button onClick={() => setEnumEditing(null)} className="p-1.5 rounded-lg" style={{ color: 'rgba(255,255,255,0.3)' }}><X size={12} /></button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <TD>{label}</TD>
                                <TD muted>{description}</TD>
                                <td className="px-4 py-3.5">
                                  <button onClick={() => toggleEnumActive(section.key, item.key)}
                                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                    style={{ background: active ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)', color: active ? '#10b981' : '#f43f5e', border: `1px solid ${active ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}` }}>
                                    {active ? 'Active' : 'Inactive'}
                                  </button>
                                </td>
                                <td className="px-4 py-3.5">
                                  <button onClick={() => startEnumEdit(section.key, item.key, { label, description })} className="p-1.5 rounded-lg transition-all" style={{ color: 'rgba(255,255,255,0.35)' }}
                                    onMouseOver={e => { e.currentTarget.style.color = '#818cf8'; e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; }}
                                    onMouseOut={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'transparent'; }}>
                                    <Pencil size={13} />
                                  </button>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            <div className="flex justify-end">
              <button onClick={() => { setEnumMeta({}); localStorage.removeItem(ENUM_META_KEY); }}
                className="text-xs px-3 py-2 rounded-lg transition-colors hover:bg-white/5"
                style={{ color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.06)' }}>
                Reset all to defaults
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
