import { useState, useEffect } from 'react';
import { addDays, format, startOfDay, differenceInDays, eachDayOfInterval } from 'date-fns';
import { Calendar, Plus, Download, Share2, Save, CalendarDays, MapPin, X, CalendarIcon, BookOpen, GripVertical, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DateRangePicker } from '@/components/DateRangePicker';
import { TripCalendar } from '@/components/TripCalendar';
import { EventDialog } from '@/components/EventDialog';
import { ShareItineraryDialog } from '@/components/ShareItineraryDialog';
import { ExportItineraryDialog } from '@/components/ExportItineraryDialog';
import { SaveItineraryDialog } from '@/components/SaveItineraryDialog';
import { SavedItinerariesSection } from '@/components/SavedItinerariesSection';
import { AmadeusCitySearch } from '@/components/AmadeusCitySearch';
import { HotelFlightSection } from '@/components/HotelFlightSection';
import { Hotel as HotelType } from '@/hooks/useGooglePlacesHotelSearch';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
interface LocationSuggestion {
  id: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface ItineraryEvent {
  id: string;
  title: string;
  description?: string;
  time: string;
  date: string;
  type: 'restaurant' | 'hotel' | 'attraction' | 'museum' | 'park' | 'monument' | 'shopping' | 'entertainment' | 'other';
  restaurantData?: {
    name: string;
    address: string;
    placeId?: string;
    phone?: string;
    website?: string;
  };
  attractionData?: {
    id: string;
    name: string;
    address: string;
    category?: string;
    placeType?: 'hotel' | 'restaurant' | 'attraction' | 'museum' | 'park' | 'monument' | 'shopping' | 'entertainment' | 'other';
    rating?: number;
    website?: string;
    phone?: string;
    latitude?: number;
    longitude?: number;
  };
}

export interface TripLocation {
  id: string;
  name: string;
  iataCode?: string;
  country: string;
  state?: string;
  startDate?: Date;
  endDate?: Date;
}

interface HotelBooking {
  id: string;
  hotel: HotelType;
  checkIn?: Date;
  checkOut?: Date;
  location?: string;
}

interface FlightBooking {
  id: string;
  flightNumber: string;
  airline: string;
  departure: {
    airport: string;
    time: string;
    date: string;
  };
  arrival: {
    airport: string;
    time: string;
    date: string;
  };
  price?: string;
  bookingUrl?: string;
}

export interface Itinerary {
  id?: string;
  title: string;
  startDate: Date;
  endDate: Date;
  locations: TripLocation[];
  isMultiCity: boolean;
  events: ItineraryEvent[];
  hotels: HotelBooking[];
  flights: FlightBooking[];
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  wasCreatedWithLengthOfStay?: boolean;
}

export function ItineraryBuilder({ onLoadItinerary }: { onLoadItinerary?: (itinerary: Itinerary) => void }) {
  const { user } = useAuth();
  
  // Load state from localStorage on mount
  const loadPersistedState = () => {
    try {
      const savedState = localStorage.getItem('currentItineraryBuilder');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        return {
          dateRange: {
            start: parsed.dateRange.start ? new Date(parsed.dateRange.start) : null,
            end: parsed.dateRange.end ? new Date(parsed.dateRange.end) : null,
          },
          currentItinerary: parsed.currentItinerary ? {
            ...parsed.currentItinerary,
            startDate: new Date(parsed.currentItinerary.startDate),
            endDate: new Date(parsed.currentItinerary.endDate),
            locations: parsed.currentItinerary.locations.map((loc: any) => ({
              ...loc,
              startDate: loc.startDate ? new Date(loc.startDate) : undefined,
              endDate: loc.endDate ? new Date(loc.endDate) : undefined,
            })),
          } : null,
          events: parsed.events || [],
          hotels: parsed.hotels || [],
          flights: parsed.flights || [],
          locations: parsed.locations.map((loc: any) => ({
            ...loc,
            startDate: loc.startDate ? new Date(loc.startDate) : undefined,
            endDate: loc.endDate ? new Date(loc.endDate) : undefined,
          })),
          isMultiCity: parsed.isMultiCity || false,
          hasCreatedItinerary: parsed.hasCreatedItinerary || false,
          // Add length of stay state persistence
          useLengthOfStay: parsed.useLengthOfStay || false,
          locationLengthOfStay: parsed.locationLengthOfStay || {},
          locationNights: parsed.locationNights || {},
          numberOfNights: parsed.numberOfNights || 1,
          // Add permanent flag to remember if trip was created with length of stay
          wasCreatedWithLengthOfStay: parsed.wasCreatedWithLengthOfStay || false,
        };
      }
    } catch (error) {
      console.error('Error loading persisted state:', error);
    }
    return null;
  };

  const persistedState = loadPersistedState();
  
  console.log('Loading persisted state:', persistedState);
  
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>(
    persistedState?.dateRange || { start: null, end: null }
  );
  const [currentItinerary, setCurrentItinerary] = useState<Itinerary | null>(
    persistedState?.currentItinerary || null
  );
  const [events, setEvents] = useState<ItineraryEvent[]>(persistedState?.events || []);
  const [hotels, setHotels] = useState<HotelBooking[]>(persistedState?.hotels || []);
  const [flights, setFlights] = useState<FlightBooking[]>(persistedState?.flights || []);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<ItineraryEvent | null>(null);
  const [locations, setLocations] = useState<TripLocation[]>(persistedState?.locations || []);
  const [isMultiCity, setIsMultiCity] = useState(persistedState?.isMultiCity || false);
  const [currentLocationSearch, setCurrentLocationSearch] = useState('');
  const [hasCreatedItinerary, setHasCreatedItinerary] = useState(persistedState?.hasCreatedItinerary || false);
  const [useLengthOfStay, setUseLengthOfStay] = useState(persistedState?.useLengthOfStay || false);
  const [numberOfNights, setNumberOfNights] = useState<number>(persistedState?.numberOfNights || 1);
  const [locationLengthOfStay, setLocationLengthOfStay] = useState<Record<string, boolean>>(persistedState?.locationLengthOfStay || {});
  const [locationNights, setLocationNights] = useState<Record<string, number>>(persistedState?.locationNights || {});
  const [wasCreatedWithLengthOfStay, setWasCreatedWithLengthOfStay] = useState(persistedState?.wasCreatedWithLengthOfStay || false);
  const [draggedCityId, setDraggedCityId] = useState<string | null>(null);
  
  // Pending changes state for trip extension
  const [pendingNights, setPendingNights] = useState<number>(numberOfNights);
  const [pendingLocationNights, setPendingLocationNights] = useState<Record<string, number>>(locationNights);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [isExtensionOpen, setIsExtensionOpen] = useState(false);
  const [pendingEndDate, setPendingEndDate] = useState<Date | null>(dateRange.end);
  const [pendingStartDate, setPendingStartDate] = useState<Date | null>(dateRange.start);

