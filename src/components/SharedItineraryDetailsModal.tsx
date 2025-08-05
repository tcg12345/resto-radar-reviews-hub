import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, MapPin, Clock, Star, Utensils, Camera, ExternalLink, Phone, Eye } from 'lucide-react';
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

interface SharedItineraryDetailsModalProps {
  itinerary: SharedItinerary;
  isOpen: boolean;
  onClose: () => void;
}

export function SharedItineraryDetailsModal({ itinerary, isOpen, onClose }: SharedItineraryDetailsModalProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

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
    // Close the modal first
    onClose();
    
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`
        ${isMobile 
          ? 'w-[95vw] max-w-none h-[85vh] mt-[10vh] p-4 rounded-lg' 
          : 'sm:max-w-[700px] max-h-[90vh]'
        } 
        overflow-y-auto
      `}>
        <DialogHeader className={isMobile ? 'pb-4' : ''}>
          <DialogTitle className={`flex items-center gap-2 ${isMobile ? 'text-lg' : ''}`}>
            <Calendar className={isMobile ? 'w-5 h-5' : 'w-5 h-5'} />
            {itinerary.title}
          </DialogTitle>
        </DialogHeader>

        <div className={`space-y-${isMobile ? '4' : '6'}`}>
          {/* Itinerary Overview */}
          <Card className={isMobile ? 'border-0 shadow-none bg-background' : ''}>
            <CardHeader className={isMobile ? 'px-0 pb-2' : ''}>
              <CardTitle className={`${isMobile ? 'text-sm' : 'text-base'} flex items-center gap-2`}>
                <Calendar className="w-4 h-4" />
                Trip Overview
              </CardTitle>
            </CardHeader>
            <CardContent className={`space-y-3 ${isMobile ? 'px-0' : ''}`}>
              <div className={`flex ${isMobile ? 'flex-col gap-1' : 'items-center gap-2'} text-sm`}>
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className={isMobile ? 'text-xs' : ''}>
                  {format(new Date(itinerary.startDate), isMobile ? 'MMM do' : 'EEEE, MMMM do, yyyy')} - {format(new Date(itinerary.endDate), isMobile ? 'MMM do, yyyy' : 'EEEE, MMMM do, yyyy')}
                </span>
              </div>
              <div className={`flex ${isMobile ? 'flex-wrap' : 'items-center'} gap-2`}>
                <Badge variant="secondary" className={isMobile ? 'text-xs' : ''}>{itinerary.events.length} events planned</Badge>
                <Badge variant="outline" className={isMobile ? 'text-xs' : ''}>
                  {Math.ceil((new Date(itinerary.endDate).getTime() - new Date(itinerary.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                </Badge>
              </div>
              {itinerary.message && (
                <div className={`mt-3 p-3 bg-muted rounded-lg ${isMobile ? 'p-2' : ''}`}>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground italic`}>"{itinerary.message}"</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Daily Schedule */}
          <div className={`space-y-${isMobile ? '3' : '4'}`}>
            <h3 className={`font-medium ${isMobile ? 'text-sm' : 'text-base'}`}>Daily Schedule</h3>
            <ScrollArea className={isMobile ? 'max-h-[45vh]' : 'max-h-96'}>
              <div className={`space-y-${isMobile ? '3' : '4'}`}>
                {Object.entries(eventsByDate)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([date, events]) => (
                    <Card key={date} className={isMobile ? 'border-0 shadow-sm bg-muted/30' : ''}>
                      <CardHeader className={`${isMobile ? 'px-3 py-2' : 'pb-3'}`}>
                        <CardTitle className={`${isMobile ? 'text-xs' : 'text-sm'} flex items-center gap-2`}>
                          <Calendar className="w-4 h-4" />
                          {format(new Date(date), isMobile ? 'EEE, MMM do' : 'EEEE, MMMM do')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className={`space-y-${isMobile ? '2' : '3'} ${isMobile ? 'px-3 pb-3' : ''}`}>
                        {(events as any[])
                          .sort((a, b) => a.time.localeCompare(b.time))
                          .map((event) => (
                            <div key={event.id} className={`flex gap-${isMobile ? '2' : '3'} ${isMobile ? 'p-2' : 'p-3'} border rounded-lg bg-background`}>
                              <div className="flex-shrink-0">
                                <Badge variant="outline" className="text-xs">
                                  {event.time}
                                </Badge>
                              </div>
                              
                              <div className={`flex-1 space-y-${isMobile ? '1' : '2'}`}>
                                <h4 className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>{event.title}</h4>
                                
                                {/* Restaurant Data */}
                                {event.restaurantData && (
                                  <div 
                                    className={`space-y-${isMobile ? '1' : '2'} cursor-pointer hover:bg-muted/30 ${isMobile ? 'p-1' : 'p-2'} rounded-md transition-colors`}
                                    onClick={() => handleRestaurantClick(event.restaurantData)}
                                  >
                                    <div className={`flex ${isMobile ? 'flex-col gap-1' : 'items-center justify-between'}`}>
                                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                        <MapPin className="w-3 h-3" />
                                        <span className={`${isMobile ? 'text-xs line-clamp-2' : ''}`}>{event.restaurantData.address}</span>
                                      </div>
                                      {!isMobile && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2 text-xs opacity-60"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRestaurantClick(event.restaurantData);
                                          }}
                                        >
                                          <Eye className="w-3 h-3 mr-1" />
                                          View
                                        </Button>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <Badge variant="secondary" className="text-xs">
                                        <Utensils className="w-3 h-3 mr-1" />
                                        {event.restaurantData.cuisine}
                                      </Badge>
                                      {event.restaurantData.rating && (
                                        <Badge variant="outline" className="text-xs">
                                          <Star className="w-3 h-3 mr-1" />
                                          {event.restaurantData.rating}/10
                                        </Badge>
                                      )}
                                      {event.restaurantData.priceRange && (
                                        <Badge variant="outline" className="text-xs">
                                          {'$'.repeat(event.restaurantData.priceRange)}
                                        </Badge>
                                      )}
                                      {event.restaurantData.michelinStars && (
                                        <Badge variant="outline" className="text-xs">
                                          {'⭐'.repeat(event.restaurantData.michelinStars)}
                                        </Badge>
                                      )}
                                    </div>
                                    {event.restaurantData.notes && (
                                      <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-muted-foreground italic line-clamp-2`}>
                                        {event.restaurantData.notes}
                                      </p>
                                    )}
                                    <div className={`flex gap-${isMobile ? '1' : '2'} ${isMobile ? 'flex-wrap' : ''}`}>
                                      {event.restaurantData.website && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(event.restaurantData.website, '_blank');
                                          }}
                                          className={`${isMobile ? 'h-6 px-2 text-xs' : 'h-7 px-2 text-xs'}`}
                                        >
                                          <ExternalLink className="w-3 h-3 mr-1" />
                                          {isMobile ? '' : 'Website'}
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
                                          className={`${isMobile ? 'h-6 px-2 text-xs' : 'h-7 px-2 text-xs'}`}
                                        >
                                          <Phone className="w-3 h-3 mr-1" />
                                          {isMobile ? '' : 'Call'}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Attraction Data */}
                                {event.attractionData && (
                                  <div className={`space-y-${isMobile ? '1' : '2'}`}>
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                      <MapPin className="w-3 h-3" />
                                      <span className={`${isMobile ? 'text-xs line-clamp-2' : ''}`}>{event.attractionData.address}</span>
                                    </div>
                                    {event.attractionData.category && (
                                      <Badge variant="secondary" className="text-xs">
                                        {event.attractionData.category}
                                      </Badge>
                                    )}
                                    <div className={`flex gap-${isMobile ? '1' : '2'}`}>
                                      {event.attractionData.website && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => window.open(event.attractionData.website, '_blank')}
                                          className={`${isMobile ? 'h-6 px-2 text-xs' : 'h-7 px-2 text-xs'}`}
                                        >
                                          <ExternalLink className="w-3 h-3 mr-1" />
                                          {isMobile ? '' : 'Website'}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}