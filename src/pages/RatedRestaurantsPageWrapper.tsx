import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { RatedRestaurantsPage } from './RatedRestaurantsPage';

export default function RatedRestaurantsPageWrapper() {
  const navigate = useNavigate();
  const { restaurants, addRestaurant, updateRestaurant, deleteRestaurant, loadRestaurants } = useRestaurants();

  // Load restaurants when component mounts
  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

  return (
    <RatedRestaurantsPage
      restaurants={restaurants}
      onAddRestaurant={addRestaurant}
      onEditRestaurant={updateRestaurant}
      onDeleteRestaurant={deleteRestaurant}
      shouldOpenAddDialog={false}
      onAddDialogClose={() => {}}
      onNavigateToMap={() => navigate('/map')}
      onOpenSettings={() => navigate('/settings')}
    />
  );
}