import { useState, useEffect } from 'react';
import { PlusCircle, Trash2, Calendar, MapPin, Camera, Images, Monitor, Upload } from 'lucide-react';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  'Modern', 'Seafood', 'Spanish', 'Steakhouse', 'Thai', 'Vietnamese', 'Other'
].sort();

export function RestaurantForm({ initialData, onSubmit, onCancel, defaultWishlist = false }: RestaurantFormProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [photoProgress, setPhotoProgress] = useState(0);
  const [photosToProcess, setPhotosToProcess] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
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
  });

  const [date, setDate] = useState<Date | undefined>(
    formData.dateVisited ? new Date(formData.dateVisited) : undefined
  );

  const [previewImages, setPreviewImages] = useState<string[]>(initialData?.photos || []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
    // Remove from preview
    setPreviewImages(prev => prev.filter((_, i) => i !== index));
    
    // Remove from form data if it's a new photo
    if (index >= (initialData?.photos.length || 0)) {
      const adjustedIndex = index - (initialData?.photos.length || 0);
      setFormData(prev => ({
        ...prev,
        photos: prev.photos.filter((_, i) => i !== adjustedIndex),
      }));
    }
    // For existing photos, we'll handle removal on the submit side
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
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
              value={formData.cuisine === 'Other' ? 'Other' : cuisineOptions.includes(formData.cuisine) ? formData.cuisine : 'Other'}
              onValueChange={(value) => {
                if (value === 'Other') {
                  setFormData(prev => ({ ...prev, cuisine: customCuisine || '' }));
                } else {
                  setFormData(prev => ({ ...prev, cuisine: value }));
                  setCustomCuisine('');
                }
              }}
              required
            >
              <SelectTrigger id="cuisine">
                <SelectValue placeholder="Select cuisine" />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border shadow-lg z-50">
                {cuisineOptions.map(cuisine => (
                  <SelectItem key={cuisine} value={cuisine}>
                    {cuisine}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {(formData.cuisine === 'Other' || (customCuisine && !cuisineOptions.includes(formData.cuisine))) && (
              <Input
                placeholder="Enter custom cuisine"
                value={customCuisine || (cuisineOptions.includes(formData.cuisine) ? '' : formData.cuisine)}
                onChange={(e) => {
                  const value = e.target.value;
                  setCustomCuisine(value);
                  setFormData(prev => ({ ...prev, cuisine: value }));
                }}
                className="mt-2"
              />
            )}
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

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            placeholder="Any thoughts about this place..."
            className="min-h-[100px]"
          />
        </div>

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
              <div key={index} className="group relative aspect-square overflow-hidden rounded-md border">
                <LazyImage
                  src={src}
                  alt={`Preview ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 className="h-6 w-6 text-white" />
                </button>
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
      </div>

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
    </form>
  );
}