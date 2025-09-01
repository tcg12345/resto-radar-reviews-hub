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

  const getEventGradient = (type: string) => {
    switch (type) {
      case 'restaurant':
        return 'bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200/50 dark:from-orange-900/20 dark:to-orange-900/10 dark:border-orange-800/30';
      case 'attraction':
        return 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200/50 dark:from-emerald-900/20 dark:to-emerald-900/10 dark:border-emerald-800/30';
      default:
        return 'bg-gradient-to-br from-slate-50 to-slate-100/50 border-slate-200/50 dark:from-slate-900/20 dark:to-slate-900/10 dark:border-slate-800/30';
    }
  };

  const getCategoryBadgeColor = (type: string) => {
    switch (type) {
      case 'restaurant':
        return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700';
      case 'attraction':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-300 dark:border-slate-700';
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
              <Card className="w-[calc(100vw-1rem)] max-w-full lg:w-full lg:max-w-none lg:mb-6 transition-all duration-300 hover:shadow-lg rounded-2xl shadow-sm bg-gradient-to-br from-card to-card/80 border border-border/30 backdrop-blur-sm lg:hover:shadow-xl lg:hover:border-primary/30 lg:hover:-translate-y-0.5 animate-fade-in">
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
                    {dayEvents.length > 0 ? <div className="space-y-4">
                        {dayEvents.map((event, eventIndex) => <div key={event.id}>
                            <div className={`p-6 rounded-2xl border transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${getEventGradient(event.type)} w-full backdrop-blur-sm`}>
                              <div className="space-y-4">
                                {/* Header with time and category */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="text-2xl font-bold text-foreground">
                                      {event.time}
                                    </div>
                                    <Badge className={`px-3 py-1 text-xs font-medium rounded-full border ${getCategoryBadgeColor(event.type)}`}>
                                      {event.type}
                                    </Badge>
                                  </div>
                                  
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-background/50">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-background border shadow-lg rounded-xl z-50">
                                      {event.type === 'restaurant' && event.restaurantData && <DropdownMenuItem onClick={() => {
                              if (isMobile) {
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

                                 {/* Event name and description */}
                                 <div className="space-y-2">
                                   <h4 className="text-lg font-bold text-foreground leading-tight">
                                     {event.title}
                                   </h4>
                                   {event.description && <p className="text-sm text-muted-foreground leading-relaxed">
                                       {event.description}
                                     </p>}
                                 </div>

                                 {/* Location for other events */}
                                 {event.type === 'other' && event.location && (
                                   <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                     <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                                     <span className="break-words">{event.location}</span>
                                   </div>
                                 )}

                                 {/* Restaurant data */}
                                 {event.restaurantData && (
                                   <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                     <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                                     <span className="break-words">{event.restaurantData.address}</span>
                                   </div>
                                 )}

                                 {/* Attraction data */}
                                 {event.attractionData && (
                                   <div className="space-y-2">
                                     <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                       <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                                       <span className="break-words">{event.attractionData.address}</span>
                                     </div>
                                     {event.attractionData.category && (
                                       <Badge variant="outline" className="text-xs px-2 py-1 rounded-full">
                                         {event.attractionData.category}
                                       </Badge>
                                     )}
                                   </div>
                                 )}

                                 {/* Action buttons */}
                                 <div className="flex flex-wrap gap-2 pt-2">
                                   {/* Directions button */}
                                   {(event.location || event.restaurantData || event.attractionData) && (
                                     <Button 
                                       variant="outline" 
                                       size="sm" 
                                       onClick={() => {
                                         let query = '';
                                         if (event.attractionData) {
                                           const { latitude, longitude, address } = event.attractionData;
                                           query = latitude && longitude ? `${latitude},${longitude}` : encodeURIComponent(address || event.attractionData.name);
                                         } else if (event.restaurantData) {
                                           query = encodeURIComponent(event.restaurantData.address || event.title);
                                         } else if (event.location) {
                                           query = encodeURIComponent(event.location);
                                         }
                                         window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank');
                                       }} 
                                       className="h-9 px-4 rounded-full bg-background/80 hover:bg-background border-border/50 hover:border-border transition-all duration-200"
                                     >
                                       <Compass className="w-4 h-4 mr-2" />
                                       Directions
                                     </Button>
                                   )}

                                   {/* Website button */}
                                   {(event.restaurantData?.website || event.attractionData?.website) && (
                                     <Button 
                                       variant="outline" 
                                       size="sm" 
                                       onClick={() => window.open(event.restaurantData?.website || event.attractionData?.website, '_blank')} 
                                       className="h-9 px-4 rounded-full bg-background/80 hover:bg-background border-border/50 hover:border-border transition-all duration-200"
                                     >
                                       <ExternalLink className="w-4 h-4 mr-2" />
                                       Website
                                     </Button>
                                   )}

                                   {/* Phone button */}
                                   {(event.restaurantData?.phone || event.attractionData?.phone) && (
                                     <Button 
                                       variant="outline" 
                                       size="sm" 
                                       onClick={() => window.open(`tel:${event.restaurantData?.phone || event.attractionData?.phone}`, '_self')} 
                                       className="h-9 px-4 rounded-full bg-background/80 hover:bg-background border-border/50 hover:border-border transition-all duration-200"
                                     >
                                       <Phone className="w-4 h-4 mr-2" />
                                       Call
                                     </Button>
                                   )}
                                 </div>

                                 {/* Move event selector */}
                                 {changingEventId === event.id && onMoveEvent && (
                                   <div className="mt-4 p-4 bg-background/50 rounded-xl border border-border/50 backdrop-blur-sm">
                                     <p className="text-sm font-medium mb-3">Move to:</p>
                                     <Select onValueChange={(newDate) => {
                                       onMoveEvent(event.id, newDate);
                                       setChangingEventId(null);
                                     }}>
                                       <SelectTrigger className="w-full rounded-lg">
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
                                       className="mt-3 w-full rounded-lg"
                                     >
                                       Cancel
                                     </Button>
                                   </div>
                                 )}
                               </div>
                             </div>
                             {eventIndex < dayEvents.length - 1 && <div className="h-px bg-border/30 my-4" />}
                           </div>)}
                       </div> : <div className="text-center py-8 text-muted-foreground">
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