import React, { useState, useMemo } from 'react';
import { Camera, ChevronRight, User, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CommunityStats } from '@/hooks/useRestaurantReviews';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';

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
  const isMobile = useIsMobile();

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

  // Group photos by dish when there are enough
  const photoGroups = useMemo(() => {
    const groups: Record<string, typeof allCommunityPhotos> = {};
    const ungrouped: typeof allCommunityPhotos = [];
    
    allCommunityPhotos.forEach(photo => {
      if (photo.dishName && photo.dishName.trim()) {
        const key = photo.dishName.toLowerCase().trim();
        if (!groups[key]) groups[key] = [];
        groups[key].push(photo);
      } else {
        ungrouped.push(photo);
      }
    });

    // Only return groups with 2+ photos, sort by count
    const validGroups = Object.entries(groups)
      .filter(([, photos]) => photos.length >= 2)
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, 6); // Max 6 groups

    return { groups: validGroups, ungrouped };
  }, [allCommunityPhotos]);

  const handleViewAllPhotos = () => {
    if (restaurantPlaceId) {
      navigate(`/restaurant/${restaurantId || restaurantPlaceId}/photos`);
    }
  };

  const hasFriendPhotos = friendPhotos && friendPhotos.length > 0;
  const hasCommunityPhotos = allCommunityPhotos.length > 0;
  const hasEnoughForGroups = photoGroups.groups.length > 0;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between px-4">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="overflow-x-auto">
          <div className="flex gap-3 px-4 pb-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="w-32 h-32 rounded-lg flex-shrink-0" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // If no photos at all
  if (!isLoading && !hasCommunityPhotos && !hasFriendPhotos) {
    return (
      <div className="text-center text-muted-foreground py-8 px-4">
        <Camera className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No photos yet</p>
        <p className="text-xs">Upload photos with your review to help others!</p>
      </div>
    );
  }

  // Mobile version - simple horizontal scroll
  if (isMobile) {
    const displayPhotos = [];

    // If we have enough photos for groups, show one photo from each group
    if (hasEnoughForGroups) {
      // Show one photo from each dish group
      photoGroups.groups.forEach(([dishName, photos]) => {
        displayPhotos.push({
          ...photos[0], // Take first photo from group
          dishName,
          groupCount: photos.length
        });
      });
      
      // Add some ungrouped photos if we have space and photos
      const remainingSlots = Math.max(0, 6 - displayPhotos.length);
      if (remainingSlots > 0 && photoGroups.ungrouped.length > 0) {
        displayPhotos.push(...photoGroups.ungrouped.slice(0, remainingSlots));
      }
    } else if (hasFriendPhotos || hasCommunityPhotos) {
      // Show regular photos when not enough for groups
      if (hasFriendPhotos) {
        displayPhotos.push(...friendPhotos.slice(0, 3));
      }
      if (hasCommunityPhotos) {
        const remaining = Math.max(0, 6 - displayPhotos.length);
        displayPhotos.push(...allCommunityPhotos.slice(0, remaining));
      }
    }

    if (displayPhotos.length === 0) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between px-4">
          <h3 className="text-lg font-semibold">Photos</h3>
          <Badge variant="outline" className="text-xs">
            {allCommunityPhotos.length + (friendPhotos?.length || 0)} total
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              {hasEnoughForGroups ? 'Popular Dishes' : 'Community Photos'}
            </h4>
          </div>

          <div className="overflow-x-auto">
            <div className="flex gap-3 px-4 pb-2">
              {displayPhotos.map((photo: any, index: number) => (
                <div
                  key={index}
                  className="relative w-32 h-32 rounded-lg overflow-hidden bg-muted flex-shrink-0"
                  onClick={() => handleViewAllPhotos()}
                >
                  <img
                    src={photo.url}
                    alt={photo.dishName || 'Photo'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-1">
                    <p className="text-xs font-medium truncate">
                      {photo.dishName || 'Photo'}
                    </p>
                    {photo.groupCount && photo.groupCount > 1 && (
                      <p className="text-xs text-white/80">
                        {photo.groupCount} photos
                      </p>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Show more indicator */}
              <div 
                className="relative w-32 h-32 rounded-lg overflow-hidden bg-muted/50 border border-dashed border-muted-foreground/30 flex-shrink-0 flex items-center justify-center cursor-pointer"
                onClick={() => handleViewAllPhotos()}
              >
                <div className="text-center text-muted-foreground">
                  <div className="text-lg font-bold">+{Math.max(0, allCommunityPhotos.length - displayPhotos.length)}</div>
                  <div className="text-xs">more</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 pt-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleViewAllPhotos}
          >
            <Camera className="h-4 w-4 mr-2" />
            View All Photos
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Desktop version - keep existing functionality
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Photos
        </h3>
        <Badge variant="outline" className="text-xs">
          {allCommunityPhotos.length + (friendPhotos?.length || 0)} total
        </Badge>
      </div>

      {/* Show friend photos first if available */}
      {hasFriendPhotos && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Photos by {friendName}
            </h4>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Community photos */}
      {hasCommunityPhotos && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Community Photos
            </h4>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {allCommunityPhotos.slice(0, 8).map((photo, index) => (
              <div
                key={`${photo.reviewId}-${index}`}
                className="relative aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer group"
                onClick={() => onPhotoClick?.(index, allCommunityPhotos.map(p => p.url))}
              >
                <img
                  src={photo.url}
                  alt={photo.dishName || photo.caption || 'Community photo'}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                {photo.dishName && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2">
                    <p className="text-xs font-medium truncate">{photo.dishName}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Button
        variant="outline"
        className="w-full"
        onClick={handleViewAllPhotos}
      >
        <Camera className="h-4 w-4 mr-2" />
        View All Photos
        <ChevronRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}