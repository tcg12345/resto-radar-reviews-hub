import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Star, MapPin, Calendar, Users, Share2, Trash2, Filter, Grid3X3, List, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useTrips } from '@/hooks/useTrips';
import { usePlaceRatings } from '@/hooks/usePlaceRatings';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { TripMapView, TripMapViewRef } from '@/components/TripMapView';
import { PlaceRatingDialog } from '@/components/PlaceRatingDialog';
import { PlaceDetailsModal } from '@/components/PlaceDetailsModal';
import { AddRestaurantToTripDialog } from '@/components/AddRestaurantToTripDialog';
import { MobileTripSwipePanel } from '@/components/mobile/MobileTripSwipePanel';
import { TripDetailStats } from '@/components/trip-detail/TripDetailStats';
import { TripDetailPlacesList } from '@/components/trip-detail/TripDetailPlacesList';
import { TripDetailHeader } from '@/components/trip-detail/TripDetailHeader';
import { format, isBefore, isAfter, isWithinInterval } from 'date-fns';

type ViewMode = 'grid' | 'list';
type PlaceFilter = 'all' | 'restaurants' | 'attractions' | 'hotels';
type SortBy = 'recent' | 'oldest' | 'rating' | 'name';

export default function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { trips, loading } = useTrips();
  const { ratings, deleteRating } = usePlaceRatings(tripId);
  
  // Dialog states
  const [isPlaceRatingDialogOpen, setIsPlaceRatingDialogOpen] = useState(false);
  const [isAddRestaurantDialogOpen, setIsAddRestaurantDialogOpen] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [isPlaceDetailsModalOpen, setIsPlaceDetailsModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [placeToDelete, setPlaceToDelete] = useState<string | null>(null);
  const [editPlaceId, setEditPlaceId] = useState<string | null>(null);
  const [editPlaceData, setEditPlaceData] = useState<any>(null);
  
  // View controls
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [placeFilter, setPlaceFilter] = useState<PlaceFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [listPanelSize, setListPanelSize] = useState(30);
  
  const mapRef = useRef<TripMapViewRef>(null);
  const trip = trips.find(t => t.id === tripId);

  useEffect(() => {
    if (!loading && trips.length > 0 && !trip) {
      navigate('/travel');
    }
  }, [trip, loading, navigate, trips.length]);

  // Filter and sort places
  const filteredAndSortedRatings = ratings
    .filter(rating => {
      const matchesSearch = rating.place_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = placeFilter === 'all' || rating.place_type === placeFilter.slice(0, -1);
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'rating':
          return (b.overall_rating || 0) - (a.overall_rating || 0);
        case 'name':
          return a.place_name.localeCompare(b.place_name);
        default:
          return 0;
      }
    });

  // Get trip status
  const getTripStatus = () => {
    if (!trip?.start_date || !trip?.end_date) return null;
    
    const now = new Date();
    const startDate = new Date(trip.start_date);
    const endDate = new Date(trip.end_date);
    
    if (isBefore(now, startDate)) {
      return { status: 'upcoming', label: 'Upcoming', color: 'bg-blue-500' };
    } else if (isWithinInterval(now, { start: startDate, end: endDate })) {
      return { status: 'active', label: 'Active', color: 'bg-green-500' };
    } else if (isAfter(now, endDate)) {
      return { status: 'completed', label: 'Completed', color: 'bg-gray-500' };
    }
    return null;
  };

  const tripStatus = getTripStatus();

  const handlePlaceSelect = (placeId: string) => {
    setSelectedPlaceId(placeId);
  };

  const handlePlaceClick = (placeId: string) => {
    setSelectedPlaceId(placeId);
    mapRef.current?.zoomToPlace(placeId);
  };

  const handlePlaceDetails = (placeId: string) => {
    setSelectedPlaceId(placeId);
    setIsPlaceDetailsModalOpen(true);
  };

  const handleDeletePlace = (placeId: string) => {
    setPlaceToDelete(placeId);
    setDeleteDialogOpen(true);
  };

  const handleEditPlace = (placeId: string) => {
    if (placeId === "") {
      setEditPlaceId(null);
      setEditPlaceData(null);
    } else {
      const placeToEdit = ratings.find(r => r.id === placeId);
      if (placeToEdit) {
        setEditPlaceId(placeId);
        setEditPlaceData(placeToEdit);
      }
    }
    setIsPlaceRatingDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (placeToDelete) {
      await deleteRating(placeToDelete);
      setDeleteDialogOpen(false);
      setPlaceToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your adventure...</p>
        </div>
      </div>
    );
  }

  if (!trip) {
    return null;
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Enhanced Header */}
      <TripDetailHeader 
        trip={trip}
        tripStatus={tripStatus}
        ratings={ratings}
        onBack={() => navigate('/travel')}
        onAddPlace={() => setIsPlaceRatingDialogOpen(true)}
      />


      {/* Main Content */}
      <div className="flex-1">
        {/* Desktop Layout */}
        <div className="hidden lg:block h-full">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Enhanced Left Panel */}
            <ResizablePanel defaultSize={30} minSize={25} maxSize={60} className="bg-background flex flex-col h-full">
              {/* Panel Header with Controls */}
              <div className="p-4 border-b space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-lg">Places & Experiences</h2>
                  <Badge variant="outline" className="bg-primary/10 text-primary">
                    {filteredAndSortedRatings.length} of {ratings.length}
                  </Badge>
                </div>
                
                <Input placeholder="Search places..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                
                <div className="flex items-center gap-2">
                  <Select value={placeFilter} onValueChange={(value: PlaceFilter) => setPlaceFilter(value)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Places</SelectItem>
                      <SelectItem value="restaurants">Restaurants</SelectItem>
                      <SelectItem value="attractions">Attractions</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Recent</SelectItem>
                      <SelectItem value="rating">Rating</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="flex border rounded-md">
                    <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="h-8 w-8 p-0">
                      <List className="w-3 h-3" />
                    </Button>
                    <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="h-8 w-8 p-0">
                      <Grid3X3 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                <TripDetailPlacesList
                  ratings={filteredAndSortedRatings}
                  selectedPlaceId={selectedPlaceId}
                  viewMode={viewMode}
                  onPlaceSelect={handlePlaceSelect}
                  onPlaceClick={handlePlaceClick}
                  onPlaceDetails={handlePlaceDetails}
                  onEditPlace={handleEditPlace}
                  panelSize={listPanelSize}
                />
              </div>
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            <ResizablePanel defaultSize={70} className="h-full">
              <TripMapView ref={mapRef} ratings={ratings} selectedPlaceId={selectedPlaceId} onPlaceSelect={handlePlaceSelect} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden h-full relative">
          <TripMapView ref={mapRef} ratings={ratings} selectedPlaceId={selectedPlaceId} onPlaceSelect={handlePlaceSelect} />
          <MobileTripSwipePanel
            places={ratings}
            onPlaceDetails={handlePlaceDetails}
            onPlaceClick={handlePlaceClick}
            onEditPlace={handleEditPlace}
            onAddRestaurant={() => setIsAddRestaurantDialogOpen(true)}
            onRatePlace={() => setIsPlaceRatingDialogOpen(true)}
            tripTitle={trip.title}
          />
        </div>
      </div>

      {/* Dialogs */}
      <PlaceRatingDialog
        isOpen={isPlaceRatingDialogOpen}
        onClose={() => {
          setIsPlaceRatingDialogOpen(false);
          setEditPlaceId(null);
          setEditPlaceData(null);
        }}
        tripId={tripId}
        tripTitle={trip.title}
        editPlaceId={editPlaceId}
        editPlaceData={editPlaceData}
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
        onDelete={handleDeletePlace}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Place</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this place from your trip? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}