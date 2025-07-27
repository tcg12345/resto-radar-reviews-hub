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

      // Fetch detailed information for each hotel to get website links
      const hotelsWithDetails = await Promise.all(
        hotelResults.map(async (place: any) => {
          let detailedPlace = null;
          
          // Fetch detailed information including website
          try {
            const { data: detailData, error: detailError } = await supabase.functions.invoke('google-places-search', {
              body: {
                placeId: place.place_id,
                type: 'details'
              }
            });
            
            if (!detailError && detailData?.status === 'OK') {
              detailedPlace = detailData.result;
            }
          } catch (error) {
            console.error('Error fetching hotel details:', error);
          }

          // Generate price range based on Google's price_level
          let priceRange = '';
          const priceLevel = detailedPlace?.price_level || place.price_level;
          switch (priceLevel) {
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
          if ((detailedPlace?.price_level || place.price_level) >= 3) {
            amenities.push('WiFi', 'Room Service', 'Concierge');
          } else if ((detailedPlace?.price_level || place.price_level) >= 2) {
            amenities.push('WiFi', 'Breakfast');
          } else {
            amenities.push('WiFi');
          }

          return {
            id: place.place_id,
            name: place.name,
            address: place.formatted_address,
            description: 'A comfortable hotel in a great location.',
            rating: detailedPlace?.rating || place.rating,
            priceRange,
            amenities: amenities.slice(0, 4),
            photos: [],
            latitude: place.geometry?.location?.lat,
            longitude: place.geometry?.location?.lng,
            website: detailedPlace?.website, // Website from detailed API call
            phone: detailedPlace?.formatted_phone_number || place.formatted_phone_number,
            bookingUrl: detailedPlace?.website // Use website as booking URL
          };
        })
      );

      // Sort by rating (highest first)
      hotelsWithDetails.sort((a, b) => (b.rating || 0) - (a.rating || 0));

      return hotelsWithDetails;
    } catch (error) {
      console.error('Failed to search hotels:', error);
      throw error;
    }
  };

  return {
    searchHotels
  };
};