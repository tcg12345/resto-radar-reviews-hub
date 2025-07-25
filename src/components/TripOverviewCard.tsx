import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Star, Users, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trip } from '@/hooks/useTrips';
import { usePlaceRatings } from '@/hooks/usePlaceRatings';
import { format } from 'date-fns';

interface TripOverviewCardProps {
  trip: Trip;
}

export function TripOverviewCard({ trip }: TripOverviewCardProps) {
  const navigate = useNavigate();
  const { ratings } = usePlaceRatings(trip.id);
  
  const restaurantCount = ratings.filter(r => r.place_type === 'restaurant').length;
  const attractionCount = ratings.filter(r => r.place_type === 'attraction').length;
  const totalPlaces = ratings.length;
  
  const avgRating = ratings.length > 0 
    ? ratings.reduce((acc, r) => acc + (r.overall_rating || 0), 0) / ratings.length
    : 0;

  const handleViewTrip = () => {
    console.log('Navigating to trip:', trip.id); // Debug log
    navigate(`/trip/${trip.id}`);
  };

  return (
    <Card className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1" onClick={handleViewTrip}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-1">{trip.title}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <MapPin className="w-4 h-4" />
              {trip.destination}
            </CardDescription>
          </div>
          {trip.is_public && (
            <Badge variant="secondary" className="text-xs">
              <Users className="w-3 h-3 mr-1" />
              Public
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Trip Dates */}
        {(trip.start_date || trip.end_date) && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            {trip.start_date && format(new Date(trip.start_date), 'MMM dd')}
            {trip.start_date && trip.end_date && ' - '}
            {trip.end_date && format(new Date(trip.end_date), 'MMM dd, yyyy')}
          </div>
        )}

        {/* Trip Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold text-primary">{totalPlaces}</div>
            <div className="text-xs text-muted-foreground">Places Rated</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
              {avgRating > 0 ? avgRating.toFixed(1) : '—'}
              {avgRating > 0 && <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />}
            </div>
            <div className="text-xs text-muted-foreground">Avg Rating</div>
          </div>
        </div>

        {/* Place breakdown */}
        {totalPlaces > 0 && (
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            {restaurantCount > 0 && (
              <span>{restaurantCount} restaurants</span>
            )}
            {attractionCount > 0 && (
              <span>{attractionCount} attractions</span>
            )}
          </div>
        )}

        {/* Description */}
        {trip.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {trip.description}
          </p>
        )}

        {/* View Button */}
        <Button onClick={(e) => { e.stopPropagation(); handleViewTrip(); }} className="w-full" size="sm">
          <Eye className="w-4 h-4 mr-2" />
          View Trip Details
        </Button>
      </CardContent>
    </Card>
  );
}