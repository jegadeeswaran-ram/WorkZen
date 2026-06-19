'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, UserCheck, Phone } from 'lucide-react';

export default function SupervisorSitesPage() {
  const { data: sites, isLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: () => api.get('/api/v1/deployment/sites').then(r => r.data.data),
  });

  if (isLoading) return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map(i => <div key={i} className="animate-pulse h-48 bg-muted rounded-lg" />)}
    </div>
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {(sites ?? []).map((site: any) => (
        <Card key={site.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{site.name}</CardTitle>
              <Badge variant={site.isActive ? 'default' : 'secondary'}>
                {site.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono">{site.code}</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-muted-foreground">
                {site.address?.street}, {site.address?.city}
                {site.address?.state ? `, ${site.address.state}` : ''}
              </span>
            </div>
            {site.supervisor && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <UserCheck className="h-4 w-4 shrink-0" />
                <span className="font-medium">
                  {site.supervisor.firstName} {site.supervisor.lastName}
                </span>
                <span className="text-muted-foreground text-xs">· Supervisor</span>
              </div>
            )}
            {!site.supervisor && (
              <div className="flex items-center gap-2 text-amber-500">
                <UserCheck className="h-4 w-4 shrink-0" />
                <span className="text-xs">No supervisor assigned</span>
              </div>
            )}
            {site.contactName && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" />
                <span>{site.contactName} · {site.contactPhone}</span>
              </div>
            )}
            {site.geoFenceRadius && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4 shrink-0" />
                <span>Geo-fence: {site.geoFenceRadius}m radius</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      {(sites ?? []).length === 0 && (
        <div className="col-span-3 text-center py-12 text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>No active sites found</p>
        </div>
      )}
    </div>
  );
}
