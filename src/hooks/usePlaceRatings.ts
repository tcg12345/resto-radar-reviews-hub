import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { PlaceRating } from './useTrips';

export function usePlaceRatings(tripId?: string) {
  const { user } = useAuth();
  const [ratings, setRatings] = useState<PlaceRating[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRatings = async () => {
    if (!user || !tripId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('place_ratings')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRatings((data || []) as PlaceRating[]);
    } catch (error) {
      console.error('Error loading place ratings:', error);
      toast.error('Failed to load place ratings');
    } finally {
      setLoading(false);
    }
  };

  const addRating = async (ratingData: Omit<PlaceRating, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('place_ratings')
        .insert({
          ...ratingData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      setRatings(prev => [data as PlaceRating, ...prev]);
      toast.success('Place rating added successfully');
      return data;
    } catch (error) {
      console.error('Error adding place rating:', error);
      toast.error('Failed to add place rating');
      return null;
    }
  };

  const updateRating = async (id: string, updates: Partial<PlaceRating>) => {
    try {
      const { data, error } = await supabase
        .from('place_ratings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setRatings(prev => prev.map(rating => rating.id === id ? data as PlaceRating : rating));
      toast.success('Place rating updated successfully');
      return data;
    } catch (error) {
      console.error('Error updating place rating:', error);
      toast.error('Failed to update place rating');
      return null;
    }
  };

  const deleteRating = async (id: string) => {
    try {
      const { error } = await supabase
        .from('place_ratings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setRatings(prev => prev.filter(rating => rating.id !== id));
      toast.success('Place rating deleted successfully');
    } catch (error) {
      console.error('Error deleting place rating:', error);
      toast.error('Failed to delete place rating');
    }
  };

  // Function to add restaurant from existing restaurants to a trip
  const addRestaurantToTrip = async (tripId: string, restaurantData: any) => {
    if (!user) return null;

    try {
      const ratingData = {
        trip_id: tripId,
        place_name: restaurantData.name,
        place_type: 'restaurant' as const,
        cuisine: restaurantData.cuisine,
        address: restaurantData.address,
        latitude: restaurantData.latitude,
        longitude: restaurantData.longitude,
        overall_rating: restaurantData.rating,
        category_ratings: restaurantData.categoryRatings,
        notes: restaurantData.notes,
        photos: restaurantData.photos || [],
        photo_captions: restaurantData.photoCaptions || [],
        website: restaurantData.website,
        phone_number: restaurantData.phoneNumber || restaurantData.phone_number,
        price_range: restaurantData.priceRange,
        michelin_stars: restaurantData.michelinStars,
        date_visited: restaurantData.dateVisited,
      };

      return await addRating(ratingData);
    } catch (error) {
      console.error('Error adding restaurant to trip:', error);
      toast.error('Failed to add restaurant to trip');
      return null;
    }
  };

  useEffect(() => {
    loadRatings();

    // Set up real-time subscription for place ratings
    if (user && tripId) {
      const channel = supabase
        .channel('place-ratings-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'place_ratings',
            filter: `trip_id=eq.${tripId}`
          },
          (payload) => {
            console.log('Real-time place rating change:', payload);
            if (payload.eventType === 'INSERT') {
              setRatings(prev => {
                // Check if we already have this rating to avoid duplicates
                const exists = prev.find(r => r.id === payload.new.id);
                if (!exists) {
                  return [payload.new as PlaceRating, ...prev];
                }
                return prev;
              });
            } else if (payload.eventType === 'UPDATE') {
              setRatings(prev => prev.map(rating => 
                rating.id === payload.new.id ? payload.new as PlaceRating : rating
              ));
            } else if (payload.eventType === 'DELETE') {
              setRatings(prev => prev.filter(rating => rating.id !== payload.old.id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, tripId]);

  return {
    ratings,
    loading,
    addRating,
    updateRating,
    deleteRating,
    addRestaurantToTrip,
    refetch: loadRatings,
  };
}