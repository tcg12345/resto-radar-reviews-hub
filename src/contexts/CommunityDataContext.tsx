import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CommunityStats } from '@/hooks/useRestaurantReviews';

interface CommunityDataContextType {
  preloadedStats: Record<string, CommunityStats>;
  setPreloadedStats: (placeId: string, stats: CommunityStats) => void;
  getPreloadedStats: (placeId: string) => CommunityStats | null;
}

const CommunityDataContext = createContext<CommunityDataContextType | undefined>(undefined);

export function CommunityDataProvider({ children }: { children: ReactNode }) {
  const [preloadedStats, setPreloadedStatsState] = useState<Record<string, CommunityStats>>({});

  const setPreloadedStats = (placeId: string, stats: CommunityStats) => {
    setPreloadedStatsState(prev => ({
      ...prev,
      [placeId]: stats
    }));
  };

  const getPreloadedStats = (placeId: string): CommunityStats | null => {
    return preloadedStats[placeId] || null;
  };

  return (
    <CommunityDataContext.Provider value={{
      preloadedStats,
      setPreloadedStats,
      getPreloadedStats
    }}>
      {children}
    </CommunityDataContext.Provider>
  );
}

export function useCommunityData() {
  const context = useContext(CommunityDataContext);
  if (context === undefined) {
    throw new Error('useCommunityData must be used within a CommunityDataProvider');
  }
  return context;
}