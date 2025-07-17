import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Restaurant, RestaurantFormData } from '@/types/restaurant';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';

interface RestaurantContextType {
  restaurants: Restaurant[];
addRestaurant: (data: RestaurantFormData) => Promise<string>;
  updateRestaurant: (id: string, data: RestaurantFormData) => Promise<void>;
  deleteRestaurant: (id: string) => void;
  getRestaurant: (id: string) => Restaurant | undefined;
  isLoading: boolean;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

interface RestaurantProviderProps {
  children: ReactNode;
}

export function RestaurantProvider({ children }: RestaurantProviderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [restaurants, setRestaurants] = useLocalStorage<Restaurant[]>('restaurants', []);

  // Convert File objects to data URLs
  const convertPhotosToDataUrls = useCallback(async (photos: File[]): Promise<string[]> => {
    const dataUrls: string[] = [];
    
    for (const photo of photos) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(photo);
      });
      
      dataUrls.push(dataUrl);
    }
    
    return dataUrls;
  }, []);

  // Geocode the address to get latitude and longitude
  const geocodeAddress = useCallback(async (address: string, city: string): Promise<{ latitude: number, longitude: number } | null> => {
    try {
      const query = `${address}, ${city}`;
      const encodedQuery = encodeURIComponent(query);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbHhtZ3V1cjAwMTdjMmtzMDNrNjVrbzRtIn0.ZtSlpKA9nra05HPsSCTOhQ`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const [longitude, latitude] = data.features[0].center;
        return { latitude, longitude };
      }
      
      return null;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }, []);

  const addRestaurant = useCallback(async (data: RestaurantFormData): Promise<string> => {
    try {
      setIsLoading(true);
      
      // Convert photos to data URLs
      const photoDataUrls = await convertPhotosToDataUrls(data.photos);
      
      // Geocode the address
      let coordinates = null;
      if (data.address && data.city) {
        coordinates = await geocodeAddress(data.address, data.city);
      }
      
      // Create new restaurant object
      const newRestaurant: Restaurant = {
        id: uuidv4(),
        name: data.name,
        address: data.address,
        city: data.city,
        cuisine: data.cuisine,
        rating: data.rating,
        notes: data.notes,
        dateVisited: data.dateVisited,
        photos: photoDataUrls,
        isWishlist: data.isWishlist,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      setRestaurants((prev) => [...prev, newRestaurant]);
      
      toast.success('Restaurant added successfully!');
      return newRestaurant.id;
    } catch (error) {
      console.error('Error adding restaurant:', error);
      toast.error('Failed to add restaurant.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [convertPhotosToDataUrls, geocodeAddress, setRestaurants]);

  const updateRestaurant = useCallback(async (id: string, data: RestaurantFormData) => {
    try {
      setIsLoading(true);
      
      // Find existing restaurant
      const existingRestaurant = restaurants.find((r) => r.id === id);
      if (!existingRestaurant) {
        throw new Error('Restaurant not found');
      }
      
      // Convert new photos to data URLs
      const newPhotoDataUrls = await convertPhotosToDataUrls(data.photos);
      
      // Combine existing and new photos
      const combinedPhotos = [...existingRestaurant.photos, ...newPhotoDataUrls];
      
      // Geocode the address if it changed
      let coordinates = {
        latitude: existingRestaurant.latitude,
        longitude: existingRestaurant.longitude,
      };
      
      if (
        (data.address !== existingRestaurant.address || data.city !== existingRestaurant.city) &&
        data.address && data.city
      ) {
        const newCoordinates = await geocodeAddress(data.address, data.city);
        if (newCoordinates) {
          coordinates = newCoordinates;
        }
      }
      
      // Update restaurant
      setRestaurants((prev) =>
        prev.map((restaurant) =>
          restaurant.id === id
            ? {
                ...restaurant,
                name: data.name,
                address: data.address,
                city: data.city,
                cuisine: data.cuisine,
                rating: data.rating,
                notes: data.notes,
                dateVisited: data.dateVisited,
                photos: combinedPhotos,
                isWishlist: data.isWishlist,
                latitude: coordinates.latitude,
                longitude: coordinates.longitude,
                updatedAt: new Date().toISOString(),
              }
            : restaurant
        )
      );
      
      toast.success('Restaurant updated successfully!');
    } catch (error) {
      console.error('Error updating restaurant:', error);
      toast.error('Failed to update restaurant.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurants, convertPhotosToDataUrls, geocodeAddress, setRestaurants]);

  const deleteRestaurant = useCallback((id: string) => {
    try {
      setRestaurants((prev) => prev.filter((restaurant) => restaurant.id !== id));
      toast.success('Restaurant deleted successfully!');
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      toast.error('Failed to delete restaurant.');
    }
  }, [setRestaurants]);

  const getRestaurant = useCallback((id: string) => {
    return restaurants.find((restaurant) => restaurant.id === id);
  }, [restaurants]);

  const value = useMemo(
    () => ({
      restaurants,
      addRestaurant,
      updateRestaurant,
      deleteRestaurant,
      getRestaurant,
      isLoading,
    }),
    [restaurants, addRestaurant, updateRestaurant, deleteRestaurant, getRestaurant, isLoading]
  );

  return <RestaurantContext.Provider value={value}>{children}</RestaurantContext.Provider>;
}

export function useRestaurants() {
  const context = useContext(RestaurantContext);
  
  if (context === undefined) {
    throw new Error('useRestaurants must be used within a RestaurantProvider');
  }
  
  return context;
}