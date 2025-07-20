import { MapPin, Star, Heart, Home, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileNavbarProps {
  activeTab: 'home' | 'rated' | 'wishlist' | 'map' | 'search' | 'settings' | 'friends';
  onTabChange: (tab: 'home' | 'rated' | 'wishlist' | 'map' | 'search' | 'settings' | 'friends') => void;
}

export function MobileNavbar({ activeTab, onTabChange }: MobileNavbarProps) {
  const tabs = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'search' as const, label: 'Search', icon: Search },
    { id: 'rated' as const, label: 'Rated', icon: Star },
    { id: 'wishlist' as const, label: 'Wishlist', icon: Heart },
    { id: 'friends' as const, label: 'Friends', icon: Users },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
      <div className="flex items-center justify-around px-2 py-2 safe-area-bottom">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <Button
              key={tab.id}
              variant="ghost"
              size="sm"
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-1 h-auto py-2 px-3 min-w-0 flex-1 ${
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'fill-current' : ''}`} />
              <span className="text-xs font-medium leading-none">{tab.label}</span>
              {isActive && (
                <div className="w-1 h-1 bg-primary rounded-full" />
              )}
            </Button>
          );
        })}
      </div>
    </nav>
  );
}