
import { useState } from 'react';
import { Star, Home, Search, Settings, Users, User, Bell, Menu } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'search' as const, label: 'Discover', icon: Search },
    { id: 'places' as const, label: 'My Places', icon: Star },
    { id: 'friends' as const, label: 'Friends', icon: Users },
    { id: 'profile' as const, label: 'Profile', icon: User },
  ];

  const tabsMobile: { id: typeof tabsDesktop[number]['id']; label: string; icon: any }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'places', label: 'Places', icon: Star },
    { id: 'friends', label: 'Friends', icon: Users },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:block sticky top-0 z-50 w-full glass-nav border-b border-outline-variant/20">
        <div className="w-full max-w-none flex h-16 items-center px-6">
          <div className="cursor-pointer mr-8" onClick={() => onTabChange('home')}>
            <GrubbyLogo size="md" />
          </div>

          <div className="flex-1 flex justify-center">
            <div className="flex items-center space-x-1">
              {tabsDesktop.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-surface-container-high'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button className="text-primary hover:opacity-80 transition-opacity">
              <Bell size={22} />
            </button>
            {user ? (
              <AppSidebar />
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/auth')}
                className="rounded-full px-5 border-primary/20 text-primary hover:bg-primary/5"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Top Bar - Glass style */}
      <nav className="lg:hidden sticky top-0 z-50 w-full glass-nav pt-safe-area-top border-b border-outline-variant/20">
        <div className="flex h-14 items-center justify-between px-5">
          <div className="cursor-pointer" onClick={() => onTabChange('home')}>
            <GrubbyLogo size="sm" />
          </div>
          
          <div className="flex items-center space-x-3">
            <button className="text-primary hover:opacity-80 transition-opacity">
              <Bell size={22} />
            </button>
            {user ? (
              <div className="lg:hidden">
                <AppSidebar />
              </div>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/auth')}
                className="rounded-full px-4 border-primary/20 text-primary"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation - Glass rounded */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-nav rounded-t-3xl shadow-[0_-4px_20px_0_rgba(30,27,26,0.06)]">
        <div className="pb-safe-area-bottom">
          <div className="flex justify-around items-center px-4 h-20">
            {tabsMobile.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex flex-col items-center justify-center transition-all duration-200 ${
                    isActive ? 'text-primary font-bold scale-110' : 'text-muted-foreground hover:text-primary'
                  }`}
                >
                  <Icon size={24} fill={isActive ? 'currentColor' : 'none'} />
                  <span className="text-[10px] font-medium uppercase tracking-widest mt-1">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
