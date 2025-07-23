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
    // Navigate to the appropriate route for each tab
    switch (tab) {
      case 'home':
        navigate('/home');
        break;
      case 'rated':
        navigate('/rated');
        break;
      case 'wishlist':
        navigate('/wishlist');
        break;
      case 'map':
        navigate('/map');
        break;
      case 'search':
        navigate('/search/global');
        break;
      case 'settings':
        navigate('/settings');
        break;
      case 'friends':
        navigate('/friends');
        break;
      default:
        navigate('/home');
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