import { useState } from 'react';
import { Star } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [sliderStep, setSliderStep] = useState<number>(0.01);

  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-7 w-7'
  };

  const textSizeClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl'
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
            {displayRating}/10
          </span>
        )}
      </div>

      {/* Slider for decimal precision - only show when not readonly */}
      {!readonly && onRatingChange && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Fine-tune rating</span>
            <div className="flex items-center gap-2">
              <span>Step:</span>
              <Select
                value={sliderStep.toString()}
                onValueChange={(value) => setSliderStep(parseFloat(value))}
              >
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="0.1">0.1</SelectItem>
                  <SelectItem value="0.01">0.01</SelectItem>
                </SelectContent>
              </Select>
              <span>{rating.toFixed(2)}/10</span>
            </div>
          </div>
          <Slider
            value={[rating]}
            onValueChange={handleSliderChange}
            max={10}
            min={0}
            step={sliderStep}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}