import { useState } from 'react';
import { Moon, Sun, MapPin, Star, Heart, LogOut, LogIn, Home, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { GrubbyLogo } from '@/components/GrubbyLogo';

interface NavbarProps {
  activeTab: 'home' | 'rated' | 'wishlist' | 'map' | 'discover';
  onTabChange: (tab: 'home' | 'rated' | 'wishlist' | 'map' | 'discover') => void;
}

export function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const tabs = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'discover' as const, label: 'Discover', icon: Search },
    { id: 'rated' as const, label: 'My Ratings', icon: Star },
    { id: 'wishlist' as const, label: 'Wishlist', icon: Heart },
    { id: 'map' as const, label: 'Map View', icon: MapPin },
  ];
  
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/'); // Navigate to home page to show landing page
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="cursor-pointer" onClick={() => onTabChange('home')}>
          <GrubbyLogo size="md" />
        </div>

        <div className="flex items-center space-x-1 rounded-lg bg-muted/50 p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onTabChange(tab.id)}
                className={`relative px-4 py-2 transition-all duration-200 ${
                  activeTab === tab.id 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'hover:bg-muted'
                }`}
              >
                <Icon className="mr-2 h-4 w-4" />
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute inset-x-0 -bottom-1 h-0.5 bg-primary-foreground/20 rounded-full" />
                )}
              </Button>
            );
          })}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-10 w-10"
          >
            {theme === 'light' ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>

          {user ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSignOut}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/auth')}
              className="flex items-center gap-2"
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}