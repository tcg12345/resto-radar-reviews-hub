import { useRestaurants } from '@/contexts/RestaurantContext';
import { WishlistPage } from './WishlistPage';
import { useNavigate } from 'react-router-dom';

export default function WishlistPageWrapper() {
  const { restaurants, addRestaurant, updateRestaurant, deleteRestaurant } = useRestaurants();
  const navigate = useNavigate();

  return (
    <WishlistPage
      restaurants={restaurants}
      onAddRestaurant={addRestaurant}
      onEditRestaurant={updateRestaurant}
      onDeleteRestaurant={deleteRestaurant}
      onNavigateToMap={() => navigate('/map')}
    />
  );
}