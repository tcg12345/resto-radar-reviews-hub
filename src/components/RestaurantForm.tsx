import { useState, useEffect } from 'react';
import { PlusCircle, Trash2, Calendar, MapPin, Camera, Images, Monitor, Upload, Search, Loader, Sparkles, Star } from 'lucide-react';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { WeightedRating } from '@/components/WeightedRating';
import { StarRating } from '@/components/StarRating';
import { PriceRange } from '@/components/PriceRange';
import { MichelinStars } from '@/components/MichelinStars';
import { format } from 'date-fns';
import { Restaurant, RestaurantFormData, CategoryRating } from '@/types/restaurant';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { LazyImage } from '@/components/LazyImage';
import { createThumbnail } from '@/utils/imageUtils';
import { RestaurantSearchSelect } from '@/components/RestaurantSearchSelect';
import { toast } from 'sonner';

interface RestaurantFormProps {
  initialData?: Restaurant;
  onSubmit: (data: RestaurantFormData) => void;
  onCancel: () => void;
  defaultWishlist?: boolean;
}

const cuisineOptions = [
  'American', 'Asian', 'Brazilian', 'Chinese', 'Classic', 'French', 'French Steakhouse',
  'Greek', 'Indian', 'Italian', 'Japanese', 'Korean', 'Mediterranean', 'Mexican', 
  'Modern', 'Seafood', 'Spanish', 'Steakhouse', 'Thai', 'Vietnamese'
].sort();

// Add "Other" at the end
cuisineOptions.push('Other');

