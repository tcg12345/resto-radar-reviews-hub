import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { AIChatbot } from '@/components/AIChatbot';

interface LayoutProps {
  children: ReactNode;
  activeTab?: 'home' | 'rated' | 'wishlist' | 'map' | 'search' | 'settings' | 'friends';
  showNavbar?: boolean;
  showChatbot?: boolean;
}

export function Layout({ 
  children, 
  activeTab = 'search', 
  showNavbar = true, 
  showChatbot = true 
}: LayoutProps) {
  const navigate = useNavigate();

  const handleTabChange = (tab: 'home' | 'rated' | 'wishlist' | 'map' | 'search' | 'settings' | 'friends') => {
    if (tab === 'search') {
      // If they click search while on friends-activity, keep them there
      // Otherwise navigate to main dashboard
      if (window.location.pathname !== '/friends-activity') {
        navigate('/', { state: { activeTab: 'search' } });
      }
    } else {
      // Navigate to main dashboard with the selected tab
      navigate('/', { state: { activeTab: tab } });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background mobile-viewport">
      {showNavbar && (
        <Navbar 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
        />
      )}
      
      <main className="flex-1 pb-16 lg:pb-0 mobile-scroll">
        <div className="min-h-full mobile-container">
          {children}
        </div>
      </main>
      
      {showChatbot && <AIChatbot />}
    </div>
  );
}