import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Calendar, CalendarIcon, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useCalendarAccess, CalendarEvent } from '@/hooks/useCalendarAccess';

interface CalendarImportProps {
  onEventsImported: (events: CalendarEvent[]) => void;
  selectedDate?: Date;
}

export function CalendarImport({ onEventsImported, selectedDate }: CalendarImportProps) {
  const { requestCalendarAccess, isLoading, events, isCalendarAvailable } = useCalendarAccess();
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());

  const handleRequestAccess = async () => {
    const calendarEvents = await requestCalendarAccess(selectedDate);
    // Events are automatically set in the hook
  };

  const toggleEventSelection = (eventId: string) => {
    const newSelection = new Set(selectedEvents);
    if (newSelection.has(eventId)) {
      newSelection.delete(eventId);
    } else {
      newSelection.add(eventId);
    }
    setSelectedEvents(newSelection);
  };

  const importSelectedEvents = () => {
    const eventsToImport = events.filter(event => selectedEvents.has(event.id));
    onEventsImported(eventsToImport);
    toast.success(`Imported ${eventsToImport.length} events to itinerary!`);
    setSelectedEvents(new Set());
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Import from Calendar
          </CardTitle>
          <CardDescription>
            {isCalendarAvailable
              ? "Import events from your device calendar to quickly build your itinerary"
              : "Calendar import is available on mobile devices. Use the mobile app for full calendar access."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleRequestAccess}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Loading Calendar...' : 'Access Calendar'}
          </Button>
          
          {!isCalendarAvailable && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Note: This will show demo events. Real calendar access requires the mobile app.
            </p>
          )}
        </CardContent>
      </Card>

      {events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Events to Import</CardTitle>
            <CardDescription>
              Choose which calendar events you'd like to add to your itinerary
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedEvents.has(event.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => toggleEventSelection(event.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{event.title}</h4>
                    {event.location && (
                      <p className="text-sm text-muted-foreground mt-1">
                        📍 {event.location}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {event.allDay ? (
                          `All day • ${format(event.startDate, 'MMM d, yyyy')}`
                        ) : (
                          `${format(event.startDate, 'MMM d, h:mm a')} - ${format(event.endDate, 'h:mm a')}`
                        )}
                      </span>
                    </div>
                    {event.notes && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {event.notes}
                      </p>
                    )}
                  </div>
                  {selectedEvents.has(event.id) && (
                    <Badge variant="default" className="ml-2">
                      Selected
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            
            {selectedEvents.size > 0 && (
              <Button
                onClick={importSelectedEvents}
                className="w-full mt-4"
              >
                Import {selectedEvents.size} Selected Event{selectedEvents.size !== 1 ? 's' : ''}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}