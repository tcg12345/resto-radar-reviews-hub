import { useNavigate } from 'react-router-dom';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { SavedPlacesPage } from './SavedPlacesPage';

interface SavedPlacesPageWrapperProps {
  shouldOpenAddDialog?: boolean;
  onAddDialogClose?: () => void;
  activeSubTab?: 'rated' | 'wishlist' | 'recommendations';
}

export default function SavedPlacesPageWrapper({ 
  shouldOpenAddDialog, 
  onAddDialogClose,
  activeSubTab = 'rated'
}: SavedPlacesPageWrapperProps) {
  const navigate = useNavigate();
  const { restaurants, addRestaurant, updateRestaurant, deleteRestaurant } = useRestaurants();

  return (
    <SavedPlacesPage
      restaurants={restaurants}
      onAddRestaurant={addRestaurant}
      onEditRestaurant={updateRestaurant}
      onDeleteRestaurant={deleteRestaurant}
      shouldOpenAddDialog={shouldOpenAddDialog}
      onAddDialogClose={onAddDialogClose}
      onNavigateToMap={() => navigate('/map')}
      onOpenSettings={() => navigate('/settings')}
      activeSubTab={activeSubTab}
    />
  );
}