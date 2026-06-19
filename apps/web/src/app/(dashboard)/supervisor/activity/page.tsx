'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { activityLogApi, api } from '@/lib/api';
import { ActivityLogForm } from '@/components/supervisor/activity-log-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays } from 'date-fns';
import { Users, AlertTriangle, Camera } from 'lucide-react';

export default function ActivityLogPage() {
  const [siteId, setSiteId] = useState('');

  const { data: sites = [] } = useQuery({ queryKey: ['sites'], queryFn: () => api.get('/sites').then(r => r.data.data) });
  const { data: todayLog } = useQuery({ queryKey: ['activity-log-today', siteId], queryFn: () => siteId ? activityLogApi.today(siteId).then(r => r.data.data) : null, enabled: !!siteId });
  const { data: history = [] } = useQuery({ queryKey: ['activity-log', siteId], queryFn: () => siteId ? activityLogApi.list(siteId, format(subDays(new Date(), 30), 'yyyy-MM-dd'), format(new Date(), 'yyyy-MM-dd')).then(r => r.data.data) : [], enabled: !!siteId });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select onValueChange={setSiteId}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select site" /></SelectTrigger>
          <SelectContent>{(sites as any[]).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
        {!siteId && <p className="text-sm text-muted-foreground">Select a site to view or submit activity logs</p>}
      </div>

      {siteId && (
        <Tabs defaultValue="today">
          <TabsList>
            <TabsTrigger value="today">Today's Log</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="today" className="mt-4">
            {todayLog ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Log for {format(new Date(todayLog.logDate), 'dd MMM yyyy')}</CardTitle>
                    {todayLog.hasIncident && <Badge variant="destructive">Incident Reported</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><span>Headcount: <strong>{todayLog.headcount}</strong></span></div>
                  <div><p className="text-muted-foreground font-medium">Work Done</p><p className="mt-1">{todayLog.workDone}</p></div>
                  {todayLog.hasIncident && <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg"><div className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4 text-destructive" />Incident: {todayLog.incidentType}</div><p className="mt-1 text-muted-foreground">{todayLog.incidentDesc}</p></div>}
                  {todayLog.photoUrls?.length > 0 && (
                    <div><p className="text-muted-foreground font-medium flex items-center gap-1"><Camera className="h-4 w-4" />Photos</p><div className="flex gap-2 mt-1 flex-wrap">{todayLog.photoUrls.map((url: string, i: number) => <img key={i} src={url} alt={`Photo ${i+1}`} className="w-20 h-20 rounded object-cover border" />)}</div></div>
                  )}
                  <p className="text-xs text-muted-foreground">Log already submitted for today. Edit by re-submitting below.</p>
                </CardContent>
              </Card>
            ) : null}
            <div className={todayLog ? 'mt-4 p-4 border rounded-lg' : ''}>
              {todayLog && <p className="text-sm font-medium mb-3">Update Today's Log</p>}
              <ActivityLogForm siteId={siteId} defaultValues={todayLog ?? undefined} />
            </div>
          </TabsContent>
          <TabsContent value="history" className="mt-4 space-y-3">
            {(history as any[]).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground"><p>No logs found for the past 30 days</p></div>
            ) : (history as any[]).map(log => (
              <Card key={log.id}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{format(new Date(log.logDate), 'EEEE, dd MMM yyyy')}</p>
                    <div className="flex gap-2">
                      {log.hasIncident && <Badge variant="destructive" className="text-xs">Incident</Badge>}
                      {log.photoUrls?.length > 0 && <Badge variant="secondary" className="text-xs"><Camera className="h-3 w-3 mr-1" />{log.photoUrls.length}</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-3.5 w-3.5" />{log.headcount} workers</div>
                  <p className="text-sm line-clamp-2">{log.workDone}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
