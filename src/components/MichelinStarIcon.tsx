
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
      fill={fill}
      stroke={stroke}
      strokeWidth="0"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="translate(50,50)">
        {/* Six-petaled rosette shape for Michelin star */}
        <path d="M0,-40 Q-8,-25 -20,-25 Q-35,-15 -35,0 Q-35,15 -20,25 Q-8,25 0,40 Q8,25 20,25 Q35,15 35,0 Q35,-15 20,-25 Q8,-25 0,-40 Z" />
        <path d="M0,-30 Q-5,-20 -15,-20 Q-25,-12 -25,0 Q-25,12 -15,20 Q-5,20 0,30 Q5,20 15,20 Q25,12 25,0 Q25,-12 15,-20 Q5,-20 0,-30 Z" 
              fill="white" opacity="0.3"/>
      </g>
    </svg>
  );
});

MichelinStarIcon.displayName = 'MichelinStarIcon';
