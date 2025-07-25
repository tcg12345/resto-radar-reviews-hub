import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Star, MapPin, Calendar, Users, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTrips } from '@/hooks/useTrips';
import { usePlaceRatings } from '@/hooks/usePlaceRatings';
import { TripPlacesList } from '@/components/TripPlacesList';
import { TripMapView } from '@/components/TripMapView';
import { PlaceRatingDialog } from '@/components/PlaceRatingDialog';
import { AddRestaurantToTripDialog } from '@/components/AddRestaurantToTripDialog';
import { format } from 'date-fns';

export default function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { trips, loading } = useTrips();
  const { ratings } = usePlaceRatings(tripId);
  const [isPlaceRatingDialogOpen, setIsPlaceRatingDialogOpen] = useState(false);
  const [isAddRestaurantDialogOpen, setIsAddRestaurantDialogOpen] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  
  const trip = trips.find(t => t.id === tripId);

  useEffect(() => {
    // Only redirect if loading is complete AND trip is not found
    if (!loading && trips.length > 0 && !trip) {
      console.log('Trip not found, redirecting to /travel');
      navigate('/travel');
    }
  }, [trip, loading, navigate, trips.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading trip...</p>
        </div>
      </div>
    );
  }

  if (!trip) {
    return null;
  }

  const handlePlaceSelect = (placeId: string) => {
    setSelectedPlaceId(placeId);
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/travel')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Trips
              </Button>
              
              <div>
                <h1 className="text-2xl font-bold text-foreground">{trip.title}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {trip.start_date && trip.end_date ? (
                      <span>
                        {format(new Date(trip.start_date), 'MMM d')} - {format(new Date(trip.end_date), 'MMM d, yyyy')}
                      </span>
                    ) : (
                      'No dates set'
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {trip.destination}
                  </div>
                  <Badge variant="secondary">
                    {ratings.length} places rated
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAddRestaurantDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Restaurant
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsPlaceRatingDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Rate Place
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Share Trip
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Places List */}
        <div className="w-96 border-r bg-background flex flex-col">
          <div className="p-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Places & Experiences</h2>
              <Badge variant="outline">{ratings.length}</Badge>
            </div>
            {trip.description && (
              <p className="text-sm text-muted-foreground mt-2">{trip.description}</p>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <TripPlacesList
              ratings={ratings}
              selectedPlaceId={selectedPlaceId}
              onPlaceSelect={handlePlaceSelect}
              onEditPlace={setIsPlaceRatingDialogOpen}
            />
          </div>
        </div>

        {/* Right Side - Map */}
        <div className="flex-1 h-full">
          <TripMapView
            ratings={ratings}
            selectedPlaceId={selectedPlaceId}
            onPlaceSelect={handlePlaceSelect}
          />
        </div>
      </div>

      {/* Dialogs */}
      <PlaceRatingDialog
        isOpen={isPlaceRatingDialogOpen}
        onClose={() => setIsPlaceRatingDialogOpen(false)}
        tripId={tripId}
      />
      
      <AddRestaurantToTripDialog
        isOpen={isAddRestaurantDialogOpen}
        onClose={() => setIsAddRestaurantDialogOpen(false)}
        tripId={tripId}
      />
    </div>
  );
}