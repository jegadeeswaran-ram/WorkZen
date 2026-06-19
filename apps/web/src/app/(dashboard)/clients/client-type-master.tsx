'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Globe, TrendingUp, Users, Landmark,
  Pencil, Check, X, Lock, Hash, BarChart2, Info,
} from 'lucide-react';

const ENUM_KEYS = ['GOVERNMENT_DEPARTMENT', 'PSU', 'PRIVATE_ORGANIZATION', 'MUNICIPAL_BODY'] as const;
type EnumKey = typeof ENUM_KEYS[number];

const DEFAULTS: Record<EnumKey, { label: string; description: string; color: string; icon: React.ElementType }> = {
  GOVERNMENT_DEPARTMENT: {
    label: 'Government Department',
    description: 'Central and state government ministries and departments.',
    color: '#6366f1',
    icon: Landmark,
  },
  PSU: {
    label: 'PSU (Public Sector)',
    description: 'Public sector undertakings and government-owned corporations.',
    color: '#3b82f6',
    icon: Globe,
  },
  PRIVATE_ORGANIZATION: {
    label: 'Private Organization',
    description: 'Privately owned companies and commercial enterprises.',
    color: '#10b981',
    icon: TrendingUp,
  },
  MUNICIPAL_BODY: {
    label: 'Municipal Body',
    description: 'Local governance bodies, municipalities, and civic authorities.',
    color: '#f59e0b',
    icon: Building2,
  },
};

const DASH_KEY_MAP: Record<EnumKey, string> = {
  GOVERNMENT_DEPARTMENT: 'govt',
  PSU: 'psu',
  PRIVATE_ORGANIZATION: 'private',
  MUNICIPAL_BODY: 'municipal',
};

const STORAGE_KEY = 'workzen_client_type_meta';

interface TypeMeta { label: string; description: string; color: string; active: boolean }
type MetaStore = Record<EnumKey, TypeMeta>;

function loadMeta(): MetaStore {
  if (typeof window === 'undefined') return buildDefault();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...buildDefault(), ...JSON.parse(raw) };
  } catch {}
  return buildDefault();
}

function buildDefault(): MetaStore {
  return Object.fromEntries(
    ENUM_KEYS.map(k => [k, { label: DEFAULTS[k].label, description: DEFAULTS[k].description, color: DEFAULTS[k].color, active: true }])
  ) as MetaStore;
}

function saveMeta(m: MetaStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
}

interface Props { dashboard: Record<string, number> | null }

