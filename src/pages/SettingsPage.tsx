import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Eye, EyeOff, User, Mail, Phone, MapPin, Settings as SettingsIcon, Shield, Key, Moon, Sun, Map, Satellite, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useDefaultReviewSource, type ReviewSource } from '@/hooks/useDefaultReviewSource';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SettingsPageProps {
  onBack: () => void;
}

export default function SettingsPage({ onBack }: SettingsPageProps) {
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { defaultSource, updateDefaultSource, isLoading: isLoadingReviewSource } = useDefaultReviewSource();
  const [defaultMapStyle, setDefaultMapStyle] = useLocalStorage<'streets' | 'satellite' | 'hybrid'>('defaultMapStyle', 'satellite');
  
  // Profile form state
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [allowFriendRequests, setAllowFriendRequests] = useState(true);
  
  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  
  // Loading states
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Load current profile data
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setUsername(profile.username || '');
      setPhoneNumber(profile.phone_number || '');
      setIsPublic(profile.is_public || false);
      setAllowFriendRequests(profile.allow_friend_requests || true);
      
      // Parse address back into components
      if (profile.address) {
        const addressParts = profile.address.split(', ');
        if (addressParts.length >= 1) setStreet(addressParts[0] || '');
        if (addressParts.length >= 2) setCity(addressParts[1] || '');
        if (addressParts.length >= 3) setState(addressParts[2] || '');
        if (addressParts.length >= 4) setZipCode(addressParts[3] || '');
      }
    }
  }, [profile]);

  const handleProfileUpdate = async () => {
    if (!user || !profile) return;

    setIsUpdatingProfile(true);
    try {
      // Combine address components
      const fullAddress = [street, city, state, zipCode].filter(Boolean).join(', ');
      
      const { error } = await supabase
        .from('profiles')
        .update({
          name,
          username,
          phone_number: phoneNumber,
          address: fullAddress,
          is_public: isPublic,
          allow_friend_requests: allowFriendRequests,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      if (error.message.includes('duplicate key value violates unique constraint')) {
        toast.error('Username already taken. Please choose a different username.');
      } else {
        toast.error('Failed to update profile: ' + error.message);
      }
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password: ' + error.message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleReviewSourceChange = async (source: ReviewSource) => {
    await updateDefaultSource(source);
    toast.success(`Default review source set to ${source === 'google' ? 'Google' : 'Yelp'}`);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Settings</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Account
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Update your personal details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a unique username"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Address Information
                  </h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="street">Street Address</Label>
                    <Input
                      id="street"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="New York"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="NY"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip">ZIP Code</Label>
                      <Input
                        id="zip"
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        placeholder="10001"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleProfileUpdate}
                  disabled={isUpdatingProfile}
                  className="w-full md:w-auto"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isUpdatingProfile ? 'Updating...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  App Preferences
                </CardTitle>
                <CardDescription>
                  Customize your app experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="theme-toggle">Theme</Label>
                    <p className="text-sm text-muted-foreground">
                      Switch between light and dark mode
                    </p>
                  </div>
                  <Button
                    id="theme-toggle"
                    variant="outline"
                    size="sm"
                    onClick={toggleTheme}
                    className="flex items-center gap-2"
                  >
                    {theme === 'light' ? (
                      <>
                        <Sun className="h-4 w-4" />
                        Light
                      </>
                    ) : (
                      <>
                        <Moon className="h-4 w-4" />
                        Dark
                      </>
                    )}
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-0.5">
                    <Label>Default Map View</Label>
                    <p className="text-sm text-muted-foreground">
                      Choose your preferred map style for the map view
                    </p>
                  </div>
                  
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant={defaultMapStyle === 'streets' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDefaultMapStyle('streets')}
                      className="flex items-center gap-2"
                    >
                      <Map className="h-4 w-4" />
                      Streets
                    </Button>
                    
                    <Button
                      variant={defaultMapStyle === 'satellite' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDefaultMapStyle('satellite')}
                      className="flex items-center gap-2"
                    >
                      <Satellite className="h-4 w-4" />
                      Satellite
                    </Button>
                    
                    <Button
                      variant={defaultMapStyle === 'hybrid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDefaultMapStyle('hybrid')}
                      className="flex items-center gap-2"
                    >
                      <Satellite className="h-4 w-4" />
                      Hybrid
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Review Source Settings */}
                <div className="space-y-4">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Default Review Source
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Choose your preferred review source for restaurant ratings in search results
                    </p>
                  </div>
                  
                  <Select 
                    value={defaultSource} 
                    onValueChange={handleReviewSourceChange}
                    disabled={isLoadingReviewSource}
                  >
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <span>Google Reviews</span>
                          <Badge variant="outline" className="text-xs">Default</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="yelp">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span>Yelp Reviews</span>
                          <Badge variant="outline" className="text-xs">More Reviews</Badge>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Review Source Comparison</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <span className="font-medium">Google Reviews</span>
                        </div>
                        <ul className="space-y-1 text-muted-foreground">
                          <li>• Integrated with Google Maps</li>
                          <li>• Usually 3-5 reviews per restaurant</li>
                          <li>• Verified by Google accounts</li>
                          <li>• Often shorter, quick reviews</li>
                        </ul>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="font-medium">Yelp Reviews</span>
                        </div>
                        <ul className="space-y-1 text-muted-foreground">
                          <li>• Dedicated restaurant platform</li>
                          <li>• More detailed reviews (10-20+)</li>
                          <li>• Photos and detailed experiences</li>
                          <li>• Active foodie community</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacy Settings
                </CardTitle>
                <CardDescription>
                  Control who can see your information and send you friend requests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="public-account">Public Account</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow anyone to see your ratings and reviews without being friends
                    </p>
                  </div>
                  <Switch
                    id="public-account"
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="friend-requests">Allow Friend Requests</Label>
                    <p className="text-sm text-muted-foreground">
                      Let other users send you friend requests
                    </p>
                  </div>
                  <Switch
                    id="friend-requests"
                    checked={allowFriendRequests}
                    onCheckedChange={setAllowFriendRequests}
                  />
                </div>

                <Button
                  onClick={handleProfileUpdate}
                  disabled={isUpdatingProfile}
                  className="w-full md:w-auto"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isUpdatingProfile ? 'Updating...' : 'Save Privacy Settings'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your account password
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPasswords ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPasswords(!showPasswords)}
                    >
                      {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type={showPasswords ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    minLength={6}
                  />
                </div>

                <p className="text-sm text-muted-foreground">
                  Password must be at least 6 characters long
                </p>

                <Button
                  onClick={handlePasswordChange}
                  disabled={isChangingPassword || !newPassword || !confirmPassword}
                  className="w-full md:w-auto"
                >
                  <Key className="h-4 w-4 mr-2" />
                  {isChangingPassword ? 'Changing Password...' : 'Change Password'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Account Information
                </CardTitle>
                <CardDescription>
                  View your account details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    value={user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-sm text-muted-foreground">
                    Email cannot be changed. Contact support if you need to update your email.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Account Created</Label>
                  <Input
                    value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Last Updated</Label>
                  <Input
                    value={profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'Unknown'}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Sign Out</CardTitle>
                <CardDescription>
                  Sign out of your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleSignOut}
                  variant="destructive"
                  className="w-full md:w-auto"
                >
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}