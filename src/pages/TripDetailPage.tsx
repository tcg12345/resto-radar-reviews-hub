import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Star, MapPin, Calendar, Users, Share2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTrips } from '@/hooks/useTrips';
import { useUpdatePlaceWebsites } from '@/hooks/useUpdatePlaceWebsites';
import { usePlaceRatings } from '@/hooks/usePlaceRatings';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TripPlacesList } from '@/components/TripPlacesList';
import { TripMapView, TripMapViewRef } from '@/components/TripMapView';
import { PlaceRatingDialog } from '@/components/PlaceRatingDialog';
import { PlaceDetailsModal } from '@/components/PlaceDetailsModal';
import { AddRestaurantToTripDialog } from '@/components/AddRestaurantToTripDialog';
import { format } from 'date-fns';

export default function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { trips, loading } = useTrips();
  const { ratings } = usePlaceRatings(tripId);
  const { updatePlaceWebsites, isUpdating } = useUpdatePlaceWebsites();
  const [isPlaceRatingDialogOpen, setIsPlaceRatingDialogOpen] = useState(false);
  const [isAddRestaurantDialogOpen, setIsAddRestaurantDialogOpen] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [isPlaceDetailsModalOpen, setIsPlaceDetailsModalOpen] = useState(false);
  const [listPanelSize, setListPanelSize] = useState(25); // Default to 25% for the list
  const mapRef = useRef<TripMapViewRef>(null);
  
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

  const handlePlaceClick = (placeId: string) => {
    // This will zoom to the place on the map and select it
    setSelectedPlaceId(placeId);
    mapRef.current?.zoomToPlace(placeId);
  };

  const handlePlaceDetails = (placeId: string) => {
    // This opens the details modal
    setSelectedPlaceId(placeId);
    setIsPlaceDetailsModalOpen(true);
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-2 lg:py-4">
          {/* Mobile Header */}
          <div className="lg:hidden">
            <div className="flex items-center justify-between mb-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/travel')}
                className="flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back</span>
              </Button>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddRestaurantDialogOpen(true)}
                  className="flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span className="text-xs">Add</span>
                </Button>
                <Button
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsPlaceRatingDialogOpen(true)}
                  className="flex items-center gap-1"
                >
                  <Star className="w-3 h-3" />
                  <span className="text-xs">Rate</span>
                </Button>
              </div>
            </div>
            
            <div className="text-center">
              <h1 className="text-lg font-bold text-foreground truncate">{trip.title}</h1>
              <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground mt-1">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate max-w-[120px]">{trip.destination}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {ratings.length} places
                </Badge>
              </div>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:flex items-center justify-between">
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
                onClick={() => updatePlaceWebsites(tripId!)}
                disabled={isUpdating}
                className="flex items-center gap-2"
              >
                <Globe className="w-4 h-4" />
                {isUpdating ? 'Updating...' : 'Update Websites'}
              </Button>
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
      <div className="flex-1">
        {/* Desktop Layout - Resizable Panels */}
        <div className="hidden lg:block h-full">
          <ResizablePanelGroup 
            direction="horizontal" 
            className="h-full"
            onLayout={(sizes) => setListPanelSize(sizes[0])}
          >
            {/* Left Panel - Places List */}
            <ResizablePanel 
              defaultSize={25} 
              minSize={15} 
              maxSize={60}
              className="bg-background flex flex-col h-full"
            >
              <div className="p-4 border-b flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">Places & Experiences</h2>
                  <Badge variant="outline">{ratings.length}</Badge>
                </div>
                {trip.description && listPanelSize > 20 && (
                  <p className="text-sm text-muted-foreground mt-2 animate-fade-in">{trip.description}</p>
                )}
              </div>
              
               <div className="flex-1 overflow-y-auto">
                 <ScrollArea className="h-full">
                   <TripPlacesList
                     ratings={ratings}
                     selectedPlaceId={selectedPlaceId}
                     onPlaceSelect={handlePlaceSelect}
                     onPlaceClick={handlePlaceClick}
                     onPlaceDetails={handlePlaceDetails}
                     onEditPlace={setIsPlaceRatingDialogOpen}
                     panelSize={listPanelSize}
                   />
                 </ScrollArea>
               </div>
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            {/* Right Panel - Map */}
            <ResizablePanel defaultSize={75} className="h-full">
              <TripMapView
                ref={mapRef}
                ratings={ratings}
                selectedPlaceId={selectedPlaceId}
                onPlaceSelect={handlePlaceSelect}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Mobile Layout - Tabs */}
        <div className="lg:hidden h-full">
          <Tabs defaultValue="places" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mx-4 mt-2">
              <TabsTrigger value="places">Places ({ratings.length})</TabsTrigger>
              <TabsTrigger value="map">Map</TabsTrigger>
            </TabsList>
            
            <TabsContent value="places" className="flex-1 mt-2">
              <ScrollArea className="h-full">
                <div className="pb-4">
                  {trip.description && (
                    <div className="px-4 pb-2">
                      <p className="text-sm text-muted-foreground">{trip.description}</p>
                    </div>
                  )}
                  <TripPlacesList
                    ratings={ratings}
                    selectedPlaceId={selectedPlaceId}
                    onPlaceSelect={handlePlaceSelect}
                    onPlaceClick={handlePlaceClick}
                    onPlaceDetails={handlePlaceDetails}
                    onEditPlace={setIsPlaceRatingDialogOpen}
                    panelSize={100} // Full width on mobile
                  />
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="map" className="flex-1 mt-2 overflow-hidden">
              <div className="h-full">
                <TripMapView
                  ref={mapRef}
                  ratings={ratings}
                  selectedPlaceId={selectedPlaceId}
                  onPlaceSelect={handlePlaceSelect}
                />
              </div>
            </TabsContent>
          </Tabs>
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

      <PlaceDetailsModal
        place={ratings.find(r => r.id === selectedPlaceId) || null}
        isOpen={isPlaceDetailsModalOpen}
        onClose={() => setIsPlaceDetailsModalOpen(false)}
        onEdit={() => {
          setIsPlaceDetailsModalOpen(false);
          setIsPlaceRatingDialogOpen(true);
        }}
      />
    </div>
  );
}