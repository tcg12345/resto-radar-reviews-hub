import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useFriends } from '@/hooks/useFriends';
import { supabase } from '@/integrations/supabase/client';

interface FriendProfile {
  id: string;
  username: string;
  name: string;
  avatar_url: string | null;
  is_public: boolean;
  rated_count: number;
  wishlist_count: number;
  avg_rating: number;
  recent_restaurants: any[];
  last_updated: Date;
}

interface FriendProfilesContextType {
  profilesCache: Map<string, FriendProfile>;
  isPreloading: boolean;
  getFriendProfile: (friendId: string) => FriendProfile | null;
  refreshProfile: (friendId: string) => Promise<void>;
  refreshAllProfiles: () => Promise<void>;
}

const FriendProfilesContext = createContext<FriendProfilesContextType | undefined>(undefined);

export const useFriendProfiles = () => {
  const context = useContext(FriendProfilesContext);
  if (!context) {
    throw new Error('useFriendProfiles must be used within FriendProfilesProvider');
  }
  return context;
};

interface Props {
  children: React.ReactNode;
}

export const FriendProfilesProvider: React.FC<Props> = ({ children }) => {
  const { user, isLoading: authLoading } = useAuth();
  const { friends, isLoading: friendsLoading } = useFriends();
  const [profilesCache, setProfilesCache] = useState<Map<string, FriendProfile>>(() => new Map());
  const [isPreloading, setIsPreloading] = useState(false);

  // Load a single friend profile using the lightning-fast function
  const loadFriendProfile = useCallback(async (friendId: string): Promise<FriendProfile | null> => {
    try {
      const { data, error } = await supabase.rpc('get_lightning_fast_friend_profile', {
        target_user_id: friendId,
        requesting_user_id: user?.id
      });

      if (error) {
        console.error('Error loading friend profile:', error);
        return null;
      }

      // The RPC returns an array, get the first item
      const result = Array.isArray(data) ? data[0] : data;
      
      if (!result?.can_view) {
        return null;
      }

      return {
        id: friendId,
        username: result.username || '',
        name: result.name || '',
        avatar_url: result.avatar_url,
        is_public: result.is_public,
        rated_count: Number(result.rated_count) || 0,
        wishlist_count: Number(result.wishlist_count) || 0,
        avg_rating: Number(result.avg_rating) || 0,
        recent_restaurants: Array.isArray(result.recent_restaurants) ? result.recent_restaurants : [],
        last_updated: new Date()
      };
    } catch (error) {
      console.error('Error in loadFriendProfile:', error);
      return null;
    }
  }, [user?.id]);

  // Preload all friend profiles
  const preloadAllProfiles = useCallback(async () => {
    if (!user || !friends.length || friendsLoading) return;

    console.log('🚀 Preloading friend profiles for instant access...');
    setIsPreloading(true);

    const newCache = new Map<string, FriendProfile>();
    
    // Load profiles in parallel for maximum speed
    const promises = friends.map(async (friend) => {
      const profile = await loadFriendProfile(friend.id);
      if (profile) {
        newCache.set(friend.id, profile);
      }
    });

    await Promise.all(promises);
    
    setProfilesCache(newCache);
    setIsPreloading(false);
    
    console.log(`✅ Preloaded ${newCache.size} friend profiles`);
  }, [user, friends, friendsLoading, loadFriendProfile]);

  // Refresh a single profile
  const refreshProfile = useCallback(async (friendId: string) => {
    if (!user) return;

    const profile = await loadFriendProfile(friendId);
    if (profile) {
      setProfilesCache(prev => new Map(prev.set(friendId, profile)));
    }
  }, [user, loadFriendProfile]);

  // Refresh all profiles
  const refreshAllProfiles = useCallback(async () => {
    await preloadAllProfiles();
  }, [preloadAllProfiles]);

  // Get profile from cache
  const getFriendProfile = useCallback((friendId: string): FriendProfile | null => {
    return profilesCache.get(friendId) || null;
  }, [profilesCache]);

  // Initial preload when user and friends are ready
  useEffect(() => {
    if (!authLoading && !friendsLoading && user && friends.length > 0) {
      preloadAllProfiles();
    }
  }, [authLoading, friendsLoading, user, friends.length, preloadAllProfiles]);

  // Periodic refresh every 5 minutes
  useEffect(() => {
    if (!user || !friends.length) return;

    const interval = setInterval(() => {
      console.log('🔄 Refreshing friend profiles cache...');
      preloadAllProfiles();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user, friends.length, preloadAllProfiles]);

  const value: FriendProfilesContextType = {
    profilesCache,
    isPreloading,
    getFriendProfile,
    refreshProfile,
    refreshAllProfiles
  };

  return (
    <FriendProfilesContext.Provider value={value}>
      {children}
    </FriendProfilesContext.Provider>
  );
};