'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Users,
  Lock,
  Plus,
  Pencil,
  Save,
  X,
  Check,
  ChevronRight,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { usersApi } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type Permission = {
  id: string;
  resource: string;
  action: string;
  description?: string;
};

type Role = {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  isSystem: boolean;
  permissions: Permission[];
};

type UserWithRoles = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  userRoles: { role: { id: string; name: string; displayName: string } }[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function getInitials(first: string, last: string): string {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div
      className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
      style={{ borderColor: 'rgba(99,102,241,0.4)', borderTopColor: '#6366f1' }}
    />
  );
}

function SkeletonRow({ cols = 1 }: { cols?: number }) {
  return (
    <div
      className={`grid gap-3 p-3 rounded-xl animate-pulse`}
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, background: 'rgba(255,255,255,0.03)' }}
    >
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="h-8 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }} />
      ))}
    </div>
  );
}

// ─── Create Role Dialog ───────────────────────────────────────────────────────

interface CreateRoleDialogProps {
  onClose: () => void;
  onCreated: (role: Role) => void;
}

function CreateRoleDialog({ onClose, onCreated }: CreateRoleDialogProps) {
  const [displayName, setDisplayName] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [nameEdited, setNameEdited] = useState(false);

  useEffect(() => {
    if (!nameEdited) setName(slugify(displayName));
  }, [displayName, nameEdited]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim() || !name.trim()) {
      toast.error('Display name and slug are required');
      return;
    }
    setSaving(true);
    try {
      const role = await usersApi.createRole({ name, displayName, description });
      toast.success(`Role "${displayName}" created`);
      onCreated(role as Role);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(error?.response?.data?.error?.message ?? 'Failed to create role');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: 'var(--wz-card-bg)', border: '1px solid var(--wz-card-border)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.15)' }}
            >
              <Shield size={16} style={{ color: '#6366f1' }} />
            </div>
            <h3 className="font-semibold text-base" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>
              Create New Role
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X size={15} style={{ color: 'var(--wz-text-muted)' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Display Name *
            </label>
            <input
              className="input-field w-full"
              placeholder="e.g. HR Manager"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Role Slug *
            </label>
            <input
              className="input-field w-full"
              placeholder="e.g. hr_manager"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameEdited(true); }}
              required
            />
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Auto-generated from display name. Must be unique.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Description
            </label>
            <textarea
              className="input-field w-full resize-none"
              placeholder="Brief description of this role's responsibilities"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="btn-primary flex-1 justify-center"
              disabled={saving}
            >
              {saving ? <Spinner /> : <Plus size={14} />}
              {saving ? 'Creating...' : 'Create Role'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Edit Role Dialog ─────────────────────────────────────────────────────────

interface EditRoleDialogProps {
  role: Role;
  onClose: () => void;
  onUpdated: (role: Role) => void;
}

function EditRoleDialog({ role, onClose, onUpdated }: EditRoleDialogProps) {
  const [displayName, setDisplayName] = useState(role.displayName);
  const [description, setDescription] = useState(role.description ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error('Display name is required');
      return;
    }
    setSaving(true);
    try {
      const updated = await usersApi.updateRole(role.id, { displayName, description });
      toast.success('Role updated');
      onUpdated(updated as Role);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(error?.response?.data?.error?.message ?? 'Failed to update role');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: 'var(--wz-card-bg)', border: '1px solid var(--wz-card-border)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.15)' }}
            >
              <Pencil size={14} style={{ color: '#6366f1' }} />
            </div>
            <h3 className="font-semibold text-base" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>
              Edit Role
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
          >
            <X size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Display Name *
            </label>
            <input
              className="input-field w-full"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Description
            </label>
            <textarea
              className="input-field w-full resize-none"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={saving}>
              {saving ? <Spinner /> : <Save size={14} />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Assign Roles Drawer ──────────────────────────────────────────────────────

interface AssignRolesDrawerProps {
  user: UserWithRoles;
  allRoles: Role[];
  onClose: () => void;
  onSaved: (user: UserWithRoles) => void;
}

function AssignRolesDrawer({ user, allRoles, onClose, onSaved }: AssignRolesDrawerProps) {
  const currentRoleIds = new Set(user.userRoles.map((ur) => ur.role.id));
  const [selected, setSelected] = useState<Set<string>>(new Set(currentRoleIds));
  const [saving, setSaving] = useState(false);

  function toggle(roleId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await usersApi.setUserRoles(user.id, [...selected]);
      toast.success(`Roles updated for ${user.firstName} ${user.lastName}`);
      onSaved(updated as UserWithRoles);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(error?.response?.data?.error?.message ?? 'Failed to update roles');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-0"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 60 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="h-full w-full max-w-sm flex flex-col"
        style={{ background: 'var(--wz-card-bg)', borderLeft: '1px solid var(--wz-card-border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--wz-card-border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
            >
              {getInitials(user.firstName, user.lastName)}
            </div>
            <div>
              <p className="text-sm font-semibold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all"
          >
            <X size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Assign Roles
          </p>
          <div className="space-y-2">
            {allRoles.map((role) => {
              const isChecked = selected.has(role.id);
              return (
                <label
                  key={role.id}
                  className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all"
                  style={{
                    background: isChecked ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isChecked ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)'}`,
                  }}
                >
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                    style={{
                      background: isChecked ? '#6366f1' : 'transparent',
                      border: `1.5px solid ${isChecked ? '#6366f1' : 'rgba(255,255,255,0.2)'}`,
                    }}
                  >
                    {isChecked && <Check size={10} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white">{role.displayName}</span>
                      {role.isSystem && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', fontSize: '10px' }}
                        >
                          System
                        </span>
                      )}
                    </div>
                    {role.description && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {role.description}
                      </p>
                    )}
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      {role.permissions.length} permissions
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isChecked}
                    onChange={() => toggle(role.id)}
                  />
                </label>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-5 py-4 flex gap-2 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button className="btn-primary flex-1 justify-center" onClick={handleSave} disabled={saving}>
            {saving ? <Spinner /> : <Save size={14} />}
            {saving ? 'Saving...' : 'Save Roles'}
          </button>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PermissionsPage() {
  // Tab
  const [activeTab, setActiveTab] = useState<'roles' | 'users'>('roles');

  // Roles & Permissions state
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [pendingPermIds, setPendingPermIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingPerms, setLoadingPerms] = useState(true);

  // Create / Edit dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [hoveredRoleId, setHoveredRoleId] = useState<string | null>(null);

  // Users state
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userMeta, setUserMeta] = useState<{ total: number; totalPages: number }>({ total: 0, totalPages: 1 });
  const [assigningUser, setAssigningUser] = useState<UserWithRoles | null>(null);

  const PAGE_SIZE = 10;

  // ── Load permissions & roles on mount ──────────────────────────────────────

  useEffect(() => {
    loadPermissions();
    loadRoles();
  }, []);

  async function loadPermissions() {
    setLoadingPerms(true);
    try {
      const data = await usersApi.listAllPermissions();
      setPermissions(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load permissions');
    } finally {
      setLoadingPerms(false);
    }
  }

  async function loadRoles() {
    setLoadingRoles(true);
    try {
      const data = await usersApi.listRoles();
      const list: Role[] = Array.isArray(data) ? data : [];
      setRoles(list);
      if (list.length > 0 && !selectedRole) {
        const first = list[0];
        setSelectedRole(first);
        setPendingPermIds(new Set(first.permissions.map((p: Permission) => p.id)));
      }
    } catch {
      toast.error('Failed to load roles');
    } finally {
      setLoadingRoles(false);
    }
  }

  // ── Load users when tab changes ─────────────────────────────────────────────

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers(1, userSearch);
    }
  }, [activeTab]);

  async function loadUsers(page: number, search: string) {
    setLoadingUsers(true);
    try {
      const result = await usersApi.listUsersWithRoles({ page, limit: PAGE_SIZE, search: search || undefined });
      const list: UserWithRoles[] = Array.isArray(result?.data) ? result.data : [];
      setUsers(list);
      setUserMeta({
        total: result?.meta?.total ?? list.length,
        totalPages: result?.meta?.totalPages ?? 1,
      });
    } catch {
      toast.error('Failed to load users');
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }

  // Search debounce
  useEffect(() => {
    if (activeTab !== 'users') return;
    const t = setTimeout(() => {
      setUserPage(1);
      loadUsers(1, userSearch);
    }, 350);
    return () => clearTimeout(t);
  }, [userSearch]);

  // ── Select role ─────────────────────────────────────────────────────────────

  function selectRole(role: Role) {
    setSelectedRole(role);
    setPendingPermIds(new Set(role.permissions.map((p) => p.id)));
  }

  // ── Toggle permission ───────────────────────────────────────────────────────

  function togglePermission(permId: string) {
    if (!selectedRole || selectedRole.isSystem) return;
    setPendingPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  }

  // ── Save permissions ────────────────────────────────────────────────────────

  async function savePermissions() {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const updated = await usersApi.setRolePermissions(selectedRole.id, [...pendingPermIds]);
      toast.success(`Permissions saved for "${selectedRole.displayName}"`);
      // Reload roles and update selectedRole
      const freshRoles = await usersApi.listRoles();
      const list: Role[] = Array.isArray(freshRoles) ? freshRoles : [];
      setRoles(list);
      const fresh = list.find((r) => r.id === selectedRole.id) ?? (updated as Role);
      setSelectedRole(fresh);
      setPendingPermIds(new Set((fresh as Role).permissions.map((p) => p.id)));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(error?.response?.data?.error?.message ?? 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  }

  // ── Resource groups ─────────────────────────────────────────────────────────

  const resourceGroups = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of permissions) {
      if (!map.has(p.resource)) map.set(p.resource, []);
      map.get(p.resource)!.push(p);
    }
    return map;
  }, [permissions]);

  // ── Pending changes indicator ───────────────────────────────────────────────

  const hasPendingChanges = useMemo(() => {
    if (!selectedRole) return false;
    const original = new Set(selectedRole.permissions.map((p) => p.id));
    if (original.size !== pendingPermIds.size) return true;
    for (const id of pendingPermIds) {
      if (!original.has(id)) return true;
    }
    return false;
  }, [selectedRole, pendingPermIds]);

  // ── Resource group: select all / none ──────────────────────────────────────

  function toggleResourceGroup(resource: string, perms: Permission[]) {
    if (!selectedRole || selectedRole.isSystem) return;
    const ids = perms.map((p) => p.id);
    const allChecked = ids.every((id) => pendingPermIds.has(id));
    setPendingPermIds((prev) => {
      const next = new Set(prev);
      if (allChecked) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2
          className="text-xl font-bold text-white"
          style={{ fontFamily: 'Plus Jakarta Sans' }}
        >
          Roles &amp; Permissions
        </h2>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Control access and permissions across the system
        </p>
      </div>

      {/* Tab Bar */}
      <div
        className="flex gap-1 p-1 w-fit rounded-xl"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {(
          [
            { key: 'roles', label: 'Roles & Permissions', icon: Lock },
            { key: 'users', label: 'User Roles', icon: Users },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={
              activeTab === key
                ? { background: 'rgba(99,102,241,0.18)', color: '#818cf8' }
                : { color: 'rgba(255,255,255,0.45)' }
            }
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Roles & Permissions ────────────────────────────────────────── */}
      {activeTab === 'roles' && (
        <div className="grid lg:grid-cols-3 gap-4 items-start">
          {/* Left: Role List */}
          <div
            className="rounded-2xl p-3 flex flex-col gap-1"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {/* Header row */}
            <div className="flex items-center justify-between px-2 py-1.5 mb-1">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Roles ({roles.length})
              </p>
              <button
                onClick={() => setShowCreateDialog(true)}
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all"
                style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
              >
                <Plus size={12} /> New Role
              </button>
            </div>

            {loadingRoles ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 rounded-xl animate-pulse"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                />
              ))
            ) : roles.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                No roles yet
              </p>
            ) : (
              roles.map((role) => {
                const isSelected = selectedRole?.id === role.id;
                return (
                  <div
                    key={role.id}
                    className="relative group"
                    onMouseEnter={() => setHoveredRoleId(role.id)}
                    onMouseLeave={() => setHoveredRoleId(null)}
                  >
                    <button
                      onClick={() => selectRole(role)}
                      className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                      style={{
                        background: isSelected ? 'rgba(99,102,241,0.1)' : 'transparent',
                        border: `1px solid ${isSelected ? 'rgba(99,102,241,0.35)' : 'transparent'}`,
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: isSelected ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                        }}
                      >
                        <Shield size={14} style={{ color: isSelected ? '#818cf8' : 'rgba(255,255,255,0.4)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-sm font-medium truncate"
                            style={{ color: isSelected ? '#c7d2fe' : 'rgba(255,255,255,0.75)' }}
                          >
                            {role.displayName}
                          </span>
                          {role.isSystem && (
                            <span
                              className="text-xs px-1.5 rounded flex-shrink-0"
                              style={{
                                background: 'rgba(245,158,11,0.12)',
                                color: '#f59e0b',
                                fontSize: '10px',
                                padding: '1px 5px',
                              }}
                            >
                              System
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          {role.permissions.length} permissions
                        </p>
                      </div>
                      {isSelected && (
                        <ChevronRight size={13} style={{ color: '#6366f1', flexShrink: 0 }} />
                      )}
                    </button>

                    {/* Edit button — only for non-system roles */}
                    {!role.isSystem && hoveredRoleId === role.id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingRole(role); }}
                        className="absolute right-10 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:bg-white/15"
                        style={{ background: 'rgba(255,255,255,0.07)' }}
                        title="Edit role"
                      >
                        <Pencil size={11} style={{ color: 'rgba(255,255,255,0.5)' }} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Permission Matrix */}
          <div
            className="lg:col-span-2 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {!selectedRole ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Lock size={32} style={{ color: 'rgba(255,255,255,0.15)' }} />
                <p className="mt-3 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Select a role to manage permissions
                </p>
              </div>
            ) : (
              <>
                {/* Matrix Header */}
                <div
                  className="flex items-center justify-between px-5 py-4"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(99,102,241,0.15)' }}
                    >
                      <Shield size={15} style={{ color: '#6366f1' }} />
                    </div>
                    <div>
                      <p
                        className="text-sm font-semibold text-white"
                        style={{ fontFamily: 'Plus Jakarta Sans' }}
                      >
                        {selectedRole.displayName}
                      </p>
                      {selectedRole.isSystem && (
                        <p className="text-xs" style={{ color: 'rgba(245,158,11,0.8)' }}>
                          System role — permissions are read-only
                        </p>
                      )}
                      {!selectedRole.isSystem && hasPendingChanges && (
                        <p className="text-xs" style={{ color: 'rgba(99,102,241,0.8)' }}>
                          You have unsaved changes
                        </p>
                      )}
                    </div>
                  </div>
                  {!selectedRole.isSystem && (
                    <button
                      onClick={savePermissions}
                      disabled={saving || !hasPendingChanges}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                      style={{
                        background:
                          hasPendingChanges
                            ? 'rgba(99,102,241,0.2)'
                            : 'rgba(255,255,255,0.05)',
                        color: hasPendingChanges ? '#818cf8' : 'rgba(255,255,255,0.3)',
                        border: `1px solid ${hasPendingChanges ? 'rgba(99,102,241,0.3)' : 'transparent'}`,
                        cursor: hasPendingChanges ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {saving ? <Spinner /> : <Save size={14} />}
                      {saving ? 'Saving...' : 'Save Permissions'}
                    </button>
                  )}
                </div>

                {/* Matrix Body */}
                <div
                  className="overflow-y-auto p-5 space-y-5"
                  style={{ maxHeight: '60vh' }}
                >
                  {loadingPerms ? (
                    Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={3} />)
                  ) : resourceGroups.size === 0 ? (
                    <p className="text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      No permissions defined
                    </p>
                  ) : (
                    Array.from(resourceGroups.entries()).map(([resource, perms]) => {
                      const allChecked = perms.every((p) => pendingPermIds.has(p.id));
                      const someChecked = perms.some((p) => pendingPermIds.has(p.id));
                      return (
                        <div key={resource}>
                          {/* Resource header */}
                          <div className="flex items-center gap-3 mb-2.5">
                            <button
                              type="button"
                              disabled={!!selectedRole.isSystem}
                              onClick={() => toggleResourceGroup(resource, perms)}
                              className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                              style={{
                                background:
                                  allChecked
                                    ? '#6366f1'
                                    : someChecked
                                    ? 'rgba(99,102,241,0.4)'
                                    : 'transparent',
                                border: `1.5px solid ${allChecked || someChecked ? '#6366f1' : 'rgba(255,255,255,0.2)'}`,
                                cursor: selectedRole.isSystem ? 'default' : 'pointer',
                              }}
                              title={allChecked ? 'Deselect all' : 'Select all'}
                            >
                              {allChecked && <Check size={9} className="text-white" />}
                              {!allChecked && someChecked && (
                                <div className="w-1.5 h-1.5 rounded-sm bg-indigo-300" />
                              )}
                            </button>
                            <p
                              className="text-xs font-bold uppercase tracking-widest"
                              style={{ color: 'rgba(255,255,255,0.5)' }}
                            >
                              {resource}
                            </p>
                            <div
                              className="flex-1 h-px"
                              style={{ background: 'rgba(255,255,255,0.05)' }}
                            />
                            <span
                              className="text-xs"
                              style={{ color: 'rgba(255,255,255,0.25)' }}
                            >
                              {perms.filter((p) => pendingPermIds.has(p.id)).length}/{perms.length}
                            </span>
                          </div>

                          {/* Actions grid */}
                          <div className="flex flex-wrap gap-2 pl-7">
                            {perms.map((perm) => {
                              const checked = pendingPermIds.has(perm.id);
                              const disabled = !!selectedRole.isSystem;
                              return (
                                <label
                                  key={perm.id}
                                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer select-none transition-all"
                                  style={{
                                    background: checked
                                      ? 'rgba(99,102,241,0.12)'
                                      : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${checked ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)'}`,
                                    cursor: disabled ? 'default' : 'pointer',
                                    opacity: disabled && !checked ? 0.5 : 1,
                                  }}
                                  title={perm.description}
                                >
                                  <div
                                    className="w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 transition-all"
                                    style={{
                                      background: checked ? '#6366f1' : 'transparent',
                                      border: `1.5px solid ${checked ? '#6366f1' : 'rgba(255,255,255,0.2)'}`,
                                    }}
                                  >
                                    {checked && <Check size={8} className="text-white" />}
                                  </div>
                                  <span
                                    className="text-xs font-medium"
                                    style={{ color: checked ? '#c7d2fe' : 'rgba(255,255,255,0.5)' }}
                                  >
                                    {perm.action}
                                  </span>
                                  <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={checked}
                                    disabled={disabled}
                                    onChange={() => togglePermission(perm.id)}
                                  />
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: User Roles ─────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div
          className="rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {/* Table header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p
              className="text-sm font-semibold text-white"
              style={{ fontFamily: 'Plus Jakarta Sans' }}
            >
              Users
            </p>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <Search size={13} style={{ color: 'rgba(255,255,255,0.35)' }} />
              <input
                className="bg-transparent outline-none text-sm w-48"
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{ color: 'rgba(255,255,255,0.75)' }}
              />
              {userSearch && (
                <button onClick={() => setUserSearch('')}>
                  <X size={12} style={{ color: 'rgba(255,255,255,0.35)' }} />
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {['Name', 'Email', 'Roles', 'Status', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'rgba(255,255,255,0.3)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingUsers ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="px-5 py-3">
                          <div
                            className="h-8 rounded-lg animate-pulse"
                            style={{ background: 'rgba(255,255,255,0.04)' }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      className="transition-all"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                      }}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
                          >
                            {getInitials(user.firstName, user.lastName)}
                          </div>
                          <span className="text-sm font-medium text-white">
                            {user.firstName} {user.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {user.email}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {user.userRoles.length === 0 ? (
                            <span
                              className="text-xs px-2 py-0.5 rounded-lg"
                              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}
                            >
                              No roles
                            </span>
                          ) : (
                            user.userRoles.map((ur) => (
                              <span
                                key={ur.role.id}
                                className="text-xs px-2 py-0.5 rounded-lg"
                                style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}
                              >
                                {ur.role.displayName}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="text-xs px-2.5 py-1 rounded-lg font-medium"
                          style={{
                            background:
                              user.status === 'ACTIVE'
                                ? 'rgba(16,185,129,0.1)'
                                : 'rgba(255,255,255,0.05)',
                            color:
                              user.status === 'ACTIVE' ? '#34d399' : 'rgba(255,255,255,0.4)',
                          }}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => setAssigningUser(user)}
                          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                          style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.2)';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.1)';
                          }}
                        >
                          <Shield size={11} />
                          Assign Roles
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {userMeta.totalPages > 1 && (
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
            >
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {userMeta.total} total users
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={userPage <= 1}
                  onClick={() => {
                    const newPage = userPage - 1;
                    setUserPage(newPage);
                    loadUsers(newPage, userSearch);
                  }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all"
                  style={{
                    background: userPage <= 1 ? 'transparent' : 'rgba(255,255,255,0.06)',
                    color: userPage <= 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)',
                  }}
                >
                  ‹
                </button>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {userPage} / {userMeta.totalPages}
                </span>
                <button
                  disabled={userPage >= userMeta.totalPages}
                  onClick={() => {
                    const newPage = userPage + 1;
                    setUserPage(newPage);
                    loadUsers(newPage, userSearch);
                  }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all"
                  style={{
                    background:
                      userPage >= userMeta.totalPages ? 'transparent' : 'rgba(255,255,255,0.06)',
                    color:
                      userPage >= userMeta.totalPages
                        ? 'rgba(255,255,255,0.2)'
                        : 'rgba(255,255,255,0.6)',
                  }}
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Dialogs / Drawers ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreateDialog && (
          <CreateRoleDialog
            onClose={() => setShowCreateDialog(false)}
            onCreated={(role) => {
              setRoles((prev) => [...prev, role]);
              selectRole(role);
              setShowCreateDialog(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingRole && (
          <EditRoleDialog
            role={editingRole}
            onClose={() => setEditingRole(null)}
            onUpdated={(updated) => {
              setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
              if (selectedRole?.id === updated.id) {
                setSelectedRole(updated);
              }
              setEditingRole(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {assigningUser && (
          <AssignRolesDrawer
            user={assigningUser}
            allRoles={roles}
            onClose={() => setAssigningUser(null)}
            onSaved={(updatedUser) => {
              setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
              setAssigningUser(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
