import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { BottomSheet, BottomSheetContent, BottomSheetHeader } from '@/components/ui/bottom-sheet';
import { DateRangePicker } from '@/components/DateRangePicker';
import { TripCalendar } from '@/components/TripCalendar';
import { EventDialog } from '@/components/EventDialog';
import { ShareItineraryDialog } from '@/components/ShareItineraryDialog';
import { ExportItineraryDialog } from '@/components/ExportItineraryDialog';
import { SaveItineraryDialog } from '@/components/SaveItineraryDialog';
import { SavedItinerariesSection } from '@/components/SavedItinerariesSection';
import { AmadeusCitySearch } from '@/components/AmadeusCitySearch';
import { HotelFlightSection } from '@/components/HotelFlightSection';
import { ItineraryMapView } from '@/components/ItineraryMapView';
import { ItineraryMapButton } from '@/components/ItineraryMapButton';
import { Hotel as HotelType } from '@/hooks/useGooglePlacesHotelSearch';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useItineraries } from '@/hooks/useItineraries';
import { useScrollAutoCollapse } from '@/hooks/useScrollAutoCollapse';
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
    latitude?: number;
    longitude?: number;
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
export interface HotelBooking {
  id: string;
  hotel: HotelType;
  checkIn?: Date;
  checkOut?: Date;
  location?: string;
}
export interface FlightBooking {
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
export function ItineraryBuilder({
  onLoadItinerary
}: {
  onLoadItinerary?: (itinerary: Itinerary) => void;
}) {
  const {
    user
  } = useAuth();
  const {
    saveItinerary,
    updateItinerary
  } = useItineraries();
  const navigate = useNavigate();

  // Load state from localStorage on mount - moved to useMemo to ensure consistent execution
  const persistedState = useMemo(() => {
    try {
      const savedState = localStorage.getItem('currentItineraryBuilder');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        return {
          dateRange: {
            start: parsed.dateRange.start ? new Date(parsed.dateRange.start) : null,
            end: parsed.dateRange.end ? new Date(parsed.dateRange.end) : null
          },
          currentItinerary: parsed.currentItinerary ? {
            ...parsed.currentItinerary,
            startDate: new Date(parsed.currentItinerary.startDate),
            endDate: new Date(parsed.currentItinerary.endDate),
            locations: parsed.currentItinerary.locations.map((loc: any) => ({
              ...loc,
              startDate: loc.startDate ? new Date(loc.startDate) : undefined,
              endDate: loc.endDate ? new Date(loc.endDate) : undefined
            }))
          } : null,
          events: parsed.events || [],
          hotels: parsed.hotels || [],
          flights: parsed.flights || [],
          locations: parsed.locations.map((loc: any) => ({
            ...loc,
            startDate: loc.startDate ? new Date(loc.startDate) : undefined,
            endDate: loc.endDate ? new Date(loc.endDate) : undefined
          })),
          isMultiCity: parsed.isMultiCity || false,
          hasCreatedItinerary: parsed.hasCreatedItinerary || false,
          // Add length of stay state persistence
          useLengthOfStay: parsed.useLengthOfStay || false,
          locationLengthOfStay: parsed.locationLengthOfStay || {},
          locationNights: parsed.locationNights || {},
          numberOfNights: parsed.numberOfNights || 1,
          // Add permanent flag to remember if trip was created with length of stay
          wasCreatedWithLengthOfStay: parsed.wasCreatedWithLengthOfStay || false
        };
      }
    } catch (error) {
      console.error('Error loading persisted state:', error);
    }
    return null;
  }, []); // Empty dependency array to run only once

  console.log('Loading persisted state:', persistedState);
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>(persistedState?.dateRange || {
    start: null,
    end: null
  });
  const [currentItinerary, setCurrentItinerary] = useState<Itinerary | null>(persistedState?.currentItinerary || null);
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
  const [isDesktopSectionOpen, setIsDesktopSectionOpen] = useState(true);
  const [pendingEndDate, setPendingEndDate] = useState<Date | null>(dateRange.end);
  const [pendingStartDate, setPendingStartDate] = useState<Date | null>(dateRange.start);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("builder");

  // Auto-collapse hooks for dropdowns when they scroll off screen
  const extensionRef = useScrollAutoCollapse({
    isOpen: isExtensionOpen,
    onClose: () => setIsExtensionOpen(false),
    threshold: 0.3 // Collapse when 70% of element is off screen
  });

