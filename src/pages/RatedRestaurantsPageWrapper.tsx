import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { RatedRestaurantsPage } from './RatedRestaurantsPage';
import { RestaurantListsView } from '@/components/RestaurantListsView';
import { RestaurantListDetailView } from '@/components/RestaurantListDetailView';
import { RestaurantList } from '@/hooks/useRestaurantLists';

export default function RatedRestaurantsPageWrapper() {
  const navigate = useNavigate();
  const { restaurants, addRestaurant, updateRestaurant, deleteRestaurant } = useRestaurants();
  const [currentView, setCurrentView] = useState<'lists' | 'restaurants' | 'list-detail'>('lists');
  const [selectedList, setSelectedList] = useState<RestaurantList | null>(null);

  const handleSelectList = (list: RestaurantList) => {
    setSelectedList(list);
    setCurrentView('list-detail');
  };

  const handleBackToLists = () => {
    setCurrentView('lists');
    setSelectedList(null);
  };

  const handleBackToRestaurants = () => {
    setCurrentView('restaurants');
  };

  if (currentView === 'list-detail' && selectedList) {
    return (
      <RestaurantListDetailView 
        list={selectedList} 
        onBack={handleBackToLists}
      />
    );
  }

  if (currentView === 'restaurants') {
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
        onBackToLists={handleBackToLists}
      />
    );
  }

  return (
    <RestaurantListsView onSelectList={handleSelectList} />
  );
}