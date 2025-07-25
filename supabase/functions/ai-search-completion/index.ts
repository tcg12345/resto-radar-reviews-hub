import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchCompletionRequest {
  query: string;
  location?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    const { query, location = 'New York' }: SearchCompletionRequest = await req.json();

    if (!query || query.trim().length < 1) {
      return new Response(JSON.stringify({
        success: true,
        suggestions: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Generating AI search completions for:', query);

    const prompt = `You are a restaurant search assistant. A user is typing a search query and you need to provide intelligent search completions.

User's partial input: "${query}"
Location context: ${location}

Rules:
1. If the input looks like a partial word (like "bur"), complete it intelligently (e.g., "burger", "burrito", "burn")
2. Generate 5 diverse restaurant search suggestions that complete or expand on their input
3. Include location context when relevant
4. Make suggestions specific and actionable
5. Focus on food types, cuisines, or restaurant characteristics
6. Return ONLY a JSON array of strings, nothing else

Return format: ["suggestion1", "suggestion2", "suggestion3", "suggestion4", "suggestion5"]`;

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
            content: prompt 
          },
          { 
            role: 'user', 
            content: `Generate exactly 5 search completions for: "${query}". Return only a JSON array.` 
          }
        ],
        temperature: 0.3,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    let suggestions: string[] = [];
    try {
      // Try to parse as JSON array first
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        suggestions = parsed;
      } else {
        // If it's a single string, split it
        suggestions = [parsed];
      }
    } catch {
      // If parsing fails, extract suggestions from the text
      const lines = content.split('\n').filter((line: string) => line.trim());
      suggestions = lines
        .map((line: string) => line.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '').replace(/["\[\]]/g, '').trim())
        .filter((s: string) => s.length > 0 && !s.includes('```'))
        .slice(0, 5);
    }

    // Clean up suggestions - remove any remaining JSON artifacts
    suggestions = suggestions
      .map(s => s.replace(/["\[\],]/g, '').trim())
      .filter(s => s.length > 0)
      .slice(0, 5);

    // Ensure we have valid suggestions
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      suggestions = [
        `${query} restaurants`,
        `best ${query}`,
        `${query} near me`,
        `${query} delivery`,
        `${query} with good reviews`
      ];
    }

    console.log(`Generated ${suggestions.length} AI search completions`);

    return new Response(JSON.stringify({
      success: true,
      suggestions: suggestions.slice(0, 5)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI search completion:', error);
    
    // Fallback suggestions
    const { query } = await req.json();
    const fallbackSuggestions = [
      `${query} restaurants`,
      `best ${query}`,
      `${query} near me`,
      `${query} delivery`,
      `${query} with outdoor seating`
    ];
    
    return new Response(JSON.stringify({
      success: true,
      suggestions: fallbackSuggestions,
      fallback: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});