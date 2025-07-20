import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock, User, Phone, MapPin, ArrowLeft, CheckCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { GrubbyLogo } from '@/components/GrubbyLogo';

export default function AuthPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      }
    });
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Clear localStorage if quota might be exceeded
      try {
        const testKey = 'test-quota';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
      } catch (quotaError) {
        console.log('Storage quota exceeded, clearing localStorage');
        localStorage.clear();
      }
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      toast.success('Welcome back!');
      navigate('/');
    } catch (error: any) {
      console.error('Error signing in:', error);
      
      // Handle quota exceeded error specifically
      if (error.message && error.message.includes('quota')) {
        try {
          localStorage.clear();
          toast.error('Storage was full, cleared and please try signing in again.');
        } catch (clearError) {
          toast.error('Storage quota exceeded. Please manually clear your browser storage.');
        }
      } else if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password. Please try again.');
      } else {
        toast.error(error.message || 'Error signing in');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !name || !username || !phoneNumber) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Check if email already exists using our database function
      const { data: emailExists, error: checkError } = await supabase
        .rpc('check_email_exists', { email_to_check: email });
      
      if (checkError) {
        console.error('Error checking email:', checkError);
      }
      
      if (emailExists) {
        toast.error('An account already exists with this email. Please sign in instead.');
        return;
      }
      
      // Generate redirect URL using the current origin
      const redirectUrl = `${window.location.origin}/`;
      
      // Combine address components
      const fullAddress = [street, city, state, zipCode].filter(Boolean).join(', ');
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        phone: phoneNumber, // This will save to the phone field in auth.users
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: name,
            username: username,
            phone_number: phoneNumber, // Also keep in metadata for profiles table
            address: fullAddress,
            is_public: isPublic,
          }
        }
      });
      
      if (error) throw error;
      
      toast.success('Account created! Please check your email to verify your account.');
      
    } catch (error: any) {
      console.error('Error signing up:', error);
      
      if (error.message.includes('User already registered') || error.message.includes('already been registered')) {
        toast.error('An account already exists with this email. Please sign in instead.');
      } else if (error.message.includes('Username') || error.message.includes('username')) {
        toast.error('Username already taken. Please choose a different username.');
      } else if (error.message.includes('duplicate') || error.message.includes('unique')) {
        toast.error('This email or username is already taken. Please try different credentials.');
      } else {
        toast.error(error.message || 'Error creating account');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    
    try {
      setIsResetLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      
      if (error) throw error;
      
      toast.success('Password reset email sent! Check your inbox.');
      setIsResetMode(false);
    } catch (error: any) {
      console.error('Error sending reset email:', error);
      toast.error(error.message || 'Error sending reset email');
    } finally {
      setIsResetLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setUsername('');
    setPhoneNumber('');
    setStreet('');
    setCity('');
    setState('');
    setZipCode('');
    setIsPublic(false);
    setShowPassword(false);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    resetForm();
  };

  if (isResetMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in">
          <Card className="shadow-xl border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader className="space-y-6 text-center pb-8">
              <div className="mx-auto">
                <GrubbyLogo size="lg" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                  Reset Password
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-2">
                  Enter your email to receive a password reset link
                </CardDescription>
              </div>
            </CardHeader>
            
            <form onSubmit={handleForgotPassword}>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-sm font-medium">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12"
                      required
                    />
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-col space-y-4 pt-6">
                <Button 
                  type="submit" 
                  className="w-full h-12 font-medium bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-opacity" 
                  disabled={isResetLoading}
                >
                  {isResetLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>
                
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsResetMode(false)}
                  className="w-full h-10 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-fade-in">
        <Card className="shadow-xl border-0 bg-card/50 backdrop-blur-sm">
          <CardHeader className="space-y-6 text-center pb-8">
            <div className="mx-auto">
              <GrubbyLogo size="lg" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                Welcome to Grubby
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2 text-base">
                Your personal restaurant discovery platform
              </CardDescription>
            </div>
          </CardHeader>
          
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-2 bg-muted/30 h-12">
                <TabsTrigger value="signin" className="h-10 font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="h-10 font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  Sign Up
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="signin" className="mt-0">
              <form onSubmit={handleSignIn}>
                <CardContent className="space-y-6 pt-8 px-6">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-sm font-medium">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-sm font-medium">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-12 h-12"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto text-sm text-primary hover:text-primary-glow"
                      onClick={() => setIsResetMode(true)}
                    >
                      Forgot your password?
                    </Button>
                  </div>
                </CardContent>
                
                <CardFooter className="flex flex-col space-y-4 pt-6 px-6">
                  <Button 
                    type="submit" 
                    className="w-full h-12 font-medium bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-opacity" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                  
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      New to Grubby?
                    </p>
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 font-medium border-2 hover:bg-primary/5"
                    onClick={() => setActiveTab('signup')}
                  >
                    Create Account
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="mt-0">
              <form onSubmit={handleSignUp}>
                <CardContent className="space-y-6 pt-8 px-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <User className="h-4 w-4" />
                      Personal Information
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name" className="text-sm font-medium">Full Name *</Label>
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="John Doe"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="h-11"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="signup-username" className="text-sm font-medium">Username *</Label>
                        <Input
                          id="signup-username"
                          type="text"
                          placeholder="johndoe"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="h-11"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="signup-phone" className="text-sm font-medium">Phone Number *</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-phone"
                            type="tel"
                            placeholder="+1 (555) 123-4567"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="pl-10 h-11"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Address Information */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      Address (Optional)
                    </div>
                    
                    <div className="space-y-3">
                      <Input
                        id="signup-street"
                        type="text"
                        placeholder="123 Main Street"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        className="h-11"
                      />
                      
                      <div className="grid grid-cols-3 gap-3">
                        <Input
                          id="signup-city"
                          type="text"
                          placeholder="City"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="h-11"
                        />
                        <Input
                          id="signup-state"
                          type="text"
                          placeholder="State"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          className="h-11"
                        />
                        <Input
                          id="signup-zip"
                          type="text"
                          placeholder="ZIP"
                          value={zipCode}
                          onChange={(e) => setZipCode(e.target.value)}
                          className="h-11"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Account Credentials */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Lock className="h-4 w-4" />
                      Account Credentials
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="text-sm font-medium">Email Address *</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="your.email@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-10 h-11"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="text-sm font-medium">Password *</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a strong password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-10 pr-12 h-11"
                            minLength={6}
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Password must be at least 6 characters
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Privacy Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 p-4 bg-muted/30 rounded-lg">
                      <Checkbox
                        id="signup-public"
                        checked={isPublic}
                        onCheckedChange={(checked) => setIsPublic(checked as boolean)}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="signup-public" className="text-sm font-medium cursor-pointer">
                          Make my profile public
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Others can see your ratings without being friends
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="flex flex-col space-y-4 pt-6 px-6">
                  <Button 
                    type="submit" 
                    className="w-full h-12 font-medium bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-opacity" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                  
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Already have an account?
                    </p>
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 font-medium border-2 hover:bg-primary/5"
                    onClick={() => setActiveTab('signin')}
                  >
                    Sign In Instead
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
        
        <div className="text-center mt-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}