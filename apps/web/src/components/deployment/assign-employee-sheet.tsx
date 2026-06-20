'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  siteId: string;
  siteName: string;
  onSuccess: () => void;
}

export function AssignEmployeeSheet({ open, onOpenChange, siteId, siteName, onSuccess }: Props) {
  const [search, setSearch] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const qc = useQueryClient();

  const { data: employees = [], isLoading: empsLoading } = useQuery({
    queryKey: ['employees-for-assignment'],
    queryFn: () =>
      api.get('/employees?limit=200').then(r => {
        const d = r.data?.data;
        const arr = Array.isArray(d) ? d : Array.isArray((d as any)?.data) ? (d as any).data : [];
        // Filter active employees client-side (status param is not in PaginationDto whitelist)
        return arr.filter((e: any) => e.status === 'ACTIVE' || !e.status);
      }),
    enabled: open,
    staleTime: 30_000,
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () =>
      api.get('/deployment/shifts').then(r => {
        const d = r.data?.data;
        return Array.isArray(d) ? d : [];
      }),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/deployment/sites/${siteId}/team`, {
        employeeId: selectedEmpId,
        shiftId: shiftId || undefined,
        startDate: new Date().toISOString().slice(0, 10),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site-team', siteId] });
      toast.success('Employee assigned to site');
      setSelectedEmpId('');
      setShiftId('');
      setSearch('');
      onSuccess();
      onOpenChange(false);
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error?.message ?? 'Failed to assign employee'),
  });

  const filtered = (employees as any[]).filter((emp: any) => {
    const q = search.toLowerCase();
    return !q || `${emp.firstName} ${emp.lastName} ${emp.employeeCode}`.toLowerCase().includes(q);
  });

  const selected = (employees as any[]).find((emp: any) => emp.id === selectedEmpId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Assign Employee
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            Adding to <span className="font-medium text-foreground">{siteName}</span>
          </p>
        </SheetHeader>

        <div className="mt-6 space-y-5 px-1">
          {/* Employee Search */}
          <div>
            <Label>Search Employee</Label>
            <div className="relative mt-1.5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Name or employee code..."
                className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 pl-9 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              />
            </div>
          </div>

          {/* Employee List */}
          <div className="max-h-52 overflow-y-auto rounded-lg border divide-y">
            {empsLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading employees...
              </div>
            ) : null}
            {!empsLoading && filtered.slice(0, 30).map((emp: any) => (
              <button
                key={emp.id}
                type="button"
                onClick={() => setSelectedEmpId(emp.id === selectedEmpId ? '' : emp.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50 ${
                  selectedEmpId === emp.id ? 'bg-primary/10 border-l-2 border-primary' : ''
                }`}
              >
                <div>
                  <p className="font-medium">
                    {emp.firstName} {emp.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {emp.employeeCode} · {emp.designation?.name ?? '—'}
                  </p>
                </div>
                {emp.lifecycleStatus === 'DEPLOYED' && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    Deployed
                  </Badge>
                )}
              </button>
            ))}
            {!empsLoading && filtered.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                No employees found
              </p>
            )}
          </div>

          {/* Selected Employee Summary */}
          {selected && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm space-y-0.5">
              <p className="font-semibold">
                {selected.firstName} {selected.lastName}
              </p>
              <p className="text-muted-foreground">
                {selected.employeeCode} · {selected.designation?.name}
              </p>
              <p className="text-muted-foreground">{selected.department?.name}</p>
            </div>
          )}

          {/* Shift Picker */}
          <div>
            <Label>
              Shift <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Select value={shiftId} onValueChange={setShiftId}>
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue placeholder="Select shift..." />
              </SelectTrigger>
              <SelectContent>
                {(shifts as any[]).map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.startTime}–{s.endTime})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            disabled={!selectedEmpId || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Assign to {siteName}
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
