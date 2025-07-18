import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
  location: {
    lat: number;
    lng: number;
    city: string;
    country: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, location, filters } = await req.json();
    
    console.log('Processing restaurant search:', { query, location, filters });

    // Use OpenAI to understand the search intent and generate restaurant data
    const systemPrompt = `You are a restaurant discovery AI assistant. Based on the user's natural language query, you should understand their preferences and generate realistic restaurant recommendations.

Consider these factors:
- Cuisine preferences
- Price range (1-4, where 1 is $ and 4 is $$$$)
- Location/city preferences
- Dietary restrictions
- Ambiance preferences (casual, fine dining, family-friendly, etc.)
- Special occasions or requirements

Generate 6-8 diverse restaurant recommendations that match the query. For each restaurant, provide realistic details including:
- Name (creative but believable)
- Address (realistic for the requested location)
- Cuisine type
- Price range (1-4)
- Rating (3.5-5.0 range)
- Description (2-3 sentences)
- Features array (e.g., "Outdoor seating", "Vegetarian options", "Wine bar", etc.)
- Realistic coordinates for the location
- Phone number format appropriate for the country
- Opening hours
- Website URL (realistic domain)
- Reservation URL when applicable

Return ONLY a valid JSON array of restaurant objects. No other text.`;

    const userPrompt = `Find restaurants based on this request: "${query}"
    ${location ? `Location: ${location}` : ''}
    ${filters ? `Additional filters: ${JSON.stringify(filters)}` : ''}
    
    Generate realistic restaurant recommendations that match this request.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let restaurants: RestaurantSearchResult[];

    try {
      restaurants = JSON.parse(data.choices[0].message.content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', data.choices[0].message.content);
      // Fallback with sample data
      restaurants = [
        {
          name: "Sample Restaurant",
          address: "123 Main St, " + (location || "New York, NY"),
          cuisine: "International",
          priceRange: 2,
          rating: 4.2,
          description: "A wonderful dining experience with fresh ingredients and creative dishes.",
          website: "https://example-restaurant.com",
          phoneNumber: "+1 (555) 123-4567",
          openingHours: "Mon-Sun: 5:00 PM - 10:00 PM",
          features: ["Outdoor seating", "Wine selection", "Vegetarian options"],
          location: {
            lat: 40.7128,
            lng: -74.0060,
            city: location?.split(',')[0] || "New York",
            country: "United States"
          }
        }
      ];
    }

    // Enhance results with additional features
    const enhancedRestaurants = restaurants.map((restaurant: any) => ({
      ...restaurant,
      id: crypto.randomUUID(),
      reservationUrl: restaurant.reservationUrl || `https://opentable.com/search?query=${encodeURIComponent(restaurant.name)}`,
      images: [
        `https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop`,
        `https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop`,
        `https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=400&h=300&fit=crop`
      ].slice(0, Math.floor(Math.random() * 3) + 1),
      isOpen: Math.random() > 0.3, // 70% chance of being open
      nextAvailableSlot: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    }));

    console.log('Generated restaurant recommendations:', enhancedRestaurants.length);

    return new Response(JSON.stringify({
      restaurants: enhancedRestaurants,
      searchQuery: query,
      location: location,
      totalResults: enhancedRestaurants.length
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