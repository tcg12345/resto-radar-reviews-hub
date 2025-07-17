import { useState } from 'react';
import { StarRating } from '@/components/StarRating';
import { CategoryRating } from '@/types/restaurant';
import { Label } from '@/components/ui/label';

interface WeightedRatingProps {
  categoryRatings?: CategoryRating;
  onRatingChange?: (categoryRatings: CategoryRating, weightedRating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// Calculate weighted rating: Food 50%, Service 30%, Atmosphere 20%
const calculateWeightedRating = (ratings: CategoryRating): number => {
  return (ratings.food * 0.5) + (ratings.service * 0.3) + (ratings.atmosphere * 0.2);
};

export function WeightedRating({ 
  categoryRatings = { food: 0, service: 0, atmosphere: 0 }, 
  onRatingChange, 
  readonly = false,
  size = 'md'
}: WeightedRatingProps) {
  const [ratings, setRatings] = useState<CategoryRating>(categoryRatings);

  const handleCategoryChange = (category: keyof CategoryRating, rating: number) => {
    const newRatings = { ...ratings, [category]: rating };
    setRatings(newRatings);
    
    const weightedRating = calculateWeightedRating(newRatings);
    onRatingChange?.(newRatings, weightedRating);
  };

  const weightedRating = calculateWeightedRating(ratings);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Food Quality <span className="text-muted-foreground">(50% weight)</span>
          </Label>
          <StarRating
            rating={ratings.food}
            onRatingChange={(rating) => handleCategoryChange('food', rating)}
            readonly={readonly}
            size={size}
            showValue={false}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Service <span className="text-muted-foreground">(30% weight)</span>
          </Label>
          <StarRating
            rating={ratings.service}
            onRatingChange={(rating) => handleCategoryChange('service', rating)}
            readonly={readonly}
            size={size}
            showValue={false}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Atmosphere <span className="text-muted-foreground">(20% weight)</span>
          </Label>
          <StarRating
            rating={ratings.atmosphere}
            onRatingChange={(rating) => handleCategoryChange('atmosphere', rating)}
            readonly={readonly}
            size={size}
            showValue={false}
          />
        </div>
      </div>

      {(ratings.food > 0 || ratings.service > 0 || ratings.atmosphere > 0) && (
        <div className="pt-2 border-t">
          <Label className="text-sm font-medium mb-2 block">Overall Rating</Label>
          <div className="flex items-center gap-2">
            <StarRating
              rating={weightedRating}
              readonly={true}
              size={size}
              showValue={false}
            />
            <span className={`font-medium ${
              size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'
            }`}>
              {weightedRating.toFixed(1)}/10
            </span>
          </div>
        </div>
      )}
    </div>
  );
}