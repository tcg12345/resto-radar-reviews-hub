import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Star, Upload, X, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { StarRating } from '@/components/StarRating';
import { WeightedRating } from '@/components/WeightedRating';
import type { CategoryRating } from '@/types/restaurant';
import { toast } from 'sonner';

interface UserReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantName: string;
  restaurantAddress: string;
  onSubmit: (reviewData: {
    overallRating: number;
    categoryRatings?: CategoryRating;
    reviewText?: string;
    photos?: string[];
    photoCaptions?: string[];
    photoDishNames?: string[];
    restaurantName: string;
    restaurantAddress: string;
  }) => Promise<void>;
}

interface FormData {
  overallRating: number;
  reviewText: string;
  useWeightedRating: boolean;
}

interface PhotoData {
  file: File;
  url: string;
  dishName: string;
  caption: string;
}

export function UserReviewDialog({ 
  isOpen, 
  onClose, 
  restaurantName, 
  restaurantAddress, 
  onSubmit 
}: UserReviewDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [categoryRatings, setCategoryRatings] = useState<CategoryRating>({
    food: 0,
    service: 0,
    atmosphere: 0
  });
  const [weightedRating, setWeightedRating] = useState(0);

  const { register, handleSubmit, watch, setValue, reset } = useForm<FormData>({
    defaultValues: {
      overallRating: 0,
      reviewText: '',
      useWeightedRating: false
    }
  });

  const useWeightedRating = watch('useWeightedRating');
  const overallRating = watch('overallRating');

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPhotos(prev => [...prev, {
          file,
          url,
          dishName: '',
          caption: ''
        }]);
      }
    });
    
    // Reset input
    event.target.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      const photo = prev[index];
      URL.revokeObjectURL(photo.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const updatePhotoData = (index: number, field: 'dishName' | 'caption', value: string) => {
    setPhotos(prev => prev.map((photo, i) => 
      i === index ? { ...photo, [field]: value } : photo
    ));
  };

  const uploadPhotos = async (): Promise<string[]> => {
    // This would typically upload to a storage service
    // For now, return mock URLs
    return photos.map(photo => photo.url);
  };

  const onSubmitForm = async (data: FormData) => {
    setIsSubmitting(true);
    
    try {
      const uploadedPhotoUrls = await uploadPhotos();
      
      const finalRating = useWeightedRating ? weightedRating : data.overallRating;
      
      await onSubmit({
        overallRating: finalRating,
        categoryRatings: useWeightedRating ? categoryRatings : undefined,
        reviewText: data.reviewText || undefined,
        photos: uploadedPhotoUrls,
        photoCaptions: photos.map(p => p.caption),
        photoDishNames: photos.map(p => p.dishName),
        restaurantName,
        restaurantAddress
      });

      toast.success('Review submitted successfully!');
      handleClose();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Clean up photo URLs
    photos.forEach(photo => URL.revokeObjectURL(photo.url));
    setPhotos([]);
    setCategoryRatings({ food: 0, service: 0, atmosphere: 0 });
    setWeightedRating(0);
    reset();
    onClose();
  };

  const handleWeightedRatingChange = (ratings: CategoryRating, avgRating: number) => {
    setCategoryRatings(ratings);
    setWeightedRating(avgRating);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Your Experience</DialogTitle>
          <p className="text-sm text-muted-foreground">{restaurantName}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
          {/* Rating Section */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium">Overall Rating</Label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    {...register('useWeightedRating')}
                    className="rounded"
                  />
                  Use detailed rating
                </label>
              </div>

              {useWeightedRating ? (
                <WeightedRating
                  categoryRatings={categoryRatings}
                  onRatingChange={handleWeightedRatingChange}
                  size="md"
                />
              ) : (
                <StarRating
                  rating={overallRating}
                  onRatingChange={(rating) => setValue('overallRating', rating)}
                  size="lg"
                  showValue
                />
              )}
            </CardContent>
          </Card>

          {/* Review Text */}
          <div className="space-y-2">
            <Label htmlFor="reviewText">Your Review (Optional)</Label>
            <Textarea
              id="reviewText"
              {...register('reviewText')}
              placeholder="Share your thoughts about the food, service, atmosphere..."
              rows={4}
            />
          </div>

          {/* Photos Section */}
          <div className="space-y-3">
            <Label>Photos (Optional)</Label>
            
            {/* Upload Button */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('photo-upload')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Add Photos
              </Button>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <span className="text-xs text-muted-foreground">
                Help others by showing your dishes!
              </span>
            </div>

            {/* Photo Grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {photos.map((photo, index) => (
                  <Card key={index}>
                    <CardContent className="p-3">
                      <div className="relative mb-3">
                        <img
                          src={photo.url}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-32 object-cover rounded"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePhoto(index)}
                          className="absolute top-1 right-1 h-6 w-6 p-0 bg-black/50 hover:bg-black/70"
                        >
                          <X className="h-3 w-3 text-white" />
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <Input
                          placeholder="Dish name (e.g., Pasta Carbonara)"
                          value={photo.dishName}
                          onChange={(e) => updatePhotoData(index, 'dishName', e.target.value)}
                          className="text-xs"
                        />
                        <Input
                          placeholder="Caption (optional)"
                          value={photo.caption}
                          onChange={(e) => updatePhotoData(index, 'caption', e.target.value)}
                          className="text-xs"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || (useWeightedRating ? weightedRating === 0 : overallRating === 0)}
            >
              {isSubmitting ? 'Submitting...' : 'Share Review'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}