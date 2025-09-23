
import { useState } from 'react';
import { MapPin, Star, Heart, Home, Search, Settings, Users, MessageCircle, Calendar, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { GrubbyLogo } from '@/components/GrubbyLogo';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';
import { AppSidebar } from '@/components/AppSidebar';

interface NavbarProps {
  activeTab: 'home' | 'places' | 'search' | 'settings' | 'profile' | 'travel' | 'friends';
  onTabChange: (tab: 'home' | 'places' | 'search' | 'settings' | 'profile' | 'travel' | 'friends') => void;
}

export function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const unreadMessageCount = useUnreadMessageCount();

  const tabsDesktop = [
    { id: 'home' as const, label: 'Home', icon: Home, shortLabel: 'Home' },
    { id: 'search' as const, label: 'Search & Discover', icon: Search, shortLabel: 'Search' },
    { id: 'places' as const, label: 'My Places', icon: Star, shortLabel: 'Places' },
    { id: 'friends' as const, label: 'Friends', icon: Users, shortLabel: 'Friends' },
    { id: 'profile' as const, label: 'Profile', icon: User, shortLabel: 'Profile' },
  ];

  const tabsMobile = [
    { id: 'home' as const, label: 'Home', icon: Home, shortLabel: 'Home' },
    { id: 'search' as const, label: 'Search & Discover', icon: Search, shortLabel: 'Search' },
    { id: 'places' as const, label: 'My Places', icon: Star, shortLabel: 'Places' },
    { id: 'friends' as const, label: 'Friends', icon: Users, shortLabel: 'Friends' },
    { id: 'profile' as const, label: 'Profile', icon: User, shortLabel: 'Profile' },
  ];

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:block sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full max-w-none flex h-16 items-center px-6">
          <div className="cursor-pointer mr-8" onClick={() => onTabChange('home')}>
            <GrubbyLogo size="md" />
          </div>

          <div className="flex-1 flex justify-center">
            <div className="flex items-center space-x-1 rounded-lg bg-muted/50 p-1">
              {tabsDesktop.map((tab) => {
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
          </div>

          <div className="flex items-center space-x-2">
            {user ? (
              <AppSidebar />
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/auth')}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Top Bar */}
      <nav className="lg:hidden sticky top-0 z-50 w-full bg-background border-b border-border/50 pt-safe-area-top">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="cursor-pointer" onClick={() => onTabChange('home')}>
            <GrubbyLogo size="sm" />
          </div>
          
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="lg:hidden">
                <AppSidebar />
              </div>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/auth')}
                className="mobile-tap-target rounded-full px-4"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation - Modern Circular Design */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/20">
        <div className="pb-safe-area-bottom">
          <div className="flex justify-around items-center px-4 pt-0 pb-1">
            {tabsMobile.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <div key={tab.id} className="flex flex-col items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onTabChange(tab.id)}
                    className={`relative h-12 w-12 mobile-tap-target transition-all duration-300 ${
                      isActive 
                        ? 'text-primary bg-transparent hover:bg-transparent' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 hover:scale-105'
                    }`}
                  >
                    <Icon className={`transition-all duration-300 ${
                      isActive ? 'text-primary h-8 w-8' : 'h-7 w-7'
                    }`} />
                  </Button>
                  <span className={`transition-all duration-300 -mt-2 pb-1 ${
                    isActive ? 'text-primary text-[12px] font-bold' : 'text-muted-foreground text-[11px] font-medium'
                  }`}>
                    {tab.shortLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
