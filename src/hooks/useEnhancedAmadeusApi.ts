import { supabase } from "@/integrations/supabase/client";

export interface EnhancedFlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults?: number;
  children?: number;
  infants?: number;
  travelClass?: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
  nonStop?: boolean;
  maxPrice?: number;
  currency?: string;
  max?: number;
}

export interface FlightPriceCalendarParams {
  origin: string;
  destination: string;
  departureDate: string;
  oneWay?: boolean;
}

export interface AirportInfoParams {
  airportCode: string;
}

export interface FlightStatusParams {
  carrierCode: string;
  flightNumber: string;
  scheduledDepartureDate: string;
}

export interface EnhancedFlightOffer {
  id: string;
  flightNumber: string;
  airline: string;
  departure: {
    airport: string;
    time: string;
    date: string;
    terminal?: string;
  };
  arrival: {
    airport: string;
    time: string;
    date: string;
    terminal?: string;
  };
  duration: string;
  price: {
    total: string;
    currency: string;
    base: string;
    fees?: Array<{
      amount: string;
      type: string;
    }>;
  };
  stops: number;
  aircraft: string;
  cabin: string;
  fareType: string[];
  includedBaggage: {
    quantity: number;
  };
  operatedBy?: string;
  bookingClass: string;
  availableSeats?: number;
}

export interface AmadeusLocation {
  id: string;
  name: string;
  iataCode?: string;
  type: string;
  address: {
    cityName: string;
    countryName: string;
    countryCode: string;
  };
  geoCode: {
    latitude: number;
    longitude: number;
  };
  timeZone?: string;
}

export interface AirportInfo {
  id: string;
  name: string;
  iataCode: string;
  address: {
    cityName: string;
    countryName: string;
    countryCode: string;
  };
  geoCode: {
    latitude: number;
    longitude: number;
  };
  timeZone?: string;
  analytics?: {
    flights: {
      score: number;
    };
    travelers: {
      score: number;
    };
  };
}

export interface AirlineInfo {
  iataCode: string;
  icaoCode: string;
  businessName: string;
  commonName: string;
}

export interface FlightStatus {
  flightNumber: string;
  carrierCode: string;
  scheduledDepartureDate: string;
  flightPoints: Array<{
    iataCode: string;
    departure?: {
      timings: Array<{
        qualifier: string;
        value: string;
        delays?: number;
      }>;
      terminal?: string;
      gate?: string;
    };
    arrival?: {
      timings: Array<{
        qualifier: string;
        value: string;
        delays?: number;
      }>;
      terminal?: string;
      gate?: string;
    };
  }>;
}

export interface PriceCalendar {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  price: {
    total: string;
    currency: string;
  };
}

export const useEnhancedAmadeusApi = () => {
  const searchFlights = async (params: EnhancedFlightSearchParams): Promise<{
    data: EnhancedFlightOffer[];
    meta: { count: number };
    dictionaries?: any;
  }> => {
    try {
      const { data, error } = await supabase.functions.invoke('amadeus-enhanced-flight-api', {
        body: {
          endpoint: 'search-flights',
          ...params
        }
      });

      if (error) {
        console.error('Error searching flights:', error);
        throw error;
      }

      // Transform Amadeus response to our format
      const transformedOffers = data?.data?.map((offer: any) => {
        const segment = offer.itineraries[0].segments[0];
        const travelerPricing = offer.travelerPricings[0];
        const fareDetails = travelerPricing.fareDetailsBySegment[0];
        
        return {
          id: offer.id,
          flightNumber: `${segment.carrierCode}${segment.number}`,
          airline: data.dictionaries?.carriers?.[segment.carrierCode] || segment.carrierCode,
          departure: {
            airport: segment.departure.iataCode,
            time: new Date(segment.departure.at).toLocaleTimeString('en-US', { 
              hour12: false, 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            date: segment.departure.at.split('T')[0],
            terminal: segment.departure.terminal
          },
          arrival: {
            airport: segment.arrival.iataCode,
            time: new Date(segment.arrival.at).toLocaleTimeString('en-US', { 
              hour12: false, 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            date: segment.arrival.at.split('T')[0],
            terminal: segment.arrival.terminal
          },
          duration: offer.itineraries[0].duration,
          price: {
            total: offer.price.total,
            currency: offer.price.currency,
            base: offer.price.base,
            fees: offer.price.fees
          },
          stops: segment.numberOfStops,
          aircraft: data.dictionaries?.aircraft?.[segment.aircraft.code] || segment.aircraft.code,
          cabin: fareDetails.cabin,
          fareType: offer.pricingOptions.fareType,
          includedBaggage: fareDetails.includedCheckedBags,
          operatedBy: segment.operating ? data.dictionaries?.carriers?.[segment.operating.carrierCode] : undefined,
          bookingClass: fareDetails.class,
        } as EnhancedFlightOffer;
      }) || [];

      return {
        data: transformedOffers,
        meta: data?.meta || { count: transformedOffers.length },
        dictionaries: data?.dictionaries
      };
    } catch (error) {
      console.error('Failed to search flights:', error);
      throw error;
    }
  };

  const getFlightPriceCalendar = async (params: FlightPriceCalendarParams): Promise<PriceCalendar[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('amadeus-enhanced-flight-api', {
        body: {
          endpoint: 'flight-price-calendar',
          ...params
        }
      });

      if (error) {
        console.error('Error getting price calendar:', error);
        throw error;
      }

      return data?.data || [];
    } catch (error) {
      console.error('Failed to get price calendar:', error);
      throw error;
    }
  };

  const getAirportInfo = async (params: AirportInfoParams): Promise<AirportInfo[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('amadeus-enhanced-flight-api', {
        body: {
          endpoint: 'airport-info',
          ...params
        }
      });

      if (error) {
        console.error('Error getting airport info:', error);
        throw error;
      }

      return data?.data || [];
    } catch (error) {
      console.error('Failed to get airport info:', error);
      throw error;
    }
  };

  const getAirlineInfo = async (airlineCode: string): Promise<AirlineInfo[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('amadeus-enhanced-flight-api', {
        body: {
          endpoint: 'airline-info',
          airlineCode
        }
      });

      if (error) {
        console.error('Error getting airline info:', error);
        throw error;
      }

      return data?.data || [];
    } catch (error) {
      console.error('Failed to get airline info:', error);
      throw error;
    }
  };

  const getFlightStatus = async (params: FlightStatusParams): Promise<FlightStatus[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('amadeus-enhanced-flight-api', {
        body: {
          endpoint: 'flight-status',
          ...params
        }
      });

      if (error) {
        console.error('Error getting flight status:', error);
        throw error;
      }

      return data?.data || [];
    } catch (error) {
      console.error('Failed to get flight status:', error);
      throw error;
    }
  };

  const searchLocations = async (keyword: string): Promise<AmadeusLocation[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('amadeus-enhanced-flight-api', {
        body: {
          endpoint: 'search-locations',
          keyword
        }
      });

      if (error) {
        console.error('Error searching locations:', error);
        throw error;
      }

      return data?.data || [];
    } catch (error) {
      console.error('Failed to search locations:', error);
      throw error;
    }
  };

  return {
    searchFlights,
    getFlightPriceCalendar,
    getAirportInfo,
    getAirlineInfo,
    getFlightStatus,
    searchLocations
  };
};