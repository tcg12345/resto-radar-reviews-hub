import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Star, Users, Eye, Trash2, MoreVertical, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trip, useTrips } from '@/hooks/useTrips';
import { usePlaceRatings } from '@/hooks/usePlaceRatings';
import { format, isBefore, isAfter, isWithinInterval } from 'date-fns';
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

interface TripCardProps {
  trip: Trip;
}

export function TripCard({ trip }: TripCardProps) {
  const navigate = useNavigate();
  const { deleteTrip } = useTrips();
  const { ratings } = usePlaceRatings(trip.id);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const restaurantCount = ratings.filter(r => r.place_type === 'restaurant').length;
  const attractionCount = ratings.filter(r => r.place_type === 'attraction').length;
  const totalPlaces = ratings.length;
  
  const avgRating = ratings.length > 0 
    ? ratings.reduce((acc, r) => acc + (r.overall_rating || 0), 0) / ratings.length
    : 0;

  // Determine trip status
  const getTripStatus = () => {
    if (!trip.start_date || !trip.end_date) return null;
    
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

  const handleViewTrip = () => {
    navigate(`/trip/${trip.id}`);
  };

  const handleDeleteTrip = async () => {
    await deleteTrip(trip.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-0 shadow-md overflow-hidden">
        {/* Card Header with Status */}
        <div className="relative">
          {tripStatus && (
            <div className="absolute top-3 left-3 z-10">
              <Badge className={`${tripStatus.color} text-white border-0 shadow-sm`}>
                {tripStatus.label}
              </Badge>
            </div>
          )}
          
          <div className="absolute top-3 right-3 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0 bg-white/80 backdrop-blur-sm hover:bg-white"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleViewTrip}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
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

          {/* Gradient Header */}
          <div 
            className="h-32 bg-gradient-to-br from-primary/80 to-primary/60 relative overflow-hidden"
            onClick={handleViewTrip}
          >
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute bottom-4 left-4 right-16 text-white">
              <h3 className="font-bold text-lg line-clamp-1 group-hover:text-white/90 transition-colors">
                {trip.title}
              </h3>
              <div className="flex items-center gap-1 text-white/90 text-sm">
                <MapPin className="w-3 h-3" />
                <span className="line-clamp-1">{trip.destination}</span>
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-4 space-y-4" onClick={handleViewTrip}>
          {/* Trip Dates */}
          {(trip.start_date || trip.end_date) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                {trip.start_date && format(new Date(trip.start_date), 'MMM dd')}
                {trip.start_date && trip.end_date && ' - '}
                {trip.end_date && format(new Date(trip.end_date), 'MMM dd, yyyy')}
              </span>
            </div>
          )}

          {/* Trip Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-xl font-bold text-primary">{totalPlaces}</div>
              <div className="text-xs text-muted-foreground">Places</div>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-xl font-bold text-primary flex items-center justify-center gap-1">
                {avgRating > 0 ? avgRating.toFixed(1) : '—'}
                {avgRating > 0 && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />}
              </div>
              <div className="text-xs text-muted-foreground">Rating</div>
            </div>
          </div>

          {/* Place breakdown */}
          {totalPlaces > 0 && (
            <div className="flex flex-wrap gap-1 justify-center">
              {restaurantCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {restaurantCount} restaurants
                </Badge>
              )}
              {attractionCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {attractionCount} attractions
                </Badge>
              )}
            </div>
          )}

          {/* Description */}
          {trip.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {trip.description}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              {trip.is_public && (
                <Badge variant="outline" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  Public
                </Badge>
              )}
            </div>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => { 
                e.stopPropagation(); 
                handleViewTrip(); 
              }}
              className="text-primary hover:text-primary/80"
            >
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
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