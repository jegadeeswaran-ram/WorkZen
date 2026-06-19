'use client';

import { Bell, Search, Menu, Sun, Moon, Plus } from 'lucide-react';
import { useUiStore } from '@/stores/ui.store';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState, useRef } from 'react';

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
  const searchRef = useRef<HTMLInputElement>(null);

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
      <button className="btn-primary px-3 py-2">
        <Plus size={15} />
        <span className="hidden sm:block">New</span>
      </button>
    </header>
  );
}
