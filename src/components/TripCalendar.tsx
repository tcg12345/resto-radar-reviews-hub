import { format, eachDayOfInterval, isSameDay } from 'date-fns';
import { Plus, MapPin, Clock, Utensils, Activity, Plane, MoreVertical, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ItineraryEvent } from '@/components/ItineraryBuilder';

interface TripCalendarProps {
  startDate: Date;
  endDate: Date;
  events: ItineraryEvent[];
  onAddEvent: (date: string) => void;
  onEditEvent: (event: ItineraryEvent) => void;
  onDeleteEvent: (eventId: string) => void;
}

export function TripCalendar({ startDate, endDate, events, onAddEvent, onEditEvent, onDeleteEvent }: TripCalendarProps) {
  const days = eachDayOfInterval({ start: startDate, end: endDate });

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
      case 'activity':
        return <Activity className="w-4 h-4" />;
      case 'flight':
        return <Plane className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'restaurant':
        return 'bg-orange-100 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-300';
      case 'activity':
        return 'bg-blue-100 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300';
      case 'flight':
        return 'bg-purple-100 border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300';
      default:
        return 'bg-gray-100 border-gray-200 text-gray-800 dark:bg-gray-900/20 dark:border-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="grid gap-4">
      {days.map((day, index) => {
        const dayEvents = getEventsForDate(day);
        const dateStr = format(day, 'yyyy-MM-dd');
        
        return (
          <Card key={day.toISOString()} className="transition-all duration-200 hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    Day {index + 1} - {format(day, 'EEEE, MMMM do')}
                  </CardTitle>
                  <CardDescription>
                    {dayEvents.length > 0 
                      ? `${dayEvents.length} ${dayEvents.length === 1 ? 'event' : 'events'} planned`
                      : 'No events planned'
                    }
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
                                <div className="flex items-center gap-1 text-sm opacity-90">
                                  <MapPin className="w-3 h-3" />
                                  <span className="break-words">{event.restaurantData.address}</span>
                                </div>
                              )}
                              {event.flightData && (
                                <div className="space-y-1 text-sm opacity-90">
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    <span>{event.flightData.departure.airport} → {event.flightData.arrival.airport}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>Departs: {event.flightData.departure.time} | Arrives: {event.flightData.arrival.time}</span>
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