export function RestaurantForm({ initialData, onSubmit, onCancel, defaultWishlist = false }: RestaurantFormProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [photoProgress, setPhotoProgress] = useState(0);
  const [photosToProcess, setPhotosToProcess] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isCustomCuisineDialogOpen, setIsCustomCuisineDialogOpen] = useState(false);
  const [customCuisineInput, setCustomCuisineInput] = useState('');
  const [removedPhotoIndexes, setRemovedPhotoIndexes] = useState<number[]>([]);
  const [draggedPhotoIndex, setDraggedPhotoIndex] = useState<number | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupName, setLookupName] = useState('');
  const [lookupCity, setLookupCity] = useState('');
  const [autoGeneratePhotos, setAutoGeneratePhotos] = useState(false);
  const [isGeneratingPhotos, setIsGeneratingPhotos] = useState(false);
  const [customCuisine, setCustomCuisine] = useState(() => {
    // Initialize with custom cuisine if initial data has a cuisine not in the predefined list
    if (initialData?.cuisine && !cuisineOptions.includes(initialData.cuisine)) {
      return initialData.cuisine;
    }
    return '';
  });
  
  useEffect(() => {
    // Detect if we're on a mobile device
    const checkIsMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /iphone|ipad|android|mobile/.test(userAgent);
      setIsMobile(isMobileDevice);
    };
    
    checkIsMobile();
  }, []);

  const [formData, setFormData] = useState<RestaurantFormData>({
    name: initialData?.name || '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    cuisine: initialData?.cuisine || '',
    rating: initialData?.rating,
    categoryRatings: initialData?.categoryRatings,
    useWeightedRating: initialData?.useWeightedRating || false,
    priceRange: initialData?.priceRange,
    michelinStars: initialData?.michelinStars,
    notes: initialData?.notes || '',
    dateVisited: initialData?.dateVisited || '',
    photos: [],
    isWishlist: initialData?.isWishlist || defaultWishlist,
    // Include Google Places data when editing existing restaurants
    ...(initialData && {
      website: (initialData as any).website,
      phone_number: (initialData as any).phone_number,
      latitude: (initialData as any).latitude,
      longitude: (initialData as any).longitude,
      opening_hours: (initialData as any).opening_hours,
      reservable: (initialData as any).reservable,
      reservation_url: (initialData as any).reservation_url,
    })
  });

  const [date, setDate] = useState<Date | undefined>(
    formData.dateVisited ? new Date(formData.dateVisited) : undefined
  );

  const [previewImages, setPreviewImages] = useState<string[]>(initialData?.photos || []);

  const sanitizeInput = (input: string, maxLength: number = 255) => {
    return input
      .trim()
      .replace(/[<>'"]/g, '') // Remove potential XSS characters
      .substring(0, maxLength); // Limit length
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    // Input validation and sanitization
    let sanitizedValue = value;
    
    switch (name) {
      case 'name':
        sanitizedValue = sanitizeInput(value, 100);
        break;
      case 'address':
        sanitizedValue = sanitizeInput(value, 200);
        break;
      case 'city':
        sanitizedValue = sanitizeInput(value, 50);
        break;
      case 'cuisine':
        sanitizedValue = sanitizeInput(value, 50);
        break;
      case 'notes':
        sanitizedValue = sanitizeInput(value, 1000);
        break;
      default:
        sanitizedValue = sanitizeInput(value);
    }
    
    setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
  };

  const handleRatingChange = (categoryRatings: CategoryRating, weightedRating: number) => {
    setFormData(prev => ({ 
      ...prev, 
      categoryRatings,
      rating: weightedRating
    }));
  };

  const handleDateChange = (newDate: Date | undefined) => {
    setDate(newDate);
    if (newDate) {
      setFormData(prev => ({
        ...prev,
        dateVisited: newDate.toISOString(),
      }));
    }
  };

  const handleWishlistToggle = () => {
    setFormData(prev => {
      const isWishlist = !prev.isWishlist;
      // If toggling to wishlist, remove rating and date
      if (isWishlist) {
        return {
          ...prev,
          isWishlist,
          rating: undefined,
          dateVisited: '',
        };
      }
      return { ...prev, isWishlist };
    });
    if (!formData.isWishlist) {
      setDate(undefined);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const newFiles = Array.from(e.target.files);
    const maxPhotos = 50; // Set a reasonable limit
    
    if (formData.photos.length + newFiles.length > maxPhotos) {
      toast.error(`Maximum ${maxPhotos} photos allowed`);
      return;
    }
    
    if (newFiles.length > 10) {
      toast.warning('Processing large number of photos. This may take a moment...');
    }
    
    setIsProcessingPhotos(true);
    setPhotosToProcess(newFiles.length);
    setPhotoProgress(0);
    
    try {
      // Process in smaller batches to prevent UI blocking
      const batchSize = 3;
      const newPreviews: string[] = [];
      
      for (let i = 0; i < newFiles.length; i += batchSize) {
        const batch = newFiles.slice(i, i + batchSize);
        const batchPreviews = await Promise.all(
          batch.map(file => createThumbnail(file))
        );
        newPreviews.push(...batchPreviews);
        
        setPhotoProgress(Math.round(((i + batch.length) / newFiles.length) * 100));
        
        // Small delay to prevent UI blocking
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, ...newFiles],
      }));
      
      setPreviewImages(prev => [...prev, ...newPreviews]);
      
      if (newFiles.length > 5) {
        toast.success(`${newFiles.length} photos added successfully!`);
      }
    } catch (error) {
      console.error('Error processing photos:', error);
      toast.error('Failed to process some photos');
    } finally {
      setIsProcessingPhotos(false);
      setPhotoProgress(0);
      setPhotosToProcess(0);
    }
  };

  const addPhotoFromGallery = async () => {
    try {
      setIsProcessingPhotos(true);
      setPhotosToProcess(1);
      setPhotoProgress(0);
      
      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
      });

      if (image.dataUrl) {
        // Convert data URL to File object
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });

        // Create thumbnail for quick preview
        const thumbnail = await createThumbnail(file);
        setPhotoProgress(100);

        setFormData(prev => ({
          ...prev,
          photos: [...prev.photos, file],
        }));

        setPreviewImages(prev => [...prev, thumbnail]);
      }
    } catch (error) {
      console.error('Error selecting photo from gallery:', error);
    } finally {
      setIsProcessingPhotos(false);
      setPhotoProgress(0);
      setPhotosToProcess(0);
    }
  };

  const takePhoto = async () => {
    try {
      setIsProcessingPhotos(true);
      setPhotosToProcess(1);
      setPhotoProgress(0);
      
      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      if (image.dataUrl) {
        // Convert data URL to File object
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });

        // Create thumbnail for quick preview
        const thumbnail = await createThumbnail(file);
        setPhotoProgress(100);

        setFormData(prev => ({
          ...prev,
          photos: [...prev.photos, file],
        }));

        setPreviewImages(prev => [...prev, thumbnail]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
    } finally {
      setIsProcessingPhotos(false);
      setPhotoProgress(0);
      setPhotosToProcess(0);
    }
  };

  const removePhoto = (index: number) => {
    const existingPhotosCount = initialData?.photos.length || 0;
    
    // Remove from preview images
    setPreviewImages(prev => prev.filter((_, i) => i !== index));
    
    if (index < existingPhotosCount) {
      // This is an existing photo - track it for removal
      setRemovedPhotoIndexes(prev => [...prev, index]);
    } else {
      // This is a new photo - remove from form data
      const adjustedIndex = index - existingPhotosCount;
      setFormData(prev => ({
        ...prev,
        photos: prev.photos.filter((_, i) => i !== adjustedIndex),
      }));
    }
  };

  const reorderPhotos = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    
    // Reorder preview images
    setPreviewImages(prev => {
      const newImages = [...prev];
      const [movedImage] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, movedImage);
      return newImages;
    });
    
    // Reorder form data photos for new photos
    const existingPhotosCount = initialData?.photos.length || 0;
    if (fromIndex >= existingPhotosCount || toIndex >= existingPhotosCount) {
      setFormData(prev => {
        const newPhotos = [...prev.photos];
        
        // Handle moving new photos only
        if (fromIndex >= existingPhotosCount && toIndex >= existingPhotosCount) {
          const fromPhotoIndex = fromIndex - existingPhotosCount;
          const toPhotoIndex = toIndex - existingPhotosCount;
          const [movedPhoto] = newPhotos.splice(fromPhotoIndex, 1);
          newPhotos.splice(toPhotoIndex, 0, movedPhoto);
        }
        
        return { ...prev, photos: newPhotos };
      });
    }
  };

  const handlePhotoDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation(); // Prevent interference with file drop zone
    setDraggedPhotoIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('photo/index', index.toString());
    
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handlePhotoDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    setDraggedPhotoIndex(null);
    
    // Reset visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handlePhotoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handlePhotoDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const fromIndexStr = e.dataTransfer.getData('photo/index');
    const fromIndex = parseInt(fromIndexStr);
    
    if (!isNaN(fromIndex) && fromIndex !== toIndex) {
      reorderPhotos(fromIndex, toIndex);
    }
    
    setDraggedPhotoIndex(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set drag over state for file drops, not photo reordering
    const isPhotoReorder = e.dataTransfer.types.includes('photo/index');
    if (!isPhotoReorder) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only reset drag over state for file drops
    const isPhotoReorder = e.dataTransfer.types.includes('photo/index');
    if (!isPhotoReorder) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if this is a photo reorder operation
    const isPhotoReorder = e.dataTransfer.types.includes('photo/index');
    if (isPhotoReorder) {
      // Let photo drop handlers handle this
      return;
    }
    
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );

    if (files.length === 0) {
      toast.error('Please drop image files only');
      return;
    }

    const maxPhotos = 50;
    if (formData.photos.length + files.length > maxPhotos) {
      toast.error(`Maximum ${maxPhotos} photos allowed`);
      return;
    }

    if (files.length > 10) {
      toast.warning('Processing large number of photos. This may take a moment...');
    }

    setIsProcessingPhotos(true);
    setPhotosToProcess(files.length);
    setPhotoProgress(0);

    try {
      const batchSize = 3;
      const newPreviews: string[] = [];
      
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const batchPreviews = await Promise.all(
          batch.map(file => createThumbnail(file))
        );
        newPreviews.push(...batchPreviews);
        
        setPhotoProgress(Math.round(((i + batch.length) / files.length) * 100));
        
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, ...files],
      }));
      
      setPreviewImages(prev => [...prev, ...newPreviews]);
      
      if (files.length > 1) {
        toast.success(`${files.length} photos added successfully!`);
      }
    } catch (error) {
      console.error('Error processing dropped photos:', error);
      toast.error('Failed to process some photos');
    } finally {
      setIsProcessingPhotos(false);
      setPhotoProgress(0);
      setPhotosToProcess(0);
    }
  };

  const generateRestaurantRating = async (restaurantName: string, restaurantCuisine: string) => {
    setIsGeneratingPhotos(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-restaurant-rating', {
        body: {
          restaurantName,
          cuisine: restaurantCuisine
        }
      });

      if (error) {
        console.error('Rating generation error:', error);
        throw new Error(error.message || 'Failed to generate rating');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate rating');
      }

      // Apply the AI-generated rating to the form
      if (data.rating) {
        setFormData(prev => ({
          ...prev,
          rating: data.rating,
          notes: prev.notes ? `${prev.notes}\n\nAI Research: ${data.reasoning}` : `AI Research: ${data.reasoning}`
        }));

        toast.success(`Found accurate rating: ${data.rating}/10 for ${restaurantName}!`);
      }

    } catch (error) {
      console.error('Error generating rating:', error);
      toast.error(error.message || 'Failed to find restaurant rating');
    } finally {
      setIsGeneratingPhotos(false);
    }
  };

  const handleLookupRestaurant = async () => {
    if (!lookupName.trim()) {
      toast.error('Please enter a restaurant name');
      return;
    }

    setIsLookingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke('restaurant-lookup', {
        body: {
          restaurantName: lookupName.trim(),
          city: lookupCity.trim() || undefined
        }
      });

      if (error) {
        console.error('Lookup error:', error);
        throw new Error(error.message || 'Failed to lookup restaurant');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to lookup restaurant');
      }

      const restaurantInfo = data.data;

      // Auto-fill form with the lookup results
      setFormData(prev => ({
        ...prev,
        name: restaurantInfo.name || prev.name,
        address: restaurantInfo.address || prev.address,
        city: restaurantInfo.city || prev.city,
        cuisine: restaurantInfo.cuisine || prev.cuisine,
        priceRange: restaurantInfo.priceRange || prev.priceRange,
        michelinStars: restaurantInfo.michelinStars || prev.michelinStars,
        notes: restaurantInfo.description ? 
          (prev.notes ? `${prev.notes}\n\n${restaurantInfo.description}` : restaurantInfo.description) 
          : prev.notes
      }));

      // Show success message with confidence level
      if (restaurantInfo.confidence > 70) {
        toast.success(`Restaurant information found! (${restaurantInfo.confidence}% confidence)`);
      } else if (restaurantInfo.confidence > 40) {
        toast.warning(`Some information found, but please verify details. (${restaurantInfo.confidence}% confidence)`);
      } else {
        toast.error(`Could not find reliable information for this restaurant. (${restaurantInfo.confidence}% confidence)`);
      }

      // Generate rating if toggle is enabled
      if (autoGeneratePhotos && restaurantInfo.name && restaurantInfo.cuisine) {
        await generateRestaurantRating(restaurantInfo.name, restaurantInfo.cuisine);
      }

      // Clear lookup fields
      setLookupName('');
      setLookupCity('');

    } catch (error) {
      console.error('Error looking up restaurant:', error);
      toast.error(error.message || 'Failed to lookup restaurant information');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleRestaurantSelect = (placeDetails: any) => {
    try {
      // Extract cuisine type from Google Places types
      const getCuisineFromTypes = (types: string[]) => {
        const cuisineTypes = types.filter(type => 
          !['establishment', 'food', 'point_of_interest', 'restaurant'].includes(type)
        );
        const firstType = cuisineTypes[0];
        if (!firstType) return 'Restaurant';
        
        // Format cuisine type (e.g., 'italian_restaurant' -> 'Italian')
        return firstType
          .split('_')[0]
          .charAt(0).toUpperCase() + firstType.split('_')[0].slice(1);
      };

      // Extract city from formatted address
      const extractCity = (address: string) => {
        const parts = address.split(',');
        if (parts.length >= 2) {
          return parts[parts.length - 2].trim();
        }
        return '';
      };

      // Convert Google Photos to URLs (requires API key for photo reference)
      const convertPhotosToUrls = (photos: any[]) => {
        if (!photos || photos.length === 0) return [];
        
        // For now, we'll skip photos as they require the API key to convert photo references to URLs
        // In a real implementation, you'd use: 
        // `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${API_KEY}`
        return [];
      };

      // Auto-fill the form with Google Places data
      setFormData(prev => ({
        ...prev,
        name: placeDetails.name || prev.name,
        address: placeDetails.formatted_address || prev.address,
        city: extractCity(placeDetails.formatted_address) || prev.city,
        cuisine: getCuisineFromTypes(placeDetails.types) || prev.cuisine,
        priceRange: placeDetails.price_level || prev.priceRange,
        // Store Google Places specific data that will be used in the database
        googlePlaceId: placeDetails.place_id,
        website: placeDetails.website,
        phone_number: placeDetails.formatted_phone_number,
        latitude: placeDetails.geometry?.location?.lat,
        longitude: placeDetails.geometry?.location?.lng,
        openingHours: placeDetails.opening_hours?.weekday_text?.join('\n'),
        googleRating: placeDetails.rating,
        userRatingsTotal: placeDetails.user_ratings_total,
      }));

      // Convert and set photos
      const photoUrls = convertPhotosToUrls(placeDetails.photos);
      if (photoUrls.length > 0) {
        setPreviewImages(prev => [...prev, ...photoUrls]);
      }

      toast.success(`${placeDetails.name} selected! All details auto-filled from Google Places.`);
    } catch (error) {
      console.error('Error processing restaurant selection:', error);
      toast.error('Failed to auto-fill restaurant details');
    }
  };

  const handleCustomCuisineSubmit = () => {
    if (customCuisineInput.trim()) {
      setFormData(prev => ({ ...prev, cuisine: customCuisineInput.trim() }));
      setCustomCuisine(customCuisineInput.trim());
    }
    setIsCustomCuisineDialogOpen(false);
    setCustomCuisineInput('');
  };

  const handleCustomCuisineCancel = () => {
    setIsCustomCuisineDialogOpen(false);
    setCustomCuisineInput('');
    // Reset to previous cuisine if user cancels
    if (!customCuisine) {
      setFormData(prev => ({ ...prev, cuisine: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Cast formData to any to access Google Places specific fields
    const formDataWithPlaces = formData as any;
    
    // Always preserve Google Places data if it exists (from either new selection or existing data)
    const submissionData = {
      ...formData,
      removedPhotoIndexes: removedPhotoIndexes,
      // Always include Google Places fields if they exist in formData
      ...(formDataWithPlaces.website && { website: formDataWithPlaces.website }),
      ...(formDataWithPlaces.phone_number && { phone_number: formDataWithPlaces.phone_number }),
      ...(formDataWithPlaces.latitude && { latitude: formDataWithPlaces.latitude }),
      ...(formDataWithPlaces.longitude && { longitude: formDataWithPlaces.longitude }),
      ...(formDataWithPlaces.opening_hours && { opening_hours: formDataWithPlaces.opening_hours }),
      ...(formDataWithPlaces.reservable !== undefined && { reservable: formDataWithPlaces.reservable }),
      ...(formDataWithPlaces.reservation_url && { reservation_url: formDataWithPlaces.reservation_url }),
      // Use Google Place ID as restaurant ID only for new restaurants from Google Places
      ...(formDataWithPlaces.googlePlaceId && !initialData && {
        id: formDataWithPlaces.googlePlaceId,
      })
    };
    
    onSubmit(submissionData);
  };

  return (
    <>
      {/* Custom Cuisine Dialog */}
      <Dialog open={isCustomCuisineDialogOpen} onOpenChange={setIsCustomCuisineDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Custom Cuisine</DialogTitle>
            <DialogDescription>
              Enter a custom cuisine type that's not in our list.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customCuisine">Cuisine Type</Label>
              <Input
                id="customCuisine"
                value={customCuisineInput}
                onChange={(e) => setCustomCuisineInput(e.target.value)}
                placeholder="e.g., Fusion, Middle Eastern, Caribbean..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCustomCuisineSubmit();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCustomCuisineCancel}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCustomCuisineSubmit} disabled={!customCuisineInput.trim()}>
              Save Cuisine
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Google Places Restaurant Search */}
      <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Search for Restaurant</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Search for a restaurant using Google Places to automatically fill in all details including website, phone, and more.
        </p>
        
        <RestaurantSearchSelect 
          onRestaurantSelect={handleRestaurantSelect}
          placeholder="Search for a restaurant (e.g., 'Le Bernardin New York')"
        />
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Restaurant Name *</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Restaurant name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cuisine">Cuisine *</Label>
            <Select
              value={cuisineOptions.includes(formData.cuisine) ? formData.cuisine : customCuisine ? 'Other' : ''}
              onValueChange={(value) => {
                if (value === 'Other') {
                  setCustomCuisineInput(customCuisine);
                  setIsCustomCuisineDialogOpen(true);
                } else {
                  setFormData(prev => ({ ...prev, cuisine: value }));
                  setCustomCuisine('');
                }
              }}
              required
            >
              <SelectTrigger id="cuisine">
                <SelectValue placeholder="Select cuisine">
                  {formData.cuisine && !cuisineOptions.includes(formData.cuisine) ? formData.cuisine : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-background border border-border shadow-lg z-50">
                {cuisineOptions.map(cuisine => (
                  <SelectItem key={cuisine} value={cuisine}>
                    {cuisine}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address *</Label>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <Input
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Full address"
              required
              className="flex-1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
            placeholder="City"
            required
          />
        </div>


        <div className="space-y-2">
          <Label>Price Range *</Label>
          <div className="flex items-center gap-2">
            <PriceRange
              priceRange={formData.priceRange}
              onPriceChange={(price) => setFormData(prev => ({ ...prev, priceRange: price }))}
              size="md"
            />
            <span className="text-sm text-muted-foreground">
              {formData.priceRange ? `${'$'.repeat(formData.priceRange)}` : 'Select price range'}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Michelin Stars</Label>
          <MichelinStars
            stars={formData.michelinStars}
            onStarsChange={(stars) => setFormData(prev => ({ ...prev, michelinStars: stars }))}
            size="md"
          />
        </div>

        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="isWishlist" className="text-sm font-medium">
            Add to wishlist
          </Label>
          <Switch
            id="isWishlist"
            checked={formData.isWishlist}
            onCheckedChange={handleWishlistToggle}
          />
        </div>

        {!formData.isWishlist && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rating *</Label>
              <div className="space-y-4">
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="useWeightedRating" className="text-sm font-medium">
                    Use weighted rating system
                  </Label>
                  <Switch
                    id="useWeightedRating"
                    checked={formData.useWeightedRating}
                    onCheckedChange={(checked) => {
                      setFormData(prev => ({
                        ...prev,
                        useWeightedRating: checked,
                        rating: undefined,
                        categoryRatings: checked ? { food: 0, service: 0, atmosphere: 0 } : undefined
                      }));
                    }}
                  />
                </div>

                {formData.useWeightedRating ? (
                  <WeightedRating
                    categoryRatings={formData.categoryRatings}
                    onRatingChange={handleRatingChange}
                    size="md"
                  />
                ) : (
                  <div className="mt-1">
                    <StarRating
                      rating={formData.rating || 0}
                      onRatingChange={(rating) => setFormData(prev => ({ ...prev, rating }))}
                      size="md"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date Visited</Label>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {date ? format(date, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={date}
                      onSelect={handleDateChange}
                      initialFocus
                      disabled={(date) => date > new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <Label htmlFor="notes">Notes & Review</Label>
          <Textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            placeholder="Write your review or notes about this restaurant..."
            className="min-h-[120px]"
          />
        </div>

        {/* Only show photos section for non-wishlist restaurants */}
        {!formData.isWishlist && (
          <div className="space-y-2">
            <Label>Photos</Label>
          
          {isProcessingPhotos && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Upload className="h-4 w-4 animate-pulse" />
                Processing {photosToProcess} photo{photosToProcess > 1 ? 's' : ''}...
              </div>
              <Progress value={photoProgress} className="w-full" />
            </div>
          )}
          
          <div 
            className={`grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 p-4 rounded-lg border-2 border-dashed transition-colors ${
              isDragOver 
                ? 'border-primary bg-primary/10' 
                : 'border-border bg-background'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {previewImages.length === 0 && !isDragOver && (
              <div className="col-span-full flex flex-col items-center justify-center py-8 text-center">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-1">
                  Drag and drop photos here, or click to select
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports multiple image files
                </p>
              </div>
            )}
            
            {isDragOver && (
              <div className="col-span-full flex flex-col items-center justify-center py-8 text-center">
                <Upload className="h-8 w-8 text-primary mb-2" />
                <p className="text-sm text-primary font-medium">
                  Drop your photos here
                </p>
              </div>
            )}
            
            {previewImages.map((src, index) => (
              <div 
                key={index} 
                className={`group relative aspect-square overflow-hidden rounded-md border transition-all duration-200 ${
                  draggedPhotoIndex === index 
                    ? 'opacity-50 scale-95 cursor-grabbing' 
                    : 'cursor-grab hover:shadow-lg'
                }`}
                draggable
                onDragStart={(e) => {
                  console.log('Drag start:', index);
                  handlePhotoDragStart(e, index);
                }}
                onDragEnd={(e) => {
                  console.log('Drag end:', index);
                  handlePhotoDragEnd(e);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  console.log('Drop on:', index);
                  handlePhotoDrop(e, index);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <LazyImage
                  src={src}
                  alt={`Preview ${index + 1}`}
                  className="h-full w-full object-cover pointer-events-none select-none"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePhoto(index);
                  }}
                  className="absolute top-2 right-2 flex items-center justify-center w-8 h-8 bg-red-500/80 hover:bg-red-500 rounded-full opacity-0 transition-opacity group-hover:opacity-100 z-10"
                >
                  <Trash2 className="h-4 w-4 text-white" />
                </button>
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {index + 1}
                </div>
              </div>
            ))}

            {/* Show native mobile buttons only on mobile devices */}
            {isMobile && (
              <>
                {/* Native Photo Gallery Button */}
                <button
                  type="button"
                  onClick={addPhotoFromGallery}
                  className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-md border border-dashed bg-muted/50 text-muted-foreground transition-colors hover:bg-muted"
                >
                  <Images className="mb-1 h-6 w-6" />
                  <span className="text-sm font-medium">Photo Gallery</span>
                  <span className="text-xs opacity-75">Select from album</span>
                </button>

                {/* Native Camera Button */}
                <button
                  type="button"
                  onClick={takePhoto}
                  className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-md border border-dashed bg-muted/50 text-muted-foreground transition-colors hover:bg-muted"
                >
                  <Camera className="mb-1 h-6 w-6" />
                  <span className="text-sm font-medium">Take Photo</span>
                  <span className="text-xs opacity-75">Use camera</span>
                </button>
              </>
            )}

            {/* Enhanced File System Selection for Desktop */}
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-md border border-dashed bg-muted/50 text-muted-foreground transition-colors hover:bg-muted">
              {isMobile ? <PlusCircle className="mb-1 h-6 w-6" /> : <Monitor className="mb-1 h-6 w-6" />}
              <span className="text-sm font-medium">
                {isMobile ? 'Files' : 'Photo Library'}
              </span>
              <span className="text-xs opacity-75 text-center">
                {isMobile ? 'Select multiple' : 'Cmd+click multiple'}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoChange}
                className="sr-only"
              />
            </label>
          </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={
          !formData.name || 
          !formData.address || 
          !formData.city || 
          !formData.cuisine || 
          !formData.priceRange ||
          (!formData.isWishlist && !formData.rating) ||
          isProcessingPhotos
        }>
          Save Restaurant
        </Button>
        </div>
      </div>
      </form>
    </>
  );
}