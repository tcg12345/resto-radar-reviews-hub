import { Grid3X3, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export type ViewType = 'grid' | 'list';

interface ViewToggleProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  storageKey?: string;
}

export function ViewToggle({ currentView, onViewChange, storageKey }: ViewToggleProps) {
  const views = [
    { type: 'grid' as ViewType, icon: Grid3X3, label: 'Grid' },
    { type: 'list' as ViewType, icon: List, label: 'List' },
  ];

  return (
    <div className="flex rounded-md border bg-background p-1">
      {views.map(({ type, icon: Icon, label }) => (
        <Button
          key={type}
          variant={currentView === type ? "default" : "ghost"}
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => onViewChange(type)}
        >
          <Icon className="h-3.5 w-3.5 mr-1" />
          <span className="hidden sm:inline">{label}</span>
        </Button>
      ))}
    </div>
  );
}

export function useViewToggle(storageKey: string, defaultView: ViewType = 'grid') {
  const [view, setView] = useLocalStorage<ViewType>(storageKey, defaultView);
  
  return { view, setView };
}