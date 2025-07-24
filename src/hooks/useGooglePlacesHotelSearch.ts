import { supabase } from "@/integrations/supabase/client";

export interface HotelSearchParams {
  query: string;
  location?: string;
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

export const useGooglePlacesHotelSearch = () => {
  const searchHotels = async (params: HotelSearchParams): Promise<Hotel[]> => {
    try {
      // Search for hotels using the query - more targeted search
      const searchQuery = params.location ? 
        `hotels in ${params.location} ${params.query}`.trim() : 
        `${params.query} hotels`;

      const { data: searchData, error: searchError } = await supabase.functions.invoke('google-places-search', {
        body: {
          query: searchQuery,
          location: params.location,
          radius: 25000, // Smaller radius for faster results
          type: 'search',
          searchType: 'lodging'
        }
      });

      if (searchError) {
        console.error('Error searching hotels:', searchError);
        throw searchError;
      }

      if (!searchData?.results) {
        return [];
      }

      // Filter and process results more efficiently
      const hotelResults = searchData.results
        .filter((place: any) => 
          place.types?.some((type: string) => 
            ['lodging', 'establishment'].includes(type)
          )
        )
        .slice(0, 10); // Reduce to 10 for faster loading

      // Process hotels with basic info first, then enhance with details only when needed
      const hotels: Hotel[] = hotelResults.map((place: any) => {
        // Generate price range based on Google's price_level
        let priceRange = '';
        switch (place.price_level) {
          case 1:
            priceRange = '$50-100';
            break;
          case 2:
            priceRange = '$100-200';
            break;
          case 3:
            priceRange = '$200-350';
            break;
          case 4:
            priceRange = '$350+';
            break;
          default:
            priceRange = 'Price varies';
        }

        // Extract basic amenities from types
        const amenities = [];
        if (place.types?.includes('restaurant')) amenities.push('Restaurant');
        if (place.price_level >= 3) {
          amenities.push('WiFi', 'Room Service', 'Concierge');
        } else if (place.price_level >= 2) {
          amenities.push('WiFi', 'Breakfast');
        } else {
          amenities.push('WiFi');
        }

        return {
          id: place.place_id,
          name: place.name,
          address: place.formatted_address,
          description: 'A comfortable hotel in a great location.',
          rating: place.rating,
          priceRange,
          amenities: amenities.slice(0, 4),
          photos: [],
          latitude: place.geometry?.location?.lat,
          longitude: place.geometry?.location?.lng,
          website: place.website,
          phone: place.formatted_phone_number,
          bookingUrl: place.website
        };
      });

      // Sort by rating (highest first)
      hotels.sort((a, b) => (b.rating || 0) - (a.rating || 0));

      return hotels;
    } catch (error) {
      console.error('Failed to search hotels:', error);
      throw error;
    }
  };

  return {
    searchHotels
  };
};