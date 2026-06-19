'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, AlertCircle } from 'lucide-react';

export default function SupervisorSitesPage() {
  const { data: sites, isLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: () => api.get('/sites').then(r => r.data.data),
  });

  if (isLoading) return <div className="animate-pulse h-48 bg-muted rounded-lg" />;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {(sites ?? []).map((site: any) => (
        <Card key={site.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{site.name}</CardTitle>
              <Badge variant={site.isActive ? 'default' : 'secondary'}>{site.isActive ? 'Active' : 'Inactive'}</Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono">{site.code}</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-muted-foreground">{site.address?.street}, {site.address?.city}</span>
            </div>
            {site.contactName && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{site.contactName} · {site.contactPhone}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
