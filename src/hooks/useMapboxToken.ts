import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useMapboxToken() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadToken = async () => {
      console.log('Loading Mapbox token...');
      setIsLoading(true);
      try {
        // Get current user session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          console.log('No user session found');
          setToken(null);
          setIsLoading(false);
          return;
        }
        
        const user_id = session.user.id;
        console.log('Loading token for user:', user_id);
        
        // Query with user_id to get the correct token
        const { data: settings, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'mapbox_token')
          .eq('user_id', user_id)
          .maybeSingle();

        if (error) {
          console.error('Error querying settings:', error);
        }

        console.log('Settings result:', settings);
        setToken(settings?.value ?? null);
      } catch (error) {
        console.error('Error loading Mapbox token:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadToken();
    
    // Also reload when auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, !!session);
      loadToken();
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

const saveToken = useCallback(async (newToken: string) => {
    setIsLoading(true);
    try {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        throw new Error('Authentication required to save settings');
      }
      
      const user_id = session.user.id;
      
      // Try to update existing token first
      const { error: updateError } = await supabase
        .from('settings')
        .update({ value: newToken })
        .eq('key', 'mapbox_token')
        .eq('user_id', user_id);

      // If update fails (no record exists), insert new token
      if (updateError) {
        const { error: insertError } = await supabase
          .from('settings')
          .insert({ 
            key: 'mapbox_token', 
            value: newToken,
            user_id 
          });

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