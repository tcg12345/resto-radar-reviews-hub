import React, { useState, useEffect } from 'react';
import { Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRatingStats } from '@/hooks/useRatingStats';

interface ExpertIndicatorProps {
  placeId?: string;
  restaurantName?: string;
  size?: 'sm' | 'md';
  showCount?: boolean;
}

export function ExpertIndicator({ 
  placeId, 
  restaurantName, 
  size = 'sm',
  showCount = false 
}: ExpertIndicatorProps) {
  const { expertStats } = useRatingStats(placeId, restaurantName);

  // Don't show indicator if no expert reviews
  if (!expertStats.count || expertStats.count === 0) {
    return null;
  }

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const padding = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1';

  return (
    <Badge 
      variant="secondary" 
      className={`${textSize} ${padding} bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 flex items-center gap-1`}
    >
      <Award className={`${iconSize} fill-current`} />
      {showCount ? `${expertStats.count} Expert${expertStats.count !== 1 ? 's' : ''}` : 'Expert Reviewed'}
    </Badge>
  );
}