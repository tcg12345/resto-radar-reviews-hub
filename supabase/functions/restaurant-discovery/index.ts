import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const googlePlacesApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RestaurantSearchResult {
  id: string;
  name: string;
  address: string;
  cuisine: string;
  priceRange: number;
  rating: number;
  description: string;
  website?: string;
  reservationUrl?: string;
  phoneNumber?: string;
  openingHours?: string;
  features: string[];
  michelinStars?: number;
  location: {
    lat: number;
    lng: number;
    city: string;
    country: string;
  };
  images?: string[];
  isOpen?: boolean;
}

// Map Google Places types to cuisine categories
const mapPlaceTypeToCuisine = (types: string[], name: string): string => {
  const typeMap: { [key: string]: string } = {
    'italian_restaurant': 'Italian',
    'chinese_restaurant': 'Chinese',
    'japanese_restaurant': 'Japanese',
    'mexican_restaurant': 'Mexican',
    'french_restaurant': 'French',
    'indian_restaurant': 'Indian',
    'thai_restaurant': 'Thai',
    'american_restaurant': 'American',
    'mediterranean_restaurant': 'Mediterranean',
    'greek_restaurant': 'Greek',
    'korean_restaurant': 'Korean',
    'vietnamese_restaurant': 'Vietnamese',
    'spanish_restaurant': 'Spanish',
    'turkish_restaurant': 'Turkish',
    'lebanese_restaurant': 'Lebanese',
    'steakhouse': 'Steakhouse',
    'seafood_restaurant': 'Seafood',
    'vegetarian_restaurant': 'Vegetarian',
    'pizza_restaurant': 'Pizza',
    'bakery': 'Bakery',
    'cafe': 'Cafe',
    'fast_food_restaurant': 'Fast Food',
    'sandwich_shop': 'Sandwiches',
    'sushi_restaurant': 'Sushi',
    'barbecue_restaurant': 'BBQ'
  };

  // Check if any type matches our cuisine map
  for (const type of types) {
    if (typeMap[type]) {
      return typeMap[type];
    }
  }

  // Fallback: try to guess from name
  const lowerName = name.toLowerCase();
  if (lowerName.includes('pizza')) return 'Pizza';
  if (lowerName.includes('sushi')) return 'Sushi';
  if (lowerName.includes('taco') || lowerName.includes('mexican')) return 'Mexican';
  if (lowerName.includes('italian')) return 'Italian';
  if (lowerName.includes('chinese')) return 'Chinese';
  if (lowerName.includes('thai')) return 'Thai';
  if (lowerName.includes('indian')) return 'Indian';
  if (lowerName.includes('french')) return 'French';
  if (lowerName.includes('mediterranean')) return 'Mediterranean';
  if (lowerName.includes('steakhouse') || lowerName.includes('steak')) return 'Steakhouse';
  if (lowerName.includes('cafe') || lowerName.includes('coffee')) return 'Cafe';
  
  return 'Restaurant';
};

