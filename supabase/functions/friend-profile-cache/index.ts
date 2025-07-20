import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  action: 'get_profile' | 'warm_all_caches' | 'build_cache' | 'get_profile_stats';
  user_id?: string;
  force_rebuild?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, user_id, force_rebuild = false }: RequestBody = await req.json();
    const targetUserId = user_id || user.id;

    console.log(`Profile cache request: ${action} for user ${targetUserId}`);

    switch (action) {
      case 'get_profile': {
        // Get complete cached profile instantly
        const startTime = Date.now();
        
        if (force_rebuild) {
          console.log('Force rebuilding profile cache...');
          const { data: rebuiltProfile, error: rebuildError } = await supabaseClient
            .rpc('build_friend_profile_cache', { target_user_id: targetUserId });

          if (rebuildError) {
            console.error('Error rebuilding profile cache:', rebuildError);
            return new Response(
              JSON.stringify({ error: 'Failed to rebuild profile cache' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const endTime = Date.now();
          console.log(`Profile rebuilt in ${endTime - startTime}ms`);

          return new Response(
            JSON.stringify({ 
              profile: rebuiltProfile,
              cache_status: 'rebuilt',
              load_time_ms: endTime - startTime
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Try to get cached profile first
        const { data: cachedProfile, error: cacheError } = await supabaseClient
          .rpc('get_cached_friend_profile', { 
            target_user_id: targetUserId,
            requesting_user_id: user.id
          });

        if (cacheError) {
          console.error('Error fetching cached profile:', cacheError);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch profile' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const endTime = Date.now();
        console.log(`Profile loaded in ${endTime - startTime}ms`);

        return new Response(
          JSON.stringify({ 
            profile: cachedProfile,
            cache_status: 'hit',
            load_time_ms: endTime - startTime
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_profile_stats': {
        // Get just quick stats for popups/previews
        const { data: cachedData, error } = await supabaseClient
          .from('friend_profile_cache')
          .select('profile_data')
          .eq('user_id', targetUserId)
          .single();

        if (error || !cachedData) {
          // Build cache if it doesn't exist
          const { data: builtProfile, error: buildError } = await supabaseClient
            .rpc('build_friend_profile_cache', { target_user_id: targetUserId });

          if (buildError) {
            console.error('Error building profile cache:', buildError);
            return new Response(
              JSON.stringify({ error: 'Failed to build profile cache' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const stats = builtProfile?.stats || {};
          const profile = builtProfile?.profile || {};

          return new Response(
            JSON.stringify({ 
              stats: {
                ratedCount: stats.total_rated || 0,
                wishlistCount: stats.total_wishlist || 0,
                averageRating: parseFloat(stats.avg_rating) || 0,
                topCuisine: stats.top_cuisine || '',
                username: profile.username || 'Unknown User'
              },
              cache_status: 'built'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const stats = cachedData.profile_data?.stats || {};
        const profile = cachedData.profile_data?.profile || {};

        return new Response(
          JSON.stringify({ 
            stats: {
              ratedCount: stats.total_rated || 0,
              wishlistCount: stats.total_wishlist || 0,
              averageRating: parseFloat(stats.avg_rating) || 0,
              topCuisine: stats.top_cuisine || '',
              username: profile.username || 'Unknown User'
            },
            cache_status: 'hit'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'build_cache': {
        console.log('Building profile cache for user:', targetUserId);
        
        const { data: builtProfile, error: buildError } = await supabaseClient
          .rpc('build_friend_profile_cache', { target_user_id: targetUserId });

        if (buildError) {
          console.error('Error building profile cache:', buildError);
          return new Response(
            JSON.stringify({ error: 'Failed to build profile cache' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Profile cache built successfully',
            profile: builtProfile
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'warm_all_caches': {
        // Background task to warm all profile caches
        console.log('Starting background cache warming...');

        // Start the background task without awaiting
        const backgroundTask = async () => {
          try {
            // Get all users who have restaurants or friends
            const { data: activeUsers, error: usersError } = await supabaseClient
              .from('profiles')
              .select('id')
              .in('id', [
                // Users with restaurants
                supabaseClient.from('restaurants').select('user_id'),
                // Users with friends
                supabaseClient.from('friends').select('user1_id, user2_id')
              ]);

            if (usersError) {
              console.error('Error fetching active users:', usersError);
              return;
            }

            const uniqueUserIds = new Set<string>();
            activeUsers?.forEach(user => uniqueUserIds.add(user.id));

            console.log(`Warming caches for ${uniqueUserIds.size} users...`);
            
            let warmedCount = 0;
            const errors: string[] = [];

            // Process users in batches to avoid overwhelming the system
            const batchSize = 10;
            const userArray = Array.from(uniqueUserIds);
            
            for (let i = 0; i < userArray.length; i += batchSize) {
              const batch = userArray.slice(i, i + batchSize);
              
              await Promise.all(batch.map(async (userId) => {
                try {
                  await supabaseClient.rpc('build_friend_profile_cache', { 
                    target_user_id: userId 
                  });
                  warmedCount++;
                  console.log(`Warmed cache for user ${userId} (${warmedCount}/${uniqueUserIds.size})`);
                } catch (err) {
                  errors.push(`User ${userId}: ${err}`);
                  console.error(`Failed to warm cache for user ${userId}:`, err);
                }
              }));

              // Small delay between batches to prevent overwhelming the database
              if (i + batchSize < userArray.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }

            console.log(`Cache warming completed: ${warmedCount}/${uniqueUserIds.size} successful`);
            if (errors.length > 0) {
              console.error('Cache warming errors:', errors);
            }
          } catch (error) {
            console.error('Background cache warming failed:', error);
          }
        };

        // Use EdgeRuntime.waitUntil for background processing
        if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
          EdgeRuntime.waitUntil(backgroundTask());
        } else {
          // Fallback for environments without EdgeRuntime
          backgroundTask();
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Cache warming started in background'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error in friend-profile-cache function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});