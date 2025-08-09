import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const tripAdvisorApiKey = Deno.env.get('TRIPADVISOR_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { restaurantName, address, types, restaurants } = body;

    // Handle batch processing for multiple restaurants
    if (restaurants && Array.isArray(restaurants)) {
      console.log(`Processing ${restaurants.length} restaurants for cuisine detection`);
      const cuisines: { [key: string]: string } = {};
      
      for (const restaurant of restaurants) {
        const name = restaurant.name;
        const addr = restaurant.formatted_address || restaurant.address;
        const restTypes = restaurant.types || [];
        
        if (!name) {
          console.warn('Skipping restaurant without name:', restaurant);
          continue;
        }
        
        console.log(`Detecting cuisine for: ${name} at ${addr || 'unknown address'}`);
        
        // First try TripAdvisor API for more accurate cuisine information
        let tripAdvisorCuisine = null;
        if (tripAdvisorApiKey) {
          try {
            tripAdvisorCuisine = await getTripAdvisorCuisine(name, addr);
            if (tripAdvisorCuisine && tripAdvisorCuisine !== 'International') {
              console.log(`TripAdvisor cuisine found: ${tripAdvisorCuisine} for ${name}`);
              cuisines[restaurant.place_id] = tripAdvisorCuisine;
              continue;
            }
          } catch (tripAdvisorError) {
            console.log(`TripAdvisor lookup failed for ${name}, falling back to AI:`, tripAdvisorError);
          }
        }
        
        // Use AI detection as fallback
        const cuisine = await detectCuisineWithAI(name, addr, restTypes);
        cuisines[restaurant.place_id] = cuisine;
      }
      
      return new Response(JSON.stringify({ cuisines }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle single restaurant processing
    if (!restaurantName) {
      return new Response(JSON.stringify({ 
        error: 'Restaurant name is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Detecting cuisine for: ${restaurantName} at ${address || 'unknown address'}`);

    // First try TripAdvisor API for more accurate cuisine information
    let tripAdvisorCuisine = null;
    if (tripAdvisorApiKey) {
      try {
        tripAdvisorCuisine = await getTripAdvisorCuisine(restaurantName, address);
        if (tripAdvisorCuisine && tripAdvisorCuisine !== 'International') {
          console.log(`TripAdvisor cuisine found: ${tripAdvisorCuisine} for ${restaurantName}`);
          return new Response(JSON.stringify({ cuisine: tripAdvisorCuisine }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (tripAdvisorError) {
        console.log(`TripAdvisor lookup failed for ${restaurantName}, falling back to AI:`, tripAdvisorError);
      }
    }

    const prompt = `Analyze this restaurant and determine its specific cuisine type based on the name and location details.

Restaurant Details:
- Name: "${restaurantName}"
- Address: "${address || 'Not provided'}"
- Google Places Types: ${types ? types.join(', ') : 'Not provided'}

Instructions:
1. Determine the most specific and accurate cuisine type for this restaurant
2. Use specific cuisine categories like: Italian, French, Japanese, Chinese, Mexican, Indian, Thai, Vietnamese, Korean, Mediterranean, Greek, Lebanese, Moroccan, Spanish, German, Brazilian, Peruvian, Ethiopian, etc.
3. For fusion restaurants, specify the fusion type (e.g., "Asian Fusion", "Latin Fusion")
4. For American restaurants, be more specific when possible (e.g., "Southern American", "New American", "Classic American")
5. For bars/pubs with food, determine their food style (e.g., "American Pub", "Sports Bar", "Gastropub")
6. NEVER use generic terms like "Restaurant", "Food", "Bar" - always be specific about the cuisine style
7. If you cannot determine the specific cuisine, use "International" as a last resort

Respond with a single JSON object in this exact format:
{"cuisine": "Italian"}

Only respond with the JSON object, no additional text or formatting.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a cuisine classification expert with deep knowledge of global food cultures. Analyze restaurant information to determine the most accurate and specific cuisine type. Always respond with valid JSON only.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 50,
      }),
    });

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Unexpected OpenAI response format:', data);
      return new Response(JSON.stringify({ cuisine: "International" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    try {
      const responseContent = data.choices[0].message.content.trim();
      console.log(`Raw AI response: ${responseContent}`);
      
      // Extract JSON from the response
      let jsonString = responseContent;
      
      // Remove markdown code blocks if present
      const jsonMatch = responseContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonString = jsonMatch[1].trim();
      }
      
      // Try to extract just the JSON object if there's extra text
      const objectMatch = jsonString.match(/\{[^}]*\}/);
      if (objectMatch) {
        jsonString = objectMatch[0];
      }
      
      const result = JSON.parse(jsonString);
      
      if (!result.cuisine || result.cuisine === 'Restaurant' || result.cuisine === 'Food') {
        console.log(`Generic cuisine detected for ${restaurantName}, using International`);
        return new Response(JSON.stringify({ cuisine: "International" }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log(`Detected cuisine: ${result.cuisine} for ${restaurantName}`);
      
      return new Response(JSON.stringify({ cuisine: result.cuisine }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw response content:', data.choices[0].message.content);
      
      // Fallback: try to extract cuisine from restaurant name patterns
      const fallbackCuisine = extractCuisineFromName(restaurantName);
      console.log(`Using fallback cuisine: ${fallbackCuisine} for ${restaurantName}`);
      
      return new Response(JSON.stringify({ cuisine: fallbackCuisine }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in AI cuisine detection:', error);
    
    // Try fallback cuisine extraction
    const fallbackCuisine = extractCuisineFromName(req.body?.restaurantName || 'Unknown');
    
    return new Response(JSON.stringify({ 
      cuisine: fallbackCuisine 
    }), {
      status: 200, // Return 200 with fallback instead of error
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Fallback function to extract cuisine from restaurant name patterns
function extractCuisineFromName(name: string): string {
  const nameLower = name.toLowerCase();
  
  // Common cuisine indicators in restaurant names
  const cuisinePatterns = [
    { keywords: ['sushi', 'ramen', 'hibachi', 'tempura', 'yakitori', 'izakaya'], cuisine: 'Japanese' },
    { keywords: ['pizza', 'pizzeria', 'ristorante', 'trattoria', 'osteria'], cuisine: 'Italian' },
    { keywords: ['taco', 'burrito', 'cantina', 'taqueria', 'mexican'], cuisine: 'Mexican' },
    { keywords: ['bistro', 'brasserie', 'cafe', 'creperie'], cuisine: 'French' },
    { keywords: ['dim sum', 'wok', 'noodle', 'szechuan', 'hunan'], cuisine: 'Chinese' },
    { keywords: ['curry', 'tandoor', 'biryani', 'masala'], cuisine: 'Indian' },
    { keywords: ['pho', 'vietnamese'], cuisine: 'Vietnamese' },
    { keywords: ['bbq', 'steakhouse', 'grill', 'smokehouse'], cuisine: 'American' },
    { keywords: ['thai', 'pad'], cuisine: 'Thai' },
    { keywords: ['korean', 'bulgogi', 'kimchi'], cuisine: 'Korean' },
    { keywords: ['mediterranean', 'gyro', 'kebab'], cuisine: 'Mediterranean' },
    { keywords: ['greek', 'souvlaki'], cuisine: 'Greek' },
    { keywords: ['tapas', 'paella'], cuisine: 'Spanish' },
    { keywords: ['pub', 'tavern', 'alehouse'], cuisine: 'American Pub' },
  ];
  
  for (const pattern of cuisinePatterns) {
    if (pattern.keywords.some(keyword => nameLower.includes(keyword))) {
      return pattern.cuisine;
    }
  }
  
  return 'International';
}

// Function to get cuisine from TripAdvisor API
async function getTripAdvisorCuisine(restaurantName: string, address?: string): Promise<string | null> {
  try {
    const searchQuery = address ? `${restaurantName} ${address}` : restaurantName;
    console.log(`Searching TripAdvisor for: ${searchQuery}`);
    
    const searchResponse = await fetch(`https://api.content.tripadvisor.com/api/v1/location/search?key=${tripAdvisorApiKey}&searchQuery=${encodeURIComponent(searchQuery)}&category=restaurants`);
    
    if (!searchResponse.ok) {
      console.log(`TripAdvisor search failed with status: ${searchResponse.status}`);
      return null;
    }
    
    const searchData = await searchResponse.json();
    
    if (!searchData.data || searchData.data.length === 0) {
      console.log(`No TripAdvisor results found for: ${searchQuery}`);
      return null;
    }
    
    // Get details for the first matching location
    const locationId = searchData.data[0].location_id;
    const detailsResponse = await fetch(`https://api.content.tripadvisor.com/api/v1/location/${locationId}/details?key=${tripAdvisorApiKey}`);
    
    if (!detailsResponse.ok) {
      console.log(`TripAdvisor details failed with status: ${detailsResponse.status}`);
      return null;
    }
    
    const detailsData = await detailsResponse.json();
    
    // Extract cuisine from various fields
    let cuisine = null;
    
    // Check cuisine field if available
    if (detailsData.cuisine && detailsData.cuisine.length > 0) {
      cuisine = detailsData.cuisine[0].name;
    }
    
    // Check subcategory for cuisine info
    if (!cuisine && detailsData.subcategory && detailsData.subcategory.length > 0) {
      for (const subcat of detailsData.subcategory) {
        if (subcat.name && !subcat.name.toLowerCase().includes('restaurant') && !subcat.name.toLowerCase().includes('dining')) {
          cuisine = subcat.name;
          break;
        }
      }
    }
    
    // Check category as last resort
    if (!cuisine && detailsData.category && detailsData.category.name && 
        !detailsData.category.name.toLowerCase().includes('restaurant')) {
      cuisine = detailsData.category.name;
    }
    
    if (cuisine) {
      // Clean up the cuisine name
      cuisine = cuisine.replace(/\b(restaurant|cuisine|food)\b/gi, '').trim();
      
      // Map common TripAdvisor terms to standard cuisine types
      const cuisineMapping: { [key: string]: string } = {
        'steakhouse': 'American Steakhouse',
        'seafood': 'Seafood',
        'american': 'American',
        'italian': 'Italian',
        'french': 'French',
        'japanese': 'Japanese',
        'chinese': 'Chinese',
        'mexican': 'Mexican',
        'indian': 'Indian',
        'thai': 'Thai',
        'mediterranean': 'Mediterranean',
        'greek': 'Greek',
        'spanish': 'Spanish',
        'asian': 'Asian',
        'barbecue': 'BBQ American',
        'pub': 'American Pub'
      };
      
      const cuisineLower = cuisine.toLowerCase();
      for (const [key, value] of Object.entries(cuisineMapping)) {
        if (cuisineLower.includes(key)) {
          return value;
        }
      }
      
      // Return the cleaned cuisine if no mapping found
      return cuisine.charAt(0).toUpperCase() + cuisine.slice(1).toLowerCase();
    }
    
    return null;
    
  } catch (error) {
    console.error('Error fetching from TripAdvisor:', error);
    return null;
  }
}

// Function to detect cuisine using AI
async function detectCuisineWithAI(restaurantName: string, address?: string, types?: string[]): Promise<string> {
  try {
    const prompt = `Analyze this restaurant and determine its specific cuisine type based on the name and location details.

Restaurant Details:
- Name: "${restaurantName}"
- Address: "${address || 'Not provided'}"
- Google Places Types: ${types ? types.join(', ') : 'Not provided'}

Instructions:
1. Determine the most specific and accurate cuisine type for this restaurant
2. Use specific cuisine categories like: Italian, French, Japanese, Chinese, Mexican, Indian, Thai, Vietnamese, Korean, Mediterranean, Greek, Lebanese, Moroccan, Spanish, German, Brazilian, Peruvian, Ethiopian, etc.
3. For fusion restaurants, specify the fusion type (e.g., "Asian Fusion", "Latin Fusion")
4. For American restaurants, be more specific when possible (e.g., "Southern American", "New American", "Classic American")
5. For bars/pubs with food, determine their food style (e.g., "American Pub", "Sports Bar", "Gastropub")
6. NEVER use generic terms like "Restaurant", "Food", "Bar" - always be specific about the cuisine style
7. If you cannot determine the specific cuisine, use "International" as a last resort

Respond with a single JSON object in this exact format:
{"cuisine": "Italian"}

Only respond with the JSON object, no additional text or formatting.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a cuisine classification expert with deep knowledge of global food cultures. Analyze restaurant information to determine the most accurate and specific cuisine type. Always respond with valid JSON only.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 50,
      }),
    });

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Unexpected OpenAI response format:', data);
      return "International";
    }
    
    try {
      const responseContent = data.choices[0].message.content.trim();
      console.log(`Raw AI response for ${restaurantName}: ${responseContent}`);
      
      // Extract JSON from the response
      let jsonString = responseContent;
      
      // Remove markdown code blocks if present
      const jsonMatch = responseContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonString = jsonMatch[1].trim();
      }
      
      // Try to extract just the JSON object if there's extra text
      const objectMatch = jsonString.match(/\{[^}]*\}/);
      if (objectMatch) {
        jsonString = objectMatch[0];
      }
      
      const result = JSON.parse(jsonString);
      
      if (!result.cuisine || result.cuisine === 'Restaurant' || result.cuisine === 'Food') {
        console.log(`Generic cuisine detected for ${restaurantName}, using International`);
        return "International";
      }
      
      console.log(`Detected cuisine: ${result.cuisine} for ${restaurantName}`);
      return result.cuisine;
      
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw response content:', data.choices[0].message.content);
      
      // Fallback: try to extract cuisine from restaurant name patterns
      const fallbackCuisine = extractCuisineFromName(restaurantName);
      console.log(`Using fallback cuisine: ${fallbackCuisine} for ${restaurantName}`);
      return fallbackCuisine;
    }

  } catch (error) {
    console.error('Error in AI cuisine detection for', restaurantName, ':', error);
    return extractCuisineFromName(restaurantName);
  }