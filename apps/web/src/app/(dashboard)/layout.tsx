'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { NavProgress } from '@/components/layout/nav-progress';
import { useUiStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useUiStore();
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const sidebarWidth = sidebarCollapsed ? 72 : 260;

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, _hasHydrated, router]);

  // Show skeleton while Zustand rehydrates from localStorage (100-300ms).
  // Once hydrated, redirect fires via useEffect above if unauthenticated.
  if (!_hasHydrated) return (
    <div className="min-h-screen" style={{ background: 'var(--wz-page-bg)' }}>
      <div className="fixed top-0 left-0 h-screen w-[260px]"
        style={{ background: 'var(--wz-sidebar-bg)', borderRight: '1px solid var(--wz-sidebar-border)' }} />
      <div style={{ marginLeft: '260px' }}>
        <div className="fixed top-0 right-0 h-16"
          style={{ left: '260px', background: 'var(--wz-card-bg)', borderBottom: '1px solid var(--wz-card-border)' }} />
        <main className="p-6" style={{ paddingTop: 'calc(64px + 24px)' }}>
          <div className="rounded-2xl h-48 animate-pulse" style={{ background: 'var(--wz-card-bg)' }} />
        </main>
      </div>
    </div>
  );

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--wz-page-bg)' }}>
      <NavProgress />
      <Sidebar />
      <div
        className="transition-all duration-300"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <Header />
        <main
          className="min-h-screen p-6 page-enter"
          style={{ paddingTop: 'calc(64px + 24px)' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
