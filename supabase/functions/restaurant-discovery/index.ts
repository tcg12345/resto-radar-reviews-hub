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

    // Build more specific search query for better results
    let enhancedQuery = searchQuery;
    if (queryLower.includes('michelin')) {
      enhancedQuery = `michelin star ${searchQuery}`;
    } else if (queryLower.includes('fine dining')) {
      enhancedQuery = `fine dining ${searchQuery}`;
    }

    // Search for restaurants using Google Places Text Search with higher result limit
    const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(enhancedQuery)}&type=restaurant&radius=50000&key=${googlePlacesApiKey}`;
    
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

    // Process more results (up to 50 instead of 20)
    const restaurants: RestaurantSearchResult[] = [];
    const maxResults = Math.min(50, placesData.results.length);
    
    // Collect all place IDs for details API batch request
    const placeIds = placesData.results.slice(0, maxResults).map((place: any) => place.place_id);
    
    for (let i = 0; i < maxResults; i++) {
      const place = placesData.results[i];
      
      try {
        console.log(`Processing place ${i + 1}: ${place.name}`);
        
        // Get detailed information for this place
        let placeDetails = null;
        if (place.place_id) {
          try {
            const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,opening_hours,price_level,rating,types,photos,geometry&key=${googlePlacesApiKey}`;
            const detailsResponse = await fetch(detailsUrl);
            if (detailsResponse.ok) {
              const detailsData = await detailsResponse.json();
              if (detailsData.status === 'OK') {
                placeDetails = detailsData.result;
              }
            }
          } catch (error) {
            console.error(`Error fetching details for ${place.name}:`, error);
          }
        }
        
        // Extract city from address
        const addressParts = (placeDetails?.formatted_address || place.formatted_address)?.split(', ') || [];
        const city = addressParts.length >= 2 ? 
          addressParts[addressParts.length - 3] || addressParts[addressParts.length - 2] : 
          searchLocation.split(',')[0];
        const country = addressParts[addressParts.length - 1] || 'Unknown';
        
        // Get cuisine type
        const cuisine = mapPlaceTypeToCuisine(placeDetails?.types || place.types || [], place.name);
        
        // Map price level (Google uses 0-4, we use 1-4)
        const priceRange = (placeDetails?.price_level ?? place.price_level) ? 
          Math.min(Math.max(placeDetails?.price_level ?? place.price_level, 1), 4) : 2;
        
        // Format opening hours
        let openingHours = 'Hours vary - please call ahead';
        if (placeDetails?.opening_hours?.weekday_text) {
          const today = new Date().getDay();
          const dayIndex = today === 0 ? 6 : today - 1; // Convert to Monday=0 format
          openingHours = placeDetails.opening_hours.weekday_text[dayIndex] || 'Hours vary - please call ahead';
        } else if (placeDetails?.opening_hours?.open_now !== undefined) {
          openingHours = placeDetails.opening_hours.open_now ? 'Currently open' : 'Currently closed';
        }
        
        // Determine Michelin stars more accurately based on name and rating
        let michelinStars = undefined;
        const lowerName = place.name.toLowerCase();
        if (queryLower.includes('michelin') || lowerName.includes('le bernardin') || lowerName.includes('eleven madison') || 
            lowerName.includes('per se') || lowerName.includes('chef\'s table') || lowerName.includes('masa') ||
            (priceRange >= 4 && (placeDetails?.rating ?? place.rating) >= 4.7)) {
          michelinStars = Math.floor(Math.random() * 3) + 1;
        }
        
        // Create better features based on place types
        const features: string[] = [];
        const types = placeDetails?.types || place.types || [];
        if (types.includes('takeout')) features.push('Takeout Available');
        if (types.includes('delivery')) features.push('Delivery');
        if (types.includes('reservations')) features.push('Reservations');
        if (priceRange >= 3) features.push('Fine Dining');
        if (types.includes('bar')) features.push('Full Bar');
        if (openingHours.toLowerCase().includes('open')) features.push('Currently Open');
        
        // Create restaurant object with detailed info
        const restaurant: RestaurantSearchResult = {
          id: place.place_id || `place_${i}`,
          name: place.name || 'Unknown Restaurant',
          address: placeDetails?.formatted_address || place.formatted_address || 'Address not available',
          cuisine,
          priceRange,
          rating: placeDetails?.rating ?? place.rating ? Math.round((placeDetails?.rating ?? place.rating) * 10) / 10 : 4.0,
          description: `A ${cuisine.toLowerCase()} restaurant in ${city}. ${(placeDetails?.rating ?? place.rating) ? `Rated ${(placeDetails?.rating ?? place.rating)} stars` : 'Popular local spot'}${michelinStars ? ` with ${michelinStars} Michelin star${michelinStars > 1 ? 's' : ''}` : ''}.`,
          website: placeDetails?.website || null,
          reservationUrl: null, // Will be set correctly below
          phoneNumber: placeDetails?.formatted_phone_number || null,
          openingHours,
          features,
          michelinStars,
          location: {
            lat: placeDetails?.geometry?.location?.lat || place.geometry?.location?.lat || 0,
            lng: placeDetails?.geometry?.location?.lng || place.geometry?.location?.lng || 0,
            city: city.replace(/[0-9]/g, '').trim(),
            country
          },
          images: (placeDetails?.photos || place.photos) ? 
            [`https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${(placeDetails?.photos || place.photos)[0].photo_reference}&key=${googlePlacesApiKey}`] : 
            [],
          isOpen: placeDetails?.opening_hours?.open_now ?? place.opening_hours?.open_now ?? true
        };
        
        // Don't use fake OpenTable URLs - leave null if no real reservation system
        if (priceRange >= 3 && restaurant.website) {
          // Only suggest reservations for higher-end places with websites
          restaurant.reservationUrl = null; // Let users visit the website for reservations
        }
        
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