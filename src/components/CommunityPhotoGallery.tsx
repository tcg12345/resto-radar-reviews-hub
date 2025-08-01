import React, { useState, useMemo } from 'react';
import { Search, Camera, Filter, Grid, Users, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CommunityStats } from '@/hooks/useRestaurantReviews';
import { Skeleton } from '@/components/ui/skeleton';

interface CommunityPhotoGalleryProps {
  stats: CommunityStats | null;
  isLoading?: boolean;
  onPhotoClick?: (photoIndex: number, photos: string[]) => void;
}

export function CommunityPhotoGallery({ stats, isLoading, onPhotoClick }: CommunityPhotoGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');
  const [showAll, setShowAll] = useState(false);

  const allPhotos = useMemo(() => {
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

    // Sort
    if (sortBy === 'popular') {
      filtered.sort((a, b) => b.helpfulCount - a.helpfulCount);
    } else {
      filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    return filtered;
  }, [allPhotos, searchQuery, sortBy]);

  const displayPhotos = showAll ? filteredPhotos : filteredPhotos.slice(0, 12);

  const dishGroups = useMemo(() => {
    const groups: Record<string, typeof displayPhotos> = {};
    displayPhotos.forEach(photo => {
      if (photo.dishName) {
        const key = photo.dishName.toLowerCase();
        if (!groups[key]) groups[key] = [];
        groups[key].push(photo);
      }
    });
    return Object.entries(groups)
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, 5); // Top 5 dish groups
  }, [displayPhotos]);

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
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite] rounded-lg" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isLoading && allPhotos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Community Photos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Camera className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No community photos yet</p>
            <p className="text-xs">Upload photos with your review to help others!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Community Photos
            <Badge variant="outline" className="text-xs">
              {allPhotos.length}
            </Badge>
          </CardTitle>
        </div>

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
      </CardHeader>

      <CardContent className="space-y-6">
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
          {displayPhotos.map((photo, index) => (
            <div
              key={`${photo.reviewId}-${index}`}
              className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-muted"
              onClick={() => onPhotoClick?.(index, displayPhotos.map(p => p.url))}
            >
              <img
                src={photo.url}
                alt={photo.dishName || photo.caption || 'Community photo'}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              
              {/* Overlay */}
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
        {filteredPhotos.length > displayPhotos.length && (
          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => setShowAll(true)}
              className="w-full sm:w-auto"
            >
              Show All {filteredPhotos.length} Photos
            </Button>
          </div>
        )}

        {/* No Results */}
        {filteredPhotos.length === 0 && searchQuery && (
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
      </CardContent>
    </Card>
  );
}