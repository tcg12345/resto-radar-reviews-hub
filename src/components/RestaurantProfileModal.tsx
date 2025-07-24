import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StarRating } from "@/components/StarRating";
import { Star, MapPin, Phone, Globe, Navigation, Clock, Heart, MessageSquare, Camera, Filter, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRestaurants } from "@/contexts/RestaurantContext";
import { RestaurantDialog } from "./Dialog/RestaurantDialog";
import { RestaurantFormData } from "@/types/restaurant";
import { GlobalSearchMap } from "@/components/GlobalSearchMap";
import { MenuButton } from "@/components/MenuButton";
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
  const {
    user
  } = useAuth();
  const {
    addRestaurant
  } = useRestaurants();
  const [userRating, setUserRating] = useState(0);
  const [userReview, setUserReview] = useState('');
  const [reviewPhotos, setReviewPhotos] = useState<File[]>([]);
  const [reviewPhotoUrls, setReviewPhotoUrls] = useState<string[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [reviewSortBy, setReviewSortBy] = useState<'recent' | 'helpful' | 'rating'>('recent');
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [aiCuisine, setAiCuisine] = useState<string>('');
  const [aiCategories, setAiCategories] = useState<string[]>([]);
  const [isLoadingAiAnalysis, setIsLoadingAiAnalysis] = useState(false);
  const [isRestaurantDialogOpen, setIsRestaurantDialogOpen] = useState(false);
  const [enhancedRestaurantData, setEnhancedRestaurantData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Analyze restaurant with AI on component mount
  useState(() => {
    const analyzeRestaurant = async () => {
      setIsLoadingAiAnalysis(true);
      try {
        const {
          data,
          error
        } = await supabase.functions.invoke('ai-restaurant-analysis', {
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
  const getPriceDisplay = (priceLevel?: number) => {
    if (!priceLevel) return 'Price not available';
    return '$'.repeat(priceLevel);
  };
  const handleRatingClick = () => {
    const searchQuery = `${place.name} ${place.formatted_address} reviews`;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, '_blank');
  };
  const handleViewMoreReviews = () => {
    const searchQuery = `${place.name} reviews`;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, '_blank');
  };
  const getSortedReviews = () => {
    if (!place.reviews) return [];
    const reviews = [...place.reviews];
    switch (reviewSortBy) {
      case 'recent':
        return reviews.sort((a, b) => b.time - a.time);
      case 'helpful':
        return reviews.sort((a, b) => b.rating - a.rating);
      case 'rating':
        return reviews.sort((a, b) => b.rating - a.rating);
      default:
        return reviews;
    }
  };
  const handlePhotoUpload = async (files: FileList) => {
    setUploadingPhotos(true);
    const uploadedUrls: string[] = [];
    const selectedFiles = Array.from(files).slice(0, 5);
    try {
      for (const file of selectedFiles) {
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
      // Get Michelin stars using AI
      let michelinStars = null;
      try {
        const {
          data: aiData
        } = await supabase.functions.invoke('ai-michelin-detector', {
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
    } finally {
      setIsAddingToWishlist(false);
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
    let michelinStars = undefined; // Start with undefined, not 0
    let enhancedCuisine = aiCuisine;
    let enhancedPriceRange = place.price_level;
    try {
      // Get Michelin stars using AI
      const {
        data: michelinData
      } = await supabase.functions.invoke('ai-michelin-detector', {
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
      // This will be undefined if no Michelin stars
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

  // Keep the original function for backward compatibility
  const getPrefilledRestaurantData = async () => {
    return await getAIEnhancedRestaurantData();
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
  return <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl max-h-[95vh] flex flex-col p-0 rounded-lg overflow-hidden">
          <div className="sticky top-0 bg-background z-50">
            <DialogHeader className="px-6 py-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <DialogTitle className="text-2xl font-bold">{place.name}</DialogTitle>
                  {place.opening_hours?.open_now !== undefined && <Badge variant={place.opening_hours.open_now ? "default" : "destructive"} className="text-sm">
                      <Clock className="h-3 w-3 mr-1" />
                      {place.opening_hours.open_now ? "Open Now" : "Closed"}
                    </Badge>}
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 shrink-0">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </DialogHeader>
          </div>
          <div className="border-t border-border w-full"></div>
          <div className="flex-1 overflow-y-auto">
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
                {/* Quick Stats */}
                <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {place.rating && <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{place.rating}</div>
                      <div className="flex justify-center mb-1">
                        {[1, 2, 3, 4, 5].map(star => <Star key={star} className={`h-4 w-4 ${star <= Math.round(place.rating!) ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} />)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {place.user_ratings_total} reviews
                      </div>
                    </div>}
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{getPriceDisplay(place.price_level)}</div>
                    <div className="text-xs text-muted-foreground">Price Level</div>
                  </div>
                  
                  {aiCuisine && <div className="text-center">
                      <Badge variant="secondary" className="text-sm font-medium">{aiCuisine}</Badge>
                      <div className="text-xs text-muted-foreground mt-1">Cuisine</div>
                    </div>}
                  
                  {place.yelpData && <div className="text-center">
                      <Badge variant="outline" className="text-sm">
                        <Star className="h-3 w-3 mr-1" />
                        Yelp
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">Available</div>
                    </div>}
                </div>
                
                {/* Action Buttons */}
                <div className="lg:col-span-2">
                  <div className="grid grid-cols-2 gap-3">
                    <Button onClick={handleCallRestaurant} disabled={!place.formatted_phone_number} className="w-full">
                      <Phone className="h-4 w-4 mr-2" />
                      Call
                    </Button>
                    <Button variant="outline" onClick={handleGetDirections} className="w-full">
                      <Navigation className="h-4 w-4 mr-2" />
                      Directions
                    </Button>
                    <Button variant="outline" onClick={handleVisitWebsite} disabled={!place.website} className="w-full">
                      <Globe className="h-4 w-4 mr-2" />
                      Website
                    </Button>
                    <MenuButton 
                      restaurantName={place.name}
                      restaurantAddress={place.formatted_address}
                      className="w-full"
                      size="default"
                    />
                    <Button variant="outline" onClick={handleAddToWishlist} disabled={isAddingToWishlist || !user} className="w-full">
                      <Heart className="h-4 w-4 mr-2" />
                      Wishlist
                    </Button>
                  </div>
                  
                  {place.yelpData && <Button variant="secondary" onClick={() => window.open(place.yelpData!.url, '_blank')} className="w-full mt-3">
                      <Star className="h-4 w-4 mr-2" />
                      View on Yelp
                    </Button>}
                </div>
              </div>
            </div>

            <div className="px-6 py-6">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="xl:col-span-2 space-y-6">
                  {/* Restaurant Information */}
                  <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-background via-background to-muted/30">
                    
                    <CardContent className="p-0">
                      <div className="relative overflow-hidden">
                        {/* Background Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5"></div>
                        
                        {/* Main Content Grid */}
                        <div className="relative p-8">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            
                            {/* Contact Information - Left Column */}
                            <div className="lg:col-span-2 space-y-6">
                              <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 rounded-full bg-primary/10">
                                  <MapPin className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground">Contact & Location</h3>
                              </div>
                              
                              <div className="space-y-4">
                                {/* Address Card */}
                                <div className="group relative overflow-hidden rounded-xl border bg-gradient-to-r from-card via-card/95 to-card/90 p-6 shadow-sm hover:shadow-md transition-all duration-300">
                                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                  <div className="relative flex items-start gap-4">
                                    <div className="mt-1 p-3 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors duration-300">
                                      <MapPin className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-sm font-semibold text-primary mb-2">Address</h4>
                                      <p className="text-foreground font-medium leading-relaxed">{place.formatted_address}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Contact Details Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {place.formatted_phone_number && <div className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-card to-card/95 p-5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer" onClick={() => window.open(`tel:${place.formatted_phone_number}`)}>
                                      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                      <div className="relative flex items-center gap-3">
                                        <div className="p-2.5 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors duration-300">
                                          <Phone className="h-4 w-4 text-blue-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h4 className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-1">Phone</h4>
                                          <p className="text-sm font-semibold text-foreground">{place.formatted_phone_number}</p>
                                        </div>
                                      </div>
                                    </div>}

                                  {place.website && <div className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-card to-card/95 p-5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer" onClick={() => window.open(place.website, '_blank', 'noopener noreferrer')}>
                                      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                      <div className="relative flex items-center gap-3">
                                        <div className="p-2.5 rounded-lg bg-purple-100 group-hover:bg-purple-200 transition-colors duration-300">
                                          <Globe className="h-4 w-4 text-purple-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h4 className="text-xs font-medium text-purple-600 uppercase tracking-wider mb-1">Website</h4>
                                          <p className="text-sm font-semibold text-primary transition-colors duration-200 truncate">
                                            {place.website.replace(/^https?:\/\//, '')}
                                          </p>
                                        </div>
                                      </div>
                                    </div>}
                                </div>
                              </div>
                            </div>

                            {/* Stats & Features - Right Column */}
                            <div className="space-y-6">
                              <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 rounded-full bg-accent/10">
                                  <Star className="h-5 w-5 text-accent" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground">Quick Stats</h3>
                              </div>

                              {/* Stats Cards */}
                              <div className="flex gap-3">
                                {place.rating && <div className="flex-1 relative overflow-hidden rounded-xl bg-gradient-to-br from-yellow-200 via-yellow-100 to-orange-200 p-4 shadow-md border border-yellow-200/60">
                                    <div className="absolute top-0 right-0 w-12 h-12 bg-yellow-300/20 rounded-full -mr-6 -mt-6"></div>
                                    <div className="relative">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="p-1.5 rounded-md bg-yellow-200/80">
                                          <Star className="h-3.5 w-3.5 text-yellow-700" />
                                        </div>
                                        <span className="text-xs font-bold text-yellow-800 uppercase tracking-wider">Rating</span>
                                      </div>
                                      <div className="flex items-baseline gap-1 mb-1">
                                        <span className="text-2xl font-black text-yellow-900">{place.rating}</span>
                                        <span className="text-sm font-medium text-yellow-700">/ 5.0</span>
                                      </div>
                                      {place.user_ratings_total && <p className="text-xs font-medium text-yellow-700">{place.user_ratings_total.toLocaleString()} reviews</p>}
                                    </div>
                                  </div>}

                                {place.price_level && <div className="flex-1 relative overflow-hidden rounded-xl bg-gradient-to-br from-green-200 via-green-100 to-emerald-200 p-4 shadow-md border border-green-200/60">
                                    <div className="absolute bottom-0 left-0 w-10 h-10 bg-green-300/20 rounded-full -ml-5 -mb-5"></div>
                                    <div className="relative">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="p-1.5 rounded-md bg-green-200/80">
                                          <svg className="h-3.5 w-3.5 text-green-700" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                                          </svg>
                                        </div>
                                        <span className="text-xs font-bold text-green-800 uppercase tracking-wider">Price</span>
                                      </div>
                                      <div className="text-2xl font-black text-green-900 mb-1">{getPriceDisplay(place.price_level)}</div>
                                      <p className="text-xs font-medium text-green-700">Price level</p>
                                    </div>
                                  </div>}
                              </div>

                              {/* Features Section */}
                              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-300 via-slate-200 to-slate-400 p-3 shadow-md border border-slate-300/60">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-slate-200/30 rounded-full -mr-8 -mt-8"></div>
                                <div className="relative">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 rounded-md bg-slate-200/80">
                                        <Clock className="h-3.5 w-3.5 text-slate-700" />
                                      </div>
                                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">STATUS</span>
                                    </div>
                                    {place.opening_hours?.open_now !== undefined && <Badge variant={place.opening_hours.open_now ? "default" : "destructive"} className="text-xs font-medium px-3 py-1 rounded-full">
                                        {place.opening_hours.open_now ? "Open" : "Closed"}
                                      </Badge>}
                                  </div>
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {place.types.includes('meal_delivery') && <Badge variant="outline" className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border-blue-200">
                                        🚚 Delivery
                                      </Badge>}

                                    {place.types.includes('meal_takeaway') && <Badge variant="outline" className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border-orange-200">
                                        🥡 Takeaway
                                      </Badge>}

                                    {place.types.includes('dine_in') && <Badge variant="outline" className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border-purple-200">
                                        🍽️ Dine-in
                                      </Badge>}

                                    {(place.types.includes('wheelchair_accessible_entrance') || place.types.includes('wheelchair_accessible')) && <Badge variant="outline" className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border-teal-200">
                                        ♿ Accessible
                                      </Badge>}

                                    {place.types.includes('wifi') && <Badge variant="outline" className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border-indigo-200">
                                        📶 WiFi
                                      </Badge>}

                                    {place.types.includes('accepts_credit_cards') && <Badge variant="outline" className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border-green-200">
                                        💳 Cards Accepted
                                      </Badge>}

                                    {place.types.includes('outdoor_seating') && <Badge variant="outline" className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border-emerald-200">
                                        🌤️ Outdoor Seating
                                      </Badge>}

                                    {place.types.includes('parking') && <Badge variant="outline" className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-700 border-slate-200">
                                        🅿️ Parking
                                      </Badge>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Opening Hours */}
                  {place.opening_hours?.weekday_text && <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          Opening Hours
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {place.opening_hours.weekday_text.map((hours, index) => <div key={index} className="bg-muted/30 hover:bg-muted/50 rounded-lg p-4 border transition-colors duration-200 w-full">
                              <div className="flex justify-between items-center">
                                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                  {hours.split(': ')[0]}
                                </div>
                                <div className="text-sm font-semibold text-foreground">
                                  {hours.split(': ')[1] || 'Closed'}
                                </div>
                              </div>
                            </div>)}
                        </div>
                      </CardContent>
                    </Card>}

                  {/* User Rating Section */}
                  {user && <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Star className="h-5 w-5" />
                          Add to My Ratings
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Button onClick={handleAddToRatings} className="w-full">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Add to My Ratings
                        </Button>
                      </CardContent>
                    </Card>}
                </div>

                {/* Sidebar */}
                <div className="xl:col-span-1 space-y-6">
                  {/* Map */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Location
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 rounded-lg overflow-hidden">
                        <GlobalSearchMap restaurants={[place]} onRestaurantClick={() => {}} center={{
                        lat: place.geometry.location.lat,
                        lng: place.geometry.location.lng
                      }} />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Categories */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Categories & Tags</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {aiCuisine && <div>
                            <p className="text-sm font-medium text-muted-foreground mb-2">Cuisine Type</p>
                            <Badge variant="secondary" className="text-sm font-medium">
                              {aiCuisine}
                            </Badge>
                          </div>}
                        
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">
                            {aiCategories.length > 0 ? 'AI Categories' : 'Google Categories'}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {(aiCategories.length > 0 ? aiCategories : place.types.slice(0, 8)).map(type => <Badge key={type} variant="outline" className="text-xs">
                                {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </Badge>)}
                            {isLoadingAiAnalysis && <Badge variant="outline" className="animate-pulse text-xs">
                                Analyzing...
                              </Badge>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Google Reviews */}
                  {place.reviews && place.reviews.length > 0 && <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            Reviews
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handleViewMoreReviews} className="flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                            <Select value={reviewSortBy} onValueChange={(value: 'recent' | 'helpful' | 'rating') => setReviewSortBy(value)}>
                              <SelectTrigger className="w-24">
                                <Filter className="h-3 w-3" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="recent">Recent</SelectItem>
                                <SelectItem value="helpful">Helpful</SelectItem>
                                <SelectItem value="rating">Top Rated</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {getSortedReviews().slice(0, showAllReviews ? getSortedReviews().length : 2).map((review, index) => <div key={index} className="border-b last:border-b-0 pb-3 last:pb-0">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-sm truncate block">{review.author_name}</span>
                                <div className="flex items-center gap-1 mt-1">
                                  {[1, 2, 3, 4, 5].map(star => <Star key={star} className={`h-3 w-3 ${star <= review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} />)}
                                  <span className="text-xs text-muted-foreground ml-1">
                                    {new Date(review.time * 1000).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{review.text}</p>
                          </div>)}
                        
                        {/* Show More/Less Reviews Button */}
                        {getSortedReviews().length > 2 && <div className="pt-3 border-t">
                            <Button variant="outline" size="sm" onClick={() => setShowAllReviews(!showAllReviews)} className="w-full text-xs">
                              {showAllReviews ? 'Show Less' : `Show All ${getSortedReviews().length}`}
                            </Button>
                          </div>}
                      </CardContent>
                    </Card>}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restaurant Form Dialog */}
      <RestaurantDialog isOpen={isRestaurantDialogOpen} onOpenChange={setIsRestaurantDialogOpen} restaurant={(enhancedRestaurantData || getPrefilledRestaurantData()) as any} onSave={handleRestaurantFormSubmit} dialogType="add" defaultWishlist={false} hideSearch={true} />
    </>;
}