import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LazyImage } from '@/components/LazyImage';
import { useRestaurantReviews } from '@/hooks/useRestaurantReviews';
import { CommunityPhotosSkeleton } from '@/components/skeletons/CommunityPhotosSkeleton';
import { InfiniteScrollLoader } from '@/components/InfiniteScrollLoader';

interface CommunityPhoto {
  review_id: string;
  user_id: string;
  username: string;
  photos: string[];
  captions: string[];
  dish_names: string[];
  created_at: string;
  helpful_count: number;
}

export default function CommunityPhotoGalleryPage() {
  const { placeId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const restaurantName = searchParams.get('name') || 'Restaurant';
  
  const { communityStats, isLoading } = useRestaurantReviews(placeId, restaurantName);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [allPhotos, setAllPhotos] = useState<Array<CommunityPhoto & { photoIndex: number; photoUrl: string }>>([]);
  const [displayedPhotos, setDisplayedPhotos] = useState<Array<CommunityPhoto & { photoIndex: number; photoUrl: string }>>([]);
  const [photosPerPage] = useState(48);
  const [hasMorePhotos, setHasMorePhotos] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [photosProcessed, setPhotosProcessed] = useState(false);

  useEffect(() => {
    if (communityStats?.recentPhotos) {
      // Flatten all photos from all users into a single array
      const photos: Array<CommunityPhoto & { photoIndex: number; photoUrl: string }> = [];
      
      communityStats.recentPhotos.forEach((photoData) => {
        // Check if photos array exists and has items
        if (photoData.photos && Array.isArray(photoData.photos)) {
          photoData.photos.forEach((photoUrl, index) => {
            if (photoUrl) { // Make sure the photo URL is not empty
              photos.push({
                ...photoData,
                photoIndex: index,
                photoUrl: photoUrl
              });
            }
          });
        }
      });
      
      setAllPhotos(photos);
      // Initially show first batch
      setDisplayedPhotos(photos.slice(0, photosPerPage));
      setHasMorePhotos(photos.length > photosPerPage);
      setPhotosProcessed(true);
    } else if (!isLoading) {
      // Only mark as processed if not loading and no photos received
      setPhotosProcessed(true);
    }
  }, [communityStats, photosPerPage, isLoading]);

  const loadMorePhotos = useCallback(() => {
    if (loadingMore || !hasMorePhotos) return;
    
    setLoadingMore(true);
    
    // Simulate a small delay for smooth UX
    setTimeout(() => {
      const nextBatch = allPhotos.slice(displayedPhotos.length, displayedPhotos.length + photosPerPage);
      const newDisplayedPhotos = [...displayedPhotos, ...nextBatch];
      
      setDisplayedPhotos(newDisplayedPhotos);
      setHasMorePhotos(newDisplayedPhotos.length < allPhotos.length);
      setLoadingMore(false);
    }, 300);
  }, [allPhotos, displayedPhotos, photosPerPage, loadingMore, hasMorePhotos]);

  const handleBack = () => {
    navigate(-1);
  };

  const openPhotoModal = (index: number) => {
    setSelectedPhotoIndex(index);
  };

  const closePhotoModal = () => {
    setSelectedPhotoIndex(null);
  };

  const goToPreviousPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1);
    }
  };

  const goToNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedPhotoIndex !== null && selectedPhotoIndex < allPhotos.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1);
    }
  };

  if (isLoading || !photosProcessed) {
    console.log('CommunityPhotoGalleryPage - Showing skeleton. isLoading:', isLoading, 'photosProcessed:', photosProcessed);
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
          <div className="flex items-center gap-3 p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-semibold text-lg">Community Photos</h1>
          </div>
        </div>
        <div className="p-4">
          <CommunityPhotosSkeleton count={24} />
        </div>
      </div>
    );
  }

  if (photosProcessed && !allPhotos.length) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
          <div className="flex items-center gap-3 p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-semibold text-lg">Community Photos</h1>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[50vh]">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Community Photos Yet</h3>
          <p className="text-muted-foreground mb-4">
            Be the first to share photos of {restaurantName}!
          </p>
        </div>
      </div>
    );
  }

  const currentPhoto = selectedPhotoIndex !== null ? displayedPhotos[selectedPhotoIndex] : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-lg">Community Photos</h1>
            <p className="text-sm text-muted-foreground">{restaurantName}</p>
          </div>
          <Badge variant="secondary">{allPhotos.length} photo{allPhotos.length === 1 ? '' : 's'}</Badge>
        </div>
      </div>

      {/* Photo Grid */}
      <div className="p-4 pb-safe">
        <div className="grid grid-cols-2 gap-3">
          {displayedPhotos.map((photo, index) => (
            <div key={`${photo.review_id}-${photo.photoIndex}`} className="group relative">
              <div 
                className="aspect-square cursor-pointer overflow-hidden rounded-lg bg-muted"
                onClick={() => openPhotoModal(index)}
              >
                <LazyImage
                  src={photo.photoUrl}
                  alt={
                    (photo.captions && photo.captions[photo.photoIndex]) || 
                    (photo.dish_names && photo.dish_names[photo.photoIndex]) || 
                    `Photo by ${photo.username}`
                  }
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              </div>
              
              {/* Photo Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 rounded-b-lg">
                <div className="flex items-center gap-2 text-white text-xs">
                  <User className="h-3 w-3" />
                  <span className="font-medium">{photo.username}</span>
                </div>
                
                {((photo.captions && photo.captions[photo.photoIndex]) || (photo.dish_names && photo.dish_names[photo.photoIndex])) && (
                  <p className="text-white text-xs mt-1 line-clamp-2">
                    {photo.dish_names && photo.dish_names[photo.photoIndex] && (
                      <span className="font-medium">{photo.dish_names[photo.photoIndex]} • </span>
                    )}
                    {photo.captions && photo.captions[photo.photoIndex]}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Infinite Scroll Loader */}
        {hasMorePhotos && (
          <InfiniteScrollLoader
            hasMore={hasMorePhotos}
            isLoading={loadingMore}
            onLoadMore={loadMorePhotos}
            loadMoreText={`Load More Photos (${allPhotos.length - displayedPhotos.length} remaining)`}
            className="mt-4"
          />
        )}
      </div>

      {/* Photo Modal */}
      {currentPhoto && selectedPhotoIndex !== null && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={closePhotoModal}
        >
          <div className="relative max-w-full max-h-full flex flex-col">
            <Button
              variant="ghost"
              size="sm"
              onClick={closePhotoModal}
              className="absolute top-4 right-4 z-10 h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white"
            >
              ×
            </Button>
            
            {/* Previous Arrow */}
            {selectedPhotoIndex > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPreviousPhoto}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 p-0 bg-black/50 hover:bg-black/70 text-white"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}
            
            {/* Next Arrow */}
            {selectedPhotoIndex < displayedPhotos.length - 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNextPhoto}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 p-0 bg-black/50 hover:bg-black/70 text-white"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            )}
            
            <img
              src={currentPhoto.photoUrl}
              alt="Full size photo"
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Photo Info Below */}
            {((currentPhoto.dish_names && currentPhoto.dish_names[currentPhoto.photoIndex]) || 
              (currentPhoto.captions && currentPhoto.captions[currentPhoto.photoIndex])) && (
              <div className="mt-4 bg-black/70 backdrop-blur-sm rounded-lg p-4 max-w-md mx-auto">
                <div className="flex items-center gap-2 text-white text-sm mb-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{currentPhoto.username}</span>
                </div>
                
                {currentPhoto.dish_names && currentPhoto.dish_names[currentPhoto.photoIndex] && (
                  <h3 className="text-white font-semibold text-lg mb-1">
                    {currentPhoto.dish_names[currentPhoto.photoIndex]}
                  </h3>
                )}
                
                {currentPhoto.captions && currentPhoto.captions[currentPhoto.photoIndex] && (
                  <p className="text-white/90 text-sm">
                    {currentPhoto.captions[currentPhoto.photoIndex]}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}