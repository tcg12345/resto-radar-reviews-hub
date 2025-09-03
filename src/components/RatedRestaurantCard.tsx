import { Restaurant } from '@/types/restaurant';
import { Card } from '@/components/ui/card';
import { MapPin, Calendar } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';

interface RatedRestaurantCardProps {
  restaurant: Restaurant;
  rank: number;
}

export function RatedRestaurantCard({ restaurant, rank }: RatedRestaurantCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: restaurant.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const rating = restaurant.rating || 0;

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900';
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-900';
    if (rank === 3) return 'bg-gradient-to-r from-amber-600 to-amber-700 text-amber-100';
    return 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground';
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-4 cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border border-border/50 bg-gradient-to-r from-card to-card/50 ${
        isDragging ? 'opacity-60 shadow-xl scale-105 rotate-1' : ''
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Rank Badge */}
        <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold shadow-md ${getRankColor(rank)}`}>
          {rank}
        </div>

        {/* Restaurant Info */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-base">{restaurant.name}</h3>
          </div>
          
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="truncate font-medium">{restaurant.cuisine}</span>
            <span>•</span>
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {restaurant.city}
            </span>
          </div>

          {restaurant.dateVisited && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>Visited {format(new Date(restaurant.dateVisited), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>

        {/* Rating Score */}
        <div className="text-right flex-shrink-0">
          <div className="text-2xl font-bold text-primary">
            {rating.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">out of 5</div>
        </div>
      </div>
    </Card>
  );
}