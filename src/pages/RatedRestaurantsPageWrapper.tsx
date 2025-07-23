import { useNavigate } from 'react-router-dom';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { RatedRestaurantsPage } from './RatedRestaurantsPage';

export default function RatedRestaurantsPageWrapper() {
  const navigate = useNavigate();
  const { restaurants, addRestaurant, updateRestaurant, deleteRestaurant } = useRestaurants();

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