import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ReviewSource = 'google' | 'yelp';

export function useDefaultReviewSource() {
  const { user } = useAuth();
  const [defaultSource, setDefaultSource] = useState<ReviewSource>('google');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDefaultSource = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('user_id', user.id)
          .eq('key', 'default_review_source')
          .single();

        if (!error && data) {
          setDefaultSource(data.value as ReviewSource);
        }
      } catch (error) {
        console.error('Error loading default review source:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDefaultSource();
  }, [user]);

  const updateDefaultSource = async (source: ReviewSource) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('settings')
        .upsert(
          {
            user_id: user.id,
            key: 'default_review_source',
            value: source,
          },
          {
            onConflict: 'user_id,key',
          }
        );

      if (!error) {
        setDefaultSource(source);
      }
    } catch (error) {
      console.error('Error updating default review source:', error);
    }
  };

  return {
    defaultSource,
    updateDefaultSource,
    isLoading,
  };
}