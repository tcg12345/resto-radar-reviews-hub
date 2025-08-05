import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, MapPin, Clock, Star, Utensils, Camera, ExternalLink, Phone, Eye, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/useIsMobile';

interface SharedItinerary {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  events: Array<{
    id: string;
    date: string;
    time: string;
    title: string;
    restaurantData?: any;
    attractionData?: any;
  }>;
  message?: string;
}

export function SharedItineraryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  
  // Get itinerary data from URL params
  const itineraryData = searchParams.get('data');
  const itinerary: SharedItinerary = itineraryData ? JSON.parse(decodeURIComponent(itineraryData)) : null;

  if (!itinerary) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Itinerary Not Found</h1>
          <p className="text-muted-foreground mb-6">Unable to load the shared itinerary.</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  const groupEventsByDate = (events: any[]) => {
    return events.reduce((groups, event) => {
      const date = event.date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
      return groups;
    }, {} as Record<string, any[]>);
  };

  const handleRestaurantClick = (restaurantData: any) => {
    // For mobile devices, navigate to mobile search restaurant details page
    if (isMobile) {
      // Convert restaurant data to the format expected by MobileSearchRestaurantDetailsPage
      const googlePlaceData = {
        place_id: restaurantData.placeId || restaurantData.google_place_id || `generated_${Date.now()}`,
        name: restaurantData.name,
        formatted_address: restaurantData.address,
        rating: restaurantData.googleRating || restaurantData.rating,
        price_level: restaurantData.priceRange,
        geometry: {
          location: {
            lat: restaurantData.latitude || 0,
            lng: restaurantData.longitude || 0
          }
        },
        types: ['restaurant'],
        formatted_phone_number: restaurantData.phone_number || restaurantData.phone,
        website: restaurantData.website
      };
      
      const placeData = encodeURIComponent(JSON.stringify(googlePlaceData));
      navigate(`/mobile/search/restaurant?data=${placeData}`);
      return;
    }
    
    // For desktop, try to navigate to restaurant details if we have an ID
    if (restaurantData.id) {
      navigate(`/restaurant/${restaurantData.id}`);
      return;
    }
    
    // Fallback: navigate to search page
    const searchQuery = encodeURIComponent(restaurantData.name);
    navigate(`/search?q=${searchQuery}`);
  };

  const eventsByDate = groupEventsByDate(itinerary.events);

  return (
    <>
      {/* Mobile status bar spacer */}
      <div className="lg:hidden h-[35px] bg-background"></div>
      
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-muted"
              >
                <ArrowLeft className="w-6 h-6" />
              </Button>
              
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Shared Itinerary</span>
              </div>
            </div>
            
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {itinerary.title}
            </h1>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-6 space-y-6">
          {/* Itinerary Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Trip Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>
                  {format(new Date(itinerary.startDate), 'EEEE, MMMM do, yyyy')} - {format(new Date(itinerary.endDate), 'EEEE, MMMM do, yyyy')}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{itinerary.events.length} events planned</Badge>
                <Badge variant="outline">
                  {Math.ceil((new Date(itinerary.endDate).getTime() - new Date(itinerary.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                </Badge>
              </div>
              {itinerary.message && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground italic">"{itinerary.message}"</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Daily Schedule */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Daily Schedule</h2>
            <div className="space-y-4">
              {Object.entries(eventsByDate)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, events]) => (
                  <Card key={date}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        {format(new Date(date), 'EEEE, MMMM do')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(events as any[])
                        .sort((a, b) => a.time.localeCompare(b.time))
                        .map((event) => (
                          <div key={event.id} className="space-y-3">
                            {/* Event with Restaurant Data */}
                            {event.restaurantData ? (
                              <div 
                                className="group cursor-pointer hover:bg-muted/30 p-4 rounded-xl border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-md bg-gradient-to-r from-background to-muted/10"
                                onClick={() => handleRestaurantClick(event.restaurantData)}
                              >
                                <div className="flex items-start gap-4">
                                  {/* Time badge */}
                                  <Badge variant="outline" className="flex-shrink-0 px-3 py-1 font-medium">
                                    {event.time}
                                  </Badge>
                                  
                                  {/* Restaurant content */}
                                  <div className="flex-1 min-w-0 space-y-3">
                                    {/* Restaurant header */}
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors truncate">
                                          {event.restaurantData.name}
                                        </h4>
                                        <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                                          <MapPin className="w-4 h-4 flex-shrink-0" />
                                          <span className="truncate">{event.restaurantData.address}</span>
                                        </div>
                                      </div>
                                      
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 opacity-60 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRestaurantClick(event.restaurantData);
                                        }}
                                      >
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                    </div>

                                    {/* Restaurant details and actions */}
                                    <div className="flex items-center justify-between gap-4">
                                      {/* Badges */}
                                      <div className="flex flex-wrap gap-2">
                                        {event.restaurantData.cuisine && (
                                          <Badge variant="secondary" className="text-xs">
                                            <Utensils className="w-3 h-3 mr-1" />
                                            {event.restaurantData.cuisine}
                                          </Badge>
                                        )}
                                        {event.restaurantData.rating && (
                                          <Badge variant="outline" className="text-xs border-yellow-200 bg-yellow-50 text-yellow-700">
                                            <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                                            {event.restaurantData.rating}/10
                                          </Badge>
                                        )}
                                        {event.restaurantData.priceRange && (
                                          <Badge variant="outline" className="text-xs">
                                            {'$'.repeat(event.restaurantData.priceRange)}
                                          </Badge>
                                        )}
                                        {event.restaurantData.michelinStars && (
                                          <Badge variant="outline" className="text-xs border-purple-200 bg-purple-50 text-purple-700">
                                            {'⭐'.repeat(event.restaurantData.michelinStars)}
                                          </Badge>
                                        )}
                                      </div>

                                      {/* Action buttons */}
                                      <div className="flex gap-2 flex-shrink-0">
                                        {event.restaurantData.website && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              window.open(event.restaurantData.website, '_blank');
                                            }}
                                            className="h-8 px-3 text-xs"
                                          >
                                            <ExternalLink className="w-3 h-3 mr-1" />
                                            Website
                                          </Button>
                                        )}
                                        {event.restaurantData.phone_number && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              window.open(`tel:${event.restaurantData.phone_number}`, '_blank');
                                            }}
                                            className="h-8 px-3 text-xs"
                                          >
                                            <Phone className="w-3 h-3 mr-1" />
                                            Call
                                          </Button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Notes */}
                                    {event.restaurantData.notes && (
                                      <div className="bg-muted/50 rounded-lg p-3 border-l-2 border-l-primary/30">
                                        <p className="text-sm text-muted-foreground italic">
                                          "{event.restaurantData.notes}"
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* Regular Event without Restaurant Data */
                              <div className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-background">
                                <Badge variant="outline" className="flex-shrink-0 px-3 py-1 font-medium">
                                  {event.time}
                                </Badge>
                                <div className="flex-1">
                                  <h4 className="font-medium">{event.title}</h4>
                                  
                                  {/* Attraction Data */}
                                  {event.attractionData && (
                                    <div className="mt-2 space-y-2">
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <MapPin className="w-4 h-4" />
                                        <span>{event.attractionData.address}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {event.attractionData.category && (
                                          <Badge variant="secondary" className="text-xs">
                                            {event.attractionData.category}
                                          </Badge>
                                        )}
                                        {event.attractionData.website && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => window.open(event.attractionData.website, '_blank')}
                                            className="h-7 px-3 text-xs"
                                          >
                                            <ExternalLink className="w-3 h-3 mr-1" />
                                            Website
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}