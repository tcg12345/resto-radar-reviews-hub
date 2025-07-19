import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface YelpSearchRequest {
  restaurantName: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const yelpApiKey = Deno.env.get('YELP_API_KEY');
    if (!yelpApiKey) {
      console.error('YELP_API_KEY not found in environment variables');
      return new Response(
        JSON.stringify({ error: 'Yelp API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { restaurantName, address, latitude, longitude }: YelpSearchRequest = await req.json();
    
    console.log('Searching Yelp for:', { restaurantName, address, latitude, longitude });

    // First, search for the business to get its Yelp ID
    const searchParams = new URLSearchParams();
    searchParams.append('term', restaurantName);
    searchParams.append('categories', 'restaurants');
    searchParams.append('limit', '5');

    if (latitude && longitude) {
      searchParams.append('latitude', latitude.toString());
      searchParams.append('longitude', longitude.toString());
      searchParams.append('radius', '1000'); // 1km radius
    } else if (address) {
      searchParams.append('location', address);
    }

    const searchUrl = `https://api.yelp.com/v3/businesses/search?${searchParams.toString()}`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${yelpApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!searchResponse.ok) {
      console.error('Yelp search failed:', searchResponse.status, await searchResponse.text());
      return new Response(
        JSON.stringify({ error: 'Failed to search Yelp businesses' }),
        { 
          status: searchResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const searchData = await searchResponse.json();
    console.log('Yelp search results:', searchData.businesses?.length || 0, 'businesses found');

    if (!searchData.businesses || searchData.businesses.length === 0) {
      return new Response(
        JSON.stringify({ 
          business: null, 
          reviews: [],
          message: 'No matching business found on Yelp' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Find the best match (first result is usually the best)
    const business = searchData.businesses[0];
    console.log('Selected business:', business.name, business.id);

    // Get detailed business info and reviews
    const businessUrl = `https://api.yelp.com/v3/businesses/${business.id}`;
    const reviewsUrl = `https://api.yelp.com/v3/businesses/${business.id}/reviews?limit=20&sort_by=date_desc`;

    const [businessResponse, reviewsResponse] = await Promise.all([
      fetch(businessUrl, {
        headers: {
          'Authorization': `Bearer ${yelpApiKey}`,
          'Content-Type': 'application/json',
        },
      }),
      fetch(reviewsUrl, {
        headers: {
          'Authorization': `Bearer ${yelpApiKey}`,
          'Content-Type': 'application/json',
        },
      })
    ]);

    let businessDetails = business;
    let reviews = [];

    if (businessResponse.ok) {
      businessDetails = await businessResponse.json();
      console.log('Business details loaded:', businessDetails.name, businessDetails.review_count);
    } else {
      console.error('Business details failed:', businessResponse.status, await businessResponse.text());
    }

    if (reviewsResponse.ok) {
      const reviewsData = await reviewsResponse.json();
      reviews = reviewsData.reviews || [];
      console.log('Reviews response:', reviewsData);
    } else {
      console.error('Reviews request failed:', reviewsResponse.status, await reviewsResponse.text());
    }

    console.log(`Found ${reviews.length} reviews for ${businessDetails.name}`);

    return new Response(
      JSON.stringify({
        business: businessDetails,
        reviews: reviews,
        debug: {
          searchResults: searchData.businesses?.length || 0,
          selectedBusiness: business.name,
          businessResponseOk: businessResponse.ok,
          reviewsResponseOk: reviewsResponse.ok
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in yelp-reviews function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});