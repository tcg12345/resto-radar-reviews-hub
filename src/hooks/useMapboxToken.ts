import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useMapboxToken() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadToken = async () => {
      setIsLoading(true);
      try {
        const { data: settings, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'mapbox_token')
          .single();

        if (error) throw error;
        setToken(settings?.value ?? null);
      } catch (error) {
        console.error('Error loading Mapbox token:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadToken();
  }, []);

  const saveToken = useCallback(async (newToken: string) => {
    setIsLoading(true);
    try {
      // Try to update existing token first
      const { error: updateError } = await supabase
        .from('settings')
        .update({ value: newToken })
        .eq('key', 'mapbox_token');

      // If update fails (no record exists), insert new token
      if (updateError) {
        const { error: insertError } = await supabase
          .from('settings')
          .insert({ key: 'mapbox_token', value: newToken });

        if (insertError) throw insertError;
      }

      setToken(newToken);
      toast.success('Mapbox token saved successfully!');
    } catch (error) {
      console.error('Error saving Mapbox token:', error);
      toast.error('Failed to save Mapbox token');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    token,
    isLoading,
    saveToken,
  };
}