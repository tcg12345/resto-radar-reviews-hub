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

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  flightNumber?: string;
  airline?: string;
  flightType?: 'nonstop' | 'onestop' | 'any';
  departureTimeFrom?: string;
  departureTimeTo?: string;
}

export interface HotelSearchParams {
  location: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  hotelName?: string;
  priceRange?: string;
}

export interface Hotel {
  id: string;
  name: string;
  address: string;
  description?: string;
  rating?: number;
  priceRange?: string;
  amenities?: string[];
  photos?: string[];
  latitude?: number;
  longitude?: number;
  website?: string;
  phone?: string;
  bookingUrl?: string;
}

export interface FlightOffer {
  id: string;
  flightNumber: string;
  airline: string;
  departure: {
    airport: string;
    time: string;
    date: string;
  };
  arrival: {
    airport: string;
    time: string;
    date: string;
  };
  duration?: string;
  price?: string;
  stops?: number;
  stopLocations?: string[];
}

export const useAmadeusApi = () => {
  const searchFlights = async (params: FlightSearchParams): Promise<FlightOffer[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('amadeus-api', {
        body: {
          endpoint: 'search-flights',
          ...params
        }
      });

      if (error) {
        console.error('Error searching flights:', error);
        throw error;
      }

      return data?.data || [];
    } catch (error) {
      console.error('Failed to search flights:', error);
      throw error;
    }
  };

  const searchCities = async (keyword: string): Promise<AmadeusCity[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('amadeus-api', {
        body: {
          endpoint: 'search-cities',
          keyword
        }
      });

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

  const searchHotels = async (params: HotelSearchParams): Promise<Hotel[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('amadeus-hotel-search', {
        body: params
      });

      if (error) {
        console.error('Error searching hotels:', error);
        throw error;
      }

      return data?.data || [];
    } catch (error) {
      console.error('Failed to search hotels:', error);
      throw error;
    }
  };

  return {
    searchFlights,
    searchCities,
    searchHotels
  };
};