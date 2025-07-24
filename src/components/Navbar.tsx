
import React from 'react';
import { Home, Heart, Search, User, MapPin, Calendar, MessageCircle } from 'lucide-react';
import { NotificationsPanel } from './NotificationsPanel';

interface NavbarProps {
  activeTab: 'home' | 'rated' | 'wishlist' | 'search' | 'settings' | 'friends' | 'itinerary';
  onTabChange: (tab: 'home' | 'rated' | 'wishlist' | 'search' | 'settings' | 'friends' | 'itinerary') => void;
}

export function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const navItems = [
    { 
      id: 'home', 
      icon: Home, 
      label: 'Home',
      gradient: 'from-blue-500 to-indigo-600'
    },
    { 
      id: 'search', 
      icon: Search, 
      label: 'Search',
      gradient: 'from-purple-500 to-pink-600'
    },
    { 
      id: 'rated', 
      icon: MapPin, 
      label: 'Rated',
      gradient: 'from-green-500 to-emerald-600'
    },
    { 
      id: 'wishlist', 
      icon: Heart, 
      label: 'Wishlist',
      gradient: 'from-red-500 to-rose-600'
    },
    { 
      id: 'friends', 
      icon: MessageCircle, 
      label: 'Friends',
      gradient: 'from-orange-500 to-amber-600'
    },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border/50 z-50 pb-safe-area-inset-bottom">
        <div className="flex items-center justify-around px-2 pt-2 pb-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id as any)}
                className={`relative flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300 min-w-[60px] group ${
                  isActive 
                    ? 'bg-primary/10 scale-105' 
                    : 'hover:bg-muted/50 active:scale-95'
                }`}
              >
                <div className={`relative mb-1 ${isActive ? 'animate-mobile-scale-in' : ''}`}>
                  <div className={`p-2 rounded-xl transition-all duration-300 ${
                    isActive 
                      ? `bg-gradient-to-br ${item.gradient} shadow-lg shadow-primary/25` 
                      : 'bg-muted/30 group-hover:bg-muted/50'
                  }`}>
                    <Icon 
                      className={`h-5 w-5 transition-colors duration-300 ${
                        isActive ? 'text-white' : 'text-muted-foreground group-hover:text-foreground'
                      }`}
                    />
                  </div>
                  {isActive && (
                    <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 to-transparent rounded-xl blur-sm"></div>
                  )}
                </div>
                <span className={`text-xs font-medium transition-colors duration-300 ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full animate-mobile-scale-in"></div>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop Navigation */}
      <nav className="hidden lg:flex items-center justify-between p-6 bg-card border-b border-border">
        <div className="flex items-center space-x-8">
          <div className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Grubby
          </div>
          <div className="flex items-center space-x-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-primary text-primary-foreground shadow-lg' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <NotificationsPanel />
          <button
            onClick={() => onTabChange('settings')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 ${
              activeTab === 'settings'
                ? 'bg-primary text-primary-foreground shadow-lg' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <User className="h-4 w-4" />
            <span className="font-medium">Profile</span>
          </button>
        </div>
      </nav>
    </>
  );
}
