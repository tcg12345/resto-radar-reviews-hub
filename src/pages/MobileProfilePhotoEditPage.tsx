import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Camera, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function MobileProfilePhotoEditPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setIsUploading(true);
    try {
      // Create a unique filename
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `avatar-${user.id}-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, selectedFile, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success('Profile photo updated successfully');
      navigate(-1);
      
      // Refresh the page to show updated avatar
      setTimeout(() => window.location.reload(), 100);
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!user) return;

    setIsUploading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile photo removed');
      navigate(-1);
      
      // Refresh the page to show updated avatar
      setTimeout(() => window.location.reload(), 100);
    } catch (error) {
      console.error('Error removing photo:', error);
      toast.error('Failed to remove photo');
    } finally {
      setIsUploading(false);
    }
  };

  const resetSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
          
          <h1 className="text-lg font-semibold">Edit profile photo</h1>
          
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>
      </div>

      {/* Photo Section */}
      <div className="px-6 py-12 text-center">
        <div className="relative inline-block mb-8">
          <Avatar className="w-32 h-32 mx-auto">
            <AvatarImage 
              src={previewUrl || profile.avatar_url || ''} 
              alt="Profile photo" 
            />
            <AvatarFallback className="text-4xl font-bold bg-muted">
              {profile.name?.charAt(0) || profile.username?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Action Buttons */}
        <div className="space-y-4 max-w-sm mx-auto">
          {!selectedFile ? (
            <>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-12"
                size="lg"
              >
                <Upload className="h-5 w-5 mr-2" />
                Choose Photo
              </Button>

              {profile.avatar_url && (
                <Button
                  onClick={handleRemovePhoto}
                  variant="destructive"
                  className="w-full h-12"
                  size="lg"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-5 w-5 mr-2" />
                      Remove Photo
                    </>
                  )}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                onClick={handleUpload}
                className="w-full h-12"
                size="lg"
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Camera className="h-5 w-5 mr-2" />
                    Save Photo
                  </>
                )}
              </Button>

              <Button
                onClick={resetSelection}
                variant="outline"
                className="w-full h-12"
                size="lg"
                disabled={isUploading}
              >
                Choose Different Photo
              </Button>
            </>
          )}
        </div>

        {/* File Size Notice */}
        <p className="text-sm text-muted-foreground mt-6 max-w-sm mx-auto">
          Images must be under 5MB. Supported formats: JPG, PNG, GIF, WebP
        </p>
      </div>

      {/* Bottom spacing for mobile navigation */}
      <div className="h-24"></div>
    </div>
  );
}