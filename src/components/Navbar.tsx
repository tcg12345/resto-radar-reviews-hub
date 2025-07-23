
import { useState } from 'react';
import { MapPin, Star, Heart, Home, Search, Settings, Users, MessageCircle, Calendar } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { GrubbyLogo } from '@/components/GrubbyLogo';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';

interface NavbarProps {
  activeTab: 'home' | 'rated' | 'wishlist' | 'map' | 'search' | 'settings' | 'friends' | 'itinerary';
  onTabChange: (tab: 'home' | 'rated' | 'wishlist' | 'map' | 'search' | 'settings' | 'friends' | 'itinerary') => void;
}

export function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const unreadMessageCount = useUnreadMessageCount();

  const tabs = [
    { id: 'home' as const, label: 'Home', icon: Home, shortLabel: 'Home' },
    { id: 'search' as const, label: 'Search & Discover', icon: Search, shortLabel: 'Search' },
    { id: 'rated' as const, label: 'My Ratings', icon: Star, shortLabel: 'Rated' },
    { id: 'wishlist' as const, label: 'Wishlist', icon: Heart, shortLabel: 'Wishlist' },
    { id: 'itinerary' as const, label: 'Itinerary', icon: Calendar, shortLabel: 'Itinerary' },
    { id: 'friends' as const, label: 'Friends', icon: Users, shortLabel: 'Friends' },
    { id: 'map' as const, label: 'Map View', icon: MapPin, shortLabel: 'Map' },
  ];

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:block sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <div className="cursor-pointer mr-8" onClick={() => onTabChange('home')}>
            <GrubbyLogo size="md" />
          </div>

          <div className="flex-1 flex justify-center">
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
          </div>

          <div className="flex items-center space-x-2">
            {user ? (
              <>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => navigate('/chat-list')}
                  className="h-12 w-12 relative"
                  title="Messages"
                >
                  <MessageCircle className="h-6 w-6" />
                  {unreadMessageCount > 0 && (
                    <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                    </span>
                  )}
                  <span className="sr-only">Messages</span>
                </Button>
                <NotificationsPanel />
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => onTabChange('settings')}
                  className="h-12 w-12"
                >
                  <Settings className="h-8 w-8" />
                  <span className="sr-only">Settings</span>
                </Button>
              </>
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
      <nav className="lg:hidden sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 safe-area-top">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="cursor-pointer" onClick={() => onTabChange('home')}>
            <GrubbyLogo size="sm" />
          </div>
          
          <div className="flex items-center space-x-2">
            {user ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/chat-list')}
                  className="h-10 w-10 relative mobile-tap-target"
                >
                  <MessageCircle className="h-5 w-5" />
                  {unreadMessageCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                    </span>
                  )}
                </Button>
                <NotificationsPanel />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onTabChange('settings')}
                  className="h-10 w-10 mobile-tap-target"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/auth')}
                className="mobile-tap-target"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 safe-area-bottom">
        <div className="grid grid-cols-6 gap-1 p-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                variant="ghost"
                size="sm"
                onClick={() => onTabChange(tab.id)}
                className={`relative flex flex-col items-center justify-center h-12 w-full mobile-tap-target transition-all duration-200 ${
                  isActive 
                    ? 'text-primary bg-primary/10' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className={`h-5 w-5 mb-0.5 ${isActive ? 'text-primary' : ''}`} />
                <span className={`text-xs leading-tight line-clamp-1 ${isActive ? 'text-primary font-medium' : ''}`}>
                  {tab.shortLabel}
                </span>
                {isActive && (
                  <div className="absolute inset-x-2 top-0 h-0.5 bg-primary rounded-full" />
                )}
              </Button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
