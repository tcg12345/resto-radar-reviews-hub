import { useNavigate } from 'react-router-dom';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { SavedPlacesPage } from './SavedPlacesPage';
import { RestaurantFormData } from '@/types/restaurant';

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

  const handleAddRestaurant = async (data: RestaurantFormData) => {
    const restaurantId = await addRestaurant(data);
    // If it's a rated restaurant (not wishlist), navigate to rankings page
    if (!data.isWishlist && data.rating && data.rating > 0) {
      navigate('/restaurant-rankings', { 
        state: { newlyAddedRestaurantId: restaurantId } 
      });
    }
  };

  return (
    <SavedPlacesPage
      restaurants={restaurants}
      onAddRestaurant={handleAddRestaurant}
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