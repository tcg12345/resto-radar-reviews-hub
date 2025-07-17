import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MAPBOX_TOKEN_KEY = 'mapbox_token';

export function useMapboxToken() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadToken = async () => {
      console.log('Loading Mapbox token...');
      setIsLoading(true);
      
      try {
        // First try localStorage for immediate access
        const localToken = localStorage.getItem(MAPBOX_TOKEN_KEY);
        if (localToken) {
          console.log('Found token in localStorage');
          setToken(localToken);
          setIsLoading(false);
          return;
        }
        
        // Then try database
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          console.log('No user session found');
          setToken(null);
          setIsLoading(false);
          return;
        }
        
        const user_id = session.user.id;
        console.log('Loading token for user:', user_id);
        
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
        const dbToken = settings?.value ?? null;
        
        if (dbToken) {
          // Store in localStorage for next time
          localStorage.setItem(MAPBOX_TOKEN_KEY, dbToken);
        }
        
        setToken(dbToken);
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
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem(MAPBOX_TOKEN_KEY);
        setToken(null);
      } else if (event === 'SIGNED_IN') {
        loadToken();
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const saveToken = useCallback(async (newToken: string) => {
    setIsLoading(true);
    try {
      // Save to localStorage immediately
      localStorage.setItem(MAPBOX_TOKEN_KEY, newToken);
      setToken(newToken);
      
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