import { supabase } from "@/integrations/supabase/client";

export interface PointOfInterest {
  id: string;
  name: string;
  category: string;
  geoCode: {
    latitude: number;
    longitude: number;
  };
  address?: {
    countryCode: string;
    countryName: string;
    stateCode?: string;
    state?: string;
    cityName?: string;
    postalCode?: string;
  };
  contacts?: {
    phones?: Array<{
      number: string;
      type: string;
    }>;
    emails?: Array<{
      address: string;
    }>;
  };
  tags?: string[];
  rank?: number;
}

export interface AmadeusCity {
  id: string;
  name: string;
  iataCode?: string;
  geoCode: {
    latitude: number;
    longitude: number;
  };
  address: {
    countryCode: string;
    countryName: string;
    stateCode?: string;
  };
}

export const useAmadeusApi = () => {
  const getPointsOfInterest = async (
    latitude: number,
    longitude: number,
    radius: number = 5,
    categories: string[] = ['RESTAURANT']
  ): Promise<PointOfInterest[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('amadeus-api/points-of-interest', {
        body: {
          latitude,
          longitude,
          radius,
          categories
        }
      });

      if (error) {
        console.error('Error fetching points of interest:', error);
        throw error;
      }

      return data?.data || [];
    } catch (error) {
      console.error('Failed to fetch points of interest:', error);
      throw error;
    }
  };

  const searchCities = async (keyword: string): Promise<AmadeusCity[]> => {
    try {
      const { data, error } = await supabase.functions.invoke(
        `amadeus-api/search-cities?keyword=${encodeURIComponent(keyword)}`,
        { method: 'GET' }
      );

      if (error) {
        console.error('Error searching cities:', error);
        throw error;
      }

      return data?.data || [];
    } catch (error) {
      console.error('Failed to search cities:', error);
      throw error;
    }
  };

  return {
    getPointsOfInterest,
    searchCities
  };
};