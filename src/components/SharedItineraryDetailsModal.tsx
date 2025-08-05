import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, MapPin, Clock, Star, Utensils, Camera, ExternalLink, Phone, Eye } from 'lucide-react';
import { format } from 'date-fns';

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
    
    // Navigate to restaurant search page with the restaurant name
    const searchQuery = encodeURIComponent(restaurantData.name);
    navigate(`/search?q=${searchQuery}`);
  };

  const eventsByDate = groupEventsByDate(itinerary.events);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {itinerary.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Itinerary Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Trip Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>
                  {format(new Date(itinerary.startDate), 'EEEE, MMMM do, yyyy')} - {format(new Date(itinerary.endDate), 'EEEE, MMMM do, yyyy')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{itinerary.events.length} events planned</Badge>
                <Badge variant="outline">
                  {Math.ceil((new Date(itinerary.endDate).getTime() - new Date(itinerary.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                </Badge>
              </div>
              {itinerary.message && (
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground italic">"{itinerary.message}"</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Daily Schedule */}
          <div className="space-y-4">
            <h3 className="font-medium text-base">Daily Schedule</h3>
            <ScrollArea className="max-h-96">
              <div className="space-y-4">
                {Object.entries(eventsByDate)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([date, events]) => (
                    <Card key={date}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(date), 'EEEE, MMMM do')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {(events as any[])
                          .sort((a, b) => a.time.localeCompare(b.time))
                          .map((event) => (
                            <div key={event.id} className="flex gap-3 p-3 border rounded-lg">
                              <div className="flex-shrink-0">
                                <Badge variant="outline" className="text-xs">
                                  {event.time}
                                </Badge>
                              </div>
                              
                              <div className="flex-1 space-y-2">
                                <h4 className="font-medium text-sm">{event.title}</h4>
                                
                                {/* Restaurant Data */}
                                {event.restaurantData && (
                                  <div 
                                    className="space-y-2 cursor-pointer hover:bg-muted/30 p-2 rounded-md transition-colors"
                                    onClick={() => handleRestaurantClick(event.restaurantData)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                        <MapPin className="w-3 h-3" />
                                        <span>{event.restaurantData.address}</span>
                                      </div>
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
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
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
                                      <p className="text-xs text-muted-foreground italic">
                                        {event.restaurantData.notes}
                                      </p>
                                    )}
                                    <div className="flex gap-2">
                                      {event.restaurantData.website && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(event.restaurantData.website, '_blank');
                                          }}
                                          className="h-7 px-2 text-xs"
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
                                          className="h-7 px-2 text-xs"
                                        >
                                          <Phone className="w-3 h-3 mr-1" />
                                          Call
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Attraction Data */}
                                {event.attractionData && (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                      <MapPin className="w-3 h-3" />
                                      <span>{event.attractionData.address}</span>
                                    </div>
                                    {event.attractionData.category && (
                                      <Badge variant="secondary" className="text-xs">
                                        {event.attractionData.category}
                                      </Badge>
                                    )}
                                    <div className="flex gap-2">
                                      {event.attractionData.website && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => window.open(event.attractionData.website, '_blank')}
                                          className="h-7 px-2 text-xs"
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