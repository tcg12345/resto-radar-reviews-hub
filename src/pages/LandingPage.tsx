import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Heart, Users, TrendingUp, Award, ChefHat, Utensils, Moon, Sun, Bot, Mic, Search, Calendar, Camera, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { GrubbyLogo } from '@/components/GrubbyLogo';
import heroImage from '@/assets/hero-restaurant.jpg';

export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleGetStarted = () => {
    navigate('/auth');
  };

  const handleViewDemo = () => {
    navigate('/demo');
  };

  const handleSignIn = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted mobile-viewport no-horizontal-scroll">
      {/* Mobile-Only Version */}
      <div className="min-h-screen flex flex-col">
        {/* Mobile Navigation */}
        <nav className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur border-b">
          <div className="flex h-12 items-center justify-between px-3">
            <GrubbyLogo size="sm" />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-8 w-8"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
          </div>
        </nav>

        {/* Mobile Content - Centered */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center space-y-6">
          <div className="space-y-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Find Great Food
            </h1>
            <p className="text-sm text-muted-foreground">
              Discover and rate restaurants with AI
            </p>
          </div>
          
          <div className="w-full max-w-xs space-y-3">
            <Button 
              className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
              onClick={handleGetStarted}
            >
              Get Started
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleSignIn}
            >
              Sign In
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}