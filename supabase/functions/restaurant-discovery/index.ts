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
    const { query, location, filters, searchType } = await req.json();
    
    console.log('Processing restaurant search:', { query, location, filters, searchType });

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

    // Build search query based on search type
    let searchQuery = '';
    
    if (searchType === 'name') {
      // For name searches, use exact restaurant name
      searchQuery = searchLocation ? 
        `"${query}" restaurant ${searchLocation}` : 
        `"${query}" restaurant`;
    } else if (searchType === 'cuisine') {
      // For cuisine searches, focus on cuisine type
      searchQuery = searchLocation ? 
        `${query} restaurants in ${searchLocation}` : 
        `best ${query} restaurants worldwide`;
    } else {
      // Default description/keyword search
      searchQuery = searchLocation ? 
        (cuisineType ? `${cuisineType} restaurants in ${searchLocation}` : `restaurants in ${searchLocation}`) :
        (cuisineType ? `best ${cuisineType} restaurants worldwide` : `best restaurants worldwide`);
    }
    
    console.log('Google Places search query:', searchQuery);

    // Build more specific search query for better results with enhanced relevance filtering
    let enhancedQuery = searchQuery;
    if (queryLower.includes('michelin')) {
      enhancedQuery = `michelin star ${searchQuery}`;
    } else if (queryLower.includes('fine dining')) {
      enhancedQuery = `fine dining ${searchQuery}`;
    } else if (queryLower.includes('celebrity chef')) {
      enhancedQuery = `celebrity chef ${searchQuery}`;
    } else if (queryLower.includes('james beard')) {
      enhancedQuery = `james beard award ${searchQuery}`;
    } else if (queryLower.includes('high end') || queryLower.includes('upscale')) {
      enhancedQuery = `upscale fine dining ${searchQuery}`;
    }

    // Search for restaurants using multiple strategies to get 100+ results
    let allResults: any[] = [];
    const maxResults = 120; // Target for 100+ results

    // Strategy 1: Text Search with pagination (up to 60 results)
    let nextPageToken: string | null = null;
    let pageCount = 0;
    const maxPages = 3; // Google officially supports up to 3 pages

    console.log('Starting Text Search strategy...');
    do {
      const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(enhancedQuery)}&type=restaurant&radius=500000&key=${googlePlacesApiKey}${nextPageToken ? `&pagetoken=${nextPageToken}` : ''}`;
      
      console.log(`Making Text Search request (page ${pageCount + 1})...`);
      
      const placesResponse = await fetch(placesUrl);
      
      if (!placesResponse.ok) {
        console.error('Google Places API HTTP error:', placesResponse.status, placesResponse.statusText);
        break;
      }
      
      const placesData = await placesResponse.json();
    
      console.log('Google Places API response status:', placesData.status);
      console.log('Found places on page:', placesData.results?.length || 0);

      if (placesData.status === 'REQUEST_DENIED' || placesData.status === 'OVER_QUERY_LIMIT') {
        console.error('Google Places API error:', placesData.status);
        break;
      }

      if (placesData.status !== 'OK' && placesData.status !== 'ZERO_RESULTS') {
        console.error('Google Places API error:', placesData.status, placesData.error_message);
        break;
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

    } while (nextPageToken && pageCount < maxPages && allResults.length < maxResults);

    // Strategy 2: Nearby Search if we have location and need more results
    if (allResults.length < maxResults && searchLocation) {
      console.log('Starting Nearby Search strategy...');
      
      // First geocode the location
      let lat, lng;
      try {
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchLocation)}&key=${googlePlacesApiKey}`;
        const geocodeResponse = await fetch(geocodeUrl);
        const geocodeData = await geocodeResponse.json();
        
        if (geocodeData.results && geocodeData.results.length > 0) {
          lat = geocodeData.results[0].geometry.location.lat;
          lng = geocodeData.results[0].geometry.location.lng;
          console.log(`Geocoded ${searchLocation} to ${lat}, ${lng}`);
        }
      } catch (error) {
        console.warn('Geocoding failed for nearby search:', error);
      }

      if (lat && lng) {
        // Use nearby search with different radius values to get more results
        const radiusValues = [10000, 25000, 50000]; // 10km, 25km, 50km
        
        for (const radius of radiusValues) {
          if (allResults.length >= maxResults) break;
          
          console.log(`Nearby search with ${radius}m radius...`);
          nextPageToken = null;
          pageCount = 0;
          
          do {
            const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=restaurant&key=${googlePlacesApiKey}${nextPageToken ? `&pagetoken=${nextPageToken}` : ''}`;
            
            const nearbyResponse = await fetch(nearbyUrl);
            if (!nearbyResponse.ok) break;
            
            const nearbyData = await nearbyResponse.json();
            if (nearbyData.status !== 'OK' && nearbyData.status !== 'ZERO_RESULTS') break;
            
            if (nearbyData.results && nearbyData.results.length > 0) {
              // Filter out duplicates based on place_id
              const existingIds = new Set(allResults.map(r => r.place_id));
              const newResults = nearbyData.results.filter(r => !existingIds.has(r.place_id));
              
              allResults.push(...newResults);
              console.log(`Added ${newResults.length} new nearby results. Total: ${allResults.length}`);
            }
            
            nextPageToken = nearbyData.next_page_token || null;
            pageCount++;
            
            if (nextPageToken && pageCount < maxPages && allResults.length < maxResults) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
          } while (nextPageToken && pageCount < maxPages && allResults.length < maxResults);
        }
      }
    }

    // Strategy 3: Additional query variations if still need more results
    if (allResults.length < maxResults && cuisineType) {
      console.log('Starting query variation strategy...');
      
      const queryVariations = [
        `top ${cuisineType} restaurants ${searchLocation}`,
        `best rated ${cuisineType} ${searchLocation}`,
        `popular ${cuisineType} dining ${searchLocation}`,
        `${cuisineType} food ${searchLocation}`
      ];
      
      for (const variation of queryVariations) {
        if (allResults.length >= maxResults) break;
        
        console.log(`Trying variation: ${variation}`);
        const variationUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(variation)}&type=restaurant&key=${googlePlacesApiKey}`;
        
        try {
          const variationResponse = await fetch(variationUrl);
          if (!variationResponse.ok) continue;
          
          const variationData = await variationResponse.json();
          if (variationData.status !== 'OK') continue;
          
          if (variationData.results && variationData.results.length > 0) {
            // Filter out duplicates
            const existingIds = new Set(allResults.map(r => r.place_id));
            const newResults = variationData.results.filter(r => !existingIds.has(r.place_id));
            
            allResults.push(...newResults.slice(0, 20)); // Limit to 20 per variation
            console.log(`Added ${newResults.length} results from variation. Total: ${allResults.length}`);
          }
        } catch (error) {
          console.warn(`Error with variation ${variation}:`, error);
        }
      }
    }

    console.log(`Final total results from all pages: ${allResults.length}`);

    if (!allResults || allResults.length === 0) {
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

    // Filter results based on search type for more precise matching
    if (searchType === 'name') {
      console.log(`Filtering ${allResults.length} results for exact name match: "${query}"`);
      console.log(`Sample results before filtering:`, allResults.slice(0, 3).map(r => r.name));
      
      // Split query into individual words and normalize them
      const searchWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 0);
      console.log(`Search words: [${searchWords.join(', ')}]`);
      
      // Filter results to only include restaurants that contain ALL search words in their name
      const filteredResults = allResults.filter(place => {
        const placeName = place.name.toLowerCase();
        const containsAllWords = searchWords.every(word => placeName.includes(word));
        
        console.log(`Checking "${place.name}": ${containsAllWords ? 'KEEP' : 'FILTER OUT'}`);
        
        return containsAllWords;
      });
      
      allResults = filteredResults;
      console.log(`After name filtering: ${allResults.length} results remain`);
      console.log(`Remaining results:`, allResults.map(r => r.name));
    }

    // Use all results from pagination - no artificial limits
    const finalResultsCount = allResults.length; // Use all available results from Google Places API
    
    console.log(`Processing ${finalResultsCount} restaurants for query: ${query}`);
    
    const restaurants: RestaurantSearchResult[] = [];
    
    // Process restaurants in smaller batches for faster initial response
    const batchSize = 5;
    const batches = [];
    for (let i = 0; i < finalResultsCount; i += batchSize) {
      batches.push(allResults.slice(i, Math.min(i + batchSize, finalResultsCount)));
    }
    
    // Process batches concurrently for speed
    for (const batch of batches) {
      const batchPromises = batch.map(async (place: any, batchIndex: number) => {
        try {
          const globalIndex = batches.indexOf(batch) * batchSize + batchIndex;
          console.log(`Processing place ${globalIndex + 1}: ${place.name}`);
          
          // Get detailed place information including hours
          let placeDetails = null;
          if (place.place_id && globalIndex < 50) { // Increase detail fetch limit
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
        
        // Extract city and format location properly
        const addressParts = (placeDetails?.formatted_address || place.formatted_address)?.split(', ') || [];
        let formattedLocation = 'Unknown Location';
        
        if (addressParts.length >= 2) {
          const country = addressParts[addressParts.length - 1] || '';
          
          if (country === 'USA' || country === 'United States') {
            // For US restaurants: City, State format (remove zip codes)
            const stateAndZip = addressParts[addressParts.length - 2] || '';
            const state = stateAndZip.replace(/\s+\d{5}(-\d{4})?$/, '').trim(); // Remove zip codes
            const city = addressParts[addressParts.length - 3] || addressParts[0] || '';
            formattedLocation = `${city}, ${state}`;
          } else {
            // For international restaurants: City, Country format
            // Handle districts by looking for major city names
            let city = addressParts[addressParts.length - 3] || addressParts[addressParts.length - 2] || addressParts[0] || '';
            
            // Map districts to main cities for better recognition
            const districtToCity: { [key: string]: string } = {
              "L'Eixample": "Barcelona",
              "Eixample": "Barcelona",
              "Sant Antoni": "Barcelona", 
              "El Born": "Barcelona",
              "Gothic Quarter": "Barcelona",
              "Gracia": "Barcelona",
              "Montmartre": "Paris",
              "Le Marais": "Paris",
              "Saint-Germain": "Paris",
              "Shibuya": "Tokyo",
              "Ginza": "Tokyo",
              "Shinjuku": "Tokyo",
              "Harajuku": "Tokyo",
              "SoHo": "New York",
              "Tribeca": "New York",
              "Chelsea": "London",
              "Mayfair": "London",
              "Covent Garden": "London"
            };
            
            // Check if the city is actually a district of a larger city
            if (districtToCity[city]) {
              city = districtToCity[city];
            }
            
            formattedLocation = `${city}, ${country}`;
          }
        }
        
        const city = addressParts.length >= 2 ? 
          addressParts[addressParts.length - 3] || addressParts[addressParts.length - 2] : 
          (searchLocation ? searchLocation.split(',')[0] : 'Unknown Location');
        const country = addressParts[addressParts.length - 1] || 'Unknown Country';
        
          // Get cuisine type using AI for more results to improve quality
          const cuisine = globalIndex < 25 ? await determineCuisineWithAI(
            place.name, 
            placeDetails?.formatted_address || place.formatted_address || '', 
            placeDetails?.types || place.types || []
          ) : mapPlaceTypeToCuisine(placeDetails?.types || place.types || [], place.name);
        
        // Map price level (Google uses 0-4, we use 1-4)
        const priceRange = (placeDetails?.price_level ?? place.price_level) ? 
          Math.min(Math.max(placeDetails?.price_level ?? place.price_level, 1), 4) : 2;
        
        // Format opening hours with full week information from Google Places API
        let openingHours = 'Call for hours';
        if (placeDetails?.opening_hours?.weekday_text && placeDetails.opening_hours.weekday_text.length > 0) {
          // Get full week hours from Google Places API
          openingHours = placeDetails.opening_hours.weekday_text.join('\n');
        } else if (place.opening_hours?.weekday_text && place.opening_hours.weekday_text.length > 0) {
          // Fallback to place data
          openingHours = place.opening_hours.weekday_text.join('\n');
        } else {
          // Only use open/closed status as absolute fallback when no hours are available
          openingHours = 'Call for hours';
        }
        
        // Remove Michelin star assignment - not reliable for automated detection
        let michelinStars = undefined;
        
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
              city: formattedLocation,
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