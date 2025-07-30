
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
  activeTab: 'home' | 'places' | 'search' | 'settings' | 'friends' | 'travel';
  onTabChange: (tab: 'home' | 'places' | 'search' | 'settings' | 'friends' | 'travel') => void;
}

export function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const unreadMessageCount = useUnreadMessageCount();

  const tabs = [
    { id: 'home' as const, label: 'Home', icon: Home, shortLabel: 'Home' },
    { id: 'search' as const, label: 'Search & Discover', icon: Search, shortLabel: 'Search' },
    { id: 'places' as const, label: 'My Places', icon: Star, shortLabel: 'Places' },
    { id: 'travel' as const, label: 'Travel', icon: Calendar, shortLabel: 'Travel' },
    { id: 'friends' as const, label: 'Friends', icon: Users, shortLabel: 'Friends' },
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
      <nav className="lg:hidden sticky top-0 z-50 w-full bg-background border-b border-border/50 pt-3">
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

      {/* Mobile Bottom Navigation - Modern Circular Design */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/20">
        <div className="pb-safe-area-bottom">
          <div className="flex justify-around items-center px-4 py-4 pb-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <div key={tab.id} className="flex flex-col items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onTabChange(tab.id)}
                    className={`relative h-11 w-11 mobile-tap-target transition-all duration-300 ${
                      isActive 
                        ? 'text-primary bg-transparent hover:bg-transparent' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 hover:scale-105'
                    }`}
                  >
                    <Icon className={`transition-all duration-300 ${
                      isActive ? 'text-primary h-6 w-6' : 'h-5 w-5'
                    }`} />
                  </Button>
                  <span className={`transition-all duration-300 -mt-2 pb-1 ${
                    isActive ? 'text-primary text-[10px] font-bold' : 'text-muted-foreground text-[9px] font-medium'
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
