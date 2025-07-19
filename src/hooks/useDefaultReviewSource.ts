import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ReviewSource = 'google' | 'yelp';

export function useDefaultReviewSource() {
  const { user } = useAuth();
  const [defaultSource, setDefaultSource] = useState<ReviewSource>('google');
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage as fallback
  useEffect(() => {
    const stored = localStorage.getItem('defaultReviewSource') as ReviewSource;
    if (stored && (stored === 'google' || stored === 'yelp')) {
      setDefaultSource(stored);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const loadDefaultSource = async () => {
      if (!user) {
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
          const source = data.value as ReviewSource;
          setDefaultSource(source);
          localStorage.setItem('defaultReviewSource', source);
        } else if (error && error.code !== 'PGRST116') {
          console.error('Error loading default review source:', error);
        }
      } catch (error) {
        console.error('Error loading default review source:', error);
      }
    };

    loadDefaultSource();
  }, [user]);

  const updateDefaultSource = async (source: ReviewSource) => {
    // Update local state and localStorage immediately
    setDefaultSource(source);
    localStorage.setItem('defaultReviewSource', source);

    // Try to update database if user is logged in
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

      if (error) {
        console.error('Error updating default review source in database:', error);
        // Keep localStorage setting even if database fails
      }
    } catch (error) {
      console.error('Error updating default review source:', error);
    }
  };

  return {
    defaultSource,
    updateDefaultSource,
    isLoading: false, // Don't block UI on database issues
  };
}