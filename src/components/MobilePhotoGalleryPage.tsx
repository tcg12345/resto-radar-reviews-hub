import { useState } from 'react';
import { ArrowLeft, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhotoGallery } from '@/components/PhotoGallery';

interface MobilePhotoGalleryPageProps {
  photos: string[];
  photoCaptions?: string[];
  isOpen: boolean;
  onClose: () => void;
  restaurantName?: string;
}

export function MobilePhotoGalleryPage({
  photos,
  photoCaptions = [],
  isOpen,
  onClose,
  restaurantName
}: MobilePhotoGalleryPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  // Filter photos based on search query
  const filteredPhotos = photos.filter((_, index) => {
    const caption = photoCaptions[index] || '';
    return caption.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handlePhotoClick = (originalIndex: number) => {
    setSelectedPhotoIndex(originalIndex);
  };

  const closePhotoView = () => {
    setSelectedPhotoIndex(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-4 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold flex-1 text-center pr-8">
            {restaurantName || 'Photos'}
          </h1>
        </div>
        
        {/* Search Bar */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search photos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setSearchQuery('')}
              >
                ×
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Photo Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {(searchQuery ? filteredPhotos : photos).map((photo, index) => {
            // Get the original index for photos when searching
            const originalIndex = searchQuery 
              ? photos.findIndex(p => p === photo)
              : index;
            
            const caption = photoCaptions[originalIndex];
            
            return (
              <div
                key={originalIndex}
                className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group"
                onClick={() => handlePhotoClick(originalIndex)}
              >
                <img
                  src={photo}
                  alt={caption || `Photo ${originalIndex + 1}`}
                  className="w-full h-full object-cover transition-transform duration-200 group-active:scale-95"
                />
                
                {/* Overlay with caption */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Heart icon */}
                <div className="absolute top-3 left-3">
                  <Heart className="h-5 w-5 text-white fill-white/20" />
                </div>
                
                {/* Caption */}
                {caption && (
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-white text-sm font-medium truncate">
                      {caption}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* No results message */}
        {searchQuery && filteredPhotos.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No photos found for "{searchQuery}"</p>
          </div>
        )}
      </div>

      {/* Individual Photo View */}
      {selectedPhotoIndex !== null && (
        <PhotoGallery
          photos={photos}
          photoCaptions={photoCaptions}
          initialIndex={selectedPhotoIndex}
          isOpen={true}
          onClose={closePhotoView}
          restaurantName={restaurantName}
          isMobile={true}
        />
      )}
    </div>
  );
}