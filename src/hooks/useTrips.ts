import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Trip {
  id: string;
  user_id: string;
  title: string;
  destination: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlaceRating {
  id: string;
  trip_id: string;
  user_id: string;
  place_id?: string;
  place_name: string;
  place_type: 'restaurant' | 'attraction' | 'hotel' | 'museum' | 'park' | 'shopping' | 'entertainment' | 'transport' | 'spa' | 'bar' | 'cafe' | 'beach' | 'landmark' | 'activity' | 'other';
  address?: string;
  latitude?: number;
  longitude?: number;
  overall_rating?: number;
  category_ratings?: Record<string, number>;
  notes?: string;
  photos?: string[];
  date_visited?: string;
  website?: string;
  phone_number?: string;
  price_range?: number;
  created_at: string;
  updated_at: string;
}

export function useTrips() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTrips = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error('Error loading trips:', error);
      toast.error('Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  const createTrip = async (tripData: Omit<Trip, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('trips')
        .insert({
          ...tripData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      setTrips(prev => [data, ...prev]);
      toast.success('Trip created successfully');
      return data;
    } catch (error) {
      console.error('Error creating trip:', error);
      toast.error('Failed to create trip');
      return null;
    }
  };

  const updateTrip = async (id: string, updates: Partial<Trip>) => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setTrips(prev => prev.map(trip => trip.id === id ? data : trip));
      toast.success('Trip updated successfully');
      return data;
    } catch (error) {
      console.error('Error updating trip:', error);
      toast.error('Failed to update trip');
      return null;
    }
  };

  const deleteTrip = async (id: string) => {
    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setTrips(prev => prev.filter(trip => trip.id !== id));
      toast.success('Trip deleted successfully');
    } catch (error) {
      console.error('Error deleting trip:', error);
      toast.error('Failed to delete trip');
    }
  };

  useEffect(() => {
    loadTrips();
  }, [user]);

  return {
    trips,
    loading,
    createTrip,
    updateTrip,
    deleteTrip,
    refetch: loadTrips,
  };
}