import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TripAdvisorLocation {
  location_id: string;
  name: string;
  address_obj?: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    country?: string;
    postalcode?: string;
    address_string?: string;
  };
  latitude?: string;
  longitude?: string;
  phone?: string;
  website?: string;
  rating?: string;
  num_reviews?: string;
  photo?: {
    images?: {
      small?: { url: string };
      medium?: { url: string };
      large?: { url: string };
      original?: { url: string };
    };
  };
  price_level?: string;
  ranking?: string;
  ranking_data?: {
    ranking_string?: string;
  };
  awards?: Array<{
    award_type?: string;
    year?: string;
    display_name?: string;
  }>;
  cuisine?: Array<{
    name: string;
    localized_name: string;
  }>;
  dietary_restrictions?: Array<{
    name: string;
    localized_name: string;
  }>;
  establishment_types?: Array<{
    name: string;
    localized_name: string;
  }>;
  amenities?: Array<{
    name: string;
    localized_name: string;
  }>;
  subcategory?: Array<{
    name: string;
    localized_name: string;
  }>;
}

interface TripAdvisorPhoto {
  id: string;
  caption: string;
  published_date: string;
  images: {
    thumbnail?: { url: string; width: number; height: number };
    small?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
    large?: { url: string; width: number; height: number };
    original?: { url: string; width: number; height: number };
  };
  source: {
    name: string;
    localized_name: string;
  };
  user?: {
    username: string;
  };
}

interface TripAdvisorReview {
  id: string;
  rating: number;
  title: string;
  text: string;
  published_date: string;
  user: {
    username: string;
    user_location?: {
      name: string;
    };
  };
  helpful_votes: number;
  subratings?: {
    [key: string]: {
      name: string;
      localized_name: string;
      rating_image_url: string;
      value: string;
    };
  };
}

export const useTripAdvisorApi = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callTripAdvisorApi = async (params: {
    action: 'search' | 'details' | 'photos' | 'reviews' | 'nearby' | 'booking';
    query?: string;
    locationId?: string;
    limit?: number;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('tripadvisor-api', {
        body: params
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('TripAdvisor API error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const searchLocations = async (query: string): Promise<TripAdvisorLocation[]> => {
    const result = await callTripAdvisorApi({ action: 'search', query });
    return result.data || [];
  };

  const getLocationDetails = async (locationId: string): Promise<TripAdvisorLocation> => {
    const result = await callTripAdvisorApi({ action: 'details', locationId });
    return result;
  };

  const getLocationPhotos = async (locationId: string, limit = 20): Promise<TripAdvisorPhoto[]> => {
    const result = await callTripAdvisorApi({ action: 'photos', locationId, limit });
    return result.data || [];
  };

  const getLocationReviews = async (locationId: string, limit = 10): Promise<TripAdvisorReview[]> => {
    const result = await callTripAdvisorApi({ action: 'reviews', locationId, limit });
    return result.data || [];
  };

  const getNearbyLocations = async (locationId: string, limit = 10): Promise<TripAdvisorLocation[]> => {
    const result = await callTripAdvisorApi({ action: 'nearby', locationId, limit });
    return result.data || [];
  };

  const getBookingOffers = async (locationId: string, checkIn: string, checkOut: string, guests = 2): Promise<any[]> => {
    const result = await callTripAdvisorApi({ 
      action: 'booking', 
      locationId, 
      checkIn, 
      checkOut, 
      guests 
    });
    return result.data || [];
  };

  return {
    isLoading,
    error,
    searchLocations,
    getLocationDetails,
    getLocationPhotos,
    getLocationReviews,
    getNearbyLocations,
    getBookingOffers,
  };
};