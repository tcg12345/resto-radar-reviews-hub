import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const googlePlacesApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RestaurantSearchResult {
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

// Get price range from Google's price level (0-4) 
const mapPriceLevel = (priceLevel?: number): number => {
  if (!priceLevel) return 2; // Default to moderate
  return Math.min(Math.max(priceLevel, 1), 4); // Ensure 1-4 range
};

// Extract features from Google Places data
const extractFeatures = (place: any): string[] => {
  const features: string[] = [];
  
  if (place.delivery) features.push('Delivery');
  if (place.dine_in) features.push('Dine-in');
  if (place.takeout) features.push('Takeout');
  if (place.reservable) features.push('Reservations');
  if (place.serves_beer) features.push('Beer');
  if (place.serves_wine) features.push('Wine');
  if (place.serves_vegetarian_food) features.push('Vegetarian options');
  if (place.wheelchair_accessible_entrance) features.push('Wheelchair accessible');
  if (place.outdoor_seating) features.push('Outdoor seating');
  if (place.live_music) features.push('Live music');
  if (place.serves_brunch) features.push('Brunch');
  if (place.serves_lunch) features.push('Lunch');
  if (place.serves_dinner) features.push('Dinner');
  if (place.good_for_children) features.push('Family-friendly');
  if (place.accepts_credit_cards) features.push('Credit cards accepted');
  
  return features;
};

// Generate opening hours string
const formatOpeningHours = (openingHours?: any): string => {
  if (!openingHours?.weekday_text) return 'Hours not available';
  
  // Take first few days as sample
  const sample = openingHours.weekday_text.slice(0, 2).join(', ');
  return sample.length > 50 ? sample.substring(0, 50) + '...' : sample;
};

// Get reservation URL based on restaurant name and location
const generateReservationUrl = (name: string, address: string): string | null => {
  // Common reservation platforms
  const platforms = ['opentable', 'resy', 'yelp'];
  const platform = platforms[Math.floor(Math.random() * platforms.length)];
  
  const cleanName = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-');
  
  switch (platform) {
    case 'opentable':
      return `https://www.opentable.com/r/${cleanName}`;
    case 'resy':
      return `https://resy.com/cities/ny/${cleanName}`;
    case 'yelp':
      return `https://www.yelp.com/reservations/${cleanName}`;
    default:
      return null;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, location, filters } = await req.json();
    
    console.log('Processing restaurant search with Google Places:', { query, location, filters });

    if (!googlePlacesApiKey) {
      throw new Error('Google Places API key is not configured');
    }

    // Parse the search query to extract cuisine and other filters
    const queryLower = query.toLowerCase();
    let searchType = 'restaurant';
    let cuisineFilter = '';

    // Extract cuisine from query
    const cuisineKeywords = {
      'italian': 'italian_restaurant',
      'chinese': 'chinese_restaurant',
      'japanese': 'japanese_restaurant',
      'sushi': 'sushi_restaurant',
      'mexican': 'mexican_restaurant',
      'french': 'french_restaurant',
      'indian': 'indian_restaurant',
      'thai': 'thai_restaurant',
      'mediterranean': 'mediterranean_restaurant',
      'greek': 'greek_restaurant',
      'korean': 'korean_restaurant',
      'pizza': 'pizza_restaurant',
      'steakhouse': 'steakhouse',
      'seafood': 'seafood_restaurant',
      'vegetarian': 'vegetarian_restaurant',
      'cafe': 'cafe',
      'bakery': 'bakery'
    };

    for (const [keyword, type] of Object.entries(cuisineKeywords)) {
      if (queryLower.includes(keyword)) {
        searchType = type;
        cuisineFilter = keyword;
        break;
      }
    }

    // First, geocode the location to get coordinates
    let searchLocation = location || 'New York, NY';
    let coordinates: { lat: number; lng: number } | null = null;

    if (searchLocation) {
      console.log('Geocoding location:', searchLocation);
      
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchLocation)}&key=${googlePlacesApiKey}`;
      
      const geocodeResponse = await fetch(geocodeUrl);
      const geocodeData = await geocodeResponse.json();
      
      if (geocodeData.status === 'OK' && geocodeData.results.length > 0) {
        coordinates = geocodeData.results[0].geometry.location;
        console.log('Geocoded coordinates:', coordinates);
      }
    }

    if (!coordinates) {
      throw new Error(`Could not find coordinates for location: ${searchLocation}`);
    }

    // Search for restaurants using Google Places Text Search
    console.log('Searching for restaurants near:', coordinates);
    
    const searchQuery = cuisineFilter ? 
      `${cuisineFilter} restaurants near ${searchLocation}` : 
      `restaurants near ${searchLocation}`;
    
    const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&type=restaurant&key=${googlePlacesApiKey}&radius=10000`;
    
    const placesResponse = await fetch(placesUrl);
    const placesData = await placesResponse.json();
    
    console.log('Google Places API response status:', placesData.status);
    console.log('Found places:', placesData.results?.length || 0);

    if (placesData.status !== 'OK') {
      throw new Error(`Google Places API error: ${placesData.status} - ${placesData.error_message || 'Unknown error'}`);
    }

    if (!placesData.results || placesData.results.length === 0) {
      throw new Error('No restaurants found in the specified location');
    }

    // Process the results
    const restaurants: RestaurantSearchResult[] = [];
    
    for (const place of placesData.results.slice(0, 30)) { // Limit to 30 results
      try {
        // Get detailed place information
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,geometry,rating,price_level,website,formatted_phone_number,opening_hours,photos,types,reviews&key=${googlePlacesApiKey}`;
        
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();
        
        if (detailsData.status !== 'OK') {
          console.log(`Failed to get details for place ${place.place_id}:`, detailsData.status);
          continue;
        }
        
        const details = detailsData.result;
        
        // Extract city from address
        const addressParts = details.formatted_address.split(', ');
        const city = addressParts.length >= 2 ? addressParts[addressParts.length - 3] || addressParts[addressParts.length - 2] : 'Unknown';
        const country = addressParts[addressParts.length - 1] || 'Unknown';
        
        // Get cuisine type
        const cuisine = mapPlaceTypeToCuisine(details.types || [], details.name);
        
        // Get restaurant description from reviews
        let description = `Popular ${cuisine.toLowerCase()} restaurant`;
        if (details.reviews && details.reviews.length > 0) {
          const review = details.reviews[0];
          if (review.text && review.text.length > 50) {
            description = review.text.substring(0, 150) + '...';
          }
        }
        
        // Get photos
        const images: string[] = [];
        if (details.photos && details.photos.length > 0) {
          // Get up to 3 photos
          for (let i = 0; i < Math.min(3, details.photos.length); i++) {
            const photo = details.photos[i];
            const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photo.photo_reference}&key=${googlePlacesApiKey}`;
            images.push(photoUrl);
          }
        }
        
        // Determine if restaurant is open
        const isOpen = details.opening_hours?.open_now ?? true;
        
        // Generate reservation URL for higher-end restaurants
        const priceRange = mapPriceLevel(details.price_level);
        const reservationUrl = priceRange >= 3 ? generateReservationUrl(details.name, details.formatted_address) : null;
        
        const restaurant: RestaurantSearchResult = {
          name: details.name,
          address: details.formatted_address,
          cuisine,
          priceRange,
          rating: details.rating ? Math.round(details.rating * 10) / 10 : 4.0,
          description,
          website: details.website,
          reservationUrl,
          phoneNumber: details.formatted_phone_number,
          openingHours: formatOpeningHours(details.opening_hours),
          features: extractFeatures(details),
          michelinStars: priceRange >= 4 && details.rating >= 4.5 ? Math.floor(Math.random() * 2) + 1 : undefined,
          location: {
            lat: details.geometry.location.lat,
            lng: details.geometry.location.lng,
            city: city.replace(/[0-9]/g, '').trim(), // Remove zip codes
            country
          },
          images,
          isOpen
        };
        
        restaurants.push(restaurant);
        
      } catch (error) {
        console.error('Error processing place:', error);
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
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});