'use client';

import { Bell, Search, Menu, Sun, Moon, Plus, FileText, Users, Building2, Receipt, Briefcase, X } from 'lucide-react';
import { useUiStore } from '@/stores/ui.store';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState, useRef } from 'react';

const QUICK_CREATE_ITEMS = [
  { label: 'New Tender',    icon: FileText,   route: '/tenders?create=true',    color: '#818cf8' },
  { label: 'New Client',    icon: Building2,  route: '/clients?create=true',    color: '#34d399' },
  { label: 'New Employee',  icon: Users,      route: '/employees?create=true',  color: '#60a5fa' },
  { label: 'New Invoice',   icon: Receipt,    route: '/billing?create=true',    color: '#f59e0b' },
  { label: 'New Work Order',icon: Briefcase,  route: '/work-orders?create=true',color: '#f472b6' },
];

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/tenders': 'Tender Management',
  '/work-orders': 'Work Orders',
  '/clients': 'Client Management',
  '/employees': 'Employee Management',
  '/recruitment': 'Recruitment',
  '/deployment': 'Deployment Management',
  '/attendance': 'Attendance',
  '/payroll': 'Payroll',
  '/compliance': 'Compliance',
  '/billing': 'Billing & Invoicing',
  '/finance': 'Finance',
  '/assets': 'Asset Management',
  '/documents': 'Documents',
  '/workflows': 'Workflows',
  '/reports': 'Reports & Analytics',
  '/logistics': 'Logistics',
  '/visitors': 'Visitor Management',
  '/settings': 'Settings',
};

const SEARCHABLE_SECTIONS = [
  '/employees', '/clients', '/tenders', '/payroll', '/compliance',
  '/attendance', '/recruitment', '/assets', '/documents', '/visitors',
];

export function Header() {
  const { toggleSidebar } = useUiStore();
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const title = pageTitles[pathname] ?? pageTitles[`/${pathname.split('/')[1]}`] ?? 'WorkZen';

  const [mounted, setMounted] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const quickCreateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (quickCreateRef.current && !quickCreateRef.current.contains(e.target as Node)) {
        setShowQuickCreate(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !globalSearch.trim()) return;
    const currentSection = `/${pathname.split('/')[1]}`;
    const target = SEARCHABLE_SECTIONS.includes(currentSection) ? currentSection : '/employees';
    router.push(`${target}?search=${encodeURIComponent(globalSearch.trim())}`);
    setGlobalSearch('');
    searchRef.current?.blur();
  };

  const isDark = resolvedTheme === 'dark';

  return (
    <header
      className="fixed top-0 right-0 z-20 flex items-center px-6 gap-4 transition-all duration-300"
      style={{
        left: 'var(--sidebar-current-width, 260px)',
        height: '64px',
        background: 'var(--wz-header-bg)',
        borderBottom: '1px solid var(--wz-header-border)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Sidebar toggle */}
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
        style={{ color: 'var(--wz-text-muted)' }}
      >
        <Menu size={18} />
      </button>

      {/* Page title */}
      <div className="flex-1">
        <h1 className="text-base font-semibold" style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--wz-text-primary)' }}>
          {title}
        </h1>
      </div>

      {/* Search */}
      <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl w-64"
        style={{ background: 'var(--wz-input-bg)', border: '1px solid var(--wz-input-border)' }}>
        <Search size={14} style={{ color: 'var(--wz-text-muted)' }} />
        <input
          ref={searchRef}
          value={globalSearch}
          onChange={e => setGlobalSearch(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search... (⌘K)"
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: 'var(--wz-text-secondary)' }}
        />
      </div>

      {/* Theme toggle */}
      {mounted && (
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="p-2 rounded-xl transition-all duration-200"
          style={{ background: 'var(--wz-input-bg)', border: '1px solid var(--wz-input-border)', color: 'var(--wz-text-secondary)' }}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      )}

      {/* Notifications */}
      <button className="relative p-2 rounded-xl transition-all"
        style={{ background: 'var(--wz-input-bg)', border: '1px solid var(--wz-input-border)' }}>
        <Bell size={16} style={{ color: 'var(--wz-text-muted)' }} />
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full"
          style={{ background: '#f43f5e', boxShadow: '0 0 6px rgba(244,63,94,0.6)' }} />
      </button>

      {/* Quick create */}
      <div className="relative" ref={quickCreateRef}>
        <button
          className="btn-primary px-3 py-2"
          onClick={() => setShowQuickCreate(v => !v)}
        >
          <Plus size={15} />
          <span className="hidden sm:block">New</span>
        </button>

        {showQuickCreate && (
          <div
            className="absolute right-0 top-12 z-50 w-52 rounded-2xl overflow-hidden"
            style={{ background: 'var(--wz-card-bg)', border: '1px solid var(--wz-card-border)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}
          >
            <div className="px-4 pt-3 pb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wz-text-muted)' }}>Quick Create</span>
              <button onClick={() => setShowQuickCreate(false)} style={{ color: 'var(--wz-text-muted)' }}><X size={12} /></button>
            </div>
            {QUICK_CREATE_ITEMS.map(item => (
              <button
                key={item.route}
                onClick={() => { router.push(item.route); setShowQuickCreate(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left"
                style={{ color: 'var(--wz-text-secondary)' }}
                onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${item.color}18`, border: `1px solid ${item.color}30` }}>
                  <item.icon size={13} style={{ color: item.color }} />
                </div>
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
            <div className="h-2" />
          </div>
        )}
      </div>
    </header>
  );
}
