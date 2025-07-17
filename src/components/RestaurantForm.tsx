import { useState } from 'react';
import { PlusCircle, Trash2, Calendar, MapPin } from 'lucide-react';
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
import { StarRating } from '@/components/StarRating';
import { format } from 'date-fns';
import { Restaurant, RestaurantFormData } from '@/types/restaurant';
import { Switch } from '@/components/ui/switch';

interface RestaurantFormProps {
  initialData?: Restaurant;
  onSubmit: (data: RestaurantFormData) => void;
  onCancel: () => void;
  defaultWishlist?: boolean;
}

const cuisineOptions = [
  'American', 'Italian', 'Japanese', 'Chinese', 'Mexican', 
  'Thai', 'Indian', 'French', 'Mediterranean', 'Korean',
  'Spanish', 'Vietnamese', 'Greek', 'Brazilian', 'Other'
];

export function RestaurantForm({ initialData, onSubmit, onCancel, defaultWishlist = false }: RestaurantFormProps) {
  const [formData, setFormData] = useState<RestaurantFormData>({
    name: initialData?.name || '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    cuisine: initialData?.cuisine || '',
    rating: initialData?.rating,
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

  const handleRatingChange = (rating: number) => {
    setFormData(prev => ({ ...prev, rating }));
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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const newFiles = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...newFiles],
    }));
    
    // Create preview URLs for the new files
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setPreviewImages(prev => [...prev, ...newPreviews]);
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
              value={formData.cuisine}
              onValueChange={(value) => setFormData(prev => ({ ...prev, cuisine: value }))}
              required
            >
              <SelectTrigger id="cuisine">
                <SelectValue placeholder="Select cuisine" />
              </SelectTrigger>
              <SelectContent>
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
              <Label>Rating</Label>
              <div className="mt-1">
                <StarRating
                  rating={formData.rating || 0}
                  onRatingChange={handleRatingChange}
                  size="md"
                />
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {previewImages.map((src, index) => (
              <div key={index} className="group relative aspect-square overflow-hidden rounded-md border">
                <img
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

            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-md border border-dashed bg-muted/50 text-muted-foreground transition-colors hover:bg-muted">
              <PlusCircle className="mb-1 h-6 w-6" />
              <span className="text-sm">Add Photo</span>
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
        <Button type="submit" disabled={!formData.name || !formData.address || !formData.city || !formData.cuisine}>
          Save Restaurant
        </Button>
      </div>
    </form>
  );
}