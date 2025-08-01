import React, { useState, useMemo } from 'react';
import { Search, Camera, Filter, Grid, Users, ChevronDown, User, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CommunityStats } from '@/hooks/useRestaurantReviews';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

interface FriendPhoto {
  url: string;
  caption?: string;
  dishName?: string;
}

interface UnifiedPhotoGalleryProps {
  stats: CommunityStats | null;
  isLoading?: boolean;
  onPhotoClick?: (photoIndex: number, photos: string[]) => void;
  friendPhotos?: FriendPhoto[];
  friendName?: string;
  friendId?: string;
  restaurantId?: string;
  restaurantPlaceId?: string;
}

export function UnifiedPhotoGallery({ 
  stats, 
  isLoading, 
  onPhotoClick,
  friendPhotos,
  friendName,
  friendId,
  restaurantId,
  restaurantPlaceId
}: UnifiedPhotoGalleryProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');
  const [showAll, setShowAll] = useState(false);

  // Community photos processing
  const allCommunityPhotos = useMemo(() => {
    if (!stats?.recentPhotos) return [];
    
    return stats.recentPhotos.flatMap(photoData => 
      photoData.photos.map((photo, index) => ({
        url: photo,
        dishName: photoData.dish_names[index] || '',
        caption: photoData.captions[index] || '',
        username: photoData.username,
        userId: photoData.user_id,
        helpfulCount: photoData.helpful_count,
        createdAt: new Date(photoData.created_at),
        reviewId: photoData.review_id
      }))
    );
  }, [stats?.recentPhotos]);

  const filteredCommunityPhotos = useMemo(() => {
    let filtered = allCommunityPhotos;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(photo => 
        photo.dishName.toLowerCase().includes(query) ||
        photo.caption.toLowerCase().includes(query) ||
        photo.username.toLowerCase().includes(query)
      );
    }

    // Sort
    if (sortBy === 'popular') {
      filtered.sort((a, b) => b.helpfulCount - a.helpfulCount);
    } else {
      filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    return filtered;
  }, [allCommunityPhotos, searchQuery, sortBy]);

  const displayCommunityPhotos = showAll ? filteredCommunityPhotos : filteredCommunityPhotos.slice(0, 12);

  const dishGroups = useMemo(() => {
    const groups: Record<string, typeof displayCommunityPhotos> = {};
    displayCommunityPhotos.forEach(photo => {
      if (photo.dishName) {
        const key = photo.dishName.toLowerCase();
        if (!groups[key]) groups[key] = [];
        groups[key].push(photo);
      }
    });
    return Object.entries(groups)
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, 5); // Top 5 dish groups
  }, [displayCommunityPhotos]);

  const handleViewAllPhotos = () => {
    if (restaurantId && friendId && restaurantPlaceId) {
      navigate(`/restaurant/${restaurantId}/photos?friendId=${friendId}&placeId=${restaurantPlaceId}`);
    }
  };

  const hasFriendPhotos = friendPhotos && friendPhotos.length > 0;
  const hasCommunityPhotos = allCommunityPhotos.length > 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-5 w-8" />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="aspect-square relative">
                <Skeleton className="w-full h-full rounded-lg" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite] rounded-lg" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // If no photos at all
  if (!isLoading && !hasCommunityPhotos && !hasFriendPhotos) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Photos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Camera className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No photos yet</p>
            <p className="text-xs">Upload photos with your review to help others!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If only friend photos (no community photos)
  if (!hasCommunityPhotos && hasFriendPhotos) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Photos by {friendName}
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {friendPhotos.length} photo{friendPhotos.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {friendPhotos.slice(0, 4).map((photo, index) => (
              <div
                key={index}
                className="relative aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer group"
                onClick={handleViewAllPhotos}
              >
                <img
                  src={photo.url}
                  alt={photo.dishName || `Photo ${index + 1}`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                {photo.dishName && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2">
                    <p className="text-xs font-medium truncate">{photo.dishName}</p>
                  </div>
                )}
                {index === 3 && friendPhotos.length > 4 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="text-lg font-bold">+{friendPhotos.length - 4}</div>
                      <div className="text-xs">more</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleViewAllPhotos}
          >
            <Camera className="h-4 w-4 mr-2" />
            View All Photos
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // If both community and friend photos exist
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Photos
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="community" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="community" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Community
              <Badge variant="outline" className="text-xs">
                {allCommunityPhotos.length}
              </Badge>
            </TabsTrigger>
            {hasFriendPhotos && (
              <TabsTrigger value="friend" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {friendName}
                <Badge variant="outline" className="text-xs">
                  {friendPhotos.length}
                </Badge>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Community Photos Tab */}
          <TabsContent value="community" className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by dish name, description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    {sortBy === 'recent' ? 'Most Recent' : 'Most Popular'}
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

            {/* Popular Dishes */}
            {dishGroups.length > 0 && !searchQuery && (
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Grid className="h-4 w-4" />
                  Popular Dishes
                </h4>
                <div className="flex flex-wrap gap-2">
                  {dishGroups.map(([dishName, photos]) => (
                    <Badge 
                      key={dishName} 
                      variant="secondary" 
                      className="text-xs cursor-pointer hover:bg-secondary/80"
                      onClick={() => setSearchQuery(dishName)}
                    >
                      {dishName} ({photos.length})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Photo Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {displayCommunityPhotos.map((photo, index) => (
                <div
                  key={`${photo.reviewId}-${index}`}
                  className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-muted"
                  onClick={() => onPhotoClick?.(index, displayCommunityPhotos.map(p => p.url))}
                >
                  <img
                    src={photo.url}
                    alt={photo.dishName || photo.caption || 'Community photo'}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors">
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      {photo.dishName && (
                        <p className="text-white text-xs font-medium truncate">
                          {photo.dishName}
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-white/80 text-xs">
                        <Users className="h-3 w-3" />
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

            {/* Show More Button */}
            {filteredCommunityPhotos.length > displayCommunityPhotos.length && (
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={() => setShowAll(true)}
                  className="w-full sm:w-auto"
                >
                  Show All {filteredCommunityPhotos.length} Photos
                </Button>
              </div>
            )}

            {/* No Results */}
            {filteredCommunityPhotos.length === 0 && searchQuery && (
              <div className="text-center text-muted-foreground py-6">
                <p className="text-sm">No photos found for "{searchQuery}"</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="mt-2"
                >
                  Clear search
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Friend Photos Tab */}
          {hasFriendPhotos && (
            <TabsContent value="friend" className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {friendPhotos.slice(0, 4).map((photo, index) => (
                  <div
                    key={index}
                    className="relative aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer group"
                    onClick={handleViewAllPhotos}
                  >
                    <img
                      src={photo.url}
                      alt={photo.dishName || `Photo ${index + 1}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    {photo.dishName && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2">
                        <p className="text-xs font-medium truncate">{photo.dishName}</p>
                      </div>
                    )}
                    {index === 3 && friendPhotos.length > 4 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="text-white text-center">
                          <div className="text-lg font-bold">+{friendPhotos.length - 4}</div>
                          <div className="text-xs">more</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleViewAllPhotos}
              >
                <Camera className="h-4 w-4 mr-2" />
                View All {friendName}'s Photos
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}