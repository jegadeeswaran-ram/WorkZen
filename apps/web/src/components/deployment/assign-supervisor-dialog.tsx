'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { UserCheck, X } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  site: { id: string; name: string; supervisorId?: string | null };
  onSuccess: () => void;
}

export function AssignSupervisorDialog({ open, onOpenChange, site, onSuccess }: Props) {
  const [selectedId, setSelectedId] = useState<string>(site.supervisorId ?? '');
  const qc = useQueryClient();

  const { data: supervisors = [], isLoading } = useQuery({
    queryKey: ['supervisors'],
    queryFn: () => api.get('/deployment/supervisors').then(r => {
      const d = r.data?.data;
      return Array.isArray(d) ? d : [];
    }),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (supervisorId: string | null) =>
      api.patch(`/deployment/sites/${site.id}/supervisor`, { supervisorId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sites'] });
      qc.invalidateQueries({ queryKey: ['site-team', site.id] });
      toast.success('Supervisor assigned successfully');
      onSuccess();
      onOpenChange(false);
    },
    onError: () => toast.error('Failed to assign supervisor'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Assign Supervisor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Assigning a supervisor to <span className="font-semibold text-foreground">{site.name}</span>
            </p>
            <Label>Site Supervisor</Label>
            <Select
              value={selectedId}
              onValueChange={setSelectedId}
              disabled={isLoading}
            >
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue placeholder="Select a supervisor..." />
              </SelectTrigger>
              <SelectContent position="popper">
                {supervisors.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex flex-col">
                      <span>{s.firstName} {s.lastName}</span>
                      <span className="text-xs text-muted-foreground">{s.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedId && (
              <div className="mt-2">
                {(() => {
                  const sup = supervisors.find((s: any) => s.id === selectedId);
                  if (!sup) return null;
                  const otherSites = (sup.supervisedSites ?? []).filter((s: any) => s.id !== site.id);
                  return otherSites.length > 0 ? (
                    <p className="text-xs text-amber-500">
                      ⚠ Also manages: {otherSites.map((s: any) => s.name).join(', ')}
                    </p>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          {site.supervisorId && (
            <Button
              variant="outline"
              className="text-destructive border-destructive/40 hover:bg-destructive/10 mr-auto"
              onClick={() => mutation.mutate(null)}
              disabled={mutation.isPending}
            >
              <X className="h-4 w-4 mr-1" /> Remove Supervisor
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate(selectedId || null)}
            disabled={mutation.isPending || !selectedId}
          >
            {mutation.isPending ? 'Saving...' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
