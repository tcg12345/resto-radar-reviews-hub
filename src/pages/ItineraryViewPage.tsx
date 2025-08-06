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
              <div key={date} className="relative">
                {/* Timeline Day Header */}
                <div className="sticky top-20 z-10 mb-4">
                  <div className="bg-card/95 backdrop-blur-md rounded-xl border border-border/60 shadow-sm p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-bold text-foreground">
                          {itinerary.wasCreatedWithLengthOfStay ? (
                            `Day ${dayIndex + 1}`
                          ) : (
                            `Day ${dayIndex + 1}`
                          )}
                        </h4>
                        {!itinerary.wasCreatedWithLengthOfStay && (
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(date), 'EEEE, MMMM do')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                          {events.length}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline Events */}
                <div className="relative pl-6 pb-8">
                  {/* Timeline Line */}
                  <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent"></div>
                  
                  <div className="space-y-6">
                    {events
                      .sort((a, b) => a.time.localeCompare(b.time))
                      .map((event, index) => {
                        const EventIcon = getEventIcon(event.type);
                        return (
                          <div key={event.id} className="relative">
                            {/* Timeline Dot */}
                            <div className="absolute -left-6 top-3 w-6 h-6 bg-primary rounded-full border-4 border-background shadow-md flex items-center justify-center">
                              <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
                            </div>
                            
                            {/* Event Content */}
                            <div className="bg-card rounded-lg border border-border/40 shadow-sm overflow-hidden">
                              {/* Event Header */}
                              <div className="p-4 border-b border-border/30">
                                <div className="flex items-start gap-3">
                                  <div className="flex-shrink-0 mt-1">
                                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                      <EventIcon className="w-5 h-5 text-primary" />
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                      <h5 className="font-semibold text-foreground text-base leading-tight">
                                        {event.title}
                                      </h5>
                                      <div className="flex-shrink-0 bg-accent/10 text-accent px-2 py-1 rounded text-xs font-medium">
                                        {event.time}
                                      </div>
                                    </div>
                                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getEventTypeColor(event.type)}`}>
                                      {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                                    </div>
                                  </div>
                                </div>
                                
                                {event.description && (
                                  <div className="mt-3 text-sm text-muted-foreground leading-relaxed">
                                    {event.description}
                                  </div>
                                )}
                              </div>

                              {/* Restaurant Details */}
                              {event.restaurantData && (
                                <div className="p-4 bg-success/5">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Utensils className="w-4 h-4 text-success" />
                                    <span className="text-sm font-medium text-success">Restaurant Info</span>
                                  </div>
                                  
                                  <div className="space-y-3">
                                    {event.restaurantData.address && (
                                      <div className="flex items-start gap-3">
                                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                        <span className="text-sm text-foreground">{event.restaurantData.address}</span>
                                      </div>
                                    )}
                                    
                                    <div className="flex flex-col sm:flex-row gap-3">
                                      {event.restaurantData.phone && (
                                        <a 
                                          href={`tel:${event.restaurantData.phone}`}
                                          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                                        >
                                          <Phone className="w-4 h-4" />
                                          {event.restaurantData.phone}
                                        </a>
                                      )}
                                      
                                      {event.restaurantData.website && (
                                        <a 
                                          href={event.restaurantData.website}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                                        >
                                          <ExternalLink className="w-4 h-4" />
                                          Website
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Attraction Details */}
                              {event.attractionData && (
                                <div className="p-4 bg-primary/5">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Camera className="w-4 h-4 text-primary" />
                                    <span className="text-sm font-medium text-primary">Attraction Info</span>
                                  </div>
                                  
                                  <div className="space-y-3">
                                    {event.attractionData.address && (
                                      <div className="flex items-start gap-3">
                                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                        <span className="text-sm text-foreground">{event.attractionData.address}</span>
                                      </div>
                                    )}
                                    
                                    <div className="flex flex-col sm:flex-row gap-3">
                                      {event.attractionData.category && (
                                        <div className="flex items-center gap-2 text-sm text-foreground">
                                          <Users className="w-4 h-4 text-muted-foreground" />
                                          {event.attractionData.category}
                                        </div>
                                      )}
                                      
                                      {event.attractionData.rating && (
                                        <div className="flex items-center gap-2 text-sm text-foreground">
                                          <Star className="w-4 h-4 text-warning fill-current" />
                                          {event.attractionData.rating}/10
                                        </div>
                                      )}
                                    </div>
                                    
                                    {event.attractionData.website && (
                                      <a 
                                        href={event.attractionData.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                                      >
                                        <ExternalLink className="w-4 h-4" />
                                        Website
                                      </a>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}