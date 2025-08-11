import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Award } from 'lucide-react';

export default function ApplyExpertPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [qualifications, setQualifications] = useState('');
  const [credentials, setCredentials] = useState('');
  const [proofLinks, setProofLinks] = useState('');
  const [loading, setLoading] = useState(false);
  const [existing, setExisting] = useState<any | null>(null);

  useEffect(() => {
    document.title = 'Apply for Expert • Grubby';
  }, []);

  useEffect(() => {
    const fetchExisting = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('expert_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!error) setExisting(data);
    };
    fetchExisting();
  }, [user]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!qualifications || !credentials) {
      toast.error('Please fill in your qualifications and credentials');
      return;
    }
    setLoading(true);
    try {
      const proofArr = proofLinks
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const { error } = await supabase.from('expert_applications').insert({
        user_id: user.id,
        qualifications,
        credentials,
        proof_links: proofArr,
      });
      if (error) throw error;
      toast.success('Application submitted. We will review it soon.');
      navigate(-1);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background backdrop-blur border-b pt-safe-area-top">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-10 w-10 p-0" aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            <h1 className="text-lg font-semibold">Apply for Expert Account</h1>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        {existing && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">Current Application Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                <div>Status: <span className="font-medium capitalize">{existing.status}</span></div>
                {existing.notes && <div className="mt-1 text-muted-foreground">Reviewer notes: {existing.notes}</div>}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Expertise</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="qual">Qualifications</Label>
                <Textarea id="qual" value={qualifications} onChange={(e) => setQualifications(e.target.value)} placeholder="e.g., 10+ years as a chef, food critic for XYZ, culinary degree..." className="min-h-[100px]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cred">Credentials</Label>
                <Textarea id="cred" value={credentials} onChange={(e) => setCredentials(e.target.value)} placeholder="Awards, publications, judging panels, Michelin guide experience, etc." className="min-h-[100px]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proof">Proof Links (comma-separated)</Label>
                <Input id="proof" value={proofLinks} onChange={(e) => setProofLinks(e.target.value)} placeholder="https://..., https://..." />
              </div>
              <div className="pt-2">
                <Button type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit Application'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
