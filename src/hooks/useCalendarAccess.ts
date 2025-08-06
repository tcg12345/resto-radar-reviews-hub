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

      // For mobile, try native calendar access first, then fallback to Google Calendar
      try {
        const { CapacitorCalendar } = await import('@ebarooni/capacitor-calendar');
        
        const permission = await CapacitorCalendar.requestFullCalendarAccess();
        
        if (permission.result === 'granted') {
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
          // If native calendar permission denied, try Google Calendar as fallback
          toast.info('Native calendar access denied. Trying Google Calendar...');
          return await requestGoogleCalendarAccess(startDate);
        }
      } catch (pluginError) {
        // If native calendar plugin fails, try Google Calendar as fallback
        toast.info('Native calendar not available. Trying Google Calendar...');
        return await requestGoogleCalendarAccess(startDate);
      }
    } catch (error) {
      console.error('Calendar access error:', error);
      toast.error('Unable to access calendar: ' + error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const showDemoEvents = async (startDate?: Date): Promise<CalendarEvent[]> => {
    const baseDate = startDate || new Date();
    const demoEvents: CalendarEvent[] = [
      {
        id: 'demo-1',
        title: 'Business Meeting',
        startDate: new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        location: 'Downtown Office',
        notes: 'Quarterly review meeting'
      },
      {
        id: 'demo-2',
        title: 'Lunch with Friends',
        startDate: new Date(baseDate.getTime() + 5 * 24 * 60 * 60 * 1000),
        endDate: new Date(baseDate.getTime() + 5 * 24 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000),
        location: 'Italian Restaurant',
        notes: 'Catch up over pasta'
      },
      {
        id: 'demo-3',
        title: 'Weekend Trip',
        startDate: new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(baseDate.getTime() + 9 * 24 * 60 * 60 * 1000),
        location: 'Beach Resort',
        allDay: true,
        notes: 'Relaxing weekend getaway'
      }
    ];

    setEvents(demoEvents);
    toast.info('Demo calendar events loaded - configure Google Calendar API or install Capacitor calendar plugin for real events');
    return demoEvents;
  };

  const requestGoogleCalendarAccess = async (startDate?: Date): Promise<CalendarEvent[]> => {
    try {
      // Get API credentials from Supabase secrets
      const { data: secrets, error } = await supabase.functions.invoke('get-google-calendar-credentials');
      
      if (error || !secrets?.apiKey || !secrets?.clientId) {
        throw new Error('Google Calendar API credentials not configured in Supabase secrets');
      }

      // Load Google APIs with better error handling
      try {
        await new Promise((resolve, reject) => {
          if (typeof window.gapi !== 'undefined') {
            resolve(window.gapi);
            return;
          }

          const script = document.createElement('script');
          script.src = 'https://apis.google.com/js/api.js';
          script.onload = () => resolve(window.gapi);
          script.onerror = () => reject(new Error('Failed to load Google APIs'));
          document.head.appendChild(script);
        });

        // Initialize Google API with timeout
        await Promise.race([
          new Promise<void>((resolve) => {
            window.gapi.load('client:auth2', resolve);
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Google API load timeout')), 10000)
          )
        ]);

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
            throw new Error('Google Calendar sign-in was cancelled by user');
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

      } catch (apiError) {
        console.error('Google Calendar API error:', apiError);
        throw new Error(`Google Calendar API failed: ${apiError}. Make sure your domain is authorized in Google Cloud Console.`);
      }

    } catch (error) {
      console.error('Calendar access error:', error);
      throw new Error(`Calendar access failed: ${error}`);
    }
  };

  const isCalendarAvailable = true; // Always show as available with fallback to demo

  return {
    requestCalendarAccess,
    isLoading,
    events,
    isCalendarAvailable
  };
}