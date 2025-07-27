import { useEffect } from 'react';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { MapPage } from './MapPage';

export default function MapPageWrapper() {
  const { restaurants, updateRestaurant, deleteRestaurant, loadRestaurants } = useRestaurants();

  // Load restaurants when component mounts
  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

  return (
    <MapPage
      restaurants={restaurants}
      onEditRestaurant={updateRestaurant}
      onDeleteRestaurant={deleteRestaurant}
    />
  );
}