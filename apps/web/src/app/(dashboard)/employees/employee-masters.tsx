'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, Building2, UserCog, Plus, Pencil, Trash2,
  X, Check, Info, RotateCcw,
} from 'lucide-react';
import { mastersApi } from '@/lib/api';
import { toast } from 'sonner';
import { useEmploymentTypes, type EmploymentType } from '@/hooks/use-employment-types';

// ── Types ────────────────────────────────────────────────────────────────────

interface Designation { id: string; name: string; code?: string; level?: number; description?: string }
interface Department  { id: string; name: string; code?: string; description?: string; parent?: { name: string }; parentId?: string }

const TYPE_COLORS = ['#10b981','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#f97316','#6366f1'];

// ── Sub-tab config ────────────────────────────────────────────────────────────

const SUB_TABS = [
  { id: 'designations',  label: 'Designations',    icon: Briefcase },
  { id: 'departments',   label: 'Departments',     icon: Building2 },
  { id: 'emp-types',     label: 'Employment Types', icon: UserCog  },
] as const;

type SubTab = typeof SUB_TABS[number]['id'];

// ── Shared primitives ─────────────────────────────────────────────────────────

function FInput({ value, onChange, placeholder, type = 'text' }: { value?: string | number; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="input-field w-full text-xs" />;
}
function FLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{children}</label>;
}

// ── Action buttons ────────────────────────────────────────────────────────────

