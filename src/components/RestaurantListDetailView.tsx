import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Search, Star, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { RestaurantList, useRestaurantLists } from '@/hooks/useRestaurantLists';
import { RestaurantCard } from '@/components/RestaurantCard';
import { ImportFromItineraryDialog } from '@/components/ImportFromItineraryDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RestaurantListDetailViewProps {
  list: RestaurantList;
  onBack: () => void;
}

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating?: number;
  address: string;
  city: string;
  country: string;
  price_range?: number;
  michelin_stars?: number;
  photos?: string[];
  date_visited?: string;
  created_at: string;
  is_wishlist: boolean;
  notes?: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  phone_number?: string;
  opening_hours?: string;
  reservable?: boolean;
  reservation_url?: string;
}

export function RestaurantListDetailView({ list, onBack }: RestaurantListDetailViewProps) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const { getRestaurantsInList } = useRestaurantLists();
  const { toast } = useToast();

  useEffect(() => {
    loadRestaurants();
  }, [list.id]);

  const loadRestaurants = async () => {
    try {
      setLoading(true);
      let restaurantsData: Restaurant[] = [];

      if (list.is_default) {
        // For "All Restaurants" list, get all rated restaurants
        const { data, error } = await supabase
          .from('restaurants')
          .select('*')
          .eq('is_wishlist', false)
          .not('rating', 'is', null)
          .order('date_visited', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) throw error;
        restaurantsData = data || [];
      } else {
        // For custom lists, get restaurants through the junction table
        const restaurantsFromList = await getRestaurantsInList(list.id);
        restaurantsData = restaurantsFromList as Restaurant[];
      }

      setRestaurants(restaurantsData);
    } catch (error: any) {
      console.error('Error loading restaurants:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load restaurants',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredRestaurants = restaurants.filter(restaurant =>
    restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    restaurant.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) ||
    restaurant.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleImportRestaurants = async (newRestaurants: any[]) => {
    try {
      // First, insert the restaurants
      const { data: insertedRestaurants, error: insertError } = await supabase
        .from('restaurants')
        .insert(newRestaurants)
        .select();

      if (insertError) throw insertError;

      // Then add them to the current list (if not default)
      if (insertedRestaurants && !list.is_default) {
        const listItems = insertedRestaurants.map(restaurant => ({
          restaurant_id: restaurant.id,
          list_id: list.id
        }));

        const { error: listError } = await supabase
          .from('restaurant_list_items')
          .insert(listItems);

        if (listError) throw listError;
      }

      // Reload the restaurants
      await loadRestaurants();

      toast({
        title: 'Import Successful',
        description: `Imported ${newRestaurants.length} restaurants to ${list.name}`,
      });

    } catch (error: any) {
      console.error('Error importing restaurants:', error);
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: 'Failed to import restaurants from itinerary',
      });
      throw error;
    }
  };

  const averageRating = restaurants.length > 0 
    ? restaurants
        .filter(r => r.rating)
        .reduce((sum, r) => sum + (r.rating || 0), 0) / restaurants.filter(r => r.rating).length
    : 0;

  const michelinCount = restaurants.filter(r => r.michelin_stars && r.michelin_stars > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Lists
        </Button>
        
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{list.name}</h1>
            {list.is_default && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                Default
              </Badge>
            )}
          </div>
          
          {list.description && (
            <p className="text-muted-foreground mb-4">{list.description}</p>
          )}

          {/* Stats */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>{restaurants.length} restaurants</span>
            {averageRating > 0 && (
              <span>Avg rating: {averageRating.toFixed(1)}</span>
            )}
            {michelinCount > 0 && (
              <span>{michelinCount} Michelin starred</span>
            )}
          </div>
        </div>

        {/* Import Button for non-default lists */}
        {!list.is_default && (
          <Button 
            variant="outline" 
            onClick={() => setShowImportDialog(true)}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Import from Itinerary
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search restaurants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Restaurants Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filteredRestaurants.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-4">
            <Plus className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            {searchQuery ? 'No restaurants found' : 'No restaurants in this list'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery 
              ? 'Try adjusting your search terms'
              : list.is_default 
                ? 'Start rating restaurants to see them here'
                : 'Add restaurants to this list or import from your itineraries'
            }
          </p>
          {!searchQuery && !list.is_default && (
            <Button onClick={() => setShowImportDialog(true)}>
              <Download className="h-4 w-4 mr-2" />
              Import from Itinerary
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRestaurants.map(restaurant => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={{
                ...restaurant,
                photos: restaurant.photos || [],
                isWishlist: restaurant.is_wishlist,
                createdAt: restaurant.created_at,
                updatedAt: restaurant.created_at,
                userId: '',
                categoryRatings: { food: 0, service: 0, atmosphere: 0 },
                useWeightedRating: false
              }}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          ))}
        </div>
      )}

      {/* Import from Itinerary Dialog */}
      <ImportFromItineraryDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleImportRestaurants}
        listName={list.name}
      />
    </div>
  );
}