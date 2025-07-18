import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReviewAssistantRequest {
  action: 'generate' | 'improve' | 'analyze';
  restaurantName: string;
  cuisine: string;
  rating?: number;
  priceRange?: number;
  experience?: string;
  existingReview?: string;
  aspects?: {
    food: number;
    service: number;
    ambiance: number;
    value: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: ReviewAssistantRequest = await req.json();
    
    console.log('Processing review assistant request:', requestData);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';

    switch (requestData.action) {
      case 'generate':
        systemPrompt = `You are an expert restaurant reviewer who helps people write detailed, helpful restaurant reviews. Your reviews should be:
- Authentic and personal
- Specific and descriptive
- Helpful to other diners
- Well-structured with clear paragraphs
- 150-300 words typically
- Include specific details about food, service, ambiance, and value
- Use vivid but not overly flowery language`;

        userPrompt = `Help me write a restaurant review based on my experience:

Restaurant: ${requestData.restaurantName}
Cuisine: ${requestData.cuisine}
Overall Rating: ${requestData.rating}/5 stars
Price Range: ${'$'.repeat(requestData.priceRange || 2)}
${requestData.aspects ? `
Detailed Ratings:
- Food: ${requestData.aspects.food}/5
- Service: ${requestData.aspects.service}/5
- Ambiance: ${requestData.aspects.ambiance}/5
- Value: ${requestData.aspects.value}/5` : ''}

My experience: ${requestData.experience || 'Please write a review based on the ratings provided.'}

Please write a comprehensive review that captures my experience and would be helpful to other diners. Include specific details about what made this experience ${requestData.rating && requestData.rating >= 4 ? 'great' : requestData.rating && requestData.rating >= 3 ? 'good' : 'disappointing'}.`;
        break;

      case 'improve':
        systemPrompt = `You are an expert restaurant reviewer who helps improve existing reviews. Your improvements should:
- Keep the original voice and perspective
- Add more specific details and examples
- Improve clarity and structure
- Make the review more helpful to other diners
- Maintain authenticity while enhancing quality`;

        userPrompt = `Please improve this restaurant review:

Restaurant: ${requestData.restaurantName}
Cuisine: ${requestData.cuisine}
Current Review: "${requestData.existingReview}"

Please enhance this review by:
1. Adding more specific details about the food, service, and atmosphere
2. Improving the structure and flow
3. Making it more helpful to potential diners
4. Keeping the original tone and perspective

Return the improved review only, without any preamble.`;
        break;

      case 'analyze':
        systemPrompt = `You are a restaurant review analyst who provides constructive feedback on reviews. Analyze reviews for:
- Clarity and helpfulness
- Specific details vs vague statements
- Balance (covering food, service, ambiance, value)
- Suggestions for improvement`;

        userPrompt = `Please analyze this restaurant review and provide constructive feedback:

Restaurant: ${requestData.restaurantName}
Review: "${requestData.existingReview}"

Provide:
1. What the review does well
2. What could be improved
3. Specific suggestions for adding more helpful details
4. Overall helpfulness score (1-10)`;
        break;
    }

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
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    console.log('OpenAI response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const result = data.choices[0].message.content;

    console.log('AI review assistant completed successfully');

    return new Response(JSON.stringify({
      success: true,
      result,
      action: requestData.action
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI review assistant function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Failed to process review assistance',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});