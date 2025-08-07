import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Itinerary, ItineraryEvent } from '@/components/ItineraryBuilder';

// Helper function to format dates for database storage without timezone issues
const formatDateForDatabase = (date: Date): string => {
  // Create a new date in local timezone to avoid UTC conversion issues
  const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return localDate.toISOString().split('T')[0];
};

export function useItineraries() {
  const { user } = useAuth();
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(false);

  const loadItineraries = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Convert database format to Itinerary format
      const converted = data.map(item => ({
        id: item.id,
        title: item.title,
        startDate: new Date(item.start_date),
        endDate: new Date(item.end_date),
        locations: [],
        events: Array.isArray(item.events) ? (item.events as unknown) as ItineraryEvent[] : [],
        hotels: [],
        flights: [],
        wasCreatedWithLengthOfStay: false,
        isMultiCity: false
      })) as Itinerary[];
      
      setItineraries(converted);
    } catch (error) {
      console.error('Error loading itineraries:', error);
      toast.error('Failed to load itineraries');
    } finally {
      setLoading(false);
    }
  };

  const saveItinerary = async (itinerary: Itinerary) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('itineraries')
        .insert({
          user_id: user.id,
          title: itinerary.title,
          start_date: formatDateForDatabase(itinerary.startDate),
          end_date: formatDateForDatabase(itinerary.endDate),
          events: itinerary.events as any
        })
        .select()
        .single();

      if (error) throw error;
      
      // Convert back to Itinerary format and add to state
      const converted: Itinerary = {
        id: data.id,
        title: data.title,
        startDate: new Date(data.start_date),
        endDate: new Date(data.end_date),
        locations: itinerary.locations,
        events: Array.isArray(data.events) ? (data.events as unknown) as ItineraryEvent[] : [],
        hotels: itinerary.hotels,
        flights: itinerary.flights,
        wasCreatedWithLengthOfStay: itinerary.wasCreatedWithLengthOfStay || false,
        isMultiCity: itinerary.isMultiCity
      };
      
      setItineraries(prev => [converted, ...prev]);
      toast.success('Itinerary saved successfully');
      return converted;
    } catch (error) {
      console.error('Error saving itinerary:', error);
      toast.error('Failed to save itinerary');
      return null;
    }
  };

  const updateItinerary = async (id: string, updates: Partial<Itinerary>) => {
    if (!user) return null;

    try {
      const updateData: any = {};
      if (updates.title) updateData.title = updates.title;
      if (updates.startDate) updateData.start_date = formatDateForDatabase(updates.startDate);
      if (updates.endDate) updateData.end_date = formatDateForDatabase(updates.endDate);
      if (updates.events) updateData.events = updates.events as any;

      const { data, error } = await supabase
        .from('itineraries')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      
      // Update local state
      setItineraries(prev => prev.map(item => 
        item.id === id ? { ...item, ...updates } : item
      ));
      
      toast.success('Itinerary updated successfully');
      return data;
    } catch (error) {
      console.error('Error updating itinerary:', error);
      toast.error('Failed to update itinerary');
      return null;
    }
  };

  const deleteItinerary = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('itineraries')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setItineraries(prev => prev.filter(item => item.id !== id));
      toast.success('Itinerary deleted successfully');
    } catch (error) {
      console.error('Error deleting itinerary:', error);
      toast.error('Failed to delete itinerary');
    }
  };

  useEffect(() => {
    if (user) {
      loadItineraries();
    } else {
      setItineraries([]);
    }
  }, [user]);

  return {
    itineraries,
    loading,
    saveItinerary,
    updateItinerary,
    deleteItinerary,
    refetch: loadItineraries,
  };
}