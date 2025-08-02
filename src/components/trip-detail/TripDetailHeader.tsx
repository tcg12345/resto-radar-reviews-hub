import { ArrowLeft, Plus, Star, MapPin, Calendar, Users, Share2, Settings, TrendingUp, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trip } from '@/hooks/useTrips';
import { PlaceRating } from '@/hooks/useTrips';
import { format } from 'date-fns';
import { useState } from 'react';
import { ShareTripDialog } from '@/components/ShareTripDialog';

interface TripDetailHeaderProps {
  trip: Trip;
  tripStatus: { status: string; label: string; color: string } | null;
  ratings: PlaceRating[];
  onBack: () => void;
  onAddPlace: () => void;
}

export function TripDetailHeader({ 
  trip, 
  tripStatus, 
  ratings, 
  onBack, 
  onAddPlace 
}: TripDetailHeaderProps) {
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const totalPlaces = ratings.length;
  const restaurantCount = ratings.filter(r => r.place_type === 'restaurant').length;
  const attractionCount = ratings.filter(r => r.place_type === 'attraction').length;
  const hotelCount = ratings.filter(r => r.place_type === 'hotel').length;
  
  const avgRating = totalPlaces > 0 
    ? ratings.reduce((acc, r) => acc + (r.overall_rating || 0), 0) / totalPlaces
    : 0;
    
  const ratedPlaces = ratings.filter(r => r.overall_rating && r.overall_rating > 0).length;
  const highRatedPlaces = ratings.filter(r => r.overall_rating && r.overall_rating >= 4).length;

  // Calculate trip duration
  const getTripDuration = () => {
    if (!trip.start_date || !trip.end_date) return null;
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const tripDuration = getTripDuration();

  const allStats = [
    {
      label: 'Total Places',
      value: totalPlaces,
      subtext: `${ratedPlaces} rated`,
      icon: MapPin,
      color: 'text-blue-600 bg-blue-50'
    },
    {
      label: 'Avg Rating',
      value: avgRating > 0 ? avgRating.toFixed(1) : '—',
      subtext: `${highRatedPlaces} excellent`,
      icon: Star,
      color: 'text-yellow-600 bg-yellow-50'
    },
    {
      label: 'Restaurants',
      value: restaurantCount,
      subtext: totalPlaces > 0 ? `${Math.round((restaurantCount / totalPlaces) * 100)}%` : '0%',
      icon: Users,
      color: 'text-green-600 bg-green-50'
    },
    {
      label: 'Attractions',
      value: attractionCount,
      subtext: totalPlaces > 0 ? `${Math.round((attractionCount / totalPlaces) * 100)}%` : '0%',
      icon: TrendingUp,
      color: 'text-purple-600 bg-purple-50'
    },
    ...(tripDuration ? [{
      label: 'Duration',
      value: tripDuration,
      subtext: tripDuration === 1 ? 'day' : 'days',
      icon: Calendar,
      color: 'text-orange-600 bg-orange-50'
    }] : []),
    ...(hotelCount > 0 ? [{
      label: 'Hotels',
      value: hotelCount,
      subtext: totalPlaces > 0 ? `${Math.round((hotelCount / totalPlaces) * 100)}%` : '0%',
      icon: Settings,
      color: 'text-indigo-600 bg-indigo-50'
    }] : [])
  ];
  return (
    <>
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b">
      <div className="container mx-auto px-4 py-3 lg:py-4 pt-6 lg:pt-3">
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
              </div>
              
              {trip.description && (
                <p className="text-sm text-muted-foreground max-w-2xl mt-2">
                  {trip.description}
                </p>
              )}
            </div>
          </div>

          {/* Stats in Middle - Flexible Layout */}
          <div className="flex-1 flex justify-center px-6">
            {totalPlaces > 0 && (
              <div className="bg-background rounded-lg border border-border/50 p-3 w-full">
                <div className="flex items-center justify-evenly gap-4">
                  {allStats.map((stat, index) => {
                    const Icon = stat.icon;
                    let hideClass = '';
                    
                    // Progressive show based on screen size
                    if (index >= 6) hideClass = 'hidden 2xl:flex';
                    else if (index >= 5) hideClass = 'hidden xl:flex';
                    else if (index >= 4) hideClass = 'hidden lg:flex';
                    else if (index >= 3) hideClass = 'hidden md:flex';
                    else if (index >= 2) hideClass = '';
                    
                    return (
                      <div key={stat.label} className={`flex items-center gap-2 min-w-0 ${hideClass}`}>
                        <div className={`p-1.5 rounded ${stat.color} flex-shrink-0`}>
                          <Icon className="w-3 h-3" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-muted-foreground truncate">{stat.label}</div>
                          <div className="text-sm font-bold">{stat.value}</div>
                          <div className="text-xs text-muted-foreground truncate">{stat.subtext}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
              onClick={() => setIsShareDialogOpen(true)}
              className="flex items-center gap-2 hover:border-primary/30"
            >
              <Share2 className="w-4 h-4" />
              Share Trip
            </Button>
          </div>
        </div>
      </div>
      </div>
      
      <ShareTripDialog 
        trip={trip}
        isOpen={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
      />
    </>
  );
}