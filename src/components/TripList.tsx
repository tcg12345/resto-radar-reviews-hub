import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Users, Settings, Plus, Star, Trash2, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trip } from '@/hooks/useTrips';
import { usePlaceRatings } from '@/hooks/usePlaceRatings';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TripListProps {
  trips: Trip[];
  selectedTripId: string | null;
  onSelectTrip: (tripId: string) => void;
  onAddPlace: () => void;
  onDeleteTrip: (tripId: string) => void;
}

export function TripList({ trips, selectedTripId, onSelectTrip, onAddPlace, onDeleteTrip }: TripListProps) {
  return (
    <div className="space-y-4 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Your Trips</h3>
        <span className="text-sm text-muted-foreground">{trips.length} trips</span>
      </div>

      {trips.map((trip) => (
        <TripCard
          key={trip.id}
          trip={trip}
          isSelected={trip.id === selectedTripId}
          onAddPlace={onAddPlace}
          onDeleteTrip={onDeleteTrip}
        />
      ))}
    </div>
  );
}

interface TripCardProps {
  trip: Trip;
  isSelected: boolean;
  onAddPlace: () => void;
  onDeleteTrip: (tripId: string) => void;
}

function TripCard({ trip, isSelected, onAddPlace, onDeleteTrip }: TripCardProps) {
  const navigate = useNavigate();
  const { ratings } = usePlaceRatings(trip.id);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const restaurantCount = ratings.filter(r => r.place_type === 'restaurant').length;
  const attractionCount = ratings.filter(r => r.place_type === 'attraction').length;
  const hotelCount = ratings.filter(r => r.place_type === 'hotel').length;
  
  
  const handleDeleteTrip = () => {
    onDeleteTrip(trip.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card 
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          isSelected && "ring-2 ring-primary bg-primary/5"
        )}
        onClick={() => navigate(`/trip/${trip.id}`)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{trip.title}</CardTitle>
              <CardDescription className="flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />
                {trip.destination}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {trip.is_public && (
                <Badge variant="secondary" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  Public
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => e.stopPropagation()}
                    className="h-8 w-8 p-0"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteDialog(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Trip
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {(trip.start_date || trip.end_date) && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {trip.start_date && format(new Date(trip.start_date), 'MMM dd')}
              {trip.start_date && trip.end_date && ' - '}
              {trip.end_date && format(new Date(trip.end_date), 'MMM dd')}
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-3">
            {trip.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {trip.description}
              </p>
            )}
            
            {/* Place counts */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {restaurantCount > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  {restaurantCount} restaurants
                </span>
              )}
              {attractionCount > 0 && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {attractionCount} attractions
                </span>
              )}
              {hotelCount > 0 && (
                <span>{hotelCount} hotels</span>
              )}
            </div>

            {isSelected && (
              <div className="flex items-center gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddPlace();
                  }}
                  className="flex items-center gap-1 text-xs"
                >
                  <Plus className="w-3 h-3" />
                  Add Place
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trip</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{trip.title}"? This action cannot be undone and will also delete all places and ratings associated with this trip.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTrip}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}