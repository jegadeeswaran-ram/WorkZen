'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Pencil, X, Check, AlertTriangle, FileText, UserCheck } from 'lucide-react';
import { employeesApi } from '@/lib/api';
import { formatDate, formatCurrency, getInitials } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type SalaryStruct = {
  id: string;
  effectiveFrom: string;
  basic: number;
  da: number;
  hra: number;
  specialAllowance: number;
  grossSalary: number;
};

type EmpDoc = {
  id: string;
  documentType: string;
  expiryDate?: string;
  isVerified: boolean;
  document?: { name?: string; url?: string };
};

type Promotion = {
  id: string;
  effectiveDate: string;
  fromDesignation?: { name: string };
  toDesignation?: { name: string };
  newBasicSalary?: number;
  incrementAmount?: number;
  incrementPercentage?: number;
  reason?: string;
  status?: string;
};

type Separation = {
  id: string;
  separationType: string;
  resignationDate?: string;
  lastWorkingDate?: string;
  noticePeriodDays: number;
  clearanceStatus: Record<string, boolean>;
  finalSettlementAmount?: number;
  exitRemarks?: string;
};

type Designation = { id: string; name: string };
type Department = { id: string; name: string };

type Employee = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fatherName?: string;
  motherName?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  bloodGroup?: string;
  nationality?: string;
  personalEmail?: string;
  personalPhone: string;
  alternatePhone?: string;
  permanentAddress?: Record<string, unknown>;
  currentAddress?: Record<string, unknown>;
  aadhaarNumber?: string;
  panNumber?: string;
  uanNumber?: string;
  esiNumber?: string;
  drivingLicense?: string;
  drivingLicenseExpiry?: string;
  passportNumber?: string;
  passportExpiry?: string;
  voterIdNumber?: string;
  policeVerificationStatus?: string;
  backgroundVerificationStatus?: string;
  photo?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyRelation?: string;
  joiningDate?: string;
  confirmationDate?: string;
  designationId?: string;
  departmentId?: string;
  branchId?: string;
  employmentType?: string;
  reportingManager?: string;
  status: string;
  lifecycleStatus?: string;
  noticePeriodDays?: number;
  designation?: { name: string };
  department?: { name: string };
  salaryStructures?: SalaryStruct[];
  documents?: EmpDoc[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const LIFECYCLE_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  JOINED:      { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',   label: 'Joined' },
  DEPLOYED:    { color: '#10b981', bg: 'rgba(16,185,129,0.15)',   label: 'Deployed' },
  TRAINING:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',   label: 'Training' },
  TRANSFERRED: { color: '#a855f7', bg: 'rgba(168,85,247,0.15)',   label: 'Transferred' },
  PROMOTED:    { color: '#6366f1', bg: 'rgba(99,102,241,0.15)',   label: 'Promoted' },
  RESIGNED:    { color: '#f97316', bg: 'rgba(249,115,22,0.15)',   label: 'Resigned' },
  TERMINATED:  { color: '#ef4444', bg: 'rgba(239,68,68,0.15)',    label: 'Terminated' },
  ARCHIVED:    { color: '#6b7280', bg: 'rgba(107,114,128,0.15)',  label: 'Archived' },
};

const LIFECYCLE_STATES = ['JOINED', 'TRAINING', 'DEPLOYED', 'TRANSFERRED', 'PROMOTED', 'RESIGNED', 'TERMINATED', 'ARCHIVED'];

const CLEARANCE_DEPTS = ['hr', 'admin', 'it', 'accounts', 'assets', 'operations'];

const SEPARATION_TYPES = ['RESIGNATION', 'TERMINATION', 'RETIREMENT', 'CONTRACT_END', 'ABSCONDING', 'MUTUAL_SEPARATION'];

const TABS = [
  'Personal Details',
  'Govt IDs',
  'Employment',
  'Promotions',
  'Salary Structure',
  'Documents',
  'Exit Management',
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: 'var(--wz-card-bg)',
  border: '1px solid var(--wz-card-border)',
  borderRadius: 12,
  padding: '24px',
};

const inputStyle: React.CSSProperties = {
  background: 'var(--wz-input-bg)',
  border: '1px solid var(--wz-input-border)',
  borderRadius: 8,
  color: 'var(--wz-input-color)',
  padding: '8px 12px',
  width: '100%',
  fontSize: 14,
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  color: 'var(--wz-text-secondary)',
  fontSize: 12,
  marginBottom: 4,
  display: 'block',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const btnPrimary: React.CSSProperties = {
  background: '#6366f1',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '8px 16px',
  fontSize: 14,
  cursor: 'pointer',
  fontWeight: 500,
};

const btnOutline: React.CSSProperties = {
  background: 'transparent',
  color: 'rgba(255,255,255,0.7)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  padding: '8px 16px',
  fontSize: 14,
  cursor: 'pointer',
};

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function ReadValue({ value }: { value?: string | number | null }) {
  return (
    <span style={{ color: value ? '#fff' : 'rgba(255,255,255,0.25)', fontSize: 14 }}>
      {value ?? '—'}
    </span>
  );
}

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ background: bg, color, fontSize: 12, fontWeight: 600, borderRadius: 6, padding: '3px 10px', display: 'inline-block' }}>
      {label}
    </span>
  );
}

