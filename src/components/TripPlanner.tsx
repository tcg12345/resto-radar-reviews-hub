import { useState } from 'react';
import { Plus, MapPin, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTrips } from '@/hooks/useTrips';
import { CreateTripDialog } from '@/components/CreateTripDialog';
import { TripOverviewCard } from '@/components/TripOverviewCard';

export function TripPlanner() {
  const { trips, loading: tripsLoading } = useTrips();
  const [isCreateTripDialogOpen, setIsCreateTripDialogOpen] = useState(false);

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
          <h2 className="text-2xl font-bold text-foreground">Trip Planner</h2>
          <p className="text-muted-foreground">Create trips and rate the places you visit</p>
        </div>
        <Button onClick={() => setIsCreateTripDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create New Trip
        </Button>
      </div>

      {/* Main Content - Completely New Layout */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              My Trips
            </CardTitle>
            <CardDescription>
              Click on any trip to view detailed places and map
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trips.map((trip) => (
                <TripOverviewCard key={trip.id} trip={trip} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <CreateTripDialog
        isOpen={isCreateTripDialogOpen}
        onClose={() => setIsCreateTripDialogOpen(false)}
      />
    </div>
  );
}