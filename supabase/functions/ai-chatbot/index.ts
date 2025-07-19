import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userRestaurants = [] } = await req.json();
    
    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
    if (!claudeApiKey) {
      throw new Error('Claude API key not configured');
    }

    // Create context about user's restaurants
    const restaurantContext = userRestaurants.length > 0 
      ? `\n\nUser's Restaurant Data:\n${userRestaurants.map(r => 
          `- ${r.name} (${r.cuisine}, ${r.city}): ${r.rating ? `Rating: ${r.rating}/5` : 'Wishlist item'}`
        ).join('\n')}`
      : '';

    const systemPrompt = `You are a knowledgeable restaurant assistant for Grubby, a restaurant tracking app. You help users discover restaurants, analyze their dining patterns, and provide personalized recommendations.

Your capabilities:
- Provide restaurant recommendations based on cuisine, location, or preferences
- Analyze dining patterns and suggest new experiences
- Answer questions about cuisines, cooking techniques, and food culture
- Help users discover hidden gems and popular spots
- Provide insights about their restaurant collection

Guidelines:
- Be conversational and enthusiastic about food
- Provide specific, actionable recommendations when possible
- Ask clarifying questions to better understand preferences
- Reference their restaurant data when relevant
- Keep responses concise but informative
- Focus on restaurants, cuisine, and dining experiences

${restaurantContext}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${claudeApiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: message }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Claude API error:', errorData);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    let aiResponse = data.content[0]?.text;

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    // Clean up formatting
    aiResponse = aiResponse.trim();

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-chatbot function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});