'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Globe, MapPin, Megaphone, Award, Plus,
  ChevronRight, ChevronDown, Pencil, Trash2, Send, Trophy,
  Users, X, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { organizationApi } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type Zone = { id: string; name: string; code?: string };
type Region = { id: string; name: string; code?: string; zoneId?: string; zone?: Zone };
type Branch = {
  id: string; code: string; name: string; gstin?: string; pan?: string;
  phone?: string; email?: string; address?: string; regionId?: string;
  managerId?: string; region?: Region; _count?: { employees: number };
};
type Announcement = {
  id: string; title: string; body: string; type: string;
  isPublished: boolean; publishAt?: string; expiresAt?: string;
  targetAudience: string[];
};
type Award = {
  id: string; employeeId: string; awardType: string; title?: string;
  month?: number; year: number; description?: string;
  employee?: { firstName: string; lastName: string; employeeCode: string };
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'structure', label: 'Org Structure', icon: Building2 },
  { key: 'branches', label: 'Branches', icon: MapPin },
  { key: 'regions', label: 'Regions & Zones', icon: Globe },
  { key: 'announcements', label: 'Announcements', icon: Megaphone },
  { key: 'awards', label: 'Awards & Recognition', icon: Trophy },
] as const;

type TabKey = typeof TABS[number]['key'];

