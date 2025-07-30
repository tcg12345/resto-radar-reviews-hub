import { format, eachDayOfInterval, isSameDay } from 'date-fns';
import { Plus, MapPin, Clock, Utensils, MapPinIcon, MoreVertical, Trash2, Edit, Compass, ExternalLink, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ItineraryEvent } from '@/components/ItineraryBuilder';

interface TripLocation {
  id: string;
  name: string;
  startDate?: Date;
  endDate?: Date;
}

interface TripCalendarProps {
  startDate: Date;
  endDate: Date;
  events: ItineraryEvent[];
  locations: TripLocation[];
  isMultiCity: boolean;
  onAddEvent: (date: string) => void;
  onEditEvent: (event: ItineraryEvent) => void;
  onDeleteEvent: (eventId: string) => void;
}


export function TripCalendar({ startDate, endDate, events, locations, isMultiCity, onAddEvent, onEditEvent, onDeleteEvent }: TripCalendarProps) {
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const getCityForDate = (date: Date) => {
    if (!isMultiCity || !locations.length) return null;
    
    for (const location of locations) {
      if (location.startDate && location.endDate) {
        const start = new Date(location.startDate);
        const end = new Date(location.endDate);
        if (date >= start && date <= end) {
          return location.name;
        }
      }
    }
    return null;
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events
      .filter(event => event.date === dateStr)
      .sort((a, b) => a.time.localeCompare(b.time));
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'restaurant':
        return <Utensils className="w-4 h-4" />;
      case 'attraction':
        return <MapPinIcon className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'restaurant':
        return 'bg-orange-100 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-300';
      case 'attraction':
        return 'bg-green-100 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300';
      default:
        return 'bg-gray-100 border-gray-200 text-gray-800 dark:bg-gray-900/20 border-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="grid gap-4">
      {/* Main Add Event Button */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Add Event to Your Trip</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Create events and choose which day(s) you want to add them to
            </p>
            <Button
              onClick={() => onAddEvent('')} // Empty string indicates main add event
              className="w-full max-w-xs"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </div>
        </CardContent>
      </Card>

      {days.map((day, index) => {
        const dayEvents = getEventsForDate(day);
        const dateStr = format(day, 'yyyy-MM-dd');
        
        return (
          <Card key={day.toISOString()} className="transition-all duration-200 hover:shadow-md md:rounded-lg md:border md:shadow-sm rounded-none border-0 border-t border-b shadow-none -mx-4 sm:-mx-6 lg:mx-0 lg:rounded-lg lg:border lg:shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    Day {index + 1} - {format(day, 'EEEE, MMMM do')}
                  </CardTitle>
                  <CardDescription className="space-y-1">
                    {isMultiCity && getCityForDate(day) && (
                      <div className="flex items-center gap-1 text-primary font-medium">
                        <MapPin className="w-3 h-3" />
                        {getCityForDate(day)}
                      </div>
                    )}
                    <div>
                      {dayEvents.length > 0 
                        ? `${dayEvents.length} ${dayEvents.length === 1 ? 'event' : 'events'} planned`
                        : 'No events planned'
                      }
                    </div>
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAddEvent(dateStr)}
                  className="flex items-center gap-2 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Add Event
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              {dayEvents.length > 0 ? (
                <div className="space-y-3">
                  {dayEvents.map((event, eventIndex) => (
                    <div key={event.id}>
                      <div className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-sm ${getEventColor(event.type)}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="mt-0.5">
                              {getEventIcon(event.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{event.time}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {event.type}
                                </Badge>
                              </div>
                              <h4 className="font-semibold text-base mb-1 break-words">
                                {event.title}
                              </h4>
                              {event.description && (
                                <p className="text-sm opacity-90 mb-2 break-words">
                                  {event.description}
                                </p>
                              )}
                              {event.restaurantData && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1 text-sm opacity-90">
                                    <MapPin className="w-3 h-3" />
                                    <span className="break-words">{event.restaurantData.address}</span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const query = encodeURIComponent(event.restaurantData?.address || event.title);
                                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank');
                                      }}
                                      className="flex items-center gap-1 h-8 px-3 text-xs"
                                    >
                                      <Compass className="w-3 h-3" />
                                      Directions
                                    </Button>
                                    {event.restaurantData.website && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(event.restaurantData.website, '_blank')}
                                        className="flex items-center gap-1 h-8 px-3 text-xs"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                        Website
                                      </Button>
                                    )}
                                    {event.restaurantData.phone && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(`tel:${event.restaurantData.phone}`, '_self')}
                                        className="flex items-center gap-1 h-8 px-3 text-xs"
                                      >
                                        <Phone className="w-3 h-3" />
                                        Call
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}
                               {event.attractionData && (
                                 <div className="space-y-2">
                                   <div className="flex items-center gap-1 text-sm opacity-90">
                                     <MapPin className="w-3 h-3" />
                                     <span className="break-words">{event.attractionData.address}</span>
                                   </div>
                                   {event.attractionData.category && (
                                     <Badge variant="outline" className="text-xs">
                                       {event.attractionData.category}
                                     </Badge>
                                   )}
                                   <div className="flex items-center gap-2 mt-2 flex-wrap">
                                     <Button
                                       variant="outline"
                                       size="sm"
                                       onClick={() => {
                                         const { latitude, longitude, address } = event.attractionData;
                                         const query = latitude && longitude 
                                           ? `${latitude},${longitude}` 
                                           : encodeURIComponent(address || event.attractionData.name);
                                         window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank');
                                       }}
                                       className="flex items-center gap-1 h-8 px-3 text-xs"
                                     >
                                       <Compass className="w-3 h-3" />
                                       Directions
                                     </Button>
                                     {event.attractionData.website && (
                                       <Button
                                         variant="outline"
                                         size="sm"
                                         onClick={() => window.open(event.attractionData.website, '_blank')}
                                         className="flex items-center gap-1 h-8 px-3 text-xs"
                                       >
                                         <ExternalLink className="w-3 h-3" />
                                         Website
                                       </Button>
                                     )}
                                     {event.attractionData.phone && (
                                       <Button
                                         variant="outline"
                                         size="sm"
                                         onClick={() => window.open(`tel:${event.attractionData.phone}`, '_self')}
                                         className="flex items-center gap-1 h-8 px-3 text-xs"
                                       >
                                         <Phone className="w-3 h-3" />
                                         Call
                                       </Button>
                                     )}
                                   </div>
                                 </div>
                               )}
                            </div>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 shrink-0"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => onEditEvent(event)}
                                className="flex items-center gap-2"
                              >
                                <Edit className="w-4 h-4" />
                                Edit Event
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onDeleteEvent(event.id)}
                                className="flex items-center gap-2 text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete Event
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      {eventIndex < dayEvents.length - 1 && (
                        <Separator className="my-3" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No events scheduled for this day</p>
                  <p className="text-sm">Click "Add Event" to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}