import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

interface Props {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  children: ReactNode;
  className?: string;
}

export function FeedSection({ title, subtitle, icon, action, children, className = '' }: Props) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {action && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={action.onClick}
            className="text-primary hover:text-primary/80"
          >
            {action.label}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}