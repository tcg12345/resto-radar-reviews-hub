import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TripAdvisorLocation {
  location_id: string;
  name: string;
  address_obj?: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    country?: string;
    postalcode?: string;
    address_string?: string;
  };
  latitude?: string;
  longitude?: string;
  phone?: string;
  website?: string;
  rating?: string;
  num_reviews?: string;
  photo?: {
    images?: {
      small?: { url: string };
      medium?: { url: string };
      large?: { url: string };
      original?: { url: string };
    };
  };
  price_level?: string;
  ranking?: string;
  ranking_data?: {
    ranking_string?: string;
  };
  awards?: Array<{
    award_type?: string;
    year?: string;
    display_name?: string;
  }>;
  cuisine?: Array<{
    name: string;
    localized_name: string;
  }>;
  dietary_restrictions?: Array<{
    name: string;
    localized_name: string;
  }>;
  establishment_types?: Array<{
    name: string;
    localized_name: string;
  }>;
  amenities?: Array<{
    name: string;
    localized_name: string;
  }>;
  subcategory?: Array<{
    name: string;
    localized_name: string;
  }>;
}

interface TripAdvisorPhoto {
  id: string;
  caption: string;
  published_date: string;
  images: {
    thumbnail?: { url: string; width: number; height: number };
    small?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
    large?: { url: string; width: number; height: number };
    original?: { url: string; width: number; height: number };
  };
  source: {
    name: string;
    localized_name: string;
  };
  user?: {
    username: string;
  };
}

interface TripAdvisorReview {
  id: string;
  rating: number;
  title: string;
  text: string;
  published_date: string;
  user: {
    username: string;
    user_location?: {
      name: string;
    };
  };
  helpful_votes: number;
  subratings?: {
    [key: string]: {
      name: string;
      localized_name: string;
      rating_image_url: string;
      value: string;
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, query, locationId, limit = 10 } = await req.json();
    const apiKey = Deno.env.get('TRIPADVISOR_API_KEY');

    if (!apiKey) {
      console.error('TripAdvisor API key not found');
      return new Response(
        JSON.stringify({ error: 'TripAdvisor API key not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const baseUrl = 'https://api.content.tripadvisor.com/api/v1';
    const headers = {
      'Accept': 'application/json',
      'X-TripAdvisor-API-Key': apiKey,
    };

    let apiUrl = '';
    let response: Response;

    switch (action) {
      case 'search':
        if (!query) {
          return new Response(
            JSON.stringify({ error: 'Query parameter required for search' }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
        apiUrl = `${baseUrl}/location/search?key=${apiKey}&searchQuery=${encodeURIComponent(query)}&language=en`;
        console.log('Searching TripAdvisor for:', query);
        break;

      case 'details':
        if (!locationId) {
          return new Response(
            JSON.stringify({ error: 'Location ID required for details' }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
        apiUrl = `${baseUrl}/location/${locationId}/details?key=${apiKey}&language=en&currency=USD`;
        console.log('Getting TripAdvisor details for location:', locationId);
        break;

      case 'photos':
        if (!locationId) {
          return new Response(
            JSON.stringify({ error: 'Location ID required for photos' }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
        apiUrl = `${baseUrl}/location/${locationId}/photos?key=${apiKey}&language=en&limit=${limit}`;
        console.log('Getting TripAdvisor photos for location:', locationId);
        break;

      case 'reviews':
        if (!locationId) {
          return new Response(
            JSON.stringify({ error: 'Location ID required for reviews' }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
        apiUrl = `${baseUrl}/location/${locationId}/reviews?key=${apiKey}&language=en&limit=${limit}`;
        console.log('Getting TripAdvisor reviews for location:', locationId);
        break;

      case 'nearby':
        if (!locationId) {
          return new Response(
            JSON.stringify({ error: 'Location ID required for nearby search' }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
        apiUrl = `${baseUrl}/location/${locationId}/nearby_search?key=${apiKey}&language=en&limit=${limit}`;
        console.log('Getting nearby locations for:', locationId);
        break;

      case 'booking':
        if (!locationId) {
          return new Response(
            JSON.stringify({ error: 'Location ID required for booking' }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
        const bookingParams = await req.json();
        const { checkIn, checkOut, guests = 2 } = bookingParams;
        
        if (!checkIn || !checkOut) {
          return new Response(
            JSON.stringify({ error: 'Check-in and check-out dates are required for booking' }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
        // TripAdvisor booking offers endpoint
        apiUrl = `${baseUrl}/location/${locationId}/offers?key=${apiKey}&checkin=${checkIn}&checkout=${checkOut}&adults=${guests}&currency=USD`;
        console.log('Getting booking offers for location:', locationId, 'from', checkIn, 'to', checkOut);
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Use: search, details, photos, reviews, nearby, or booking' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
    }

    response = await fetch(apiUrl, { headers });
    
    if (!response.ok) {
      console.error('TripAdvisor API error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      
      return new Response(
        JSON.stringify({ 
          error: `TripAdvisor API error: ${response.status} ${response.statusText}`,
          details: errorText
        }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    console.log('TripAdvisor API response:', JSON.stringify(data, null, 2));

    return new Response(
      JSON.stringify({ data }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});