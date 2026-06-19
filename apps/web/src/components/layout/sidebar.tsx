'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FileText, Building2, Users, UserSearch, MapPin,
  Clock, CreditCard, Shield, Receipt, TrendingUp, Package,
  FolderOpen, GitBranch, BarChart3, Settings, ChevronRight,
  LogOut, Bell, ChevronDown, FileSpreadsheet, Tag, Percent,
  BookOpen, BookMarked, Landmark, DollarSign, Database, Lock,
  Network, RefreshCw, AlertTriangle, Star, GraduationCap, Target,
  Briefcase, Truck, UserCheck, CalendarDays, AlertCircle, ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type React from 'react';

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
  roles?: string[];
};

type NavGroup = {
  label: string;
  items: NavItem[];
  roles?: string[];
};

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard',  href: '/dashboard', icon: LayoutDashboard },
      { label: 'Calendar',   href: '/calendar',  icon: CalendarDays    },
    ],
  },
  {
    label: 'Contracts & Business',
    items: [
      { label: 'Tenders', href: '/tenders', icon: FileText, badge: '3' },
      { label: 'Clients', href: '/clients', icon: Building2 },
      { label: 'Work Orders', href: '/work-orders', icon: Briefcase },
    ],
  },
  {
    label: 'Workforce',
    items: [
      { label: 'Employees', href: '/employees', icon: Users },
      { label: 'Organization', href: '/organization', icon: Network },
      { label: 'Deployment', href: '/deployment', icon: MapPin },
      { label: 'Attendance', href: '/attendance', icon: Clock },
    ],
  },
  {
    label: 'Talent & Growth',
    items: [
      { label: 'Recruitment', href: '/recruitment', icon: UserSearch },
      { label: 'Employee Lifecycle', href: '/employees/lifecycle', icon: RefreshCw },
      { label: 'Performance', href: '/talent/performance', icon: Target },
      { label: 'Training', href: '/talent/training', icon: GraduationCap },
    ],
  },
  {
    label: 'Payroll & Compliance',
    items: [
      { label: 'Payroll', href: '/payroll', icon: CreditCard },
      { label: 'Compliance', href: '/compliance', icon: Shield },
    ],
  },
  {
    label: 'Supervisor',
    items: [
      { label: 'Sites Overview', href: '/supervisor/sites', icon: MapPin, roles: ['SITE_SUPERVISOR', 'HR_MANAGER', 'OPERATIONS_MANAGER'] },
      { label: 'Complaints', href: '/supervisor/complaints', icon: AlertCircle, roles: ['SITE_SUPERVISOR', 'HR_MANAGER'] },
      { label: 'Activity Log', href: '/supervisor/activity', icon: ClipboardList, roles: ['SITE_SUPERVISOR', 'HR_MANAGER'] },
    ],
    roles: ['SITE_SUPERVISOR', 'HR_MANAGER', 'OPERATIONS_MANAGER'],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Assets', href: '/assets', icon: Package },
      { label: 'Documents', href: '/documents', icon: FolderOpen },
      { label: 'Workflows', href: '/workflows', icon: GitBranch },
      { label: 'Logistics', href: '/logistics', icon: Truck },
      { label: 'Visitors', href: '/visitors', icon: UserCheck },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { label: 'Reports', href: '/reports', icon: BarChart3 },
      { label: 'Notifications', href: '/notifications', icon: Bell },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Security', href: '/security', icon: AlertTriangle },
      { label: 'Masters', href: '/masters', icon: Database },
    ],
  },
];

// Billing & Finance sub-items with optional section dividers
const billingFinanceItems = [
  { type: 'item' as const, label: 'Dashboard', href: '/finance', icon: LayoutDashboard },
  { type: 'divider' as const, label: 'Billing' },
  { type: 'item' as const, label: 'Billing Sheets', href: '/billing/sheets', icon: FileSpreadsheet },
  { type: 'item' as const, label: 'Invoice Management', href: '/billing', icon: Receipt },
  { type: 'item' as const, label: 'Rate Management', href: '/finance/rates', icon: Tag },
  { type: 'divider' as const, label: 'Finance' },
  { type: 'item' as const, label: 'Accounts Receivable', href: '/finance/receivables', icon: Users },
  { type: 'item' as const, label: 'GST Management', href: '/finance/gst', icon: Percent },
  { type: 'item' as const, label: 'Voucher Entry', href: '/finance/vouchers', icon: BookOpen },
  { type: 'item' as const, label: 'Day Book & Ledger', href: '/finance/ledger', icon: BookMarked },
  { type: 'item' as const, label: 'Banking', href: '/finance/banking', icon: Landmark },
  { type: 'divider' as const, label: 'Reports' },
  { type: 'item' as const, label: 'Financial Statements', href: '/finance/statements', icon: BarChart3 },
  { type: 'item' as const, label: 'Tender Profitability', href: '/finance/profitability', icon: TrendingUp },
  { type: 'item' as const, label: 'Revenue Management', href: '/finance/revenue', icon: DollarSign },
];

