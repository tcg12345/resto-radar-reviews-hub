import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  action: 'get_activity' | 'rebuild_cache' | 'warm_cache';
  user_id?: string;
  page?: number;
  page_size?: number;
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

    const { action, page = 0, page_size = 20 }: RequestBody = await req.json();

    console.log(`Friend activity cache request: ${action} for user ${user.id}`);

    switch (action) {
      case 'get_activity': {
        // Get cached activity data with pagination
        const { data: cachedActivity, error: cacheError } = await supabaseClient
          .rpc('get_cached_friend_activity', {
            requesting_user_id: user.id,
            page_size: page_size,
            page_offset: page * page_size
          });

        if (cacheError) {
          console.error('Error fetching cached activity:', cacheError);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch activity' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // If no cached data exists, build it
        if (!cachedActivity || cachedActivity.length === 0) {
          console.log('No cached data found, rebuilding cache...');
          
          const { error: rebuildError } = await supabaseClient
            .rpc('rebuild_friend_activity_cache', { target_user_id: user.id });

          if (rebuildError) {
            console.error('Error rebuilding cache:', rebuildError);
            return new Response(
              JSON.stringify({ error: 'Failed to rebuild cache' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Fetch the newly built cache
          const { data: newCachedActivity, error: newCacheError } = await supabaseClient
            .rpc('get_cached_friend_activity', {
              requesting_user_id: user.id,
              page_size: page_size,
              page_offset: page * page_size
            });

          if (newCacheError) {
            console.error('Error fetching rebuilt cache:', newCacheError);
            return new Response(
              JSON.stringify({ error: 'Failed to fetch rebuilt cache' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          return new Response(
            JSON.stringify({ 
              activities: newCachedActivity || [],
              cache_status: 'rebuilt',
              page,
              page_size,
              has_more: (newCachedActivity?.length || 0) === page_size
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ 
            activities: cachedActivity,
            cache_status: 'hit',
            page,
            page_size,
            has_more: cachedActivity.length === page_size
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'rebuild_cache': {
        console.log('Rebuilding cache for user:', user.id);
        
        const { error: rebuildError } = await supabaseClient
          .rpc('rebuild_friend_activity_cache', { target_user_id: user.id });

        if (rebuildError) {
          console.error('Error rebuilding cache:', rebuildError);
          return new Response(
            JSON.stringify({ error: 'Failed to rebuild cache' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Cache rebuilt successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'warm_cache': {
        // Warm cache for all users with friends (background task)
        console.log('Warming caches for all users...');
        
        // Get all users who have friends
        const { data: usersWithFriends, error: usersError } = await supabaseClient
          .from('friends')
          .select('user1_id, user2_id');

        if (usersError) {
          console.error('Error fetching users:', usersError);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch users' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const uniqueUserIds = new Set<string>();
        usersWithFriends?.forEach(friendship => {
          uniqueUserIds.add(friendship.user1_id);
          uniqueUserIds.add(friendship.user2_id);
        });

        let rebuiltCount = 0;
        const errors: string[] = [];

        // Rebuild cache for each user (limit to prevent timeout)
        for (const userId of Array.from(uniqueUserIds).slice(0, 50)) {
          try {
            const { error } = await supabaseClient
              .rpc('rebuild_friend_activity_cache', { target_user_id: userId });
            
            if (error) {
              errors.push(`User ${userId}: ${error.message}`);
            } else {
              rebuiltCount++;
            }
          } catch (err) {
            errors.push(`User ${userId}: ${err}`);
          }
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            rebuilt_count: rebuiltCount,
            total_users: uniqueUserIds.size,
            errors: errors.length > 0 ? errors : undefined
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
    console.error('Error in friend-activity-cache function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});