const ANNOUNCEMENT_TYPES: Record<string, { label: string; color: string; bg: string }> = {
  COMPANY_NEWS:    { label: 'Company News',    color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  HR_CIRCULAR:     { label: 'HR Circular',     color: '#818cf8', bg: 'rgba(129,140,248,0.15)' },
  POLICY_UPDATE:   { label: 'Policy Update',   color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  EMERGENCY_ALERT: { label: 'Emergency Alert', color: '#f43f5e', bg: 'rgba(244,63,94,0.15)' },
  NOTICE_BOARD:    { label: 'Notice Board',    color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
};

const AWARD_TYPES: Record<string, { label: string; color: string; bg: string }> = {
  EMPLOYEE_OF_MONTH:   { label: 'Employee of Month',   color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  BEST_PERFORMER:      { label: 'Best Performer',      color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  LONG_SERVICE:        { label: 'Long Service',        color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  INNOVATION_AWARD:    { label: 'Innovation Award',    color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  TEAM_PLAYER:         { label: 'Team Player',         color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  SAFETY_CHAMPION:     { label: 'Safety Champion',     color: '#f97316', bg: 'rgba(249,115,22,0.15)' },
};

const AUDIENCE_OPTIONS = ['ALL', 'HR', 'OPERATIONS', 'ADMIN', 'FINANCE'];

const THEME = {
  bg: 'var(--wz-page-bg)',
  card: 'var(--wz-card-bg)',
  border: 'var(--wz-card-border)',
  accent: '#6366f1',
  text: 'var(--wz-text-primary)',
  muted: 'var(--wz-text-muted)',
};

// ─── Shared Components ────────────────────────────────────────────────────────

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ color, background: bg, fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>
      {label}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ background: `${color}20`, borderRadius: 8, padding: 8 }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: THEME.text }}>{value}</div>
        <div style={{ fontSize: 12, color: THEME.muted }}>{label}</div>
      </div>
    </div>
  );
}

function ActionBtn({ icon: Icon, color, onClick, title }: { icon: React.ElementType; color?: string; onClick: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, color: color ?? THEME.muted, display: 'flex', alignItems: 'center' }}
    >
      <Icon size={15} />
    </button>
  );
}

function PrimaryBtn({ label, icon: Icon, onClick }: { label: string; icon?: React.ElementType; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ background: THEME.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
    >
      {Icon && <Icon size={14} />}
      {label}
    </button>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--wz-card-bg)', border: '1px solid var(--wz-card-border)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h3 style={{ color: THEME.text, fontWeight: 700, fontSize: 17, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: THEME.muted }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, color: THEME.muted, marginBottom: 6, fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#f43f5e' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--wz-input-bg)', border: '1px solid var(--wz-input-border)',
  borderRadius: 8, padding: '9px 12px', color: 'var(--wz-input-color)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
};

function Input({ value, onChange, placeholder, required }: { value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) {
  return <input style={inputStyle} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required} />;
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select style={{ ...inputStyle, appearance: 'none' }} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">— Select —</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Textarea({ value, onChange, placeholder, rows }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: (rows ?? 3) * 22 }} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows ?? 3} />;
}

function SaveBtn({ loading, label }: { loading: boolean; label?: string }) {
  return (
    <button type="submit" style={{ background: THEME.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
      {loading ? 'Saving…' : (label ?? 'Save')}
    </button>
  );
}

function TableHead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr>
        {cols.map(c => (
          <th key={c} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 600, color: THEME.muted, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${THEME.border}` }}>
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}

// ─── Tab 1: Org Structure ─────────────────────────────────────────────────────

interface TreeNode extends Zone {
  regions?: (Region & { branches?: Branch[] })[];
}

function OrgTreeNode({ node }: { node: TreeNode }) {
  const [zoneOpen, setZoneOpen] = useState(true);
  const [openRegions, setOpenRegions] = useState<Record<string, boolean>>({});

  const toggleRegion = (id: string) => setOpenRegions(p => ({ ...p, [id]: !p[id] }));

  return (
    <div style={{ marginBottom: 8 }}>
      {/* Zone row */}
      <div
        onClick={() => setZoneOpen(p => !p)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(99,102,241,0.08)', border: `1px solid rgba(99,102,241,0.2)`, borderRadius: 10, cursor: 'pointer', userSelect: 'none' }}
      >
        {zoneOpen ? <ChevronDown size={16} style={{ color: THEME.accent }} /> : <ChevronRight size={16} style={{ color: THEME.accent }} />}
        <Globe size={16} style={{ color: THEME.accent }} />
        <span style={{ fontWeight: 700, color: THEME.text, fontSize: 14 }}>{node.name}</span>
        {node.code && <span style={{ fontSize: 11, color: THEME.accent, background: 'rgba(99,102,241,0.15)', padding: '1px 7px', borderRadius: 99, fontWeight: 600 }}>{node.code}</span>}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: THEME.muted }}>{node.regions?.length ?? 0} regions</span>
      </div>

      {/* Regions */}
      {zoneOpen && node.regions?.map(region => {
        const regionOpen = openRegions[region.id] !== false;
        return (
          <div key={region.id} style={{ marginLeft: 28, marginTop: 6 }}>
            <div
              onClick={() => toggleRegion(region.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${THEME.border}`, borderRadius: 8, cursor: 'pointer', userSelect: 'none' }}
            >
              {regionOpen ? <ChevronDown size={14} style={{ color: '#818cf8' }} /> : <ChevronRight size={14} style={{ color: '#818cf8' }} />}
              <MapPin size={14} style={{ color: '#818cf8' }} />
              <span style={{ fontWeight: 600, color: THEME.text, fontSize: 13 }}>{region.name}</span>
              {region.code && <span style={{ fontSize: 11, color: '#818cf8', background: 'rgba(129,140,248,0.12)', padding: '1px 7px', borderRadius: 99, fontWeight: 600 }}>{region.code}</span>}
              <span style={{ marginLeft: 'auto', fontSize: 12, color: THEME.muted }}>{region.branches?.length ?? 0} branches</span>
            </div>

            {/* Branches */}
            {regionOpen && region.branches?.map(branch => (
              <div key={branch.id} style={{ marginLeft: 28, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: 'rgba(255,255,255,0.015)', border: `1px solid ${THEME.border}`, borderRadius: 7 }}>
                <Building2 size={13} style={{ color: '#10b981' }} />
                <span style={{ fontSize: 13, color: THEME.text }}>{branch.name}</span>
                <span style={{ fontSize: 11, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '1px 7px', borderRadius: 99, fontWeight: 600 }}>{branch.code}</span>
                {branch._count?.employees !== undefined && (
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: THEME.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Users size={11} />{branch._count.employees} emp
                  </span>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function OrgStructureTab({ zones, regions, branches }: { zones: Zone[]; regions: Region[]; branches: Branch[] }) {
  const totalEmployees = branches.reduce((s, b) => s + (b._count?.employees ?? 0), 0);

  const tree: TreeNode[] = zones.map(z => ({
    ...z,
    regions: regions
      .filter(r => r.zoneId === z.id)
      .map(r => ({ ...r, branches: branches.filter(b => b.regionId === r.id) })),
  }));

  return (
    <div>
      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Zones" value={zones.length} icon={Globe} color={THEME.accent} />
        <StatCard label="Total Regions" value={regions.length} icon={MapPin} color="#818cf8" />
        <StatCard label="Total Branches" value={branches.length} icon={Building2} color="#10b981" />
        <StatCard label="Active Employees" value={totalEmployees} icon={Users} color="#f59e0b" />
      </div>

      {tree.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: THEME.muted }}>
          No organization structure defined yet. Add Zones, Regions, and Branches.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tree.map(node => <OrgTreeNode key={node.id} node={node} />)}
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: Branches ──────────────────────────────────────────────────────────

function BranchDialog({
  initial, regions, onSave, onClose, loading,
}: {
  initial?: Partial<Branch>; regions: Region[]; onSave: (d: Record<string, unknown>) => void;
  onClose: () => void; loading: boolean;
}) {
  const [code, setCode] = useState(initial?.code ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [regionId, setRegionId] = useState(initial?.regionId ?? '');
  const [gstin, setGstin] = useState(initial?.gstin ?? '');
  const [pan, setPan] = useState(initial?.pan ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [managerId, setManagerId] = useState(initial?.managerId ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name) return;
    onSave({ code, name, regionId: regionId || undefined, gstin: gstin || undefined, pan: pan || undefined, address: address || undefined, phone: phone || undefined, email: email || undefined, managerId: managerId || undefined });
  };

  return (
    <Modal title={initial?.id ? 'Edit Branch' : 'Add Branch'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Branch Code" required>
            <Input value={code} onChange={setCode} placeholder="BLR-01" required />
          </FormField>
          <FormField label="Branch Name" required>
            <Input value={name} onChange={setName} placeholder="Bangalore HQ" required />
          </FormField>
        </div>
        <FormField label="Region">
          <Select value={regionId} onChange={setRegionId} options={regions.map(r => ({ value: r.id, label: r.name }))} />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="GSTIN">
            <Input value={gstin} onChange={setGstin} placeholder="27AABCU9603R1ZX" />
          </FormField>
          <FormField label="PAN">
            <Input value={pan} onChange={setPan} placeholder="AABCU9603R" />
          </FormField>
        </div>
        <FormField label="Address">
          <Textarea value={address} onChange={setAddress} placeholder="Full address" rows={2} />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Phone">
            <Input value={phone} onChange={setPhone} placeholder="+91 9876543210" />
          </FormField>
          <FormField label="Email">
            <Input value={email} onChange={setEmail} placeholder="branch@company.com" />
          </FormField>
        </div>
        <FormField label="Manager ID">
          <Input value={managerId} onChange={setManagerId} placeholder="Employee ID" />
        </FormField>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button type="button" onClick={onClose} style={{ background: 'transparent', border: `1px solid ${THEME.border}`, color: THEME.muted, borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <SaveBtn loading={loading} />
        </div>
      </form>
    </Modal>
  );
}

function BranchesTab({ branches, regions, onRefresh }: { branches: Branch[]; regions: Region[]; onRefresh: () => void }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const qc = useQueryClient();

  const createMut = useMutation({
    mutationFn: organizationApi.createBranch,
    onSuccess: () => { toast.success('Branch created'); onRefresh(); setShowDialog(false); },
    onError: () => toast.error('Failed to create branch'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => organizationApi.updateBranch(id, data),
    onSuccess: () => { toast.success('Branch updated'); onRefresh(); setEditBranch(null); },
    onError: () => toast.error('Failed to update branch'),
  });

  const deleteMut = useMutation({
    mutationFn: organizationApi.deleteBranch,
    onSuccess: () => { toast.success('Branch deleted'); onRefresh(); },
    onError: () => toast.error('Failed to delete branch'),
  });

  const handleSave = (data: Record<string, unknown>) => {
    if (editBranch) updateMut.mutate({ id: editBranch.id, data });
    else createMut.mutate(data);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <PrimaryBtn label="+ Add Branch" onClick={() => { setEditBranch(null); setShowDialog(true); }} />
      </div>
      <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <TableHead cols={['Code', 'Name', 'Region', 'GST', 'Phone', 'Email', 'Employees', 'Actions']} />
          <tbody>
            {branches.length === 0 && (
              <tr><td colSpan={8} style={{ padding: '40px 0', textAlign: 'center', color: THEME.muted }}>No branches found</td></tr>
            )}
            {branches.map(b => (
              <tr key={b.id} style={{ borderTop: `1px solid ${THEME.border}` }}>
                <td style={{ padding: '10px 14px', fontSize: 13, color: THEME.accent, fontWeight: 600 }}>{b.code}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: THEME.text }}>{b.name}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: THEME.muted }}>{b.region?.name ?? '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: THEME.muted }}>{b.gstin ?? '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: THEME.muted }}>{b.phone ?? '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: THEME.muted }}>{b.email ?? '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: THEME.text }}>{b._count?.employees ?? 0}</td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <ActionBtn icon={Pencil} onClick={() => { setEditBranch(b); setShowDialog(true); }} title="Edit" />
                    <ActionBtn icon={Trash2} color="#f43f5e" onClick={() => { if (confirm(`Delete branch ${b.name}?`)) deleteMut.mutate(b.id); }} title="Delete" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(showDialog || editBranch) && (
        <BranchDialog
          initial={editBranch ?? undefined}
          regions={regions}
          onSave={handleSave}
          onClose={() => { setShowDialog(false); setEditBranch(null); }}
          loading={createMut.isPending || updateMut.isPending}
        />
      )}
    </div>
  );
}

// ─── Tab 3: Regions & Zones ───────────────────────────────────────────────────

function ZoneDialog({ initial, onSave, onClose, loading }: { initial?: Partial<Zone>; onSave: (d: Record<string, unknown>) => void; onClose: () => void; loading: boolean }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [code, setCode] = useState(initial?.code ?? '');
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!name) return; onSave({ name, code: code || undefined }); };
  return (
    <Modal title={initial?.id ? 'Edit Zone' : 'Add Zone'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Zone Name" required><Input value={name} onChange={setName} placeholder="North Zone" required /></FormField>
        <FormField label="Code"><Input value={code} onChange={setCode} placeholder="NZ" /></FormField>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button type="button" onClick={onClose} style={{ background: 'transparent', border: `1px solid ${THEME.border}`, color: THEME.muted, borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <SaveBtn loading={loading} />
        </div>
      </form>
    </Modal>
  );
}

function RegionDialog({ initial, zones, onSave, onClose, loading }: { initial?: Partial<Region>; zones: Zone[]; onSave: (d: Record<string, unknown>) => void; onClose: () => void; loading: boolean }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [code, setCode] = useState(initial?.code ?? '');
  const [zoneId, setZoneId] = useState(initial?.zoneId ?? '');
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!name) return; onSave({ name, code: code || undefined, zoneId: zoneId || undefined }); };
  return (
    <Modal title={initial?.id ? 'Edit Region' : 'Add Region'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Region Name" required><Input value={name} onChange={setName} placeholder="Maharashtra" required /></FormField>
        <FormField label="Code"><Input value={code} onChange={setCode} placeholder="MH" /></FormField>
        <FormField label="Zone"><Select value={zoneId} onChange={setZoneId} options={zones.map(z => ({ value: z.id, label: z.name }))} /></FormField>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button type="button" onClick={onClose} style={{ background: 'transparent', border: `1px solid ${THEME.border}`, color: THEME.muted, borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <SaveBtn loading={loading} />
        </div>
      </form>
    </Modal>
  );
}

function RegionsZonesTab({ zones, regions, onRefresh }: { zones: Zone[]; regions: Region[]; onRefresh: () => void }) {
  const [showZoneDialog, setShowZoneDialog] = useState(false);
  const [showRegionDialog, setShowRegionDialog] = useState(false);
  const [editZone, setEditZone] = useState<Zone | null>(null);
  const [editRegion, setEditRegion] = useState<Region | null>(null);

  const createZoneMut = useMutation({ mutationFn: organizationApi.createZone, onSuccess: () => { toast.success('Zone created'); onRefresh(); setShowZoneDialog(false); }, onError: () => toast.error('Failed') });
  const updateZoneMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => organizationApi.updateZone(id, data), onSuccess: () => { toast.success('Zone updated'); onRefresh(); setEditZone(null); }, onError: () => toast.error('Failed') });
  const deleteZoneMut = useMutation({ mutationFn: organizationApi.deleteZone, onSuccess: () => { toast.success('Zone deleted'); onRefresh(); }, onError: () => toast.error('Failed') });

  const createRegionMut = useMutation({ mutationFn: organizationApi.createRegion, onSuccess: () => { toast.success('Region created'); onRefresh(); setShowRegionDialog(false); }, onError: () => toast.error('Failed') });
  const updateRegionMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => organizationApi.updateRegion(id, data), onSuccess: () => { toast.success('Region updated'); onRefresh(); setEditRegion(null); }, onError: () => toast.error('Failed') });
  const deleteRegionMut = useMutation({ mutationFn: organizationApi.deleteRegion, onSuccess: () => { toast.success('Region deleted'); onRefresh(); }, onError: () => toast.error('Failed') });

  const listItemStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: `1px solid ${THEME.border}` };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {/* Zones Panel */}
      <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, color: THEME.text, fontSize: 14 }}>Zones</span>
          <PrimaryBtn label="+ Add Zone" onClick={() => { setEditZone(null); setShowZoneDialog(true); }} />
        </div>
        {zones.length === 0 && <div style={{ padding: '32px 0', textAlign: 'center', color: THEME.muted, fontSize: 13 }}>No zones yet</div>}
        {zones.map(z => (
          <div key={z.id} style={listItemStyle}>
            <Globe size={14} style={{ color: THEME.accent }} />
            <span style={{ fontSize: 13, color: THEME.text, flexGrow: 1 }}>{z.name}</span>
            {z.code && <span style={{ fontSize: 11, color: THEME.accent, background: 'rgba(99,102,241,0.12)', padding: '1px 6px', borderRadius: 99 }}>{z.code}</span>}
            <ActionBtn icon={Pencil} onClick={() => setEditZone(z)} title="Edit" />
            <ActionBtn icon={Trash2} color="#f43f5e" onClick={() => { if (confirm(`Delete zone ${z.name}?`)) deleteZoneMut.mutate(z.id); }} title="Delete" />
          </div>
        ))}
      </div>

      {/* Regions Panel */}
      <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, color: THEME.text, fontSize: 14 }}>Regions</span>
          <PrimaryBtn label="+ Add Region" onClick={() => { setEditRegion(null); setShowRegionDialog(true); }} />
        </div>
        {regions.length === 0 && <div style={{ padding: '32px 0', textAlign: 'center', color: THEME.muted, fontSize: 13 }}>No regions yet</div>}
        {regions.map(r => (
          <div key={r.id} style={listItemStyle}>
            <MapPin size={14} style={{ color: '#818cf8' }} />
            <div style={{ flexGrow: 1 }}>
              <span style={{ fontSize: 13, color: THEME.text }}>{r.name}</span>
              {r.zone && <span style={{ fontSize: 11, color: THEME.muted, marginLeft: 6 }}>({r.zone.name})</span>}
            </div>
            {r.code && <span style={{ fontSize: 11, color: '#818cf8', background: 'rgba(129,140,248,0.12)', padding: '1px 6px', borderRadius: 99 }}>{r.code}</span>}
            <ActionBtn icon={Pencil} onClick={() => setEditRegion(r)} title="Edit" />
            <ActionBtn icon={Trash2} color="#f43f5e" onClick={() => { if (confirm(`Delete region ${r.name}?`)) deleteRegionMut.mutate(r.id); }} title="Delete" />
          </div>
        ))}
      </div>

      {(showZoneDialog || editZone) && (
        <ZoneDialog initial={editZone ?? undefined} onSave={d => { editZone ? updateZoneMut.mutate({ id: editZone.id, data: d }) : createZoneMut.mutate(d); }} onClose={() => { setShowZoneDialog(false); setEditZone(null); }} loading={createZoneMut.isPending || updateZoneMut.isPending} />
      )}
      {(showRegionDialog || editRegion) && (
        <RegionDialog initial={editRegion ?? undefined} zones={zones} onSave={d => { editRegion ? updateRegionMut.mutate({ id: editRegion.id, data: d }) : createRegionMut.mutate(d); }} onClose={() => { setShowRegionDialog(false); setEditRegion(null); }} loading={createRegionMut.isPending || updateRegionMut.isPending} />
      )}
    </div>
  );
}

// ─── Tab 4: Announcements ─────────────────────────────────────────────────────

function AnnouncementDialog({ initial, onSave, onClose, loading }: { initial?: Partial<Announcement>; onSave: (d: Record<string, unknown>) => void; onClose: () => void; loading: boolean }) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [type, setType] = useState(initial?.type ?? 'COMPANY_NEWS');
  const [audience, setAudience] = useState<string[]>(initial?.targetAudience ?? ['ALL']);
  const [publishAt, setPublishAt] = useState(initial?.publishAt ? initial.publishAt.slice(0, 16) : '');
  const [expiresAt, setExpiresAt] = useState(initial?.expiresAt ? initial.expiresAt.slice(0, 16) : '');
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? false);

  const toggleAudience = (opt: string) => {
    setAudience(prev => prev.includes(opt) ? prev.filter(a => a !== opt) : [...prev, opt]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;
    onSave({ title, body, type, targetAudience: audience, publishAt: publishAt || undefined, expiresAt: expiresAt || undefined, isPublished });
  };

  return (
    <Modal title={initial?.id ? 'Edit Announcement' : 'New Announcement'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Title" required><Input value={title} onChange={setTitle} placeholder="Announcement title" required /></FormField>
        <FormField label="Body" required><Textarea value={body} onChange={setBody} placeholder="Write the announcement…" rows={4} /></FormField>
        <FormField label="Type">
          <Select value={type} onChange={setType} options={Object.entries(ANNOUNCEMENT_TYPES).map(([k, v]) => ({ value: k, label: v.label }))} />
        </FormField>
        <FormField label="Target Audience">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {AUDIENCE_OPTIONS.map(opt => (
              <button key={opt} type="button" onClick={() => toggleAudience(opt)}
                style={{ padding: '4px 12px', borderRadius: 99, border: `1px solid ${audience.includes(opt) ? THEME.accent : THEME.border}`, background: audience.includes(opt) ? 'rgba(99,102,241,0.15)' : 'transparent', color: audience.includes(opt) ? THEME.accent : THEME.muted, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                {opt}
              </button>
            ))}
          </div>
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Publish At">
            <input type="datetime-local" style={inputStyle} value={publishAt} onChange={e => setPublishAt(e.target.value)} />
          </FormField>
          <FormField label="Expires At">
            <input type="datetime-local" style={inputStyle} value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
          </FormField>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <button type="button" onClick={() => setIsPublished(p => !p)}
            style={{ width: 18, height: 18, borderRadius: 4, border: `1px solid ${isPublished ? THEME.accent : THEME.border}`, background: isPublished ? THEME.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {isPublished && <Check size={11} color="#fff" />}
          </button>
          <span style={{ fontSize: 13, color: THEME.muted }}>Published immediately</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" onClick={onClose} style={{ background: 'transparent', border: `1px solid ${THEME.border}`, color: THEME.muted, borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <SaveBtn loading={loading} />
        </div>
      </form>
    </Modal>
  );
}

function AnnouncementsTab() {
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Announcement | null>(null);
  const qc = useQueryClient();

  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ['announcements'],
    queryFn: () => organizationApi.announcements() as Promise<Announcement[]>,
  });

  const createMut = useMutation({ mutationFn: organizationApi.createAnnouncement, onSuccess: () => { toast.success('Announcement created'); qc.invalidateQueries({ queryKey: ['announcements'] }); setShowDialog(false); }, onError: () => toast.error('Failed') });
  const updateMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => organizationApi.updateAnnouncement(id, data), onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['announcements'] }); setEditItem(null); }, onError: () => toast.error('Failed') });
  const publishMut = useMutation({ mutationFn: organizationApi.publishAnnouncement, onSuccess: () => { toast.success('Published'); qc.invalidateQueries({ queryKey: ['announcements'] }); }, onError: () => toast.error('Failed') });
  const deleteMut = useMutation({ mutationFn: organizationApi.deleteAnnouncement, onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['announcements'] }); }, onError: () => toast.error('Failed') });

  const handleSave = (d: Record<string, unknown>) => {
    if (editItem) updateMut.mutate({ id: editItem.id, data: d });
    else createMut.mutate(d);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <PrimaryBtn label="+ New Announcement" icon={Plus} onClick={() => { setEditItem(null); setShowDialog(true); }} />
      </div>
      <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <TableHead cols={['Title', 'Type', 'Status', 'Target', 'Published At', 'Actions']} />
          <tbody>
            {isLoading && <tr><td colSpan={6} style={{ padding: '40px 0', textAlign: 'center', color: THEME.muted }}>Loading…</td></tr>}
            {!isLoading && announcements.length === 0 && <tr><td colSpan={6} style={{ padding: '40px 0', textAlign: 'center', color: THEME.muted }}>No announcements</td></tr>}
            {announcements.map(a => {
              const typeConf = ANNOUNCEMENT_TYPES[a.type] ?? { label: a.type, color: THEME.muted, bg: THEME.card };
              return (
                <tr key={a.id} style={{ borderTop: `1px solid ${THEME.border}` }}>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: THEME.text, maxWidth: 220 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                  </td>
                  <td style={{ padding: '10px 14px' }}><Badge label={typeConf.label} color={typeConf.color} bg={typeConf.bg} /></td>
                  <td style={{ padding: '10px 14px' }}>
                    <Badge label={a.isPublished ? 'Published' : 'Draft'} color={a.isPublished ? '#10b981' : '#f59e0b'} bg={a.isPublished ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)'} />
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: THEME.muted }}>{Array.isArray(a.targetAudience) ? a.targetAudience.join(', ') : '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: THEME.muted }}>{a.publishAt ? new Date(a.publishAt).toLocaleDateString('en-IN') : '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <ActionBtn icon={Pencil} onClick={() => setEditItem(a)} title="Edit" />
                      {!a.isPublished && <ActionBtn icon={Send} color="#10b981" onClick={() => publishMut.mutate(a.id)} title="Publish" />}
                      <ActionBtn icon={Trash2} color="#f43f5e" onClick={() => { if (confirm('Delete this announcement?')) deleteMut.mutate(a.id); }} title="Delete" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(showDialog || editItem) && (
        <AnnouncementDialog initial={editItem ?? undefined} onSave={handleSave} onClose={() => { setShowDialog(false); setEditItem(null); }} loading={createMut.isPending || updateMut.isPending} />
      )}
    </div>
  );
}

// ─── Tab 5: Awards & Recognition ─────────────────────────────────────────────

function AwardDialog({ onSave, onClose, loading }: { onSave: (d: Record<string, unknown>) => void; onClose: () => void; loading: boolean }) {
  const [employeeId, setEmployeeId] = useState('');
  const [awardType, setAwardType] = useState('EMPLOYEE_OF_MONTH');
  const [title, setTitle] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !year) return;
    onSave({ employeeId, awardType, title: title || undefined, month: month ? Number(month) : undefined, year: Number(year), description: description || undefined });
  };

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  return (
    <Modal title="Give Award" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Employee Code / ID" required><Input value={employeeId} onChange={setEmployeeId} placeholder="EMP-001 or UUID" required /></FormField>
        <FormField label="Award Type">
          <Select value={awardType} onChange={setAwardType} options={Object.entries(AWARD_TYPES).map(([k, v]) => ({ value: k, label: v.label }))} />
        </FormField>
        <FormField label="Title"><Input value={title} onChange={setTitle} placeholder="Award title" /></FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Month">
            <Select value={month} onChange={setMonth} options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} />
          </FormField>
          <FormField label="Year" required>
            <Input value={year} onChange={setYear} placeholder="2026" required />
          </FormField>
        </div>
        <FormField label="Description"><Textarea value={description} onChange={setDescription} placeholder="Why this award?" rows={3} /></FormField>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button type="button" onClick={onClose} style={{ background: 'transparent', border: `1px solid ${THEME.border}`, color: THEME.muted, borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <SaveBtn loading={loading} label="Give Award" />
        </div>
      </form>
    </Modal>
  );
}

