import { ArrowLeft, Plus, Star, MapPin, Calendar, Users, Share2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trip, PlaceRating } from '@/hooks/useTrips';
import { format } from 'date-fns';

interface TripDetailHeaderProps {
  trip: Trip;
  tripStatus: { status: string; label: string; color: string } | null;
  totalPlaces: number;
  ratings: PlaceRating[];
  onBack: () => void;
  onAddPlace: () => void;
}

export function TripDetailHeader({ 
  trip, 
  tripStatus, 
  totalPlaces, 
  ratings,
  onBack, 
  onAddPlace 
}: TripDetailHeaderProps) {
  // Calculate stats
  const restaurantCount = ratings.filter(r => r.place_type === 'restaurant').length;
  const attractionCount = ratings.filter(r => r.place_type === 'attraction').length;
  const avgRating = totalPlaces > 0 
    ? ratings.reduce((acc, r) => acc + (r.overall_rating || 0), 0) / totalPlaces
    : 0;
  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b">
      <div className="container mx-auto px-4 py-3 lg:py-4">
        {/* Mobile Header */}
        <div className="lg:hidden">
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="flex items-center gap-1 p-2"
            >
              <ArrowLeft size={32} />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onAddPlace}
              className="flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span className="text-xs">Add Place</span>
            </Button>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <h1 className="text-lg font-bold text-foreground truncate">{trip.title}</h1>
              {tripStatus && (
                <Badge className={`${tripStatus.color} text-white border-0 text-xs`}>
                  {tripStatus.label}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="truncate max-w-[120px]">{trip.destination}</span>
              </div>
              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                {totalPlaces} places
              </Badge>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="p-2 hover:bg-muted"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  {trip.title}
                </h1>
                {tripStatus && (
                  <Badge className={`${tripStatus.color} text-white border-0`}>
                    {tripStatus.label}
                  </Badge>
                )}
                {trip.is_public && (
                  <Badge variant="outline" className="border-primary/20">
                    <Users className="w-3 h-3 mr-1" />
                    Public
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
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
                
                {/* Compact Stats */}
                <div className="flex items-center gap-4 text-xs">
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                    {totalPlaces} places
                  </Badge>
                  {avgRating > 0 && (
                    <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" />
                      {avgRating.toFixed(1)}
                    </Badge>
                  )}
                  {restaurantCount > 0 && (
                    <Badge variant="secondary" className="bg-green-50 text-green-700">
                      {restaurantCount} restaurants
                    </Badge>
                  )}
                  {attractionCount > 0 && (
                    <Badge variant="secondary" className="bg-purple-50 text-purple-700">
                      {attractionCount} attractions
                    </Badge>
                  )}
                </div>
              </div>
              
              {trip.description && (
                <p className="text-sm text-muted-foreground max-w-2xl mt-2">
                  {trip.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onAddPlace}
              className="flex items-center gap-2 hover:border-primary/30"
            >
              <Plus className="w-4 h-4" />
              Add Place
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center gap-2 hover:border-primary/30"
            >
              <Share2 className="w-4 h-4" />
              Share Trip
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}