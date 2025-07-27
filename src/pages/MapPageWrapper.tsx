import { useRestaurants } from '@/contexts/RestaurantContext';
import { MapPage } from './MapPage';

export default function MapPageWrapper() {
  const { restaurants, updateRestaurant, deleteRestaurant } = useRestaurants();

  return (
    <MapPage
      restaurants={restaurants}
      onEditRestaurant={updateRestaurant}
      onDeleteRestaurant={deleteRestaurant}
    />
  );
}