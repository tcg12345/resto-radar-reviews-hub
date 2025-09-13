import { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from 'react';
import { Restaurant, RestaurantFormData, CategoryRating } from '@/types/restaurant';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { resolveImageUrl } from '@/utils/imageUtils';

interface DbRestaurant {
  id: string;
  name: string;
  address: string;
  city: string;
  country?: string | null;
  cuisine: string;
  rating: number | null;
  notes: string | null;
  date_visited: string | null;
  photos: string[];
  photo_captions: string[] | null;
  photo_dish_names: string[] | null;
  photo_notes: string[] | null;
  is_wishlist: boolean;
  latitude: number | null;
  longitude: number | null;
  category_ratings: Json;
  use_weighted_rating: boolean;
  price_range: number | null;
  michelin_stars: number | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  opening_hours: string | null;
  website: string | null;
  phone_number: string | null;
  reservable: boolean | null;
  reservation_url: string | null;
}

interface RestaurantContextType {
  restaurants: Restaurant[];
  addRestaurant: (data: RestaurantFormData) => Promise<string>;
  updateRestaurant: (id: string, data: RestaurantFormData, suppressToast?: boolean) => Promise<void>;
  deleteRestaurant: (id: string) => void;
  getRestaurant: (id: string) => Restaurant | undefined;
  loadRestaurantPhotos: (id: string) => Promise<void>;
  loadAllRestaurantPhotos: () => Promise<void>;
  isLoading: boolean;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

interface RestaurantProviderProps {
  children: ReactNode;
}

const mapDbRestaurantToRestaurant = (dbRestaurant: DbRestaurant): Restaurant => ({
  id: dbRestaurant.id,
  name: dbRestaurant.name,
  address: dbRestaurant.address,
  city: dbRestaurant.city,
  country: dbRestaurant.country ?? undefined,
  cuisine: dbRestaurant.cuisine,
  rating: dbRestaurant.rating ?? undefined,
  notes: dbRestaurant.notes ?? undefined,
  dateVisited: dbRestaurant.date_visited ?? undefined,
  photos: dbRestaurant.photos,
    photoDishNames: dbRestaurant.photo_dish_names || [],
    photoNotes: dbRestaurant.photo_notes || [],
  isWishlist: dbRestaurant.is_wishlist,
  latitude: dbRestaurant.latitude ?? undefined,
  longitude: dbRestaurant.longitude ?? undefined,
  categoryRatings: dbRestaurant.category_ratings ? dbRestaurant.category_ratings as unknown as CategoryRating : undefined,
  useWeightedRating: dbRestaurant.use_weighted_rating,
  priceRange: dbRestaurant.price_range ?? undefined,
  michelinStars: dbRestaurant.michelin_stars ?? undefined,
  createdAt: dbRestaurant.created_at,
  updatedAt: dbRestaurant.updated_at,
  userId: dbRestaurant.user_id,
  openingHours: dbRestaurant.opening_hours ?? undefined,
  website: dbRestaurant.website ?? undefined,
  phone_number: dbRestaurant.phone_number ?? undefined,
  reservable: dbRestaurant.reservable ?? undefined,
  reservationUrl: dbRestaurant.reservation_url ?? undefined,
});

export function RestaurantProvider({ children }: RestaurantProviderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [photosHydrated, setPhotosHydrated] = useState(false);

  // Load restaurants from Supabase
  useEffect(() => {
    let isSubscribed = true;
    
    const loadRestaurants = async () => {
      if (!isSubscribed) return;
      
      setIsLoading(true);
      try {
        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && isSubscribed) {
          // User is authenticated, fetch their restaurants with optimized query (excluding photos for faster loading)
          const { data, error } = await supabase
            .from('restaurants')
            .select('id, name, address, city, country, cuisine, rating, notes, date_visited, is_wishlist, latitude, longitude, category_ratings, use_weighted_rating, price_range, michelin_stars, created_at, updated_at, user_id, opening_hours, website, phone_number, reservable, reservation_url, photo_dish_names, photo_notes')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

          if (error) throw error;
          
          if (isSubscribed) {
            setRestaurants((data || []).map(restaurant => mapDbRestaurantToRestaurant({
              ...restaurant,
              photos: [], // Initialize with empty array, load photos lazily when needed
              photo_captions: [],
              photo_dish_names: restaurant.photo_dish_names || [],
              photo_notes: restaurant.photo_notes || []
            })));
          }
        } else if (isSubscribed) {
          // User is not authenticated, show empty list
          setRestaurants([]);
          console.log('User not authenticated. Please sign in to view your restaurants.');
        }
      } catch (error) {
        if (isSubscribed) {
          console.error('Error loading restaurants:', error);
          toast.error('Failed to load restaurants');
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    loadRestaurants();
    
    // Set up auth state listener to reload restaurants when auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        loadRestaurants();
      }
    });
    
    // Set up real-time subscription for restaurant changes - but handle updates intelligently
    const channel = supabase
      .channel('restaurants-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'restaurants'
        },
        (payload) => {
          console.log('Real-time restaurant change:', payload);
          
          // Handle changes efficiently without full reload
          if (payload.eventType === 'INSERT' && payload.new) {
            const newRestaurant = mapDbRestaurantToRestaurant(payload.new as DbRestaurant);
            setRestaurants(prev => [newRestaurant, ...prev]);
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedRestaurant = mapDbRestaurantToRestaurant(payload.new as DbRestaurant);
            setRestaurants(prev => 
              prev.map(r => r.id === updatedRestaurant.id ? updatedRestaurant : r)
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setRestaurants(prev => 
              prev.filter(r => r.id !== (payload.old as DbRestaurant).id)
            );
          }
        }
      )
      .subscribe();
    
    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  // Convert File objects to compressed data URLs
  const convertPhotosToDataUrls = useCallback(async (
    photos: File[], 
    onProgress?: (processed: number, total: number) => void
  ): Promise<string[]> => {
    const { processImagesInParallel } = await import('@/utils/imageUtils');
    
    return processImagesInParallel(photos, {
      maxWidth: 640,
      maxHeight: 640,
      quality: 0.5,
      format: 'jpeg'
    }, onProgress);
  }, []);

  // Helper: dataURL -> Blob for storage upload
  const dataUrlToBlob = (dataUrl: string): Blob => {
    const [header, base64] = dataUrl.split(',');
    const mimeMatch = header.match(/data:(.*?);base64/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  };

  // Upload compressed photos to Supabase Storage (reuse 'avatars' bucket)
  const uploadCompressedPhotos = useCallback(async (
    files: File[],
    userId: string,
    onProgress?: (processed: number, total: number) => void
  ): Promise<string[]> => {
    if (files.length === 0) return [];
    
    console.log('Converting', files.length, 'photos to data URLs');
    
    // For large photo sets, process in smaller chunks
    const chunkSize = files.length > 10 ? 1 : 3;
    const dataUrls: string[] = [];
    
    for (let i = 0; i < files.length; i += chunkSize) {
      const chunk = files.slice(i, i + chunkSize);
      const chunkUrls = await convertPhotosToDataUrls(chunk, (processed) => {
        onProgress?.(i + processed, files.length);
      });
      dataUrls.push(...chunkUrls);
      
      // Add delay between chunks for large uploads
      if (files.length > 5 && i + chunkSize < files.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log('Successfully converted photos to data URLs');
    
    const urls: string[] = [];
    for (let i = 0; i < dataUrls.length; i++) {
      try {
        const blob = dataUrlToBlob(dataUrls[i]);
        const fileName = `restaurant-photos/${userId}/${Date.now()}-${i}.jpg`;
        
        console.log(`Uploading photo ${i + 1}/${dataUrls.length}:`, fileName);
        
        // Add timeout for upload
        const uploadPromise = supabase.storage
          .from('avatars')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            upsert: true
          });
          
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Upload timeout')), 30000)
        );
        
        const result = await Promise.race([uploadPromise, timeoutPromise]);
        const uploadError = result.error;
          
        if (uploadError) {
          console.error(`Upload error for photo ${i + 1}:`, uploadError);
          throw uploadError;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
        
        urls.push(publicUrl);
        console.log(`Successfully uploaded photo ${i + 1}:`, publicUrl);
        
        // Add delay between uploads for large sets
        if (files.length > 5 && i < dataUrls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Failed to upload photo ${i + 1}:`, error);
        // For large uploads, continue with other photos instead of failing completely
        if (files.length > 5) {
          console.warn(`Skipping failed photo ${i + 1}, continuing with others`);
          continue;
        }
        throw error;
      }
    }
    return urls;
  }, [convertPhotosToDataUrls]);
  // Geocode the address using the edge function
  const geocodeAddress = useCallback(async (address: string, city: string): Promise<{ latitude: number, longitude: number, country?: string } | null> => {
    try {
      console.log('Attempting to geocode:', address, city);
      
      const { data, error } = await supabase.functions.invoke('geocode', {
        body: { address, city }
      });

      if (error) {
        console.error('Geocoding error:', error);
        return null;
      }

      if (data && data.latitude && data.longitude) {
        console.log('Geocoding successful:', data);
        return { latitude: data.latitude, longitude: data.longitude, country: data.country };
      }
      
      console.log('No coordinates returned from geocoding');
      return null;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }, []);

  const addRestaurant = useCallback(async (data: RestaurantFormData): Promise<string> => {
    try {
      setIsLoading(true);
      
      // Get current user and ensure authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Failed to get user session');
      }
      
      if (!session?.user) {
        console.error('No authenticated user found');
        throw new Error('Authentication required to add restaurants');
      }
      
      console.log('Adding restaurant with user_id:', session.user.id);
      
      // Upload photos to storage (compressed) - add timeout and retry logic
      console.log('Starting photo upload for', data.photos.length, 'photos');
      let uploadedPhotoUrls: string[] = [];
      
      if (data.photos.length > 0) {
        try {
          uploadedPhotoUrls = await uploadCompressedPhotos(data.photos, session.user.id, (processed, total) => {
            console.log(`Uploading photos: ${processed}/${total}`);
          });
          console.log('Successfully uploaded', uploadedPhotoUrls.length, 'photos');
        } catch (uploadError) {
          console.error('Photo upload failed:', uploadError);
          // Allow restaurant creation without photos if upload fails
          uploadedPhotoUrls = [];
          console.log('Proceeding without photos due to upload failure');
        }
      }
      
      // Geocode the address using the edge function
      let coordinates = null;
      if (data.address && data.city) {
        coordinates = await geocodeAddress(data.address, data.city);
      }
      
      // Create new restaurant object
      const newRestaurant = {
        name: data.name,
        address: data.address,
        city: data.city,
        country: coordinates?.country ?? null,
        cuisine: data.cuisine,
        rating: data.rating ?? null,
        notes: data.notes ?? null,
        date_visited: data.dateVisited ? data.dateVisited : null,
        photos: uploadedPhotoUrls,
        photo_dish_names: data.photoDishNames || [],
        photo_captions: data.photoNotes || [],
        is_wishlist: data.isWishlist,
        latitude: coordinates?.latitude ?? null,
        longitude: coordinates?.longitude ?? null,
        category_ratings: data.categoryRatings as unknown as Json,
        use_weighted_rating: data.useWeightedRating,
        price_range: data.priceRange ?? null,
        michelin_stars: data.michelinStars ?? null,
        website: (data as any).website ?? null,
        phone_number: (data as any).phone_number ?? null,
        opening_hours: (data as any).openingHours ?? null,
        reservable: (data as any).reservable ?? null,
        reservation_url: (data as any).reservation_url ?? null,
        user_id: session.user.id,
      };
      
      console.log('About to insert restaurant data:', { 
        ...newRestaurant, 
        photos: `[${newRestaurant.photos.length} photos]` 
      });
      
      // Refresh session before database insert to ensure auth token is valid
      const { data: { session: freshSession }, error: refreshError } = await supabase.auth.getSession();
      if (refreshError || !freshSession?.user) {
        console.error('Session refresh failed:', refreshError);
        throw new Error('Authentication expired. Please sign in again.');
      }
      
      console.log('Session refreshed, proceeding with database insert for user:', freshSession.user.id);
      
      const { data: inserted, error } = await supabase
        .from('restaurants')
        .insert(newRestaurant)
        .select()
        .single();

      if (error) {
        console.error('Database insert error:', error);
        console.error('Error details:', { 
          message: error.message, 
          details: error.details, 
          hint: error.hint,
          code: error.code 
        });
        throw error;
      }
      
      const restaurant = mapDbRestaurantToRestaurant(inserted);
      setRestaurants((prev) => [restaurant, ...prev]);
      
      // Add restaurant to selected lists
      if (data.selectedListIds && data.selectedListIds.length > 0) {
        try {
          for (const listId of data.selectedListIds) {
            const { error: listError } = await supabase
              .from('restaurant_list_items')
              .insert({
                restaurant_id: inserted.id,
                list_id: listId
              });
            
            if (listError) {
              console.error('Error adding restaurant to list:', listError);
              // Continue with other lists even if one fails
            }
          }
          console.log('Restaurant added to', data.selectedListIds.length, 'lists');
        } catch (listError) {
          console.error('Error adding restaurant to lists:', listError);
          // Don't fail the whole operation if list assignment fails
        }
      }
      
      console.log('Final coordinates for restaurant:', coordinates);
      
      if (coordinates && coordinates.latitude && coordinates.longitude) {
        toast.success('Restaurant added and placed on map!');
      } else if (data.address && data.city) {
        toast.warning('Restaurant added but couldn\'t be placed on map. Check your Mapbox token in the Map tab.');
      } else {
        toast.success('Restaurant added successfully!');
      }

      return inserted.id;
    } catch (error) {
      console.error('Error adding restaurant:', error);
      toast.error('Failed to add restaurant.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [uploadCompressedPhotos, geocodeAddress]);

  const updateRestaurant = useCallback(async (id: string, data: RestaurantFormData, suppressToast = false) => {
    try {
      setIsLoading(true);
      
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Authentication required to update restaurants');
      }
      
      // Find existing restaurant
      const existingRestaurant = restaurants.find((r) => r.id === id);
      if (!existingRestaurant) {
        throw new Error('Restaurant not found');
      }
      
      // Upload new photos to storage (compressed)
      const newPhotoUrls = await uploadCompressedPhotos(data.photos, session.user.id, (processed, total) => {
        console.log(`Uploading updated photos: ${processed}/${total}`);
      });
      
      // Handle photo removal and combine with new photos
      let updatedPhotos = [...existingRestaurant.photos];
      let updatedDishNames = [...(existingRestaurant.photoDishNames || [])];
      let updatedNotes = [...(existingRestaurant.photoNotes || [])];
      
      // Remove photos and captions that were marked for deletion (in reverse order to maintain correct indexes)
      if (data.removedPhotoIndexes && data.removedPhotoIndexes.length > 0) {
        const sortedIndexes = [...data.removedPhotoIndexes].sort((a, b) => b - a);
        sortedIndexes.forEach(index => {
          if (index >= 0 && index < updatedPhotos.length) {
            updatedPhotos.splice(index, 1);
            updatedDishNames.splice(index, 1);
            updatedNotes.splice(index, 1);
          }
        });
      }
      
      // Add new photos and captions
      const combinedPhotos = [...updatedPhotos, ...newPhotoUrls];
      const combinedDishNames = [...updatedDishNames, ...(data.photoDishNames || [])];
      const combinedNotes = [...updatedNotes, ...(data.photoNotes || [])];
      try {
        const approxSizeKb = Math.round(combinedPhotos.reduce((acc, s) => acc + (s?.length || 0), 0) / 1024);
        console.debug('[updateRestaurant] combined photos count/sizeKB', combinedPhotos.length, approxSizeKb);
      } catch {}
      // Geocode the address if it changed using the edge function
      let coordinates = {
        latitude: existingRestaurant.latitude,
        longitude: existingRestaurant.longitude,
        country: existingRestaurant.country,
      };
      
      if (
        (data.address !== existingRestaurant.address || data.city !== existingRestaurant.city) &&
        data.address && data.city
      ) {
        const newCoordinates = await geocodeAddress(data.address, data.city);
        if (newCoordinates) {
          coordinates = {
            latitude: newCoordinates.latitude,
            longitude: newCoordinates.longitude,
            country: newCoordinates.country || existingRestaurant.country,
          };
          console.log('Successfully geocoded updated address to:', coordinates);
        }
      }
      
      // Update restaurant in Supabase
const { data: updated, error } = await supabase
        .from('restaurants')
        .update({
          name: data.name,
          address: data.address,
          city: data.city,
          country: coordinates.country ?? null,
          cuisine: data.cuisine,
          rating: data.rating ?? null,
          notes: data.notes ?? null,
          date_visited: data.dateVisited ? data.dateVisited : null,
          photos: combinedPhotos,
          photo_dish_names: combinedDishNames,
          photo_notes: combinedNotes,
          is_wishlist: data.isWishlist,
          latitude: coordinates.latitude ?? null,
          longitude: coordinates.longitude ?? null,
          category_ratings: data.categoryRatings as unknown as Json,
          use_weighted_rating: data.useWeightedRating,
          price_range: data.priceRange ?? null,
          michelin_stars: data.michelinStars ?? null,
          website: (data as any).website ?? null,
          phone_number: (data as any).phone_number ?? null,
          opening_hours: (data as any).openingHours ?? null,
          reservable: (data as any).reservable ?? null,
          reservation_url: (data as any).reservation_url ?? null,
        })
        .eq('id', id)
        .select('id, updated_at')
        .single();

      if (error) throw error;

      // Build updated restaurant locally to avoid returning huge payloads
      const restaurant = {
        ...existingRestaurant,
        name: data.name,
        address: data.address,
        city: data.city,
        country: coordinates.country ?? undefined,
        cuisine: data.cuisine,
        rating: data.rating ?? undefined,
        notes: data.notes ?? undefined,
        dateVisited: data.dateVisited ? data.dateVisited : undefined,
        photos: combinedPhotos,
        photoDishNames: combinedDishNames,
        photoNotes: combinedNotes,
        isWishlist: data.isWishlist,
        latitude: coordinates.latitude ?? undefined,
        longitude: coordinates.longitude ?? undefined,
        categoryRatings: data.categoryRatings as unknown as CategoryRating,
        useWeightedRating: data.useWeightedRating,
        priceRange: data.priceRange ?? undefined,
        michelinStars: data.michelinStars ?? undefined,
        website: (data as any).website ?? undefined,
        phone_number: (data as any).phone_number ?? undefined,
        openingHours: (data as any).openingHours ?? undefined,
        reservable: (data as any).reservable ?? undefined,
        reservationUrl: (data as any).reservation_url ?? undefined,
        updatedAt: updated?.updated_at || existingRestaurant.updatedAt,
      } as Restaurant;

      // Update local state
      setRestaurants((prev) => prev.map((r) => (r.id === id ? restaurant : r)));
      
      if (!suppressToast) {
        if (coordinates.latitude && coordinates.longitude) {
          toast.success('Restaurant updated and placed on map!');
        } else if (data.address && data.city) {
          toast.warning('Restaurant updated but couldn\'t be placed on map. Check your Mapbox token in the Map tab.');
        } else {
          toast.success('Restaurant updated successfully!');
        }
      }
    } catch (error) {
      console.error('Error updating restaurant:', error);
      toast.error('Failed to update restaurant.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurants, convertPhotosToDataUrls, geocodeAddress]);

  const deleteRestaurant = useCallback(async (id: string) => {
    try {
      console.log('Deleting restaurant with id:', id);
      
      const { error } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log('Restaurant deleted from database, updating local state');
      setRestaurants((prev) => {
        const filtered = prev.filter((restaurant) => restaurant.id !== id);
        console.log('Updated restaurants count:', filtered.length);
        return filtered;
      });
      
      toast.success('Restaurant deleted successfully!');
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      toast.error('Failed to delete restaurant.');
    }
  }, []);

  const getRestaurant = useCallback((id: string) => {
    return restaurants.find((restaurant) => restaurant.id === id);
  }, [restaurants]);

  const loadRestaurantPhotos = useCallback(async (id: string): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('photos, photo_dish_names, photo_notes')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setRestaurants(prev => 
          prev.map(restaurant => 
            restaurant.id === id 
              ? { 
                  ...restaurant, 
                  photos: data.photos || [],
                  photoDishNames: data.photo_dish_names || [],
                  photoNotes: data.photo_notes || []
                }
              : restaurant
          )
        );
      }
    } catch (error) {
      console.error('Error loading restaurant photos:', error);
    }
  }, []);

  const loadAllRestaurantPhotos = useCallback(async (): Promise<void> => {
    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Load photos for all restaurants where photos are empty
      const restaurantIds = restaurants
        .filter(r => r.photos.length === 0)
        .map(r => r.id);

      if (restaurantIds.length === 0) return;

      // Use batching to avoid loading too many at once
      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < restaurantIds.length; i += batchSize) {
        batches.push(restaurantIds.slice(i, i + batchSize));
      }

      // Process batches sequentially to avoid overwhelming the database
      for (const batch of batches) {
        const { data, error } = await supabase
          .from('restaurants')
          .select('id, photos, photo_dish_names, photo_notes')
          .in('id', batch);

        if (error) throw error;

        if (data && data.length > 0) {
          setRestaurants(prev => 
            prev.map(restaurant => {
              const photoData = data.find(d => d.id === restaurant.id);
              return photoData 
                ? { 
                    ...restaurant, 
                    photos: photoData.photos || [],
                    photoDishNames: photoData.photo_dish_names || [],
                    photoNotes: photoData.photo_notes || []
                  }
                : restaurant;
            })
          );
        }
      }
    } catch (error) {
      console.error('Error loading all restaurant photos:', error);
    }
  }, [restaurants]);

  const value = useMemo(
    () => ({
      restaurants,
      addRestaurant,
      updateRestaurant,
      deleteRestaurant,
      getRestaurant,
      loadRestaurantPhotos,
      loadAllRestaurantPhotos,
      isLoading,
    }),
    [restaurants, addRestaurant, updateRestaurant, deleteRestaurant, getRestaurant, loadRestaurantPhotos, loadAllRestaurantPhotos, isLoading]
  );

  return <RestaurantContext.Provider value={value}>{children}</RestaurantContext.Provider>;
}

export function useRestaurants() {
  const context = useContext(RestaurantContext);
  
  if (context === undefined) {
    throw new Error('useRestaurants must be used within a RestaurantProvider');
  }
  
  return context;
}