// Paths that belong to the Billing & Finance section
const billingFinancePaths = billingFinanceItems
  .filter((i) => i.type === 'item')
  .map((i) => (i as { type: 'item'; label: string; href: string; icon: React.ComponentType<{ size?: number; className?: string }> }).href);

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed } = useUiStore();
  const { clearAuth, roles } = useAuthStore();
  const router = useRouter();

  // Helper function to check if user has required roles
  const hasRequiredRole = (requiredRoles?: string[]): boolean => {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    if (roles.includes('SUPER_ADMIN') || roles.includes('COMPANY_OWNER')) return true;
    return requiredRoles.some((role) => roles.includes(role));
  };

  // Auto-open when current path is inside Billing & Finance
  const billingFinanceActive = billingFinancePaths.some(
    (href) => pathname === href || pathname.startsWith(href + '/'),
  );
  const [billingFinanceOpen, setBillingFinanceOpen] = useState(billingFinanceActive);

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  return (
    <aside
      className="fixed top-0 left-0 h-screen flex flex-col z-30 transition-all duration-300"
      style={{
        width: sidebarCollapsed ? '72px' : '260px',
        background: 'var(--wz-sidebar-bg)',
        borderRight: '1px solid var(--wz-sidebar-border)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: 'var(--wz-sidebar-border)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', boxShadow: '0 0 15px rgba(99,102,241,0.35)' }}>
          <span className="text-white font-bold text-sm">W</span>
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}>
              <div className="text-white font-bold text-base leading-none" style={{ fontFamily: 'Plus Jakarta Sans' }}>WorkZen</div>
              <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>ERP Platform</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {navGroups.map((group, groupIdx) => {
          // Check if user has access to this group
          if (!hasRequiredRole(group.roles)) return null;

          // Filter items based on role access
          const visibleItems = group.items.filter((item) => hasRequiredRole(item.roles));
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label} className={groupIdx > 0 ? 'mt-4' : ''}>
              {/* Section label — hidden when collapsed */}
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="px-3 pb-1 text-xs font-semibold uppercase tracking-widest select-none"
                    style={{ color: 'var(--wz-sidebar-label)' }}
                  >
                    {group.label}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Thin divider between groups when collapsed */}
              {sidebarCollapsed && groupIdx > 0 && (
                <div className="mx-3 mb-2 border-t" style={{ borderColor: 'var(--wz-sidebar-border)' }} />
              )}

              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link key={item.href} href={item.href}>
                      <div className={cn('sidebar-link', active && 'active')} title={sidebarCollapsed ? item.label : undefined}>
                        <item.icon size={18} className="flex-shrink-0 sidebar-icon" />
                        {!sidebarCollapsed && <span className="flex-1 text-sm">{item.label}</span>}
                        {!sidebarCollapsed && item.badge && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                            style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', border: '1px solid rgba(244,63,94,0.2)' }}>
                            {item.badge}
                          </span>
                        )}
                        {active && !sidebarCollapsed && <ChevronRight size={14} style={{ color: '#818cf8', opacity: 0.6 }} />}
                      </div>
                    </Link>
                  );
                })}

                {/* Billing & Finance accordion — injected after Payroll & Compliance group */}
                {group.label === 'Payroll & Compliance' && (
                  <div>
                    {/* Accordion trigger */}
                    <button
                      onClick={() => setBillingFinanceOpen((prev) => !prev)}
                      title={sidebarCollapsed ? 'Billing & Finance' : undefined}
                      className={cn(
                        'sidebar-link w-full text-left',
                        billingFinanceActive && 'active',
                      )}
                    >
                      <Receipt size={18} className="flex-shrink-0 sidebar-icon" />
                      {!sidebarCollapsed && <span className="flex-1 text-sm">Billing &amp; Finance</span>}
                      {!sidebarCollapsed && (
                        <motion.span
                          animate={{ rotate: billingFinanceOpen ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ display: 'flex' }}
                        >
                          <ChevronDown size={14} style={{ color: '#818cf8', opacity: 0.6 }} />
                        </motion.span>
                      )}
                    </button>

                    {/* Accordion body */}
                    <AnimatePresence initial={false}>
                      {billingFinanceOpen && !sidebarCollapsed && (
                        <motion.div
                          key="billing-finance-menu"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div className="ml-3 mt-0.5 space-y-0.5 border-l" style={{ borderColor: 'var(--wz-sidebar-border)' }}>
                            {billingFinanceItems.map((entry, idx) => {
                              if (entry.type === 'divider') {
                                return (
                                  <div
                                    key={`divider-${idx}`}
                                    className="px-3 pt-3 pb-0.5 text-xs font-semibold uppercase tracking-widest select-none"
                                    style={{ color: 'var(--wz-sidebar-label)' }}
                                  >
                                    {entry.label}
                                  </div>
                                );
                              }

                              const item = entry as {
                                type: 'item';
                                label: string;
                                href: string;
                                icon: React.ComponentType<{ size?: number; className?: string }>;
                              };
                              const active = pathname === item.href || pathname.startsWith(item.href + '/');

                              return (
                                <Link key={item.href} href={item.href}>
                                  <div
                                    className={cn('sidebar-link pl-3', active && 'active')}
                                    title={undefined}
                                  >
                                    <item.icon size={15} className="flex-shrink-0 sidebar-icon" />
                                    <span className="flex-1 text-sm">{item.label}</span>
                                    {active && <ChevronRight size={12} style={{ color: '#818cf8', opacity: 0.6 }} />}
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Collapsed state: show sub-items as tooltipped icons */}
                    {billingFinanceOpen && sidebarCollapsed && (
                      <div className="mt-0.5 space-y-0.5">
                        {billingFinanceItems
                          .filter((e) => e.type === 'item')
                          .map((entry) => {
                            const item = entry as {
                              type: 'item';
                              label: string;
                              href: string;
                              icon: React.ComponentType<{ size?: number; className?: string }>;
                            };
                            const active = pathname === item.href || pathname.startsWith(item.href + '/');
                            return (
                              <Link key={item.href} href={item.href}>
                                <div className={cn('sidebar-link justify-center', active && 'active')} title={item.label}>
                                  <item.icon size={15} className="flex-shrink-0 sidebar-icon" />
                                </div>
                              </Link>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Settings + Profile */}
      <div className="px-2 pb-4 space-y-0.5 border-t pt-2" style={{ borderColor: 'var(--wz-sidebar-border)' }}>
        <Link href="/settings">
          <div className={cn('sidebar-link', pathname === '/settings' && 'active')}>
            <Settings size={18} className="flex-shrink-0" />
            {!sidebarCollapsed && <span className="flex-1 text-sm">Settings</span>}
          </div>
        </Link>
        <Link href="/settings/permissions">
          <div className={cn('sidebar-link', pathname.startsWith('/settings/permissions') && 'active')}>
            <Lock size={18} className="flex-shrink-0" />
            {!sidebarCollapsed && <span className="flex-1 text-sm">Permissions</span>}
          </div>
        </Link>
        <button onClick={handleLogout} className="sidebar-link w-full text-left" style={{ color: 'rgba(244,63,94,0.7)' }}>
          <LogOut size={18} className="flex-shrink-0" />
          {!sidebarCollapsed && <span className="flex-1 text-sm">Sign out</span>}
        </button>

        {!sidebarCollapsed && (
          <div className="mt-3 mx-1 p-3 rounded-xl flex items-center gap-3"
            style={{ background: 'var(--wz-input-bg)', border: '1px solid var(--wz-input-border)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #8b5cf6)', color: 'white' }}>
              JD
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: 'var(--wz-text-primary)' }}>John Doe</div>
              <div className="text-xs truncate" style={{ color: 'var(--wz-text-muted)' }}>Company Owner</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
