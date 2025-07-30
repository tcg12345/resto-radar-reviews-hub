import { useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRestaurants } from "@/contexts/RestaurantContext";
import { RestaurantDialog } from "./Dialog/RestaurantDialog";
import { RestaurantFormData } from "@/types/restaurant";
import { UnifiedRestaurantDetails } from "@/components/UnifiedRestaurantDetails";

interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  opening_hours?: {
    open_now: boolean;
    weekday_text: string[];
  };
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  reviews?: Array<{
    author_name: string;
    rating: number;
    text: string;
    time: number;
  }>;
  yelpData?: {
    id: string;
    url: string;
    categories: string[];
    price?: string;
    photos: string[];
    transactions: string[];
    menu_url?: string;
  };
}

interface RestaurantProfileModalProps {
  place: PlaceDetails;
  onClose: () => void;
}

export function RestaurantProfileModal({
  place,
  onClose
}: RestaurantProfileModalProps) {
  const { user } = useAuth();
  const { addRestaurant } = useRestaurants();
  const [aiCuisine, setAiCuisine] = useState<string>('');
  const [aiCategories, setAiCategories] = useState<string[]>([]);
  const [isLoadingAiAnalysis, setIsLoadingAiAnalysis] = useState(false);
  const [isRestaurantDialogOpen, setIsRestaurantDialogOpen] = useState(false);
  const [enhancedRestaurantData, setEnhancedRestaurantData] = useState<any>(null);

  // Analyze restaurant with AI on component mount
  useState(() => {
    const analyzeRestaurant = async () => {
      setIsLoadingAiAnalysis(true);
      try {
        const { data, error } = await supabase.functions.invoke('ai-restaurant-analysis', {
          body: {
            name: place.name,
            types: place.types,
            address: place.formatted_address,
            description: place.reviews?.[0]?.text || undefined
          }
        });
        if (!error && data.success) {
          setAiCuisine(data.cuisine);
          setAiCategories(data.categories);
        }
      } catch (error) {
        console.error('Error analyzing restaurant:', error);
      } finally {
        setIsLoadingAiAnalysis(false);
      }
    };
    analyzeRestaurant();
  });

  const handleAddToWishlist = async () => {
    if (!user) {
      toast.error('Please sign in to add to wishlist');
      return;
    }

    try {
      // Get Michelin stars using AI
      let michelinStars = null;
      try {
        const { data: aiData } = await supabase.functions.invoke('ai-michelin-detector', {
          body: {
            name: place.name,
            address: place.formatted_address,
            city: place.formatted_address.split(',').slice(-2, -1)[0]?.trim() || '',
            country: place.formatted_address.split(',').slice(-1)[0]?.trim() || '',
            cuisine: aiCuisine || place.types.filter(type => !['establishment', 'point_of_interest', 'food'].includes(type))[0] || 'restaurant',
            notes: `Added from Global Search`
          }
        });
        if (aiData && aiData.michelinStars !== null) {
          michelinStars = aiData.michelinStars;
        }
      } catch (error) {
        console.log('Could not determine Michelin stars:', error);
      }

      // Parse address components properly
      const addressParts = place.formatted_address.split(',').map(part => part.trim());
      let city = '';
      let country = '';
      if (addressParts.length >= 2) {
        const lastPart = addressParts[addressParts.length - 1];
        const secondLastPart = addressParts[addressParts.length - 2];
        if (lastPart.match(/^(USA|United States|US)$/i)) {
          country = 'United States';
          city = addressParts[1] || '';
        } else if (lastPart.length <= 4 && /^\d/.test(lastPart)) {
          country = secondLastPart;
          city = addressParts[addressParts.length - 3] || '';
        } else {
          country = lastPart;
          city = secondLastPart || '';
        }
      }

      const restaurantFormData = {
        name: place.name,
        address: place.formatted_address.split(',')[0]?.trim() || place.formatted_address,
        city: city,
        country: country,
        cuisine: aiCuisine || place.types.filter(type => !['establishment', 'point_of_interest', 'food'].includes(type))[0] || 'restaurant',
        rating: undefined,
        categoryRatings: undefined,
        useWeightedRating: false,
        priceRange: place.price_level,
        michelinStars: michelinStars,
        notes: `Added from Global Search`,
        dateVisited: '',
        photos: [],
        isWishlist: true
      };
      await addRestaurant(restaurantFormData);
      toast.success('Added to wishlist!');
    } catch (error: any) {
      console.error('Error adding to wishlist:', error);
      toast.error(`Failed to add to wishlist: ${error.message}`);
    }
  };

  const handleAddToRatings = async () => {
    if (!user) {
      toast.error('Please sign in to add ratings');
      return;
    }

    // Show loading and enhance data with AI
    toast.info('Analyzing restaurant with AI...');
    try {
      const enhanced = await getAIEnhancedRestaurantData();
      setEnhancedRestaurantData(enhanced);
      setIsRestaurantDialogOpen(true);
    } catch (error) {
      console.error('Error enhancing restaurant data:', error);
      toast.error('Failed to analyze restaurant, but you can still add it manually');
      setIsRestaurantDialogOpen(true);
    }
  };

  const handleRestaurantFormSubmit = async (data: RestaurantFormData) => {
    try {
      await addRestaurant(data);
      toast.success('Restaurant added to your ratings!');
      setIsRestaurantDialogOpen(false);
    } catch (error: any) {
      console.error('Error adding restaurant:', error);
      toast.error(`Failed to add restaurant: ${error.message || 'Unknown error'}`);
    }
  };

  // Create AI-enhanced restaurant data for the form
  const getAIEnhancedRestaurantData = async () => {
    console.log('Enhancing restaurant data with AI...');

    // Parse address components
    const addressParts = place.formatted_address.split(',').map(part => part.trim());
    let city = '';
    let country = '';
    if (addressParts.length >= 2) {
      const lastPart = addressParts[addressParts.length - 1];
      const secondLastPart = addressParts[addressParts.length - 2];
      if (lastPart.match(/^(USA|United States|US)$/i)) {
        country = 'United States';
        city = addressParts[1] || '';
      } else if (lastPart.length <= 4 && /^\d/.test(lastPart)) {
        country = secondLastPart;
        city = addressParts[addressParts.length - 3] || '';
      } else {
        country = lastPart;
        city = secondLastPart || '';
      }
    }

    // Use AI to determine Michelin stars - keep it optional
    let michelinStars = undefined;
    let enhancedCuisine = aiCuisine;
    let enhancedPriceRange = place.price_level;
    try {
      // Get Michelin stars using AI
      const { data: michelinData } = await supabase.functions.invoke('ai-michelin-detector', {
        body: {
          name: place.name,
          address: place.formatted_address,
          city: city,
          country: country,
          cuisine: aiCuisine || place.types.filter(type => !['establishment', 'point_of_interest', 'food'].includes(type))[0] || 'restaurant',
          notes: `${place.name} - Google rating: ${place.rating || 'N/A'}`
        }
      });
      if (michelinData && michelinData.michelinStars !== null && michelinData.michelinStars !== undefined) {
        // Only set if AI actually detected Michelin stars (not 0)
        michelinStars = michelinData.michelinStars > 0 ? michelinData.michelinStars : undefined;
        console.log('AI detected Michelin stars:', michelinStars);
      }
    } catch (error) {
      console.log('Could not determine Michelin stars with AI:', error);
    }
    
    return {
      name: place.name,
      address: place.formatted_address.split(',')[0]?.trim() || place.formatted_address,
      city: city,
      country: country,
      cuisine: enhancedCuisine || place.types.filter(type => !['establishment', 'point_of_interest', 'food'].includes(type))[0] || 'restaurant',
      priceRange: enhancedPriceRange || undefined,
      michelinStars: michelinStars,
      notes: '',
      latitude: place.geometry?.location?.lat || undefined,
      longitude: place.geometry?.location?.lng || undefined,
      website: place.website || undefined,
      phone_number: place.formatted_phone_number || undefined,
      openingHours: place.opening_hours?.weekday_text?.join('\n') || undefined,
      photos: [],
      isWishlist: false
    };
  };

  // Transform place data to unified format
  const unifiedRestaurant = {
    id: place.place_id,
    name: place.name,
    address: place.formatted_address,
    city: place.formatted_address.split(',').slice(-2, -1)[0]?.trim() || '',
    country: place.formatted_address.split(',').slice(-1)[0]?.trim() || '',
    cuisine: aiCuisine || place.types.filter(type => !['establishment', 'point_of_interest', 'food'].includes(type))[0] || 'restaurant',
    rating: place.rating,
    priceRange: place.price_level,
    latitude: place.geometry?.location?.lat,
    longitude: place.geometry?.location?.lng,
    website: place.website,
    phone_number: place.formatted_phone_number,
    openingHours: place.opening_hours?.weekday_text?.join('\n'),
    photos: place.photos?.map(photo => `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${import.meta.env.VITE_GOOGLE_PLACES_API_KEY}`),
    google_rating: place.rating,
    google_user_ratings_total: place.user_ratings_total,
    google_opening_hours: place.opening_hours,
    google_reviews: place.reviews,
    yelpData: place.yelpData,
    isGooglePlace: true,
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
          <UnifiedRestaurantDetails
            restaurant={unifiedRestaurant}
            onBack={onClose}
            showBackButton={false}
            onToggleWishlist={handleAddToWishlist}
            onAddRating={handleAddToRatings}
            canAddToWishlist={true}
          />
        </DialogContent>
      </Dialog>
      {isRestaurantDialogOpen && (
        <RestaurantDialog 
          isOpen={isRestaurantDialogOpen}
          onOpenChange={setIsRestaurantDialogOpen}
          restaurant={enhancedRestaurantData}
          onSave={handleRestaurantFormSubmit}
          dialogType="add"
        />
      )}
    </>
  );
}
