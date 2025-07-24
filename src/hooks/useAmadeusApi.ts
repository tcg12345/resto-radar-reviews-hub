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
      // Use a GET request by invoking the function with the path parameter
      const response = await fetch(`https://ocpmhsquwsdaauflbygf.supabase.co/functions/v1/amadeus-api/search-cities?keyword=${encodeURIComponent(keyword)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jcG1oc3F1d3NkYWF1ZmxieWdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3OTExOTYsImV4cCI6MjA2ODM2NzE5Nn0.Xf7eNeuD37Vve1jpTyuBTdWqPdqnRXN0jFU84O-4H20`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
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