import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RestaurantPhotoCarouselProps {
  photos: string[];
  restaurantName: string;
}

export function RestaurantPhotoCarousel({ photos, restaurantName }: RestaurantPhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!photos || photos.length === 0) {
    return null;
  }

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? photos.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === photos.length - 1 ? 0 : prevIndex + 1
    );
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className="relative group">
      {/* Main Photo */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
        <img 
          src={photos[currentIndex]} 
          alt={`${restaurantName} photo ${currentIndex + 1}`}
          className="w-full h-full object-contain transition-all duration-300"
        />
        
        {/* Navigation Arrows - only show if more than one photo */}
        {photos.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-background/80 hover:bg-background/90"
              onClick={goToPrevious}
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-background/80 hover:bg-background/90"
              onClick={goToNext}
              aria-label="Next photo"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
        
        {/* Photo Counter */}
        {photos.length > 1 && (
          <div className="absolute top-2 right-2 bg-background/80 text-foreground px-2 py-1 rounded text-xs">
            {currentIndex + 1} / {photos.length}
          </div>
        )}
      </div>
      
      {/* Dots Indicator - only show if more than one photo */}
      {photos.length > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          {photos.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === currentIndex 
                  ? 'bg-primary scale-125' 
                  : 'bg-muted-foreground/40 hover:bg-muted-foreground/60'
              }`}
              aria-label={`Go to photo ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}