import { useEffect } from 'react';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { WishlistPage } from './WishlistPage';
import { useNavigate } from 'react-router-dom';

export default function WishlistPageWrapper() {
  const { restaurants, addRestaurant, updateRestaurant, deleteRestaurant, loadRestaurants } = useRestaurants();
  const navigate = useNavigate();

  // Load restaurants when component mounts
  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

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