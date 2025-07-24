import { useState } from 'react';
import { Plus, MapPin, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTrips } from '@/hooks/useTrips';
import { usePlaceRatings } from '@/hooks/usePlaceRatings';
import { TripMap } from '@/components/TripMap';
import { TripList } from '@/components/TripList';
import { CreateTripDialog } from '@/components/CreateTripDialog';
import { PlaceRatingDialog } from '@/components/PlaceRatingDialog';
import { AddRestaurantToTripDialog } from '@/components/AddRestaurantToTripDialog';

export function TripPlanner() {
  const { trips, loading: tripsLoading } = useTrips();
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [isCreateTripDialogOpen, setIsCreateTripDialogOpen] = useState(false);
  const [isPlaceRatingDialogOpen, setIsPlaceRatingDialogOpen] = useState(false);
  const [isAddRestaurantDialogOpen, setIsAddRestaurantDialogOpen] = useState(false);
  
  const selectedTrip = trips.find(trip => trip.id === selectedTripId);
  const { ratings } = usePlaceRatings(selectedTripId || undefined);

  if (tripsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading trips...</p>
        </div>
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Create Your First Trip</CardTitle>
            <CardDescription>
              Start rating places you've visited and build your travel memories
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => setIsCreateTripDialogOpen(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Trip
            </Button>
          </CardContent>
        </Card>

        <CreateTripDialog
          isOpen={isCreateTripDialogOpen}
          onClose={() => setIsCreateTripDialogOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My Trips</h2>
          <p className="text-muted-foreground">Rate places and track your travels</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsAddRestaurantDialogOpen(true)}
            disabled={!selectedTripId}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Restaurant
          </Button>
          <Button onClick={() => setIsCreateTripDialogOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Trip
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-12rem)]">
        {/* Trip List - Mobile: full width, Desktop: 1 column */}
        <div className="lg:col-span-1">
          <TripList
            trips={trips}
            selectedTripId={selectedTripId}
            onSelectTrip={setSelectedTripId}
            onAddPlace={() => setIsPlaceRatingDialogOpen(true)}
          />
        </div>

        {/* Map - Mobile: full width, Desktop: 3 columns */}
        <div className="lg:col-span-3">
          <TripMap
            trip={selectedTrip}
            ratings={ratings}
            onAddPlace={() => setIsPlaceRatingDialogOpen(true)}
          />
        </div>
      </div>

      {/* Dialogs */}
      <CreateTripDialog
        isOpen={isCreateTripDialogOpen}
        onClose={() => setIsCreateTripDialogOpen(false)}
      />

      <PlaceRatingDialog
        isOpen={isPlaceRatingDialogOpen}
        onClose={() => setIsPlaceRatingDialogOpen(false)}
        tripId={selectedTripId}
      />

      <AddRestaurantToTripDialog
        isOpen={isAddRestaurantDialogOpen}
        onClose={() => setIsAddRestaurantDialogOpen(false)}
        tripId={selectedTripId}
      />
    </div>
  );
}