import { useState } from 'react';
import { LazyImage } from '@/components/LazyImage';

interface MobilePhotoDisplayProps {
  photos: string[];
  restaurantName?: string;
}

export function MobilePhotoDisplay({ photos, restaurantName }: MobilePhotoDisplayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!photos || photos.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Main photo */}
      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
        <LazyImage
          src={photos[currentIndex]}
          alt={`${restaurantName || 'Restaurant'} photo ${currentIndex + 1}`}
          className="w-full h-full object-cover"
        />
        
        {photos.length > 1 && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/50 text-white text-xs font-medium">
            {currentIndex + 1} / {photos.length}
          </div>
        )}
      </div>

      {/* Photo thumbnails */}
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {photos.map((photo, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`relative flex-shrink-0 w-16 h-16 rounded overflow-hidden transition-all ${
                index === currentIndex 
                  ? 'ring-2 ring-primary scale-105' 
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              <LazyImage
                src={photo}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}