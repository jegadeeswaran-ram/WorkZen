'use client';
import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { activityLogApi, api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, X, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const INCIDENT_TYPES = ['SAFETY', 'OPERATIONAL', 'HR', 'COMPLIANCE', 'EQUIPMENT', 'OTHER'];

interface Props { siteId: string; defaultValues?: any; onSuccess?: () => void; }

export function ActivityLogForm({ siteId, defaultValues, onSuccess }: Props) {
  const { register, handleSubmit, reset } = useForm({ defaultValues });
  const [hasIncident, setHasIncident] = useState(defaultValues?.hasIncident ?? false);
  const [incidentType, setIncidentType] = useState(defaultValues?.incidentType ?? '');
  const [photoUrls, setPhotoUrls] = useState<string[]>(defaultValues?.photoUrls ?? []);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await activityLogApi.uploadPhoto(file, siteId);
      setPhotoUrls(prev => [...prev, res.data.data.url]);
      toast.success('Photo uploaded');
    } catch { toast.error('Upload failed'); }
    setUploading(false);
  };

  const mutation = useMutation({
    mutationFn: (data: any) => {
      if (hasIncident && !incidentType) {
        toast.error('Please select an incident type');
        throw new Error('Incident type required');
      }
      return activityLogApi.save({ ...data, siteId, hasIncident, incidentType: hasIncident ? incidentType : undefined, photoUrls });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activity-log', siteId] });
      reset();
      setHasIncident(false);
      setIncidentType('');
      setPhotoUrls([]);
      setSubmitted(true);
      toast.success('Activity log saved!');
      setTimeout(() => { setSubmitted(false); onSuccess?.(); }, 2000);
    },
    onError: () => toast.error('Failed to save log'),
  });

  if (submitted) return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      <CheckCircle className="h-12 w-12 text-green-500" />
      <p className="font-medium text-lg">Log Submitted!</p>
      <p className="text-muted-foreground text-sm">Your activity log has been saved successfully.</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
      <div>
        <Label>Work Done Today <span className="text-destructive">*</span></Label>
        <Textarea {...register('workDone', { required: true })} rows={4} placeholder="Describe the work completed today, areas covered, tasks done..." />
      </div>
      <div>
        <Label>Headcount (Workers Present) <span className="text-destructive">*</span></Label>
        <Input type="number" {...register('headcount', { required: true, min: 0 })} placeholder="0" className="w-32" />
      </div>
      <div className="flex items-center gap-3 p-3 border rounded-lg">
        <Switch checked={hasIncident} onCheckedChange={setHasIncident} id="incident-toggle" />
        <Label htmlFor="incident-toggle" className="cursor-pointer">Any incident today?</Label>
      </div>
      {hasIncident && (
        <div className="space-y-3 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
          <div>
            <Label>Incident Type</Label>
            <Select onValueChange={setIncidentType}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>{INCIDENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Incident Description</Label>
            <Textarea {...register('incidentDesc')} rows={3} placeholder="Describe what happened, people involved, action taken..." />
          </div>
        </div>
      )}
      <div>
        <Label>Photos</Label>
        <div className="flex gap-2 flex-wrap mt-1">
          {photoUrls.map((url, i) => (
            <div key={i} className="relative w-20 h-20 rounded border overflow-hidden group">
              <img src={url} alt={`Photo ${i+1}`} className="w-full h-full object-cover" />
              <button type="button" onClick={() => setPhotoUrls(p => p.filter((_, j) => j !== i))} className="absolute top-0 right-0 bg-black/60 text-white p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3" /></button>
            </div>
          ))}
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="w-20 h-20 border-2 border-dashed rounded flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors">
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Camera className="h-5 w-5" /><span className="text-xs mt-1">Add Photo</span></>}
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
        </div>
      </div>
      <Button type="submit" disabled={mutation.isPending} className="w-full">
        {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Submit Log'}
      </Button>
    </form>
  );
}
