import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { ArrowLeft, Calendar, MapPin, Clock, Users, Globe, Star, Phone, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Itinerary } from '@/components/ItineraryBuilder';
import { useIsMobile } from '@/hooks/useIsMobile';

export function ItineraryViewPage() {
  const { itineraryId } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItinerary();
  }, [itineraryId]);

  const loadItinerary = () => {
    try {
      const saved = localStorage.getItem('savedItineraries');
      if (saved) {
        const parsed = JSON.parse(saved);
        const itineraries = parsed.map((it: any) => ({
          ...it,
          startDate: new Date(it.startDate),
          endDate: new Date(it.endDate),
          locations: it.locations.map((loc: any) => ({
            ...loc,
            startDate: loc.startDate ? new Date(loc.startDate) : undefined,
            endDate: loc.endDate ? new Date(loc.endDate) : undefined,
          })),
        }));
        
        const foundItinerary = itineraries.find((it: Itinerary) => it.id === itineraryId);
        if (foundItinerary) {
          setItinerary(foundItinerary);
        } else {
          toast.error('Itinerary not found');
          navigate('/travel');
        }
      } else {
        toast.error('No saved itineraries found');
        navigate('/travel');
      }
    } catch (error) {
      console.error('Error loading itinerary:', error);
      toast.error('Failed to load itinerary');
      navigate('/travel');
    } finally {
      setLoading(false);
    }
  };

  const groupEventsByDate = (events: Itinerary['events']) => {
    return events.reduce((acc, event) => {
      if (!acc[event.date]) acc[event.date] = [];
      acc[event.date].push(event);
      return acc;
    }, {} as Record<string, typeof events>);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading itinerary...</p>
        </div>
      </div>
    );
  }

  if (!itinerary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Itinerary Not Found</h1>
          <Button onClick={() => navigate('/travel')}>
            Back to Travel
          </Button>
        </div>
      </div>
    );
  }

  const duration = differenceInDays(itinerary.endDate, itinerary.startDate) + 1;
  const groupedEvents = groupEventsByDate(itinerary.events);
  const restaurantCount = itinerary.events.filter(e => e.type === 'restaurant').length;
  const attractionCount = itinerary.events.filter(e => e.type === 'attraction').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/travel')}
              className="hover:bg-white/60"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className={`font-bold text-gray-900 truncate ${isMobile ? 'text-lg' : 'text-xl'}`}>
                {itinerary.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                {duration} {duration === 1 ? 'day' : 'days'} • {itinerary.events.length} events
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Trip Overview Card */}
        <Card className="overflow-hidden bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2">{itinerary.title}</h2>
                  <div className="flex items-center gap-4 text-blue-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">
                        {format(itinerary.startDate, 'MMM do, yyyy')} - {format(itinerary.endDate, 'MMM do, yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{duration} days</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Destinations */}
              <div className="flex flex-wrap gap-2">
                {itinerary.locations.map((location) => (
                  <Badge key={location.id} variant="secondary" className="bg-white/20 text-white border-white/20">
                    <MapPin className="w-3 h-3 mr-1" />
                    {location.name}
                  </Badge>
                ))}
                {itinerary.isMultiCity && (
                  <Badge variant="outline" className="bg-white/20 text-white border-white/20">
                    Multi-city
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{itinerary.events.length}</div>
                <div className="text-sm text-muted-foreground">Total Events</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{restaurantCount}</div>
                <div className="text-sm text-muted-foreground">Restaurants</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{attractionCount}</div>
                <div className="text-sm text-muted-foreground">Attractions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{duration}</div>
                <div className="text-sm text-muted-foreground">Days</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Schedule */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-gray-900">Daily Schedule</h3>
          
          {Object.entries(groupedEvents)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, events], dayIndex) => (
              <Card key={date} className="overflow-hidden bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                {/* Day Header */}
                <div className="bg-gradient-to-r from-gray-100 to-gray-50 border-b px-6 py-4">
                  <h4 className="font-semibold text-lg text-gray-900">
                    {itinerary.wasCreatedWithLengthOfStay ? (
                      `Day ${dayIndex + 1}`
                    ) : (
                      `Day ${dayIndex + 1} - ${format(new Date(date), 'EEEE, MMMM do')}`
                    )}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {events.length} {events.length === 1 ? 'event' : 'events'} planned
                  </p>
                </div>

                <CardContent className="p-0">
                  <div className="divide-y">
                    {events
                      .sort((a, b) => a.time.localeCompare(b.time))
                      .map((event, index) => (
                        <div key={event.id} className="p-6 hover:bg-gray-50/50 transition-colors">
                          <div className="flex gap-4">
                            <div className="flex-shrink-0">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                {event.time}
                              </div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div>
                                  <h5 className="font-semibold text-gray-900 mb-1">{event.title}</h5>
                                  <Badge 
                                    variant={event.type === 'restaurant' ? 'default' : event.type === 'attraction' ? 'secondary' : 'outline'}
                                    className="text-xs"
                                  >
                                    {event.type}
                                  </Badge>
                                </div>
                              </div>

                              {event.description && (
                                <p className="text-muted-foreground mb-3">{event.description}</p>
                              )}

                              {/* Restaurant Details */}
                              {event.restaurantData && (
                                <div className="bg-green-50 rounded-lg p-4 space-y-2">
                                  <h6 className="font-medium text-green-800 mb-2">Restaurant Details</h6>
                                  
                                  {event.restaurantData.address && (
                                    <div className="flex items-start gap-2 text-sm">
                                      <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                      <span className="text-green-700">{event.restaurantData.address}</span>
                                    </div>
                                  )}
                                  
                                  {event.restaurantData.phone && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Phone className="w-4 h-4 text-green-600" />
                                      <a 
                                        href={`tel:${event.restaurantData.phone}`}
                                        className="text-green-700 hover:text-green-900"
                                      >
                                        {event.restaurantData.phone}
                                      </a>
                                    </div>
                                  )}
                                  
                                  {event.restaurantData.website && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <ExternalLink className="w-4 h-4 text-green-600" />
                                      <a 
                                        href={event.restaurantData.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-green-700 hover:text-green-900 hover:underline"
                                      >
                                        Visit Website
                                      </a>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Attraction Details */}
                              {event.attractionData && (
                                <div className="bg-purple-50 rounded-lg p-4 space-y-2">
                                  <h6 className="font-medium text-purple-800 mb-2">Attraction Details</h6>
                                  
                                  {event.attractionData.address && (
                                    <div className="flex items-start gap-2 text-sm">
                                      <MapPin className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                      <span className="text-purple-700">{event.attractionData.address}</span>
                                    </div>
                                  )}
                                  
                                  {event.attractionData.category && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Users className="w-4 h-4 text-purple-600" />
                                      <span className="text-purple-700">{event.attractionData.category}</span>
                                    </div>
                                  )}
                                  
                                  {event.attractionData.rating && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Star className="w-4 h-4 text-yellow-500" />
                                      <span className="text-purple-700">{event.attractionData.rating}/10</span>
                                    </div>
                                  )}
                                  
                                  {event.attractionData.website && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <ExternalLink className="w-4 h-4 text-purple-600" />
                                      <a 
                                        href={event.attractionData.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-purple-700 hover:text-purple-900 hover:underline"
                                      >
                                        Visit Website
                                      </a>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>
    </div>
  );
}