  const itineraryDetailsRef = useScrollAutoCollapse({
    isOpen: isDesktopSectionOpen,
    onClose: () => setIsDesktopSectionOpen(false),
    threshold: 0.3 // Collapse when 70% of element is off screen
  });

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
          placeId: event.restaurantData.placeId, // Keep placeId for map functionality
          phone: event.restaurantData.phone,
          website: event.restaurantData.website,
          latitude: event.restaurantData.latitude, // Keep coordinates for map
          longitude: event.restaurantData.longitude
        } : undefined,
        // Keep only essential attraction data
        attractionData: event.attractionData ? {
          id: event.attractionData.id,
          name: event.attractionData.name,
          address: event.attractionData.address,
          phone: event.attractionData.phone,
          website: event.attractionData.website,
          category: event.attractionData.category,
          latitude: event.attractionData.latitude,
          longitude: event.attractionData.longitude
        } : undefined
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
      wasCreatedWithLengthOfStay
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
            isMultiCity: currentItinerary.isMultiCity
          } : null,
          hasCreatedItinerary,
          useLengthOfStay
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
      setDateRange({
        start: newStartDate,
        end: newEndDate
      });
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
        setDateRange(prev => ({
          ...prev,
          end: newEndDate
        }));

        // Update current itinerary
        if (currentItinerary) {
          setCurrentItinerary(prev => prev ? {
            ...prev,
            endDate: newEndDate
          } : null);
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
            return {
              ...loc,
              startDate,
              endDate
            };
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
          setDateRange({
            start: overallStart,
            end: overallEnd
          });
        }
      }
    }
    setHasPendingChanges(false);
    toast.success('Changes applied successfully');
  };
  const tripDays = dateRange.start && dateRange.end ? differenceInDays(dateRange.end, dateRange.start) + 1 : 0;
  const handleDateRangeChange = (start: Date | null, end: Date | null) => {
    console.log('ItineraryBuilder - handleDateRangeChange called:', {
      inputStart: start,
      inputEnd: end,
      inputStartType: typeof start,
      inputEndType: typeof end
    });
    
    setDateRange({
      start,
      end
    });
    
    // Update current itinerary dates if it exists
    if (currentItinerary && start && end) {
      console.log('ItineraryBuilder - Updating current itinerary dates:', {
        originalStartDate: start,
        originalEndDate: end,
        currentItineraryId: currentItinerary.id
      });
      
      setCurrentItinerary(prev => prev ? {
        ...prev,
        startDate: start,
        endDate: end
      } : null);
    }
    
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
      userId: user?.id
    };
    setCurrentItinerary(newItinerary);
    setDateRange({
      start: overallStart,
      end: overallEnd
    });

    // Check if any location was created with length of stay
    const hasLengthOfStayLocations = Object.keys(locationLengthOfStay).some(id => locationLengthOfStay[id]);
    if (hasLengthOfStayLocations) {
      setWasCreatedWithLengthOfStay(true);
      console.log('Created multi-city with length of stay:', {
        locationLengthOfStay,
        wasCreatedWithLengthOfStay: true
      });
    }
  };
  const reorderCities = (draggedId: string, droppedOnId: string) => {
    if (draggedId === droppedOnId) return;
    console.log('Reordering cities:', {
      draggedId,
      droppedOnId
    });
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
          return {
            ...loc,
            startDate,
            endDate
          };
        }
        return loc;
      });

      // Calculate overall trip dates
      const allStartDates = updatedLocations.map(loc => loc.startDate!).filter(Boolean);
      const allEndDates = updatedLocations.map(loc => loc.endDate!).filter(Boolean);
      if (allStartDates.length > 0 && allEndDates.length > 0) {
        const overallStart = new Date(Math.min(...allStartDates.map(d => d.getTime())));
        const overallEnd = new Date(Math.max(...allEndDates.map(d => d.getTime())));
        console.log('New overall trip dates after reorder:', {
          start: overallStart.toDateString(),
          end: overallEnd.toDateString()
        });
        setCurrentItinerary(prev => prev ? {
          ...prev,
          locations: updatedLocations,
          startDate: overallStart,
          endDate: overallEnd
        } : null);
        setDateRange({
          start: overallStart,
          end: overallEnd
        });
      }
    }
  };
  const handleLocationSelect = (location: LocationSuggestion) => {
    const secondaryText = location.secondaryText || '';
    const newLocation: TripLocation = {
      id: location.id,
      name: location.mainText,
      country: secondaryText.split(',').pop()?.trim() || '',
      state: secondaryText.split(',')[0]?.trim()
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
    console.log('updateLocationDates called:', {
      locationId,
      startDate,
      endDate
    });
    setLocations(prev => {
      const updated = prev.map(loc => loc.id === locationId ? {
        ...loc,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      } : loc);
      console.log('Updated locations:', updated);
      return updated;
    });

    // Also update the currentItinerary locations if it exists
    if (currentItinerary) {
      setCurrentItinerary(prev => {
        if (!prev) return null;
        const updatedItinerary = {
          ...prev,
          locations: prev.locations.map(loc => loc.id === locationId ? {
            ...loc,
            startDate: startDate || undefined,
            endDate: endDate || undefined
          } : loc)
        };
        console.log('Updated currentItinerary:', updatedItinerary);
        return updatedItinerary;
      });
    }
  };

  // Removed auto-creation - now requires manual button click

  const canCreateItinerary = (() => {
    const result = isMultiCity ? 
      locations.length > 0 && locations.every(loc =>
        // Either has specific dates OR has length of stay configured
        (loc.startDate && loc.endDate) || (locationLengthOfStay[loc.id] && locationNights[loc.id] > 0)
      ) : 
      useLengthOfStay ? 
        locations.length > 0 && numberOfNights > 0 : 
        dateRange.start && dateRange.end && locations.length > 0;
    
    console.log('🔍 canCreateItinerary check:', {
      result,
      locations: locations.length,
      isMultiCity,
      useLengthOfStay,
      numberOfNights,
      dateRange: {
        start: !!dateRange.start,
        end: !!dateRange.end
      }
    });
    
    return result;
  })();
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
      setEvents(prev => prev.map(event => event.id === editingEvent.id ? {
        ...eventData,
        id: editingEvent.id
      } : event));
      toast.success('Event updated successfully');
    } else {
      // Add new event(s)
      if (selectedDates && selectedDates.length > 1) {
        // Create multiple events for multiple dates
        const newEvents: ItineraryEvent[] = selectedDates.map(date => ({
          ...eventData,
          id: crypto.randomUUID(),
          date
        }));
        setEvents(prev => [...prev, ...newEvents]);
        toast.success(`Event added to ${selectedDates.length} days successfully`);
      } else {
        // Single event
        const newEvent: ItineraryEvent = {
          ...eventData,
          id: crypto.randomUUID()
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
  const checkLocalStorageUsage = () => {
    let totalSize = 0;
    const usage: Record<string, number> = {};
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const itemSize = localStorage.getItem(key)?.length || 0;
        usage[key] = itemSize;
        totalSize += itemSize;
      }
    }
    console.log('localStorage usage:', {
      totalBytes: totalSize,
      totalMB: (totalSize / 1024 / 1024).toFixed(2),
      items: Object.entries(usage).sort(([, a], [, b]) => b - a).slice(0, 10)
    });
    return {
      totalSize,
      usage
    };
  };
  const clearLargestItems = () => {
    const {
      usage
    } = checkLocalStorageUsage();
    const sortedItems = Object.entries(usage).sort(([, a], [, b]) => b - a);

    // Clear largest non-essential items first
    const nonEssentialKeys = sortedItems.filter(([key]) => !['savedItineraries', 'supabase.auth.token', 'auth-token'].includes(key));
    let clearedCount = 0;
    for (const [key, size] of nonEssentialKeys) {
      if (clearedCount < 5) {
        // Clear up to 5 largest items
        console.log(`Clearing localStorage item: ${key} (${size} bytes)`);
        localStorage.removeItem(key);
        clearedCount++;
      }
    }
    return clearedCount;
  };
  const handleSaveItinerary = async (title: string) => {
    if (!user || !currentItinerary) return;
    try {
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
        wasCreatedWithLengthOfStay
      };
      
      console.log('ItineraryBuilder - About to save itinerary:', {
        title,
        startDate: currentItinerary.startDate,
        endDate: currentItinerary.endDate,
        startDateType: typeof currentItinerary.startDate,
        endDateType: typeof currentItinerary.endDate,
        wasCreatedWithLengthOfStay,
        id: itineraryToSave.id,
        locations: itineraryToSave.locations,
        hotels: itineraryToSave.hotels,
        flights: itineraryToSave.flights,
        isMultiCity: itineraryToSave.isMultiCity,
        isExisting: !!currentItinerary.id
      });

      // Check if this is an existing itinerary (has an ID)
      const isExistingItinerary = !!currentItinerary.id;
      let saved;
      
      if (isExistingItinerary) {
        // Update existing itinerary
        console.log('Updating existing itinerary with ID:', currentItinerary.id);
        saved = await updateItinerary(currentItinerary.id, itineraryToSave);
      } else {
        // Create new itinerary
        console.log('Creating new itinerary');
        saved = await saveItinerary(itineraryToSave);
      }
      
      if (saved) {
        setCurrentItinerary(saved);
      }
    } catch (error) {
      console.error('Error saving itinerary:', error);
      toast.error('Failed to save itinerary');
    }
  };

  // Update current itinerary when events, hotels, or flights change
  useEffect(() => {
    if (currentItinerary) {
      setCurrentItinerary(prev => prev ? {
        ...prev,
        events,
        hotels,
        flights
      } : null);
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
    console.log('Loading itinerary:', {
      title: itinerary.title,
      locations: itinerary.locations,
      hotels: itinerary.hotels,
      flights: itinerary.flights,
      isMultiCity: itinerary.isMultiCity,
      startDate: itinerary.startDate,
      endDate: itinerary.endDate
    });
    
    // Load the selected itinerary into the builder
    setCurrentItinerary(itinerary);
    setDateRange({
      start: itinerary.startDate,
      end: itinerary.endDate
    });
    setEvents(itinerary.events);
    setHotels(itinerary.hotels || []);
    setFlights(itinerary.flights || []);
    setLocations(itinerary.locations || []);
    setIsMultiCity(itinerary.isMultiCity || false);
    
    // Set length of stay settings if this was created with that mode
    if (itinerary.wasCreatedWithLengthOfStay) {
      setWasCreatedWithLengthOfStay(true);
      setUseLengthOfStay(true);
    }
    
    setHasCreatedItinerary(true);

    // Update localStorage
    const stateToSave = {
      dateRange: {
        start: itinerary.startDate,
        end: itinerary.endDate
      },
      currentItinerary: itinerary,
      events: itinerary.events,
      hotels: itinerary.hotels || [],
      flights: itinerary.flights || [],
      locations: itinerary.locations || [],
      isMultiCity: itinerary.isMultiCity || false,
      hasCreatedItinerary: true,
      wasCreatedWithLengthOfStay: itinerary.wasCreatedWithLengthOfStay || false
    };
    localStorage.setItem('currentItineraryBuilder', JSON.stringify(stateToSave));
    toast.success('Itinerary loaded successfully');

    // If passed from parent, also call that handler
    if (onLoadItinerary) {
      onLoadItinerary(itinerary);
    }
  };
  // Mobile detection hook
  const [isMobile, setIsMobile] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  
  useEffect(() => {
    const checkIsMobile = () => {
      const userAgent = window.navigator.userAgent;
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const isMobileDevice = mobileRegex.test(userAgent);
      const isSmallScreen = window.innerWidth <= 1024;
      
      setIsMobile(isMobileDevice || isSmallScreen);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  if (!hasCreatedItinerary) {
    console.log('Rendering creation screen - hasCreatedItinerary:', hasCreatedItinerary);
    
    if (isMobile) {
      return (
        <div className="min-h-screen bg-background">
          {/* Premium Header Section */}
          <div className="bg-slate-900/70 backdrop-blur-xl border-b border-slate-700/30">
            <div className="px-6 py-6 flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-semibold text-white mb-2 tracking-tight">
                  Plan Your Trip
                </h1>
                <div className="h-px bg-gradient-to-r from-blue-500/60 via-blue-400/40 to-transparent w-32 mb-3"></div>
                <p className="text-sm text-slate-400 font-normal">
                  Create your perfect itinerary
                </p>
              </div>
              
              {/* Premium Icon Button */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex items-center gap-2 h-10 px-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 hover:border-blue-500/30 transition-all duration-200 shadow-lg backdrop-blur-sm" 
                onClick={() => navigate('/saved-itineraries')}
              >
                <BookOpen className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-slate-300">Saved</span>
              </Button>
            </div>
          </div>

          {/* Premium Content Container */}
          <div className="flex-1 overflow-y-auto px-3 py-8">
            {/* Premium Search Card */}
            <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-slate-700/30 shadow-2xl shadow-blue-500/5 p-6 mb-6">
              <div className="space-y-4">
                {/* Premium Search Input */}
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                    <MapPin className="w-5 h-5 text-blue-400" />
                  </div>
                  <AmadeusCitySearch 
                    value={currentLocationSearch} 
                    onChange={setCurrentLocationSearch} 
                    onCitySelect={handleLocationSelect} 
                    placeholder="Where to?" 
                    className="w-full h-14 pl-12 pr-4 text-base rounded-xl border border-slate-600/50 bg-slate-900/50 backdrop-blur-sm shadow-inner text-white placeholder:text-slate-400 focus:bg-slate-900/70 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 font-medium"
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-transparent pointer-events-none"></div>
                </div>
                
                {/* Compact Multi-city Toggle */}
                <div className="flex justify-start">
                  <div className="inline-flex items-center space-x-3 bg-slate-900/50 backdrop-blur-sm rounded-full px-4 py-2 border border-slate-600/30">
                    <Switch 
                      id="multi-city" 
                      checked={isMultiCity} 
                      onCheckedChange={setIsMultiCity}
                      className="data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-slate-600 scale-90"
                    />
                    <Label htmlFor="multi-city" className="text-sm font-medium text-slate-300 cursor-pointer">
                      Multi-city trip
                    </Label>
                  </div>
                </div>
                
                {/* Subtle Help Text */}
                {isMultiCity && (
                  <p className="text-xs text-slate-400 px-2 animate-fade-in">
                    Build an itinerary across multiple destinations
                  </p>
                )}
              </div>
            </div>

              {/* Selected Destinations */}
              {locations.length > 0 && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="font-medium text-foreground">Your destinations</h3>
                  </div>
                  <div className="space-y-3">
                    {locations.map(location => (
                      <div key={location.id} className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-border/50 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 rounded-full bg-primary"></div>
                              <h4 className="font-medium text-foreground truncate">{location.name}</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {location.country}{location.state && `, ${location.state}`}
                            </p>
                            
                            {isMultiCity && (
                              <div className="mt-3 space-y-3">
                                <div className="flex items-center space-x-2">
                                  <Switch 
                                    id={`length-of-stay-${location.id}`} 
                                    checked={locationLengthOfStay[location.id] || false} 
                                    onCheckedChange={checked => {
                                      setLocationLengthOfStay(prev => ({
                                        ...prev,
                                        [location.id]: checked
                                      }));
                                      if (checked) {
                                        setLocationNights(prev => ({
                                          ...prev,
                                          [location.id]: prev[location.id] || 1
                                        }));
                                      }
                                    }}
                                    className="scale-90"
                                  />
                                  <Label htmlFor={`length-of-stay-${location.id}`} className="text-xs text-muted-foreground">
                                    Set nights
                                  </Label>
                                </div>
                                
                                {locationLengthOfStay[location.id] ? (
                                  <div className="space-y-2">
                                    <Slider 
                                      value={[locationNights[location.id] || 1]} 
                                      onValueChange={value => {
                                        const nights = value[0];
                                        setLocationNights(prev => ({
                                          ...prev,
                                          [location.id]: nights
                                        }));
                                        const startDate = startOfDay(new Date());
                                        const endDate = addDays(startDate, nights);
                                        updateLocationDates(location.id, startDate, endDate);
                                      }} 
                                      max={30} 
                                      min={1} 
                                      step={1} 
                                      className="w-full" 
                                    />
                                    <div className="text-center">
                                      <span className="text-sm font-medium">{locationNights[location.id] || 1} nights</span>
                                    </div>
                                  </div>
                                ) : (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className={cn(
                                          "w-full h-9 text-xs rounded-lg bg-muted/50", 
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
                                        onSelect={range => {
                                          updateLocationDates(location.id, range?.from || null, range?.to || null);
                                        }} 
                                        initialFocus 
                                        className="p-3"
                                      />
                                    </PopoverContent>
                                  </Popover>
                                )}
                              </div>
                            )}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeLocation(location.id)} 
                            className="text-muted-foreground hover:text-destructive h-8 w-8 p-0 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Date Selection for Single City */}
              {!isMultiCity && locations.length > 0 && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 backdrop-blur-sm border border-primary/20">
                      <CalendarDays className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-medium text-foreground">When are you going?</h3>
                  </div>
                  
                  <div className="flex items-center justify-center">
                    <div className="flex items-center space-x-3 bg-muted/30 backdrop-blur-sm rounded-full p-1.5 border border-border/50">
                      <div className="flex items-center space-x-2 px-3 py-1.5">
                        <Switch 
                          id="length-of-stay" 
                          checked={useLengthOfStay} 
                          onCheckedChange={setUseLengthOfStay}
                          className="scale-90"
                        />
                        <Label htmlFor="length-of-stay" className="text-sm font-medium">Use nights</Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {useLengthOfStay ? (
                      <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50 space-y-4">
                        <div className="text-center">
                          <Label className="text-sm font-medium text-muted-foreground">Number of nights</Label>
                        </div>
                        <div className="space-y-4">
                          <Slider 
                            value={[numberOfNights]} 
                            onValueChange={value => setNumberOfNights(value[0])} 
                            max={30} 
                            min={1} 
                            step={1} 
                            className="w-full" 
                          />
                          <div className="text-center">
                            <span className="text-2xl font-bold text-foreground">{numberOfNights}</span>
                            <span className="text-muted-foreground ml-2">
                              {numberOfNights === 1 ? 'night' : 'nights'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-border/50">
                        <DateRangePicker 
                          startDate={dateRange.start} 
                          endDate={dateRange.end} 
                          onDateRangeChange={handleDateRangeChange} 
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          {/* Premium CTA Button */}
          {canCreateItinerary && (
            <div className="px-4 py-6">
              <Button 
                onClick={isMultiCity ? () => {
                  createMultiCityItinerary();
                  setHasCreatedItinerary(true);
                } : () => {
                  if (useLengthOfStay) {
                    const startDate = startOfDay(new Date());
                    const endDate = addDays(startDate, numberOfNights);
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
                      userId: user?.id
                    };
                    setCurrentItinerary(newItinerary);
                    setDateRange({ start: startDate, end: endDate });
                    setHasCreatedItinerary(true);
                    setWasCreatedWithLengthOfStay(true);
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
                      userId: user?.id
                    };
                    setCurrentItinerary(newItinerary);
                    setHasCreatedItinerary(true);
                  }
                }}
                className="w-full h-16 text-lg font-bold rounded-3xl bg-gradient-premium hover:shadow-premium-glow hover:scale-[1.02] transition-all duration-500 shadow-premium-xl text-primary-foreground"
                size="lg"
              >
                <CalendarDays className="w-6 h-6 mr-3" />
                <span>Create Itinerary</span>
              </Button>
              
              {/* Status when button not available */}
              {!canCreateItinerary && locations.length > 0 && (
                <p className="text-center text-muted-foreground text-sm mt-4 font-medium">
                  {isMultiCity ? "Set dates for all destinations" : "Select travel dates to continue"}
                </p>
              )}
            </div>
          )}

          {/* Saved Itineraries Sheet */}
          <BottomSheet open={savedOpen} onOpenChange={setSavedOpen} className="h-[92vh] max-h-[95vh] rounded-t-3xl">
            <BottomSheetHeader className="px-4 py-4 border-b bg-background/95 backdrop-blur rounded-t-3xl">
              <div className="text-base font-semibold">Saved Itineraries</div>
            </BottomSheetHeader>
            <BottomSheetContent className="p-0">
              <div className="p-4">
                <SavedItinerariesSection onLoadItinerary={(it) => { handleLoadItinerary(it); setSavedOpen(false); }} />
              </div>
            </BottomSheetContent>
          </BottomSheet>
        </div>
      );
    }
    
    // Desktop version remains unchanged
    return <div className="w-full px-4 lg:px-6 space-y-6">
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
                {/* ... keep existing code (all the existing desktop content) */}
                <div className="flex items-center justify-center space-x-2">
                  <Switch id="multi-city" checked={isMultiCity} onCheckedChange={setIsMultiCity} />
                  <Label htmlFor="multi-city">Multi-city trip</Label>
                </div>

                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="font-medium mb-2">
                      {isMultiCity ? 'Add destinations' : 'Select destination'}
                    </h3>
                    <AmadeusCitySearch value={currentLocationSearch} onChange={setCurrentLocationSearch} onCitySelect={handleLocationSelect} placeholder={isMultiCity ? "Add another city..." : "Enter city name"} className="max-w-md mx-auto" />
                  </div>

                  {locations.length > 0 && <div className="space-y-3">
                      <h4 className="font-medium text-sm text-center">Selected destinations:</h4>
                      {locations.map(location => <div key={location.id} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
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
                             {isMultiCity && <div className="flex flex-col items-center gap-2">
                                 <div className="flex items-center space-x-2">
                                   <Switch id={`length-of-stay-${location.id}`} checked={locationLengthOfStay[location.id] || false} onCheckedChange={checked => {
                            setLocationLengthOfStay(prev => ({
                              ...prev,
                              [location.id]: checked
                            }));
                            if (checked) {
                              setLocationNights(prev => ({
                                ...prev,
                                [location.id]: prev[location.id] || 1
                              }));
                            }
                          }} />
                                   <Label htmlFor={`length-of-stay-${location.id}`} className="text-xs">
                                     Use nights
                                   </Label>
                                 </div>
                                 
                                 {locationLengthOfStay[location.id] ? (
                        <div className="w-32 space-y-2">
                                     <Slider value={[locationNights[location.id] || 1]} onValueChange={value => {
                            const nights = value[0];
                            setLocationNights(prev => ({
                              ...prev,
                              [location.id]: nights
                            }));
                            const startDate = startOfDay(new Date());
                            const endDate = addDays(startDate, nights);
                            updateLocationDates(location.id, startDate, endDate);
                          }} max={30} min={1} step={1} className="w-full" />
                                     <div className="text-center text-xs">
                                       <span className="font-semibold">{locationNights[location.id] || 1}</span>
                                       <span className="text-muted-foreground ml-1">
                                         {(locationNights[location.id] || 1) === 1 ? 'night' : 'nights'}
                                       </span>
                                     </div>
                                   </div>) : (
                        <Popover>
                                     <PopoverTrigger asChild>
                                       <Button variant="outline" size="sm" className={cn("text-xs", (!location.startDate || !location.endDate) && "text-muted-foreground")}>
                                         <CalendarIcon className="w-3 h-3 mr-1" />
                                         {location.startDate && location.endDate ? `${format(location.startDate, 'MMM dd')} - ${format(location.endDate, 'MMM dd')}` : 'Select dates'}
                                       </Button>
                                     </PopoverTrigger>
                                     <PopoverContent className="w-auto p-0" align="start">
                                       <CalendarComponent mode="range" selected={{
                              from: location.startDate,
                              to: location.endDate
                            }} onSelect={range => {
                              updateLocationDates(location.id, range?.from || null, range?.to || null);
                            }} initialFocus className={cn("p-3 pointer-events-auto")} />
                                     </PopoverContent>
                                   </Popover>)}
                               </div>}
                            <Button variant="ghost" size="sm" onClick={() => removeLocation(location.id)} className="text-muted-foreground hover:text-destructive">
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>)}
                    </div>}
                </div>

                {!isMultiCity && locations.length > 0 && <div className="space-y-4">
                    <h3 className="font-medium text-center">Select travel dates</h3>
                    
                    <div className="flex items-center justify-center space-x-2">
                      <Switch id="length-of-stay" checked={useLengthOfStay} onCheckedChange={setUseLengthOfStay} />
                      <Label htmlFor="length-of-stay">Use length of stay instead</Label>
                    </div>

                    <div className="max-w-md mx-auto">
                      {useLengthOfStay ? <div className="space-y-4">
                          <div className="text-center">
                            <Label className="text-sm font-medium">Number of nights</Label>
                            <div className="mt-2 space-y-3">
                              <Slider value={[numberOfNights]} onValueChange={value => setNumberOfNights(value[0])} max={30} min={1} step={1} className="w-full" />
                              <div className="text-center">
                                <span className="text-lg font-semibold">{numberOfNights}</span>
                                <span className="text-sm text-muted-foreground ml-1">
                                  {numberOfNights === 1 ? 'night' : 'nights'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div> : <DateRangePicker startDate={dateRange.start} endDate={dateRange.end} onDateRangeChange={handleDateRangeChange} />}
                    </div>
                  </div>}

                {canCreateItinerary && <div className="flex justify-center pt-4">
                    <Button onClick={isMultiCity ? () => {
                  createMultiCityItinerary();
                  setHasCreatedItinerary(true);
                } : () => {
                  if (useLengthOfStay) {
                    const startDate = startOfDay(new Date());
                    const endDate = addDays(startDate, numberOfNights);
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
                      userId: user?.id
                    };
                    setCurrentItinerary(newItinerary);
                    setDateRange({ start: startDate, end: endDate });
                    setHasCreatedItinerary(true);
                    setWasCreatedWithLengthOfStay(true);
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
                      userId: user?.id
                    };
                    setCurrentItinerary(newItinerary);
                    setHasCreatedItinerary(true);
                  }
                }} className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4" />
                      Create Itinerary
                    </Button>
                  </div>}

                {!canCreateItinerary && locations.length > 0 && <div className="text-center text-muted-foreground text-sm">
                    {isMultiCity ? "Select dates for each destination to create your itinerary" : "Select travel dates to create your itinerary"}
                  </div>}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="saved" className="mt-6">
            <SavedItinerariesSection onLoadItinerary={handleLoadItinerary} />
          </TabsContent>
        </Tabs>
      </div>;
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
  
  return <div className="w-full px-2 lg:px-4 space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-center mb-6">
          <div className="inline-flex p-1 bg-muted/60 rounded-lg border border-border/50">
            <TabsList className="bg-transparent h-auto p-0 gap-1">
              <TabsTrigger 
                value="builder" 
                className="px-4 py-2 text-sm font-medium rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
              >
                Itinerary Builder
              </TabsTrigger>
              <TabsTrigger 
                value="saved" 
                className="px-4 py-2 text-sm font-medium rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Saved Itineraries
              </TabsTrigger>
            </TabsList>
          </div>
        </div>
        
        <TabsContent value="builder" className="mt-6 space-y-6">
          {/* Header with date range and actions */}
          <div className="lg:rounded-lg lg:border lg:shadow-sm rounded-none border-0 shadow-none relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen lg:left-auto lg:right-auto lg:ml-0 lg:mr-0 lg:w-auto">
            {/* Mobile: Collapsible Dropdown */}
            <div className="lg:hidden relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen px-4">
              <Collapsible>
                <CollapsibleTrigger className="modern-accordion-trigger">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base text-foreground truncate">{currentItinerary?.title}</span>
                        {currentItinerary?.isMultiCity && <Badge variant="secondary" className="text-xs px-2 py-1 rounded-full">Multi-city</Badge>}
                      </div>
                    </div>
                  </div>
                  <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200" />
                </CollapsibleTrigger>
                <CollapsibleContent className="animate-accordion-down">
                  <div className="mt-2 p-6 space-y-6 bg-muted/20 border border-border/20 rounded-xl shadow-sm">
                    
                    {/* Travel Period Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 border border-gray-200 dark:border-slate-600 rounded-lg">
                            <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Travel Period</h3>
                        </div>
                        {!(wasCreatedWithLengthOfStay || useLengthOfStay || Object.keys(locationLengthOfStay).some(id => locationLengthOfStay[id])) && <div className="shrink-0">
                            <DateRangePicker startDate={dateRange.start} endDate={dateRange.end} onDateRangeChange={handleDateRangeChange} />
                          </div>}
                      </div>
                      
                      <div className="space-y-2">
                        {dateRange.start && dateRange.end ? <>
                            {wasCreatedWithLengthOfStay || useLengthOfStay || Object.keys(locationLengthOfStay).some(id => locationLengthOfStay[id]) ? 
                              <div className="text-2xl font-bold text-gray-900 dark:text-white">{tripDays} {tripDays === 1 ? 'Night' : 'Nights'}</div> : 
                              <>
                                <div className="text-xl font-semibold text-gray-900 dark:text-white">
                                  {format(dateRange.start, 'MMM do')} – {format(dateRange.end, 'MMM do')}
                                </div>
                                <div className="inline-flex items-center px-3 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-full text-sm font-medium text-blue-700 dark:text-blue-300">
                                  {tripDays} {tripDays === 1 ? 'day' : 'days'} total
                                </div>
                              </>
                            }
                          </> : 
                          <div className="text-gray-500 dark:text-gray-400">Tap to select your travel dates</div>
                        }
                      </div>
                    </div>
                    
                    {/* Divider */}
                    <div className="h-px bg-gray-200 dark:bg-slate-700"></div>
                    
                    {/* Destinations Section */}
                    {currentItinerary?.locations && currentItinerary.locations.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Destinations</h3>
                        <div className="flex flex-wrap gap-2">
                          {currentItinerary.locations.map((location) => (
                            <div 
                              key={location.id} 
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                              {location.name}
                              {location.iataCode && (
                                <span className="text-gray-500 dark:text-gray-400">({location.iataCode})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Divider */}
                    <div className="h-px bg-gray-200 dark:bg-slate-700"></div>
                    
                    {/* Quick Actions Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => setIsSaveDialogOpen(true)}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
                        >
                          <Save className="w-4 h-4" />
                          {currentItinerary?.id ? 'Update' : 'Save'}
                        </button>
                        
                        <button 
                          onClick={() => setIsShareDialogOpen(true)}
                          className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors duration-200"
                        >
                          <Share2 className="w-4 h-4" />
                          Share
                        </button>
                        
                        <button 
                          onClick={() => setIsExportDialogOpen(true)}
                          className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors duration-200"
                        >
                          <Download className="w-4 h-4" />
                          Export
                        </button>
                        
                        <button 
                          onClick={() => {
                            localStorage.removeItem('currentItineraryBuilder');
                            setDateRange({ start: null, end: null });
                            setCurrentItinerary(null);
                            setEvents([]);
                            setLocations([]);
                            setIsMultiCity(false);
                            setHasCreatedItinerary(false);
                            setCurrentLocationSearch('');
                            setUseLengthOfStay(false);
                            setNumberOfNights(1);
                            setLocationLengthOfStay({});
                            setLocationNights({});
                            setWasCreatedWithLengthOfStay(false);
                          }}
                          className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors duration-200"
                        >
                          <Plus className="w-4 h-4" />
                          New
                        </button>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Desktop: Compact Row Design */}
            <div className="hidden lg:block">
              <Collapsible open={isDesktopSectionOpen} onOpenChange={setIsDesktopSectionOpen}>
                  <div ref={itineraryDetailsRef} className="relative rounded-xl md:rounded-2xl bg-card/80 supports-[backdrop-filter]:bg-card/60 backdrop-blur-md border border-border/60 shadow-lg ring-1 ring-border/40 animate-enter">
                
                {/* Header Section */}
                <CollapsibleTrigger asChild>
                  <div className="relative z-10 px-4 md:px-6 py-4 md:py-5 border-b border-border/50 cursor-pointer hover:bg-muted/40 transition-colors group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="p-2 bg-gradient-to-br from-primary to-primary/80 rounded-lg shadow-sm">
                          <Calendar className="w-4 h-4 text-primary-foreground" />
                        </div>
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-foreground tracking-tight">{currentItinerary?.title}</h2>
                        <p className="text-muted-foreground text-xs">Plan your perfect getaway</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {currentItinerary?.isMultiCity && <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                          Multi-city
                        </Badge>}
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform group-hover:text-foreground ${isDesktopSectionOpen ? 'rotate-180' : ''}`} />
                    </div>
                   </div>
                   </div>
                 </CollapsibleTrigger>
                
                <CollapsibleContent>
                {/* Content Grid */}
                <div className="relative z-10 p-4 md:p-6 space-y-6">
                  
                  {/* Travel Info Row Layout */}
                  <div className="flex flex-row gap-4 w-full">
                    
                    {/* Dates Section */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">Travel Timeline</h3>
                      </div>
                      
                      <div className="relative rounded-xl bg-card/80 supports-[backdrop-filter]:bg-card/60 backdrop-blur-md border border-border/50 p-4 hover:shadow-md transition-all duration-300 min-h-[80px] flex items-center justify-center ring-1 ring-border/40">
                        
                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-4">
                            <div className="text-foreground">
                              {dateRange.start && dateRange.end ? <div className="space-y-2">
                                  {wasCreatedWithLengthOfStay || useLengthOfStay || Object.keys(locationLengthOfStay).some(id => locationLengthOfStay[id]) ? <div className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                                      {tripDays} {tripDays === 1 ? 'Night' : 'Nights'}
                                    </div> : <>
                                      <div className="text-xl font-bold text-foreground">
                                        {format(dateRange.start, 'MMM do')} - {format(dateRange.end, 'MMM do')}
                                      </div>
                                      <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary">
                                        {tripDays} {tripDays === 1 ? 'day' : 'days'} adventure
                                      </Badge>
                                    </>}
                                </div> : <div className="text-muted-foreground italic text-lg">Choose your travel dates</div>}
                            </div>
                            {!(wasCreatedWithLengthOfStay || useLengthOfStay || Object.keys(locationLengthOfStay).some(id => locationLengthOfStay[id])) && <div className="shrink-0">
                                <DateRangePicker startDate={dateRange.start} endDate={dateRange.end} onDateRangeChange={handleDateRangeChange} />
                              </div>}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Destinations Section */}
                    {currentItinerary?.locations && currentItinerary.locations.length > 0 && <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 bg-gradient-to-br from-secondary/20 to-secondary/10 rounded-lg flex items-center justify-center">
                            <MapPin className="w-3 h-3 text-secondary" />
                          </div>
                          <h3 className="text-sm font-semibold text-foreground">Destinations</h3>
                          <Badge variant="outline" className="ml-auto text-xs px-1.5 py-0.5">
                            {currentItinerary.locations.length} {currentItinerary.locations.length === 1 ? 'stop' : 'stops'}
                          </Badge>
                        </div>
                        
                        <div className="relative rounded-xl bg-card/80 supports-[backdrop-filter]:bg-card/60 backdrop-blur-md border border-border/50 p-4 hover:shadow-md transition-all duration-300 min-h-[80px] ring-1 ring-border/40">
                          <div className="relative z-10 flex flex-wrap gap-2">
                            {currentItinerary.locations.map((location, index) => <div key={location.id} className="flex items-center gap-2 px-3 py-2 bg-background/60 backdrop-blur-sm rounded-md border border-border/30 hover:bg-background/80 transition-all duration-200">
                                <div className="flex items-center justify-center w-5 h-5 bg-gradient-to-br from-primary/20 to-primary/10 rounded-md">
                                  <span className="text-xs font-bold text-primary">{index + 1}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="font-semibold text-foreground text-sm">{location.name}</span>
                                  {location.iataCode && <span className="text-xs text-muted-foreground">({location.iataCode})</span>}
                                </div>
                              </div>)}
                          </div>
                        </div>
                      </div>}
                    
                    {/* Actions Section */}
                    <div className="flex-shrink-0 min-w-fit">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-accent/20 to-accent/10 rounded-lg flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">Actions</h3>
                      </div>
                      
                      <div className="flex gap-2 min-h-[80px] items-center">
                        <Button variant="outline" size="sm" onClick={() => setIsSaveDialogOpen(true)} className="group relative overflow-hidden h-9 px-3 bg-gradient-to-br from-background to-muted/30 border-border/50 hover:border-primary/40 transition-all duration-300 rounded-lg">
                          <div className="relative flex items-center gap-1.5">
                            <Save className="w-3.5 h-3.5" />
                            <span className="font-medium text-xs">{currentItinerary?.id ? 'Update' : 'Save'}</span>
                          </div>
                        </Button>
                      
                        <Button variant="outline" size="sm" onClick={() => setIsShareDialogOpen(true)} className="group relative overflow-hidden h-9 px-3 bg-gradient-to-br from-background to-muted/30 border-border/50 hover:border-primary/40 transition-all duration-300 rounded-lg">
                          <div className="relative flex items-center gap-1.5">
                            <Share2 className="w-3.5 h-3.5" />
                            <span className="font-medium text-xs">Share</span>
                          </div>
                        </Button>
                        
                        <Button variant="outline" size="sm" onClick={() => setIsExportDialogOpen(true)} className="group relative overflow-hidden h-9 px-3 bg-gradient-to-br from-background to-muted/30 border-border/50 hover:border-primary/40 transition-all duration-300 rounded-lg">
                          <div className="relative flex items-center gap-1.5">
                            <Download className="w-3.5 h-3.5" />
                            <span className="font-medium text-xs">Export</span>
                          </div>
                        </Button>
                        
                        <Button variant="outline" size="sm" onClick={() => {
                        localStorage.removeItem('currentItineraryBuilder');
                        setDateRange({
                          start: null,
                          end: null
                        });
                        setCurrentItinerary(null);
                        setEvents([]);
                        setLocations([]);
                        setIsMultiCity(false);
                        setHasCreatedItinerary(false);
                        setCurrentLocationSearch('');
                        setUseLengthOfStay(false);
                        setNumberOfNights(1);
                        setLocationLengthOfStay({});
                        setLocationNights({});
                        setWasCreatedWithLengthOfStay(false);
                      }} className="group relative overflow-hidden h-9 px-3 bg-gradient-to-br from-background to-muted/30 border-destructive/30 hover:border-destructive/50 transition-all duration-300 rounded-lg">
                          <div className="relative flex items-center gap-1.5">
                            <Plus className="w-3.5 h-3.5" />
                            <span className="font-medium text-xs">New</span>
                          </div>
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                </div>
                </CollapsibleContent>
                </div>
                </Collapsible>
              </div>
            </div>

          {/* Trip Extension Section - Show for all trips */}
          {currentItinerary && <div className="mb-6 relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen px-4">
              <Collapsible open={isExtensionOpen} onOpenChange={setIsExtensionOpen}>
                <CollapsibleTrigger asChild>
                  <div className="cursor-pointer hover:bg-muted/30 active:scale-[0.99] transition-all duration-200 p-5 rounded-xl border border-border/50 bg-background shadow-sm group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Plus className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-base text-foreground">Extend Your Trip</h3>
                        </div>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isExtensionOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="animate-accordion-down">
                  <div className="mt-2 p-6 bg-muted/20 border border-border/20 rounded-xl shadow-sm">
                    
                    {/* Trip Planning Section */}
                    {(useLengthOfStay || wasCreatedWithLengthOfStay || Object.keys(locationLengthOfStay).some(id => locationLengthOfStay[id]) || !useLengthOfStay && !wasCreatedWithLengthOfStay && !Object.keys(locationLengthOfStay).some(id => locationLengthOfStay[id]) && dateRange.start && dateRange.end) && <div className="space-y-6">
                        
                        {/* Section Header */}
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">Trip Planning</h3>
                          <p className="text-sm text-muted-foreground mt-1">Choose your planning style</p>
                        </div>
                        
                        {/* Segmented Control - Pill Style */}
                        <div className="inline-flex bg-muted/50 p-1 rounded-xl border border-border/30">
                          <div className="flex">
                            
                            {/* Specific Dates Tab */}
                            <button onClick={() => {
                        if (useLengthOfStay || wasCreatedWithLengthOfStay || Object.keys(locationLengthOfStay).some(id => locationLengthOfStay[id])) {
                          // Convert to date-based mode
                          if (currentItinerary) {
                            setUseLengthOfStay(false);
                            setWasCreatedWithLengthOfStay(false);
                            setLocationLengthOfStay({});
                            setLocationNights({});
                            if (!dateRange.start || !dateRange.end) {
                              const startDate = startOfDay(new Date());
                              let endDate = startDate;
                              if (currentItinerary.isMultiCity) {
                                const totalNights = Object.values(locationNights).reduce((sum, nights) => sum + nights, 0) || 7;
                                endDate = addDays(startDate, totalNights);
                              } else {
                                endDate = addDays(startDate, numberOfNights);
                              }
                              setDateRange({
                                start: startDate,
                                end: endDate
                              });
                              setCurrentItinerary(prev => prev ? {
                                ...prev,
                                startDate,
                                endDate
                              } : null);
                            }
                            setHasPendingChanges(true);
                            toast.success('Switched to date planning');
                          }
                        }
                      }} className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 min-w-[120px]", !useLengthOfStay && !wasCreatedWithLengthOfStay && !Object.keys(locationLengthOfStay).some(id => locationLengthOfStay[id]) ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                              Specific Dates
                            </button>
                            
                            {/* Number of Nights Tab */}
                            <button onClick={() => {
                        if (!useLengthOfStay && !wasCreatedWithLengthOfStay && !Object.keys(locationLengthOfStay).some(id => locationLengthOfStay[id])) {
                          // Convert to length-of-stay mode
                          if (currentItinerary && dateRange.start && dateRange.end) {
                            const totalNights = differenceInDays(dateRange.end, dateRange.start);
                            if (currentItinerary.isMultiCity) {
                              const nightsPerCity = Math.max(1, Math.floor(totalNights / currentItinerary.locations.length));
                              const remainingNights = totalNights - nightsPerCity * (currentItinerary.locations.length - 1);
                              const newLocationLengthOfStay: Record<string, boolean> = {};
                              const newLocationNights: Record<string, number> = {};
                              currentItinerary.locations.forEach((location, index) => {
                                newLocationLengthOfStay[location.id] = true;
                                newLocationNights[location.id] = index === currentItinerary.locations.length - 1 ? remainingNights : nightsPerCity;
                              });
                              setLocationLengthOfStay(newLocationLengthOfStay);
                              setLocationNights(newLocationNights);
                              setWasCreatedWithLengthOfStay(true);
                            } else {
                              setUseLengthOfStay(true);
                              setNumberOfNights(totalNights);
                              setWasCreatedWithLengthOfStay(true);
                            }
                            setHasPendingChanges(true);
                            toast.success('Switched to nights planning');
                          }
                        }
                      }} className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 min-w-[120px]", useLengthOfStay || wasCreatedWithLengthOfStay || Object.keys(locationLengthOfStay).some(id => locationLengthOfStay[id]) ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                              Number of Nights
                            </button>
                            
                          </div>
                        </div>
                        
                      </div>}
                    {/* Date Selection Section */}
                    {!useLengthOfStay && !currentItinerary?.isMultiCity && !wasCreatedWithLengthOfStay && !Object.keys(locationLengthOfStay).some(id => locationLengthOfStay[id]) && <div className="space-y-6">
                        
                        {/* Date Modification Header */}
                        <div className="pt-4">
                          <h4 className="text-lg font-semibold text-foreground">Modify your trip dates</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Change your start or end date to adjust your trip
                          </p>
                        </div>
                        
                        {/* Date Pickers Grid */}
                        <div className="grid grid-cols-1 gap-4">
                          {/* Start Date Picker */}
                          <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">Start Date</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-12 rounded-xl border-border/30 bg-background hover:bg-muted/30", !pendingStartDate && "text-muted-foreground")}>
                                  <CalendarIcon className="mr-3 h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">
                                    {pendingStartDate ? format(pendingStartDate, 'MMMM do, yyyy') : 'Select start date'}
                                  </span>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent mode="single" selected={pendingStartDate} onSelect={date => {
                              if (date && (!pendingEndDate || date < pendingEndDate)) {
                                setPendingStartDate(date);
                                setHasPendingChanges(true);
                              }
                            }} disabled={date => pendingEndDate && date >= pendingEndDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                              </PopoverContent>
                            </Popover>
                          </div>
                          
                          {/* End Date Picker */}
                          <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">End Date</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-12 rounded-xl border-border/30 bg-background hover:bg-muted/30", !pendingEndDate && "text-muted-foreground")}>
                                  <CalendarIcon className="mr-3 h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">
                                    {pendingEndDate ? format(pendingEndDate, 'MMMM do, yyyy') : 'Select end date'}
                                  </span>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent mode="single" selected={pendingEndDate} onSelect={date => {
                              if (date && (!pendingStartDate || date > pendingStartDate)) {
                                setPendingEndDate(date);
                                setHasPendingChanges(true);
                              }
                            }} disabled={date => !pendingStartDate || date <= pendingStartDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                        
                        {/* Add Another City Section */}
                        <div className="pt-6 border-t border-border/20">
                          <div className="space-y-4">
                            <h4 className="text-lg font-semibold text-foreground">Add another city</h4>
                            <p className="text-sm text-muted-foreground">
                              Convert to a multi-city trip by adding destinations
                            </p>
                            <div className="relative">
                              <AmadeusCitySearch value={currentLocationSearch} onChange={setCurrentLocationSearch} onCitySelect={newLocation => {
                        const locationToAdd: TripLocation = {
                          id: newLocation.id,
                          name: newLocation.mainText,
                          country: newLocation.secondaryText.split(",").pop()?.trim() || "",
                          state: newLocation.secondaryText.split(",")[0]?.trim()
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
                            const locationsWithDates = [{
                              ...currentLocation,
                              startDate: firstCityStart,
                              endDate: firstCityEnd
                            }, {
                              ...locationToAdd,
                              startDate: secondCityStart,
                              endDate: secondCityEnd
                            }];
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
                      }} placeholder="Add another city..." className="w-full" />
                            </div>
                          </div>
                        </div>
                      </div>}

                    {/* For single city trips using length of stay */}
                {useLengthOfStay && !currentItinerary?.isMultiCity && <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Extend your stay</Label>
                      <div className="mt-2 space-y-3">
                        <Slider value={[pendingNights]} onValueChange={value => {
                        const newNights = value[0];
                        setPendingNights(newNights);
                        setHasPendingChanges(true);
                      }} max={90} min={1} step={1} className="w-full" />
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
                            <Button variant="outline" size="sm" onClick={() => {
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
                          console.log('Converting to multi-city:', {
                            city: currentLocation.name,
                            nights: numberOfNights,
                            start: startDate.toDateString(),
                            end: endDate.toDateString()
                          });

                          // Update the itinerary to multi-city
                          setCurrentItinerary(prev => prev ? {
                            ...prev,
                            isMultiCity: true,
                            locations: prev.locations.map(loc => loc.id === currentLocation.id ? {
                              ...loc,
                              startDate,
                              endDate
                            } : loc)
                          } : null);
                        }
                        // Keep useLengthOfStay true but also set multi-city mode
                      }}>
                              <Plus className="w-4 h-4 mr-2" />
                              Add City
                            </Button>
                          </div>
                        </div>
                      </div>}

                    {/* For multi-city trips - show if it's multi-city OR has length of stay locations */}
                    {currentItinerary?.isMultiCity && <div className="space-y-6">
                        {/* Date-based multi-city management */}
                        {!Object.keys(locationLengthOfStay).some(id => locationLengthOfStay[id]) ? <div className="space-y-4">
                            <div className="space-y-2">
                              <Label className="text-base font-semibold">City Schedule</Label>
                              <p className="text-sm text-muted-foreground">
                                Adjust the dates for each destination
                              </p>
                            </div>
                            <div className="space-y-3">
                              {currentItinerary.locations.map((location, index) => <div key={location.id} className="group relative border border-border/60 rounded-xl p-4 hover:border-border transition-colors bg-card/50">
                                  <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium">
                                        {index + 1}
                                      </div>
                                      <div>
                                        <h4 className="font-medium text-foreground">{location.name}</h4>
                                        <p className="text-xs text-muted-foreground">
                                          {location.startDate && location.endDate ? `${format(location.startDate, 'MMM dd')} - ${format(location.endDate, 'MMM dd')}` : 'Dates not set'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Arrival</Label>
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal", !location.startDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {location.startDate ? format(location.startDate, 'MMM dd, yyyy') : 'Select date'}
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 z-50" align="start">
                                           <CalendarComponent mode="single" selected={location.startDate} onSelect={date => {
                                  if (date && (!location.endDate || date < location.endDate)) {
                                    updateLocationDates(location.id, date, location.endDate);
                                    setHasPendingChanges(true);
                                  }
                                }} disabled={date => location.endDate && date >= location.endDate} initialFocus className="p-3 pointer-events-auto" />
                                        </PopoverContent>
                                      </Popover>
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Departure</Label>
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal", !location.endDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {location.endDate ? format(location.endDate, 'MMM dd, yyyy') : 'Select date'}
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 z-50" align="start">
                                           <CalendarComponent mode="single" selected={location.endDate} onSelect={date => {
                                  if (date && (!location.startDate || date > location.startDate)) {
                                    updateLocationDates(location.id, location.startDate, date);
                                    setHasPendingChanges(true);
                                  }
                                }} disabled={date => !location.startDate || date <= location.startDate} initialFocus className="p-3 pointer-events-auto" />
                                        </PopoverContent>
                                      </Popover>
                                    </div>
                                  </div>
                                </div>)}
                            </div>
                          </div> : (/* Length-of-stay based multi-city management */
                  <div className="space-y-4">
                            <div className="space-y-2">
                              <Label className="text-base font-semibold">Stay Duration</Label>
                              <p className="text-sm text-muted-foreground">
                                Adjust how many nights you'll spend in each city
                              </p>
                            </div>
                            <div className="space-y-3">
                              {currentItinerary.locations.map((location, index) => locationLengthOfStay[location.id] && <div key={location.id} className="group relative border border-border/60 rounded-xl p-4 hover:border-border transition-colors bg-card/50">
                                    <div className="flex items-center justify-between mb-4">
                                      <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium">
                                          {index + 1}
                                        </div>
                                        <div>
                                          <h4 className="font-medium text-foreground">{location.name}</h4>
                                          <p className="text-xs text-muted-foreground">
                                            {pendingLocationNights[location.id] || locationNights[location.id] || 1} {(pendingLocationNights[location.id] || locationNights[location.id] || 1) === 1 ? "night" : "nights"}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-lg font-semibold text-foreground">
                                          {pendingLocationNights[location.id] || locationNights[location.id] || 1}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {(pendingLocationNights[location.id] || locationNights[location.id] || 1) === 1 ? "night" : "nights"}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="space-y-3">
                                      <Slider value={[pendingLocationNights[location.id] || locationNights[location.id] || 1]} onValueChange={value => {
                            const nights = value[0];
                            setPendingLocationNights(prev => ({
                              ...prev,
                              [location.id]: nights
                            }));
                            setHasPendingChanges(true);
                          }} max={30} min={1} step={1} className="w-full" />
                                      <div className="flex justify-between text-xs text-muted-foreground">
                                        
                                        <span>30 nights</span>
                                      </div>
                                    </div>
                                  </div>)}
                            </div>
                          </div>)}

                    {/* Add another city to multi-city trip */}
                    <div className="pt-4 border-t">
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Add another city</Label>
                        
                        <AmadeusCitySearch value={currentLocationSearch} onChange={setCurrentLocationSearch} onCitySelect={newLocation => {
                        const locationToAdd: TripLocation = {
                          id: newLocation.id,
                          name: newLocation.mainText,
                          country: newLocation.secondaryText.split(",").pop()?.trim() || "",
                          state: newLocation.secondaryText.split(",")[0]?.trim()
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
                          const updatedNights = {
                            ...locationNights,
                            [locationToAdd.id]: 2
                          };
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
                              return {
                                ...loc,
                                startDate,
                                endDate
                              };
                            }
                            return loc;
                          });

                          // Recalculate overall trip dates
                          const allStartDates = updatedLocations.map(loc => loc.startDate!).filter(Boolean);
                          const allEndDates = updatedLocations.map(loc => loc.endDate!).filter(Boolean);
                          const overallStart = new Date(Math.min(...allStartDates.map(d => d.getTime())));
                          const overallEnd = new Date(Math.max(...allEndDates.map(d => d.getTime())));
                          console.log('New overall trip dates after adding city:', {
                            start: overallStart.toDateString(),
                            end: overallEnd.toDateString()
                          });
                          setCurrentItinerary(prev => prev ? {
                            ...prev,
                            locations: updatedLocations,
                            startDate: overallStart,
                            endDate: overallEnd
                          } : null);

                          // Update date range
                          setDateRange({
                            start: overallStart,
                            end: overallEnd
                          });
                        }
                        setCurrentLocationSearch("");
                      }} placeholder="Add another city..." className="w-full" />
                      </div>
                    </div>
                  </div>}
                
                {/* Apply Changes Button */}
                {hasPendingChanges && <div className="flex justify-center pt-4 border-t">
                    <Button onClick={applyPendingChanges} className="flex items-center gap-2">
                      Apply Changes
                    </Button>
                  </div>}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>}

          {/* Hotels and Flights Section - Moved to top */}
          <HotelFlightSection locations={currentItinerary?.locations || []} isMultiCity={currentItinerary?.isMultiCity || false} hotels={hotels} flights={flights} onAddHotel={handleAddHotel} onAddFlight={handleAddFlight} onRemoveHotel={handleRemoveHotel} onRemoveFlight={handleRemoveFlight} />

          {/* Map Button - Desktop */}
          <div className="hidden lg:block mb-6">
            <ItineraryMapButton events={events} onOpenMap={() => setIsMapOpen(true)} />
          </div>

          {/* Trip Calendar */}
          <TripCalendar startDate={dateRange.start!} endDate={dateRange.end!} events={events} locations={currentItinerary?.locations || []} hotels={hotels} isMultiCity={currentItinerary?.isMultiCity || false} useLengthOfStay={wasCreatedWithLengthOfStay || useLengthOfStay || Object.keys(locationLengthOfStay).some(id => locationLengthOfStay[id])} onAddEvent={handleAddEvent} onEditEvent={handleEditEvent} onDeleteEvent={handleDeleteEvent} />
        </TabsContent>
        
        
        <TabsContent value="saved" className="mt-6">
          <SavedItinerariesSection onLoadItinerary={handleLoadItinerary} />
        </TabsContent>
      </Tabs>

      {/* Event Dialog */}
      <EventDialog isOpen={isEventDialogOpen} onClose={() => {
      setIsEventDialogOpen(false);
      setEditingEvent(null);
      setSelectedDate(null);
    }} onSave={handleSaveEvent} selectedDate={selectedDate} editingEvent={editingEvent} availableDates={dateRange.start && dateRange.end ? eachDayOfInterval({
      start: dateRange.start,
      end: dateRange.end
    }).map(date => format(date, 'yyyy-MM-dd')) : []} />

      {/* Share Dialog */}
      <ShareItineraryDialog isOpen={isShareDialogOpen} onClose={() => setIsShareDialogOpen(false)} itinerary={currentItinerary} />

      {/* Export Dialog */}
      <ExportItineraryDialog isOpen={isExportDialogOpen} onClose={() => setIsExportDialogOpen(false)} itinerary={currentItinerary} />

      {/* Save Dialog */}
      <SaveItineraryDialog isOpen={isSaveDialogOpen} onClose={() => setIsSaveDialogOpen(false)} onSave={handleSaveItinerary} currentTitle={currentItinerary?.title || ''} isUpdate={!!currentItinerary?.id} />

      {/* Map View */}
      <ItineraryMapView events={events} hotels={hotels} isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} />

      {/* Mobile Map Button - Only show on builder tab and when map is not open */}
      {activeTab === "builder" && !isMapOpen && (
        <ItineraryMapButton events={events} onOpenMap={() => setIsMapOpen(true)} />
      )}
    </div>;
}