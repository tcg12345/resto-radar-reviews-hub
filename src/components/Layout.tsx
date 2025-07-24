import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { AIChatbot } from '@/components/AIChatbot';

interface LayoutProps {
  children: ReactNode;
  activeTab?: 'home' | 'rated' | 'wishlist' | 'search' | 'settings' | 'friends' | 'itinerary';
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

  const handleTabChange = (tab: 'home' | 'rated' | 'wishlist' | 'search' | 'settings' | 'friends' | 'itinerary') => {
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
      case 'search':
        navigate('/search/global');
        break;
      case 'settings':
        navigate('/settings');
        break;
      case 'friends':
        navigate('/friends');
        break;
      case 'itinerary':
        navigate('/itinerary');
        break;
      default:
        navigate('/home');
    }
  };

  return (
    <div className={`flex min-h-screen flex-col bg-background mobile-viewport`}>
      {/* Mobile status bar spacer - creates blank space at top */}
      <div className="lg:hidden h-[35px] bg-background"></div>
      
      {showNavbar && (
        <Navbar 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
        />
      )}
      
      <main className={`flex-1 pb-20 lg:pb-0 mobile-scroll`}>
        <div className={`min-h-full lg:mobile-container`}>
          {children}
        </div>
      </main>
      
      {showChatbot && (
        <div className="hidden lg:block">
          <AIChatbot />
        </div>
      )}
    </div>
  );
}