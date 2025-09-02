import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Cache to avoid repeated queries
const roleCache = new Map<string, { isExpert: boolean; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useUserRole(userId?: string) {
  const [isExpert, setIsExpert] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setIsExpert(false);
      return;
    }

    // Check cache first
    const cached = roleCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setIsExpert(cached.isExpert);
      return;
    }

    const checkUserRole = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'expert')
          .limit(1);

        if (!error) {
          const expertStatus = data && data.length > 0;
          setIsExpert(expertStatus);
          
          // Cache the result
          roleCache.set(userId, {
            isExpert: expertStatus,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        setIsExpert(false);
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, [userId]);

  return { isExpert, loading };
}

// Utility function to check multiple users at once
export async function checkExpertStatus(userIds: string[]): Promise<Record<string, boolean>> {
  if (userIds.length === 0) return {};

  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', userIds)
      .eq('role', 'expert');

    if (error) {
      console.error('Error checking expert status:', error);
      return {};
    }

    const expertMap: Record<string, boolean> = {};
    userIds.forEach(id => {
      expertMap[id] = false; // Default to false
    });

    if (data) {
      data.forEach(row => {
        expertMap[row.user_id] = true;
      });

      // Cache the results
      Object.entries(expertMap).forEach(([userId, isExpert]) => {
        roleCache.set(userId, {
          isExpert,
          timestamp: Date.now()
        });
      });
    }

    return expertMap;
  } catch (error) {
    console.error('Error in checkExpertStatus:', error);
    return {};
  }
}