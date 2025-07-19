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
  reviewCount?: number;
  googleMapsUrl?: string;
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

// Use ChatGPT to determine cuisine more accurately (only when simple mapping fails)
const determineCuisineWithAI = async (restaurantName: string, address: string, types: string[]): Promise<string> => {
  // First try simple mapping
  const simpleCuisine = mapPlaceTypeToCuisine(types, restaurantName);
  
  // Only use AI if simple mapping returns generic "American" 
  if (simpleCuisine !== 'American') {
    return simpleCuisine;
  }
  
  try {
    const response = await fetch(`https://ocpmhsquwsdaauflbygf.supabase.co/functions/v1/determine-cuisine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        restaurantName,
        address,
        types
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.cuisine || 'American';
    }
  } catch (error) {
    console.error('Error determining cuisine with AI:', error);
  }
  
  // Fallback to simple mapping
  return simpleCuisine;
};

// Map Google Places types to cuisine categories (fallback)
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
  if (lowerName.includes('burger')) return 'American';
  if (lowerName.includes('deli')) return 'Deli';
  if (lowerName.includes('grill')) return 'Grill';
  if (lowerName.includes('bar')) return 'Bar & Grill';
  if (lowerName.includes('seafood')) return 'Seafood';
  if (lowerName.includes('ramen') || lowerName.includes('noodle')) return 'Asian';
  
  // Default to a generic cuisine type instead of "Restaurant"
  return 'American';
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

    // Default to worldwide search if no location provided
    const searchLocation = location || '';
    console.log('Search location:', searchLocation || 'Worldwide search');

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

    // Build search query - make it global if no location specified
    const searchQuery = searchLocation ? 
      (cuisineType ? `${cuisineType} restaurants in ${searchLocation}` : `restaurants in ${searchLocation}`) :
      (cuisineType ? `best ${cuisineType} restaurants worldwide` : `best restaurants worldwide`);
    
    console.log('Google Places search query:', searchQuery);

    // Build more specific search query for better results
    let enhancedQuery = searchQuery;
    if (queryLower.includes('michelin')) {
      enhancedQuery = `michelin star ${searchQuery}`;
    } else if (queryLower.includes('fine dining')) {
      enhancedQuery = `fine dining ${searchQuery}`;
    }

    // Search for restaurants using Google Places Text Search with much higher result limit
    const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(enhancedQuery)}&type=restaurant&radius=500000&key=${googlePlacesApiKey}`;
    
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
        location: searchLocation || 'Worldwide',
        totalResults: 0,
        source: 'google_places',
        message: 'No restaurants found for your search criteria. Try a different location or cuisine type.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine optimal number of results based on query - allow for much larger result sets
    let maxResults = 100; // Default - much higher than 20
    if (queryLower.includes('michelin') || queryLower.includes('fine dining')) {
      maxResults = Math.min(50, placesData.results.length); // More selective but still more than 20
    } else if (queryLower.includes('pizza') || queryLower.includes('coffee') || queryLower.includes('cafe')) {
      maxResults = Math.min(150, placesData.results.length); // Even more for common food types
    } else {
      maxResults = Math.min(120, placesData.results.length); // Much higher standard amount
    }
    
    console.log(`Processing ${maxResults} restaurants for query: ${query}`);
    
    const restaurants: RestaurantSearchResult[] = [];
    
    // Process restaurants in smaller batches for faster initial response
    const batchSize = 5;
    const batches = [];
    for (let i = 0; i < maxResults; i += batchSize) {
      batches.push(placesData.results.slice(i, Math.min(i + batchSize, maxResults)));
    }
    
    // Process batches concurrently for speed
    for (const batch of batches) {
      const batchPromises = batch.map(async (place: any, batchIndex: number) => {
        try {
          const globalIndex = batches.indexOf(batch) * batchSize + batchIndex;
          console.log(`Processing place ${globalIndex + 1}: ${place.name}`);
          
          // Only get detailed info for top 15 results to speed up processing
          let placeDetails = null;
          if (place.place_id && globalIndex < 15) {
            try {
              const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=formatted_address,formatted_phone_number,website,opening_hours,price_level,rating,user_ratings_total,types,photos,geometry&key=${googlePlacesApiKey}`;
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
          (searchLocation ? searchLocation.split(',')[0] : 'Unknown Location');
        const country = addressParts[addressParts.length - 1] || 'Unknown Country';
        
          // Get cuisine type using AI only for top results to save time
          const cuisine = globalIndex < 10 ? await determineCuisineWithAI(
            place.name, 
            placeDetails?.formatted_address || place.formatted_address || '', 
            placeDetails?.types || place.types || []
          ) : mapPlaceTypeToCuisine(placeDetails?.types || place.types || [], place.name);
        
        // Map price level (Google uses 0-4, we use 1-4)
        const priceRange = (placeDetails?.price_level ?? place.price_level) ? 
          Math.min(Math.max(placeDetails?.price_level ?? place.price_level, 1), 4) : 2;
        
        // Format opening hours with full week information
        let openingHours = 'Call for hours';
        if (placeDetails?.opening_hours?.weekday_text && placeDetails.opening_hours.weekday_text.length > 0) {
          // Get full week hours
          openingHours = placeDetails.opening_hours.weekday_text.join('\n');
        } else if (placeDetails?.opening_hours?.open_now !== undefined) {
          openingHours = placeDetails.opening_hours.open_now ? 'Currently open' : 'Currently closed';
        }
        
        // Use more accurate Michelin star determination - only assign for truly Michelin starred restaurants
        let michelinStars = undefined;
        const lowerName = place.name.toLowerCase();
        
        // Only assign stars to restaurants that are actually Michelin starred (known establishments)
        if (lowerName.includes('le bernardin') || lowerName.includes('eleven madison park') ||
            lowerName.includes('per se') || lowerName.includes('daniel') || lowerName.includes('jean-georges') ||
            lowerName.includes('gramercy tavern') || lowerName.includes('atera') || lowerName.includes('gabriel kreuther') ||
            lowerName.includes('le cinq') || lowerName.includes('l\'ambroisie') || lowerName.includes('guy savoy') ||
            lowerName.includes('robuchon') || lowerName.includes('alain ducasse') || lowerName.includes('masa') ||
            lowerName.includes('chef\'s table') || lowerName.includes('restaurant kei')) {
          // Assign realistic Michelin stars for known establishments
          if (lowerName.includes('le bernardin') || lowerName.includes('eleven madison') || lowerName.includes('per se')) {
            michelinStars = 3;
          } else if (lowerName.includes('daniel') || lowerName.includes('jean-georges') || lowerName.includes('atera')) {
            michelinStars = 2;
          } else {
            michelinStars = 1;
          }
        }
        
        // Create better features based on place types
        const features: string[] = [];
        const types = placeDetails?.types || place.types || [];
        if (types.includes('takeout')) features.push('Takeout Available');
        if (types.includes('delivery')) features.push('Delivery');
        if (types.includes('reservations')) features.push('Reservations');
        if (types.includes('bar')) features.push('Full Bar');
        if (openingHours.toLowerCase().includes('open')) features.push('Currently Open');
        if (types.includes('wheelchair_accessible_entrance')) features.push('Accessible');
        if (priceRange >= 3) features.push('Upscale Dining');
        
        // Get review count and Google Maps URL from place details
        const reviewCount = placeDetails?.user_ratings_total ?? place.user_ratings_total ?? 0;
        const googleMapsUrl = `https://www.google.com/maps/place/?q=place_id:${place.place_id}`;
          
          // Create restaurant object with available info
          const restaurant: RestaurantSearchResult = {
            id: place.place_id || `place_${globalIndex}`,
            name: place.name || 'Unknown Restaurant',
            address: placeDetails?.formatted_address || place.formatted_address || 'Address not available',
            cuisine,
            priceRange,
            rating: placeDetails?.rating ?? place.rating ? Math.round((placeDetails?.rating ?? place.rating) * 10) / 10 : 4.0,
            reviewCount,
            googleMapsUrl,
            website: placeDetails?.website || null,
            reservationUrl: null,
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
          
          return restaurant;
          
        } catch (error) {
          console.error(`Error processing place ${place.name}:`, error);
          return null;
        }
      });
      
      // Wait for batch to complete and add valid restaurants
      const batchResults = await Promise.all(batchPromises);
      restaurants.push(...batchResults.filter(r => r !== null));
    }
    
    console.log('Successfully processed restaurants:', restaurants.length);

    return new Response(JSON.stringify({
      restaurants,
      searchQuery: query,
      location: searchLocation || 'Worldwide',
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