import { useState, useEffect } from 'react';
import { Camera, ExternalLink, Loader2 } from 'lucide-react';
import { useTripAdvisorApi } from '@/hooks/useTripAdvisorApi';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface TripAdvisorPhotoGalleryProps {
  placeName: string;
  placeAddress: string;
  maxPhotos?: number;
  showTitle?: boolean;
  compact?: boolean;
}

export function TripAdvisorPhotoGallery({ 
  placeName, 
  placeAddress, 
  maxPhotos = 8, 
  showTitle = true,
  compact = false 
}: TripAdvisorPhotoGalleryProps) {
  const [photos, setPhotos] = useState<any[]>([]);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const { searchLocations, getLocationPhotos } = useTripAdvisorApi();

  useEffect(() => {
    loadPhotos();
  }, [placeName, placeAddress]);

  const loadPhotos = async () => {
    if (!placeName || !placeAddress) return;

    setIsLoading(true);
    try {
      const searchQuery = `${placeName} ${placeAddress}`;
      const locations = await searchLocations(searchQuery);
      
      if (locations && locations.length > 0) {
        const location = locations[0];
        setLocationId(location.location_id);
        
        const photoData = await getLocationPhotos(location.location_id, maxPhotos);
        setPhotos(photoData || []);
      }
    } catch (error) {
      console.error('Error loading TripAdvisor photos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoClick = (photo: any) => {
    setSelectedPhoto(photo);
    setIsLightboxOpen(true);
  };

  const getImageUrl = (photo: any, size: 'thumbnail' | 'small' | 'medium' | 'large' | 'original' = 'medium') => {
    return photo.images?.[size]?.url || 
           photo.images?.medium?.url || 
           photo.images?.small?.url || 
           photo.images?.thumbnail?.url;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading photos from TripAdvisor...
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return null;
  }

  const gridCols = compact ? 'grid-cols-2' : 'grid-cols-3 lg:grid-cols-4';
  const photoHeight = compact ? 'aspect-video' : 'aspect-square';

  return (
    <>
      <div className="space-y-3">
        {showTitle && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-600" />
              <h4 className="font-semibold">Photos from TripAdvisor</h4>
            </div>
            {locationId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(`https://www.tripadvisor.com/LocationPhotoDirectLink-g${locationId}`, '_blank')}
                className="text-xs"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                View all
              </Button>
            )}
          </div>
        )}
        
        <div className={`grid ${gridCols} gap-2 ${compact ? 'max-h-48' : 'max-h-64'} overflow-y-auto`}>
          {photos.map((photo, index) => (
            <div 
              key={photo.id || index} 
              className={`relative ${photoHeight} rounded-lg overflow-hidden bg-muted cursor-pointer group`}
              onClick={() => handlePhotoClick(photo)}
            >
              <img
                src={getImageUrl(photo)}
                alt={photo.caption || `${placeName} photo`}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              {photo.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-white text-xs truncate">{photo.caption}</p>
                </div>
              )}
              {photo.user?.username && (
                <div className="absolute top-1 right-1 bg-black/60 text-white px-1 py-0.5 rounded text-xs">
                  📷 {photo.user.username}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Photo Lightbox */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              {selectedPhoto?.caption || `${placeName} Photo`}
            </DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <div className="space-y-4">
              <div className="relative max-h-[70vh] overflow-hidden rounded-lg">
                <img
                  src={getImageUrl(selectedPhoto, 'large')}
                  alt={selectedPhoto.caption || `${placeName} photo`}
                  className="w-full h-auto object-contain"
                />
              </div>
              
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                {selectedPhoto.user?.username && (
                  <span>Photo by {selectedPhoto.user.username}</span>
                )}
                {selectedPhoto.published_date && (
                  <span>{new Date(selectedPhoto.published_date).toLocaleDateString()}</span>
                )}
              </div>
              
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => window.open(`https://www.tripadvisor.com/LocationPhotoDirectLink-g${locationId}`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on TripAdvisor
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}