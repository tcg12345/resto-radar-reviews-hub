
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
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      stroke={fill}
      strokeWidth="3"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Simple 6-petal Michelin rosette */}
      <g transform="translate(50,50)">
        <circle cx="0" cy="-30" r="12" />
        <circle cx="26" cy="-15" r="12" />
        <circle cx="26" cy="15" r="12" />
        <circle cx="0" cy="30" r="12" />
        <circle cx="-26" cy="15" r="12" />
        <circle cx="-26" cy="-15" r="12" />
      </g>
    </svg>
  );
});

MichelinStarIcon.displayName = 'MichelinStarIcon';
