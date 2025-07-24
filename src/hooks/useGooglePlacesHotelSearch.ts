import { supabase } from "@/integrations/supabase/client";

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
}

export const useGooglePlacesHotelSearch = () => {
  const searchHotels = async (params: HotelSearchParams): Promise<Hotel[]> => {
    try {
      // First search for hotels using Google Places
      const { data: searchData, error: searchError } = await supabase.functions.invoke('google-places-search', {
        body: {
          query: `hotels in ${params.location}`,
          location: params.location,
          radius: 50000,
          type: 'search'
        }
      });

      if (searchError) {
        console.error('Error searching hotels:', searchError);
        throw searchError;
      }

      if (!searchData?.results) {
        return [];
      }

      // Filter results to only include lodging establishments
      const hotelResults = searchData.results.filter((place: any) => 
        place.types?.some((type: string) => 
          ['lodging', 'establishment'].includes(type)
        )
      );

      // Get detailed information for each hotel
      const hotels: Hotel[] = [];
      
      for (const place of hotelResults.slice(0, 20)) { // Limit to 20 results
        try {
          const { data: detailsData, error: detailsError } = await supabase.functions.invoke('google-places-search', {
            body: {
              type: 'details',
              placeId: place.place_id
            }
          });

          if (detailsError || !detailsData?.result) {
            continue;
          }

          const details = detailsData.result;
          
          // Extract amenities from types and other data
          const amenities = [];
          if (details.types?.includes('restaurant')) amenities.push('Restaurant');
          if (details.types?.includes('gym')) amenities.push('Fitness Center');
          if (details.types?.includes('spa')) amenities.push('Spa');
          if (details.types?.includes('swimming_pool')) amenities.push('Pool');
          
          // Add common hotel amenities based on rating and price level
          if (details.price_level >= 3) {
            amenities.push('WiFi', 'Room Service', 'Concierge');
          } else if (details.price_level >= 2) {
            amenities.push('WiFi', 'Breakfast');
          } else {
            amenities.push('WiFi');
          }

          // Generate price range based on Google's price_level
          let priceRange = '';
          switch (details.price_level) {
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

          // Apply price filter if specified
          if (params.priceRange && params.priceRange !== 'any') {
            const skipHotel = 
              (params.priceRange === 'budget' && details.price_level > 2) ||
              (params.priceRange === 'mid-range' && (details.price_level < 2 || details.price_level > 3)) ||
              (params.priceRange === 'luxury' && details.price_level < 3);
            
            if (skipHotel) continue;
          }

          const hotel: Hotel = {
            id: details.place_id,
            name: details.name,
            address: details.formatted_address,
            description: details.reviews?.[0]?.text || 'A comfortable hotel in a great location.',
            rating: details.rating,
            priceRange,
            amenities: amenities.slice(0, 6), // Limit amenities display
            photos: details.photos?.slice(0, 3)?.map((photo: any) => 
              `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${process.env.GOOGLE_PLACES_API_KEY}`
            ) || [],
            latitude: details.geometry?.location?.lat,
            longitude: details.geometry?.location?.lng,
            website: details.website,
            phone: details.formatted_phone_number,
            bookingUrl: details.website // Use website as booking URL for now
          };

          hotels.push(hotel);
        } catch (error) {
          console.error('Error getting hotel details:', error);
          continue;
        }
      }

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