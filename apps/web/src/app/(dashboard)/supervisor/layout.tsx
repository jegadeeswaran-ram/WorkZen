'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const tabs = [
  { label: 'Sites Overview', href: '/supervisor/sites' },
  { label: 'Complaints', href: '/supervisor/complaints' },
  { label: 'Activity Log', href: '/supervisor/activity' },
];

export default function SupervisorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Site Supervisor Portal</h1>
        <p className="text-muted-foreground">Manage complaints, daily logs, and site activity</p>
      </div>
      <nav className="flex gap-1 border-b pb-0">
        {tabs.map(tab => (
          <Link key={tab.href} href={tab.href}
            className={cn('px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              pathname.startsWith(tab.href) ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}>
            {tab.label}
          </Link>
        ))}
      </nav>
      <div>{children}</div>
    </div>
  );
}
