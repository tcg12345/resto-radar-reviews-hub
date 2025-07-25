import { PlaceRating } from '@/hooks/useTrips';
import { TripDetailPlaceCard } from './TripDetailPlaceCard';
import { TripDetailPlaceListItem } from './TripDetailPlaceListItem';

interface TripDetailPlacesListProps {
  ratings: PlaceRating[];
  selectedPlaceId: string | null;
  viewMode: 'grid' | 'list';
  onPlaceSelect: (placeId: string) => void;
  onPlaceClick: (placeId: string) => void;
  onPlaceDetails: (placeId: string) => void;
  onEditPlace: (placeId: string) => void;
  panelSize: number;
}

export function TripDetailPlacesList({ 
  ratings, 
  selectedPlaceId, 
  viewMode,
  onPlaceSelect, 
  onPlaceClick, 
  onPlaceDetails, 
  onEditPlace,
  panelSize 
}: TripDetailPlacesListProps) {
  if (ratings.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-center p-8">
        <div className="space-y-3">
          <div className="text-4xl">🗺️</div>
          <h3 className="font-medium text-muted-foreground">No places yet</h3>
          <p className="text-sm text-muted-foreground max-w-48">
            Start adding restaurants and attractions to build your trip memories
          </p>
        </div>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="p-4">
        <div className="grid gap-3" style={{ 
          gridTemplateColumns: panelSize > 40 ? 'repeat(2, 1fr)' : '1fr' 
        }}>
          {ratings.map((rating) => (
            <TripDetailPlaceCard
              key={rating.id}
              place={rating}
              isSelected={selectedPlaceId === rating.id}
              onSelect={onPlaceSelect}
              onClick={onPlaceClick}
              onDetails={onPlaceDetails}
              onEdit={onEditPlace}
              compact={panelSize <= 40}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {ratings.map((rating) => (
        <TripDetailPlaceListItem
          key={rating.id}
          place={rating}
          isSelected={selectedPlaceId === rating.id}
          onSelect={onPlaceSelect}
          onClick={onPlaceClick}
          onDetails={onPlaceDetails}
          onEdit={onEditPlace}
          compact={panelSize <= 30}
        />
      ))}
    </div>
  );
}