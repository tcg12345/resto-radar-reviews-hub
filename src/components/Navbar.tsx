
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
  activeTab: 'home' | 'rated' | 'wishlist' | 'search' | 'settings' | 'friends' | 'travel';
  onTabChange: (tab: 'home' | 'rated' | 'wishlist' | 'search' | 'settings' | 'friends' | 'travel') => void;
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
    { id: 'travel' as const, label: 'Travel', icon: Calendar, shortLabel: 'Travel' },
    { id: 'friends' as const, label: 'Friends', icon: Users, shortLabel: 'Friends' },
  ];

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:block sticky top-0 z-50 w-full border-b glass-effect">
        <div className="page-container">
          <div className="flex items-center h-16">
            <div className="cursor-pointer mr-8" onClick={() => onTabChange('home')}>
              <GrubbyLogo size="md" />
            </div>

            <div className="flex-1 flex-center">
              <div className="flex items-center gap-component rounded-lg bg-muted/50 p-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <Button
                      key={tab.id}
                      variant={activeTab === tab.id ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => onTabChange(tab.id)}
                      className={`relative button-responsive transition-all duration-200 ${
                        activeTab === tab.id 
                          ? 'bg-primary text-primary-foreground shadow-premium' 
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

            <div className="flex-start gap-component">
              {user ? (
                <>
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => navigate('/chat-list')}
                    className="tap-target relative"
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
                    className="tap-target"
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
                  className="button-responsive"
                >
                  <Settings className="h-4 w-4" />
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Top Bar */}
      <nav className="lg:hidden sticky top-0 z-50 w-full glass-effect pt-3">
        <div className="flex h-14 items-center justify-between spacing-content">
          <div className="cursor-pointer" onClick={() => onTabChange('home')}>
            <GrubbyLogo size="sm" />
          </div>
          
          <div className="flex-start gap-component">
            {user ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/chat-list')}
                  className="tap-target relative rounded-full"
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
                  className="tap-target rounded-full"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/auth')}
                className="button-responsive rounded-full"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-effect border-t">
        <div className="pb-safe-area-bottom">
          <div className="flex justify-around items-center spacing-content py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <div key={tab.id} className="flex flex-col items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onTabChange(tab.id)}
                    className={`relative tap-target rounded-full transition-all duration-300 transform ${
                      isActive 
                        ? 'bg-primary text-primary-foreground shadow-premium scale-110' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 hover:scale-105'
                    }`}
                  >
                    <Icon className={`h-4 w-4 transition-all duration-300 ${
                      isActive ? 'text-primary-foreground' : ''
                    }`} />
                    {isActive && (
                      <div className="absolute -inset-1 rounded-full bg-primary/20 blur-sm" />
                    )}
                  </Button>
                  <span className={`text-[9px] font-medium transition-all duration-300 pb-[10px] ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
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