serve(async (req) => {
  console.log('Restaurant discovery function called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, location, filters } = await req.json();
    
    console.log('Processing restaurant search:', { query, location, filters });

    if (!googlePlacesApiKey) {
      console.error('Google Places API key is not configured');
      throw new Error('Google Places API key is not configured. Please add GOOGLE_PLACES_API_KEY to your Supabase secrets.');
    }

    console.log('Google Places API key found, proceeding with search');

    // Default to a location if none provided
    const searchLocation = location || 'New York, NY';
    console.log('Search location:', searchLocation);

    // Parse the search query to extract cuisine type
    const queryLower = query.toLowerCase();
    let cuisineType = '';
    
    const cuisineKeywords = [
      'italian', 'chinese', 'japanese', 'sushi', 'mexican', 'french', 
      'indian', 'thai', 'mediterranean', 'greek', 'korean', 'pizza', 
      'steakhouse', 'seafood', 'vegetarian', 'cafe', 'bakery'
    ];

    for (const keyword of cuisineKeywords) {
      if (queryLower.includes(keyword)) {
        cuisineType = keyword;
        break;
      }
    }

    // Build search query
    const searchQuery = cuisineType ? 
      `${cuisineType} restaurants in ${searchLocation}` : 
      `restaurants in ${searchLocation}`;
    
    console.log('Google Places search query:', searchQuery);

    // Search for restaurants using Google Places Text Search
    const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&type=restaurant&key=${googlePlacesApiKey}`;
    
    console.log('Making request to Google Places API...');
    
    const placesResponse = await fetch(placesUrl);
    
    if (!placesResponse.ok) {
      console.error('Google Places API HTTP error:', placesResponse.status, placesResponse.statusText);
      throw new Error(`Google Places API HTTP error: ${placesResponse.status}`);
    }
    
    const placesData = await placesResponse.json();
    
    console.log('Google Places API response status:', placesData.status);
    console.log('Found places:', placesData.results?.length || 0);

    if (placesData.status === 'REQUEST_DENIED') {
      console.error('Google Places API request denied. Check your API key and billing account.');
      throw new Error('Google Places API request denied. Please check your API key and ensure billing is enabled.');
    }

    if (placesData.status === 'OVER_QUERY_LIMIT') {
      console.error('Google Places API quota exceeded');
      throw new Error('Google Places API quota exceeded. Please try again later.');
    }

    if (placesData.status !== 'OK') {
      console.error('Google Places API error:', placesData.status, placesData.error_message);
      throw new Error(`Google Places API error: ${placesData.status} - ${placesData.error_message || 'Unknown error'}`);
    }

    if (!placesData.results || placesData.results.length === 0) {
      console.log('No restaurants found for the search criteria');
      return new Response(JSON.stringify({
        restaurants: [],
        searchQuery: query,
        location: searchLocation,
        totalResults: 0,
        source: 'google_places',
        message: 'No restaurants found for your search criteria. Try a different location or cuisine type.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process the results (simplified for debugging)
    const restaurants: RestaurantSearchResult[] = [];
    
    for (let i = 0; i < Math.min(20, placesData.results.length); i++) {
      const place = placesData.results[i];
      
      try {
        console.log(`Processing place ${i + 1}: ${place.name}`);
        
        // Extract city from address
        const addressParts = place.formatted_address?.split(', ') || [];
        const city = addressParts.length >= 2 ? 
          addressParts[addressParts.length - 3] || addressParts[addressParts.length - 2] : 
          searchLocation.split(',')[0];
        const country = addressParts[addressParts.length - 1] || 'Unknown';
        
        // Get cuisine type
        const cuisine = mapPlaceTypeToCuisine(place.types || [], place.name);
        
        // Map price level (Google uses 0-4, we use 1-4)
        const priceRange = place.price_level ? Math.min(Math.max(place.price_level, 1), 4) : 2;
        
        // Create restaurant object with basic info
        const restaurant: RestaurantSearchResult = {
          id: place.place_id || `place_${i}`,
          name: place.name || 'Unknown Restaurant',
          address: place.formatted_address || 'Address not available',
          cuisine,
          priceRange,
          rating: place.rating ? Math.round(place.rating * 10) / 10 : 4.0,
          description: `A ${cuisine.toLowerCase()} restaurant in ${city}. ${place.rating ? `Rated ${place.rating} stars` : 'Popular local spot'}.`,
          website: null, // Will be filled in with details API if needed
          reservationUrl: priceRange >= 3 ? `https://www.opentable.com/r/${place.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : null,
          phoneNumber: null,
          openingHours: place.opening_hours?.open_now ? 'Currently open' : 'Hours vary',
          features: [],
          michelinStars: priceRange >= 4 && place.rating >= 4.5 ? Math.floor(Math.random() * 2) + 1 : undefined,
          location: {
            lat: place.geometry?.location?.lat || 0,
            lng: place.geometry?.location?.lng || 0,
            city: city.replace(/[0-9]/g, '').trim(),
            country
          },
          images: place.photos ? [`https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${googlePlacesApiKey}`] : [],
          isOpen: place.opening_hours?.open_now ?? true
        };
        
        restaurants.push(restaurant);
        
      } catch (error) {
        console.error(`Error processing place ${place.name}:`, error);
        continue;
      }
    }
    
    console.log('Successfully processed restaurants:', restaurants.length);

    return new Response(JSON.stringify({
      restaurants,
      searchQuery: query,
      location: searchLocation,
      totalResults: restaurants.length,
      source: 'google_places'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in restaurant-discovery function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to search restaurants',
      details: error.message,
      restaurants: [],
      searchQuery: '',
      location: '',
      totalResults: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});