
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
      <g transform="translate(50,50)">
        {/* Six petal rosette - Michelin logo style */}
        {[0, 60, 120, 180, 240, 300].map((rotation, index) => (
          <path
            key={index}
            d="M0,-35 Q-12,-25 -12,-10 Q-12,5 0,15 Q12,5 12,-10 Q12,-25 0,-35"
            transform={`rotate(${rotation})`}
            fill="none"
            stroke={fill}
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
      </g>
    </svg>
  );
});

MichelinStarIcon.displayName = 'MichelinStarIcon';
