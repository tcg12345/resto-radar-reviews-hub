import { useState } from 'react';
import { Star } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
}

export function StarRating({ 
  rating, 
  onRatingChange, 
  readonly = false, 
  size = 'md',
  showValue = true 
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const displayRating = hoverRating ?? rating;

  const handleSliderChange = (value: number[]) => {
    const newRating = value[0];
    onRatingChange?.(newRating);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {[...Array(10)].map((_, index) => {
            const starValue = index + 1;
            const isFilled = starValue <= displayRating;
            const isPartiallyFilled = starValue > displayRating && starValue - 1 < displayRating;
            
            return (
              <button
                key={index}
                type="button"
                disabled={readonly}
                onMouseEnter={() => !readonly && setHoverRating(starValue)}
                onMouseLeave={() => !readonly && setHoverRating(null)}
                onClick={() => !readonly && onRatingChange?.(starValue)}
                className={`transition-all duration-150 ${
                  readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
                }`}
              >
                <div className="relative">
                  <Star
                    className={`${sizeClasses[size]} transition-colors duration-150 ${
                      isFilled
                        ? 'fill-rating-filled text-rating-filled'
                        : 'fill-rating-empty text-rating-empty hover:fill-rating-hover hover:text-rating-hover'
                    }`}
                  />
                  {isPartiallyFilled && (
                    <div 
                      className="absolute inset-0 overflow-hidden"
                      style={{ width: `${((displayRating % 1) * 100)}%` }}
                    >
                      <Star
                        className={`${sizeClasses[size]} fill-rating-filled text-rating-filled`}
                      />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        
        {showValue && (
          <span className={`font-medium text-foreground ${textSizeClasses[size]}`}>
            {displayRating.toFixed(1)}/10
          </span>
        )}
      </div>

      {/* Slider for decimal precision - only show when not readonly */}
      {!readonly && onRatingChange && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Fine-tune rating</span>
            <span>{rating.toFixed(2)}/10</span>
          </div>
          <Slider
            value={[rating]}
            onValueChange={handleSliderChange}
            max={10}
            min={0}
            step={0.01}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}