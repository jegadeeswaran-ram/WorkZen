'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { complaintsApi } from '@/lib/api';
import { ComplaintForm } from '@/components/supervisor/complaint-form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Plus, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

// Map complaint statuses to valid Shadcn Badge variants:
// default | secondary | destructive | outline | ghost | link
const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  OPEN: 'destructive',
  IN_REVIEW: 'secondary',
  ESCALATED: 'default',
  RESOLVED: 'outline',
  CLOSED: 'outline',
};

const SEV_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  LOW: 'secondary',
  MEDIUM: 'default',
  HIGH: 'destructive',
  CRITICAL: 'destructive',
};

export default function ComplaintsPage() {
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const qc = useQueryClient();

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ['complaints'],
    queryFn: () => complaintsApi.list().then(r => r.data.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => complaintsApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['complaints'] }),
  });

  const filtered = statusFilter ? complaints.filter((c: any) => c.status === statusFilter) : complaints;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          {(['', 'OPEN', 'IN_REVIEW', 'ESCALATED', 'RESOLVED', 'CLOSED'] as const).map(s => (
            <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(s)}>
              {s || 'All'}
            </Button>
          ))}
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New Complaint
              </Button>
            }
          />
          <SheetContent className="w-[480px] overflow-y-auto">
            <SheetHeader><SheetTitle>Raise a Complaint</SheetTitle></SheetHeader>
            <div className="mt-4 px-4 pb-4"><ComplaintForm onSuccess={() => setOpen(false)} /></div>
          </SheetContent>
        </Sheet>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c: any) => (
            <div key={c.id} className="border rounded-lg p-4 space-y-2 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{c.title}</span>
                    <Badge variant={SEV_VARIANT[c.severity] ?? 'default'} className="text-xs">{c.severity}</Badge>
                    <Badge variant={STATUS_VARIANT[c.status] ?? 'outline'} className="text-xs">{c.status.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {c.category.replace(/_/g, ' ')} · {c.site?.name} · {format(new Date(c.createdAt), 'dd MMM yyyy')}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
                </div>
                <div className="shrink-0">
                  {c.status === 'OPEN' && (
                    <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: c.id, status: 'IN_REVIEW' })}>
                      Mark In Review
                    </Button>
                  )}
                  {c.status === 'IN_REVIEW' && (
                    <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: c.id, status: 'RESOLVED' })}>
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No complaints found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
