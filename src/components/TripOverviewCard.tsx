import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Star, Users, Eye, Trash2, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trip } from '@/hooks/useTrips';
import { usePlaceRatings } from '@/hooks/usePlaceRatings';
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

interface TripOverviewCardProps {
  trip: Trip;
  onDeleteTrip?: (tripId: string) => void;
}

export function TripOverviewCard({ trip, onDeleteTrip }: TripOverviewCardProps) {
  const navigate = useNavigate();
  const { ratings } = usePlaceRatings(trip.id);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
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

  const handleDeleteTrip = () => {
    if (onDeleteTrip) {
      onDeleteTrip(trip.id);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
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
            <div className="flex items-center gap-2">
              {trip.is_public && (
                <Badge variant="secondary" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  Public
                </Badge>
              )}
              {onDeleteTrip && (
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
              )}
            </div>
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

      {onDeleteTrip && (
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
      )}
    </>
  );
}