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
  locationScore?: number;
  bookingAvailable?: boolean;
  userRatings?: {
    overall: number;
    service: number;
    cleanliness: number;
    comfort: number;
    location: number;
    value: number;
    totalReviews: number;
  };
}

export interface HotelAutocomplete {
  id: string;
  name: string;
  address: {
    cityName: string;
    countryName: string;
  };
  geoCode: {
    latitude: number;
    longitude: number;
  };
}

export interface HotelBooking {
  bookingId: string;
  status: string;
  hotelId: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  roomType: string;
  totalPrice: string;
  confirmationNumber: string;
  bookingUrl: string;
}

export interface LocationScore {
  score: number;
  latitude: number;
  longitude: number;
  factors: {
    cityCenter: number;
    transportation: number;
    attractions: number;
    dining: number;
    shopping: number;
  };
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
      const { data, error } = await supabase.functions.invoke('amadeus-api', {
        body: {
          endpoint: 'search-hotels',
          ...params
        }
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

  const hotelAutocomplete = async (query: string, location?: string): Promise<HotelAutocomplete[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('amadeus-api', {
        body: {
          endpoint: 'hotel-autocomplete',
          query,
          location
        }
      });

      if (error) {
        console.error('Error getting hotel autocomplete:', error);
        throw error;
      }

      return data?.data || [];
    } catch (error) {
      console.error('Failed to get hotel autocomplete:', error);
      throw error;
    }
  };

  const getHotelRatings = async (hotelId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('amadeus-api', {
        body: {
          endpoint: 'hotel-ratings',
          hotelId
        }
      });

      if (error) {
        console.error('Error getting hotel ratings:', error);
        throw error;
      }

      return data?.data || {};
    } catch (error) {
      console.error('Failed to get hotel ratings:', error);
      throw error;
    }
  };

  const bookHotel = async (params: {
    hotelId: string;
    checkInDate: string;
    checkOutDate: string;
    guests: number;
    roomType?: string;
  }): Promise<HotelBooking> => {
    try {
      const { data, error } = await supabase.functions.invoke('amadeus-api', {
        body: {
          endpoint: 'hotel-booking',
          ...params
        }
      });

      if (error) {
        console.error('Error booking hotel:', error);
        throw error;
      }

      return data?.data || {};
    } catch (error) {
      console.error('Failed to book hotel:', error);
      throw error;
    }
  };

  const getLocationScore = async (params: {
    latitude?: number;
    longitude?: number;
    location?: string;
  }): Promise<LocationScore> => {
    try {
      const { data, error } = await supabase.functions.invoke('amadeus-api', {
        body: {
          endpoint: 'location-score',
          ...params
        }
      });

      if (error) {
        console.error('Error getting location score:', error);
        throw error;
      }

      return data?.data || {};
    } catch (error) {
      console.error('Failed to get location score:', error);
      throw error;
    }
  };

  return {
    searchFlights,
    searchCities,
    searchHotels,
    hotelAutocomplete,
    getHotelRatings,
    bookHotel,
    getLocationScore
  };
};