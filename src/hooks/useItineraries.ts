import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Itinerary, ItineraryEvent } from '@/components/ItineraryBuilder';
import { format } from 'date-fns';

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
        startDate: new Date(item.start_date + 'T00:00:00'),
        endDate: new Date(item.end_date + 'T00:00:00'),
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

    console.log('Saving itinerary with dates:', {
      originalStartDate: itinerary.startDate,
      originalEndDate: itinerary.endDate,
      startDateString: format(itinerary.startDate, 'yyyy-MM-dd'),
      endDateString: format(itinerary.endDate, 'yyyy-MM-dd'),
      startDateComponents: {
        year: itinerary.startDate.getFullYear(),
        month: itinerary.startDate.getMonth() + 1,
        date: itinerary.startDate.getDate()
      },
      endDateComponents: {
        year: itinerary.endDate.getFullYear(),
        month: itinerary.endDate.getMonth() + 1,
        date: itinerary.endDate.getDate()
      }
    });

    try {
      const { data, error } = await supabase
        .from('itineraries')
        .insert({
          user_id: user.id,
          title: itinerary.title,
          start_date: format(itinerary.startDate, 'yyyy-MM-dd'),
          end_date: format(itinerary.endDate, 'yyyy-MM-dd'),
          events: itinerary.events as any
        })
        .select()
        .single();

      if (error) throw error;
      
      console.log('Received data from database:', {
        savedStartDate: data.start_date,
        savedEndDate: data.end_date,
        convertedStartDate: new Date(data.start_date),
        convertedEndDate: new Date(data.end_date)
      });

      // Convert back to Itinerary format and add to state
      const converted: Itinerary = {
        id: data.id,
        title: data.title,
        startDate: new Date(data.start_date + 'T00:00:00'),
        endDate: new Date(data.end_date + 'T00:00:00'),
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
      if (updates.startDate) updateData.start_date = format(updates.startDate, 'yyyy-MM-dd');
      if (updates.endDate) updateData.end_date = format(updates.endDate, 'yyyy-MM-dd');
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