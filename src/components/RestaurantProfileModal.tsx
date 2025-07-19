import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StarRating } from '@/components/StarRating';
import { 
  Star, 
  MapPin, 
  Phone, 
  Globe, 
  Navigation, 
  Clock, 
  Heart,
  MessageSquare,
  Camera,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { GlobalSearchMap } from '@/components/GlobalSearchMap';

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
}

interface RestaurantProfileModalProps {
  place: PlaceDetails;
  onClose: () => void;
}

export function RestaurantProfileModal({ place, onClose }: RestaurantProfileModalProps) {
  const { user } = useAuth();
  const [userRating, setUserRating] = useState(0);
  const [userReview, setUserReview] = useState('');
  const [reviewPhotos, setReviewPhotos] = useState<File[]>([]);
  const [reviewPhotoUrls, setReviewPhotoUrls] = useState<string[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [reviewSortBy, setReviewSortBy] = useState<'recent' | 'helpful' | 'rating'>('recent');
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getPriceDisplay = (priceLevel?: number) => {
    if (!priceLevel) return 'Price not available';
    return '$'.repeat(priceLevel);
  };

  const getPhotoUrl = (photoReference: string) => {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoReference}&key=${import.meta.env.VITE_GOOGLE_PLACES_API_KEY}`;
  };

  const handlePhotoUpload = async (files: FileList) => {
    setUploadingPhotos(true);
    const uploadedUrls: string[] = [];
    const selectedFiles = Array.from(files).slice(0, 5); // Limit to 5 photos
    
    try {
      for (const file of selectedFiles) {
        // For now, we'll create object URLs for preview
        // In a real app, you'd upload to Supabase Storage or Cloudinary
        const url = URL.createObjectURL(file);
        uploadedUrls.push(url);
      }
      
      setReviewPhotoUrls(prev => [...prev, ...uploadedUrls]);
      setReviewPhotos(prev => [...prev, ...selectedFiles]);
      toast.success(`${selectedFiles.length} photo(s) uploaded successfully`);
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error('Failed to upload photos');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const removePhoto = (index: number) => {
    setReviewPhotoUrls(prev => prev.filter((_, i) => i !== index));
    setReviewPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddToWishlist = async () => {
    if (!user) {
      toast.error('Please sign in to add to wishlist');
      return;
    }

    setIsAddingToWishlist(true);
    try {
      const { error } = await supabase
        .from('restaurants')
        .upsert({
          id: place.place_id,
          name: place.name,
          address: place.formatted_address,
          city: place.formatted_address.split(',').slice(-2, -1)[0]?.trim() || '',
          country: place.formatted_address.split(',').slice(-1)[0]?.trim() || '',
          cuisine: place.types.filter(type => 
            !['establishment', 'point_of_interest', 'food'].includes(type)
          )[0] || 'restaurant',
          rating: place.rating,
          phone_number: place.formatted_phone_number,
          website: place.website,
          opening_hours: place.opening_hours?.weekday_text?.join('\n'),
          price_range: place.price_level,
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          photos: place.photos?.slice(0, 5).map(photo => getPhotoUrl(photo.photo_reference)) || [],
          notes: `Added from Global Search`,
          is_wishlist: true,
          user_id: user.id,
        });

      if (error) throw error;

      toast.success('Added to wishlist!');
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      toast.error('Failed to add to wishlist');
    } finally {
      setIsAddingToWishlist(false);
    }
  };

  const handleAddToRatings = async () => {
    if (!user) {
      toast.error('Please sign in to add ratings');
      return;
    }

    if (userRating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const { error } = await supabase
        .from('restaurants')
        .upsert({
          id: place.place_id,
          name: place.name,
          address: place.formatted_address,
          city: place.formatted_address.split(',').slice(-2, -1)[0]?.trim() || '',
          country: place.formatted_address.split(',').slice(-1)[0]?.trim() || '',
          cuisine: place.types.filter(type => 
            !['establishment', 'point_of_interest', 'food'].includes(type)
          )[0] || 'restaurant',
          rating: userRating,
          phone_number: place.formatted_phone_number,
          website: place.website,
          opening_hours: place.opening_hours?.weekday_text?.join('\n'),
          price_range: place.price_level,
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          photos: place.photos?.slice(0, 5).map(photo => getPhotoUrl(photo.photo_reference)) || [],
          notes: userReview || `Rated ${userRating} stars`,
          is_wishlist: false,
          user_id: user.id,
          date_visited: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success('Rating added successfully!');
      setUserRating(0);
      setUserReview('');
      setReviewPhotos([]);
      setReviewPhotoUrls([]);
    } catch (error) {
      console.error('Error adding rating:', error);
      toast.error('Failed to add rating');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleCallRestaurant = () => {
    if (place.formatted_phone_number) {
      window.open(`tel:${place.formatted_phone_number}`);
    } else {
      toast.error('Phone number not available');
    }
  };

  const handleVisitWebsite = () => {
    if (place.website) {
      window.open(place.website, '_blank');
    } else {
      toast.error('Website not available');
    }
  };

  const handleGetDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.geometry.location.lat},${place.geometry.location.lng}`;
    window.open(url, '_blank');
  };

  const getSortedReviews = () => {
    if (!place.reviews) return [];
    
    const reviews = [...place.reviews];
    switch (reviewSortBy) {
      case 'recent':
        return reviews.sort((a, b) => b.time - a.time);
      case 'helpful':
        // For Google reviews, we'll sort by rating as a proxy for helpfulness
        return reviews.sort((a, b) => b.rating - a.rating);
      case 'rating':
        return reviews.sort((a, b) => b.rating - a.rating);
      default:
        return reviews;
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{place.name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photos */}
            {place.photos && place.photos.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <img 
                    src={getPhotoUrl(place.photos[0].photo_reference)}
                    alt={place.name}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                  {place.photos.slice(1, 3).map((photo, index) => (
                    <img 
                      key={index}
                      src={getPhotoUrl(photo.photo_reference)}
                      alt={`${place.name} ${index + 2}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Location & Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p>{place.formatted_address}</p>
                  </div>
                  
                  {place.formatted_phone_number && (
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p>{place.formatted_phone_number}</p>
                    </div>
                  )}

                  {place.website && (
                    <div>
                      <p className="text-sm text-muted-foreground">Website</p>
                      <p className="text-primary truncate">{place.website}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={handleCallRestaurant} disabled={!place.formatted_phone_number}>
                      <Phone className="h-4 w-4 mr-2" />
                      Call
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleVisitWebsite} disabled={!place.website}>
                      <Globe className="h-4 w-4 mr-2" />
                      Website
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleGetDirections}>
                      <Navigation className="h-4 w-4 mr-2" />
                      Directions
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Ratings & Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {place.rating && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl font-bold">{place.rating}</span>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-5 w-5 ${
                                star <= Math.round(place.rating!)
                                  ? 'text-yellow-500 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {place.user_ratings_total && (
                        <p className="text-sm text-muted-foreground">
                          Based on {place.user_ratings_total} reviews
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-muted-foreground">Price Level</p>
                    <p className="font-semibold">{getPriceDisplay(place.price_level)}</p>
                  </div>

                  {place.opening_hours?.open_now !== undefined && (
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={place.opening_hours.open_now ? "default" : "destructive"}>
                        <Clock className="h-3 w-3 mr-1" />
                        {place.opening_hours.open_now ? "Open Now" : "Closed"}
                      </Badge>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      onClick={handleAddToWishlist}
                      disabled={isAddingToWishlist || !user}
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      Add to Wishlist
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Opening Hours */}
            {place.opening_hours?.weekday_text && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Opening Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {place.opening_hours.weekday_text.map((hours, index) => (
                      <p key={index} className="text-sm">
                        {hours}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* User Rating Section */}
            {user && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Add Your Rating & Review
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Your Rating</p>
                    <StarRating rating={userRating} onRatingChange={setUserRating} />
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Your Review (Optional)</p>
                    <Textarea
                      placeholder="Share your experience..."
                      value={userReview}
                      onChange={(e) => setUserReview(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Photo Upload */}
                  <div>
                    <Label htmlFor="review-photos" className="text-sm text-muted-foreground">
                      Add Photos (Optional)
                    </Label>
                    <div className="mt-2 space-y-3">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingPhotos || reviewPhotoUrls.length >= 5}
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          {uploadingPhotos ? 'Uploading...' : 'Add Photos'}
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {reviewPhotoUrls.length}/5 photos
                        </span>
                      </div>
                      
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) {
                            handlePhotoUpload(e.target.files);
                          }
                        }}
                      />

                      {/* Photo Preview */}
                      {reviewPhotoUrls.length > 0 && (
                        <div className="grid grid-cols-5 gap-2">
                          {reviewPhotoUrls.map((url, index) => (
                            <div key={index} className="relative">
                              <img
                                src={url}
                                alt={`Review photo ${index + 1}`}
                                className="w-full h-16 object-cover rounded border"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute -top-2 -right-2 h-6 w-6 p-0"
                                onClick={() => removePhoto(index)}
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <Button 
                    onClick={handleAddToRatings}
                    disabled={isSubmittingReview || userRating === 0}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Add to My Ratings
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Google Reviews */}
            {place.reviews && place.reviews.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Customer Reviews
                    </div>
                    <Select value={reviewSortBy} onValueChange={(value: 'recent' | 'helpful' | 'rating') => setReviewSortBy(value)}>
                      <SelectTrigger className="w-32">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recent">Most Recent</SelectItem>
                        <SelectItem value="helpful">Most Helpful</SelectItem>
                        <SelectItem value="rating">Highest Rated</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {getSortedReviews().slice(0, 5).map((review, index) => (
                    <div key={index} className="border-b last:border-b-0 pb-4 last:pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{review.author_name}</span>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${
                                  star <= review.rating
                                    ? 'text-yellow-500 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(review.time * 1000).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{review.text}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Map & Categories */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 rounded-lg overflow-hidden">
                  <GlobalSearchMap
                    restaurants={[place]}
                    onRestaurantClick={() => {}}
                    center={{
                      lat: place.geometry.location.lat,
                      lng: place.geometry.location.lng
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Categories */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {place.types.map((type) => (
                    <Badge key={type} variant="outline">
                      {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}