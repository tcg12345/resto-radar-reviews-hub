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
    // Check if the request is authenticated
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the JWT from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify the JWT is valid
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Now process the request
    const { token } = await req.json();
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the service role key to update settings
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

    // Try to update existing token first
    const { error: updateError } = await adminSupabase
      .from("settings")
      .update({ value: token })
      .eq("key", "mapbox_token")
      .eq("user_id", user.id);

    // If update fails (no record exists), insert new token
    if (updateError) {
      const { error: insertError } = await adminSupabase
        .from("settings")
        .insert({ 
          key: "mapbox_token", 
          value: token,
          user_id: user.id
        });

      if (insertError) {
        throw new Error(`Error saving token: ${insertError.message}`);
      }
    }

    // Validate token works by making a test request to Mapbox
    try {
      const testUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/New%20York.json?access_token=${token}`;
      const response = await fetch(testUrl);
      
      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: "Invalid Mapbox token" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Could not validate Mapbox token" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in set-mapbox-token function:", error);
    
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});