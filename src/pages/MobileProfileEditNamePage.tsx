import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function MobileProfileEditNamePage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [name, setName] = useState(profile?.name || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: name.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Name updated successfully');
      navigate(-1);
    } catch (error) {
      console.error('Error updating name:', error);
      toast.error('Failed to update name');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
          
          <h1 className="text-lg font-semibold">Name</h1>
          
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
      <div className="px-6 py-8 flex-1">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Display name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="mt-2 text-base"
              maxLength={50}
            />
          </div>
          
          <p className="text-sm text-muted-foreground">
            This is how your name will appear to other users.
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="p-6 border-t border-border/20">
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
  );
}