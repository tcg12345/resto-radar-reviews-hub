import { useState } from 'react';
import { Moon, Sun, MapPin, Star, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';

interface NavbarProps {
  activeTab: 'rated' | 'wishlist' | 'map';
  onTabChange: (tab: 'rated' | 'wishlist' | 'map') => void;
}

export function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();

  const tabs = [
    { id: 'rated' as const, label: 'My Ratings', icon: Star },
    { id: 'wishlist' as const, label: 'Wishlist', icon: Heart },
    { id: 'map' as const, label: 'Map View', icon: MapPin },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
            <span className="text-lg font-bold text-primary-foreground">R</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">RestaurantRater</h1>
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
      </div>
    </nav>
  );
}