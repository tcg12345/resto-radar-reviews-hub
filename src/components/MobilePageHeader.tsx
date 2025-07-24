import React from 'react';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface MobilePageHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  backUrl?: string;
  rightAction?: React.ReactNode;
  className?: string;
  transparent?: boolean;
}

export function MobilePageHeader({ 
  title, 
  subtitle, 
  showBackButton = false,
  backUrl,
  rightAction,
  className = '',
  transparent = false
}: MobilePageHeaderProps) {
  const navigate = useNavigate();

  const handleBackClick = () => {
    if (backUrl) {
      navigate(backUrl);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className={`lg:hidden sticky top-0 z-40 ${transparent ? 'bg-transparent' : 'bg-card/95 backdrop-blur-xl border-b border-border/50'} ${className}`}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 flex-1">
          {showBackButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackClick}
              className="mobile-touch-target rounded-xl hover:bg-muted/50 active:scale-95 transition-all duration-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          
          {(title || subtitle) && (
            <div className="flex-1 min-w-0">
              {title && (
                <h1 className="text-lg font-semibold text-foreground truncate">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-sm text-muted-foreground truncate">
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>
        
        {rightAction && (
          <div className="flex-shrink-0">
            {rightAction}
          </div>
        )}
      </div>
    </div>
  );
}