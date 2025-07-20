import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileFABProps {
  onClick: () => void;
  label?: string;
}

export function MobileFAB({ onClick, label = "Add" }: MobileFABProps) {
  return (
    <Button
      onClick={onClick}
      size="lg"
      className="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
    >
      <Plus className="h-6 w-6" />
      <span className="sr-only">{label}</span>
    </Button>
  );
}