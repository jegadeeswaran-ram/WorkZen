'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Bell, BellOff, Check, CheckCheck, Mail, MessageSquare, Smartphone, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { notificationsApi } from '@/lib/api';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  EMAIL: <Mail size={14} />,
  SMS: <MessageSquare size={14} />,
  WHATSAPP: <Globe size={14} />,
  PUSH: <Smartphone size={14} />,
  IN_APP: <Bell size={14} />,
};

const TYPE_COLORS: Record<string, string> = {
  EMAIL: '#6366f1',
  SMS: '#10b981',
  WHATSAPP: '#22c55e',
  PUSH: '#f59e0b',
  IN_APP: '#818cf8',
};

interface Notification {
  id: string;
  type: string;
  subject?: string;
  body: string;
  recipient: string;
  createdAt: string;
  readAt?: string | null;
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications-unread'],
    queryFn: notificationsApi.unread,
    refetchInterval: 30_000,
  });

  const { mutate: markRead, isPending: marking } = useMutation({
    mutationFn: (ids: string[]) => notificationsApi.markRead(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
      toast.success('Notifications marked as read');
    },
    onError: () => toast.error('Failed to mark as read'),
  });

  const handleMarkAll = () => {
    if (notifications.length === 0) return;
    markRead(notifications.map((n) => n.id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Unread alerts and system messages
          </p>
        </div>
        <button
          onClick={handleMarkAll}
          disabled={marking || notifications.length === 0}
          className="flex items-center gap-2 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCheck size={15} />
          Mark All Read
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="text-xs font-medium mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Unread
          </div>
          <div className="text-2xl font-bold text-white">
            {isLoading ? <span className="skeleton h-7 w-12 block rounded" /> : notifications.length}
          </div>
          <div className="text-xs mt-1" style={{ color: '#818cf8' }}>Pending review</div>
        </div>

        <div className="stat-card">
          <div className="text-xs font-medium mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Total
          </div>
          <div className="text-2xl font-bold text-white">
            {isLoading ? <span className="skeleton h-7 w-12 block rounded" /> : notifications.length}
          </div>
          <div className="text-xs mt-1" style={{ color: '#10b981' }}>In queue</div>
        </div>

        <div className="stat-card">
          <div className="text-xs font-medium mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Channels
          </div>
          <div className="text-2xl font-bold text-white">5</div>
          <div className="text-xs mt-1" style={{ color: '#f59e0b' }}>Active types</div>
        </div>
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card p-4 flex gap-4">
              <div className="skeleton w-9 h-9 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-2/3 rounded" />
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-1/3 rounded" />
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-12 flex flex-col items-center justify-center text-center"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}
            >
              <BellOff size={28} style={{ color: 'rgba(255,255,255,0.25)' }} />
            </div>
            <p className="text-base font-medium text-white">No unread notifications</p>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              You&apos;re all caught up. New alerts will appear here.
            </p>
          </motion.div>
        ) : (
          notifications.map((n, idx) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="glass-card p-4 flex gap-4"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: `${TYPE_COLORS[n.type] ?? '#6366f1'}18`,
                  color: TYPE_COLORS[n.type] ?? '#6366f1',
                  border: `1px solid ${TYPE_COLORS[n.type] ?? '#6366f1'}28`,
                }}
              >
                {TYPE_ICONS[n.type] ?? <Bell size={14} />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-white">
                    {n.subject ?? n.body.slice(0, 60)}
                  </p>
                  <span className="text-xs flex-shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {formatDate(n.createdAt)}
                  </span>
                </div>
                <p className="text-xs mt-1 line-clamp-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {n.body}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    To: {n.recipient}
                  </span>
                  <button
                    onClick={() => markRead([n.id])}
                    disabled={marking}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-all disabled:opacity-50"
                    style={{
                      background: 'rgba(99,102,241,0.1)',
                      color: '#818cf8',
                      border: '1px solid rgba(99,102,241,0.2)',
                    }}
                  >
                    <Check size={11} /> Mark read
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
