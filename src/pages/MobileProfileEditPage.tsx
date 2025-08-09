import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, ChevronRight, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function MobileProfileEditPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: profile?.username || '',
    name: profile?.name || '',
    bio: profile?.bio || '',
    home_city: profile?.home_city || '',
    is_public: profile?.is_public || false,
    allow_friend_requests: profile?.allow_friend_requests || true
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        name: profile.name || '',
        bio: profile.bio || '',
        home_city: profile.home_city || '',
        is_public: profile.is_public || false,
        allow_friend_requests: profile.allow_friend_requests || true
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: formData.username.trim() || null,
          name: formData.name.trim() || null,
          bio: formData.bio.trim() || null,
          home_city: formData.home_city.trim() || null,
          is_public: formData.is_public,
          allow_friend_requests: formData.allow_friend_requests,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      // Force a page reload to refresh the auth context
      window.location.href = '/friends';
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

  const handlePhotoEdit = () => {
    navigate('/profile/edit-photo');
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
          
          <h1 className="text-lg font-semibold">Edit profile</h1>
          
          <Button
            onClick={handleSave}
            disabled={isLoading}
            size="sm"
            className="min-w-[80px]"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </div>

      {/* Profile Photo Section */}
      <div className="px-6 py-8 text-center border-b border-border/10">
        <div className="relative inline-block mb-4">
          <Avatar className="w-24 h-24 mx-auto">
            <AvatarImage src={profile.avatar_url || ''} alt="Profile photo" />
            <AvatarFallback className="text-2xl font-bold bg-muted">
              {profile.name?.charAt(0) || profile.username?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
        </div>
        
        <Button
          variant="ghost"
          onClick={handlePhotoEdit}
          className="text-primary hover:text-primary/80 font-medium"
        >
          Edit profile photo
        </Button>
      </div>

      {/* Form Fields */}
      <div className="px-6 py-4 space-y-1">
        {/* Name */}
        <Button
          variant="ghost"
          className="w-full justify-between p-4 h-auto text-left border-b border-border/10 rounded-none"
          onClick={() => navigate('/profile/edit/name')}
        >
          <span className="text-base font-medium text-foreground">Name</span>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">
              {formData.name || 'Add your name'}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </Button>

        {/* Username */}
        <Button
          variant="ghost"
          className="w-full justify-between p-4 h-auto text-left border-b border-border/10 rounded-none"
          onClick={() => navigate('/profile/edit/username')}
        >
          <span className="text-base font-medium text-foreground">Username</span>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">
              {formData.username || 'Add username'}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </Button>

        {/* Home City */}
        <Button
          variant="ghost"
          className="w-full justify-between p-4 h-auto text-left border-b border-border/10 rounded-none"
          onClick={() => navigate('/profile/edit/home-city')}
        >
          <span className="text-base font-medium text-foreground">Home city</span>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">
              {formData.home_city || 'Add home city'}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </Button>

        {/* Bio */}
        <Button
          variant="ghost"
          className="w-full justify-between p-4 h-auto text-left border-b border-border/10 rounded-none"
          onClick={() => navigate('/profile/edit/bio')}
        >
          <span className="text-base font-medium text-foreground">Bio</span>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">
              {formData.bio || 'Add a bio'}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </Button>
      </div>

      {/* Privacy Settings */}
      <div className="px-6 py-4 mt-8 border-t border-border/10">
        <h3 className="text-lg font-semibold mb-4">Privacy Settings</h3>
        
        <div className="space-y-1">
          <div className="flex items-center justify-between py-4">
            <div>
              <div className="text-base font-medium text-foreground">Public Profile</div>
              <div className="text-sm text-muted-foreground">Allow anyone to see your profile</div>
            </div>
            <Switch
              checked={formData.is_public}
              onCheckedChange={(checked) => handleChange('is_public', checked)}
            />
          </div>

          <div className="flex items-center justify-between py-4">
            <div>
              <div className="text-base font-medium text-foreground">Friend Requests</div>
              <div className="text-sm text-muted-foreground">Allow others to send friend requests</div>
            </div>
            <Switch
              checked={formData.allow_friend_requests}
              onCheckedChange={(checked) => handleChange('allow_friend_requests', checked)}
            />
          </div>
        </div>
      </div>

      {/* Account Settings */}
      <div className="px-6 py-4 mt-4 border-t border-border/10">
        <Button
          variant="ghost"
          className="w-full justify-between p-4 h-auto text-left"
          onClick={() => navigate('/settings')}
        >
          <span className="text-base font-medium text-foreground">Account settings</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      {/* Bottom spacing for mobile navigation */}
      <div className="h-24"></div>
    </div>
  );
}