  // Persist state to localStorage whenever key state changes (excluding large data objects to prevent quota exceeded)
  useEffect(() => {
    const stateToSave = {
      dateRange,
      currentItinerary,
      // Store only essential event data, excluding large nested objects
      events: events.map(event => ({
        ...event,
        // Keep only essential restaurant data
        restaurantData: event.restaurantData ? {
          name: event.restaurantData.name,
          address: event.restaurantData.address,
          phone: event.restaurantData.phone,
          website: event.restaurantData.website,
        } : undefined,
        // Keep only essential attraction data
        attractionData: event.attractionData ? {
          name: event.attractionData.name,
          address: event.attractionData.address,
          phone: event.attractionData.phone,
          website: event.attractionData.website,
          category: event.attractionData.category,
          latitude: event.attractionData.latitude,
          longitude: event.attractionData.longitude,
        } : undefined,
      })),
      hotels,
      flights,
      locations,
      isMultiCity,
      hasCreatedItinerary,
      // Add length of stay state to persistence
      useLengthOfStay,
      numberOfNights,
      locationLengthOfStay,
      locationNights,
      wasCreatedWithLengthOfStay,
    };
    
    try {
      localStorage.setItem('currentItineraryBuilder', JSON.stringify(stateToSave));
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('LocalStorage quota exceeded, clearing old data and retrying with minimal data');
        // Clear old data and try with even more minimal data
        localStorage.removeItem('currentItineraryBuilder');
        const minimalState = {
          dateRange,
          currentItinerary: currentItinerary ? {
            title: currentItinerary.title,
            startDate: currentItinerary.startDate,
            endDate: currentItinerary.endDate,
            locations: currentItinerary.locations,
            isMultiCity: currentItinerary.isMultiCity,
          } : null,
          hasCreatedItinerary,
          useLengthOfStay,
        };
        try {
          localStorage.setItem('currentItineraryBuilder', JSON.stringify(minimalState));
        } catch (secondError) {
          console.error('Unable to save to localStorage even with minimal data:', secondError);
        }
      } else {
        console.error('Error saving to localStorage:', error);
      }
    }
  }, [dateRange, currentItinerary, events, hotels, flights, locations, isMultiCity, hasCreatedItinerary, useLengthOfStay, numberOfNights, locationLengthOfStay, locationNights, wasCreatedWithLengthOfStay]);

  // Sync pending changes with actual state initially
  useEffect(() => {
    setPendingNights(numberOfNights);
    setPendingLocationNights(locationNights);
    setPendingEndDate(dateRange.end);
    setPendingStartDate(dateRange.start);
    setHasPendingChanges(false);
  }, [numberOfNights, locationNights, dateRange.end, dateRange.start]);

  const applyPendingChanges = () => {
    // Apply date-based trip extension
    if (!useLengthOfStay && !currentItinerary?.isMultiCity && (pendingEndDate || pendingStartDate) && dateRange.start && dateRange.end) {
      const newStartDate = pendingStartDate || dateRange.start;
      const newEndDate = pendingEndDate || dateRange.end;
      
      setDateRange({ start: newStartDate, end: newEndDate });
      
      if (currentItinerary) {
        setCurrentItinerary(prev => prev ? { 
          ...prev, 
          startDate: newStartDate, 
          endDate: newEndDate 
        } : null);
      }
    }

    // Apply single city changes
    if (useLengthOfStay && !currentItinerary?.isMultiCity) {
      setNumberOfNights(pendingNights);
      
      // Update dates
      if (dateRange.start) {
        const newEndDate = addDays(dateRange.start, pendingNights);
        setDateRange(prev => ({ ...prev, end: newEndDate }));
        
        // Update current itinerary
        if (currentItinerary) {
          setCurrentItinerary(prev => prev ? { ...prev, endDate: newEndDate } : null);
        }
      }
    }

    // Apply multi-city changes
    if (currentItinerary?.isMultiCity) {
      setLocationNights(pendingLocationNights);
      
      // Calculate sequential dates for multi-city trips
      if (currentItinerary?.locations) {
        let currentDate = startOfDay(new Date());
        
        // Calculate sequential dates for all locations
        const updatedLocations = currentItinerary.locations.map(loc => {
          if (locationLengthOfStay[loc.id] && pendingLocationNights[loc.id]) {
            const nights = pendingLocationNights[loc.id];
            const startDate = new Date(currentDate);
            const endDate = addDays(startDate, nights);
            
            // Update location dates
            updateLocationDates(loc.id, startDate, endDate);
            
            // Move to next city's start date
            currentDate = new Date(endDate);
            
            return { ...loc, startDate, endDate };
          }
          return loc;
        });
        
        // Calculate overall trip dates
        const allStartDates = updatedLocations.map(loc => loc.startDate!).filter(Boolean);
        const allEndDates = updatedLocations.map(loc => loc.endDate!).filter(Boolean);
        
        if (allStartDates.length > 0 && allEndDates.length > 0) {
          const overallStart = new Date(Math.min(...allStartDates.map(d => d.getTime())));
          const overallEnd = new Date(Math.max(...allEndDates.map(d => d.getTime())));
          
          setCurrentItinerary(prev => prev ? {
            ...prev,
            locations: updatedLocations,
            startDate: overallStart,
            endDate: overallEnd
          } : null);
          
          setDateRange({ start: overallStart, end: overallEnd });
        }
      }
    }

    setHasPendingChanges(false);
    toast.success('Changes applied successfully');
  };

  const tripDays = dateRange.start && dateRange.end
    ? differenceInDays(dateRange.end, dateRange.start) + 1 
    : 0;

  const handleDateRangeChange = (start: Date | null, end: Date | null) => {
    setDateRange({ start, end });
    if (start && end && currentItinerary && !isMultiCity) {
      // Clear events that are outside the new date range for single city
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');
      setEvents(prev => prev.filter(event => event.date >= startStr && event.date <= endStr));
    }
  };

  const createMultiCityItinerary = () => {
    // Ensure all locations have dates (either explicit or calculated from nights)
    const locationsWithDates = locations.map(loc => {
      if (locationLengthOfStay[loc.id] && locationNights[loc.id]) {
        // Use already calculated dates from the slider onChange
        return loc;
      }
      return loc;
    });
    
    if (!locationsWithDates.every(loc => loc.startDate && loc.endDate)) return;
    
    // Calculate overall trip dates from all locations
    const allStartDates = locationsWithDates.map(loc => loc.startDate!);
    const allEndDates = locationsWithDates.map(loc => loc.endDate!);
    const overallStart = new Date(Math.min(...allStartDates.map(d => d.getTime())));
    const overallEnd = new Date(Math.max(...allEndDates.map(d => d.getTime())));
    
    const locationNames = locationsWithDates.map(loc => loc.name).join(' → ');
    const title = `Multi-City: ${locationNames}`;
    
    const newItinerary: Itinerary = {
      title,
      startDate: overallStart,
      endDate: overallEnd,
      locations: locationsWithDates,
      isMultiCity: true,
      events: [],
      hotels: [],
      flights: [],
      userId: user?.id,
    };
    setCurrentItinerary(newItinerary);
    setDateRange({ start: overallStart, end: overallEnd });
    
    // Check if any location was created with length of stay
    const hasLengthOfStayLocations = Object.keys(locationLengthOfStay).some(id => locationLengthOfStay[id]);
    if (hasLengthOfStayLocations) {
      setWasCreatedWithLengthOfStay(true);
      console.log('Created multi-city with length of stay:', { locationLengthOfStay, wasCreatedWithLengthOfStay: true });
    }
  };

  const reorderCities = (draggedId: string, droppedOnId: string) => {
    if (draggedId === droppedOnId) return;
    
    console.log('Reordering cities:', { draggedId, droppedOnId });
    
    if (currentItinerary) {
      const currentLocations = [...currentItinerary.locations];
      const draggedIndex = currentLocations.findIndex(loc => loc.id === draggedId);
      const droppedIndex = currentLocations.findIndex(loc => loc.id === droppedOnId);
      
      if (draggedIndex === -1 || droppedIndex === -1) return;
      
      // Remove dragged item and insert at new position
      const [draggedItem] = currentLocations.splice(draggedIndex, 1);
      currentLocations.splice(droppedIndex, 0, draggedItem);
      
      // Update locations state
      setLocations(currentLocations);
      
      // Recalculate sequential dates for all cities
      let currentDate = startOfDay(new Date());
      const updatedLocations = currentLocations.map(loc => {
        if (locationLengthOfStay[loc.id] && locationNights[loc.id]) {
          const nights = locationNights[loc.id];
          const startDate = new Date(currentDate);
          const endDate = addDays(startDate, nights);
          
          console.log(`Reordered ${loc.name}: ${nights} nights, ${startDate.toDateString()} to ${endDate.toDateString()}`);
          
          // Update location dates
          updateLocationDates(loc.id, startDate, endDate);
          
          // Move to next city's start date
          currentDate = new Date(endDate);
          
          return { ...loc, startDate, endDate };
        }
        return loc;
      });
      
      // Calculate overall trip dates
      const allStartDates = updatedLocations.map(loc => loc.startDate!).filter(Boolean);
      const allEndDates = updatedLocations.map(loc => loc.endDate!).filter(Boolean);
      
      if (allStartDates.length > 0 && allEndDates.length > 0) {
        const overallStart = new Date(Math.min(...allStartDates.map(d => d.getTime())));
        const overallEnd = new Date(Math.max(...allEndDates.map(d => d.getTime())));
        
        console.log('New overall trip dates after reorder:', { start: overallStart.toDateString(), end: overallEnd.toDateString() });
        
        setCurrentItinerary(prev => prev ? {
          ...prev,
          locations: updatedLocations,
          startDate: overallStart,
          endDate: overallEnd
        } : null);
        
        setDateRange({ start: overallStart, end: overallEnd });
      }
    }
  };

  const handleLocationSelect = (location: LocationSuggestion) => {
    const secondaryText = location.secondaryText || '';
    const newLocation: TripLocation = {
      id: location.id,
      name: location.mainText,
      country: secondaryText.split(',').pop()?.trim() || '',
      state: secondaryText.split(',')[0]?.trim(),
    };

    if (!isMultiCity) {
      setLocations([newLocation]);
    } else {
      setLocations(prev => [...prev, newLocation]);
    }
    setCurrentLocationSearch('');
  };

  const removeLocation = (locationId: string) => {
    setLocations(prev => prev.filter(loc => loc.id !== locationId));
  };

  const updateLocationDates = (locationId: string, startDate: Date | null, endDate: Date | null) => {
    console.log('updateLocationDates called:', { locationId, startDate, endDate });
    
    setLocations(prev => {
      const updated = prev.map(loc => 
        loc.id === locationId 
          ? { ...loc, startDate: startDate || undefined, endDate: endDate || undefined }
          : loc
      );
      console.log('Updated locations:', updated);
      return updated;
    });

    // Also update the currentItinerary locations if it exists
    if (currentItinerary) {
      setCurrentItinerary(prev => {
        if (!prev) return null;
        const updatedItinerary = {
          ...prev,
          locations: prev.locations.map(loc => 
            loc.id === locationId 
              ? { ...loc, startDate: startDate || undefined, endDate: endDate || undefined }
              : loc
          )
        };
        console.log('Updated currentItinerary:', updatedItinerary);
        return updatedItinerary;
      });
    }
  };

  // Removed auto-creation - now requires manual button click

  const canCreateItinerary = isMultiCity 
    ? locations.length > 0 && locations.every(loc => 
        // Either has specific dates OR has length of stay configured
        (loc.startDate && loc.endDate) || (locationLengthOfStay[loc.id] && locationNights[loc.id] > 0)
      )
    : useLengthOfStay ? locations.length > 0 && numberOfNights > 0 : dateRange.start && dateRange.end && locations.length > 0;

  const handleAddEvent = (date: string) => {
    setSelectedDate(date);
    setEditingEvent(null);
    setIsEventDialogOpen(true);
  };

  const handleEditEvent = (event: ItineraryEvent) => {
    setEditingEvent(event);
    setSelectedDate(event.date);
    setIsEventDialogOpen(true);
  };

  const handleSaveEvent = (eventData: Omit<ItineraryEvent, 'id'>, selectedDates?: string[]) => {
    if (editingEvent) {
      // Update existing event
      setEvents(prev => prev.map(event => 
        event.id === editingEvent.id 
          ? { ...eventData, id: editingEvent.id }
          : event
      ));
      toast.success('Event updated successfully');
    } else {
      // Add new event(s)
      if (selectedDates && selectedDates.length > 1) {
        // Create multiple events for multiple dates
        const newEvents: ItineraryEvent[] = selectedDates.map(date => ({
          ...eventData,
          id: crypto.randomUUID(),
          date,
        }));
        setEvents(prev => [...prev, ...newEvents]);
        toast.success(`Event added to ${selectedDates.length} days successfully`);
      } else {
        // Single event
        const newEvent: ItineraryEvent = {
          ...eventData,
          id: crypto.randomUUID(),
        };
        setEvents(prev => [...prev, newEvent]);
        toast.success('Event added successfully');
      }
    }
    setIsEventDialogOpen(false);
    setEditingEvent(null);
    setSelectedDate(null);
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents(prev => prev.filter(event => event.id !== eventId));
    toast.success('Event deleted successfully');
  };

  const handleSaveItinerary = async (title: string) => {
    if (!user || !currentItinerary) return;

    try {
      // For now, just show success message - database integration will be added once types are updated
      toast.success('Itinerary saved successfully (local storage)');
      
      // Store in local storage as fallback
      const savedItineraries = JSON.parse(localStorage.getItem('savedItineraries') || '[]');
      const itineraryToSave = {
        ...currentItinerary,
        title,
        id: currentItinerary.id || crypto.randomUUID(),
        events,
        hotels,
        flights,
        userId: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        wasCreatedWithLengthOfStay,
      };
      
      const existingIndex = savedItineraries.findIndex((it: any) => it.id === itineraryToSave.id);
      if (existingIndex >= 0) {
        savedItineraries[existingIndex] = itineraryToSave;
      } else {
        savedItineraries.push(itineraryToSave);
      }
      
      localStorage.setItem('savedItineraries', JSON.stringify(savedItineraries));
      setCurrentItinerary(itineraryToSave);
      
    } catch (error) {
      console.error('Error saving itinerary:', error);
      toast.error('Failed to save itinerary');
    }
  };

  // Update current itinerary when events, hotels, or flights change
  useEffect(() => {
    if (currentItinerary) {
      setCurrentItinerary(prev => prev ? { ...prev, events, hotels, flights } : null);
    }
  }, [events, hotels, flights]);

  const handleAddHotel = (hotel: HotelType, location?: string, checkIn?: Date, checkOut?: Date) => {
    const newBooking: HotelBooking = {
      id: crypto.randomUUID(),
      hotel,
      checkIn,
      checkOut,
      location
    };
    setHotels(prev => [...prev, newBooking]);
  };

  const handleAddFlight = (flight: any) => {
    const newFlight: FlightBooking = {
      id: crypto.randomUUID(),
      ...flight
    };
    setFlights(prev => [...prev, newFlight]);
  };

  const handleRemoveHotel = (hotelId: string) => {
    setHotels(prev => prev.filter(hotel => hotel.id !== hotelId));
  };

  const handleRemoveFlight = (flightId: string) => {
    setFlights(prev => prev.filter(flight => flight.id !== flightId));
  };

  const handleLoadItinerary = (itinerary: Itinerary) => {
    // Load the selected itinerary into the builder
    setCurrentItinerary(itinerary);
    setDateRange({ start: itinerary.startDate, end: itinerary.endDate });
    setEvents(itinerary.events);
    setHotels(itinerary.hotels);
    setFlights(itinerary.flights);
    setLocations(itinerary.locations);
    setIsMultiCity(itinerary.isMultiCity);
    setHasCreatedItinerary(true);
    
    // Update localStorage
    const stateToSave = {
      dateRange: { start: itinerary.startDate, end: itinerary.endDate },
      currentItinerary: itinerary,
      events: itinerary.events,
      hotels: itinerary.hotels,
      flights: itinerary.flights,
      locations: itinerary.locations,
      isMultiCity: itinerary.isMultiCity,
      hasCreatedItinerary: true,
    };
    localStorage.setItem('currentItineraryBuilder', JSON.stringify(stateToSave));
    
    toast.success('Itinerary loaded successfully');
    
    // If passed from parent, also call that handler
    if (onLoadItinerary) {
      onLoadItinerary(itinerary);
    }
  };

  if (!hasCreatedItinerary) {
    console.log('Rendering creation screen - hasCreatedItinerary:', hasCreatedItinerary);
    return (
      <div className="w-full px-4 lg:px-6 space-y-6">
        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create New
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Saved Itineraries
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="create" className="mt-6">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <CalendarDays className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Start Planning Your Trip</CardTitle>
                <CardDescription>
                  Select your destination(s) and travel dates to begin creating your itinerary
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Multi-city toggle */}
                <div className="flex items-center justify-center space-x-2">
                  <Switch
                    id="multi-city"
                    checked={isMultiCity}
                    onCheckedChange={setIsMultiCity}
                  />
                  <Label htmlFor="multi-city">Multi-city trip</Label>
                </div>

                {/* Location selection */}
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="font-medium mb-2">
                      {isMultiCity ? 'Add destinations' : 'Select destination'}
                    </h3>
                    <AmadeusCitySearch
                      value={currentLocationSearch}
                      onChange={setCurrentLocationSearch}
                      onCitySelect={handleLocationSelect}
                      placeholder={isMultiCity ? "Add another city..." : "Enter city name"}
                      className="max-w-md mx-auto"
                    />
                  </div>

                  {/* Selected locations display */}
                  {locations.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-center">Selected destinations:</h4>
                      {locations.map((location) => (
                        <div key={location.id} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{location.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {location.country}{location.state && `, ${location.state}`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                             {isMultiCity && (
                               <div className="flex flex-col items-center gap-2">
                                 {/* Toggle for each location */}
                                 <div className="flex items-center space-x-2">
                                   <Switch
                                     id={`length-of-stay-${location.id}`}
                                     checked={locationLengthOfStay[location.id] || false}
                                     onCheckedChange={(checked) => {
                                       setLocationLengthOfStay(prev => ({
                                         ...prev,
                                         [location.id]: checked
                                       }));
                                       if (checked) {
                                         // Initialize with 1 night if not set
                                         setLocationNights(prev => ({
                                           ...prev,
                                           [location.id]: prev[location.id] || 1
                                         }));
                                       }
                                     }}
                                   />
                                   <Label htmlFor={`length-of-stay-${location.id}`} className="text-xs">
                                     Use nights
                                   </Label>
                                 </div>
                                 
                                 {locationLengthOfStay[location.id] ? (
                                   /* Number of nights selector */
                                   <div className="w-32 space-y-2">
                                     <Slider
                                       value={[locationNights[location.id] || 1]}
                                       onValueChange={(value) => {
                                         const nights = value[0];
                                         setLocationNights(prev => ({
                                           ...prev,
                                           [location.id]: nights
                                         }));
                                         
                                         // Calculate dates based on nights - use today as start
                                         const startDate = startOfDay(new Date());
                                         const endDate = addDays(startDate, nights);
                                         updateLocationDates(location.id, startDate, endDate);
                                       }}
                                       max={30}
                                       min={1}
                                       step={1}
                                       className="w-full"
                                     />
                                     <div className="text-center text-xs">
                                       <span className="font-semibold">{locationNights[location.id] || 1}</span>
                                       <span className="text-muted-foreground ml-1">
                                         {(locationNights[location.id] || 1) === 1 ? 'night' : 'nights'}
                                       </span>
                                     </div>
                                   </div>
                                 ) : (
                                   /* Date picker */
                                   <Popover>
                                     <PopoverTrigger asChild>
                                       <Button
                                         variant="outline"
                                         size="sm"
                                         className={cn(
                                           "text-xs",
                                           (!location.startDate || !location.endDate) && "text-muted-foreground"
                                         )}
                                       >
                                         <CalendarIcon className="w-3 h-3 mr-1" />
                                         {location.startDate && location.endDate 
                                           ? `${format(location.startDate, 'MMM dd')} - ${format(location.endDate, 'MMM dd')}`
                                           : 'Select dates'
                                         }
                                       </Button>
                                     </PopoverTrigger>
                                     <PopoverContent className="w-auto p-0" align="start">
                                       <CalendarComponent
                                         mode="range"
                                         selected={{
                                           from: location.startDate,
                                           to: location.endDate
                                         }}
                                         onSelect={(range) => {
                                           updateLocationDates(location.id, range?.from || null, range?.to || null);
                                         }}
                                         initialFocus
                                         className={cn("p-3 pointer-events-auto")}
                                       />
                                     </PopoverContent>
                                   </Popover>
                                 )}
                               </div>
                             )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLocation(location.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Date selection for single city trips */}
                {!isMultiCity && locations.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-medium text-center">Select travel dates</h3>
                    
                    {/* Toggle between specific dates and length of stay */}
                    <div className="flex items-center justify-center space-x-2">
                      <Switch
                        id="length-of-stay"
                        checked={useLengthOfStay}
                        onCheckedChange={setUseLengthOfStay}
                      />
                      <Label htmlFor="length-of-stay">Use length of stay instead</Label>
                    </div>

                    <div className="max-w-md mx-auto">
                      {useLengthOfStay ? (
                        <div className="space-y-4">
                          <div className="text-center">
                            <Label className="text-sm font-medium">Number of nights</Label>
                            <div className="mt-2 space-y-3">
                              <Slider
                                value={[numberOfNights]}
                                onValueChange={(value) => setNumberOfNights(value[0])}
                                max={30}
                                min={1}
                                step={1}
                                className="w-full"
                              />
                              <div className="text-center">
                                <span className="text-lg font-semibold">{numberOfNights}</span>
                                <span className="text-sm text-muted-foreground ml-1">
                                  {numberOfNights === 1 ? 'night' : 'nights'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <DateRangePicker
                          startDate={dateRange.start}
                          endDate={dateRange.end}
                          onDateRangeChange={handleDateRangeChange}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Create itinerary button */}
                {canCreateItinerary && (
                  <div className="flex justify-center pt-4">
                    <Button 
                      onClick={isMultiCity ? () => {
                        createMultiCityItinerary();
                        setHasCreatedItinerary(true);
                      } : () => {
                        if (useLengthOfStay) {
                          console.log('Creating single city itinerary with length of stay:', { numberOfNights, locations, useLengthOfStay });
                          // Create dates based on number of nights - use today as start date
                          const startDate = startOfDay(new Date());
                          const endDate = addDays(startDate, numberOfNights);
                          
                          console.log('Calculated dates:', { startDate: startDate.toDateString(), endDate: endDate.toDateString() });
                          
                          const locationNames = locations.map(loc => loc.name).join(' → ');
                          const title = `${locationNames} - ${numberOfNights} ${numberOfNights === 1 ? 'Night' : 'Nights'}`;
                          
                          const newItinerary: Itinerary = {
                            title,
                            startDate,
                            endDate,
                            locations,
                            isMultiCity,
                            events: [],
                            hotels: [],
                            flights: [],
                            userId: user?.id,
                          };
                          setCurrentItinerary(newItinerary);
                          setDateRange({ start: startDate, end: endDate });
                          setHasCreatedItinerary(true);
                          // Mark this itinerary as created with length of stay
                          setWasCreatedWithLengthOfStay(true);
                          console.log('Created single city with length of stay:', { numberOfNights, wasCreatedWithLengthOfStay: true, newItinerary });
                        } else if (dateRange.start && dateRange.end && locations.length > 0) {
                          const locationNames = locations.map(loc => loc.name).join(' → ');
                          const title = `${locationNames} Trip`;
                          
                          const newItinerary: Itinerary = {
                            title,
                            startDate: dateRange.start,
                            endDate: dateRange.end,
                            locations,
                            isMultiCity,
                            events: [],
                            hotels: [],
                            flights: [],
                            userId: user?.id,
                          };
                          setCurrentItinerary(newItinerary);
                          setHasCreatedItinerary(true);
                        }
                      }}
                      className="flex items-center gap-2"
                    >
                      <CalendarDays className="w-4 h-4" />
                      Create Itinerary
                    </Button>
                  </div>
                )}

                {/* Status message */}
                {!canCreateItinerary && locations.length > 0 && (
                  <div className="text-center text-muted-foreground text-sm">
                    {isMultiCity 
                      ? "Select dates for each destination to create your itinerary"
                      : "Select travel dates to create your itinerary"
                    }
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="saved" className="mt-6">
            <SavedItinerariesSection onLoadItinerary={handleLoadItinerary} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Main itinerary builder view
  console.log('Rendering main itinerary view:', { 
    hasCreatedItinerary, 
    currentItinerary: !!currentItinerary, 
    dateRange, 
    useLengthOfStay, 
    wasCreatedWithLengthOfStay,
    locationLengthOfStay: Object.keys(locationLengthOfStay),
    events: events.length
  });
  
  return (
    <div className="w-full px-4 lg:px-6 space-y-6">
      <Tabs defaultValue="builder" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="builder" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Itinerary Builder
          </TabsTrigger>
          <TabsTrigger value="saved" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Saved Itineraries
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="builder" className="mt-6 space-y-6">
          {/* Header with date range and actions */}
          <Card className="lg:rounded-lg lg:border lg:shadow-sm rounded-none border-0 border-t border-b shadow-none relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen lg:left-auto lg:right-auto lg:ml-0 lg:mr-0 lg:w-auto">
            <CardHeader className="pb-4">
              {/* Mobile-optimized layout */}
              <div className="space-y-4">
                {/* Title and Multi-city Badge Row */}
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                    <Calendar className="w-5 h-5 shrink-0" />
                    <span className="truncate">{currentItinerary?.title}</span>
                  </CardTitle>
                  {currentItinerary?.isMultiCity && (
                    <Badge variant="outline" className="shrink-0">Multi-city</Badge>
                  )}
                </div>
                
                {/* Date Range - Full width on mobile */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="text-sm text-muted-foreground flex-1">
                    {dateRange.start && dateRange.end ? (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                        {wasCreatedWithLengthOfStay || useLengthOfStay || Object.keys(locationLengthOfStay).some(id => locationLengthOfStay[id]) ? (
                          <span>{tripDays} {tripDays === 1 ? 'night' : 'nights'}</span>
                        ) : (
                          <>
                            <span>{format(dateRange.start, 'MMM do')} - {format(dateRange.end, 'MMM do')}</span>
                            <span className="text-xs">({tripDays} {tripDays === 1 ? 'day' : 'days'})</span>
                          </>
                        )}
                      </div>
                    ) : (
                      'Dates not set'
                    )}
                  </div>
                  {!(wasCreatedWithLengthOfStay || useLengthOfStay || Object.keys(locationLengthOfStay).some(id => locationLengthOfStay[id])) && (
                    <div className="sm:ml-auto">
                      <DateRangePicker
                        startDate={dateRange.start}
                        endDate={dateRange.end}
                        onDateRangeChange={handleDateRangeChange}
                      />
                    </div>
                  )}
                </div>
                
                {/* Locations - Vertical layout on mobile for better readability */}
                {currentItinerary?.locations && currentItinerary.locations.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Destinations
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {currentItinerary.locations.map((location, index) => (
                        <Badge key={location.id} variant="secondary" className="flex items-center gap-1 text-xs">
                          <MapPin className="w-3 h-3" />
                          {location.name}
                          {location.iataCode && ` (${location.iataCode})`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Action buttons - Better mobile layout */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSaveDialogOpen(true)}
                  className="flex items-center justify-center gap-2 text-xs"
                >
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline">Save Itinerary</span>
                  <span className="sm:hidden">Save</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsShareDialogOpen(true)}
                  className="flex items-center justify-center gap-2 text-xs"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExportDialogOpen(true)}
                  className="flex items-center justify-center gap-2 text-xs col-span-2 sm:col-span-1"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export PDF</span>
                  <span className="sm:hidden">Export</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Clear persisted state and reset to initial setup
                    localStorage.removeItem('currentItineraryBuilder');
                    setDateRange({ start: null, end: null });
                    setCurrentItinerary(null);
                    setEvents([]);
                    setLocations([]);
                    setIsMultiCity(false);
                    setHasCreatedItinerary(false);
                    setCurrentLocationSearch('');
                    // Reset length of stay state
                    setUseLengthOfStay(false);
                    setNumberOfNights(1);
                    setLocationLengthOfStay({});
                    setLocationNights({});
                    setWasCreatedWithLengthOfStay(false);
                    console.log('Reset all state for new itinerary');
                  }}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Start New Itinerary
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Trip Extension Section - Show for all trips */}
          {currentItinerary && (
            <Collapsible open={isExtensionOpen} onOpenChange={setIsExtensionOpen}>
              <Card className="mb-6">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        Extend Your Trip
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform ${isExtensionOpen ? 'rotate-180' : ''}`} />
                    </CardTitle>
                    <CardDescription>
                      Add more days or cities to your itinerary
                    </CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-6 pt-0">
                    {/* Mode conversion toggle for length-of-stay trips */}
                    {(useLengthOfStay || wasCreatedWithLengthOfStay || Object.keys(locationLengthOfStay).some(id => locationLengthOfStay[id])) && (
                      <div className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
                        <div>
                          <Label className="text-sm font-medium">Trip planning mode</Label>
                          <p className="text-xs text-muted-foreground">
                            Switch between nights-based and date-based planning
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Convert to date-based mode
                            if (currentItinerary) {
                              // Clear length-of-stay settings
                              setUseLengthOfStay(false);
                              setWasCreatedWithLengthOfStay(false);
                              setLocationLengthOfStay({});
                              setLocationNights({});
                              
                              // If dates don't exist, create them from current settings
                              if (!dateRange.start || !dateRange.end) {
                                const startDate = startOfDay(new Date());
                                let endDate = startDate;
                                
                                if (currentItinerary.isMultiCity) {
                                  // Calculate total trip duration from all cities
                                  const totalNights = Object.values(locationNights).reduce((sum, nights) => sum + nights, 0) || 7;
                                  endDate = addDays(startDate, totalNights);
                                } else {
                                  // Use numberOfNights for single city
                                  endDate = addDays(startDate, numberOfNights);
                                }
                                
                                setDateRange({ start: startDate, end: endDate });
                                setCurrentItinerary(prev => prev ? {
                                  ...prev,
                                  startDate,
                                  endDate
                                } : null);
                              }
                              
                              setHasPendingChanges(true);
                              toast.success('Converted to date-based planning');
                            }
                          }}
                        >
                          Switch to Dates
                        </Button>
                      </div>
                    )}
                    
                    {/* Mode conversion toggle for date-based trips */}
                    {!useLengthOfStay && !wasCreatedWithLengthOfStay && !Object.keys(locationLengthOfStay).some(id => locationLengthOfStay[id]) && dateRange.start && dateRange.end && (
                      <div className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
                        <div>
                          <Label className="text-sm font-medium">Trip planning mode</Label>
                          <p className="text-xs text-muted-foreground">
                            Switch between date-based and nights-based planning
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Convert to length-of-stay mode
                            if (currentItinerary && dateRange.start && dateRange.end) {
                              const totalNights = differenceInDays(dateRange.end, dateRange.start);
                              
                              if (currentItinerary.isMultiCity) {
                                // Set up length-of-stay for multi-city
                                const nightsPerCity = Math.max(1, Math.floor(totalNights / currentItinerary.locations.length));
                                const remainingNights = totalNights - (nightsPerCity * (currentItinerary.locations.length - 1));
                                
                                const newLocationLengthOfStay: Record<string, boolean> = {};
                                const newLocationNights: Record<string, number> = {};
                                
                                currentItinerary.locations.forEach((location, index) => {
                                  newLocationLengthOfStay[location.id] = true;
                                  // Give remaining nights to the last city
                                  newLocationNights[location.id] = index === currentItinerary.locations.length - 1 ? remainingNights : nightsPerCity;
                                });
                                
                                setLocationLengthOfStay(newLocationLengthOfStay);
                                setLocationNights(newLocationNights);
                                setWasCreatedWithLengthOfStay(true);
                              } else {
                                // Set up length-of-stay for single city
                                setUseLengthOfStay(true);
                                setNumberOfNights(totalNights);
                                setWasCreatedWithLengthOfStay(true);
                              }
                              
                              setHasPendingChanges(true);
                              toast.success('Converted to nights-based planning');
                            }
                          }}
                        >
                          Switch to Nights
                        </Button>
                      </div>
                    )}
                    {/* For date-based single city trips */}
                    {!useLengthOfStay && !currentItinerary?.isMultiCity && !wasCreatedWithLengthOfStay && !Object.keys(locationLengthOfStay).some(id => locationLengthOfStay[id]) && (
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium">Modify your trip dates</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Change your start or end date to adjust your trip
                          </p>
                          <div className="mt-3 grid grid-cols-1 gap-3">
                            {/* Start Date Picker */}
                            <div>
                              <Label className="text-xs text-muted-foreground">Start Date</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !pendingStartDate && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {pendingStartDate ? format(pendingStartDate, 'PPP') : 'Select start date'}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <CalendarComponent
                                    mode="single"
                                    selected={pendingStartDate}
                                    onSelect={(date) => {
                                      if (date && (!pendingEndDate || date < pendingEndDate)) {
                                        setPendingStartDate(date);
                                        setHasPendingChanges(true);
                                      }
                                    }}
                                    disabled={(date) => pendingEndDate && date >= pendingEndDate}
                                    initialFocus
                                    className={cn("p-3 pointer-events-auto")}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                            
                            {/* End Date Picker */}
                            <div>
                              <Label className="text-xs text-muted-foreground">End Date</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !pendingEndDate && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {pendingEndDate ? format(pendingEndDate, 'PPP') : 'Select end date'}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <CalendarComponent
                                    mode="single"
                                    selected={pendingEndDate}
                                    onSelect={(date) => {
                                      if (date && (!pendingStartDate || date > pendingStartDate)) {
                                        setPendingEndDate(date);
                                        setHasPendingChanges(true);
                                      }
                                    }}
                                    disabled={(date) => !pendingStartDate || date <= pendingStartDate}
                                    initialFocus
                                    className={cn("p-3 pointer-events-auto")}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                        </div>
                        
                        {/* Option to add cities to any itinerary */}
                        <div className="pt-4 border-t">
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Add another city</Label>
                            <p className="text-xs text-muted-foreground">
                              Convert to a multi-city trip by adding destinations
                            </p>
                            <AmadeusCitySearch
                              value={currentLocationSearch}
                              onChange={setCurrentLocationSearch}
                              onCitySelect={(newLocation) => {
                                const locationToAdd: TripLocation = {
                                  id: newLocation.id,
                                  name: newLocation.mainText,
                                  country: newLocation.secondaryText.split(",").pop()?.trim() || "",
                                  state: newLocation.secondaryText.split(",")[0]?.trim(),
                                };
                                
                                // Add to locations
                                setLocations(prev => [...prev, locationToAdd]);
                                
                                // Convert to multi-city
                                setIsMultiCity(true);
                                
                                // If current itinerary exists, update it to multi-city
                                if (currentItinerary) {
                                  const updatedLocations = [...currentItinerary.locations, locationToAdd];
                                  
                                  // Keep as date-based system - preserve existing dates if they exist
                                  if (dateRange.start && dateRange.end) {
                                    const totalDays = differenceInDays(dateRange.end, dateRange.start);
                                    const currentLocation = currentItinerary.locations[0];
                                    
                                    // Split the existing trip duration between cities
                                    const firstCityNights = Math.max(1, Math.floor(totalDays / 2));
                                    
                                    // Use existing start date and calculate split
                                    const firstCityStart = dateRange.start;
                                    const firstCityEnd = addDays(firstCityStart, firstCityNights);
                                    const secondCityStart = firstCityEnd;
                                    const secondCityEnd = dateRange.end; // Preserve original end date
                                    
                                    // DON'T set length of stay - keep it date-based
                                    // Just update the location dates
                                    updateLocationDates(currentLocation.id, firstCityStart, firstCityEnd);
                                    updateLocationDates(locationToAdd.id, secondCityStart, secondCityEnd);
                                    
                                    const locationsWithDates = [
                                      { ...currentLocation, startDate: firstCityStart, endDate: firstCityEnd },
                                      { ...locationToAdd, startDate: secondCityStart, endDate: secondCityEnd }
                                    ];
                                    
                                    setCurrentItinerary(prev => prev ? { 
                                      ...prev, 
                                      locations: locationsWithDates,
                                      isMultiCity: true,
                                      // Keep the original date range
                                      startDate: dateRange.start,
                                      endDate: dateRange.end,
                                      title: `Multi-City: ${locationsWithDates.map(loc => loc.name).join(' → ')}`
                                    } : null);
                                    
                                    // DON'T set wasCreatedWithLengthOfStay - keep it date-based
                                  } else {
                                    // If no dates exist, just update to multi-city without dates
                                    setCurrentItinerary(prev => prev ? { 
                                      ...prev, 
                                      locations: updatedLocations,
                                      isMultiCity: true,
                                      title: `Multi-City: ${updatedLocations.map(loc => loc.name).join(' → ')}`
                                    } : null);
                                  }
                                }
                                
                                setCurrentLocationSearch("");
                                toast.success(`Added ${locationToAdd.name} to your trip`);
                              }}
                              placeholder="Add another city..."
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* For single city trips using length of stay */}
                {useLengthOfStay && !currentItinerary?.isMultiCity && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Extend your stay</Label>
                      <div className="mt-2 space-y-3">
                        <Slider
                          value={[pendingNights]}
                          onValueChange={(value) => {
                            const newNights = value[0];
                            setPendingNights(newNights);
                            setHasPendingChanges(true);
                          }}
                          max={90}
                          min={1}
                          step={1}
                          className="w-full"
                        />
                        <div className="text-center">
                          <span className="text-lg font-semibold">{pendingNights}</span>
                          <span className="text-sm text-muted-foreground ml-1">
                            {pendingNights === 1 ? "night" : "nights"}
                          </span>
                        </div>
                      </div>
                    </div>

                        {/* Option to convert to multi-city */}
                        <div className="pt-4 border-t">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-sm font-medium">Add another city</Label>
                              <p className="text-xs text-muted-foreground mt-1">
                                Convert to a multi-city trip
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setIsMultiCity(true);
                                // Convert current single city to multi-city format
                                if (currentItinerary && currentItinerary.locations.length > 0) {
                                  const currentLocation = currentItinerary.locations[0];
                                  setLocationLengthOfStay(prev => ({
                                    ...prev,
                                    [currentLocation.id]: true
                                  }));
                                  setLocationNights(prev => ({
                                    ...prev,
                                    [currentLocation.id]: numberOfNights
                                  }));
                                  
                                  // Update the location with proper sequential dates (starting from today)
                                  const startDate = startOfDay(new Date());
                                  const endDate = addDays(startDate, numberOfNights);
                                  updateLocationDates(currentLocation.id, startDate, endDate);
                                  
                                  console.log('Converting to multi-city:', { city: currentLocation.name, nights: numberOfNights, start: startDate.toDateString(), end: endDate.toDateString() });
                                  
                                  // Update the itinerary to multi-city
                                  setCurrentItinerary(prev => prev ? { 
                                    ...prev, 
                                    isMultiCity: true,
                                    locations: prev.locations.map(loc => 
                                      loc.id === currentLocation.id ? 
                                      { ...loc, startDate, endDate } : loc
                                    )
                                  } : null);
                                }
                                // Keep useLengthOfStay true but also set multi-city mode
                              }}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add City
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* For multi-city trips - show if it's multi-city OR has length of stay locations */}
                    {currentItinerary?.isMultiCity && (
                      <div className="space-y-4">
                        {/* Date-based multi-city management */}
                        {!Object.keys(locationLengthOfStay).some(id => locationLengthOfStay[id]) ? (
                          <div>
                            <Label className="text-sm font-medium">Modify city dates</Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Adjust the dates for each city in your trip
                            </p>
                            <div className="mt-3 space-y-4">
                              {currentItinerary.locations.map((location, index) => (
                                <div key={location.id} className="p-4 bg-accent/50 rounded-lg">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <MapPin className="w-4 h-4 text-muted-foreground" />
                                      <span className="font-medium">{location.name}</span>
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                      {location.startDate && location.endDate ? 
                                        `${format(location.startDate, 'MMM dd')} - ${format(location.endDate, 'MMM dd')}` : 
                                        'No dates set'
                                      }
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Start Date</Label>
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className={cn(
                                              "w-full justify-start text-left font-normal text-xs",
                                              !location.startDate && "text-muted-foreground"
                                            )}
                                          >
                                            <CalendarIcon className="mr-1 h-3 w-3" />
                                            {location.startDate ? format(location.startDate, 'MMM dd') : 'Start'}
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 z-50" align="start">
                                           <CalendarComponent
                                             mode="single"
                                             selected={location.startDate}
                                             onSelect={(date) => {
                                               if (date && (!location.endDate || date < location.endDate)) {
                                                 updateLocationDates(location.id, date, location.endDate);
                                                 setHasPendingChanges(true);
                                               }
                                             }}
                                             disabled={(date) => location.endDate && date >= location.endDate}
                                             initialFocus
                                             className="p-3 pointer-events-auto"
                                           />
                                        </PopoverContent>
                                      </Popover>
                                    </div>
                                    <div>
                                      <Label className="text-xs text-muted-foreground">End Date</Label>
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className={cn(
                                              "w-full justify-start text-left font-normal text-xs",
                                              !location.endDate && "text-muted-foreground"
                                            )}
                                          >
                                            <CalendarIcon className="mr-1 h-3 w-3" />
                                            {location.endDate ? format(location.endDate, 'MMM dd') : 'End'}
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 z-50" align="start">
                                           <CalendarComponent
                                             mode="single"
                                             selected={location.endDate}
                                             onSelect={(date) => {
                                               if (date && (!location.startDate || date > location.startDate)) {
                                                 updateLocationDates(location.id, location.startDate, date);
                                                 setHasPendingChanges(true);
                                               }
                                             }}
                                             disabled={(date) => !location.startDate || date <= location.startDate}
                                             initialFocus
                                             className="p-3 pointer-events-auto"
                                           />
                                        </PopoverContent>
                                      </Popover>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          /* Length-of-stay based multi-city management */
                          <div>
                            <Label className="text-sm font-medium">Modify stay duration per city</Label>
                      <div className="mt-3 space-y-4">
                        {currentItinerary.locations.map((location, index) => (
                          locationLengthOfStay[location.id] && (
                            <div key={location.id} className="p-4 bg-accent/50 rounded-lg">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-muted-foreground" />
                                  <span className="font-medium">{location.name}</span>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {pendingLocationNights[location.id] || locationNights[location.id] || 1} {(pendingLocationNights[location.id] || locationNights[location.id] || 1) === 1 ? "night" : "nights"}
                                </span>
                              </div>
                              <Slider
                                value={[pendingLocationNights[location.id] || locationNights[location.id] || 1]}
                                onValueChange={(value) => {
                                  const nights = value[0];
                                  setPendingLocationNights(prev => ({
                                    ...prev,
                                    [location.id]: nights
                                  }));
                                  setHasPendingChanges(true);
                                }}
                                max={30}
                                min={1}
                                step={1}
                                className="w-full"
                              />
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                        )}

                    {/* Add another city to multi-city trip */}
                    <div className="pt-4 border-t">
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Add another city</Label>
                        <p className="text-xs text-muted-foreground">
                          Add more destinations to your multi-city trip
                        </p>
                        <AmadeusCitySearch
                          value={currentLocationSearch}
                          onChange={setCurrentLocationSearch}
                          onCitySelect={(newLocation) => {
                            const locationToAdd: TripLocation = {
                              id: newLocation.id,
                              name: newLocation.mainText,
                              country: newLocation.secondaryText.split(",").pop()?.trim() || "",
                              state: newLocation.secondaryText.split(",")[0]?.trim(),
                            };
                            
                            // Add to locations
                            setLocations(prev => [...prev, locationToAdd]);
                            
                            // Set default to use length of stay with 2 nights
                            setLocationLengthOfStay(prev => ({
                              ...prev,
                              [locationToAdd.id]: true
                            }));
                            setLocationNights(prev => ({
                              ...prev,
                              [locationToAdd.id]: 2
                            }));
                            
                            // Calculate sequential dates for all cities
                            if (currentItinerary) {
                              const allLocations = [...currentItinerary.locations, locationToAdd];
                              const updatedNights = {...locationNights, [locationToAdd.id]: 2};
                              let currentDate = startOfDay(new Date());
                              
                              // Calculate sequential dates for all locations
                              const updatedLocations = allLocations.map(loc => {
                                if (locationLengthOfStay[loc.id] || loc.id === locationToAdd.id) {
                                  const nights = updatedNights[loc.id] || 1;
                                  const startDate = new Date(currentDate);
                                  const endDate = addDays(startDate, nights);
                                  
                                  console.log(`New city calculation - ${loc.name}: ${nights} nights, ${startDate.toDateString()} to ${endDate.toDateString()}`);
                                  
                                  // Update location dates
                                  updateLocationDates(loc.id, startDate, endDate);
                                  
                                  // Move to next city's start date
                                  currentDate = new Date(endDate);
                                  
                                  return { ...loc, startDate, endDate };
                                }
                                return loc;
                              });
                              
                              // Recalculate overall trip dates
                              const allStartDates = updatedLocations.map(loc => loc.startDate!).filter(Boolean);
                              const allEndDates = updatedLocations.map(loc => loc.endDate!).filter(Boolean);
                              const overallStart = new Date(Math.min(...allStartDates.map(d => d.getTime())));
                              const overallEnd = new Date(Math.max(...allEndDates.map(d => d.getTime())));
                              
                              console.log('New overall trip dates after adding city:', { start: overallStart.toDateString(), end: overallEnd.toDateString() });
                              
                              setCurrentItinerary(prev => prev ? { 
                                ...prev, 
                                locations: updatedLocations,
                                startDate: overallStart,
                                endDate: overallEnd
                              } : null);
                              
                              // Update date range
                              setDateRange({ start: overallStart, end: overallEnd });
                            }
                            
                            setCurrentLocationSearch("");
                          }}
                          placeholder="Add another city..."
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Apply Changes Button */}
                {hasPendingChanges && (
                  <div className="flex justify-center pt-4 border-t">
                    <Button 
                      onClick={applyPendingChanges}
                      className="flex items-center gap-2"
                    >
                      Apply Changes
                    </Button>
                  </div>
                )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Hotels and Flights Section - Moved to top */}
          <HotelFlightSection
            locations={currentItinerary?.locations || []}
            isMultiCity={currentItinerary?.isMultiCity || false}
            hotels={hotels}
            flights={flights}
            onAddHotel={handleAddHotel}
            onAddFlight={handleAddFlight}
            onRemoveHotel={handleRemoveHotel}
            onRemoveFlight={handleRemoveFlight}
          />

          {/* Trip Calendar */}
          <TripCalendar
            startDate={dateRange.start!}
            endDate={dateRange.end!}
            events={events}
            locations={currentItinerary?.locations || []}
            isMultiCity={currentItinerary?.isMultiCity || false}
            useLengthOfStay={wasCreatedWithLengthOfStay || useLengthOfStay || Object.keys(locationLengthOfStay).some(id => locationLengthOfStay[id])}
            onAddEvent={handleAddEvent}
            onEditEvent={handleEditEvent}
            onDeleteEvent={handleDeleteEvent}
          />
        </TabsContent>
        
        <TabsContent value="saved" className="mt-6">
          <SavedItinerariesSection onLoadItinerary={handleLoadItinerary} />
        </TabsContent>
      </Tabs>

      {/* Event Dialog */}
      <EventDialog
        isOpen={isEventDialogOpen}
        onClose={() => {
          setIsEventDialogOpen(false);
          setEditingEvent(null);
          setSelectedDate(null);
        }}
        onSave={handleSaveEvent}
        selectedDate={selectedDate}
        editingEvent={editingEvent}
        availableDates={
          dateRange.start && dateRange.end
            ? eachDayOfInterval({ start: dateRange.start, end: dateRange.end })
                .map(date => format(date, 'yyyy-MM-dd'))
            : []
        }
      />

      {/* Share Dialog */}
      <ShareItineraryDialog
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
        itinerary={currentItinerary}
      />

      {/* Export Dialog */}
      <ExportItineraryDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        itinerary={currentItinerary}
      />

      {/* Save Dialog */}
      <SaveItineraryDialog
        isOpen={isSaveDialogOpen}
        onClose={() => setIsSaveDialogOpen(false)}
        onSave={handleSaveItinerary}
        currentTitle={currentItinerary?.title || ''}
      />
    </div>
  );
}