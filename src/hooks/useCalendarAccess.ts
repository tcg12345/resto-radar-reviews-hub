import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Google Calendar API types
declare global {
  interface Window {
    gapi: any;
  }
}

export interface CalendarEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  notes?: string;
  allDay?: boolean;
}

// Google Calendar API types
interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  description?: string;
}

export function useCalendarAccess() {
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const requestCalendarAccess = async (startDate?: Date): Promise<CalendarEvent[]> => {
    setIsLoading(true);
    
    try {
      if (!Capacitor.isNativePlatform()) {
        // For web, use Google Calendar API
        return await requestGoogleCalendarAccess(startDate);
      }

      try {
        console.log('🔍 Attempting to import @ebarooni/capacitor-calendar...');
        // Import the correct calendar plugin
        const { CapacitorCalendar } = await import('@ebarooni/capacitor-calendar');
        console.log('✅ Successfully imported CapacitorCalendar:', CapacitorCalendar);
        
        // Request full calendar access
        console.log('📅 Requesting calendar permission...');
        const permission = await CapacitorCalendar.requestFullCalendarAccess();
        console.log('🔐 Permission result:', permission);
        
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

  const requestGoogleCalendarAccess = async (startDate?: Date): Promise<CalendarEvent[]> => {
    try {
      // Get API credentials from Supabase secrets
      const { data: secrets, error } = await supabase.functions.invoke('get-google-calendar-credentials');
      
      if (error || !secrets?.apiKey || !secrets?.clientId) {
        toast.error('Google Calendar API credentials not configured');
        return [];
      }

      // Load Google APIs
      await new Promise((resolve, reject) => {
        if (typeof window.gapi !== 'undefined') {
          resolve(window.gapi);
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => resolve(window.gapi);
        script.onerror = reject;
        document.head.appendChild(script);
      });

      // Initialize Google API
      await new Promise<void>((resolve) => {
        window.gapi.load('client:auth2', resolve);
      });

      await window.gapi.client.init({
        apiKey: secrets.apiKey,
        clientId: secrets.clientId,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
        scope: 'https://www.googleapis.com/auth/calendar.readonly'
      });

      // Check if user is already signed in
      const authInstance = window.gapi.auth2.getAuthInstance();
      if (!authInstance.isSignedIn.get()) {
        const user = await authInstance.signIn();
        if (!user.isSignedIn()) {
          toast.error('Google Calendar sign-in cancelled');
          return [];
        }
      }

      // Calculate date range
      const searchStartDate = startDate || new Date();
      const searchEndDate = new Date(searchStartDate);
      searchEndDate.setDate(searchEndDate.getDate() + 30);

      // Fetch calendar events
      const response = await window.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: searchStartDate.toISOString(),
        timeMax: searchEndDate.toISOString(),
        showDeleted: false,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const googleEvents: GoogleCalendarEvent[] = response.result.items || [];
      
      const formattedEvents: CalendarEvent[] = googleEvents.map(event => {
        const startDateTime = event.start.dateTime || event.start.date;
        const endDateTime = event.end.dateTime || event.end.date;
        const isAllDay = !event.start.dateTime;

        return {
          id: event.id,
          title: event.summary || 'Untitled Event',
          startDate: new Date(startDateTime!),
          endDate: new Date(endDateTime!),
          location: event.location,
          notes: event.description,
          allDay: isAllDay
        };
      });

      setEvents(formattedEvents);
      toast.success(`Imported ${formattedEvents.length} events from Google Calendar!`);
      return formattedEvents;

    } catch (error) {
      console.error('Google Calendar API error:', error);
      toast.error('Failed to access Google Calendar. Please try again.');
      return [];
    }
  };

  const isCalendarAvailable = true; // Both native and web support

  return {
    requestCalendarAccess,
    isLoading,
    events,
    isCalendarAvailable
  };
}