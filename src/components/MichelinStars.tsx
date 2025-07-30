import React from 'react';
import { MichelinStarIcon } from './MichelinStarIcon';
interface MichelinStarsProps {
  stars?: number;
  onStarsChange?: (stars: number | undefined) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLogo?: boolean;
}
export const MichelinStars = React.memo(({
  stars,
  onStarsChange,
  readonly = false,
  size = 'md',
  showLogo = true
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
  return <div className="flex items-center gap-0">
      <div className="flex items-center gap-0.5">
        {readonly ? Array.from({
        length: displayStars
      }, (_, index) => <MichelinStarIcon key={index} className={`${sizeClasses[size]} text-red-600`} />) : [1, 2, 3].map(starCount => {
        const isFilled = starCount <= displayStars;
        return <button key={starCount} type="button" onClick={() => handleStarClick(starCount)} className="transition-all duration-150 cursor-pointer hover:scale-110">
                  <MichelinStarIcon className={`${sizeClasses[size]} transition-colors duration-150 ${isFilled ? 'text-red-600' : 'text-gray-400 hover:text-red-500'}`} />
                </button>;
      })}
      </div>
      
      {displayStars > 0 && showLogo && <>
          
          
        </>}
      
      {!readonly && onStarsChange && displayStars === 0 && <span className={`text-muted-foreground ${textSizeClasses[size]}`}>
          Select Michelin stars
        </span>}
    </div>;
});
MichelinStars.displayName = 'MichelinStars';