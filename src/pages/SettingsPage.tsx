import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Eye, EyeOff, User, Mail, Phone, MapPin, Settings as SettingsIcon, Shield, Key, Moon, Sun, Map, Satellite, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SettingsPageProps {
  onBack: () => void;
}

export default function SettingsPage({ onBack }: SettingsPageProps) {
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

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


  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setIsDeletingAccount(true);
    try {
      console.log('Starting account deletion process...');
      
      // Get the current session to include in the request
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      console.log('Session found, calling delete function...');

      // Call the edge function to delete the account
      const { data, error } = await supabase.functions.invoke('delete-user-account', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Function error details:', error);
        throw new Error(`Function error: ${error.message || JSON.stringify(error)}`);
      }

      if (data?.error) {
        console.error('Response error:', data.error);
        throw new Error(data.error);
      }

      toast.success('Account deleted successfully');
      console.log('Account deletion completed successfully');
      // The auth state will automatically update and redirect the user
    } catch (error: any) {
      console.error('Error deleting account:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      toast.error('Failed to delete account: ' + (error.message || 'Unknown error'));
    } finally {
      setIsDeletingAccount(false);
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
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">Settings</h1>
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

            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  Delete Account
                </CardTitle>
                <CardDescription>
                  Permanently delete your account and all associated data. This action cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <p className="text-sm font-medium text-destructive mb-2">
                      ⚠️ Warning: This will permanently delete:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Your profile and account information</li>
                      <li>• All your restaurant ratings and reviews</li>
                      <li>• Your wishlist and saved restaurants</li>
                      <li>• Friend connections and requests</li>
                      <li>• Reservation history</li>
                      <li>• All app preferences and settings</li>
                    </ul>
                  </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        className="w-full md:w-auto"
                        disabled={isDeletingAccount}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {isDeletingAccount ? 'Deleting Account...' : 'Delete My Account'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-destructive">
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                          <p>
                            This action cannot be undone. This will permanently delete your account
                            and remove all your data from our servers.
                          </p>
                          <p className="font-medium">
                            Type "DELETE" in the box below to confirm:
                          </p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={isDeletingAccount}
                        >
                          {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}