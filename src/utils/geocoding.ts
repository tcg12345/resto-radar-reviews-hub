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
    // Remove types=region to get full context
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${tokenData.token}&limit=1`
    );

    if (!response.ok) {
      console.error('Geocoding API request failed:', response.status);
      return null;
    }

    const data: GeocodingResponse = await response.json();
    
    console.log('Reverse geocoding response:', data);
    
    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      
      // Look for region (state) in the context
      const regionContext = feature.context?.find(ctx => ctx.id.startsWith('region'));
      if (regionContext) {
        console.log('Found region context:', regionContext.text);
        return regionContext.text;
      }
      
      // Alternative: parse from place_name if context doesn't have region
      if (feature.place_name) {
        console.log('Parsing from place_name:', feature.place_name);
        const parts = feature.place_name.split(', ');
        // Look for US state pattern (usually 2-letter abbreviation or full state name)
        for (let i = parts.length - 1; i >= 0; i--) {
          const part = parts[i].trim();
          // Check if this part looks like a US state (2 letters or common state names)
          if (part.match(/^[A-Z]{2}$/) || isUSState(part)) {
            console.log('Found state:', part);
            return expandStateAbbreviation(part);
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error in reverse geocoding:', error);
    return null;
  }
}

// Helper function to check if a string is a US state name
function isUSState(str: string): boolean {
  const states = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
    'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
    'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
    'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
    'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
    'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
    'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ];
  return states.includes(str);
}

// Helper function to expand state abbreviations to full names
function expandStateAbbreviation(abbreviation: string): string {
  const stateMap: Record<string, string> = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
    'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
    'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
    'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland', 'MA': 'Massachusetts',
    'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri', 'MT': 'Montana',
    'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico',
    'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
    'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
    'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
  };
  
  return stateMap[abbreviation] || abbreviation;
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