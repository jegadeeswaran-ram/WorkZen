'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Building2, Users, Shield, Bell, Globe, Save, UserPlus, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { settingsApi, usersApi } from '@/lib/api';
import { getInitials } from '@/lib/utils';

const SECTIONS = [
  { id: 'company', label: 'Company', icon: Building2, color: '#6366f1' },
  { id: 'users', label: 'Users & Roles', icon: Users, color: '#3b82f6' },
  { id: 'security', label: 'Security', icon: Shield, color: '#10b981' },
  { id: 'notifications', label: 'Notifications', icon: Bell, color: '#f59e0b' },
  { id: 'integrations', label: 'Integrations', icon: Globe, color: '#8b5cf6' },
];

const companySchema = z.object({
  name: z.string().min(2, 'Company name required'),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  cin: z.string().optional(),
  pfReg: z.string().optional(),
  esiReg: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
});

const inviteSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Valid email required'),
  roleId: z.string().min(1, 'Select a role'),
});

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className="relative w-11 h-6 rounded-full transition-all flex-shrink-0"
      style={{ background: value ? '#6366f1' : 'rgba(255,255,255,0.12)' }}>
      <span className="absolute top-1 transition-all w-4 h-4 rounded-full bg-white shadow"
        style={{ left: value ? '1.5rem' : '0.25rem' }} />
    </button>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="flex-1 pr-4">
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{description}</p>}
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [section, setSection] = useState('company');
  const [showInvite, setShowInvite] = useState(false);
  const [notif, setNotif] = useState({ email: true, sms: false, push: true, payroll: true, compliance: true, leaves: true, billing: false });
  const [sec, setSec] = useState({ twoFactor: false, sessionTimeout: '30', ipWhitelist: false, auditLog: true });
  const qc = useQueryClient();

  const { data: settings, isLoading: loadingSettings } = useQuery({ queryKey: ['tenant-settings'], queryFn: settingsApi.get });
  const { data: users, isLoading: loadingUsers } = useQuery({ queryKey: ['users-list'], queryFn: usersApi.list, enabled: section === 'users' });
  const { data: roles } = useQuery({ queryKey: ['roles-list'], queryFn: usersApi.roles, enabled: section === 'users' });

  const storedSettings = settings?.settings as Record<string, string> | undefined;

  const { register: rC, handleSubmit: hC, formState: { errors: eC } } = useForm({
    resolver: zodResolver(companySchema),
    values: settings ? {
      name: settings.name ?? '',
      gstin: storedSettings?.gstin ?? '',
      pan: storedSettings?.pan ?? '',
      cin: storedSettings?.cin ?? '',
      pfReg: storedSettings?.pfReg ?? '',
      esiReg: storedSettings?.esiReg ?? '',
      phone: storedSettings?.phone ?? '',
      email: storedSettings?.email ?? '',
      address: storedSettings?.address ?? '',
      website: storedSettings?.website ?? '',
    } : undefined,
  });

  const { register: rI, handleSubmit: hI, formState: { errors: eI }, reset: resetInvite } = useForm({ resolver: zodResolver(inviteSchema) });

  const updateMut = useMutation({
    mutationFn: (data: any) => {
      const { name, ...rest } = data;
      return settingsApi.update({ name, settings: rest });
    },
    onSuccess: () => { toast.success('Settings saved successfully'); qc.invalidateQueries({ queryKey: ['tenant-settings'] }); },
    onError: () => toast.error('Failed to save settings'),
  });

  const inviteMut = useMutation({
    mutationFn: (data: any) => usersApi.invite(data),
    onSuccess: () => { toast.success('User invited! Default password: Workzen@123!'); qc.invalidateQueries({ queryKey: ['users-list'] }); setShowInvite(false); resetInvite(); },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed to invite user'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>Settings</h2>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Manage your workspace preferences</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar nav */}
        <div className="glass-card p-2 h-fit">
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all mb-0.5"
              style={{ background: section === s.id ? `${s.color}18` : 'transparent', color: section === s.id ? s.color : 'rgba(255,255,255,0.5)' }}>
              <s.icon size={16} />
              <span className="text-sm font-medium flex-1 text-left">{s.label}</span>
              {section === s.id && <ChevronRight size={14} />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <motion.div key={section} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">

            {/* COMPANY */}
            {section === 'company' && (
              <form onSubmit={hC(d => updateMut.mutate(d))}>
                <h3 className="font-semibold text-white mb-6" style={{ fontFamily: 'Plus Jakarta Sans' }}>Company Information</h3>
                {loadingSettings ? (
                  <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />)}</div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>Company Name *</label>
                      <input {...rC('name')} className="input-field w-full" placeholder="WorkZen Security Services Pvt. Ltd." />
                      {eC.name && <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>{String(eC.name.message)}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        ['gstin','GST Number','27AADCB2230M1ZT'],
                        ['pan','PAN Number','AADCB2230M'],
                        ['cin','CIN','U74999MH2018PTC123456'],
                        ['pfReg','PF Registration','MHBAN0012345'],
                        ['esiReg','ESI Registration','31-00-123456-000-0001'],
                        ['phone','Phone','+91 98765 43210'],
                        ['email','Company Email','info@company.com'],
                        ['website','Website','https://company.com'],
                      ].map(([field, label, placeholder]) => (
                        <div key={field}>
                          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</label>
                          <input {...rC(field as any)} className="input-field w-full" placeholder={placeholder} />
                        </div>
                      ))}
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>Registered Address</label>
                      <textarea {...rC('address')} rows={3} className="input-field w-full resize-none" placeholder="Office No. 205, Tower B, Mumbai - 400001" />
                    </div>
                    <button type="submit" className="btn-primary" disabled={updateMut.isPending}>
                      <Save size={14} /> {updateMut.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </form>
            )}

            {/* USERS */}
            {section === 'users' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>Users & Roles</h3>
                  <button className="btn-primary" onClick={() => setShowInvite(v => !v)}>
                    <UserPlus size={14} /> {showInvite ? 'Cancel' : 'Invite User'}
                  </button>
                </div>

                {showInvite && (
                  <form onSubmit={hI(d => inviteMut.mutate(d))} className="mb-6 p-5 rounded-xl space-y-4"
                    style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <h4 className="font-medium text-white text-sm">Invite New User</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.5)' }}>First Name *</label>
                        <input {...rI('firstName')} className="input-field w-full" placeholder="John" />
                        {eI.firstName && <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>{String(eI.firstName.message)}</p>}
                      </div>
                      <div>
                        <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.5)' }}>Last Name *</label>
                        <input {...rI('lastName')} className="input-field w-full" placeholder="Doe" />
                      </div>
                      <div>
                        <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.5)' }}>Work Email *</label>
                        <input {...rI('email')} type="email" className="input-field w-full" placeholder="john.doe@company.com" />
                        {eI.email && <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>{String(eI.email.message)}</p>}
                      </div>
                      <div>
                        <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.5)' }}>Role *</label>
                        <select {...rI('roleId')} className="input-field w-full">
                          <option value="">Select a role</option>
                          {(roles ?? []).map((r: any) => <option key={r.id} value={r.id}>{r.displayName}</option>)}
                        </select>
                        {eI.roleId && <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>{String(eI.roleId.message)}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="btn-primary" disabled={inviteMut.isPending}>
                        {inviteMut.isPending ? 'Inviting...' : 'Send Invite'}
                      </button>
                      <button type="button" className="btn-secondary" onClick={() => { setShowInvite(false); resetInvite(); }}>Cancel</button>
                    </div>
                  </form>
                )}

                <div className="space-y-2">
                  {loadingUsers ? [...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />) :
                    (users ?? []).map((u: any) => (
                      <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                          {getInitials(u.firstName, u.lastName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{u.firstName} {u.lastName}</p>
                          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{u.email}</p>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-lg" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>
                          {u.userRoles?.[0]?.role?.displayName ?? 'No Role'}
                        </span>
                        <span className={`badge ${u.status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'} text-xs`}>{u.status}</span>
                      </div>
                    ))
                  }
                  {!loadingUsers && (users ?? []).length === 0 && (
                    <p className="text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No users yet. Invite your team to get started.</p>
                  )}
                </div>
              </div>
            )}

            {/* SECURITY */}
            {section === 'security' && (
              <div>
                <h3 className="font-semibold text-white mb-6" style={{ fontFamily: 'Plus Jakarta Sans' }}>Security Settings</h3>
                <SettingRow label="Two-Factor Authentication" description="Require 2FA for all users">
                  <Toggle value={sec.twoFactor} onChange={v => setSec(s => ({ ...s, twoFactor: v }))} />
                </SettingRow>
                <SettingRow label="IP Whitelist" description="Restrict login to specific IPs">
                  <Toggle value={sec.ipWhitelist} onChange={v => setSec(s => ({ ...s, ipWhitelist: v }))} />
                </SettingRow>
                <SettingRow label="Audit Logging" description="Log all user actions">
                  <Toggle value={sec.auditLog} onChange={v => setSec(s => ({ ...s, auditLog: v }))} />
                </SettingRow>
                <SettingRow label="Session Timeout" description="Auto-logout after inactivity">
                  <select className="input-field" value={sec.sessionTimeout} onChange={e => setSec(s => ({ ...s, sessionTimeout: e.target.value }))} style={{ width: 'auto' }}>
                    {[['15','15 min'],['30','30 min'],['60','1 hour'],['120','2 hours'],['480','8 hours']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </SettingRow>
                <button className="btn-primary mt-6" onClick={() => toast.success('Security settings saved')}><Save size={14} /> Save</button>
              </div>
            )}

            {/* NOTIFICATIONS */}
            {section === 'notifications' && (
              <div>
                <h3 className="font-semibold text-white mb-6" style={{ fontFamily: 'Plus Jakarta Sans' }}>Notification Preferences</h3>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Delivery Channels</p>
                {[{k:'email',l:'Email Notifications',d:'Alerts via email'},{k:'sms',l:'SMS Notifications',d:'Critical alerts via SMS'},{k:'push',l:'Push Notifications',d:'Browser push'}].map(n => (
                  <SettingRow key={n.k} label={n.l} description={n.d}>
                    <Toggle value={(notif as any)[n.k]} onChange={v => setNotif(s => ({ ...s, [n.k]: v }))} />
                  </SettingRow>
                ))}
                <p className="text-xs font-semibold uppercase tracking-wider mt-6 mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Event Triggers</p>
                {[{k:'payroll',l:'Payroll Processed',d:'Monthly payroll complete'},{k:'compliance',l:'Compliance Due',d:'7 days before deadline'},{k:'leaves',l:'Leave Requests',d:'New pending approvals'},{k:'billing',l:'Invoice Overdue',d:'Overdue payment alerts'}].map(n => (
                  <SettingRow key={n.k} label={n.l} description={n.d}>
                    <Toggle value={(notif as any)[n.k]} onChange={v => setNotif(s => ({ ...s, [n.k]: v }))} />
                  </SettingRow>
                ))}
                <button className="btn-primary mt-6" onClick={() => toast.success('Preferences saved')}><Save size={14} /> Save</button>
              </div>
            )}

            {/* INTEGRATIONS */}
            {section === 'integrations' && (
              <div>
                <h3 className="font-semibold text-white mb-6" style={{ fontFamily: 'Plus Jakarta Sans' }}>Integrations</h3>
                <div className="space-y-3">
                  {[
                    { name: 'WhatsApp (WATI)', desc: 'WhatsApp Business API notifications', connected: false, color: '#25D366', emoji: '💬' },
                    { name: 'Twilio SMS', desc: 'SMS notifications & OTP delivery', connected: false, color: '#F22F46', emoji: '📱' },
                    { name: 'AWS S3 / MinIO', desc: 'Document & file storage', connected: true, color: '#FF9900', emoji: '☁️' },
                    { name: 'Firebase FCM', desc: 'Mobile push notifications', connected: false, color: '#FFCA28', emoji: '🔔' },
                    { name: 'EPFO Portal', desc: 'Automated PF ECR filing', connected: false, color: '#6366f1', emoji: '🏛️' },
                    { name: 'GST Portal', desc: 'E-invoice & GSTR filing', connected: false, color: '#10b981', emoji: '📋' },
                  ].map(intg => (
                    <div key={intg.name} className="flex items-center gap-4 p-4 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{ background: `${intg.color}15`, border: `1px solid ${intg.color}20` }}>{intg.emoji}</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{intg.name}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{intg.desc}</p>
                      </div>
                      <span className={`badge ${intg.connected ? 'badge-success' : 'badge-neutral'}`}>{intg.connected ? 'Connected' : 'Not Connected'}</span>
                      <button className="btn-secondary text-xs py-1.5 px-3">{intg.connected ? 'Configure' : 'Connect'}</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
