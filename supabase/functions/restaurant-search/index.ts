import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RestaurantSearchRequest {
  query: string;
  location: string;
  radius?: number;
  limit?: number;
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

    const { query, location, radius = 10000, limit = 20 }: RestaurantSearchRequest = await req.json();

    if (!query || query.trim().length === 0) {
      throw new Error('Search query is required');
    }

    console.log('Searching restaurants:', { query, location, radius, limit });

    // First, geocode the location if provided
    let searchLocation = location || 'current location';
    let lat, lng;

    if (location && location !== 'current location') {
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

    // Build the search query for Places API
    const searchQuery = `${query} restaurant`;
    let placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&type=restaurant&key=${googlePlacesApiKey}`;
    
    if (lat && lng) {
      placesUrl += `&location=${lat},${lng}&radius=${radius}`;
    } else if (location && location !== 'current location') {
      placesUrl += `&region=${encodeURIComponent(location)}`;
    }

    console.log('Places API URL:', placesUrl);

    const placesResponse = await fetch(placesUrl);
    
    if (!placesResponse.ok) {
      throw new Error(`Google Places API error: ${placesResponse.status}`);
    }

    const placesData = await placesResponse.json();

    if (placesData.status !== 'OK' && placesData.status !== 'ZERO_RESULTS') {
      console.error('Places API error:', placesData);
      throw new Error(`Google Places API error: ${placesData.status}`);
    }

    const restaurants = placesData.results?.slice(0, limit).map((place: any) => {
      // Determine current day opening hours
      const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
      let currentDayHours;
      
      if (place.opening_hours?.weekday_text) {
        const todayHours = place.opening_hours.weekday_text[today === 0 ? 6 : today - 1]; // Adjust for Sunday
        if (todayHours) {
          const timeMatch = todayHours.match(/:\s*(.+)/);
          currentDayHours = timeMatch ? timeMatch[1].trim() : todayHours;
        }
      }

      return {
        id: place.place_id,
        name: place.name,
        address: place.formatted_address,
        rating: place.rating || 0,
        reviewCount: place.user_ratings_total,
        priceRange: place.price_level || 2,
        isOpen: place.opening_hours?.open_now,
        phoneNumber: place.formatted_phone_number,
        website: place.website,
        openingHours: place.opening_hours?.weekday_text || [],
        currentDayHours,
        photos: place.photos?.map((photo: any) => 
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${googlePlacesApiKey}`
        ) || [],
        location: {
          lat: place.geometry?.location?.lat || 0,
          lng: place.geometry?.location?.lng || 0,
        },
        cuisine: place.types?.find((type: string) => 
          !['restaurant', 'food', 'establishment', 'point_of_interest'].includes(type)
        )?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Restaurant',
        googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
        michelinStars: 0 // Google Places doesn't provide Michelin stars
      };
    }) || [];

    console.log(`Found ${restaurants.length} restaurants`);

    return new Response(JSON.stringify({
      success: true,
      restaurants,
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