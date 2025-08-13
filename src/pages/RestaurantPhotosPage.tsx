import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, Filter, Grid, Users, ChevronDown, Camera, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useRestaurantReviews } from '@/hooks/useRestaurantReviews';
import { supabase } from '@/integrations/supabase/client';

interface Restaurant {
  name: string;
  place_id: string;
}

export default function RestaurantPhotosPage() {
  const navigate = useNavigate();
  const { placeId } = useParams();
  const [searchParams] = useSearchParams();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');
  const [selectedDish, setSelectedDish] = useState<string>('');
  const [googlePhotos, setGooglePhotos] = useState<string[]>([]);

  // Get restaurant details
  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!placeId) return;

      try {
        // First try to get from our database
        const { data: dbRestaurant } = await supabase
          .from('restaurants')
          .select('name, google_place_id')
          .eq('google_place_id', placeId)
          .single();

        if (dbRestaurant) {
          setRestaurant({ name: dbRestaurant.name, place_id: placeId });
          return;
        }

        // Fallback to Google Places API
        const { data, error } = await supabase.functions.invoke('google-places-search', {
          body: { placeId, type: 'details' }
        });

        if (!error && data?.result) {
          setRestaurant({
            name: data.result.name,
            place_id: placeId
          });
          
          // Extract Google Photos using proxy
          if (data.result.photos) {
            const photoUrls = data.result.photos.map((photo: any) => {
              const proxyUrl = `${window.location.origin}/api/google-photo-proxy?photo_reference=${photo.photo_reference}&maxwidth=800`;
              return `https://ocpmhsquwsdaauflbygf.supabase.co/functions/v1/google-photo-proxy?photo_reference=${photo.photo_reference}&maxwidth=800`;
            });
            setGooglePhotos(photoUrls);
          }
        }
      } catch (error) {
        console.error('Error fetching restaurant:', error);
      }
    };

    fetchRestaurant();
  }, [placeId]);

  const { communityStats, isLoading } = useRestaurantReviews(placeId, restaurant?.name);

  // Process community photos
  const allCommunityPhotos = useMemo(() => {
    if (!communityStats?.recentPhotos) return [];
    
    return communityStats.recentPhotos.flatMap(photoData => 
      photoData.photos.map((photo, index) => ({
        url: photo,
        dishName: photoData.dish_names[index] || '',
        caption: photoData.captions[index] || '',
        username: photoData.username,
        userId: photoData.user_id,
        helpfulCount: photoData.helpful_count,
        createdAt: new Date(photoData.created_at),
        reviewId: photoData.review_id,
        isGoogle: false
      }))
    );
  }, [communityStats?.recentPhotos]);

  // Combine community and Google photos
  const allPhotos = useMemo(() => {
    const combined = [...allCommunityPhotos];
    
    // Add Google photos if no community photos
    if (allCommunityPhotos.length === 0 && googlePhotos.length > 0) {
      googlePhotos.forEach((photo, index) => {
        combined.push({
          url: photo,
          dishName: '',
          caption: '',
          username: 'Google',
          userId: 'google',
          helpfulCount: 0,
          createdAt: new Date(),
          reviewId: `google-${index}`,
          isGoogle: true
        });
      });
    }
    
    return combined;
  }, [allCommunityPhotos, googlePhotos]);

  // Filter and sort photos
  const filteredPhotos = useMemo(() => {
    let filtered = allPhotos;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(photo => 
        photo.dishName.toLowerCase().includes(query) ||
        photo.caption.toLowerCase().includes(query) ||
        photo.username.toLowerCase().includes(query)
      );
    }

    // Filter by selected dish
    if (selectedDish) {
      filtered = filtered.filter(photo => 
        photo.dishName.toLowerCase() === selectedDish.toLowerCase()
      );
    }

    // Sort
    if (sortBy === 'popular') {
      filtered.sort((a, b) => b.helpfulCount - a.helpfulCount);
    } else {
      filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    return filtered;
  }, [allPhotos, searchQuery, sortBy, selectedDish]);

  // Group photos by dish (only for community photos, not Google photos)
  const dishGroups = useMemo(() => {
    const groups: Record<string, typeof allPhotos> = {};
    allCommunityPhotos.forEach(photo => {
      if (photo.dishName && photo.dishName.trim()) {
        const key = photo.dishName.toLowerCase().trim();
        if (!groups[key]) groups[key] = [];
        groups[key].push(photo);
      }
    });
    return Object.entries(groups)
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, 10); // Top 10 dish groups
  }, [allCommunityPhotos]);

  const handleBack = () => {
    navigate(-1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b">
          <div className="flex items-center gap-4 p-4">
            <Button variant="ghost" size="sm" onClick={handleBack} className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Skeleton className="h-6 w-48" />
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b bg-muted/30">
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="sm" onClick={handleBack} className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">{restaurant?.name || 'Photos'}</h1>
            <p className="text-sm text-muted-foreground">{filteredPhotos.length} photos</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b bg-muted/30">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search all dishes"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
      </div>

      <div className="pb-safe-area-bottom">
        {/* Popular Dishes */}
        {dishGroups.length > 0 && !searchQuery && !selectedDish && (
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold mb-3">Popular dishes</h2>
            <div className="grid grid-cols-3 gap-3">
              {dishGroups.slice(0, 6).map(([dishName, photos]) => (
                <div
                  key={dishName}
                  className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
                  onClick={() => setSelectedDish(dishName)}
                >
                  <img
                    src={photos[0].url}
                    alt={dishName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/40" />
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <p className="text-white text-sm font-medium truncate">{dishName}</p>
                    <p className="text-white/80 text-xs">{photos.length} photos</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Photos Section */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              {selectedDish ? (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedDish('')}
                    className="h-8 w-8 p-0 mr-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  {selectedDish}
                </>
              ) : (
                <>
                  <Users className="h-5 w-5" />
                  Photos from community
                </>
              )}
            </h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  {sortBy === 'recent' ? 'Recent' : 'Popular'}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSortBy('recent')}>
                  Most Recent
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('popular')}>
                  Most Popular
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Photo Grid */}
          {filteredPhotos.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {filteredPhotos.map((photo, index) => (
                <div
                  key={`${photo.reviewId}-${index}`}
                  className="relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer group"
                >
                  <img
                    src={photo.url}
                    alt={photo.dishName || photo.caption || 'Community photo'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  
                  {/* Photo overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors">
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      {photo.dishName && (
                        <p className="text-white text-sm font-medium truncate mb-1">
                          {photo.dishName}
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-white/80 text-xs">
                        <User className="h-3 w-3" />
                        <span>{photo.username}</span>
                        {photo.helpfulCount > 0 && (
                          <span className="ml-auto">
                            ❤️ {photo.helpfulCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <Camera className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">
                {searchQuery ? `No photos found for "${searchQuery}"` : 'No photos yet'}
              </p>
              <p className="text-xs mt-1">
                {searchQuery ? 'Try a different search term' : 'Upload photos with your review to help others!'}
              </p>
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="mt-3"
                >
                  Clear search
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}