function AwardsTab() {
  const [showDialog, setShowDialog] = useState(false);
  const qc = useQueryClient();

  const { data: awards = [], isLoading } = useQuery<Award[]>({
    queryKey: ['awards'],
    queryFn: () => organizationApi.awards() as Promise<Award[]>,
  });

  const createMut = useMutation({ mutationFn: organizationApi.createAward, onSuccess: () => { toast.success('Award given!'); qc.invalidateQueries({ queryKey: ['awards'] }); setShowDialog(false); }, onError: () => toast.error('Failed to give award') });
  const deleteMut = useMutation({ mutationFn: organizationApi.deleteAward, onSuccess: () => { toast.success('Award removed'); qc.invalidateQueries({ queryKey: ['awards'] }); }, onError: () => toast.error('Failed') });

  const MONTH_NAMES = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <PrimaryBtn label="+ Give Award" icon={Award} onClick={() => setShowDialog(true)} />
      </div>
      <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <TableHead cols={['Employee', 'Award Type', 'Title', 'Month / Year', 'Actions']} />
          <tbody>
            {isLoading && <tr><td colSpan={5} style={{ padding: '40px 0', textAlign: 'center', color: THEME.muted }}>Loading…</td></tr>}
            {!isLoading && awards.length === 0 && <tr><td colSpan={5} style={{ padding: '40px 0', textAlign: 'center', color: THEME.muted }}>No awards yet</td></tr>}
            {awards.map(aw => {
              const typeConf = AWARD_TYPES[aw.awardType] ?? { label: aw.awardType, color: THEME.muted, bg: THEME.card };
              const empName = aw.employee ? `${aw.employee.firstName} ${aw.employee.lastName}` : aw.employeeId;
              const empCode = aw.employee?.employeeCode;
              return (
                <tr key={aw.id} style={{ borderTop: `1px solid ${THEME.border}` }}>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontSize: 13, color: THEME.text, fontWeight: 500 }}>{empName}</div>
                    {empCode && <div style={{ fontSize: 11, color: THEME.muted }}>{empCode}</div>}
                  </td>
                  <td style={{ padding: '10px 14px' }}><Badge label={typeConf.label} color={typeConf.color} bg={typeConf.bg} /></td>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: THEME.muted }}>{aw.title ?? '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: THEME.muted }}>
                    {aw.month ? `${MONTH_NAMES[aw.month]} ` : ''}{aw.year}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <ActionBtn icon={Trash2} color="#f43f5e" onClick={() => { if (confirm('Remove this award?')) deleteMut.mutate(aw.id); }} title="Remove" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showDialog && <AwardDialog onSave={d => createMut.mutate(d)} onClose={() => setShowDialog(false)} loading={createMut.isPending} />}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OrganizationPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('structure');
  const qc = useQueryClient();

  const { data: treeData } = useQuery({
    queryKey: ['org-tree'],
    queryFn: () => organizationApi.tree() as Promise<{ zones: Zone[]; regions: Region[]; branches: Branch[] }>,
  });

  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ['org-zones'],
    queryFn: () => organizationApi.zones() as Promise<Zone[]>,
  });

  const { data: regions = [] } = useQuery<Region[]>({
    queryKey: ['org-regions'],
    queryFn: () => organizationApi.regions() as Promise<Region[]>,
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['org-branches'],
    queryFn: () => organizationApi.branches() as Promise<Branch[]>,
  });

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['org-tree'] });
    qc.invalidateQueries({ queryKey: ['org-zones'] });
    qc.invalidateQueries({ queryKey: ['org-regions'] });
    qc.invalidateQueries({ queryKey: ['org-branches'] });
  };

  const treeZones: Zone[] = treeData?.zones ?? zones;
  const treeRegions: Region[] = treeData?.regions ?? regions;
  const treeBranches: Branch[] = treeData?.branches ?? branches;

  return (
    <div style={{ minHeight: '100vh', background: THEME.bg, padding: '28px 32px', color: THEME.text }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: 0 }}>Organization Structure</h1>
        <p style={{ fontSize: 14, color: THEME.muted, margin: '6px 0 0' }}>
          Manage company hierarchy, branches, and communications
        </p>
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${THEME.border}`, marginBottom: 28 }}>
        {TABS.map(tab => {
          const active = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: '10px 18px', fontSize: 13, fontWeight: active ? 700 : 500,
                color: active ? THEME.accent : THEME.muted,
                borderBottom: active ? `2px solid ${THEME.accent}` : '2px solid transparent',
                display: 'flex', alignItems: 'center', gap: 7, transition: 'color 0.15s',
                marginBottom: -1,
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'structure' && (
        <OrgStructureTab zones={treeZones} regions={treeRegions} branches={treeBranches} />
      )}
      {activeTab === 'branches' && (
        <BranchesTab branches={branches} regions={regions} onRefresh={refreshAll} />
      )}
      {activeTab === 'regions' && (
        <RegionsZonesTab zones={zones} regions={regions} onRefresh={refreshAll} />
      )}
      {activeTab === 'announcements' && <AnnouncementsTab />}
      {activeTab === 'awards' && <AwardsTab />}
    </div>
  );
}