function SkeletonRow() {
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ flex: 1, height: 40, background: 'rgba(255,255,255,0.04)', borderRadius: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  );
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: type === 'success' ? 'rgba(16,185,129,0.9)' : 'rgba(239,68,68,0.9)',
      color: '#fff', borderRadius: 10, padding: '12px 20px',
      display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      {type === 'success' ? <Check size={16} /> : <X size={16} />}
      <span style={{ fontSize: 14 }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: 8 }}>
        <X size={14} />
      </button>
    </div>
  );
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ ...cardStyle, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ color: '#fff', margin: 0, fontSize: 18 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EmployeeProfilePage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params?.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Personal Details');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Promotions & Separation state
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [separation, setSeparation] = useState<Separation | null>(null);

  // Masters
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Dialog visibility
  const [showGovtEditDialog, setShowGovtEditDialog] = useState(false);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [showSeparationDialog, setShowSeparationDialog] = useState(false);
  const [showLifecycleDialog, setShowLifecycleDialog] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadEmployee = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const data = await employeesApi.get(employeeId);
      setEmployee(data);
    } catch {
      showToast('Failed to load employee', 'error');
    } finally {
      setLoading(false);
    }
  }, [employeeId, showToast]);

  const loadExtras = useCallback(async () => {
    if (!employeeId) return;
    try {
      const [promoData, desigsData, deptsData] = await Promise.allSettled([
        employeesApi.promotions(employeeId),
        employeesApi.designations(),
        employeesApi.departments(),
      ]);
      if (promoData.status === 'fulfilled') {
        const raw = promoData.value;
        setPromotions(Array.isArray(raw) ? raw : (raw?.data ?? []));
      }
      if (desigsData.status === 'fulfilled') {
        const raw = desigsData.value;
        setDesignations(Array.isArray(raw) ? raw : (raw?.data ?? []));
      }
      if (deptsData.status === 'fulfilled') {
        const raw = deptsData.value;
        setDepartments(Array.isArray(raw) ? raw : (raw?.data ?? []));
      }
    } catch {
      // silently skip non-critical extras
    }
    try {
      const sep = await employeesApi.getSeparation(employeeId);
      setSeparation(sep ?? null);
    } catch {
      setSeparation(null);
    }
  }, [employeeId]);

  useEffect(() => {
    loadEmployee();
    loadExtras();
  }, [loadEmployee, loadExtras]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--wz-page-bg)', padding: '32px 40px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 32 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div style={{ width: 200, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.04)' }} />
        </div>
        <div style={{ ...cardStyle, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ width: 220, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.06)', marginBottom: 12 }} />
              <div style={{ width: 140, height: 18, borderRadius: 6, background: 'rgba(255,255,255,0.04)' }} />
            </div>
          </div>
        </div>
        <div style={cardStyle}>
          {[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--wz-page-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
          <p>Employee not found.</p>
          <button onClick={() => router.back()} style={{ ...btnPrimary, marginTop: 12 }}>Go Back</button>
        </div>
      </div>
    );
  }

  const lcStatus = employee.lifecycleStatus ?? 'JOINED';
  const lcConfig = LIFECYCLE_CONFIG[lcStatus] ?? { color: '#6b7280', bg: 'rgba(107,114,128,0.15)', label: lcStatus };
  const initials = getInitials(employee.firstName, employee.lastName);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--wz-page-bg)', padding: '32px 40px', color: 'var(--wz-text-primary)' }}>
      <style>{`
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        input::placeholder, textarea::placeholder { color: var(--wz-text-muted); }
        select option { background: var(--wz-card-bg); color: var(--wz-text-primary); }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: var(--wz-card-border); }
        ::-webkit-scrollbar-thumb { background: var(--wz-text-muted); border-radius: 4px; }
      `}</style>

      {/* Top Back */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>Employees</span>
        <span style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>{employee.firstName} {employee.lastName}</span>
      </div>

      {/* Header Card */}
      <div style={{ ...cardStyle, marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
        {/* Avatar */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: employee.photo ? 'transparent' : 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 700, color: '#fff', flexShrink: 0,
          overflow: 'hidden',
        }}>
          {employee.photo
            ? <img src={employee.photo} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initials
          }
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
              {employee.firstName} {employee.lastName}
            </h1>
            <span style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1', fontSize: 12, fontWeight: 700, borderRadius: 6, padding: '2px 10px' }}>
              {employee.employeeCode}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
            {employee.designation && (
              <span style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', fontSize: 13, borderRadius: 6, padding: '3px 10px' }}>
                {employee.designation.name}
              </span>
            )}
            {employee.department && (
              <span style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', fontSize: 13, borderRadius: 6, padding: '3px 10px' }}>
                {employee.department.name}
              </span>
            )}
            <Badge label={lcConfig.label} color={lcConfig.color} bg={lcConfig.bg} />
          </div>
          <div style={{ display: 'flex', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
            <span>Joined {formatDate(employee.joiningDate)}</span>
            {employee.personalPhone && <><span>·</span><span>{employee.personalPhone}</span></>}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowLifecycleDialog(true)}
            style={{ ...btnOutline, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <UserCheck size={15} /> Status
          </button>
          <button
            onClick={() => setActiveTab('Personal Details')}
            style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Pencil size={15} /> Edit Profile
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 0 }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === tab ? '#6366f1' : 'rgba(255,255,255,0.45)',
              fontSize: 14, fontWeight: activeTab === tab ? 600 : 400,
              padding: '10px 16px',
              borderBottom: activeTab === tab ? '2px solid #6366f1' : '2px solid transparent',
              marginBottom: -1,
              whiteSpace: 'nowrap',
              transition: 'color 0.15s',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'Personal Details' && (
          <PersonalTab employee={employee} onSaved={(updated) => { setEmployee(updated); showToast('Personal details saved', 'success'); }} showToast={showToast} />
        )}
        {activeTab === 'Govt IDs' && (
          <GovtIdsTab
            employee={employee}
            showDialog={showGovtEditDialog}
            setShowDialog={setShowGovtEditDialog}
            onSaved={(updated) => { setEmployee(updated); showToast('Govt IDs updated', 'success'); }}
            showToast={showToast}
          />
        )}
        {activeTab === 'Employment' && (
          <EmploymentTab
            employee={employee}
            designations={designations}
            departments={departments}
            onSaved={(updated) => { setEmployee(updated); showToast('Employment details saved', 'success'); }}
            onLifecycle={() => setShowLifecycleDialog(true)}
            showToast={showToast}
          />
        )}
        {activeTab === 'Promotions' && (
          <PromotionsTab
            employee={employee}
            promotions={promotions}
            designations={designations}
            showDialog={showPromotionDialog}
            setShowDialog={setShowPromotionDialog}
            onCreated={(p) => { setPromotions((prev) => [p, ...prev]); showToast('Promotion recorded', 'success'); }}
            showToast={showToast}
          />
        )}
        {activeTab === 'Salary Structure' && (
          <SalaryTab structures={employee.salaryStructures ?? []} />
        )}
        {activeTab === 'Documents' && (
          <DocumentsTab docs={employee.documents ?? []} />
        )}
        {activeTab === 'Exit Management' && (
          <ExitTab
            employee={employee}
            separation={separation}
            showDialog={showSeparationDialog}
            setShowDialog={setShowSeparationDialog}
            onInitiated={(sep) => { setSeparation(sep); showToast('Separation initiated', 'success'); }}
            onClearanceUpdate={(updated) => { setSeparation(updated); showToast('Clearance updated', 'success'); }}
            showToast={showToast}
          />
        )}
      </div>

      {/* Lifecycle Dialog */}
      {showLifecycleDialog && (
        <LifecycleDialog
          current={employee.lifecycleStatus ?? 'JOINED'}
          employeeId={employee.id}
          onClose={() => setShowLifecycleDialog(false)}
          onUpdated={(lc) => { setEmployee((e) => e ? { ...e, lifecycleStatus: lc } : e); showToast(`Status updated to ${lc}`, 'success'); setShowLifecycleDialog(false); }}
          showToast={showToast}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ─── Personal Details Tab ─────────────────────────────────────────────────────

function PersonalTab({ employee, onSaved, showToast }: {
  employee: Employee;
  onSaved: (e: Employee) => void;
  showToast: (m: string, t: 'success' | 'error') => void;
}) {
  const [form, setForm] = useState({
    firstName: employee.firstName ?? '',
    lastName: employee.lastName ?? '',
    fatherName: employee.fatherName ?? '',
    motherName: employee.motherName ?? '',
    dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.split('T')[0] : '',
    gender: employee.gender ?? '',
    maritalStatus: employee.maritalStatus ?? '',
    bloodGroup: employee.bloodGroup ?? '',
    nationality: employee.nationality ?? '',
    personalPhone: employee.personalPhone ?? '',
    alternatePhone: employee.alternatePhone ?? '',
    personalEmail: employee.personalEmail ?? '',
    emergencyContactName: employee.emergencyContactName ?? '',
    emergencyContactPhone: employee.emergencyContactPhone ?? '',
    emergencyRelation: employee.emergencyRelation ?? '',
    currentAddressLine: (employee.currentAddress as Record<string, string>)?.line ?? '',
    permanentAddressLine: (employee.permanentAddress as Record<string, string>)?.line ?? '',
  });
  const [saving, setSaving] = useState(false);

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await employeesApi.update(employee.id, {
        firstName: form.firstName,
        lastName: form.lastName,
        fatherName: form.fatherName || undefined,
        motherName: form.motherName || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        maritalStatus: form.maritalStatus || undefined,
        bloodGroup: form.bloodGroup || undefined,
        nationality: form.nationality || undefined,
        personalPhone: form.personalPhone,
        alternatePhone: form.alternatePhone || undefined,
        personalEmail: form.personalEmail || undefined,
        emergencyContactName: form.emergencyContactName || undefined,
        emergencyContactPhone: form.emergencyContactPhone || undefined,
        emergencyRelation: form.emergencyRelation || undefined,
        currentAddress: form.currentAddressLine ? { line: form.currentAddressLine } : undefined,
        permanentAddress: form.permanentAddressLine ? { line: form.permanentAddressLine } : undefined,
      });
      onSaved(updated);
    } catch {
      showToast('Failed to save personal details', 'error');
    } finally {
      setSaving(false);
    }
  };

  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={cardStyle}>
        <h3 style={{ color: '#fff', margin: '0 0 20px', fontSize: 15, fontWeight: 600 }}>Basic Information</h3>
        <div style={{ ...grid2, marginBottom: 16 }}>
          <FieldRow label="First Name *">
            <input style={inputStyle} value={form.firstName} onChange={f('firstName')} placeholder="First name" />
          </FieldRow>
          <FieldRow label="Last Name *">
            <input style={inputStyle} value={form.lastName} onChange={f('lastName')} placeholder="Last name" />
          </FieldRow>
        </div>
        <div style={{ ...grid2, marginBottom: 16 }}>
          <FieldRow label="Father's Name">
            <input style={inputStyle} value={form.fatherName} onChange={f('fatherName')} placeholder="Father's name" />
          </FieldRow>
          <FieldRow label="Mother's Name">
            <input style={inputStyle} value={form.motherName} onChange={f('motherName')} placeholder="Mother's name" />
          </FieldRow>
        </div>
        <div style={{ ...grid2, marginBottom: 16 }}>
          <FieldRow label="Date of Birth">
            <input style={inputStyle} type="date" value={form.dateOfBirth} onChange={f('dateOfBirth')} />
          </FieldRow>
          <FieldRow label="Gender">
            <select style={inputStyle} value={form.gender} onChange={f('gender')}>
              <option value="">Select gender</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </FieldRow>
        </div>
        <div style={{ ...grid2, marginBottom: 16 }}>
          <FieldRow label="Marital Status">
            <select style={inputStyle} value={form.maritalStatus} onChange={f('maritalStatus')}>
              <option value="">Select status</option>
              <option value="SINGLE">Single</option>
              <option value="MARRIED">Married</option>
              <option value="DIVORCED">Divorced</option>
              <option value="WIDOWED">Widowed</option>
            </select>
          </FieldRow>
          <FieldRow label="Blood Group">
            <select style={inputStyle} value={form.bloodGroup} onChange={f('bloodGroup')}>
              <option value="">Select blood group</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </FieldRow>
        </div>
        <FieldRow label="Nationality">
          <input style={inputStyle} value={form.nationality} onChange={f('nationality')} placeholder="e.g. Indian" />
        </FieldRow>
      </div>

      <div style={cardStyle}>
        <h3 style={{ color: '#fff', margin: '0 0 20px', fontSize: 15, fontWeight: 600 }}>Contact Details</h3>
        <div style={{ ...grid2, marginBottom: 16 }}>
          <FieldRow label="Personal Phone *">
            <input style={inputStyle} value={form.personalPhone} onChange={f('personalPhone')} placeholder="+91 XXXXX XXXXX" />
          </FieldRow>
          <FieldRow label="Alternate Phone">
            <input style={inputStyle} value={form.alternatePhone} onChange={f('alternatePhone')} placeholder="Alternate number" />
          </FieldRow>
        </div>
        <FieldRow label="Personal Email">
          <input style={inputStyle} type="email" value={form.personalEmail} onChange={f('personalEmail')} placeholder="personal@email.com" />
        </FieldRow>
      </div>

      <div style={cardStyle}>
        <h3 style={{ color: '#fff', margin: '0 0 20px', fontSize: 15, fontWeight: 600 }}>Address</h3>
        <div style={{ marginBottom: 16 }}>
          <FieldRow label="Current Address">
            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.currentAddressLine} onChange={f('currentAddressLine')} placeholder="Current residential address" />
          </FieldRow>
        </div>
        <FieldRow label="Permanent Address">
          <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.permanentAddressLine} onChange={f('permanentAddressLine')} placeholder="Permanent address" />
        </FieldRow>
      </div>

      <div style={cardStyle}>
        <h3 style={{ color: '#fff', margin: '0 0 20px', fontSize: 15, fontWeight: 600 }}>Emergency Contact</h3>
        <div style={{ ...grid2, marginBottom: 16 }}>
          <FieldRow label="Contact Name">
            <input style={inputStyle} value={form.emergencyContactName} onChange={f('emergencyContactName')} placeholder="Emergency contact name" />
          </FieldRow>
          <FieldRow label="Contact Phone">
            <input style={inputStyle} value={form.emergencyContactPhone} onChange={f('emergencyContactPhone')} placeholder="Emergency phone" />
          </FieldRow>
        </div>
        <FieldRow label="Relationship">
          <input style={inputStyle} value={form.emergencyRelation} onChange={f('emergencyRelation')} placeholder="e.g. Spouse, Parent" />
        </FieldRow>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button style={btnPrimary} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ─── Govt IDs Tab ─────────────────────────────────────────────────────────────

function maskAadhaar(v?: string) {
  if (!v) return '—';
  const clean = v.replace(/\D/g, '');
  if (clean.length < 4) return v;
  return `XXXX-XXXX-${clean.slice(-4)}`;
}

function GovtIdsTab({ employee, showDialog, setShowDialog, onSaved, showToast }: {
  employee: Employee;
  showDialog: boolean;
  setShowDialog: (v: boolean) => void;
  onSaved: (e: Employee) => void;
  showToast: (m: string, t: 'success' | 'error') => void;
}) {
  const [form, setForm] = useState({
    aadhaarNumber: employee.aadhaarNumber ?? '',
    panNumber: employee.panNumber ?? '',
    uanNumber: employee.uanNumber ?? '',
    esiNumber: employee.esiNumber ?? '',
    drivingLicense: employee.drivingLicense ?? '',
    drivingLicenseExpiry: employee.drivingLicenseExpiry ? employee.drivingLicenseExpiry.split('T')[0] : '',
    passportNumber: employee.passportNumber ?? '',
    passportExpiry: employee.passportExpiry ? employee.passportExpiry.split('T')[0] : '',
    voterIdNumber: employee.voterIdNumber ?? '',
    policeVerificationStatus: employee.policeVerificationStatus ?? 'NOT_DONE',
    backgroundVerificationStatus: employee.backgroundVerificationStatus ?? 'NOT_DONE',
  });
  const [saving, setSaving] = useState(false);

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await employeesApi.update(employee.id, {
        aadhaarNumber: form.aadhaarNumber || undefined,
        panNumber: form.panNumber || undefined,
        uanNumber: form.uanNumber || undefined,
        esiNumber: form.esiNumber || undefined,
        drivingLicense: form.drivingLicense || undefined,
        drivingLicenseExpiry: form.drivingLicenseExpiry || undefined,
        passportNumber: form.passportNumber || undefined,
        passportExpiry: form.passportExpiry || undefined,
        voterIdNumber: form.voterIdNumber || undefined,
        policeVerificationStatus: form.policeVerificationStatus || undefined,
        backgroundVerificationStatus: form.backgroundVerificationStatus || undefined,
      });
      onSaved(updated);
      setShowDialog(false);
    } catch {
      showToast('Failed to update Govt IDs', 'error');
    } finally {
      setSaving(false);
    }
  };

  const verifBadge = (status?: string) => {
    const map: Record<string, { color: string; bg: string }> = {
      NOT_DONE: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
      PENDING:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
      COMPLETED:{ color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    };
    const cfg = map[status ?? 'NOT_DONE'] ?? map['NOT_DONE'];
    return <Badge label={status ?? 'NOT_DONE'} color={cfg.color} bg={cfg.bg} />;
  };

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>{label}</span>
      <span style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>{value}</span>
    </div>
  );

  return (
    <div>
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ color: '#fff', margin: 0, fontSize: 15, fontWeight: 600 }}>Government Identity Documents</h3>
          <button onClick={() => setShowDialog(true)} style={{ ...btnOutline, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Pencil size={14} /> Edit
          </button>
        </div>
        <Row label="Aadhaar Number" value={maskAadhaar(employee.aadhaarNumber)} />
        <Row label="PAN Number" value={employee.panNumber ?? '—'} />
        <Row label="UAN Number" value={employee.uanNumber ?? '—'} />
        <Row label="ESIC Number" value={employee.esiNumber ?? '—'} />
        <Row label="Driving License" value={
          <span>{employee.drivingLicense ?? '—'}{employee.drivingLicenseExpiry && <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginLeft: 8 }}>Exp: {formatDate(employee.drivingLicenseExpiry)}</span>}</span>
        } />
        <Row label="Passport" value={
          <span>{employee.passportNumber ?? '—'}{employee.passportExpiry && <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginLeft: 8 }}>Exp: {formatDate(employee.passportExpiry)}</span>}</span>
        } />
        <Row label="Voter ID" value={employee.voterIdNumber ?? '—'} />
        <Row label="Police Verification" value={verifBadge(employee.policeVerificationStatus)} />
        <Row label="Background Verification" value={verifBadge(employee.backgroundVerificationStatus)} />
      </div>

      {showDialog && (
        <Dialog title="Edit Government IDs" onClose={() => setShowDialog(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FieldRow label="Aadhaar Number">
              <input style={inputStyle} value={form.aadhaarNumber} onChange={f('aadhaarNumber')} placeholder="XXXX XXXX XXXX" maxLength={14} />
            </FieldRow>
            <FieldRow label="PAN Number">
              <input style={inputStyle} value={form.panNumber} onChange={f('panNumber')} placeholder="ABCDE1234F" maxLength={10} />
            </FieldRow>
            <FieldRow label="UAN Number">
              <input style={inputStyle} value={form.uanNumber} onChange={f('uanNumber')} placeholder="UAN Number" />
            </FieldRow>
            <FieldRow label="ESIC Number">
              <input style={inputStyle} value={form.esiNumber} onChange={f('esiNumber')} placeholder="ESIC Number" />
            </FieldRow>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FieldRow label="Driving License No.">
                <input style={inputStyle} value={form.drivingLicense} onChange={f('drivingLicense')} placeholder="License number" />
              </FieldRow>
              <FieldRow label="DL Expiry">
                <input style={inputStyle} type="date" value={form.drivingLicenseExpiry} onChange={f('drivingLicenseExpiry')} />
              </FieldRow>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FieldRow label="Passport No.">
                <input style={inputStyle} value={form.passportNumber} onChange={f('passportNumber')} placeholder="Passport number" />
              </FieldRow>
              <FieldRow label="Passport Expiry">
                <input style={inputStyle} type="date" value={form.passportExpiry} onChange={f('passportExpiry')} />
              </FieldRow>
            </div>
            <FieldRow label="Voter ID">
              <input style={inputStyle} value={form.voterIdNumber} onChange={f('voterIdNumber')} placeholder="Voter ID number" />
            </FieldRow>
            <FieldRow label="Police Verification">
              <select style={inputStyle} value={form.policeVerificationStatus} onChange={f('policeVerificationStatus')}>
                <option value="NOT_DONE">Not Done</option>
                <option value="PENDING">Pending</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </FieldRow>
            <FieldRow label="Background Verification">
              <select style={inputStyle} value={form.backgroundVerificationStatus} onChange={f('backgroundVerificationStatus')}>
                <option value="NOT_DONE">Not Done</option>
                <option value="PENDING">Pending</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </FieldRow>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button style={btnOutline} onClick={() => setShowDialog(false)}>Cancel</button>
              <button style={btnPrimary} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

// ─── Employment Tab ───────────────────────────────────────────────────────────

function EmploymentTab({ employee, designations, departments, onSaved, onLifecycle, showToast }: {
  employee: Employee;
  designations: Designation[];
  departments: Department[];
  onSaved: (e: Employee) => void;
  onLifecycle: () => void;
  showToast: (m: string, t: 'success' | 'error') => void;
}) {
  const [form, setForm] = useState({
    employmentType: employee.employmentType ?? '',
    joiningDate: employee.joiningDate ? employee.joiningDate.split('T')[0] : '',
    confirmationDate: employee.confirmationDate ? employee.confirmationDate.split('T')[0] : '',
    designationId: employee.designationId ?? '',
    departmentId: employee.departmentId ?? '',
    reportingManager: employee.reportingManager ?? '',
    noticePeriodDays: employee.noticePeriodDays?.toString() ?? '',
  });
  const [saving, setSaving] = useState(false);

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await employeesApi.update(employee.id, {
        employmentType: form.employmentType || undefined,
        joiningDate: form.joiningDate || undefined,
        confirmationDate: form.confirmationDate || undefined,
        designationId: form.designationId || undefined,
        departmentId: form.departmentId || undefined,
        reportingManager: form.reportingManager || undefined,
        noticePeriodDays: form.noticePeriodDays ? parseInt(form.noticePeriodDays) : undefined,
      });
      onSaved(updated);
    } catch {
      showToast('Failed to save employment details', 'error');
    } finally {
      setSaving(false);
    }
  };

  const lcStatus = employee.lifecycleStatus ?? 'JOINED';
  const lcConfig = LIFECYCLE_CONFIG[lcStatus] ?? { color: '#6b7280', bg: 'rgba(107,114,128,0.15)', label: lcStatus };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ color: '#fff', margin: 0, fontSize: 15, fontWeight: 600 }}>Employment Details</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Lifecycle:</span>
            <Badge label={lcConfig.label} color={lcConfig.color} bg={lcConfig.bg} />
            <button onClick={onLifecycle} style={{ ...btnOutline, fontSize: 12, padding: '5px 10px' }}>Update Status</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <FieldRow label="Employment Type">
            <select style={inputStyle} value={form.employmentType} onChange={f('employmentType')}>
              <option value="">Select type</option>
              <option value="PERMANENT">Permanent</option>
              <option value="CONTRACT">Contract</option>
              <option value="TEMPORARY">Temporary</option>
              <option value="TRAINEE">Trainee</option>
              <option value="APPRENTICE">Apprentice</option>
            </select>
          </FieldRow>
          <FieldRow label="Notice Period (Days)">
            <input style={inputStyle} type="number" value={form.noticePeriodDays} onChange={f('noticePeriodDays')} placeholder="e.g. 30" min={0} />
          </FieldRow>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <FieldRow label="Joining Date">
            <input style={inputStyle} type="date" value={form.joiningDate} onChange={f('joiningDate')} />
          </FieldRow>
          <FieldRow label="Confirmation Date">
            <input style={inputStyle} type="date" value={form.confirmationDate} onChange={f('confirmationDate')} />
          </FieldRow>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <FieldRow label="Designation">
            <select style={inputStyle} value={form.designationId} onChange={f('designationId')}>
              <option value="">Select designation</option>
              {designations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </FieldRow>
          <FieldRow label="Department">
            <select style={inputStyle} value={form.departmentId} onChange={f('departmentId')}>
              <option value="">Select department</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </FieldRow>
        </div>
        <FieldRow label="Reporting Manager">
          <input style={inputStyle} value={form.reportingManager} onChange={f('reportingManager')} placeholder="Manager name or employee code" />
        </FieldRow>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button style={btnPrimary} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ─── Promotions Tab ───────────────────────────────────────────────────────────

function PromotionsTab({ employee, promotions, designations, showDialog, setShowDialog, onCreated, showToast }: {
  employee: Employee;
  promotions: Promotion[];
  designations: Designation[];
  showDialog: boolean;
  setShowDialog: (v: boolean) => void;
  onCreated: (p: Promotion) => void;
  showToast: (m: string, t: 'success' | 'error') => void;
}) {
  const [form, setForm] = useState({
    toDesignationId: '',
    effectiveDate: '',
    newBasicSalary: '',
    incrementAmount: '',
    incrementPercentage: '',
    reason: '',
  });
  const [saving, setSaving] = useState(false);

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleCreate = async () => {
    if (!form.toDesignationId || !form.effectiveDate) {
      showToast('Designation and effective date are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const created = await employeesApi.createPromotion({
        employeeId: employee.id,
        toDesignationId: form.toDesignationId,
        effectiveDate: form.effectiveDate,
        newBasicSalary: form.newBasicSalary ? parseFloat(form.newBasicSalary) : undefined,
        incrementAmount: form.incrementAmount ? parseFloat(form.incrementAmount) : undefined,
        incrementPercentage: form.incrementPercentage ? parseFloat(form.incrementPercentage) : undefined,
        reason: form.reason || undefined,
      });
      onCreated(created);
      setShowDialog(false);
      setForm({ toDesignationId: '', effectiveDate: '', newBasicSalary: '', incrementAmount: '', incrementPercentage: '', reason: '' });
    } catch {
      showToast('Failed to record promotion', 'error');
    } finally {
      setSaving(false);
    }
  };

  const sorted = [...promotions].sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());

  return (
    <div>
      <div style={{ ...cardStyle }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ color: '#fff', margin: 0, fontSize: 15, fontWeight: 600 }}>Promotion History</h3>
          <button style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowDialog(true)}>
            + Record Promotion
          </button>
        </div>

        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.25)' }}>
            No promotions recorded yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  {['Effective Date', 'From', 'To', 'New Basic', 'Increment', 'Reason', 'Status'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, borderBottom: '1px solid rgba(255,255,255,0.07)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px', color: '#fff' }}>{formatDate(p.effectiveDate)}</td>
                    <td style={{ padding: '12px', color: 'rgba(255,255,255,0.6)' }}>{p.fromDesignation?.name ?? '—'}</td>
                    <td style={{ padding: '12px', color: '#10b981', fontWeight: 500 }}>{p.toDesignation?.name ?? '—'}</td>
                    <td style={{ padding: '12px', color: 'rgba(255,255,255,0.7)' }}>{p.newBasicSalary ? formatCurrency(p.newBasicSalary) : '—'}</td>
                    <td style={{ padding: '12px', color: 'rgba(255,255,255,0.7)' }}>
                      {p.incrementAmount ? formatCurrency(p.incrementAmount) : p.incrementPercentage ? `${p.incrementPercentage}%` : '—'}
                    </td>
                    <td style={{ padding: '12px', color: 'rgba(255,255,255,0.5)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.reason ?? '—'}</td>
                    <td style={{ padding: '12px' }}>
                      {p.status && <Badge label={p.status} color={p.status === 'APPROVED' ? '#10b981' : p.status === 'PENDING' ? '#f59e0b' : '#6b7280'} bg={p.status === 'APPROVED' ? 'rgba(16,185,129,0.12)' : p.status === 'PENDING' ? 'rgba(245,158,11,0.12)' : 'rgba(107,114,128,0.12)'} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDialog && (
        <Dialog title="Record Promotion" onClose={() => setShowDialog(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FieldRow label="To Designation *">
              <select style={inputStyle} value={form.toDesignationId} onChange={f('toDesignationId')}>
                <option value="">Select designation</option>
                {designations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="Effective Date *">
              <input style={inputStyle} type="date" value={form.effectiveDate} onChange={f('effectiveDate')} />
            </FieldRow>
            <FieldRow label="New Basic Salary (₹)">
              <input style={inputStyle} type="number" value={form.newBasicSalary} onChange={f('newBasicSalary')} placeholder="e.g. 25000" min={0} />
            </FieldRow>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FieldRow label="Increment Amount (₹)">
                <input style={inputStyle} type="number" value={form.incrementAmount} onChange={f('incrementAmount')} placeholder="e.g. 2000" min={0} />
              </FieldRow>
              <FieldRow label="Increment %">
                <input style={inputStyle} type="number" value={form.incrementPercentage} onChange={f('incrementPercentage')} placeholder="e.g. 10" min={0} max={100} />
              </FieldRow>
            </div>
            <FieldRow label="Reason">
              <textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }} value={form.reason} onChange={f('reason')} placeholder="Promotion reason / remarks" />
            </FieldRow>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button style={btnOutline} onClick={() => setShowDialog(false)}>Cancel</button>
              <button style={btnPrimary} onClick={handleCreate} disabled={saving}>
                {saving ? 'Saving…' : 'Record Promotion'}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

// ─── Salary Structure Tab ─────────────────────────────────────────────────────

function SalaryTab({ structures }: { structures: SalaryStruct[] }) {
  const sorted = [...structures].sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ color: '#fff', margin: 0, fontSize: 15, fontWeight: 600 }}>Salary Structures</h3>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <FileText size={14} /> Edit via Payroll module
        </span>
      </div>
      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.25)' }}>
          No salary structures found.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                {['Effective From', 'Basic', 'DA', 'HRA', 'Special', 'Gross'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => (
                <tr key={s.id} style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: i === 0 ? 'rgba(99,102,241,0.06)' : 'transparent',
                }}>
                  <td style={{ padding: '12px', color: '#fff', fontWeight: i === 0 ? 600 : 400 }}>
                    {formatDate(s.effectiveFrom)}
                    {i === 0 && <span style={{ marginLeft: 8, background: 'rgba(99,102,241,0.2)', color: '#6366f1', fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '2px 6px' }}>LATEST</span>}
                  </td>
                  <td style={{ padding: '12px', color: 'rgba(255,255,255,0.8)' }}>{formatCurrency(s.basic)}</td>
                  <td style={{ padding: '12px', color: 'rgba(255,255,255,0.7)' }}>{formatCurrency(s.da)}</td>
                  <td style={{ padding: '12px', color: 'rgba(255,255,255,0.7)' }}>{formatCurrency(s.hra)}</td>
                  <td style={{ padding: '12px', color: 'rgba(255,255,255,0.7)' }}>{formatCurrency(s.specialAllowance)}</td>
                  <td style={{ padding: '12px', color: '#10b981', fontWeight: 600 }}>{formatCurrency(s.grossSalary)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Documents Tab ────────────────────────────────────────────────────────────

function DocumentsTab({ docs }: { docs: EmpDoc[] }) {
  const DOC_TYPE_COLORS: Record<string, string> = {
    AADHAAR: '#6366f1', PAN: '#10b981', PASSPORT: '#3b82f6',
    DRIVING_LICENSE: '#f59e0b', EDUCATIONAL: '#a855f7', EXPERIENCE: '#ec4899',
    OFFER_LETTER: '#14b8a6', OTHER: '#6b7280',
  };

  const isExpiringSoon = (date?: string) => {
    if (!date) return false;
    const diff = new Date(date).getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  };

  const isExpired = (date?: string) => {
    if (!date) return false;
    return new Date(date).getTime() < Date.now();
  };

  return (
    <div style={cardStyle}>
      <h3 style={{ color: '#fff', margin: '0 0 20px', fontSize: 15, fontWeight: 600 }}>Employee Documents</h3>
      {docs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.25)' }}>
          No documents uploaded yet.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                {['Type', 'Name / ID', 'Expiry', 'Verified', 'Actions'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => {
                const expiring = isExpiringSoon(doc.expiryDate);
                const expired = isExpired(doc.expiryDate);
                const typeColor = DOC_TYPE_COLORS[doc.documentType] ?? '#6b7280';
                return (
                  <tr key={doc.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px' }}>
                      <span style={{ background: `${typeColor}20`, color: typeColor, fontSize: 11, fontWeight: 600, borderRadius: 5, padding: '3px 8px' }}>
                        {doc.documentType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: 'rgba(255,255,255,0.7)' }}>
                      {doc.document?.name ?? doc.id.slice(0, 8) + '…'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {doc.expiryDate ? (
                        <span style={{ color: expired ? '#ef4444' : expiring ? '#f59e0b' : 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {(expired || expiring) && <AlertTriangle size={13} />}
                          {formatDate(doc.expiryDate)}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {doc.isVerified
                        ? <Badge label="Verified" color="#10b981" bg="rgba(16,185,129,0.12)" />
                        : <Badge label="Pending" color="#f59e0b" bg="rgba(245,158,11,0.12)" />
                      }
                    </td>
                    <td style={{ padding: '12px' }}>
                      {doc.document?.url && (
                        <a href={doc.document.url} target="_blank" rel="noreferrer" style={{ color: '#6366f1', fontSize: 13, textDecoration: 'none' }}>
                          View
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Exit Management Tab ──────────────────────────────────────────────────────

function ExitTab({ employee, separation, showDialog, setShowDialog, onInitiated, onClearanceUpdate, showToast }: {
  employee: Employee;
  separation: Separation | null;
  showDialog: boolean;
  setShowDialog: (v: boolean) => void;
  onInitiated: (s: Separation) => void;
  onClearanceUpdate: (s: Separation) => void;
  showToast: (m: string, t: 'success' | 'error') => void;
}) {
  const [form, setForm] = useState({
    separationType: '',
    resignationDate: '',
    lastWorkingDate: '',
    noticePeriodDays: employee.noticePeriodDays?.toString() ?? '30',
    exitRemarks: '',
  });
  const [saving, setSaving] = useState(false);
  const [clearanceSaving, setClearanceSaving] = useState<string | null>(null);
  const [settlementInput, setSettlementInput] = useState(separation?.finalSettlementAmount?.toString() ?? '');

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleInitiate = async () => {
    if (!form.separationType || !form.lastWorkingDate) {
      showToast('Separation type and last working date are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const created = await employeesApi.initiateSeparation({
        employeeId: employee.id,
        separationType: form.separationType,
        resignationDate: form.resignationDate || undefined,
        lastWorkingDate: form.lastWorkingDate,
        noticePeriodDays: parseInt(form.noticePeriodDays) || 0,
        exitRemarks: form.exitRemarks || undefined,
      });
      onInitiated(created);
      setShowDialog(false);
    } catch {
      showToast('Failed to initiate separation', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClearance = async (dept: string, current: boolean) => {
    if (!separation) return;
    setClearanceSaving(dept);
    try {
      const updated = await employeesApi.updateClearance(employee.id, dept, !current);
      onClearanceUpdate(updated);
    } catch {
      showToast(`Failed to update ${dept} clearance`, 'error');
    } finally {
      setClearanceSaving(null);
    }
  };

  const isExiting = ['RESIGNED', 'TERMINATED'].includes(employee.status) || ['RESIGNED', 'TERMINATED'].includes(employee.lifecycleStatus ?? '');

  const SEP_TYPE_COLORS: Record<string, { color: string; bg: string }> = {
    RESIGNATION: { color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
    TERMINATION: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    RETIREMENT: { color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    CONTRACT_END: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    ABSCONDING: { color: '#dc2626', bg: 'rgba(220,38,38,0.12)' },
    MUTUAL_SEPARATION: { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {separation ? (
        <>
          {/* Separation Details */}
          <div style={cardStyle}>
            <h3 style={{ color: '#fff', margin: '0 0 20px', fontSize: 15, fontWeight: 600 }}>Separation Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <span style={labelStyle as React.CSSProperties}>Separation Type</span>
                {(() => {
                  const cfg = SEP_TYPE_COLORS[separation.separationType] ?? { color: '#6b7280', bg: 'rgba(107,114,128,0.12)' };
                  return <Badge label={(separation.separationType ?? '').replace(/_/g, ' ')} color={cfg.color} bg={cfg.bg} />;
                })()}
              </div>
              <div>
                <span style={labelStyle as React.CSSProperties}>Notice Period</span>
                <ReadValue value={`${separation.noticePeriodDays} days`} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <span style={labelStyle as React.CSSProperties}>Resignation Date</span>
                <ReadValue value={separation.resignationDate ? formatDate(separation.resignationDate) : undefined} />
              </div>
              <div>
                <span style={labelStyle as React.CSSProperties}>Last Working Date</span>
                <ReadValue value={separation.lastWorkingDate ? formatDate(separation.lastWorkingDate) : undefined} />
              </div>
            </div>
            {separation.exitRemarks && (
              <div>
                <span style={labelStyle as React.CSSProperties}>Exit Remarks</span>
                <ReadValue value={separation.exitRemarks} />
              </div>
            )}
          </div>

          {/* Clearance Board */}
          <div style={cardStyle}>
            <h3 style={{ color: '#fff', margin: '0 0 20px', fontSize: 15, fontWeight: 600 }}>Department Clearance</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {CLEARANCE_DEPTS.map((dept) => {
                const cleared = separation.clearanceStatus?.[dept] ?? false;
                const isLoading = clearanceSaving === dept;
                return (
                  <div
                    key={dept}
                    onClick={() => !isLoading && handleClearance(dept, cleared)}
                    style={{
                      border: cleared ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(255,255,255,0.08)',
                      background: cleared ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
                      borderRadius: 10, padding: '16px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.2s',
                      opacity: isLoading ? 0.5 : 1,
                    }}
                  >
                    <div style={{
                      width: 22, height: 22, borderRadius: 6,
                      background: cleared ? '#10b981' : 'transparent',
                      border: cleared ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {cleared && <Check size={13} color="#fff" />}
                    </div>
                    <div>
                      <div style={{ color: '#fff', fontSize: 14, fontWeight: 500, textTransform: 'capitalize' }}>{dept}</div>
                      <div style={{ color: cleared ? '#10b981' : 'rgba(255,255,255,0.35)', fontSize: 12 }}>
                        {cleared ? 'Cleared' : 'Pending'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Final Settlement */}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <FieldRow label="Final Settlement Amount (₹)">
                <input
                  style={{ ...inputStyle, maxWidth: 240 }}
                  type="number"
                  value={settlementInput}
                  onChange={(e) => setSettlementInput(e.target.value)}
                  placeholder="Enter settlement amount"
                  min={0}
                />
              </FieldRow>
            </div>
          </div>
        </>
      ) : (
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <FileText size={24} color="#ef4444" />
            </div>
            <h3 style={{ color: '#fff', margin: '0 0 8px', fontSize: 16 }}>No Separation Initiated</h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', margin: '0 0 24px', fontSize: 14 }}>
              {isExiting
                ? 'This employee has been marked as resigned/terminated. Please initiate the formal separation process.'
                : 'Use this section when the employee is resigning, terminated, or retiring.'}
            </p>
            <button
              onClick={() => setShowDialog(true)}
              style={{ ...btnPrimary, background: isExiting ? '#ef4444' : '#6366f1' }}
            >
              Initiate Separation
            </button>
          </div>
        </div>
      )}

      {/* Separation Dialog */}
      {showDialog && (
        <Dialog title="Initiate Separation" onClose={() => setShowDialog(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FieldRow label="Separation Type *">
              <select style={inputStyle} value={form.separationType} onChange={f('separationType')}>
                <option value="">Select type</option>
                {SEPARATION_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </FieldRow>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FieldRow label="Resignation Date">
                <input style={inputStyle} type="date" value={form.resignationDate} onChange={f('resignationDate')} />
              </FieldRow>
              <FieldRow label="Last Working Date *">
                <input style={inputStyle} type="date" value={form.lastWorkingDate} onChange={f('lastWorkingDate')} />
              </FieldRow>
            </div>
            <FieldRow label="Notice Period (Days)">
              <input style={inputStyle} type="number" value={form.noticePeriodDays} onChange={f('noticePeriodDays')} min={0} />
            </FieldRow>
            <FieldRow label="Exit Remarks">
              <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.exitRemarks} onChange={f('exitRemarks')} placeholder="Exit interview notes, remarks…" />
            </FieldRow>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button style={btnOutline} onClick={() => setShowDialog(false)}>Cancel</button>
              <button style={{ ...btnPrimary, background: '#ef4444' }} onClick={handleInitiate} disabled={saving}>
                {saving ? 'Initiating…' : 'Initiate Separation'}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

// ─── Lifecycle Dialog ─────────────────────────────────────────────────────────

function LifecycleDialog({ current, employeeId, onClose, onUpdated, showToast }: {
  current: string;
  employeeId: string;
  onClose: () => void;
  onUpdated: (lc: string) => void;
  showToast: (m: string, t: 'success' | 'error') => void;
}) {
  const [selected, setSelected] = useState(current);
  const [saving, setSaving] = useState(false);

  const handleUpdate = async () => {
    if (selected === current) { onClose(); return; }
    setSaving(true);
    try {
      await employeesApi.updateLifecycleStatus(employeeId, selected);
      onUpdated(selected);
    } catch {
      showToast('Failed to update lifecycle status', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title="Update Lifecycle Status" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {LIFECYCLE_STATES.map((state) => {
          const cfg = LIFECYCLE_CONFIG[state] ?? { color: '#6b7280', bg: 'rgba(107,114,128,0.15)', label: state };
          const isSelected = selected === state;
          return (
            <div
              key={state}
              onClick={() => setSelected(state)}
              style={{
                padding: '12px 16px', borderRadius: 9, cursor: 'pointer',
                border: isSelected ? `1.5px solid ${cfg.color}` : '1px solid rgba(255,255,255,0.07)',
                background: isSelected ? cfg.bg : 'rgba(255,255,255,0.02)',
                display: 'flex', alignItems: 'center', gap: 12,
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: isSelected ? cfg.color : 'rgba(255,255,255,0.15)',
              }} />
              <span style={{ color: isSelected ? cfg.color : 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: isSelected ? 600 : 400 }}>
                {cfg.label}
              </span>
              {state === current && <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>Current</span>}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button style={btnOutline} onClick={onClose}>Cancel</button>
        <button style={btnPrimary} onClick={handleUpdate} disabled={saving || selected === current}>
          {saving ? 'Updating…' : 'Update Status'}
        </button>
      </div>
    </Dialog>
  );
}
