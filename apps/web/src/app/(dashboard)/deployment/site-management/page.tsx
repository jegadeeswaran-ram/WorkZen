'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AssignSupervisorDialog } from '@/components/deployment/assign-supervisor-dialog';
import { AssignEmployeeSheet } from '@/components/deployment/assign-employee-sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  MapPin, UserCheck, Users, UserPlus, Trash2,
  ChevronRight, AlertCircle, Phone, Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

function safeArray(d: any): any[] {
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.data)) return d.data;
  return [];
}

export default function SiteManagementPage() {
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [supervisorDialog, setSupervisorDialog] = useState<{ open: boolean; site: any }>({ open: false, site: null });
  const [assignSheet, setAssignSheet] = useState(false);
  const qc = useQueryClient();

  // Sites list
  const { data: sites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: () => api.get('/deployment/sites').then(r => safeArray(r.data?.data)),
  });

  const selectedSite = (sites as any[]).find((s: any) => s.id === selectedSiteId);

  // Team for selected site
  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: ['site-team', selectedSiteId],
    queryFn: () => api.get(`/deployment/sites/${selectedSiteId}/team`).then(r => r.data),
    enabled: !!selectedSiteId,
  });
  const team = safeArray(teamData?.data);
  const teamMeta = teamData?.meta ?? {};

  // Remove employee mutation
  const removeMutation = useMutation({
    mutationFn: (deploymentId: string) =>
      api.delete(`/deployment/sites/${selectedSiteId}/team/${deploymentId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site-team', selectedSiteId] });
      toast.success('Employee removed from site');
    },
    onError: () => toast.error('Failed to remove employee'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Site Management</h1>
        <p className="text-muted-foreground">Assign supervisors and manage employee deployment per site</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT: Sites List ── */}
        <div className="lg:col-span-1 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Sites ({(sites as any[]).length})
          </p>
          {sitesLoading ? (
            [...Array(5)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)
          ) : (
            (sites as any[]).map((site: any) => (
              <button
                key={site.id}
                type="button"
                onClick={() => setSelectedSiteId(site.id)}
                className={`w-full text-left rounded-lg border p-3 transition-all hover:border-primary/50 hover:bg-muted/30 ${
                  selectedSiteId === site.id
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border bg-card'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{site.name}</p>
                      <Badge variant={site.isActive ? 'default' : 'secondary'} className="text-xs shrink-0">
                        {site.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{site.code}</p>
                    {site.supervisor ? (
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-green-500">
                        <UserCheck className="h-3 w-3" />
                        {site.supervisor.firstName} {site.supervisor.lastName}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-amber-500">
                        <AlertCircle className="h-3 w-3" />
                        No supervisor assigned
                      </div>
                    )}
                  </div>
                  <ChevronRight className={`h-4 w-4 shrink-0 mt-0.5 transition-colors ${selectedSiteId === site.id ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
              </button>
            ))
          )}
        </div>

        {/* ── RIGHT: Site Detail ── */}
        <div className="lg:col-span-2">
          {!selectedSite ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground border-2 border-dashed rounded-xl">
              <MapPin className="h-8 w-8 mb-3 opacity-40" />
              <p className="font-medium">Select a site</p>
              <p className="text-sm">Click any site on the left to manage it</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Site Header Card */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">{selectedSite.name}</CardTitle>
                      <p className="text-sm text-muted-foreground font-mono">{selectedSite.code}</p>
                      {selectedSite.address && (
                        <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {selectedSite.address.street}, {selectedSite.address.city}
                        </div>
                      )}
                    </div>
                    <Badge variant={selectedSite.isActive ? 'default' : 'secondary'}>
                      {selectedSite.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 border-t">
                  <div className="flex items-center justify-between mt-3">
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">Supervisor</p>
                      {selectedSite.supervisor ? (
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center text-xs font-bold text-green-500">
                            {selectedSite.supervisor.firstName?.[0]}{selectedSite.supervisor.lastName?.[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{selectedSite.supervisor.firstName} {selectedSite.supervisor.lastName}</p>
                            <p className="text-xs text-muted-foreground">{selectedSite.supervisor.email}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-amber-500 flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" /> Not assigned
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSupervisorDialog({ open: true, site: selectedSite })}
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      {selectedSite.supervisor ? 'Change Supervisor' : 'Assign Supervisor'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Team Table */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-base">
                        Site Team
                        {teamMeta.total != null && (
                          <span className="ml-2 text-sm font-normal text-muted-foreground">({teamMeta.total} employees)</span>
                        )}
                      </CardTitle>
                    </div>
                    <Button size="sm" onClick={() => setAssignSheet(true)}>
                      <UserPlus className="h-4 w-4 mr-1" /> Add Employee
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {teamLoading ? (
                    <div className="space-y-2">
                      {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />)}
                    </div>
                  ) : team.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No employees deployed to this site yet</p>
                      <Button size="sm" variant="outline" className="mt-3" onClick={() => setAssignSheet(true)}>
                        <UserPlus className="h-4 w-4 mr-1" /> Add First Employee
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {team.map((dep: any) => (
                        <div key={dep.id} className="flex items-center justify-between py-3 gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                              {dep.employee?.firstName?.[0]}{dep.employee?.lastName?.[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm">
                                {dep.employee?.firstName} {dep.employee?.lastName}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                <span className="font-mono">{dep.employee?.employeeCode}</span>
                                {dep.employee?.designation?.name && (
                                  <span className="flex items-center gap-1">
                                    <Briefcase className="h-3 w-3" />
                                    {dep.employee.designation.name}
                                  </span>
                                )}
                                {dep.employee?.personalPhone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {dep.employee.personalPhone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {dep.shift && (
                              <Badge variant="secondary" className="text-xs">{dep.shift.name}</Badge>
                            )}
                            <p className="text-xs text-muted-foreground hidden sm:block">
                              Since {format(new Date(dep.startDate), 'dd MMM yyyy')}
                            </p>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                if (window.confirm(`Remove ${dep.employee?.firstName} from this site?`)) {
                                  removeMutation.mutate(dep.id);
                                }
                              }}
                              disabled={removeMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {supervisorDialog.site && (
        <AssignSupervisorDialog
          open={supervisorDialog.open}
          onOpenChange={v => setSupervisorDialog(d => ({ ...d, open: v }))}
          site={supervisorDialog.site}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['sites'] })}
        />
      )}
      {selectedSite && (
        <AssignEmployeeSheet
          open={assignSheet}
          onOpenChange={setAssignSheet}
          siteId={selectedSite.id}
          siteName={selectedSite.name}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}
