'use client';

import { useState, useCallback, useEffect } from 'react';

export interface EmploymentType {
  key: string;
  label: string;
  description: string;
  color: string;
  active: boolean;
  isDefault?: boolean;
}

const STORAGE_KEY = 'workzen_employment_types';

const DEFAULTS: EmploymentType[] = [
  { key: 'PERMANENT',  label: 'Permanent',  description: 'Full-time permanent employees on company payroll.',              color: '#10b981', active: true, isDefault: true },
  { key: 'CONTRACT',   label: 'Contract',   description: 'Fixed-term contract employees for specific projects.',           color: '#3b82f6', active: true, isDefault: true },
  { key: 'TEMPORARY',  label: 'Temporary',  description: 'Short-duration temporary workers.',                              color: '#f59e0b', active: true, isDefault: true },
  { key: 'PROBATION',  label: 'Probation',  description: 'New joiners under probationary evaluation period.',              color: '#8b5cf6', active: true, isDefault: true },
];

function load(): EmploymentType[] {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULTS;
}

function save(types: EmploymentType[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(types));
}

export function useEmploymentTypes() {
  const [types, setTypes] = useState<EmploymentType[]>(DEFAULTS);

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    setTypes(load());
  }, []);

  const persist = useCallback((next: EmploymentType[]) => {
    setTypes(next);
    save(next);
  }, []);

  const create = useCallback((data: Omit<EmploymentType, 'isDefault'>) => {
    const next = [...load(), { ...data, isDefault: false }];
    persist(next);
  }, [persist]);

  const update = useCallback((key: string, data: Partial<EmploymentType>) => {
    const next = load().map(t => t.key === key ? { ...t, ...data } : t);
    persist(next);
  }, [persist]);

  const remove = useCallback((key: string) => {
    const next = load().filter(t => t.key !== key);
    persist(next);
  }, [persist]);

  const toggleActive = useCallback((key: string) => {
    const next = load().map(t => t.key === key ? { ...t, active: !t.active } : t);
    persist(next);
  }, [persist]);

  const reset = useCallback(() => {
    persist(DEFAULTS);
  }, [persist]);

  const activeTypes = types.filter(t => t.active);

  return { types, activeTypes, create, update, remove, toggleActive, reset };
}

export function getEmploymentTypes(): EmploymentType[] {
  return load();
}
