import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function MobileProfileEditUsernamePage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [username, setUsername] = useState(profile?.username || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Username updated successfully');
      navigate(-1);
    } catch (error) {
      console.error('Error updating username:', error);
      toast.error('Failed to update username');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/20">
        <div className="flex items-center justify-between px-4 py-4 pt-12">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <h1 className="text-lg font-semibold">Username</h1>
          
          <div className="w-10"></div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8 flex-1">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Username
            </label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="mt-2 text-base"
              maxLength={30}
            />
          </div>
          
          <p className="text-sm text-muted-foreground">
            Your unique username for your profile. Only letters, numbers, and underscores allowed.
          </p>

          {/* Save Button */}
          <div className="pt-8">
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="w-full h-12 text-base font-medium"
              size="lg"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                  Saving...
                </div>
              ) : (
                'Save changes'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}