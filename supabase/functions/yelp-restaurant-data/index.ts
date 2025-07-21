import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface YelpBusinessSearchParams {
  term?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  categories?: string;
  limit?: number;
  sort_by?: 'best_match' | 'rating' | 'review_count' | 'distance';
}

interface YelpBusiness {
  id: string;
  alias: string;
  name: string;
  image_url: string;
  is_closed: boolean;
  url: string;
  review_count: number;
  categories: Array<{
    alias: string;
    title: string;
  }>;
  rating: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  transactions: string[];
  price?: string;
  location: {
    address1: string;
    address2?: string;
    address3?: string;
    city: string;
    zip_code: string;
    country: string;
    state: string;
    display_address: string[];
  };
  phone: string;
  display_phone: string;
  distance?: number;
}

interface YelpBusinessDetails extends YelpBusiness {
  photos: string[];
  hours?: Array<{
    open: Array<{
      is_overnight: boolean;
      start: string;
      end: string;
      day: number;
    }>;
    hours_type: string;
    is_open_now: boolean;
  }>;
  special_hours?: Array<{
    date: string;
    is_closed: boolean;
    start?: string;
    end?: string;
    is_overnight?: boolean;
  }>;
  messaging?: {
    url: string;
    use_case_text: string;
  };
}

const yelpApiKey = Deno.env.get('YELP_API_KEY');

serve(async (req) => {
  console.log('Yelp restaurant data function called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!yelpApiKey) {
      throw new Error('Yelp API key is not configured');
    }

    const { action, ...params } = await req.json();
    console.log('Yelp API request:', { action, params });

    let response;

    switch (action) {
      case 'search':
        response = await searchBusinesses(params as YelpBusinessSearchParams);
        break;
      case 'business_details':
        response = await getBusinessDetails(params.businessId);
        break;
      case 'reviews':
        response = await getBusinessReviews(params.businessId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in yelp-restaurant-data function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch Yelp data',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function searchBusinesses(params: YelpBusinessSearchParams) {
  const searchParams = new URLSearchParams();
  
  if (params.term) searchParams.append('term', params.term);
  if (params.location) searchParams.append('location', params.location);
  if (params.latitude !== undefined) searchParams.append('latitude', params.latitude.toString());
  if (params.longitude !== undefined) searchParams.append('longitude', params.longitude.toString());
  if (params.radius) searchParams.append('radius', Math.min(params.radius, 40000).toString()); // Max 40km
  if (params.categories) searchParams.append('categories', params.categories);
  if (params.limit) searchParams.append('limit', Math.min(params.limit, 50).toString()); // Max 50
  if (params.sort_by) searchParams.append('sort_by', params.sort_by);

  // Default to restaurants if no categories specified
  if (!params.categories) {
    searchParams.append('categories', 'restaurants');
  }

  console.log('Yelp search params:', searchParams.toString());

  const response = await fetch(`https://api.yelp.com/v3/businesses/search?${searchParams}`, {
    headers: {
      'Authorization': `Bearer ${yelpApiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Yelp API error:', response.status, errorText);
    throw new Error(`Yelp API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log(`Found ${data.businesses?.length || 0} businesses from Yelp`);

  return {
    businesses: data.businesses || [],
    total: data.total || 0,
    region: data.region || null
  };
}

async function getBusinessDetails(businessId: string) {
  console.log(`Fetching details for business: ${businessId}`);

  const response = await fetch(`https://api.yelp.com/v3/businesses/${businessId}`, {
    headers: {
      'Authorization': `Bearer ${yelpApiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Yelp business details API error:', response.status, errorText);
    throw new Error(`Yelp business details API error: ${response.status} - ${errorText}`);
  }

  const business = await response.json();
  console.log(`Retrieved details for: ${business.name}`);

  return business as YelpBusinessDetails;
}

async function getBusinessReviews(businessId: string) {
  console.log(`Fetching reviews for business: ${businessId}`);

  const response = await fetch(`https://api.yelp.com/v3/businesses/${businessId}/reviews`, {
    headers: {
      'Authorization': `Bearer ${yelpApiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Yelp reviews API error:', response.status, errorText);
    throw new Error(`Yelp reviews API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log(`Retrieved ${data.reviews?.length || 0} reviews`);

  return {
    reviews: data.reviews || [],
    total: data.total || 0,
    possible_languages: data.possible_languages || []
  };
}