import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RestaurantSearchRequest {
  query?: string;
  location: string;
  radius?: number;
  limit?: number;
  type?: string;
  keyword?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const googlePlacesApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!googlePlacesApiKey) {
      throw new Error('Google Places API key not found');
    }

    const { query, location, radius = 10000, limit = 20, type = 'restaurant', keyword }: RestaurantSearchRequest = await req.json();

    // Handle both search modes: text search (with query) and nearby search (with location coordinates)
    const isNearbySearch = !query && location.includes(','); // lat,lng format
    
    if (!isNearbySearch && (!query || query.trim().length === 0)) {
      throw new Error('Search query is required for text search');
    }

    if (!location) {
      throw new Error('Location is required');
    }

    console.log('Searching restaurants:', { query, location, radius, limit, type, keyword, isNearbySearch });

    // First, geocode the location if provided
    let searchLocation = location || 'current location';
    let lat, lng;

    // Handle coordinate-based search vs text-based search
    if (isNearbySearch) {
      // Parse coordinates from location string (lat,lng)
      const [latStr, lngStr] = location.split(',');
      lat = parseFloat(latStr.trim());
      lng = parseFloat(lngStr.trim());
      
      if (isNaN(lat) || isNaN(lng)) {
        throw new Error('Invalid coordinates provided');
      }
      
      console.log(`Using provided coordinates: ${lat}, ${lng}`);
    } else if (location && location !== 'current location') {
      // Geocode the location if provided as text
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${googlePlacesApiKey}`;
      
      try {
        const geocodeResponse = await fetch(geocodeUrl);
        const geocodeData = await geocodeResponse.json();
        
        if (geocodeData.results && geocodeData.results.length > 0) {
          lat = geocodeData.results[0].geometry.location.lat;
          lng = geocodeData.results[0].geometry.location.lng;
          console.log(`Geocoded ${location} to ${lat}, ${lng}`);
        }
      } catch (geocodeError) {
        console.warn('Geocoding failed, using location as text:', geocodeError);
      }
    }

    // Get all results with pagination support
    let allResults: any[] = [];
    let nextPageToken: string | null = null;
    let pageCount = 0;
    const maxPages = 3; // Google allows up to 60 results per query (20 per page * 3 pages)

    do {
      let placesUrl: string;
      
      if (isNearbySearch && lat && lng) {
        // Use nearby search for coordinate-based searches
        const searchKeyword = keyword || 'restaurant';
        placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&keyword=${encodeURIComponent(searchKeyword)}&key=${googlePlacesApiKey}`;
        console.log(`Using nearby search with keyword: ${searchKeyword}`);
      } else {
        // Use text search for query-based searches  
        const searchQuery = location && location !== 'current location' 
          ? `${query} restaurants in ${location}` 
          : `${query} restaurant`;
        
        placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&type=restaurant&key=${googlePlacesApiKey}`;
        
        // Add location+radius for better location filtering if we have coordinates
        if (lat && lng) {
          placesUrl += `&location=${lat},${lng}&radius=${radius}`;
          console.log(`Using coordinates: ${lat}, ${lng} with ${radius}m radius`);
        }
      }

      // Add page token for subsequent requests
      if (nextPageToken) {
        placesUrl += `&pagetoken=${nextPageToken}`;
      }

      console.log(`Places API URL (page ${pageCount + 1}):`, placesUrl);

      const placesResponse = await fetch(placesUrl);
      
      if (!placesResponse.ok) {
        throw new Error(`Google Places API error: ${placesResponse.status}`);
      }

      const placesData = await placesResponse.json();

      if (placesData.status !== 'OK' && placesData.status !== 'ZERO_RESULTS') {
        console.error('Places API error:', placesData);
        throw new Error(`Google Places API error: ${placesData.status}`);
      }

      if (placesData.results && placesData.results.length > 0) {
        allResults.push(...placesData.results);
        console.log(`Total results so far: ${allResults.length}`);
      }

      nextPageToken = placesData.next_page_token || null;
      pageCount++;

      // Google requires a short delay between paginated requests
      if (nextPageToken && pageCount < maxPages) {
        console.log('Waiting for next page token to become valid...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } while (nextPageToken && pageCount < maxPages && allResults.length < limit);

    console.log(`Final total results: ${allResults.length}`);

    const restaurants = await Promise.all(
      allResults.slice(0, limit).map(async (place: any) => {
        // Get detailed information for each restaurant
        let detailedPlace = place;
        
        try {
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,rating,user_ratings_total,price_level,opening_hours,formatted_phone_number,website,geometry,types,photos&key=${googlePlacesApiKey}`;
          
          const detailsResponse = await fetch(detailsUrl);
          if (detailsResponse.ok) {
            const detailsData = await detailsResponse.json();
            if (detailsData.status === 'OK' && detailsData.result) {
              detailedPlace = { ...place, ...detailsData.result };
              console.log(`Got details for ${place.name}:`, {
                hasOpeningHours: !!detailsData.result.opening_hours,
                hasWeekdayText: !!detailsData.result.opening_hours?.weekday_text,
                hasWebsite: !!detailsData.result.website
              });
            }
          }
        } catch (error) {
          console.warn(`Failed to get details for ${place.name}:`, error);
        }

        // Determine current day opening hours
        const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
        let currentDayHours;
        
        if (detailedPlace.opening_hours?.weekday_text) {
          const todayHours = detailedPlace.opening_hours.weekday_text[today === 0 ? 6 : today - 1]; // Adjust for Sunday
          if (todayHours) {
            const timeMatch = todayHours.match(/:\s*(.+)/);
            currentDayHours = timeMatch ? timeMatch[1].trim() : todayHours;
          }
        }

        const restaurant = {
          id: detailedPlace.place_id,
          name: detailedPlace.name,
          address: detailedPlace.formatted_address,
          rating: detailedPlace.rating || 0,
          reviewCount: detailedPlace.user_ratings_total,
          priceRange: detailedPlace.price_level || 2,
          isOpen: detailedPlace.opening_hours?.open_now,
          phoneNumber: detailedPlace.formatted_phone_number,
          website: detailedPlace.website,
          openingHours: detailedPlace.opening_hours?.weekday_text || [],
          currentDayHours,
          photos: detailedPlace.photos?.map((photo: any) => 
            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${googlePlacesApiKey}`
          ) || [],
          location: {
            lat: detailedPlace.geometry?.location?.lat || 0,
            lng: detailedPlace.geometry?.location?.lng || 0,
          },
          cuisine: 'Restaurant', // Will be determined by AI below
          googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${detailedPlace.place_id}`,
          michelinStars: 0 // Google Places doesn't provide Michelin stars
        };

        // Determine cuisine using AI
        try {
          const supabaseUrl = Deno.env.get('SUPABASE_URL');
          const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
          
          if (supabaseUrl && supabaseAnonKey) {
            const cuisineResponse = await fetch(`${supabaseUrl}/functions/v1/determine-cuisine`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`,
              },
              body: JSON.stringify({
                restaurantName: restaurant.name,
                address: restaurant.address,
                types: detailedPlace.types || []
              })
            });

            if (cuisineResponse.ok) {
              const cuisineData = await cuisineResponse.json();
              if (cuisineData.cuisine && cuisineData.cuisine !== 'Restaurant') {
                restaurant.cuisine = cuisineData.cuisine;
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to determine cuisine for ${restaurant.name}:`, error);
        }

        // Enhance with Yelp data
        try {
          console.log(`Attempting to get Yelp data for ${restaurant.name} at ${restaurant.address}`);
          
          const { data: yelpData, error: yelpError } = await supabase.functions.invoke('yelp-restaurant-data', {
            body: {
              action: 'search',
              term: restaurant.name,
              location: restaurant.address,
              limit: 1,
              sort_by: 'best_match'
            }
          });

          console.log(`Yelp response for ${restaurant.name}:`, { 
            error: yelpError, 
            hasData: !!yelpData, 
            businessCount: yelpData?.businesses?.length || 0 
          });

          if (!yelpError && yelpData?.businesses?.length > 0) {
            const yelpBusiness = yelpData.businesses[0];
            
            // Create yelpData object similar to discover function
            restaurant.yelpData = {
              id: yelpBusiness.id,
              url: yelpBusiness.url,
              categories: yelpBusiness.categories?.map((cat: any) => cat.title) || [],
              price: yelpBusiness.price || undefined,
              photos: yelpBusiness.photos || [],
              transactions: yelpBusiness.transactions || []
            };

            console.log(`Successfully enhanced ${restaurant.name} with Yelp data:`, {
              hasYelpData: !!restaurant.yelpData,
              price: restaurant.yelpData.price,
              transactions: restaurant.yelpData.transactions,
              url: restaurant.yelpData.url
            });

            // Use Yelp rating if available and higher
            if (yelpBusiness.rating && yelpBusiness.rating > restaurant.rating) {
              restaurant.rating = yelpBusiness.rating;
            }

            // Use Yelp review count if available and higher
            if (yelpBusiness.review_count && yelpBusiness.review_count > (restaurant.reviewCount || 0)) {
              restaurant.reviewCount = yelpBusiness.review_count;
            }
          } else {
            console.log(`No Yelp data found for ${restaurant.name}: ${yelpError?.message || 'No businesses returned'}`);
          }
        } catch (error) {
          console.warn(`Failed to get Yelp data for ${restaurant.name}:`, error);
        }


        console.log(`Final restaurant ${detailedPlace.name}:`, {
          hasWebsite: !!restaurant.website,
          website: restaurant.website,
          hasOpeningHours: restaurant.openingHours.length > 0,
          currentDayHours: restaurant.currentDayHours,
          openingHoursRaw: detailedPlace.opening_hours?.weekday_text,
          hasOpeningHoursData: !!detailedPlace.opening_hours,
          todayIndex: today === 0 ? 6 : today - 1
        });

        return restaurant;
      }) || []
    );

    console.log(`Found ${restaurants.length} restaurants`);

    return new Response(JSON.stringify({
      results: restaurants,
      status: 'OK',
      total: restaurants.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in restaurant search:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to search restaurants'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});