import React from 'react';
import { Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ExpertBadgeProps {
  showIcon?: boolean;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'inline';
  className?: string;
}

export function ExpertBadge({ 
  showIcon = true, 
  showText = true, 
  size = 'md',
  variant = 'default',
  className = '' 
}: ExpertBadgeProps) {
  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4', 
    lg: 'h-5 w-5'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-xs',
    lg: 'text-sm'
  };

  const paddings = {
    sm: 'px-1.5 py-0.5',
    md: 'px-2 py-0.5',
    lg: 'px-2.5 py-1'
  };

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        {showIcon && <Crown className={`${iconSizes[size]} text-primary fill-primary/20`} />}
        {showText && (
          <Badge 
            variant="secondary" 
            className={`${textSizes[size]} ${paddings[size]} bg-primary/10 text-primary border-primary/20`}
          >
            Expert
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Badge 
      variant="secondary" 
      className={`${textSizes[size]} ${paddings[size]} bg-primary/10 text-primary border-primary/20 flex items-center gap-1 ${className}`}
    >
      {showIcon && <Crown className={`${iconSizes[size]} fill-primary/20`} />}
      {showText && 'Expert'}
    </Badge>
  );
}