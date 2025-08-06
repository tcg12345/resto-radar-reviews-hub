import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Google Calendar API types
declare global {
  interface Window {
    gapi: any;
    google: any;
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
      console.log('Calendar access requested');
      console.log('Capacitor.isNativePlatform():', Capacitor.isNativePlatform());
      console.log('Platform info:', Capacitor.getPlatform());
      
      if (!Capacitor.isNativePlatform()) {
        console.log('Web platform detected, using Google Calendar API');
        // For web, use Google Calendar API
        return await requestGoogleCalendarAccess(startDate);
      }

      // For mobile, use native calendar access
      console.log('Mobile platform detected, attempting native calendar access...');
      
      try {
        const { CapacitorCalendar } = await import('@ebarooni/capacitor-calendar');
        console.log('Capacitor Calendar plugin loaded successfully');
        
        console.log('Requesting calendar permissions...');
        const permission = await CapacitorCalendar.requestFullCalendarAccess();
        console.log('Permission result:', permission);
        
        if (permission.result !== 'granted') {
          throw new Error(`Calendar permission denied: ${permission.result}`);
        }
        
        const searchStartDate = startDate || new Date();
        const searchEndDate = new Date(searchStartDate);
        searchEndDate.setDate(searchEndDate.getDate() + 30);
        
        console.log('Fetching calendar events from', searchStartDate, 'to', searchEndDate);
        
        const result = await CapacitorCalendar.listEventsInRange({
          from: searchStartDate.getTime(),
          to: searchEndDate.getTime()
        });
        
        console.log('Calendar events result:', result);
        
        if (!result.result || !Array.isArray(result.result)) {
          throw new Error('Invalid calendar events result structure');
        }
        
        const formattedEvents: CalendarEvent[] = result.result.map(event => ({
          id: event.id,
          title: event.title || 'Untitled Event',
          startDate: new Date(event.startDate),
          endDate: new Date(event.endDate),
          location: event.location || undefined,
          notes: event.description || undefined,
          allDay: event.isAllDay
        }));
        
        console.log(`Successfully formatted ${formattedEvents.length} calendar events`);
        setEvents(formattedEvents);
        toast.success(`Found ${formattedEvents.length} calendar events from device!`);
        return formattedEvents;
        
      } catch (pluginError) {
        console.error('Native calendar error details:', pluginError);
        console.error('Error type:', typeof pluginError);
        console.error('Error message:', pluginError.message);
        console.error('Error stack:', pluginError.stack);
        
        // Re-throw the error instead of falling back to demo events
        throw new Error(`Native calendar access failed: ${pluginError.message}`);
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
      
      if (error) {
        throw new Error(`Failed to get credentials: ${JSON.stringify(error)}`);
      }
      
      if (!secrets?.apiKey || !secrets?.clientId) {
        throw new Error('Google Calendar API credentials not configured in Supabase secrets');
      }

      console.log('Loading Google APIs...');

      // Load both Google APIs and Google Identity Services
      await Promise.all([
        // Load Google API
        new Promise<void>((resolve, reject) => {
          if (typeof window.gapi !== 'undefined') {
            resolve();
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://apis.google.com/js/api.js';
          script.onload = () => {
            console.log('Google API script loaded');
            resolve();
          };
          script.onerror = (err) => {
            console.error('Failed to load Google API script:', err);
            reject(new Error('Failed to load Google APIs script'));
          };
          document.head.appendChild(script);
        }),
        // Load Google Identity Services
        new Promise<void>((resolve, reject) => {
          if (typeof window.google !== 'undefined') {
            resolve();
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.onload = () => {
            console.log('Google Identity Services script loaded');
            resolve();
          };
          script.onerror = (err) => {
            console.error('Failed to load Google Identity Services script:', err);
            reject(new Error('Failed to load Google Identity Services script'));
          };
          document.head.appendChild(script);
        })
      ]);

      console.log('Initializing Google API client...');
      
      // Initialize GAPI client
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Google API initialization timeout'));
        }, 15000);

        window.gapi.load('client', {
          callback: () => {
            clearTimeout(timeout);
            console.log('Google API client loaded');
            resolve();
          },
          onerror: (err: any) => {
            clearTimeout(timeout);
            console.error('Google API load error:', err);
            reject(new Error(`Google API load failed: ${JSON.stringify(err)}`));
          }
        });
      });

      console.log('Initializing client with credentials...');
      
      // Initialize the GAPI client
      await window.gapi.client.init({
        apiKey: secrets.apiKey,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
      });

      console.log('Client initialized, requesting access token...');

      // Use Google Identity Services for OAuth2
      const tokenResponse = await new Promise<any>((resolve, reject) => {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: secrets.clientId,
          scope: 'https://www.googleapis.com/auth/calendar.readonly',
          callback: (response: any) => {
            if (response.error) {
              reject(new Error(`OAuth error: ${response.error}`));
            } else {
              resolve(response);
            }
          },
        });
        
        client.requestAccessToken();
      });

      console.log('Access token received, setting authorization...');
      
      // Set the access token for API calls
      window.gapi.client.setToken({
        access_token: tokenResponse.access_token
      });

      // Calculate date range
      const searchStartDate = startDate || new Date();
      const searchEndDate = new Date(searchStartDate);
      searchEndDate.setDate(searchEndDate.getDate() + 30);

      console.log('Fetching calendar events...');

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
      
      console.log(`Found ${googleEvents.length} events from Google Calendar`);

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

    } catch (error: any) {
      console.error('Google Calendar API error details:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Unknown error occurred';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.details) {
        errorMessage = `API Error: ${error.details}`;
      } else if (error.error) {
        errorMessage = `Auth Error: ${JSON.stringify(error.error)}`;
      }
      
      // Check for common domain authorization errors
      if (errorMessage.includes('origin') || errorMessage.includes('domain') || errorMessage.includes('redirect_uri')) {
        errorMessage = `Domain authorization error: ${errorMessage}. Add https://9ea7ee37-51d7-4c73-9996-151c583fbc61.lovableproject.com to your Google Cloud Console OAuth settings.`;
      }
      
      throw new Error(errorMessage);
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