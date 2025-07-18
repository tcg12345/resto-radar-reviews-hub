import { supabase } from '@/integrations/supabase/client';

interface GeocodingResponse {
  features: Array<{
    place_name: string;
    context: Array<{
      id: string;
      text: string;
      short_code?: string;
    }>;
  }>;
}

export async function getStateFromCoordinates(latitude: number, longitude: number): Promise<string | null> {
  try {
    // Get the Mapbox token from the edge function
    const { data: tokenData, error: tokenError } = await supabase.functions.invoke('get-mapbox-token');
    
    if (tokenError || !tokenData?.token) {
      console.error('Failed to get Mapbox token:', tokenError);
      return null;
    }

    // Use Mapbox Geocoding API for reverse geocoding
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${tokenData.token}&types=region`
    );

    if (!response.ok) {
      console.error('Geocoding API request failed:', response.status);
      return null;
    }

    const data: GeocodingResponse = await response.json();
    
    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      
      // Look for region (state) in the context
      const regionContext = feature.context?.find(ctx => ctx.id.startsWith('region'));
      if (regionContext) {
        return regionContext.text;
      }
      
      // If no region context, check if the main feature is a region
      if (feature.place_name) {
        // Extract state from place name (usually the last part after comma)
        const parts = feature.place_name.split(', ');
        if (parts.length > 1) {
          return parts[parts.length - 1];
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error in reverse geocoding:', error);
    return null;
  }
}

// Cache for storing state results to avoid repeated API calls
const stateCache = new Map<string, string | null>();

export async function getStateFromCoordinatesCached(latitude: number, longitude: number): Promise<string | null> {
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  
  if (stateCache.has(cacheKey)) {
    return stateCache.get(cacheKey) || null;
  }
  
  const state = await getStateFromCoordinates(latitude, longitude);
  stateCache.set(cacheKey, state);
  
  return state;
}