
import React from 'react';

interface MichelinStarIconProps {
  className?: string;
  fill?: string;
  stroke?: string;
}

export const MichelinStarIcon = React.memo(({ 
  className = "h-5 w-5", 
  fill = "currentColor", 
  stroke = "none" 
}: MichelinStarIconProps) => {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={fill}
      stroke={stroke}
      strokeWidth="0"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
});

MichelinStarIcon.displayName = 'MichelinStarIcon';
