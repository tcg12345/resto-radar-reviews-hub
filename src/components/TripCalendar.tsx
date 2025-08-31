import { format, eachDayOfInterval, isSameDay } from 'date-fns';
import { Plus, MapPin, Clock, Utensils, MapPinIcon, MoreVertical, Trash2, Edit, Compass, ExternalLink, Phone, ChevronDown, Hotel, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ItineraryEvent, HotelBooking } from '@/components/ItineraryBuilder';
import { useState } from 'react';
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
  hotels: HotelBooking[];
  isMultiCity: boolean;
  useLengthOfStay?: boolean;
  onAddEvent: (date: string) => void;
  onEditEvent: (event: ItineraryEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onMoveEvent?: (eventId: string, newDate: string) => void;
}
export function TripCalendar({
  startDate,
  endDate,
  events,
  locations,
  hotels,
  isMultiCity,
  useLengthOfStay,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  onMoveEvent
}: TripCalendarProps) {
  const days = eachDayOfInterval({
    start: startDate,
    end: endDate
  });
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(() => {
    // Initialize with all days collapsed by default
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    return new Set(allDays.map(day => format(day, 'yyyy-MM-dd')));
  });
  const [changingEventId, setChangingEventId] = useState<string | null>(null);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const toggleDayCollapse = (dateStr: string) => {
    const newCollapsed = new Set(collapsedDays);
    if (newCollapsed.has(dateStr)) {
      newCollapsed.delete(dateStr);
    } else {
      newCollapsed.add(dateStr);
    }
    setCollapsedDays(newCollapsed);
  };
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

  const getHotelForDate = (date: Date) => {
    if (!hotels || hotels.length === 0) return null;
    
    // If only one hotel and no specific dates, show it for the whole trip
    if (hotels.length === 1) {
      const hotel = hotels[0];
      if (!hotel.checkIn && !hotel.checkOut) {
        return hotel;
      }
    }
    
    // Check hotels by date ranges
    for (const hotel of hotels) {
      if (hotel.checkIn && hotel.checkOut) {
        const checkInDate = new Date(hotel.checkIn);
        const checkOutDate = new Date(hotel.checkOut);
        
        // Check if the date falls within the hotel stay period
        if (date >= checkInDate && date < checkOutDate) {
          return hotel;
        }
      }
    }
    
    // If no date-specific hotel found but only one hotel exists, use it
    if (hotels.length === 1) {
      return hotels[0];
    }
    
    return null;
  };
  
  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter(event => event.date === dateStr).sort((a, b) => {
      // Convert time strings to comparable format
      const timeA = convertTo24Hour(a.time);
      const timeB = convertTo24Hour(b.time);
      return timeA.localeCompare(timeB);
    });
  };
  const convertTo24Hour = (time12h: string) => {
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') {
      hours = '00';
    }
    if (modifier === 'PM') {
      hours = String(parseInt(hours, 10) + 12);
    }
    return `${hours.padStart(2, '0')}:${minutes}`;
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
  return <div className="w-full space-y-4 flex flex-col items-center lg:items-stretch lg:px-8 xl:px-16">
      {/* Main Add Event Button */}
      <Card className="bg-primary/5 border-0">
        <CardContent className="px-4 py-4 md:px-6 md:py-6 animate-fade-in">
          <div className="max-w-sm mx-auto text-center space-y-2 md:space-y-3">
            <div className="hidden md:flex items-center justify-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Add Event to Your Trip</h3>
            </div>
            <p className="hidden md:block text-sm text-muted-foreground">
              Create events and choose which day(s) you want to add them to
            </p>
            <Button onClick={() => onAddEvent('')} // Empty string indicates main add event
          className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </div>
        </CardContent>
      </Card>

      {days.map((day, index) => {
      const dayEvents = getEventsForDate(day);
      const dayHotel = getHotelForDate(day);
      const dateStr = format(day, 'yyyy-MM-dd');
      const isCollapsed = collapsedDays.has(dateStr);
      return <div key={day.toISOString()} className="lg:contents">
            <Collapsible open={!isCollapsed} onOpenChange={() => toggleDayCollapse(dateStr)}>
              <Card className="w-[calc(100vw-1rem)] max-w-full lg:w-full lg:max-w-none lg:mb-6 transition-all duration-200 hover:shadow-md rounded-xl shadow-sm bg-card border lg:rounded-lg lg:border-border/50 lg:shadow-lg lg:hover:shadow-xl lg:hover:border-primary/20 lg:bg-gradient-to-br lg:from-card lg:to-muted/30">
                <CollapsibleTrigger asChild>
                  <CardHeader className="p-4 cursor-pointer hover:bg-muted/30 transition-all duration-200 rounded-t-xl lg:rounded-t-lg active:scale-[0.98]">
                    {isCollapsed ? <div className="flex items-center justify-between w-full min-h-[3rem]">
                        <div className="flex-1 flex items-center">
                          <div className="flex-1">
                            <CardTitle className="text-base lg:text-lg font-semibold truncate">
                              {useLengthOfStay ? `Day ${index + 1}` : `Day ${index + 1} - ${format(day, 'EEE, MMM do')}`}
                            </CardTitle>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {isMultiCity && getCityForDate(day) && <div className="flex items-center gap-1 text-primary font-medium text-xs">
                                  <MapPin className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{getCityForDate(day)}</span>
                                </div>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button variant="ghost" size="icon" onClick={e => {
                      e.stopPropagation();
                      onAddEvent(dateStr);
                    }} className="w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border-0">
                            <Plus className="w-4 h-4" />
                          </Button>
                          <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform rotate-180" />
                        </div>
                      </div> : <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base lg:text-lg font-semibold flex-1">
                            {useLengthOfStay ? `Day ${index + 1}` : `Day ${index + 1} - ${format(day, 'EEE, MMM do')}`}
                          </CardTitle>
                          <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform" />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {isMultiCity && getCityForDate(day) && <div className="flex items-center gap-1 text-primary font-medium text-sm">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">{getCityForDate(day)}</span>
                              </div>}
                            {dayHotel && <div 
                                className="flex items-center gap-1 text-blue-600 font-medium text-sm bg-blue-50 dark:bg-blue-950/30 px-3 py-1.5 rounded-md border border-blue-200/50 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (dayHotel.hotel?.id) {
                                    // Store hotel data in sessionStorage for the details page
                                    sessionStorage.setItem(`hotel_${dayHotel.hotel.id}`, JSON.stringify(dayHotel.hotel));
                                    navigate(`/hotel/${dayHotel.hotel.id}`);
                                  }
                                }}
                              >
                                <Hotel className="w-4 h-4 shrink-0" />
                                <span className="truncate">{dayHotel.hotel?.name || 'Hotel'}</span>
                              </div>}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                              {dayEvents.length > 0 ? `${dayEvents.length} ${dayEvents.length === 1 ? 'event' : 'events'} planned` : 'No events planned'}
                            </div>
                            <Button variant="ghost" size="sm" onClick={e => {
                        e.stopPropagation();
                        onAddEvent(dateStr);
                      }} className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border-0 rounded-full px-3">
                              <Plus className="w-3 h-3" />
                              <span className="text-xs">Add Event</span>
                            </Button>
                          </div>
                        </div>
                      </div>}
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {dayEvents.length > 0 ? <div className="space-y-3">
                        {dayEvents.map((event, eventIndex) => <div key={event.id}>
                            <div className={`p-3 lg:p-4 rounded-lg border transition-all duration-200 hover:shadow-sm ${getEventColor(event.type)} w-full`}>
                              <div className="space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                      <span className="font-medium text-sm shrink-0">{event.time}</span>
                                      <Badge variant="secondary" className="text-xs shrink-0">
                                        {event.type}
                                      </Badge>
                                    </div>
                                    <h4 className="font-semibold text-sm lg:text-base mb-2">
                                      {event.title}
                                    </h4>
                                    {event.description && <p className="text-xs lg:text-sm opacity-90 mb-2">
                                        {event.description}
                                      </p>}
                                  </div>
                                  
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-background border shadow-md z-50">
                                      {event.type === 'restaurant' && event.restaurantData && <DropdownMenuItem onClick={() => {
                              if (isMobile) {
                                // For mobile, navigate to mobile search restaurant details page
                                const googlePlaceData = {
                                  place_id: event.restaurantData?.placeId || `generated_${Date.now()}`,
                                  name: event.restaurantData?.name || event.title,
                                  formatted_address: event.restaurantData?.address,
                                  formatted_phone_number: event.restaurantData?.phone,
                                  website: event.restaurantData?.website
                                };
                                const placeData = encodeURIComponent(JSON.stringify(googlePlaceData));
                                navigate(`/mobile/search/restaurant?data=${placeData}`);
                              } else {
                                // For desktop, navigate to unified search page with restaurant data
                                const searchQuery = encodeURIComponent(event.restaurantData?.name || event.title);
                                navigate(`/search?q=${searchQuery}`);
                              }
                            }} className="flex items-center gap-2">
                                        <ExternalLink className="w-4 h-4" />
                                        View Details
                                      </DropdownMenuItem>}
                                       <DropdownMenuItem onClick={() => onEditEvent(event)} className="flex items-center gap-2">
                                         <Edit className="w-4 h-4" />
                                         Edit Event
                                       </DropdownMenuItem>
                                       {onMoveEvent && (
                                         <DropdownMenuItem 
                                           onClick={() => setChangingEventId(changingEventId === event.id ? null : event.id)} 
                                           className="flex items-center gap-2"
                                         >
                                           <Calendar className="w-4 h-4" />
                                           Change Day
                                         </DropdownMenuItem>
                                       )}
                                       <DropdownMenuItem onClick={() => onDeleteEvent(event.id)} className="flex items-center gap-2 text-destructive">
                                         <Trash2 className="w-4 h-4" />
                                         Delete Event
                                       </DropdownMenuItem>
                                     </DropdownMenuContent>
                                   </DropdownMenu>
                                 </div>

                                 {changingEventId === event.id && onMoveEvent && (
                                   <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
                                     <p className="text-sm font-medium mb-2">Move to:</p>
                                     <Select onValueChange={(newDate) => {
                                       onMoveEvent(event.id, newDate);
                                       setChangingEventId(null);
                                     }}>
                                       <SelectTrigger className="w-full">
                                         <SelectValue placeholder="Select a day" />
                                       </SelectTrigger>
                                       <SelectContent>
                                         {days.map(day => {
                                           const dateStr = format(day, 'yyyy-MM-dd');
                                           const isCurrentDay = isSameDay(new Date(event.date), day);
                                           return (
                                             <SelectItem 
                                               key={dateStr} 
                                               value={dateStr}
                                               disabled={isCurrentDay}
                                             >
                                               {format(day, 'EEEE, MMM d')}
                                               {isCurrentDay && ' (current)'}
                                             </SelectItem>
                                           );
                                         })}
                                       </SelectContent>
                                     </Select>
                                     <Button 
                                       variant="ghost" 
                                       size="sm" 
                                       onClick={() => setChangingEventId(null)}
                                       className="mt-2 w-full"
                                     >
                                       Cancel
                                     </Button>
                                   </div>
                                 )}

                                {event.restaurantData && <div className="space-y-3">
                                    <div className="flex items-start gap-2 text-sm opacity-90">
                                      <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                                      <span className="break-words text-xs lg:text-sm">{event.restaurantData.address}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <Button variant="outline" size="sm" onClick={() => {
                                const query = encodeURIComponent(event.restaurantData?.address || event.title);
                                window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank');
                              }} className="flex items-center gap-1 h-8 px-3 text-xs">
                                        <Compass className="w-3 h-3" />
                                        Directions
                                      </Button>
                                      {event.restaurantData.website && <Button variant="outline" size="sm" onClick={() => window.open(event.restaurantData.website, '_blank')} className="flex items-center gap-1 h-8 px-3 text-xs">
                                          <ExternalLink className="w-3 h-3" />
                                          Website
                                        </Button>}
                                      {event.restaurantData.phone && <Button variant="outline" size="sm" onClick={() => window.open(`tel:${event.restaurantData.phone}`, '_self')} className="flex items-center gap-1 h-8 px-3 text-xs">
                                          <Phone className="w-3 h-3" />
                                          Call
                                        </Button>}
                                    </div>
                                  </div>}
                                 
                                 {event.attractionData && <div className="space-y-3">
                                     <div className="flex items-start gap-2 text-sm opacity-90">
                                       <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                                       <span className="break-words text-xs lg:text-sm">{event.attractionData.address}</span>
                                     </div>
                                     {event.attractionData.category && <Badge variant="outline" className="text-xs">
                                         {event.attractionData.category}
                                       </Badge>}
                                     <div className="flex flex-wrap gap-2">
                                       <Button variant="outline" size="sm" onClick={() => {
                                const {
                                  latitude,
                                  longitude,
                                  address
                                } = event.attractionData;
                                const query = latitude && longitude ? `${latitude},${longitude}` : encodeURIComponent(address || event.attractionData.name);
                                window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank');
                              }} className="flex items-center gap-1 h-8 px-3 text-xs">
                                         <Compass className="w-3 h-3" />
                                         Directions
                                       </Button>
                                       {event.attractionData.website && <Button variant="outline" size="sm" onClick={() => window.open(event.attractionData.website, '_blank')} className="flex items-center gap-1 h-8 px-3 text-xs">
                                           <ExternalLink className="w-3 h-3" />
                                           Website
                                         </Button>}
                                       {event.attractionData.phone && <Button variant="outline" size="sm" onClick={() => window.open(`tel:${event.attractionData.phone}`, '_self')} className="flex items-center gap-1 h-8 px-3 text-xs">
                                           <Phone className="w-3 h-3" />
                                           Call
                                         </Button>}
                                     </div>
                                   </div>}
                               </div>
                             </div>
                             {eventIndex < dayEvents.length - 1 && <Separator className="my-3" />}
                           </div>)}
                       </div> : <div className="text-center py-4 text-muted-foreground">
                         <p className="text-sm">No events scheduled</p>
                       </div>}
                   </CardContent>
                 </CollapsibleContent>
               </Card>
             </Collapsible>
           </div>;
      })}
    </div>;
}