import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function MobileProfileEditBioPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [bio, setBio] = useState(profile?.bio || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          bio: bio.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Bio updated successfully');
      navigate(-1);
    } catch (error) {
      console.error('Error updating bio:', error);
      toast.error('Failed to update bio');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/20">
        <div className="flex items-center justify-between px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <h1 className="text-lg font-semibold">Bio</h1>
          
          <Button
            onClick={handleSave}
            disabled={isLoading}
            size="icon"
            variant="ghost"
            className="h-10 w-10 text-primary"
          >
            <Check className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Bio
            </label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others about yourself..."
              className="mt-2 text-base min-h-[120px]"
              maxLength={160}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Share a bit about yourself</span>
              <span>{bio.length}/160</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}