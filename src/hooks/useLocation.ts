import { useState, useEffect, useCallback } from 'react';
import { locationService, LocationData, LocationError } from '@/utils/location';
import { useToast } from '@/hooks/use-toast';

export interface UseLocationReturn {
  location: LocationData | null;
  isLoading: boolean;
  error: string | null;
  hasPermission: boolean;
  requestLocation: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
  clearLocation: () => void;
  formatLocation: (location: LocationData) => string;
}

export function useLocation(): UseLocationReturn {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const { toast } = useToast();

  const checkPermission = useCallback(async () => {
    try {
      const permission = await locationService.requestLocationPermission();
      setHasPermission(permission);
      return permission;
    } catch (err) {
      console.warn('Permission check failed:', err);
      return false;
    }
  }, []);

  const requestLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const currentLocation = await locationService.getCurrentLocation();
      setLocation(currentLocation);
      setHasPermission(true);
      
      toast({
        title: "Location Found",
        description: `Using your current location: ${locationService.formatLocationForDisplay(currentLocation)}`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get location';
      setError(errorMessage);
      setHasPermission(false);
      
      toast({
        title: "Location Access Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const hasPermission = await checkPermission();
    if (hasPermission && !location) {
      await requestLocation();
    }
    return hasPermission;
  }, [checkPermission, requestLocation, location]);

  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
    setHasPermission(false);
    locationService.clearLocationCache();
  }, []);

  const formatLocation = useCallback((location: LocationData) => {
    return locationService.formatLocationForDisplay(location);
  }, []);

  // Check permission on mount
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  return {
    location,
    isLoading,
    error,
    hasPermission,
    requestLocation,
    requestPermission,
    clearLocation,
    formatLocation
  };
}