import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function MobileProfileEditHomeCityPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [homeCity, setHomeCity] = useState(profile?.home_city || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          home_city: homeCity.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Home city updated successfully');
      navigate(-1);
    } catch (error) {
      console.error('Error updating home city:', error);
      toast.error('Failed to update home city');
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
          
          <h1 className="text-lg font-semibold">Home city</h1>
          
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
              Home city
            </label>
            <Input
              value={homeCity}
              onChange={(e) => setHomeCity(e.target.value)}
              placeholder="Enter your home city"
              className="mt-2 text-base"
              maxLength={100}
            />
          </div>
          
          <p className="text-sm text-muted-foreground">
            Let others know where you're from or currently based.
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