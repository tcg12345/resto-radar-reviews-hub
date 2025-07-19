import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DisplayStarRatingProps {
  rating: number;
  totalStars?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  source?: 'google' | 'yelp';
  className?: string;
}

export function DisplayStarRating({ 
  rating, 
  totalStars = 5, 
  size = 'md', 
  showValue = false,
  source = 'google',
  className 
}: DisplayStarRatingProps) {
  console.log('DisplayStarRating rendered with source:', source, 'rating:', rating);
  
  const starSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const starColors = {
    google: 'text-yellow-500',
    yelp: 'text-red-500'
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex">
        {Array.from({ length: totalStars }).map((_, index) => {
          const starNumber = index + 1;
          const isFilled = starNumber <= Math.floor(rating);
          const isHalfFilled = starNumber === Math.ceil(rating) && rating % 1 !== 0;

          return (
            <div key={index} className="relative">
              <Star
                className={cn(
                  starSizes[size],
                  'text-gray-300'
                )}
              />
              {(isFilled || isHalfFilled) && (
                <Star
                  className={cn(
                    starSizes[size],
                    starColors[source],
                    'absolute top-0 left-0 fill-current',
                    isHalfFilled && 'w-1/2 overflow-hidden'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      {showValue && (
        <span className="text-sm text-muted-foreground ml-1">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}