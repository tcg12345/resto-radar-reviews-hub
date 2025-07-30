import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface PhotoGalleryProps {
  photos: string[];
  photoCaptions?: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  restaurantName?: string;
  isMobile?: boolean;
}

export function PhotoGallery({ 
  photos, 
  photoCaptions = [],
  initialIndex = 0, 
  isOpen, 
  onClose, 
  restaurantName,
  isMobile = false
}: PhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showGrid, setShowGrid] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setShowGrid(false);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          if (showGrid) {
            setShowGrid(false);
          } else {
            onClose();
          }
          break;
        case 'ArrowLeft':
          if (!showGrid) goToPrevious();
          break;
        case 'ArrowRight':
          if (!showGrid) goToNext();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, photos.length, showGrid]);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const downloadImage = () => {
    const link = document.createElement('a');
    link.href = photos[currentIndex];
    link.download = `${restaurantName || 'restaurant'}-photo-${currentIndex + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectPhoto = (index: number) => {
    setCurrentIndex(index);
    setShowGrid(false);
  };

  if (!isOpen || photos.length === 0) return null;

  // Mobile version with bottom sheet
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent 
          side="bottom" 
          className="h-[90vh] p-0 bg-black/95 border-0"
        >
          <div className="relative w-full h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-black/80 backdrop-blur-sm">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-white hover:bg-white/20"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
              
              <div className="text-white text-sm font-medium">
                {currentIndex + 1} / {photos.length}
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-white hover:bg-white/20"
                  onClick={() => setShowGrid(!showGrid)}
                >
                  <Grid3X3 className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-white hover:bg-white/20"
                  onClick={downloadImage}
                >
                  <Download className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Grid View */}
            {showGrid && (
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, index) => (
                    <button
                      key={index}
                      onClick={() => selectPhoto(index)}
                      className={`relative aspect-square rounded-lg overflow-hidden ${
                        index === currentIndex 
                          ? 'ring-2 ring-white' 
                          : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={photo}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {photoCaptions[index] && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
                          {photoCaptions[index]}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Single Photo View */}
            {!showGrid && (
              <>
                <div className="flex-1 relative flex items-center justify-center p-4">
                  <img
                    src={photos[currentIndex]}
                    alt={`${restaurantName || 'Restaurant'} photo ${currentIndex + 1}`}
                    className="max-w-full max-h-full object-contain"
                  />
                  
                  {/* Navigation buttons */}
                  {photos.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-black/50 text-white hover:bg-black/70"
                        onClick={goToPrevious}
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-black/50 text-white hover:bg-black/70"
                        onClick={goToNext}
                      >
                        <ChevronRight className="h-6 w-6" />
                      </Button>
                    </>
                  )}
                </div>

                {/* Caption */}
                {photoCaptions[currentIndex] && (
                  <div className="p-4 bg-black/80 backdrop-blur-sm">
                    <p className="text-white text-sm text-center">
                      {photoCaptions[currentIndex]}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop version with enhanced dialog
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-0 bg-black/95 backdrop-blur-sm">
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Header Controls */}
          <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {photos.length > 1 && (
                <div className="px-3 py-1 rounded-full bg-black/50 text-white text-sm font-medium">
                  {currentIndex + 1} / {photos.length}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {photos.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70"
                  onClick={() => setShowGrid(!showGrid)}
                >
                  <Grid3X3 className="h-5 w-5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70"
                onClick={downloadImage}
              >
                <Download className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Grid View */}
          {showGrid && (
            <div className="absolute inset-0 z-40 bg-black/95 p-16 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
                {photos.map((photo, index) => (
                  <button
                    key={index}
                    onClick={() => selectPhoto(index)}
                    className={`group relative aspect-square rounded-lg overflow-hidden transition-all hover:scale-105 ${
                      index === currentIndex 
                        ? 'ring-2 ring-white' 
                        : 'hover:ring-1 hover:ring-white/50'
                    }`}
                  >
                    <img
                      src={photo}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    {photoCaptions[index] && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-xs p-2 transform translate-y-full group-hover:translate-y-0 transition-transform">
                        {photoCaptions[index]}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Single Photo View */}
          {!showGrid && (
            <>
              <div className="relative w-full h-full flex items-center justify-center p-16">
                <img
                  src={photos[currentIndex]}
                  alt={`${restaurantName || 'Restaurant'} photo ${currentIndex + 1}`}
                  className="max-w-full max-h-full object-contain animate-fade-in"
                />
              </div>

              {/* Navigation buttons */}
              {photos.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all hover:scale-110"
                    onClick={goToPrevious}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all hover:scale-110"
                    onClick={goToNext}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </>
              )}

              {/* Caption */}
              {photoCaptions[currentIndex] && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-[80%] z-50">
                  <div className="bg-black/80 text-white px-6 py-3 rounded-lg text-center backdrop-blur-sm">
                    <p className="text-sm">{photoCaptions[currentIndex]}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}