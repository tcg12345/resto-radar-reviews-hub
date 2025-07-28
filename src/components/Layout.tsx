import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { AIChatbot } from '@/components/AIChatbot';

interface LayoutProps {
  children: ReactNode;
  activeTab?: 'feed' | 'rated' | 'wishlist' | 'search' | 'settings' | 'friends' | 'travel';
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

  const handleTabChange = (tab: 'feed' | 'rated' | 'wishlist' | 'search' | 'settings' | 'friends' | 'travel') => {
    // Navigate to the appropriate route for each tab
    switch (tab) {
      case 'feed':
        navigate('/');
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
        // Check if we're already on a friend profile page
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/friends/')) {
          // Already on a friend profile, don't navigate away - just stay there
          return;
        } else {
          // Navigate to main friends page
          navigate('/friends');
        }
        break;
      case 'travel':
        navigate('/travel');
        break;
      default:
        navigate('/');
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
      
      <main className={`flex-1 pb-20 lg:pb-0 mobile-scroll w-full`}>
        <div className={`min-h-full w-full lg:w-full mobile-container lg:mobile-container`}>
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