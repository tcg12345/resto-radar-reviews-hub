import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Star, Users, Eye, Trash2, MoreVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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

interface TripListItemProps {
  trip: Trip;
}

export function TripListItem({ trip }: TripListItemProps) {
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
      <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/20 border-0 shadow-sm">
        <CardContent className="p-4" onClick={handleViewTrip}>
          <div className="flex items-center justify-between">
            {/* Left section - Main info */}
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              {/* Trip info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-lg truncate">{trip.title}</h3>
                  {tripStatus && (
                    <Badge className={`${tripStatus.color} text-white border-0 text-xs`}>
                      {tripStatus.label}
                    </Badge>
                  )}
                  {trip.is_public && (
                    <Badge variant="outline" className="text-xs">
                      <Users className="w-3 h-3 mr-1" />
                      Public
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{trip.destination}</span>
                  </div>
                  
                  {(trip.start_date || trip.end_date) && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {trip.start_date && format(new Date(trip.start_date), 'MMM dd')}
                        {trip.start_date && trip.end_date && ' - '}
                        {trip.end_date && format(new Date(trip.end_date), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  )}
                </div>
                
                {trip.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                    {trip.description}
                  </p>
                )}
              </div>
            </div>

            {/* Right section - Stats and actions */}
            <div className="flex items-center gap-6">
              {/* Stats */}
              <div className="hidden md:flex items-center gap-6">
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">{totalPlaces}</div>
                  <div className="text-xs text-muted-foreground">Places</div>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-bold text-primary flex items-center justify-center gap-1">
                    {avgRating > 0 ? avgRating.toFixed(1) : '—'}
                    {avgRating > 0 && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />}
                  </div>
                  <div className="text-xs text-muted-foreground">Rating</div>
                </div>

                {/* Place breakdown */}
                <div className="text-xs text-muted-foreground space-y-1">
                  {restaurantCount > 0 && <div>{restaurantCount} restaurants</div>}
                  {attractionCount > 0 && <div>{attractionCount} attractions</div>}
                  {totalPlaces === 0 && <div>No places yet</div>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handleViewTrip(); 
                  }}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Button>

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
            </div>
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