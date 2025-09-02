import { Restaurant } from '@/types/restaurant';
import { Card } from '@/components/ui/card';
import { StarRating } from '@/components/StarRating';
import { MapPin, Calendar } from 'lucide-react';
import { LazyImage } from '@/components/LazyImage';
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

  const firstPhoto = restaurant.photos?.[0];

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Rank */}
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
          {rank}
        </div>

        {/* Photo */}
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
          {firstPhoto ? (
            <LazyImage
              src={firstPhoto}
              alt={restaurant.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-xs text-muted-foreground">No photo</span>
            </div>
          )}
        </div>

        {/* Restaurant Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-sm truncate">{restaurant.name}</h3>
            <StarRating rating={restaurant.rating || 0} size="sm" />
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span className="truncate">{restaurant.cuisine}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {restaurant.city}
            </span>
          </div>

          {restaurant.dateVisited && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {format(new Date(restaurant.dateVisited), 'MMM d, yyyy')}
            </div>
          )}
        </div>

        {/* Rating Score */}
        <div className="text-right">
          <div className="text-lg font-bold text-primary">
            {restaurant.rating?.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">out of 5</div>
        </div>
      </div>
    </Card>
  );
}