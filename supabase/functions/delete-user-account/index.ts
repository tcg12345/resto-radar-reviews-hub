import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Create regular client to verify user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: {
            authorization: authHeader,
          },
        },
      }
    );

    // Verify the user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`Deleting account for user: ${user.id}`);

    // Delete all user data using service role client
    const deletionPromises = [
      supabaseAdmin.from('profiles').delete().eq('id', user.id),
      supabaseAdmin.from('restaurants').delete().eq('user_id', user.id),
      supabaseAdmin.from('friends').delete().or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
      supabaseAdmin.from('friend_requests').delete().or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`),
      supabaseAdmin.from('reservations').delete().eq('user_id', user.id),
      supabaseAdmin.from('settings').delete().eq('user_id', user.id)
    ];

    // Execute all deletions
    const results = await Promise.allSettled(deletionPromises);
    
    // Log any errors but continue with user deletion
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Error deleting data at index ${index}:`, result.reason);
      }
    });

    // Finally delete the auth user using admin client
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    
    if (deleteUserError) {
      console.error('Error deleting user:', deleteUserError);
      throw deleteUserError;
    }

    console.log(`Successfully deleted user account: ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, message: "Account deleted successfully" }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("Error in delete-user-account function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to delete account" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});