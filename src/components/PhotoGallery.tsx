import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Grid3X3, ArrowLeft, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchPage, setShowSearchPage] = useState(true);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setShowGrid(false);
    setSearchQuery('');
    setShowSearchPage(isMobile);
  }, [initialIndex, isOpen, isMobile]);

  // Prevent body scroll when photo gallery is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          if (showGrid || (!isMobile && showSearchPage)) {
            setShowGrid(false);
            setShowSearchPage(false);
          } else {
            onClose();
          }
          break;
        case 'ArrowLeft':
          if (!showGrid && !showSearchPage) goToPrevious();
          break;
        case 'ArrowRight':
          if (!showGrid && !showSearchPage) goToNext();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, photos.length, showGrid, showSearchPage, isMobile]);

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
    setShowSearchPage(false);
  };

  // Filter photos based on search query
  const filteredPhotos = photos.filter((_, index) => {
    const caption = photoCaptions[index] || '';
    return caption.toLowerCase().includes(searchQuery.toLowerCase());
  });

  console.log('PhotoGallery debug:', { photos, photosLength: photos.length, isOpen });
  
  if (!isOpen || photos.length === 0) return null;

  // Mobile version with full-page grid
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
        {showSearchPage ? (
          <>
            {/* Mobile Grid View */}
            <div className="sticky top-0 z-10 bg-background border-b flex-shrink-0">
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

            {/* Photo Grid - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  {(searchQuery ? filteredPhotos : photos).map((photo, index) => {
                    const originalIndex = searchQuery 
                      ? photos.findIndex(p => p === photo)
                      : index;
                    
                    const caption = photoCaptions[originalIndex];
                    
                    return (
                      <div
                        key={originalIndex}
                        className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group"
                        onClick={() => selectPhoto(originalIndex)}
                      >
                        <img
                          src={photo}
                          alt={caption || `Photo ${originalIndex + 1}`}
                          className="w-full h-full object-cover transition-transform duration-200 group-active:scale-95"
                        />
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        
                        <div className="absolute top-3 left-3">
                          <Heart className="h-5 w-5 text-white fill-white/20" />
                        </div>
                        
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

                {searchQuery && filteredPhotos.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No photos found for "{searchQuery}"</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Mobile Single Photo View */
          <div className="relative w-full h-full flex flex-col bg-black">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-black/80 backdrop-blur-sm">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-white hover:bg-white/20"
                onClick={() => setShowSearchPage(true)}
              >
                <ArrowLeft className="h-5 w-5" />
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

            {showGrid ? (
              /* Mobile Grid in Photo View */
              <div className="flex-1 p-4 overflow-y-auto bg-black">
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
            ) : (
              /* Single Photo Display */
              <>
                <div className="flex-1 relative flex items-center justify-center">
                  <img
                    src={photos[currentIndex]}
                    alt={`${restaurantName || 'Restaurant'} photo ${currentIndex + 1}`}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      console.error('Photo failed to load:', photos[currentIndex]);
                      
                      // Try loading with a different maxwidth parameter
                      const currentSrc = e.currentTarget.src;
                      if (currentSrc.includes('maxwidth=640')) {
                        console.log('Trying alternative image size...');
                        e.currentTarget.src = currentSrc.replace('maxwidth=640', 'maxwidth=400');
                        return;
                      }
                      
                      // If alternative size also fails, show fallback
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                    onLoad={() => {
                      console.log('Photo loaded successfully:', photos[currentIndex]);
                    }}
                  />
                  {/* Fallback placeholder */}
                  <div 
                    className="hidden w-full h-64 bg-muted/30 border-2 border-dashed border-muted-foreground/20 rounded-lg flex items-center justify-center"
                    style={{display: 'none'}}
                  >
                    <div className="text-center">
                      <div className="text-muted-foreground text-sm">Photo temporarily unavailable</div>
                      <div className="text-xs text-muted-foreground/60 mt-1">Try refreshing or check your connection</div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          // Retry loading the original image
                          const img = document.querySelector('img[alt*="photo"]') as HTMLImageElement;
                          const fallback = document.querySelector('[style*="display: flex"]') as HTMLElement;
                          if (img && fallback) {
                            fallback.style.display = 'none';
                            img.style.display = 'block';
                            img.src = photos[currentIndex];
                          }
                        }}
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                  
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
        )}
      </div>
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