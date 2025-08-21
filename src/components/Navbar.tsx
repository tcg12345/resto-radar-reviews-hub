import { useState } from 'react';
import { MapPin, Star, Heart, Home, Search, Settings, Users, MessageCircle, Calendar, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { GrubbyLogo } from '@/components/GrubbyLogo';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';

interface NavbarProps {
  activeTab: 'home' | 'places' | 'search' | 'settings' | 'profile' | 'travel' | 'friends';
  onTabChange: (tab: 'home' | 'places' | 'search' | 'settings' | 'profile' | 'travel' | 'friends') => void;
}

export function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const unreadMessageCount = useUnreadMessageCount();

  const tabsMobile = [
    { id: 'home' as const, label: 'Home', icon: Home, shortLabel: 'Home' },
    { id: 'search' as const, label: 'Search & Discover', icon: Search, shortLabel: 'Search' },
    { id: 'places' as const, label: 'My Places', icon: Star, shortLabel: 'Places' },
    { id: 'travel' as const, label: 'Travel', icon: Calendar, shortLabel: 'Travel' },
    { id: 'profile' as const, label: 'Profile', icon: User, shortLabel: 'Profile' },
  ];

  return (
    <>
      {/* Mobile Top Bar - Always visible */}
      <nav className="sticky top-0 z-50 w-full bg-background border-b border-border/50 pt-safe-area-top">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="cursor-pointer" onClick={() => onTabChange('home')}>
            <GrubbyLogo size="sm" />
          </div>
          
          <div className="flex items-center space-x-3">
            {user ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/chat-list')}
                  className="h-9 w-9 relative mobile-tap-target rounded-full"
                >
                  <MessageCircle className="h-5 w-5" />
                  {unreadMessageCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                      {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                    </span>
                  )}
                </Button>
                <NotificationsPanel />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onTabChange('settings')}
                  className="h-9 w-9 mobile-tap-target rounded-full"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </>
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

      {/* Mobile Bottom Navigation - Always visible */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/20">
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