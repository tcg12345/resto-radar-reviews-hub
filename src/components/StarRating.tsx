import { useState } from 'react';
import { Star } from 'lucide-react';

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

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {[...Array(10)].map((_, index) => {
          const starValue = index + 1;
          const isFilled = starValue <= displayRating;
          
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
              <Star
                className={`${sizeClasses[size]} transition-colors duration-150 ${
                  isFilled
                    ? 'fill-rating-filled text-rating-filled'
                    : 'fill-rating-empty text-rating-empty hover:fill-rating-hover hover:text-rating-hover'
                }`}
              />
            </button>
          );
        })}
      </div>
      
      {showValue && (
        <span className={`font-medium text-foreground ${textSizeClasses[size]}`}>
          {displayRating % 1 === 0 ? displayRating : displayRating.toFixed(1)}/10
        </span>
      )}
    </div>
  );
}