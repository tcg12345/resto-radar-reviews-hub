import { createContext, useContext, useState, ReactNode } from 'react';

interface DiscoverContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  locationQuery: string;
  setLocationQuery: (location: string) => void;
  restaurants: any[];
  setRestaurants: (restaurants: any[]) => void;
  hasSearched: boolean;
  setHasSearched: (searched: boolean) => void;
}

const DiscoverContext = createContext<DiscoverContextType | undefined>(undefined);

interface DiscoverProviderProps {
  children: ReactNode;
}

export function DiscoverProvider({ children }: DiscoverProviderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const value = {
    searchQuery,
    setSearchQuery,
    locationQuery,
    setLocationQuery,
    restaurants,
    setRestaurants,
    hasSearched,
    setHasSearched,
  };

  return <DiscoverContext.Provider value={value}>{children}</DiscoverContext.Provider>;
}

export function useDiscover() {
  const context = useContext(DiscoverContext);
  
  if (context === undefined) {
    throw new Error('useDiscover must be used within a DiscoverProvider');
  }
  
  return context;
}