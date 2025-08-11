import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import HomePage from './HomePage';
import FeedPage from './FeedPage';
import { useIsMobile } from '@/hooks/useIsMobile';

export default function HomePageWrapper() {
  const navigate = useNavigate();
  const [shouldOpenAddDialog, setShouldOpenAddDialog] = useState(false);
  const isMobile = useIsMobile();

  const handleNavigate = (tab: 'places' | 'search' | 'profile') => {
    switch (tab) {
      case 'places':
        navigate('/places');
        break;
      case 'search':
        navigate('/search');
        break;
      case 'profile':
        navigate('/friends');
        break;
    }
  };

  const handleOpenAddRestaurant = () => {
    setShouldOpenAddDialog(true);
    navigate('/places');
  };

  // Show Feed page on mobile, traditional HomePage on desktop
  if (isMobile) {
    return (
      <FeedPage 
        onNavigate={handleNavigate}
      />
    );
  }

  return (
    <HomePage 
      onNavigate={handleNavigate}
      onOpenAddRestaurant={handleOpenAddRestaurant}
    />
  );
}