export function ClientTypeMaster({ dashboard }: Props) {
  const [meta, setMeta] = useState<MetaStore>(buildDefault());
  const [editing, setEditing] = useState<EnumKey | null>(null);
  const [draft, setDraft] = useState<Partial<TypeMeta>>({});

  useEffect(() => { setMeta(loadMeta()); }, []);

  const startEdit = (key: EnumKey) => {
    setDraft({ ...meta[key] });
    setEditing(key);
  };

  const cancelEdit = () => { setEditing(null); setDraft({}); };

  const saveEdit = (key: EnumKey) => {
    const next = { ...meta, [key]: { ...meta[key], ...draft } };
    setMeta(next);
    saveMeta(next);
    setEditing(null);
    setDraft({});
  };

  const toggleActive = (key: EnumKey) => {
    const next = { ...meta, [key]: { ...meta[key], active: !meta[key].active } };
    setMeta(next);
    saveMeta(next);
  };

  const getCount = (key: EnumKey): number => {
    if (!dashboard) return 0;
    return dashboard[DASH_KEY_MAP[key]] ?? 0;
  };

  return (
    <div className="space-y-6">
      {/* Header info */}
      <div className="glass-card p-4 flex items-start gap-3" style={{ borderColor: 'rgba(99,102,241,0.2)' }}>
        <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.12)' }}>
          <Info size={14} style={{ color: '#818cf8' }} />
        </div>
        <div>
          <p className="text-xs font-semibold mb-0.5" style={{ color: '#818cf8' }}>Enum-backed Master</p>
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Client types are defined by the database schema. You can customize their display labels, descriptions, and colors here. Changes are stored locally and apply across the UI.
          </p>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-4 gap-3">
        {ENUM_KEYS.map((key, i) => {
          const D = DEFAULTS[key];
          const m = meta[key];
          const count = getCount(key);
          return (
            <motion.div key={key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="glass-card p-3 text-center">
              <div className="w-8 h-8 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: `${m.color}18`, border: `1px solid ${m.color}30` }}>
                <D.icon size={15} style={{ color: m.color }} />
              </div>
              <p className="text-lg font-bold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>{count}</p>
              <p className="text-[10px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{m.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Types list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.25)' }}>Client Type Definitions</p>
          <div className="flex items-center gap-1.5">
            <Lock size={10} style={{ color: 'rgba(255,255,255,0.2)' }} />
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>Enum keys are schema-locked</p>
          </div>
        </div>

        <AnimatePresence>
          {ENUM_KEYS.map((key, i) => {
            const D = DEFAULTS[key];
            const m = meta[key];
            const count = getCount(key);
            const isEditing = editing === key;

            return (
              <motion.div key={key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card overflow-hidden"
                style={{ opacity: m.active ? 1 : 0.5 }}>

                {/* Top bar with color accent */}
                <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${m.color}, transparent)` }} />

                <div className="p-5">
                  {!isEditing ? (
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center mt-0.5"
                        style={{ background: `${m.color}15`, border: `1px solid ${m.color}25` }}>
                        <D.icon size={20} style={{ color: m.color }} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>
                            {m.label}
                          </h4>
                          {/* Count badge */}
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: `${m.color}18`, color: m.color }}>
                            <BarChart2 size={8} className="inline mr-0.5" />{count} clients
                          </span>
                          {/* Status */}
                          {!m.active && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(244,63,94,0.12)', color: '#f43f5e' }}>Inactive</span>
                          )}
                        </div>
                        <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>{m.description}</p>
                        {/* Enum key */}
                        <div className="flex items-center gap-1.5">
                          <Hash size={10} style={{ color: 'rgba(255,255,255,0.2)' }} />
                          <code className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)' }}>
                            {key}
                          </code>
                        </div>
                      </div>

                      {/* Color swatch */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <div className="w-6 h-6 rounded-lg border" style={{ background: m.color, borderColor: 'rgba(255,255,255,0.1)' }} />
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => toggleActive(key)}
                          title={m.active ? 'Deactivate' : 'Activate'}
                          className="px-2 py-1 rounded-lg text-[10px] font-medium transition-colors"
                          style={{
                            background: m.active ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)',
                            color: m.active ? '#10b981' : '#f43f5e',
                            border: `1px solid ${m.active ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`,
                          }}>
                          {m.active ? 'Active' : 'Inactive'}
                        </button>
                        <button onClick={() => startEdit(key)}
                          className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                          <Pencil size={13} style={{ color: '#818cf8' }} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Edit mode */
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold" style={{ color: '#818cf8' }}>Editing: {key}</p>
                        <div className="flex gap-1">
                          <button onClick={() => saveEdit(key)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                            style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>
                            <Check size={11} /> Save
                          </button>
                          <button onClick={cancelEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
                            <X size={11} /> Cancel
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>Display Label</label>
                          <input value={draft.label ?? ''} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))}
                            className="input-field w-full" placeholder="Display label" />
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>Accent Color</label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={draft.color ?? m.color}
                              onChange={e => setDraft(d => ({ ...d, color: e.target.value }))}
                              className="w-9 h-9 rounded-lg cursor-pointer"
                              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', padding: '2px' }} />
                            <input value={draft.color ?? ''} onChange={e => setDraft(d => ({ ...d, color: e.target.value }))}
                              className="input-field flex-1 font-mono text-xs" placeholder="#6366f1" />
                          </div>
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--wz-text-secondary)' }}>Description</label>
                          <textarea value={draft.description ?? ''} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                            rows={2} className="input-field w-full resize-none" placeholder="Describe this client type..." />
                        </div>
                      </div>

                      {/* Preview */}
                      <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.25)' }}>Preview</p>
                        <div className="w-6 h-6 rounded-lg" style={{ background: `${draft.color ?? m.color}18`, border: `1px solid ${draft.color ?? m.color}30` }}>
                          <D.icon size={14} className="m-1" style={{ color: draft.color ?? m.color }} />
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-lg font-medium"
                          style={{ background: `${draft.color ?? m.color}18`, color: draft.color ?? m.color }}>
                          {draft.label || m.label}
                        </span>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{draft.description || m.description}</p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Reset */}
      <div className="flex justify-end">
        <button onClick={() => { const d = buildDefault(); setMeta(d); saveMeta(d); }}
          className="text-xs px-3 py-2 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.06)' }}>
          Reset to defaults
        </button>
      </div>
    </div>
  );
}
