import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useUpdatePlaceWebsites() {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const updatePlaceWebsites = async (tripId: string) => {
    setIsUpdating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('update-place-websites', {
        body: { trip_id: tripId }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: data.message || "Place websites updated successfully",
      });

      return data;
    } catch (error) {
      console.error('Error updating place websites:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update place websites. Please try again.",
      });
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  return { updatePlaceWebsites, isUpdating };
}