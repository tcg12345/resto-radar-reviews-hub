import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const { address, city } = await req.json();
    
    if (!address || !city) {
      return new Response(
        JSON.stringify({ error: "Address and city are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get Mapbox token from environment first, then fall back to user's token
    let mapboxToken = Deno.env.get("MAPBOX_TOKEN");
    console.log("Mapbox token from environment:", mapboxToken ? "found" : "not found");
    
    if (!mapboxToken) {
      // Get the JWT from the request to identify user
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
        const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
        const supabase = createClient(supabaseUrl, supabaseKey);

        const jwt = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(jwt);

        if (user) {
          // Get user's Mapbox token from settings
          const { data: settings } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'mapbox_token')
            .eq('user_id', user.id)
            .maybeSingle();
            
          mapboxToken = settings?.value;
        }
      }
    }
    
    if (!mapboxToken) {
      return new Response(
        JSON.stringify({ error: "Mapbox token not available" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Geocode the address
    const searchAddress = `${address}, ${city}`;
    const encodedAddress = encodeURIComponent(searchAddress);
    const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${mapboxToken}`;
    
    console.log(`Geocoding address: ${searchAddress}`);
    
    const response = await fetch(geocodingUrl);
    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      return new Response(
        JSON.stringify({ error: "Location not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Extract coordinates and country
    const [longitude, latitude] = data.features[0].center;
    
    // Extract country from the address context
    let country = null;
    const contexts = data.features[0].context || [];
    for (const context of contexts) {
      if (context.id && context.id.startsWith('country.')) {
        country = context.text;
        break;
      }
    }
    
    return new Response(
      JSON.stringify({ latitude, longitude, country }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in geocode function:", error);
    
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});