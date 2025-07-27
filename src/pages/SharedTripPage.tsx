import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Star, Users, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { Trip, PlaceRating } from '@/hooks/useTrips';
import { format, isBefore, isAfter, isWithinInterval } from 'date-fns';
import { toast } from 'sonner';

export function SharedTripPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [ratings, setRatings] = useState<PlaceRating[]>([]);
  const [ownerProfile, setOwnerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tripId) {
      fetchSharedTrip(tripId);
    }
  }, [tripId]);

  const fetchSharedTrip = async (id: string) => {
    try {
      // Fetch trip details (only public trips)
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', id)
        .eq('is_public', true)
        .single();

      if (tripError) {
        if (tripError.code === 'PGRST116') {
          toast.error('Trip not found or not public');
          navigate('/');
          return;
        }
        throw tripError;
      }

      setTrip(tripData);

      // Fetch owner profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username, name, avatar_url')
        .eq('id', tripData.user_id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      } else {
        setOwnerProfile(profileData);
      }

      // Fetch place ratings for this trip
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('place_ratings')
        .select('*')
        .eq('trip_id', id);

      if (ratingsError) {
        console.error('Error fetching ratings:', ratingsError);
      } else {
        setRatings((ratingsData || []) as PlaceRating[]);
      }
    } catch (error) {
      console.error('Error fetching shared trip:', error);
      toast.error('Failed to load trip');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  // Calculate trip status
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Trip Not Found</h1>
          <p className="text-muted-foreground mb-6">This trip doesn't exist or is not public.</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const totalPlaces = ratings.length;
  const restaurantCount = ratings.filter(r => r.place_type === 'restaurant').length;
  const attractionCount = ratings.filter(r => r.place_type === 'attraction').length;
  const hotelCount = ratings.filter(r => r.place_type === 'hotel').length;
  
  const avgRating = totalPlaces > 0 
    ? ratings.reduce((acc, r) => acc + (r.overall_rating || 0), 0) / totalPlaces
    : 0;

  return (
    <>
      {/* Mobile status bar spacer */}
      <div className="lg:hidden h-[35px] bg-background"></div>
      <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="p-2 hover:bg-muted"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Shared Trip</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {trip.title}
              </h1>
              {tripStatus && (
                <Badge className={`${tripStatus.color} text-white border-0`}>
                  {tripStatus.label}
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
              <p className="text-sm text-muted-foreground max-w-3xl">
                {trip.description}
              </p>
            )}
            
            {/* Owner Info */}
            {ownerProfile && (
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-muted-foreground">Shared by:</span>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={ownerProfile.avatar_url || ''} />
                    <AvatarFallback className="text-xs">
                      {ownerProfile.name?.charAt(0) || ownerProfile.username?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {ownerProfile.name || ownerProfile.username}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Stats Overview */}
        {totalPlaces > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{totalPlaces}</div>
                <div className="text-sm text-muted-foreground">Total Places</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
                  {avgRating > 0 ? avgRating.toFixed(1) : '—'}
                  {avgRating > 0 && <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />}
                </div>
                <div className="text-sm text-muted-foreground">Avg Rating</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{restaurantCount}</div>
                <div className="text-sm text-muted-foreground">Restaurants</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{attractionCount}</div>
                <div className="text-sm text-muted-foreground">Attractions</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Places List */}
        {totalPlaces > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Places Visited</h2>
            <div className="grid gap-4">
              {ratings.map((rating) => (
                <Card key={rating.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{rating.place_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {rating.cuisine && `${rating.cuisine} • `}
                          {rating.address}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {rating.place_type}
                          </Badge>
                          {rating.date_visited && (
                            <span className="text-xs text-muted-foreground">
                              Visited {format(new Date(rating.date_visited), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        {rating.overall_rating && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold">{rating.overall_rating}/10</span>
                          </div>
                        )}
                        {rating.price_range && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {'$'.repeat(rating.price_range)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {rating.notes && (
                      <>
                        <Separator className="my-3" />
                        <p className="text-sm text-muted-foreground">{rating.notes}</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No places yet</h3>
            <p className="text-muted-foreground">This trip doesn't have any places added yet.</p>
          </div>
        )}
      </div>
    </div>
    </>
  );
}