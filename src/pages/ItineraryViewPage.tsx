import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { ArrowLeft, Calendar, MapPin, Clock, Users, Globe, Star, Phone, ExternalLink, Utensils, Camera } from 'lucide-react';
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

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'restaurant':
        return Utensils;
      case 'attraction':
        return Camera;
      default:
        return Clock;
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'restaurant':
        return 'bg-success/10 text-success border-success/20';
      case 'attraction':
        return 'bg-primary/10 text-primary border-primary/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading itinerary...</p>
        </div>
      </div>
    );
  }

  if (!itinerary) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Itinerary Not Found</h1>
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/travel')}
              className="hover:bg-accent/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className={`font-bold text-foreground truncate ${isMobile ? 'text-lg' : 'text-xl'}`}>
                {itinerary.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                {duration} {duration === 1 ? 'day' : 'days'} • {itinerary.events.length} events
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* Trip Overview Card */}
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-primary via-primary-glow to-accent">
          <CardContent className="p-0">
            <div className="text-primary-foreground p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-3">{itinerary.title}</h2>
                    <div className="flex flex-col sm:flex-row gap-4 text-primary-foreground/90">
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
                    <Badge key={location.id} variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                      <MapPin className="w-3 h-3 mr-1" />
                      {location.name}
                    </Badge>
                  ))}
                  {itinerary.isMultiCity && (
                    <Badge variant="outline" className="bg-white/20 text-white border-white/30">
                      Multi-city
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Section */}
            <div className="bg-card p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center space-y-1">
                  <div className="text-2xl font-bold text-foreground">{itinerary.events.length}</div>
                  <div className="text-sm text-muted-foreground">Total Events</div>
                </div>
                <div className="text-center space-y-1">
                  <div className="text-2xl font-bold text-success">{restaurantCount}</div>
                  <div className="text-sm text-muted-foreground">Restaurants</div>
                </div>
                <div className="text-center space-y-1">
                  <div className="text-2xl font-bold text-primary">{attractionCount}</div>
                  <div className="text-sm text-muted-foreground">Attractions</div>
                </div>
                <div className="text-center space-y-1">
                  <div className="text-2xl font-bold text-accent">{duration}</div>
                  <div className="text-sm text-muted-foreground">Days</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Schedule */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-bold text-foreground">Daily Schedule</h3>
            <div className="h-px bg-border flex-1"></div>
          </div>
          
          {Object.entries(groupedEvents)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, events], dayIndex) => (
              <div className="bg-gradient-to-r from-muted/30 to-muted/10 rounded-2xl border border-border/50 shadow-lg backdrop-blur-sm">
                {/* Day Header */}
                <div className="p-6 border-b border-border/30">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="text-xl font-bold text-foreground">
                        {itinerary.wasCreatedWithLengthOfStay ? (
                          `Day ${dayIndex + 1}`
                        ) : (
                          `Day ${dayIndex + 1} - ${format(new Date(date), 'EEEE, MMMM do')}`
                        )}
                      </h4>
                      <p className="text-muted-foreground">
                        {events.length} {events.length === 1 ? 'event' : 'events'} planned
                      </p>
                    </div>
                    <div className="bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium border border-primary/20">
                      {events.length} events
                    </div>
                  </div>
                </div>

                {/* Events List */}
                <div className="p-6 space-y-6">
                  {events
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((event, index) => {
                      const EventIcon = getEventIcon(event.type);
                      return (
                        <div key={event.id} className="group">
                          {/* Event Card */}
                          <div className="bg-card rounded-xl border border-border/50 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/30">
                            <div className="flex gap-5">
                              {/* Time Display */}
                              <div className="flex-shrink-0">
                                <div className="w-20 h-20 bg-gradient-to-br from-primary via-primary-glow to-accent rounded-2xl flex flex-col items-center justify-center text-primary-foreground shadow-lg">
                                  <div className="text-sm font-bold">{event.time.split(':')[0]}</div>
                                  <div className="text-xs opacity-90">{event.time.split(':')[1]}</div>
                                </div>
                              </div>
                              
                              <div className="flex-1 space-y-4">
                                {/* Event Header */}
                                <div className="space-y-3">
                                  <div className="flex items-start justify-between gap-4">
                                    <h5 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                                      {event.title}
                                    </h5>
                                    <div className={`px-3 py-1.5 rounded-full text-xs font-medium border ${getEventTypeColor(event.type)}`}>
                                      <EventIcon className="w-3 h-3 mr-1.5 inline" />
                                      {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                                    </div>
                                  </div>
                                  
                                  {event.description && (
                                    <div className="bg-muted/30 rounded-lg p-4 border border-border/30">
                                      <p className="text-muted-foreground leading-relaxed">{event.description}</p>
                                    </div>
                                  )}
                                </div>

                                {/* Restaurant Details */}
                                {event.restaurantData && (
                                  <div className="bg-gradient-to-r from-success/5 to-success/10 rounded-xl border border-success/20 p-5 space-y-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-success/20 rounded-lg flex items-center justify-center">
                                        <Utensils className="w-4 h-4 text-success" />
                                      </div>
                                      <h6 className="font-semibold text-success text-lg">Restaurant Information</h6>
                                    </div>
                                    
                                    <div className="grid gap-4">
                                      {event.restaurantData.address && (
                                        <div className="flex items-start gap-4 p-3 bg-card/50 rounded-lg border border-success/10">
                                          <div className="w-6 h-6 bg-success/20 rounded-md flex items-center justify-center mt-0.5">
                                            <MapPin className="w-3.5 h-3.5 text-success" />
                                          </div>
                                          <div>
                                            <div className="text-xs font-medium text-success mb-1">Address</div>
                                            <div className="text-sm text-foreground">{event.restaurantData.address}</div>
                                          </div>
                                        </div>
                                      )}
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {event.restaurantData.phone && (
                                          <div className="flex items-center gap-4 p-3 bg-card/50 rounded-lg border border-success/10">
                                            <div className="w-6 h-6 bg-success/20 rounded-md flex items-center justify-center">
                                              <Phone className="w-3.5 h-3.5 text-success" />
                                            </div>
                                            <div>
                                              <div className="text-xs font-medium text-success mb-1">Phone</div>
                                              <a 
                                                href={`tel:${event.restaurantData.phone}`}
                                                className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                                              >
                                                {event.restaurantData.phone}
                                              </a>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {event.restaurantData.website && (
                                          <div className="flex items-center gap-4 p-3 bg-card/50 rounded-lg border border-success/10">
                                            <div className="w-6 h-6 bg-success/20 rounded-md flex items-center justify-center">
                                              <ExternalLink className="w-3.5 h-3.5 text-success" />
                                            </div>
                                            <div>
                                              <div className="text-xs font-medium text-success mb-1">Website</div>
                                              <a 
                                                href={event.restaurantData.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-primary hover:text-primary/80 transition-colors font-medium hover:underline"
                                              >
                                                Visit Website
                                              </a>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Attraction Details */}
                                {event.attractionData && (
                                  <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20 p-5 space-y-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                                        <Camera className="w-4 h-4 text-primary" />
                                      </div>
                                      <h6 className="font-semibold text-primary text-lg">Attraction Information</h6>
                                    </div>
                                    
                                    <div className="grid gap-4">
                                      {event.attractionData.address && (
                                        <div className="flex items-start gap-4 p-3 bg-card/50 rounded-lg border border-primary/10">
                                          <div className="w-6 h-6 bg-primary/20 rounded-md flex items-center justify-center mt-0.5">
                                            <MapPin className="w-3.5 h-3.5 text-primary" />
                                          </div>
                                          <div>
                                            <div className="text-xs font-medium text-primary mb-1">Address</div>
                                            <div className="text-sm text-foreground">{event.attractionData.address}</div>
                                          </div>
                                        </div>
                                      )}
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {event.attractionData.category && (
                                          <div className="flex items-center gap-4 p-3 bg-card/50 rounded-lg border border-primary/10">
                                            <div className="w-6 h-6 bg-primary/20 rounded-md flex items-center justify-center">
                                              <Users className="w-3.5 h-3.5 text-primary" />
                                            </div>
                                            <div>
                                              <div className="text-xs font-medium text-primary mb-1">Category</div>
                                              <div className="text-sm text-foreground">{event.attractionData.category}</div>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {event.attractionData.rating && (
                                          <div className="flex items-center gap-4 p-3 bg-card/50 rounded-lg border border-primary/10">
                                            <div className="w-6 h-6 bg-warning/20 rounded-md flex items-center justify-center">
                                              <Star className="w-3.5 h-3.5 text-warning fill-current" />
                                            </div>
                                            <div>
                                              <div className="text-xs font-medium text-primary mb-1">Rating</div>
                                              <div className="text-sm text-foreground font-medium">{event.attractionData.rating}/10</div>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {event.attractionData.website && (
                                          <div className="flex items-center gap-4 p-3 bg-card/50 rounded-lg border border-primary/10 md:col-span-2">
                                            <div className="w-6 h-6 bg-primary/20 rounded-md flex items-center justify-center">
                                              <ExternalLink className="w-3.5 h-3.5 text-primary" />
                                            </div>
                                            <div>
                                              <div className="text-xs font-medium text-primary mb-1">Website</div>
                                              <a 
                                                href={event.attractionData.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-primary hover:text-primary/80 transition-colors font-medium hover:underline"
                                              >
                                                Visit Website
                                              </a>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Event Connector Line */}
                          {index < events.length - 1 && (
                            <div className="flex justify-center my-4">
                              <div className="w-px h-6 bg-gradient-to-b from-border to-transparent"></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}