import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { trip_id } = await req.json()
    
    if (!trip_id) {
      return new Response(
        JSON.stringify({ error: 'trip_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: { persistSession: false },
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get Google Places API key
    const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
    if (!googleApiKey) {
      return new Response(
        JSON.stringify({ error: 'Google Places API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch all places in the trip that need website updates
    const { data: places, error: fetchError } = await supabaseClient
      .from('place_ratings')
      .select('*')
      .eq('trip_id', trip_id)

    if (fetchError) {
      console.error('Error fetching places:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch places' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const updatedPlaces = []
    
    for (const place of places) {
      let websiteUrl = place.website
      let phoneNumber = place.phone_number
      
      // Only fetch if we're missing website or phone data
      if (!websiteUrl || !phoneNumber) {
        try {
          let googlePlaceData = null
          
          // First try with place_id if available
          if (place.place_id) {
            const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=website,formatted_phone_number&key=${googleApiKey}`
            console.log(`Fetching details for place_id: ${place.place_id}`)
            
            const detailsResponse = await fetch(detailsUrl)
            const detailsData = await detailsResponse.json()
            
            if (detailsData.status === 'OK' && detailsData.result) {
              googlePlaceData = detailsData.result
            }
          }
          
          // If no place_id or details failed, try text search
          if (!googlePlaceData) {
            const searchQuery = `${place.place_name} ${place.address || ''}`
            const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${googleApiKey}`
            console.log(`Searching for: ${searchQuery}`)
            
            const searchResponse = await fetch(searchUrl)
            const searchData = await searchResponse.json()
            
            if (searchData.status === 'OK' && searchData.results.length > 0) {
              const firstResult = searchData.results[0]
              
              // Get detailed info including website
              const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${firstResult.place_id}&fields=website,formatted_phone_number&key=${googleApiKey}`
              
              const detailsResponse = await fetch(detailsUrl)
              const detailsData = await detailsResponse.json()
              
              if (detailsData.status === 'OK' && detailsData.result) {
                googlePlaceData = detailsData.result
              }
            }
          }
          
          // Update if we found new data
          if (googlePlaceData) {
            if (!websiteUrl && googlePlaceData.website) {
              websiteUrl = googlePlaceData.website
            }
            if (!phoneNumber && googlePlaceData.formatted_phone_number) {
              phoneNumber = googlePlaceData.formatted_phone_number
            }
          }
          
          // Small delay to respect API rate limits
          await new Promise(resolve => setTimeout(resolve, 100))
          
        } catch (error) {
          console.error(`Error fetching data for ${place.place_name}:`, error)
        }
      }
      
      // Update the place if we have new data
      if (websiteUrl !== place.website || phoneNumber !== place.phone_number) {
        const updateData: any = {}
        if (websiteUrl !== place.website) updateData.website = websiteUrl
        if (phoneNumber !== place.phone_number) updateData.phone_number = phoneNumber
        
        const { error: updateError } = await supabaseClient
          .from('place_ratings')
          .update(updateData)
          .eq('id', place.id)
          
        if (updateError) {
          console.error(`Error updating place ${place.place_name}:`, updateError)
        } else {
          console.log(`Updated ${place.place_name} with website: ${websiteUrl}`)
          updatedPlaces.push({
            id: place.id,
            name: place.place_name,
            website: websiteUrl,
            phone_number: phoneNumber
          })
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Updated ${updatedPlaces.length} places with website/phone data`,
        updated_places: updatedPlaces
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in update-place-websites function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})