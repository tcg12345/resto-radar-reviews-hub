import React from 'react';
import { MichelinStarIcon } from './MichelinStarIcon';

interface MichelinStarsProps {
  stars?: number;
  onStarsChange?: (stars: number | undefined) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const MichelinStars = React.memo(({ 
  stars, 
  onStarsChange, 
  readonly = false, 
  size = 'md' 
}: MichelinStarsProps) => {
  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const displayStars = stars || 0;

  const handleStarClick = (starCount: number) => {
    if (readonly) return;
    // If clicking the same number of stars, remove all stars
    const newStars = starCount === stars ? undefined : starCount;
    onStarsChange?.(newStars);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {readonly || displayStars > 0 
          ? Array.from({ length: displayStars }, (_, index) => (
              <MichelinStarIcon
                key={index}
                className={`${sizeClasses[size]} text-red-600`}
              />
            ))
          : [1, 2, 3].map((starCount) => {
              const isFilled = starCount <= displayStars;
              
              return (
                <button
                  key={starCount}
                  type="button"
                  onClick={() => handleStarClick(starCount)}
                  className="transition-all duration-150 cursor-pointer hover:scale-110"
                >
                  <MichelinStarIcon
                    className={`${sizeClasses[size]} transition-colors duration-150 ${
                      isFilled
                        ? 'text-red-600'
                        : 'text-gray-400 hover:text-red-500'
                    }`}
                  />
                </button>
              );
            })
        }
      </div>
      
      {displayStars > 0 && (
        <img 
          src="/lovable-uploads/a19328d3-fb1d-41e4-b595-caaee16a8c16.png"
          alt="Michelin"
          className={`${sizeClasses[size]} object-contain`}
        />
      )}
      
      {!readonly && onStarsChange && displayStars === 0 && (
        <span className={`text-muted-foreground ${textSizeClasses[size]}`}>
          Select Michelin stars
        </span>
      )}
    </div>
  );
});

MichelinStars.displayName = 'MichelinStars';
