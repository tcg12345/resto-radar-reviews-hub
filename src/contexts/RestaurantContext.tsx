import { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from 'react';
import { Restaurant, RestaurantFormData, CategoryRating } from '@/types/restaurant';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

interface DbRestaurant {
  id: string;
  name: string;
  address: string;
  city: string;
  cuisine: string;
  rating: number | null;
  notes: string | null;
  date_visited: string | null;
  photos: string[];
  is_wishlist: boolean;
  latitude: number | null;
  longitude: number | null;
  category_ratings: Json;
  use_weighted_rating: boolean;
  created_at: string;
  updated_at: string;
}

interface RestaurantContextType {
  restaurants: Restaurant[];
  addRestaurant: (data: RestaurantFormData) => Promise<string>;
  updateRestaurant: (id: string, data: RestaurantFormData) => Promise<void>;
  deleteRestaurant: (id: string) => void;
  getRestaurant: (id: string) => Restaurant | undefined;
  isLoading: boolean;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

interface RestaurantProviderProps {
  children: ReactNode;
}

const mapDbRestaurantToRestaurant = (dbRestaurant: DbRestaurant): Restaurant => ({
  id: dbRestaurant.id,
  name: dbRestaurant.name,
  address: dbRestaurant.address,
  city: dbRestaurant.city,
  cuisine: dbRestaurant.cuisine,
  rating: dbRestaurant.rating ?? undefined,
  notes: dbRestaurant.notes ?? undefined,
  dateVisited: dbRestaurant.date_visited ?? undefined,
  photos: dbRestaurant.photos,
  isWishlist: dbRestaurant.is_wishlist,
  latitude: dbRestaurant.latitude ?? undefined,
  longitude: dbRestaurant.longitude ?? undefined,
  categoryRatings: dbRestaurant.category_ratings ? dbRestaurant.category_ratings as unknown as CategoryRating : undefined,
  useWeightedRating: dbRestaurant.use_weighted_rating,
  createdAt: dbRestaurant.created_at,
  updatedAt: dbRestaurant.updated_at,
});

export function RestaurantProvider({ children }: RestaurantProviderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  // Load restaurants from Supabase
  useEffect(() => {
    const loadRestaurants = async () => {
      setIsLoading(true);
      try {
        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // User is authenticated, fetch their restaurants
          const { data, error } = await supabase
            .from('restaurants')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

          if (error) throw error;
          setRestaurants((data || []).map(mapDbRestaurantToRestaurant));
        } else {
          // User is not authenticated, show empty list
          setRestaurants([]);
          console.log('User not authenticated. Please sign in to view your restaurants.');
        }
      } catch (error) {
        console.error('Error loading restaurants:', error);
        toast.error('Failed to load restaurants');
      } finally {
        setIsLoading(false);
      }
    };

    loadRestaurants();
    
    // Set up auth state listener to reload restaurants when auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadRestaurants();
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Convert File objects to data URLs
  const convertPhotosToDataUrls = useCallback(async (photos: File[]): Promise<string[]> => {
    const dataUrls: string[] = [];
    
    for (const photo of photos) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(photo);
      });
      
      dataUrls.push(dataUrl);
    }
    
    return dataUrls;
  }, []);

  // Geocode the address using the edge function
  const geocodeAddress = useCallback(async (address: string, city: string): Promise<{ latitude: number, longitude: number } | null> => {
    try {
      console.log('Attempting to geocode:', address, city);
      
      const { data, error } = await supabase.functions.invoke('geocode', {
        body: { address, city }
      });

      if (error) {
        console.error('Geocoding error:', error);
        return null;
      }

      if (data && data.latitude && data.longitude) {
        console.log('Geocoding successful:', data);
        return { latitude: data.latitude, longitude: data.longitude };
      }
      
      console.log('No coordinates returned from geocoding');
      return null;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }, []);

  const addRestaurant = useCallback(async (data: RestaurantFormData): Promise<string> => {
    try {
      setIsLoading(true);
      
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Authentication required to add restaurants');
      }
      
      // Convert photos to data URLs
      const photoDataUrls = await convertPhotosToDataUrls(data.photos);
      
      // Geocode the address using the edge function
      let coordinates = null;
      if (data.address && data.city) {
        coordinates = await geocodeAddress(data.address, data.city);
      }
      
      // Create new restaurant object
      const newRestaurant = {
        name: data.name,
        address: data.address,
        city: data.city,
        cuisine: data.cuisine,
        rating: data.rating ?? null,
        notes: data.notes ?? null,
        date_visited: data.dateVisited ? data.dateVisited : null,
        photos: photoDataUrls,
        is_wishlist: data.isWishlist,
        latitude: coordinates?.latitude ?? null,
        longitude: coordinates?.longitude ?? null,
        category_ratings: data.categoryRatings as unknown as Json,
        use_weighted_rating: data.useWeightedRating,
        user_id: session.user.id,
      };
      
      const { data: inserted, error } = await supabase
        .from('restaurants')
        .insert(newRestaurant)
        .select()
        .single();

      if (error) throw error;
      
      const restaurant = mapDbRestaurantToRestaurant(inserted);
      setRestaurants((prev) => [restaurant, ...prev]);
      
      console.log('Final coordinates for restaurant:', coordinates);
      
      if (coordinates && coordinates.latitude && coordinates.longitude) {
        toast.success('Restaurant added and placed on map!');
      } else if (data.address && data.city) {
        toast.warning('Restaurant added but couldn\'t be placed on map. Check your Mapbox token in the Map tab.');
      } else {
        toast.success('Restaurant added successfully!');
      }

      return inserted.id;
    } catch (error) {
      console.error('Error adding restaurant:', error);
      toast.error('Failed to add restaurant.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [convertPhotosToDataUrls, geocodeAddress]);

  const updateRestaurant = useCallback(async (id: string, data: RestaurantFormData) => {
    try {
      setIsLoading(true);
      
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Authentication required to update restaurants');
      }
      
      // Find existing restaurant
      const existingRestaurant = restaurants.find((r) => r.id === id);
      if (!existingRestaurant) {
        throw new Error('Restaurant not found');
      }
      
      // Convert new photos to data URLs
      const newPhotoDataUrls = await convertPhotosToDataUrls(data.photos);
      
      // Combine existing and new photos
      const combinedPhotos = [...existingRestaurant.photos, ...newPhotoDataUrls];
      
      // Geocode the address if it changed using direct Mapbox API
      let coordinates = {
        latitude: existingRestaurant.latitude,
        longitude: existingRestaurant.longitude,
      };
      
      if (
        (data.address !== existingRestaurant.address || data.city !== existingRestaurant.city) &&
        data.address && data.city
      ) {
        try {
          console.log('Attempting to geocode updated address:', data.address, data.city);
          
          // Get the stored Mapbox token
          const { data: settings } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'mapbox_token')
            .eq('user_id', session.user.id)
            .maybeSingle();

          const mapboxToken = settings?.value;
          
          if (mapboxToken) {
            const query = `${data.address}, ${data.city}`;
            const encodedQuery = encodeURIComponent(query);
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${mapboxToken}`;
            
            const response = await fetch(url);
            const geoData = await response.json();
            
            if (geoData.features && geoData.features.length > 0) {
              const [longitude, latitude] = geoData.features[0].center;
              coordinates = { latitude, longitude };
              console.log('Successfully geocoded updated address to:', coordinates);
            }
          }
        } catch (error) {
          console.error('Error geocoding updated address:', error);
        }
      }
      
      // Update restaurant in Supabase
      const { data: updated, error } = await supabase
        .from('restaurants')
        .update({
          name: data.name,
          address: data.address,
          city: data.city,
          cuisine: data.cuisine,
          rating: data.rating ?? null,
          notes: data.notes ?? null,
          date_visited: data.dateVisited ? data.dateVisited : null,
          photos: combinedPhotos,
          is_wishlist: data.isWishlist,
          latitude: coordinates.latitude ?? null,
          longitude: coordinates.longitude ?? null,
          category_ratings: data.categoryRatings as unknown as Json,
          use_weighted_rating: data.useWeightedRating,
          // user_id is already set, no need to update it
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const restaurant = mapDbRestaurantToRestaurant(updated);
      
      // Update local state
      setRestaurants((prev) =>
        prev.map((r) => (r.id === id ? restaurant : r))
      );
      
      if (coordinates.latitude && coordinates.longitude) {
        toast.success('Restaurant updated and placed on map!');
      } else if (data.address && data.city) {
        toast.warning('Restaurant updated but couldn\'t be placed on map. Check your Mapbox token in the Map tab.');
      } else {
        toast.success('Restaurant updated successfully!');
      }
    } catch (error) {
      console.error('Error updating restaurant:', error);
      toast.error('Failed to update restaurant.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurants, convertPhotosToDataUrls, geocodeAddress]);

  const deleteRestaurant = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRestaurants((prev) => prev.filter((restaurant) => restaurant.id !== id));
      toast.success('Restaurant deleted successfully!');
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      toast.error('Failed to delete restaurant.');
    }
  }, []);

  const getRestaurant = useCallback((id: string) => {
    return restaurants.find((restaurant) => restaurant.id === id);
  }, [restaurants]);

  const value = useMemo(
    () => ({
      restaurants,
      addRestaurant,
      updateRestaurant,
      deleteRestaurant,
      getRestaurant,
      isLoading,
    }),
    [restaurants, addRestaurant, updateRestaurant, deleteRestaurant, getRestaurant, isLoading]
  );

  return <RestaurantContext.Provider value={value}>{children}</RestaurantContext.Provider>;
}

export function useRestaurants() {
  const context = useContext(RestaurantContext);
  
  if (context === undefined) {
    throw new Error('useRestaurants must be used within a RestaurantProvider');
  }
  
  return context;
}