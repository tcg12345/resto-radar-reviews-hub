import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Plane, Hotel, Eye, Users } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface FriendItinerary {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  locations: any;
  hotels: any;
  flights: any;
  events: any;
  is_multi_city: boolean;
  created_at: string;
}

interface FriendItinerariesTabProps {
  friendId: string;
  friendName: string;
}

export function FriendItinerariesTab({ friendId, friendName }: FriendItinerariesTabProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [itineraries, setItineraries] = useState<FriendItinerary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && friendId) {
      fetchFriendItineraries();
    }
  }, [user, friendId]);

  const fetchFriendItineraries = async () => {
    try {
      const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .eq('user_id', friendId)
        .eq('is_shareable', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItineraries(data || []);
    } catch (error) {
      console.error('Error fetching friend itineraries:', error);
      toast.error('Failed to load itineraries');
    } finally {
      setLoading(false);
    }
  };

  const viewItinerary = (itineraryId: string) => {
    navigate(`/itinerary/${itineraryId}`);
  };

  const getLocationCount = (locations: any) => {
    if (Array.isArray(locations)) return locations.length;
    if (locations && typeof locations === 'object') return Object.keys(locations).length;
    return 0;
  };

  const getHotelCount = (hotels: any) => {
    if (Array.isArray(hotels)) return hotels.length;
    return 0;
  };

  const getFlightCount = (flights: any) => {
    if (Array.isArray(flights)) return flights.length;
    return 0;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="flex gap-4">
                  <div className="h-8 bg-muted rounded w-20"></div>
                  <div className="h-8 bg-muted rounded w-20"></div>
                  <div className="h-8 bg-muted rounded w-20"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (itineraries.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No shared itineraries</p>
            <p className="text-sm">
              {friendName} hasn't shared any travel plans yet
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" />
          {friendName}'s Travel Plans
        </h3>
        <Badge variant="secondary" className="text-xs">
          {itineraries.length} shared itinerary(ies)
        </Badge>
      </div>

      {itineraries.map((itinerary) => (
        <Card key={itinerary.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{itinerary.title}</CardTitle>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {format(new Date(itinerary.start_date), 'MMM d')} - {format(new Date(itinerary.end_date), 'MMM d, yyyy')}
                  </span>
                  {itinerary.is_multi_city && (
                    <Badge variant="outline" className="text-xs ml-2">
                      Multi-City
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => viewItinerary(itinerary.id)}
              >
                <Eye className="w-4 h-4 mr-1" />
                View
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-500" />
                <span className="font-medium">{getLocationCount(itinerary.locations)}</span>
                <span className="text-muted-foreground">
                  location{getLocationCount(itinerary.locations) !== 1 ? 's' : ''}
                </span>
              </div>
              
              {getHotelCount(itinerary.hotels) > 0 && (
                <div className="flex items-center gap-2">
                  <Hotel className="w-4 h-4 text-green-500" />
                  <span className="font-medium">{getHotelCount(itinerary.hotels)}</span>
                  <span className="text-muted-foreground">
                    hotel{getHotelCount(itinerary.hotels) !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {getFlightCount(itinerary.flights) > 0 && (
                <div className="flex items-center gap-2">
                  <Plane className="w-4 h-4 text-purple-500" />
                  <span className="font-medium">{getFlightCount(itinerary.flights)}</span>
                  <span className="text-muted-foreground">
                    flight{getFlightCount(itinerary.flights) !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Show location names if available */}
            {Array.isArray(itinerary.locations) && itinerary.locations.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <div className="flex flex-wrap gap-2">
                  {itinerary.locations.slice(0, 3).map((location: any, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {location.name || location}
                    </Badge>
                  ))}
                  {itinerary.locations.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{itinerary.locations.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}