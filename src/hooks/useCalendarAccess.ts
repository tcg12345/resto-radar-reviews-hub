import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

export interface CalendarEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  notes?: string;
  allDay?: boolean;
}

export function useCalendarAccess() {
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const requestCalendarAccess = async (startDate?: Date): Promise<CalendarEvent[]> => {
    setIsLoading(true);
    
    try {
      if (!Capacitor.isNativePlatform()) {
        // For web, show mock data for demonstration
        const mockEvents: CalendarEvent[] = [
          {
            id: '1',
            title: 'Flight to Paris',
            startDate: new Date(2024, 11, 15, 10, 0),
            endDate: new Date(2024, 11, 15, 15, 0),
            location: 'Airport',
            notes: 'Flight confirmation: AF123'
          },
          {
            id: '2',
            title: 'Hotel Check-in',
            startDate: new Date(2024, 11, 15, 16, 0),
            endDate: new Date(2024, 11, 15, 17, 0),
            location: 'Hotel de Paris, 123 Rue de Rivoli',
            notes: 'Booking reference: HTL456'
          },
          {
            id: '3',
            title: 'Dinner Reservation',
            startDate: new Date(2024, 11, 15, 19, 30),
            endDate: new Date(2024, 11, 15, 21, 30),
            location: 'Le Comptoir du Relais',
            notes: 'Table for 2, mention dietary restrictions'
          }
        ];
        
        setEvents(mockEvents);
        toast.info('Demo calendar events loaded (mobile app will show real calendar data)');
        return mockEvents;
      }

      try {
        // Import the correct calendar plugin
        const { CapacitorCalendar } = await import('@ebarooni/capacitor-calendar');
        
        // Request full calendar access
        const permission = await CapacitorCalendar.requestFullCalendarAccess();
        
        if (permission.result === 'granted') {
          // Get calendar events for the next 30 days
          const searchStartDate = startDate || new Date();
          const searchEndDate = new Date(searchStartDate);
          searchEndDate.setDate(searchEndDate.getDate() + 30);
          
          const result = await CapacitorCalendar.listEventsInRange({
            from: searchStartDate.getTime(),
            to: searchEndDate.getTime()
          });
          
          const formattedEvents: CalendarEvent[] = result.result.map(event => ({
            id: event.id,
            title: event.title || 'Untitled Event',
            startDate: new Date(event.startDate),
            endDate: new Date(event.endDate),
            location: event.location || undefined,
            notes: event.description || undefined,
            allDay: event.isAllDay
          }));
          
          setEvents(formattedEvents);
          toast.success(`Found ${formattedEvents.length} calendar events!`);
          return formattedEvents;
        } else {
          toast.error('Calendar permission denied');
          return [];
        }
      } catch (pluginError) {
        console.error('Calendar plugin error:', pluginError);
        toast.error('Calendar plugin not available. Install @capacitor-community/calendar for full functionality.');
        return [];
      }
    } catch (error) {
      console.error('Error requesting calendar access:', error);
      toast.error('Unable to access calendar');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const isCalendarAvailable = Capacitor.isNativePlatform();

  return {
    requestCalendarAccess,
    isLoading,
    events,
    isCalendarAvailable
  };
}