import { Trip } from '@/hooks/useTrips';
import { TripListItem } from './TripListItem';

interface TripListProps {
  trips: Trip[];
}

export function TripList({ trips }: TripListProps) {
  return (
    <div className="space-y-3">
      {trips.map((trip) => (
        <TripListItem key={trip.id} trip={trip} />
      ))}
    </div>
  );
}