function RowActions({ onEdit, onDelete, delId, id, onConfirm, onCancel }: {
  onEdit: () => void; onDelete: () => void;
  delId: string | null; id: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-1 justify-end">
      <button onClick={onEdit} className="p-1.5 rounded-lg transition-all"
        style={{ color: 'rgba(255,255,255,0.3)' }}
        onMouseOver={e => { e.currentTarget.style.color = '#818cf8'; e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; }}
        onMouseOut={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'transparent'; }}>
        <Pencil size={12} />
      </button>
      {delId === id ? (
        <div className="flex items-center gap-1">
          <button onClick={onConfirm} className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: 'rgba(244,63,94,0.15)', color: '#fb7185', border: '1px solid rgba(244,63,94,0.25)' }}>Delete?</button>
          <button onClick={onCancel} className="p-1.5 rounded" style={{ color: 'rgba(255,255,255,0.3)' }}><X size={10} /></button>
        </div>
      ) : (
        <button onClick={onDelete} className="p-1.5 rounded-lg transition-all"
          style={{ color: 'rgba(255,255,255,0.3)' }}
          onMouseOver={e => { e.currentTarget.style.color = '#fb7185'; e.currentTarget.style.background = 'rgba(244,63,94,0.08)'; }}
          onMouseOut={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'transparent'; }}>
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function EmployeeMasters() {
  const [sub, setSub] = useState<SubTab>('designations');

  // ── Employment Types ──
  const { types: empTypes, create: empCreate, update: empUpdate, remove: empRemove, toggleActive: empToggle, reset: empReset } = useEmploymentTypes();
  const [etOpen, setEtOpen] = useState(false);
  const [etEdit, setEtEdit] = useState<EmploymentType | null>(null);
  const [etForm, setEtForm] = useState<Partial<EmploymentType>>({});
  const [etDel, setEtDel] = useState<string | null>(null);

  // ── Designations ──
  const [desigs, setDesigs] = useState<Designation[]>([]);
  const [loadingD, setLoadingD] = useState(false);
  const [desigEdit, setDesigEdit] = useState<Designation | null>(null);
  const [desigForm, setDesigForm] = useState<Partial<Designation>>({});
  const [desigOpen, setDesigOpen] = useState(false);
  const [desigDel, setDesigDel] = useState<string | null>(null);
  const [desigSaving, setDesigSaving] = useState(false);

  // ── Departments ──
  const [depts, setDepts] = useState<Department[]>([]);
  const [loadingDept, setLoadingDept] = useState(false);
  const [deptEdit, setDeptEdit] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState<Partial<Department>>({});
  const [deptOpen, setDeptOpen] = useState(false);
  const [deptDel, setDeptDel] = useState<string | null>(null);
  const [deptSaving, setDeptSaving] = useState(false);

  // ── Loaders ──
  const loadDesigs = useCallback(async () => {
    setLoadingD(true);
    try { setDesigs(await mastersApi.designations()); }
    catch { toast.error('Failed to load designations'); }
    finally { setLoadingD(false); }
  }, []);

  const loadDepts = useCallback(async () => {
    setLoadingDept(true);
    try { setDepts(await mastersApi.departments()); }
    catch { toast.error('Failed to load departments'); }
    finally { setLoadingDept(false); }
  }, []);

  useEffect(() => { loadDesigs(); loadDepts(); }, [loadDesigs, loadDepts]);

  // ── Designation CRUD ──
  function openDesigAdd() { setDesigEdit(null); setDesigForm({}); setDesigOpen(true); }
  function openDesigEdit(d: Designation) { setDesigEdit(d); setDesigForm({ ...d }); setDesigOpen(true); }
  async function saveDesig() {
    if (!desigForm.name?.trim()) return toast.error('Name is required');
    setDesigSaving(true);
    try {
      if (desigEdit) await mastersApi.updateDesignation(desigEdit.id, desigForm);
      else await mastersApi.createDesignation(desigForm);
      toast.success(desigEdit ? 'Designation updated' : 'Designation created');
      setDesigOpen(false); loadDesigs();
    } catch { toast.error('Failed to save'); }
    finally { setDesigSaving(false); }
  }
  async function deleteDesig(id: string) {
    try { await mastersApi.deleteDesignation(id); toast.success('Deleted'); loadDesigs(); }
    catch { toast.error('Failed to delete'); }
    setDesigDel(null);
  }

  // ── Department CRUD ──
  function openDeptAdd() { setDeptEdit(null); setDeptForm({}); setDeptOpen(true); }
  function openDeptEdit(d: Department) { setDeptEdit(d); setDeptForm({ ...d }); setDeptOpen(true); }
  async function saveDept() {
    if (!deptForm.name?.trim()) return toast.error('Name is required');
    setDeptSaving(true);
    try {
      if (deptEdit) await mastersApi.updateDepartment(deptEdit.id, deptForm);
      else await mastersApi.createDepartment(deptForm);
      toast.success(deptEdit ? 'Department updated' : 'Department created');
      setDeptOpen(false); loadDepts();
    } catch { toast.error('Failed to save'); }
    finally { setDeptSaving(false); }
  }
  async function deleteDept(id: string) {
    try { await mastersApi.deleteDepartment(id); toast.success('Deleted'); loadDepts(); }
    catch { toast.error('Failed to delete'); }
    setDeptDel(null);
  }

  // ── Skeleton ──
  const Skeleton = () => (
    <>{[...Array(4)].map((_, i) => (
      <tr key={i}>
        {[...Array(3)].map((_, j) => (
          <td key={j} className="px-4 py-3">
            <div className="h-3.5 rounded animate-pulse" style={{ width: j === 0 ? '60%' : '40%', background: 'rgba(255,255,255,0.06)' }} />
          </td>
        ))}
      </tr>
    ))}</>
  );

  // ── Inline form row (modal) ──
  const FormModal = ({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-2xl" style={{ background: 'var(--wz-card-bg)', border: '1px solid var(--wz-card-border)', boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--wz-card-border)' }}>
            <h4 className="font-semibold text-sm" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>{title}</h4>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5"><X size={15} style={{ color: 'var(--wz-text-muted)' }} /></button>
          </div>
          <div className="p-5">{children}</div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Info bar */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.14)' }}>
        <Info size={13} style={{ color: '#818cf8', marginTop: 1, flexShrink: 0 }} />
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Manage Designations, Departments, and Employment Types used in the employee form. Changes take effect immediately in all dropdowns.
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {SUB_TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setSub(id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: sub === id ? 'rgba(99,102,241,0.18)' : 'transparent',
              color: sub === id ? '#818cf8' : 'rgba(255,255,255,0.35)',
              border: sub === id ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
            }}>
            <Icon size={12} />{label}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {/* ── DESIGNATIONS ── */}
        {sub === 'designations' && (
          <motion.div key="desig" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, position: 'absolute' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.25)' }}>
                {desigs.length} designation{desigs.length !== 1 ? 's' : ''}
              </p>
              <button onClick={openDesigAdd} className="btn-primary text-xs py-1.5 px-3">
                <Plus size={12} /> Add Designation
              </button>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Name', 'Code', 'Level', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingD ? <Skeleton /> : desigs.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-10 text-center text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>No designations yet. Add one above.</td></tr>
                  ) : desigs.map(d => (
                    <tr key={d.id} className="group" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--wz-text-primary)' }}>{d.name}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>{d.code || '—'}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{d.level ?? '—'}</td>
                      <td className="px-4 py-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <RowActions onEdit={() => openDesigEdit(d)} onDelete={() => setDesigDel(d.id)}
                          delId={desigDel} id={d.id} onConfirm={() => deleteDesig(d.id)} onCancel={() => setDesigDel(null)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <FormModal open={desigOpen} onClose={() => setDesigOpen(false)} title={desigEdit ? 'Edit Designation' : 'Add Designation'}>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><FLabel>Name *</FLabel><FInput value={desigForm.name} onChange={v => setDesigForm(f => ({ ...f, name: v }))} placeholder="e.g. Security Guard" /></div>
                  <div><FLabel>Code</FLabel><FInput value={desigForm.code} onChange={v => setDesigForm(f => ({ ...f, code: v }))} placeholder="e.g. SG01" /></div>
                  <div><FLabel>Level</FLabel><FInput type="number" value={desigForm.level} onChange={v => setDesigForm(f => ({ ...f, level: Number(v) || undefined }))} placeholder="e.g. 3" /></div>
                  <div className="col-span-2"><FLabel>Description</FLabel><FInput value={desigForm.description} onChange={v => setDesigForm(f => ({ ...f, description: v }))} placeholder="Optional description" /></div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button className="btn-primary flex-1 text-xs py-2" onClick={saveDesig} disabled={desigSaving}>
                    <Check size={12} /> {desigSaving ? 'Saving…' : desigEdit ? 'Update' : 'Create'}
                  </button>
                  <button className="btn-secondary text-xs py-2" onClick={() => setDesigOpen(false)}>Cancel</button>
                </div>
              </div>
            </FormModal>
          </motion.div>
        )}

        {/* ── DEPARTMENTS ── */}
        {sub === 'departments' && (
          <motion.div key="dept" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, position: 'absolute' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.25)' }}>
                {depts.length} department{depts.length !== 1 ? 's' : ''}
              </p>
              <button onClick={openDeptAdd} className="btn-primary text-xs py-1.5 px-3">
                <Plus size={12} /> Add Department
              </button>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Name', 'Code', 'Parent', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingDept ? <Skeleton /> : depts.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-10 text-center text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>No departments yet. Add one above.</td></tr>
                  ) : depts.map(d => (
                    <tr key={d.id} className="group" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--wz-text-primary)' }}>{d.name}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>{d.code || '—'}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{d.parent?.name || '—'}</td>
                      <td className="px-4 py-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <RowActions onEdit={() => openDeptEdit(d)} onDelete={() => setDeptDel(d.id)}
                          delId={deptDel} id={d.id} onConfirm={() => deleteDept(d.id)} onCancel={() => setDeptDel(null)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <FormModal open={deptOpen} onClose={() => setDeptOpen(false)} title={deptEdit ? 'Edit Department' : 'Add Department'}>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><FLabel>Name *</FLabel><FInput value={deptForm.name} onChange={v => setDeptForm(f => ({ ...f, name: v }))} placeholder="e.g. Security Services" /></div>
                  <div><FLabel>Code</FLabel><FInput value={deptForm.code} onChange={v => setDeptForm(f => ({ ...f, code: v }))} placeholder="e.g. SEC" /></div>
                  <div>
                    <FLabel>Parent Department</FLabel>
                    <select value={deptForm.parentId ?? ''} onChange={e => setDeptForm(f => ({ ...f, parentId: e.target.value || undefined }))} className="input-field w-full text-xs">
                      <option value="">— None —</option>
                      {depts.filter(d => d.id !== deptEdit?.id).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2"><FLabel>Description</FLabel><FInput value={deptForm.description} onChange={v => setDeptForm(f => ({ ...f, description: v }))} placeholder="Optional description" /></div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button className="btn-primary flex-1 text-xs py-2" onClick={saveDept} disabled={deptSaving}>
                    <Check size={12} /> {deptSaving ? 'Saving…' : deptEdit ? 'Update' : 'Create'}
                  </button>
                  <button className="btn-secondary text-xs py-2" onClick={() => setDeptOpen(false)}>Cancel</button>
                </div>
              </div>
            </FormModal>
          </motion.div>
        )}

        {/* ── EMPLOYMENT TYPES ── */}
        {sub === 'emp-types' && (
          <motion.div key="emp" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, position: 'absolute' }} className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.25)' }}>
                {empTypes.length} type{empTypes.length !== 1 ? 's' : ''}
              </p>
              <div className="flex gap-2">
                <button onClick={() => { if (confirm('Reset all employment types to defaults?')) empReset(); }}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] transition-all hover:bg-white/5"
                  style={{ color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <RotateCcw size={10} /> Reset
                </button>
                <button onClick={() => { setEtEdit(null); setEtForm({ color: TYPE_COLORS[empTypes.length % TYPE_COLORS.length], active: true }); setEtOpen(true); }}
                  className="btn-primary text-xs py-1.5 px-3">
                  <Plus size={12} /> Add Type
                </button>
              </div>
            </div>

            {/* Cards */}
            {empTypes.map((t, i) => (
              <motion.div key={t.key} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className="glass-card p-4 flex items-center gap-4 group"
                style={{ borderLeft: `3px solid ${t.color}`, opacity: t.active ? 1 : 0.5 }}>
                {/* Color swatch / icon */}
                <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: `${t.color}15` }}>
                  <UserCog size={16} style={{ color: t.color }} />
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="text-sm font-semibold" style={{ color: 'var(--wz-text-primary)' }}>{t.label}</p>
                    <code className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}>{t.key}</code>
                    {t.isDefault && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.25)' }}>default</span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{t.description}</p>
                </div>
                {/* Color dot */}
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: t.color }} />
                {/* Status toggle */}
                <button onClick={() => empToggle(t.key)}
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 transition-all"
                  style={{ background: t.active ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)', color: t.active ? '#10b981' : '#f43f5e', border: `1px solid ${t.active ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}` }}>
                  {t.active ? 'Active' : 'Inactive'}
                </button>
                {/* Actions (shown on hover) */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEtEdit(t); setEtForm({ ...t }); setEtOpen(true); }}
                    className="p-1.5 rounded-lg transition-all" style={{ color: 'rgba(255,255,255,0.3)' }}
                    onMouseOver={e => { e.currentTarget.style.color = '#818cf8'; e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; }}
                    onMouseOut={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'transparent'; }}>
                    <Pencil size={12} />
                  </button>
                  {etDel === t.key ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => { empRemove(t.key); setEtDel(null); toast.success('Employment type deleted'); }}
                        className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: 'rgba(244,63,94,0.15)', color: '#fb7185', border: '1px solid rgba(244,63,94,0.25)' }}>
                        Delete?
                      </button>
                      <button onClick={() => setEtDel(null)} className="p-1.5 rounded" style={{ color: 'rgba(255,255,255,0.3)' }}><X size={10} /></button>
                    </div>
                  ) : (
                    <button onClick={() => setEtDel(t.key)}
                      className="p-1.5 rounded-lg transition-all" style={{ color: 'rgba(255,255,255,0.3)' }}
                      onMouseOver={e => { e.currentTarget.style.color = '#fb7185'; e.currentTarget.style.background = 'rgba(244,63,94,0.08)'; }}
                      onMouseOut={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'transparent'; }}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}

            {empTypes.length === 0 && (
              <p className="text-center text-xs py-8" style={{ color: 'rgba(255,255,255,0.25)' }}>No employment types. Add one or reset to defaults.</p>
            )}

            {/* Create / Edit modal */}
            <FormModal open={etOpen} onClose={() => setEtOpen(false)} title={etEdit ? 'Edit Employment Type' : 'Add Employment Type'}>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <FLabel>Display Label *</FLabel>
                    <FInput value={etForm.label} onChange={v => setEtForm(f => ({ ...f, label: v }))} placeholder="e.g. Apprentice" />
                  </div>
                  <div>
                    <FLabel>Key * {etEdit?.isDefault && <span className="text-[9px] text-yellow-500/60 normal-case ml-1">(default — cannot change)</span>}</FLabel>
                    <FInput value={etForm.key} onChange={v => setEtForm(f => ({ ...f, key: v.toUpperCase().replace(/\s+/g, '_') }))}
                      placeholder="e.g. APPRENTICE" />
                  </div>
                  <div>
                    <FLabel>Accent Color</FLabel>
                    <div className="flex items-center gap-2">
                      <input type="color" value={etForm.color ?? '#6366f1'}
                        onChange={e => setEtForm(f => ({ ...f, color: e.target.value }))}
                        className="w-9 h-9 rounded-lg cursor-pointer flex-shrink-0"
                        style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', padding: '2px' }} />
                      <FInput value={etForm.color} onChange={v => setEtForm(f => ({ ...f, color: v }))} placeholder="#6366f1" />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <FLabel>Description</FLabel>
                    <FInput value={etForm.description} onChange={v => setEtForm(f => ({ ...f, description: v }))} placeholder="Brief description of this employment type" />
                  </div>
                </div>

                {/* Preview */}
                {(etForm.label || etForm.color) && (
                  <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.2)' }}>Preview</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                      style={{ background: `${etForm.color ?? '#6366f1'}18`, color: etForm.color ?? '#6366f1', border: `1px solid ${etForm.color ?? '#6366f1'}30` }}>
                      {etForm.label || 'Label'}
                    </span>
                    <code className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}>
                      {etForm.key || 'KEY'}
                    </code>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button className="btn-primary flex-1 text-xs py-2" onClick={() => {
                    if (!etForm.label?.trim() || !etForm.key?.trim()) return toast.error('Label and key are required');
                    if (etEdit) {
                      empUpdate(etEdit.key, { ...etForm, key: etEdit.isDefault ? etEdit.key : etForm.key });
                      toast.success('Employment type updated');
                    } else {
                      if (empTypes.some(t => t.key === etForm.key)) return toast.error('Key already exists');
                      empCreate({ key: etForm.key!, label: etForm.label!, description: etForm.description ?? '', color: etForm.color ?? '#6366f1', active: true });
                      toast.success('Employment type created');
                    }
                    setEtOpen(false);
                  }}>
                    <Check size={12} /> {etEdit ? 'Update' : 'Create'}
                  </button>
                  <button className="btn-secondary text-xs py-2" onClick={() => setEtOpen(false)}>Cancel</button>
                </div>
              </div>
            </FormModal>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
