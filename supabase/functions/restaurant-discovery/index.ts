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

    if (!openAIApiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    // Use OpenAI to understand the search intent and generate restaurant data
    const systemPrompt = `You are a restaurant discovery AI assistant. Based on the user's natural language query, you should understand their preferences and generate realistic restaurant recommendations.

Consider these factors:
- Cuisine preferences
- Price range (1-4, where 1 is $ and 4 is $$$$)
- Location/city preferences
- Dietary restrictions
- Ambiance preferences (casual, fine dining, family-friendly, etc.)
- Special occasions or requirements

Generate 8-12 diverse, realistic restaurant recommendations that match the query. For each restaurant, provide accurate details including:
- Name (use real restaurant names when possible, or realistic sounding names)
- Address (realistic for the requested location)
- Cuisine type
- Price range (1-4)
- Rating (3.8-4.8 range)
- Description (2-3 sentences about what makes it special)
- Features array (e.g., "Outdoor seating", "Vegetarian options", "Wine bar", "Private dining", etc.)
- Realistic coordinates for the location
- Phone number format appropriate for the country
- Opening hours (realistic format)
- Website URL (realistic domain)
- Reservation URL when applicable

IMPORTANT: Return ONLY a valid JSON array of restaurant objects. No markdown, no text, just pure JSON.`;

    const userPrompt = `Find restaurants based on this request: "${query}"
    ${location ? `Location: ${location}` : 'Location: Global (suggest diverse locations)'}
    ${filters && Object.keys(filters).length > 0 ? `Additional filters: ${JSON.stringify(filters)}` : ''}
    
    Generate diverse, realistic restaurant recommendations that match this request. Include restaurants from major cities if no specific location is mentioned.`;

    console.log('Making OpenAI API call...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 4000,
      }),
    });

    console.log('OpenAI response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('OpenAI response received, parsing...');
    
    let restaurants: RestaurantSearchResult[];

    try {
      const content = data.choices[0].message.content;
      console.log('Raw AI response:', content);
      
      // Clean the response - remove any markdown formatting
      const cleanContent = content.replace(/```json\s*|\s*```/g, '').trim();
      console.log('Cleaned response:', cleanContent);
      
      restaurants = JSON.parse(cleanContent);
      console.log('Successfully parsed restaurants:', restaurants.length);
      
      // Validate the parsed data
      if (!Array.isArray(restaurants) || restaurants.length === 0) {
        throw new Error('Invalid response format: expected non-empty array');
      }
      
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Response content:', data.choices[0].message.content);
      
      // Enhanced fallback with more diverse sample data
      const locationToUse = location || 'New York';
      restaurants = [
        {
          name: "The Modern",
          address: "9 W 53rd St, New York, NY 10019",
          cuisine: "Contemporary American",
          priceRange: 4,
          rating: 4.5,
          description: "Michelin-starred contemporary American restaurant overlooking MoMA's sculpture garden with innovative seasonal dishes.",
          website: "https://themodernnyc.com",
          phoneNumber: "+1 (212) 333-1220",
          openingHours: "Mon-Sat: 5:30 PM - 10:00 PM",
          features: ["Michelin Star", "Fine Dining", "Wine Selection", "Art Views"],
          location: {
            lat: 40.7614,
            lng: -73.9776,
            city: locationToUse.split(',')[0] || "New York",
            country: "United States"
          }
        },
        {
          name: "Gramercy Tavern",
          address: "42 E 20th St, New York, NY 10003",
          cuisine: "American",
          priceRange: 3,
          rating: 4.4,
          description: "Beloved neighborhood restaurant serving seasonal American cuisine in a rustic, welcoming atmosphere.",
          website: "https://gramercytavern.com",
          phoneNumber: "+1 (212) 477-0777",
          openingHours: "Daily: 5:00 PM - 10:00 PM",
          features: ["Farm-to-table", "Wine Bar", "Private Dining"],
          location: {
            lat: 40.7382,
            lng: -73.9884,
            city: locationToUse.split(',')[0] || "New York",
            country: "United States"
          }
        },
        {
          name: "Joe's Pizza",
          address: "7 Carmine St, New York, NY 10014",
          cuisine: "Pizza",
          priceRange: 1,
          rating: 4.2,
          description: "Classic New York pizza joint serving thin-crust slices since 1975. A true Greenwich Village institution.",
          website: "https://joespizzanyc.com",
          phoneNumber: "+1 (212) 366-1182",
          openingHours: "Daily: 10:00 AM - 4:00 AM",
          features: ["Late Night", "Takeout", "Quick Service"],
          location: {
            lat: 40.7308,
            lng: -74.0034,
            city: locationToUse.split(',')[0] || "New York",
            country: "United States"
          }
        }
      ];
    }

    // Enhance results with additional features
    const enhancedRestaurants = restaurants.map((restaurant: any) => ({
      ...restaurant,
      id: crypto.randomUUID(),
      reservationUrl: restaurant.reservationUrl || `https://resy.com/cities/new-york-ny/${encodeURIComponent(restaurant.name.toLowerCase().replace(/\s+/g, '-'))}`,
      images: [
        `https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop&auto=format`,
        `https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop&auto=format`,
        `https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=400&h=300&fit=crop&auto=format`
      ].slice(0, Math.floor(Math.random() * 3) + 1),
      isOpen: Math.random() > 0.2, // 80% chance of being open
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