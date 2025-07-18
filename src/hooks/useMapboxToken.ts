import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useMapboxToken() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadToken = async () => {
      console.log('Loading Mapbox token from edge function...');
      setIsLoading(true);
      
      try {
        // Get token from the edge function (which accesses the Supabase secret)
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        
        if (error) {
          console.error('Error getting Mapbox token:', error);
          setToken(null);
          toast.error('Failed to load Mapbox token');
        } else if (data?.token) {
          console.log('Successfully loaded Mapbox token');
          setToken(data.token);
        } else {
          console.warn('No Mapbox token received from edge function');
          setToken(null);
        }
      } catch (error) {
        console.error('Error calling get-mapbox-token function:', error);
        setToken(null);
        toast.error('Failed to load Mapbox token');
      } finally {
        setIsLoading(false);
      }
    };

    loadToken();
  }, []);

  // Since token is now managed centrally, saveToken is no longer needed
  // But keeping it for backwards compatibility
  const saveToken = useCallback(async (newToken: string) => {
    console.warn('saveToken is no longer needed - token is managed centrally via Supabase secrets');
    toast.info('Mapbox token is now managed centrally - no need to enter it manually');
    return Promise.resolve();
  }, []);

  return {
    token,
    isLoading,
    saveToken,
  };
}