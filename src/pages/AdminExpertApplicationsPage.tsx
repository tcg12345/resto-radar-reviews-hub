import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, ShieldCheck, Award } from 'lucide-react';

interface ExpertApplication {
  id: string;
  user_id: string;
  qualifications: string | null;
  credentials: string | null;
  proof_links: string[] | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  notes: string | null;
}

interface Profile {
  id: string;
  username: string | null;
  name: string | null;
  avatar_url: string | null;
}

export default function AdminExpertApplicationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<ExpertApplication[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => { document.title = 'Admin • Expert Applications'; }, []);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      if (!error && data) {
        setIsAdmin(data.some(r => r.role === 'admin'));
      }
    };
    checkAdmin();
  }, [user]);

  useEffect(() => {
    const fetchApps = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('expert_applications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error(error);
        toast.error('Failed to load applications');
        setLoading(false);
        return;
      }
      const appsData = (data || []) as ExpertApplication[];
      setApps(appsData);
      const userIds = Array.from(new Set(appsData.map(a => a.user_id)));
      if (userIds.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, username, name, avatar_url')
          .in('id', userIds);
        const map: Record<string, Profile> = {};
        (profs || []).forEach((p: any) => { map[p.id] = p; });
        setProfiles(map);
      }
      setLoading(false);
    };
    if (isAdmin) fetchApps();
  }, [user, isAdmin]);

  const grouped = useMemo(() => ({
    pending: apps.filter(a => a.status === 'pending'),
    approved: apps.filter(a => a.status === 'approved'),
    rejected: apps.filter(a => a.status === 'rejected'),
  }), [apps]);

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    if (!user) return;
    const { error } = await supabase
      .from('expert_applications')
      .update({ status, reviewer_id: user.id, reviewed_at: new Date().toISOString(), notes: notes[id] || null })
      .eq('id', id);
    if (error) {
      console.error(error);
      toast.error('Failed to update status');
      return;
    }
    toast.success(`Application ${status}`);
    setApps(prev => prev.map(a => a.id === id ? { ...a, status, notes: notes[id] || a.notes } : a));
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-50 bg-background backdrop-blur border-b pt-safe-area-top">
          <div className="flex items-center gap-3 p-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-10 w-10 p-0" aria-label="Go back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              <h1 className="text-lg font-semibold">Admin</h1>
            </div>
          </div>
        </div>
        <div className="p-4 max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Access denied</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">You must be an admin to view this page.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background backdrop-blur border-b pt-safe-area-top">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-10 w-10 p-0" aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            <h1 className="text-lg font-semibold">Expert Applications</h1>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto space-y-6">
        {loading && <p className="text-sm text-muted-foreground">Loading applications...</p>}

        {['pending', 'approved', 'rejected'].map((section) => {
          const list = (grouped as any)[section] as ExpertApplication[];
          if (!list?.length) return null;
          return (
            <div key={section} className="space-y-3">
              <h2 className="text-base font-semibold capitalize">{section}</h2>
              {list.map(app => {
                const prof = profiles[app.user_id];
                return (
                  <Card key={app.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={prof?.avatar_url || undefined} />
                          <AvatarFallback>{(prof?.username || 'A').slice(0,2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="truncate font-medium">{prof?.name || prof?.username || app.user_id}</div>
                            <div className="text-xs text-muted-foreground">{new Date(app.created_at).toLocaleString()}</div>
                          </div>
                          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <div className="text-xs font-medium text-muted-foreground">Qualifications</div>
                              <div className="text-sm whitespace-pre-line">{app.qualifications || '-'}</div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-muted-foreground">Credentials</div>
                              <div className="text-sm whitespace-pre-line">{app.credentials || '-'}</div>
                            </div>
                          </div>
                          {app.proof_links && app.proof_links.length > 0 && (
                            <div className="mt-2 text-sm">
                              <div className="text-xs font-medium text-muted-foreground mb-1">Proof links</div>
                              <ul className="list-disc pl-5 space-y-1">
                                {app.proof_links.map((l, i) => (
                                  <li key={i}><a className="text-primary underline" href={l} target="_blank" rel="noreferrer">{l}</a></li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {section === 'pending' && (
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                              <div className="md:col-span-2 space-y-1">
                                <Label htmlFor={`notes-${app.id}`} className="text-xs">Reviewer notes (optional)</Label>
                                <Input id={`notes-${app.id}`} value={notes[app.id] || ''} onChange={(e) => setNotes(prev => ({ ...prev, [app.id]: e.target.value }))} placeholder="Add a short note..." />
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => updateStatus(app.id, 'approved')}>Approve</Button>
                                <Button size="sm" variant="destructive" onClick={() => updateStatus(app.id, 'rejected')}>Reject</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
