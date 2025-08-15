
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
  const isSelected = className.includes('text-red-600');
  
  return (
    <img 
      src={isSelected ? "/lovable-uploads/6da4f98c-0208-435e-81b0-b34ddf8513a7.png" : "/lovable-uploads/4184d3a1-346a-454b-ad4f-5db720774949.png"}
      alt="Michelin Star"
      className={`${className} mt-0.5`}
      style={{ 
        width: '20px',
        height: '20px',
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
