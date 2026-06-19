import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(amount));
}

export function formatDate(date: string | Date | null | undefined, fmt = 'dd MMM yyyy'): string {
  if (!date) return '—';
  return format(new Date(date), fmt);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n);
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'badge-success', APPROVED: 'badge-success', PAID: 'badge-success', PRESENT: 'badge-success', FILED: 'badge-success',
    PENDING: 'badge-warning', DRAFT: 'badge-neutral', PROCESSING: 'badge-info', SUBMITTED: 'badge-info',
    INACTIVE: 'badge-neutral', TERMINATED: 'badge-danger', CANCELLED: 'badge-danger', REJECTED: 'badge-danger',
    OVERDUE: 'badge-danger', EXPIRED: 'badge-danger', ABSENT: 'badge-danger',
    AWARDED: 'badge-gold', COMPLETED: 'badge-info',
  };
  return map[status] ?? 'badge-neutral';
}

export function truncate(str: string, maxLen = 30): string {
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
