'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  Eye, EyeOff, Loader2, Shield, Zap, BarChart3, Users,
  FileText, CreditCard, MapPin, CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';
import { authApi } from '@/lib/api';

const loginSchema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(6, 'Minimum 6 characters'),
  totpCode: z.string().optional(),
});
type LoginForm = z.infer<typeof loginSchema>;

const features = [
  { icon: FileText,   label: 'Tender & Contract Management',  color: '#818cf8' },
  { icon: Users,      label: 'Employee & Payroll Engine',      color: '#34d399' },
  { icon: Shield,     label: 'Compliance Automation',          color: '#60a5fa' },
  { icon: BarChart3,  label: 'Real-time Analytics Dashboard',  color: '#f59e0b' },
  { icon: CreditCard, label: 'Billing & Invoice Management',   color: '#f472b6' },
  { icon: MapPin,     label: 'Multi-site Deployment Tracking', color: '#a78bfa' },
];

const stats = [
  { value: '10K+',  label: 'Employees' },
  { value: '500+',  label: 'Tenders'   },
  { value: '99.9%', label: 'Uptime'    },
];

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [requires2fa, setRequires2fa]   = useState(false);
  const [isLoading, setIsLoading]       = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(data: LoginForm) {
    setIsLoading(true);
    try {
      const res = await authApi.login(data);
      if (res.requiresTwoFactor) {
        setRequires2fa(true);
        toast.info('Enter your 2FA code');
        return;
      }
      setAuth(res.accessToken, res.refreshToken, res.userId, res.tenantId, res.roles ?? []);
      router.push('/dashboard');
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { error?: { message?: string } } } })
          .response?.data?.error?.message ?? 'Login failed. Check credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  const fillDemo = (email: string, password = 'Admin@123!') => {
    setValue('email', email);
    setValue('password', password);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#060e1a', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── Left branding panel ── */}
      <div style={{
        width: '52%', display: 'none', flexDirection: 'column', padding: '48px',
        position: 'relative', overflow: 'hidden',
      }} className="lg-flex">
        <style>{`
          @media (min-width: 1024px) { .lg-flex { display: flex !important; } }
          input:-webkit-autofill { -webkit-box-shadow: 0 0 0 100px rgba(255,255,255,0.05) inset !important; -webkit-text-fill-color: rgba(255,255,255,0.9) !important; }
        `}</style>

        {/* Blobs */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.08) 0%, transparent 60%), radial-gradient(ellipse at 60% 80%, rgba(139,92,246,0.08) 0%, transparent 50%)' }} />

        {/* Grid pattern */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.03,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)',
          backgroundSize: '40px 40px' }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Logo */}
          <div>
            <Image
              src="/logos/web-login-dark.svg"
              alt="WorkZen ERP"
              width={1120}
              height={300}
              priority
              unoptimized
              style={{ height: 150, width: 'auto' }}
            />
          </div>

          {/* Hero */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 48 }}>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <h1 style={{
                fontSize: 44, fontWeight: 800, lineHeight: 1.15, marginBottom: 16,
                fontFamily: 'Plus Jakarta Sans',
                background: 'linear-gradient(135deg,#fff 0%,rgba(255,255,255,0.7) 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                Enterprise ERP<br />for Manpower<br />Companies
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 16, marginBottom: 40, lineHeight: 1.6 }}>
                Manage tenders, employees, payroll, and compliance —<br />all in one powerful platform.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {features.map((f, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                      background: `${f.color}18`, border: `1px solid ${f.color}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <f.icon size={15} color={f.color} />
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>{f.label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {stats.map(s => (
              <div key={s.label} style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14, padding: '16px 12px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#818cf8', fontFamily: 'Plus Jakarta Sans' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right login panel ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          style={{ width: '100%', maxWidth: 420 }}>

          {/* Mobile logo — shown only when left panel is hidden */}
          <div style={{ marginBottom: 32 }} className="mobile-logo">
            <style>{`.mobile-logo { display: block; } @media (min-width: 1024px) { .mobile-logo { display: none; } }`}</style>
            <Image
              src="/logos/web-login-dark.svg"
              alt="WorkZen ERP"
              width={440}
              height={120}
              priority
              unoptimized
              style={{ height: 104, width: 'auto' }}
            />
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ color: '#fff', fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 30, margin: '0 0 6px' }}>
              Welcome back 👋
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0 }}>
              Sign in to your WorkZen dashboard
            </p>
          </div>

          {/* Demo quick-login */}
          <div style={{
            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 12, padding: '12px 14px', marginBottom: 24,
          }}>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Demo accounts
            </p>

            {/* Admin roles */}
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Admin · <code style={{ color: 'rgba(129,140,248,0.7)', fontStyle: 'normal' }}>Admin@123!</code>
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {[
                { label: 'Super Admin',    email: 'admin@workzen.in' },
                { label: 'HR Manager',     email: 'hr@workzen.in' },
                { label: 'Payroll Mgr',    email: 'payroll@workzen.in' },
                { label: 'Finance Mgr',    email: 'finance@workzen.in' },
              ].map(d => (
                <button key={d.email} onClick={() => fillDemo(d.email, 'Admin@123!')}
                  style={{
                    background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
                    borderRadius: 8, padding: '4px 10px', color: '#818cf8', fontSize: 12,
                    cursor: 'pointer', fontWeight: 500, transition: 'all 0.15s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.22)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.12)'; }}>
                  {d.label}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '8px 0' }} />

            {/* Supervisor */}
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Site · <code style={{ color: 'rgba(52,211,153,0.7)', fontStyle: 'normal' }}>Admin@123!</code>
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                { label: 'Site Supervisor', email: 'supervisor@workzen.in' },
              ].map(d => (
                <button key={d.email} onClick={() => fillDemo(d.email, 'Admin@123!')}
                  style={{
                    background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)',
                    borderRadius: 8, padding: '4px 10px', color: '#34d399', fontSize: 12,
                    cursor: 'pointer', fontWeight: 500, transition: 'all 0.15s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.16)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.08)'; }}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                Email address
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="admin@workzen.redonix.in"
                autoComplete="email"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, padding: '12px 16px', color: 'rgba(255,255,255,0.9)',
                  fontSize: 14, outline: 'none', transition: 'border-color 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
              />
              {errors.email && <p style={{ color: '#f87171', fontSize: 12, marginTop: 4 }}>{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    width: '100%', boxSizing: 'border-box', paddingRight: 48,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12, padding: '12px 48px 12px 16px', color: 'rgba(255,255,255,0.9)',
                    fontSize: 14, outline: 'none', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 0 }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p style={{ color: '#f87171', fontSize: 12, marginTop: 4 }}>{errors.password.message}</p>}
            </div>

            {/* 2FA */}
            {requires2fa && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  Two-Factor Code
                </label>
                <input
                  {...register('totpCode')}
                  type="text" maxLength={6} placeholder="000000"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.4)',
                    borderRadius: 12, padding: '12px 16px', color: 'rgba(255,255,255,0.9)',
                    fontSize: 22, fontWeight: 700, outline: 'none', textAlign: 'center', letterSpacing: '0.3em',
                  }}
                />
              </motion.div>
            )}

            {/* Remember + forgot */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" style={{ accentColor: '#6366f1', width: 15, height: 15 }} />
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Remember me</span>
              </label>
              <a href="/forgot-password" style={{ color: '#818cf8', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>
                Forgot password?
              </a>
            </div>

            {/* Submit */}
            <button type="submit" disabled={isLoading} style={{
              width: '100%', padding: '14px 24px',
              background: isLoading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg,#4f46e5,#6366f1)',
              color: '#fff', border: 'none', borderRadius: 14,
              fontSize: 15, fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: isLoading ? 'none' : '0 4px 24px rgba(99,102,241,0.4)',
              transition: 'all 0.2s', fontFamily: 'Plus Jakarta Sans',
            }}
            onMouseOver={e => { if (!isLoading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(99,102,241,0.5)'; } }}
            onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(99,102,241,0.4)'; }}>
              {isLoading ? (
                <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Signing in...</>
              ) : (
                'Sign in to WorkZen'
              )}
            </button>
          </form>

          {/* Footer */}
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13, marginTop: 24 }}>
            Don't have an account?{' '}
            <a href="/register" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 500 }}>Start free trial</a>
          </p>

          {/* Security note */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 }}>
            <CheckCircle size={12} color="rgba(255,255,255,0.2)" />
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>256-bit SSL encrypted · SOC 2 compliant</span>
          </div>
        </motion.div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.2) !important; }
      `}</style>
    </div>
  );
}
