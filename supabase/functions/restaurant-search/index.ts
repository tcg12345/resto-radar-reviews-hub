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
  skipEnrichment?: boolean;
  fastMode?: boolean;
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

    const { query, location, radius = 10000, limit = 20, type = 'restaurant', keyword, fastMode = false }: RestaurantSearchRequest = await req.json();

    // Handle both search modes: text search (with query) and nearby search (with location coordinates)
    const isNearbySearch = !query && location.includes(','); // lat,lng format
    
    if (!isNearbySearch && (!query || query.trim().length === 0)) {
      throw new Error('Search query is required for text search');
    }

    if (!location) {
      throw new Error('Location is required');
    }

    console.log('Searching restaurants:', { query, location, radius, limit, type, keyword, isNearbySearch, fastMode });

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

    // Fast mode: single page search only for maximum speed
    if (fastMode && lat && lng) {
      console.log('Using fast mode: single page nearby search');
      
      const searchKeyword = keyword || 'restaurant';
      const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&keyword=${encodeURIComponent(searchKeyword)}&key=${googlePlacesApiKey}`;
      console.log('Fast mode Places API URL:', placesUrl);
      
      const placesResponse = await fetch(placesUrl);
      
      if (!placesResponse.ok) {
        throw new Error(`Google Places API error: ${placesResponse.status}`);
      }

      const placesData = await placesResponse.json();
      
      if (placesData.status !== 'OK' && placesData.status !== 'ZERO_RESULTS') {
        console.error('Places API error:', placesData);
        throw new Error(`Google Places API error: ${placesData.status}`);
      }

      const allResults = placesData.results?.slice(0, limit) || [];
      console.log(`Fast mode found ${allResults.length} restaurants`);

      const restaurants = allResults.map((place: any) => {
        const restaurant = {
          id: place.place_id,
          name: place.name,
          address: place.formatted_address || place.vicinity,
          rating: place.rating || 0,
          reviewCount: place.user_ratings_total || 0,
          priceRange: place.price_level || 2,
          isOpen: place.opening_hours?.open_now,
          phoneNumber: place.formatted_phone_number || '',
          website: '',
          openingHours: [],
          currentDayHours: place.opening_hours?.open_now ? 'Open now' : 'Check hours',
          photos: place.photos?.slice(0, 1).map((photo: any) => 
            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${googlePlacesApiKey}`
          ) || [],
          location: {
            lat: place.geometry?.location?.lat || 0,
            lng: place.geometry?.location?.lng || 0,
          },
          cuisine: 'Restaurant',
          googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
          michelinStars: 0
        };

        // Quick cuisine detection from Google Places types
        if (place.types && place.types.length > 0) {
          const cuisineType = place.types
            .find((type: string) => !['restaurant', 'food', 'establishment', 'point_of_interest'].includes(type))
            ?.replace(/_/g, ' ')
            .replace(/\b\w/g, (l: string) => l.toUpperCase());
          
          if (cuisineType) {
            restaurant.cuisine = cuisineType;
          }
        }

        return restaurant;
      });

      return new Response(JSON.stringify({
        results: restaurants,
        status: 'OK',
        total: restaurants.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all results with pagination support (full mode)
    let allResults: any[] = [];
    let nextPageToken: string | null = null;
    let pageCount = 0;
    const maxPages = 2; // Reduced for faster results

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

    const restaurants = allResults.slice(0, limit).map((place: any) => {
      // Use basic place data for ultra-fast results - no additional API calls
      const restaurant = {
        id: place.place_id,
        name: place.name,
        address: place.formatted_address || place.vicinity,
        rating: place.rating || 0,
        reviewCount: place.user_ratings_total || 0,
        priceRange: place.price_level || 2,
        isOpen: place.opening_hours?.open_now,
        phoneNumber: place.formatted_phone_number || '',
        website: '',
        openingHours: [],
        currentDayHours: place.opening_hours?.open_now ? 'Open now' : 'Check hours',
        photos: place.photos?.slice(0, 3).map((photo: any) => 
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${googlePlacesApiKey}`
        ) || [],
        location: {
          lat: place.geometry?.location?.lat || 0,
          lng: place.geometry?.location?.lng || 0,
        },
        cuisine: 'Restaurant',
        googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
        michelinStars: 0
      };

      // Quick cuisine detection from Google Places types
      if (place.types && place.types.length > 0) {
        const cuisineType = place.types
          .find((type: string) => !['restaurant', 'food', 'establishment', 'point_of_interest'].includes(type))
          ?.replace(/_/g, ' ')
          .replace(/\b\w/g, (l: string) => l.toUpperCase());
        
        if (cuisineType) {
          restaurant.cuisine = cuisineType;
        }
      }

      return restaurant;
    });

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