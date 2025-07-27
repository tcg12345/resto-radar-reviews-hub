import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CategorizeRequest {
  name: string;
  category?: string;
  address?: string;
  description?: string;
}

interface CategorizeResponse {
  type: 'hotel' | 'restaurant' | 'attraction' | 'museum' | 'park' | 'monument' | 'shopping' | 'entertainment' | 'other';
  displayCategory: string;
  confidence: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, category, address, description }: CategorizeRequest = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are an expert at categorizing places and attractions for travel planning. Your job is to categorize a place into one of these specific types:

- hotel: Hotels, hostels, resorts, B&Bs, accommodations
- restaurant: Restaurants, cafes, bars, food places
- attraction: Tourist attractions, landmarks, viewpoints, theme parks
- museum: Museums, galleries, cultural centers, exhibitions
- park: Parks, gardens, nature areas, outdoor spaces
- monument: Monuments, statues, historical sites, memorials
- shopping: Malls, markets, shopping areas, stores
- entertainment: Theaters, cinemas, venues, clubs
- other: Anything that doesn't fit the above categories

Also provide a user-friendly display category name and confidence score.

Respond with JSON only in this format:
{
  "type": "one of the types above",
  "displayCategory": "User-friendly category name",
  "confidence": 0.95
}`;

    const userPrompt = `Categorize this place:
Name: ${name}
${category ? `Category: ${category}` : ''}
${address ? `Address: ${address}` : ''}
${description ? `Description: ${description}` : ''}

Based on this information, what type of place is this?`;

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
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    let result: CategorizeResponse;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      // Fallback categorization based on keywords
      result = fallbackCategorization(name, category);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-place-categorizer:', error);
    
    // Fallback to basic categorization if AI fails
    const request = await req.json();
    const fallback = fallbackCategorization(request.name, request.category);
    
    return new Response(JSON.stringify(fallback), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function fallbackCategorization(name: string, category?: string): CategorizeResponse {
  const lowercaseName = name.toLowerCase();
  const lowercaseCategory = category?.toLowerCase() || '';
  
  // Hotel keywords
  if (lowercaseName.includes('hotel') || lowercaseName.includes('resort') || 
      lowercaseName.includes('hostel') || lowercaseName.includes('inn') ||
      lowercaseCategory.includes('hotel') || lowercaseCategory.includes('accommodation')) {
    return {
      type: 'hotel',
      displayCategory: 'Hotel',
      confidence: 0.8
    };
  }
  
  // Restaurant keywords
  if (lowercaseName.includes('restaurant') || lowercaseName.includes('cafe') || 
      lowercaseName.includes('bar') || lowercaseName.includes('bistro') ||
      lowercaseCategory.includes('restaurant') || lowercaseCategory.includes('food')) {
    return {
      type: 'restaurant',
      displayCategory: 'Restaurant',
      confidence: 0.8
    };
  }
  
  // Museum keywords
  if (lowercaseName.includes('museum') || lowercaseName.includes('gallery') ||
      lowercaseName.includes('exhibition') || lowercaseCategory.includes('museum')) {
    return {
      type: 'museum',
      displayCategory: 'Museum',
      confidence: 0.9
    };
  }
  
  // Park keywords
  if (lowercaseName.includes('park') || lowercaseName.includes('garden') ||
      lowercaseName.includes('nature') || lowercaseCategory.includes('park')) {
    return {
      type: 'park',
      displayCategory: 'Park',
      confidence: 0.9
    };
  }
  
  // Monument keywords
  if (lowercaseName.includes('monument') || lowercaseName.includes('memorial') ||
      lowercaseName.includes('statue') || lowercaseName.includes('tower') ||
      lowercaseCategory.includes('monument') || lowercaseCategory.includes('historical')) {
    return {
      type: 'monument',
      displayCategory: 'Monument',
      confidence: 0.8
    };
  }
  
  // Default to attraction
  return {
    type: 'attraction',
    displayCategory: 'Attraction',
    confidence: 0.6
  };
}