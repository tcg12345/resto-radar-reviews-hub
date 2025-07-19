import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
    const { message, context, userPreferences } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are an expert restaurant discovery assistant. Your role is to help users find the perfect restaurant based on their needs, preferences, and context.

User Preferences: ${JSON.stringify(userPreferences || {})}
Current Context: ${context || 'General restaurant search'}

Guidelines:
- Be conversational and helpful
- Ask clarifying questions when needed
- Provide specific, actionable restaurant recommendations
- Consider factors like cuisine, price range, occasion, dietary restrictions, location
- Suggest search queries the user can use
- Be enthusiastic about food and dining experiences
- If the user asks about a specific restaurant, provide insights about what makes it special
- Help users discover restaurants they might not have considered

Keep responses concise but informative. Always end with a suggestion for what the user should search for or a question to help narrow down their preferences.`;

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
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Also generate suggested search queries
    const suggestionsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'Generate 3 specific restaurant search queries based on the user\'s message. Return only a JSON array of strings, no other text.' 
          },
          { role: 'user', content: `User said: "${message}". Generate search queries they could use.` }
        ],
        temperature: 0.5,
        max_tokens: 100,
      }),
    });

    let suggestions = [];
    if (suggestionsResponse.ok) {
      const suggestionsData = await suggestionsResponse.json();
      try {
        suggestions = JSON.parse(suggestionsData.choices[0].message.content);
      } catch {
        suggestions = [];
      }
    }

    return new Response(JSON.stringify({ 
      response: aiResponse,
      suggestions: suggestions 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI restaurant assistant:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      response: "I'm having trouble right now. Try searching for restaurants directly using the search bar above!"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});