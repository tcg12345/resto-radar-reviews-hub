import { useState, useEffect } from 'react';
import { Star, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { LazyImage } from '@/components/LazyImage';

interface DishRating {
  dishName: string;
  rating: number;
  photoUrl: string;
  index: number;
  isHighlight: boolean;
}

interface DishRatingPopupProps {
  isOpen: boolean;
  onClose: () => void;
  previewImages: string[];
  photoDishNames: string[];
  dishRatings: number[];
  onRatingsUpdate: (ratings: number[], highlightIndex: number | null) => void;
  highlightDishIndex: number | null;
}

export function DishRatingPopup({ 
  isOpen, 
  onClose, 
  previewImages, 
  photoDishNames, 
  dishRatings,
  onRatingsUpdate,
  highlightDishIndex
}: DishRatingPopupProps) {
  const [localRatings, setLocalRatings] = useState<number[]>(dishRatings);
  const [localHighlightIndex, setLocalHighlightIndex] = useState<number | null>(highlightDishIndex);

  useEffect(() => {
    setLocalRatings(dishRatings);
    setLocalHighlightIndex(highlightDishIndex);
  }, [dishRatings, highlightDishIndex, isOpen]);

  // Create sorted dish data for ranking
  const sortedDishes: DishRating[] = previewImages.map((photoUrl, index) => ({
    dishName: photoDishNames[index] || `Dish ${index + 1}`,
    rating: localRatings[index] || 0,
    photoUrl,
    index,
    isHighlight: localHighlightIndex === index
  })).sort((a, b) => b.rating - a.rating);

  const handleRatingChange = (originalIndex: number, newRating: number) => {
    const updatedRatings = [...localRatings];
    updatedRatings[originalIndex] = newRating;
    setLocalRatings(updatedRatings);
  };

  const handleHighlightToggle = (originalIndex: number) => {
    const newHighlightIndex = localHighlightIndex === originalIndex ? null : originalIndex;
    setLocalHighlightIndex(newHighlightIndex);
  };

  const handleSave = () => {
    onRatingsUpdate(localRatings, localHighlightIndex);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-rating-filled" />
            Rate Your Dishes
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {sortedDishes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No photos to rate. Add some photos first!
            </p>
          ) : (
            sortedDishes.map((dish, rankIndex) => (
              <div key={dish.index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <LazyImage
                      src={dish.photoUrl}
                      alt={dish.dishName}
                      className="w-16 h-16 rounded-md object-cover"
                    />
                    {dish.isHighlight && (
                      <Award className="absolute -top-1 -right-1 h-5 w-5 text-amber-500 fill-amber-500" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs">
                          #{rankIndex + 1}
                        </span>
                        <h3 className="font-medium">{dish.dishName}</h3>
                      </div>
                      
                      <Button
                        type="button"
                        variant={dish.isHighlight ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleHighlightToggle(dish.index)}
                        className="flex items-center gap-1 text-xs"
                      >
                        <Award className="h-3 w-3" />
                        {dish.isHighlight ? "Highlighted" : "Highlight"}
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Rating:</span>
                        <span className="font-medium">{dish.rating}/10</span>
                      </div>
                      
                      <Slider
                        value={[dish.rating]}
                        onValueChange={(value) => handleRatingChange(dish.index, value[0])}
                        max={10}
                        min={0}
                        step={0.1}
                        className="w-full"
                      />
                      
                      <div className="flex items-center gap-1 justify-center">
                        {[...Array(10)].map((_, i) => {
                          const fillPercentage = Math.max(0, Math.min(1, dish.rating - i));
                          const isPartiallyFilled = fillPercentage > 0 && fillPercentage < 1;
                          
                          return (
                            <div key={i} className="relative">
                              <Star
                                size={12}
                                className="fill-rating-empty text-rating-empty"
                              />
                              {fillPercentage > 0 && (
                                <div 
                                  className="absolute inset-0 overflow-hidden"
                                  style={{ width: `${fillPercentage * 100}%` }}
                                >
                                  <Star
                                    size={12}
                                    className="fill-rating-filled text-rating-filled"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save Ratings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}