import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import HomePage from './HomePage';

export default function HomePageWrapper() {
  const navigate = useNavigate();
  const [shouldOpenAddDialog, setShouldOpenAddDialog] = useState(false);

  const handleNavigate = (tab: 'home' | 'rated' | 'wishlist' | 'map' | 'search' | 'settings' | 'friends') => {
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
        navigate('/search');
        break;
      case 'settings':
        navigate('/settings');
        break;
      case 'friends':
        navigate('/friends');
        break;
    }
  };

  const handleOpenAddRestaurant = () => {
    setShouldOpenAddDialog(true);
    navigate('/rated');
  };

  return (
    <HomePage 
      onNavigate={handleNavigate}
      onOpenAddRestaurant={handleOpenAddRestaurant}
    />
  );
}