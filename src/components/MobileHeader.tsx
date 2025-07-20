import { Settings, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { GrubbyLogo } from '@/components/GrubbyLogo';

interface MobileHeaderProps {
  activeTab: 'home' | 'rated' | 'wishlist' | 'map' | 'search' | 'settings' | 'friends';
  onTabChange: (tab: 'home' | 'rated' | 'wishlist' | 'map' | 'search' | 'settings' | 'friends') => void;
  onBack?: () => void;
  title?: string;
  showSettings?: boolean;
}

export function MobileHeader({ 
  activeTab, 
  onTabChange, 
  onBack, 
  title, 
  showSettings = true 
}: MobileHeaderProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getTitle = () => {
    if (title) return title;
    
    switch (activeTab) {
      case 'home': return 'Grubby';
      case 'rated': return 'My Ratings';
      case 'wishlist': return 'Wishlist';
      case 'map': return 'Map View';
      case 'search': return 'Search & Discover';
      case 'settings': return 'Settings';
      case 'friends': return 'Friends';
      default: return 'Grubby';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {onBack ? (
            <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : activeTab === 'home' ? (
            <div className="cursor-pointer" onClick={() => onTabChange('home')}>
              <GrubbyLogo size="sm" showText={false} />
            </div>
          ) : null}
          
          <h1 className="text-lg font-semibold leading-none">{getTitle()}</h1>
        </div>

        {showSettings && (
          <div className="flex items-center">
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onTabChange('settings')}
                className="h-8 w-8 p-0"
              >
                <Settings className="h-4 w-4" />
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/auth')}
                className="text-xs"
              >
                Sign In
              </Button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}