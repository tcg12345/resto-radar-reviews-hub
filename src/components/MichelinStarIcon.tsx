
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
  const isSelected = fill === 'currentColor' || className.includes('text-red-600');
  
  return (
    <img 
      src={isSelected ? "/lovable-uploads/744e2b08-8d2e-4a6a-9826-09b73f10bb70.png" : "/lovable-uploads/4184d3a1-346a-454b-ad4f-5db720774949.png"}
      alt="Michelin Star"
      className={`${className} mt-0.5`}
      style={{ 
        objectFit: 'contain',
        filter: fill !== 'currentColor' && fill !== '#dc2626' ? `hue-rotate(${getHueRotation(fill)})` : undefined
      }}
    />
  );

  function getHueRotation(color: string): string {
    // Simple color mapping for common colors
    const colorMap: { [key: string]: string } = {
      'red': '0deg',
      '#dc2626': '0deg', 
      'blue': '240deg',
      'green': '120deg',
      'purple': '270deg',
      'orange': '30deg',
      'yellow': '60deg'
    };
    return colorMap[color] || '0deg';
  }
});

MichelinStarIcon.displayName = 'MichelinStarIcon';
