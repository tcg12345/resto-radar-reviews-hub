import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { FilterChip } from '@/types/feed';

interface HorizontalFilterChipsProps {
  filters: FilterChip[];
  selectedFilters: string[];
  onFilterToggle: (filterId: string) => void;
  onClearAll: () => void;
}

export function HorizontalFilterChips({ 
  filters, 
  selectedFilters, 
  onFilterToggle, 
  onClearAll 
}: HorizontalFilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <div className="px-4 py-3 border-b border-border/50">
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {selectedFilters.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        )}
        
        {filters.map((filter) => {
          const isSelected = selectedFilters.includes(filter.id);
          return (
            <Button
              key={filter.id}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => onFilterToggle(filter.id)}
              className={`flex-shrink-0 transition-all ${
                isSelected 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted'
              }`}
            >
              {filter.label}
              {filter.count > 0 && (
                <Badge 
                  variant="secondary" 
                  className={`ml-2 text-xs h-4 px-1 ${
                    isSelected 
                      ? 'bg-primary-foreground/20 text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {filter.count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}