import { useRestaurants } from '@/contexts/RestaurantContext';
import { WishlistPage } from './WishlistPage';

export default function WishlistPageWrapper() {
  const { restaurants, addRestaurant, updateRestaurant, deleteRestaurant } = useRestaurants();

  return (
    <WishlistPage
      restaurants={restaurants}
      onAddRestaurant={addRestaurant}
      onEditRestaurant={updateRestaurant}
      onDeleteRestaurant={deleteRestaurant}
    />
  );
}