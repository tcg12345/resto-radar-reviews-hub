import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';

interface ProfileEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: any;
}

export function ProfileEditDialog({ isOpen, onClose, currentProfile }: ProfileEditDialogProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: currentProfile?.username || '',
    name: currentProfile?.name || '',
    bio: currentProfile?.bio || '',
    home_city: currentProfile?.home_city || '',
    is_public: currentProfile?.is_public || false,
    allow_friend_requests: currentProfile?.allow_friend_requests || true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: formData.username.trim(),
          name: formData.name.trim(),
          bio: formData.bio.trim() || null,
          home_city: formData.home_city.trim() || null,
          is_public: formData.is_public,
          allow_friend_requests: formData.allow_friend_requests,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      onClose();
      
      // Refresh the page to show updated profile
      window.location.reload();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => handleChange('username', e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter your display name"
            />
          </div>

          {/* Home City */}
          <div className="space-y-2">
            <Label htmlFor="home_city">Home City</Label>
            <Input
              id="home_city"
              value={formData.home_city}
              onChange={(e) => handleChange('home_city', e.target.value)}
              placeholder="e.g., New York, San Francisco"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              placeholder="Tell others about yourself and your food preferences..."
              rows={3}
              maxLength={160}
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.bio.length}/160 characters
            </p>
          </div>

          {/* Privacy Settings */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium">Privacy Settings</h4>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_public">Public Profile</Label>
                <p className="text-sm text-muted-foreground">
                  Allow anyone to see your profile and restaurant ratings
                </p>
              </div>
              <Switch
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) => handleChange('is_public', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="allow_friend_requests">Friend Requests</Label>
                <p className="text-sm text-muted-foreground">
                  Allow others to send you friend requests
                </p>
              </div>
              <Switch
                id="allow_friend_requests"
                checked={formData.allow_friend_requests}
                onCheckedChange={(checked) => handleChange('allow_friend_requests', checked)}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}