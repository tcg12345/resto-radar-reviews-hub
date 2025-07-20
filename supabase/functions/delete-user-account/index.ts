import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("Delete user account function called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing delete account request...");
    
    // Check environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error("Missing environment variables:", { 
        hasUrl: !!supabaseUrl, 
        hasServiceKey: !!serviceRoleKey, 
        hasAnonKey: !!anonKey 
      });
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    console.log("Auth header present:", !!authHeader);
    
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Create regular client to verify user authentication
    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          authorization: authHeader,
        },
      },
    });

    console.log("Verifying user authentication...");
    
    // Verify the user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError) {
      console.error("User authentication error:", userError);
      return new Response(
        JSON.stringify({ error: "Authentication failed: " + userError.message }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    if (!user) {
      console.error("No user found in session");
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`Starting account deletion for user: ${user.id}`);

    // Delete all user data using service role client
    console.log("Deleting user data from all tables...");
    
    const deletionResults = [];
    
    // Delete profile
    try {
      const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', user.id);
      deletionResults.push({ table: 'profiles', error: profileError });
      console.log("Profile deletion:", profileError ? `Error: ${profileError.message}` : "Success");
    } catch (e) {
      console.error("Profile deletion failed:", e);
      deletionResults.push({ table: 'profiles', error: e });
    }

    // Delete restaurants
    try {
      const { error: restaurantsError } = await supabaseAdmin.from('restaurants').delete().eq('user_id', user.id);
      deletionResults.push({ table: 'restaurants', error: restaurantsError });
      console.log("Restaurants deletion:", restaurantsError ? `Error: ${restaurantsError.message}` : "Success");
    } catch (e) {
      console.error("Restaurants deletion failed:", e);
      deletionResults.push({ table: 'restaurants', error: e });
    }

    // Delete friends
    try {
      const { error: friendsError } = await supabaseAdmin.from('friends').delete().or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      deletionResults.push({ table: 'friends', error: friendsError });
      console.log("Friends deletion:", friendsError ? `Error: ${friendsError.message}` : "Success");
    } catch (e) {
      console.error("Friends deletion failed:", e);
      deletionResults.push({ table: 'friends', error: e });
    }

    // Delete friend requests
    try {
      const { error: requestsError } = await supabaseAdmin.from('friend_requests').delete().or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
      deletionResults.push({ table: 'friend_requests', error: requestsError });
      console.log("Friend requests deletion:", requestsError ? `Error: ${requestsError.message}` : "Success");
    } catch (e) {
      console.error("Friend requests deletion failed:", e);
      deletionResults.push({ table: 'friend_requests', error: e });
    }

    // Delete reservations
    try {
      const { error: reservationsError } = await supabaseAdmin.from('reservations').delete().eq('user_id', user.id);
      deletionResults.push({ table: 'reservations', error: reservationsError });
      console.log("Reservations deletion:", reservationsError ? `Error: ${reservationsError.message}` : "Success");
    } catch (e) {
      console.error("Reservations deletion failed:", e);
      deletionResults.push({ table: 'reservations', error: e });
    }

    // Delete settings
    try {
      const { error: settingsError } = await supabaseAdmin.from('settings').delete().eq('user_id', user.id);
      deletionResults.push({ table: 'settings', error: settingsError });
      console.log("Settings deletion:", settingsError ? `Error: ${settingsError.message}` : "Success");
    } catch (e) {
      console.error("Settings deletion failed:", e);
      deletionResults.push({ table: 'settings', error: e });
    }

    console.log("Data deletion completed, now deleting auth user...");

    // Finally delete the auth user using admin client
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    
    if (deleteUserError) {
      console.error('Error deleting auth user:', deleteUserError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to delete user account: " + deleteUserError.message,
          details: deleteUserError
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`Successfully deleted user account: ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Account deleted successfully",
        deletionResults: deletionResults.filter(r => r.error).map(r => ({ table: r.table, error: r.error?.message }))
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("Unexpected error in delete-user-account function:", error);
    console.error("Error stack:", error.stack);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to delete account",
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});