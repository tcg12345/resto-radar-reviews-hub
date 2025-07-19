import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const googlePlacesApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { placeId, restaurantName } = await req.json();

    if (!openAIApiKey || !googlePlacesApiKey) {
      throw new Error('Required API keys not configured');
    }

    // Fetch reviews from Google Places API
    const placesResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,rating,price_level&key=${googlePlacesApiKey}`
    );

    if (!placesResponse.ok) {
      throw new Error('Failed to fetch restaurant details');
    }

    const placesData = await placesResponse.json();
    const reviews = placesData.result?.reviews || [];

    if (reviews.length === 0) {
      return new Response(JSON.stringify({ 
        summary: "No reviews available for this restaurant yet.",
        highlights: [],
        concerns: [],
        sentiment: "neutral"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare review text for AI analysis
    const reviewTexts = reviews.slice(0, 10).map((review: any) => 
      `Rating: ${review.rating}/5 - ${review.text}`
    ).join('\n\n');

    const systemPrompt = `You are an expert restaurant review analyzer. Analyze the following reviews for "${restaurantName}" and provide insights in JSON format.

Return your analysis in this exact JSON structure:
{
  "summary": "A 2-3 sentence summary of overall customer experience",
  "highlights": ["positive aspect 1", "positive aspect 2", "positive aspect 3"],
  "concerns": ["concern 1", "concern 2"] (only if there are legitimate concerns),
  "sentiment": "positive" | "negative" | "mixed" | "neutral",
  "foodQuality": "excellent" | "good" | "average" | "poor",
  "serviceQuality": "excellent" | "good" | "average" | "poor",
  "atmosphere": "excellent" | "good" | "average" | "poor",
  "valueForMoney": "excellent" | "good" | "average" | "poor",
  "recommendedDishes": ["dish 1", "dish 2"] (if mentioned),
  "bestFor": ["occasion type 1", "occasion type 2"] (e.g., "date night", "family dinner", "quick lunch")
}

Be objective and balanced in your analysis.`;

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
          { role: 'user', content: `Reviews to analyze:\n\n${reviewTexts}` }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content;

    try {
      const analysis = JSON.parse(analysisText);
      return new Response(JSON.stringify(analysis), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      // Fallback if JSON parsing fails
      return new Response(JSON.stringify({ 
        summary: analysisText,
        highlights: [],
        concerns: [],
        sentiment: "neutral"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in AI review summarizer:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      summary: "Unable to analyze reviews at this time.",
      highlights: [],
      concerns: [],
      sentiment: "neutral"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});