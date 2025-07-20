import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role for background tasks
    );

    console.log('Starting comprehensive cache warming...');

    // Get all users who have friends or restaurants
    const { data: usersWithActivity, error: usersError } = await supabaseClient
      .from('profiles')
      .select('id, username')
      .or('id.in.(select user_id from restaurants),id.in.(select user1_id from friends),id.in.(select user2_id from friends)');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${usersWithActivity?.length || 0} users to warm caches for`);

    let profileCacheCount = 0;
    let activityCacheCount = 0;
    const errors: string[] = [];

    if (usersWithActivity) {
      // Process users in batches to avoid overwhelming the system
      const batchSize = 5;
      
      for (let i = 0; i < usersWithActivity.length; i += batchSize) {
        const batch = usersWithActivity.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (user) => {
          try {
            // Build profile cache
            const { error: profileError } = await supabaseClient
              .rpc('build_friend_profile_cache', { target_user_id: user.id });
            
            if (profileError) {
              errors.push(`Profile cache for ${user.username}: ${profileError.message}`);
            } else {
              profileCacheCount++;
            }

            // Build activity cache
            const { error: activityError } = await supabaseClient
              .rpc('rebuild_friend_activity_cache', { target_user_id: user.id });
            
            if (activityError) {
              errors.push(`Activity cache for ${user.username}: ${activityError.message}`);
            } else {
              activityCacheCount++;
            }

            console.log(`Warmed caches for ${user.username} (${i + 1}/${usersWithActivity.length})`);
          } catch (err) {
            errors.push(`User ${user.username}: ${err}`);
          }
        }));

        // Small delay between batches
        if (i + batchSize < usersWithActivity.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    }

    const summary = {
      total_users: usersWithActivity?.length || 0,
      profile_caches_built: profileCacheCount,
      activity_caches_built: activityCacheCount,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Limit errors to prevent huge response
      success_rate: usersWithActivity?.length ? 
        ((profileCacheCount + activityCacheCount) / (usersWithActivity.length * 2) * 100).toFixed(1) + '%' : '0%'
    };

    console.log('Cache warming completed:', summary);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Background cache warming completed',
        summary
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in cache-warmer function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});