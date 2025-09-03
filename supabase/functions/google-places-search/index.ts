import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  query: string;
  location?: string;
  radius?: number;
  type?: 'search' | 'details' | 'nearby';
  placeId?: string;
  searchType?: 'restaurant' | 'lodging'; // Add this to specify what type of place to search for
}

interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  opening_hours?: {
    open_now: boolean;
    weekday_text: string[];
  };
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  reviews?: Array<{
    author_name: string;
    rating: number;
    text: string;
    time: number;
  }>;
  reservable?: boolean;
}

serve(async (req) => {
  // Add function startup timing
  const functionStartTime = Date.now();
  console.log('Function started at:', new Date().toISOString());

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      console.error('Google Places API key not configured');
      throw new Error('Google Places API key not configured');
    }

    const requestBody = await req.json();
    console.log('Request received:', requestBody);
    
    const { query, location, radius = 50000, type = 'search', placeId, searchType = 'restaurant' }: SearchRequest = requestBody;

    let url: string;
    let params: URLSearchParams;

    switch (type) {
      case 'search':
        url = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
        params = new URLSearchParams({
          query: query,
          key: apiKey,
        });
        if (location) {
          params.append('location', location);
          params.append('radius', radius.toString());
          params.append('locationbias', `circle:${radius}@${location}`);
        }
        break;

      case 'details':
        if (!placeId) {
          throw new Error('Place ID required for details request');
        }
        url = 'https://maps.googleapis.com/maps/api/place/details/json';
        params = new URLSearchParams({
          place_id: placeId,
          fields: 'place_id,name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,price_level,opening_hours,photos,geometry,types,reviews,reservable',
          key: apiKey,
          reviews_sort: 'newest',
        });
        break;

      case 'nearby':
        if (!location) {
          throw new Error('Location required for nearby search');
        }
        url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
        params = new URLSearchParams({
          location: location,
          radius: radius.toString(),
          key: apiKey,
        });
        break;

      default:
        throw new Error('Invalid search type');
    }

    console.log(`Making request to: ${url}`);
    const requestStartTime = Date.now();
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(`${url}?${params.toString()}`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const requestDuration = Date.now() - requestStartTime;
    console.log(`Google API request completed in ${requestDuration}ms`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Google Places API response status: ${data.status}`);
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error(`Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
      throw new Error(`Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }

    // Simplify caching - only cache for details requests and without heavy DB operations
    if (type === 'details' && data.result) {
      console.log('Caching place details...');
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const place: PlaceDetails = data.result;
        
        // Minimal caching - just store essential data without blocking the response
        const cacheData = {
          google_place_id: place.place_id,
          name: place.name,
          address: place.formatted_address,
          city: place.formatted_address.split(',').slice(-2, -1)[0]?.trim() || '',
          country: place.formatted_address.split(',').slice(-1)[0]?.trim() || '',
          cuisine: place.types.filter(type => 
            !['establishment', 'point_of_interest', 'food'].includes(type)
          )[0] || 'restaurant',
          rating: place.rating,
          phone_number: place.formatted_phone_number,
          website: place.website,
          opening_hours: place.opening_hours?.weekday_text?.join('\n'),
          price_range: place.price_level,
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          photos: place.photos?.slice(0, 3).map(photo => 
            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${apiKey}`
          ) || [],
          user_id: '00000000-0000-0000-0000-000000000000',
          is_wishlist: false,
          notes: 'Cached from Google Places API'
        };

        // Fire and forget - don't wait for DB operation
        supabase.from('restaurants').upsert(cacheData, { onConflict: 'google_place_id' }).then(() => {
          console.log('Place cached successfully');
        }).catch((error) => {
          console.error('Caching error (non-blocking):', error);
        });
        
      } catch (cacheError) {
        console.error('Cache error (non-blocking):', cacheError);
        // Don't let caching errors affect the response
      }
    }

    const totalDuration = Date.now() - functionStartTime;
    console.log(`Total function execution time: ${totalDuration}ms`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const isAbortError = error.name === 'AbortError';
    const errorMessage = isAbortError ? 'Request timeout' : error.message;
    
    console.error('Function error:', {
      message: errorMessage,
      stack: error.stack,
      isTimeout: isAbortError
    });

    return new Response(JSON.stringify({ 
      error: errorMessage,
      status: 'ERROR',
      timestamp: new Date().toISOString()
    }), {
      status: isAbortError ? 408 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});