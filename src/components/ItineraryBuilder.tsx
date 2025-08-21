import { useState, useEffect, useMemo } from 'react';
import { addDays, format, startOfDay, differenceInDays, eachDayOfInterval } from 'date-fns';
import { 
  Calendar, Plus, Download, Share2, Save, CalendarDays, MapPin, X, CalendarIcon, 
  BookOpen, GripVertical, ChevronDown, Hotel, Plane, Camera, Clock, 
  Map, Users, Star, ArrowRight, Edit3, Trash2, ChevronRight 
} from 'lucide-react';
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
import { useIsMobile } from '@/hooks/useIsMobile';

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
  const { user } = useAuth();
  const { saveItinerary, updateItinerary } = useItineraries();
  const isMobile = useIsMobile();

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
          useLengthOfStay: parsed.useLengthOfStay || false,
          locationLengthOfStay: parsed.locationLengthOfStay || {},
          locationNights: parsed.locationNights || {},
          numberOfNights: parsed.numberOfNights || 1,
          wasCreatedWithLengthOfStay: parsed.wasCreatedWithLengthOfStay || false
        };
      }
    } catch (error) {
      console.error('Error loading persisted state:', error);
    }
    return null;
  }, []);

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
    threshold: 0.3
  });

  const itineraryDetailsRef = useScrollAutoCollapse({
    isOpen: isDesktopSectionOpen,
    onClose: () => setIsDesktopSectionOpen(false),
    threshold: 0.3
  });

  // Persist state to localStorage whenever key state changes
  useEffect(() => {
    const stateToSave = {
      dateRange,
      currentItinerary,
      events: events.map(event => ({
        ...event,
        restaurantData: event.restaurantData ? {
          name: event.restaurantData.name,
          address: event.restaurantData.address,
          placeId: event.restaurantData.placeId,
          phone: event.restaurantData.phone,
          website: event.restaurantData.website,
          latitude: event.restaurantData.latitude,
          longitude: event.restaurantData.longitude
        } : undefined,
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
    const allStartDates = locationsWithDates.map(loc => loc.startDate!).filter(Boolean);
    const allEndDates = locationsWithDates.map(loc => loc.endDate!).filter(Boolean);
    if (allStartDates.length === 0 || allEndDates.length === 0) return;

    const overallStart = new Date(Math.min(...allStartDates.map(d => d.getTime())));
    const overallEnd = new Date(Math.max(...allEndDates.map(d => d.getTime())));

    const itinerary: Itinerary = {
      title: `Multi-City Trip: ${locationsWithDates.map(l => l.name).join(', ')}`,
      startDate: overallStart,
      endDate: overallEnd,
      locations: locationsWithDates,
      isMultiCity: true,
      events: [],
      hotels: [],
      flights: [],
      wasCreatedWithLengthOfStay
    };

    setCurrentItinerary(itinerary);
    setDateRange({
      start: overallStart,
      end: overallEnd
    });
    setHasCreatedItinerary(true);
    setEvents([]);
    setHotels([]);
    setFlights([]);
    
    toast.success('Multi-city itinerary created!');
  };

  const updateLocationDates = (locationId: string, startDate: Date, endDate: Date) => {
    setLocations(prev => prev.map(loc => 
      loc.id === locationId 
        ? { ...loc, startDate, endDate }
        : loc
    ));
  };

  const addLocation = (location: LocationSuggestion) => {
    const newLocation: TripLocation = {
      id: crypto.randomUUID(),
      name: location.mainText,
      country: location.secondaryText,
      state: location.secondaryText.includes(',') ? location.secondaryText.split(',')[0] : undefined
    };
    setLocations(prev => [...prev, newLocation]);
    setCurrentLocationSearch('');
  };

  const removeLocation = (locationId: string) => {
    setLocations(prev => prev.filter(loc => loc.id !== locationId));
    setLocationLengthOfStay(prev => {
      const newState = { ...prev };
      delete newState[locationId];
      return newState;
    });
    setLocationNights(prev => {
      const newState = { ...prev };
      delete newState[locationId];
      return newState;
    });
  };

  const canCreateItinerary = isMultiCity 
    ? locations.length > 0 && locations.every(loc => 
        !locationLengthOfStay[loc.id] || (locationLengthOfStay[loc.id] && locationNights[loc.id] > 0)
      )
    : ((dateRange.start && dateRange.end) || (useLengthOfStay && locations.length > 0 && numberOfNights > 0));

  const createSingleCityItinerary = () => {
    if (!canCreateItinerary) return;

    let startDate: Date;
    let endDate: Date;

    if (useLengthOfStay && locations.length > 0) {
      // Use today as start date for length of stay
      startDate = startOfDay(new Date());
      endDate = addDays(startDate, numberOfNights);
    } else if (dateRange.start && dateRange.end) {
      startDate = dateRange.start;
      endDate = dateRange.end;
    } else {
      return;
    }

    const itinerary: Itinerary = {
      title: locations.length > 0 
        ? `Trip to ${locations[0].name}` 
        : `Trip ${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd')}`,
      startDate,
      endDate,
      locations: locations.length > 0 ? locations : [],
      isMultiCity: false,
      events: [],
      hotels: [],
      flights: [],
      wasCreatedWithLengthOfStay
    };

    setCurrentItinerary(itinerary);
    setDateRange({ start: startDate, end: endDate });
    setHasCreatedItinerary(true);
    setEvents([]);
    setHotels([]);
    setFlights([]);
    
    toast.success('Itinerary created!');
  };

  const renderDesktopView = () => {
    if (!hasCreatedItinerary) {
      return (
        <div className="max-w-4xl mx-auto">
          {/* Modern Welcome Card */}
          <div className="bg-gradient-to-br from-white/90 to-white/60 dark:from-card/90 dark:to-card/60 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-border/20 shadow-2xl p-8 lg:p-12 mb-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-6">
                <CalendarDays className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
                Start Planning Your Journey
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Create amazing travel experiences with our intelligent planning tools
              </p>
            </div>

            <div className="grid gap-8">
              {/* Trip Type Toggle */}
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-4 bg-white/80 dark:bg-card/80 rounded-2xl p-2 border border-white/30 dark:border-border/30">
                  <Label 
                    htmlFor="multi-city" 
                    className={cn(
                      "px-6 py-3 rounded-xl font-semibold cursor-pointer transition-all duration-300",
                      !isMultiCity 
                        ? "bg-primary text-primary-foreground shadow-lg" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setIsMultiCity(false)}
                  >
                    Single Destination
                  </Label>
                  <Switch 
                    id="multi-city" 
                    checked={isMultiCity} 
                    onCheckedChange={setIsMultiCity}
                    className="data-[state=checked]:bg-primary"
                  />
                  <Label 
                    htmlFor="multi-city" 
                    className={cn(
                      "px-6 py-3 rounded-xl font-semibold cursor-pointer transition-all duration-300",
                      isMultiCity 
                        ? "bg-primary text-primary-foreground shadow-lg" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setIsMultiCity(true)}
                  >
                    Multi-City Adventure
                  </Label>
                </div>
              </div>

              {/* Destinations Section */}
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    {isMultiCity ? 'Add Your Destinations' : 'Choose Your Destination'}
                  </h3>
                  <p className="text-muted-foreground">
                    {isMultiCity 
                      ? 'Build an epic journey across multiple cities' 
                      : 'Where would you like to explore?'
                    }
                  </p>
                </div>

                <div className="max-w-lg mx-auto">
                  <AmadeusCitySearch
                    value={currentLocationSearch}
                    onChange={setCurrentLocationSearch}
                    onCitySelect={addLocation}
                    placeholder={isMultiCity ? "Add a destination..." : "Search destinations..."}
                    className="w-full h-14 text-lg rounded-2xl border-2 border-border/30 bg-white/80 dark:bg-card/80 backdrop-blur-sm"
                  />
                </div>

                {/* City Cards */}
                {locations.length > 0 && (
                  <div className="grid gap-4 max-w-2xl mx-auto">
                    {locations.map((location, index) => (
                      <div 
                        key={location.id}
                        className="group bg-white/90 dark:bg-card/90 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-border/20 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                              <MapPin className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <h4 className="text-xl font-bold text-foreground">{location.name}</h4>
                              <p className="text-muted-foreground">{location.country}</p>
                              {isMultiCity && location.startDate && location.endDate && (
                                <p className="text-sm text-primary font-medium">
                                  {format(location.startDate, 'MMM dd')} - {format(location.endDate, 'MMM dd')}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isMultiCity && (
                              <div className="flex items-center gap-3">
                                <Switch
                                  checked={locationLengthOfStay[location.id] || false}
                                  onCheckedChange={(checked) => {
                                    setLocationLengthOfStay(prev => ({
                                      ...prev,
                                      [location.id]: checked
                                    }));
                                    if (checked && !locationNights[location.id]) {
                                      setLocationNights(prev => ({
                                        ...prev,
                                        [location.id]: 3
                                      }));
                                    }
                                  }}
                                />
                                {locationLengthOfStay[location.id] && (
                                  <div className="flex items-center gap-2 bg-primary/10 rounded-xl px-4 py-2">
                                    <Clock className="w-4 h-4 text-primary" />
                                    <span className="text-sm font-medium text-primary">
                                      {locationNights[location.id] || 3} nights
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLocation(location.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Length of Stay Slider for Multi-City */}
                        {isMultiCity && locationLengthOfStay[location.id] && (
                          <div className="mt-6 pt-6 border-t border-border/20">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Length of Stay</Label>
                                <span className="text-sm text-muted-foreground">
                                  {locationNights[location.id] || 3} {(locationNights[location.id] || 3) === 1 ? 'night' : 'nights'}
                                </span>
                              </div>
                              <Slider
                                value={[locationNights[location.id] || 3]}
                                onValueChange={(value) => {
                                  const nights = value[0];
                                  setLocationNights(prev => ({
                                    ...prev,
                                    [location.id]: nights
                                  }));
                                  
                                  // Auto-calculate dates for this location
                                  if (index === 0) {
                                    const startDate = startOfDay(new Date());
                                    const endDate = addDays(startDate, nights);
                                    updateLocationDates(location.id, startDate, endDate);
                                  } else {
                                    // Calculate based on previous location's end date
                                    const prevLocation = locations[index - 1];
                                    if (prevLocation.endDate) {
                                      const startDate = new Date(prevLocation.endDate);
                                      const endDate = addDays(startDate, nights);
                                      updateLocationDates(location.id, startDate, endDate);
                                    }
                                  }
                                }}
                                max={14}
                                min={1}
                                step={1}
                                className="flex-1"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Single City Options */}
              {!isMultiCity && locations.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-center">
                    <div className="flex items-center gap-4 bg-white/80 dark:bg-card/80 rounded-2xl p-2 border border-white/30 dark:border-border/30">
                      <Label 
                        className={cn(
                          "px-6 py-3 rounded-xl font-semibold cursor-pointer transition-all duration-300",
                          !useLengthOfStay 
                            ? "bg-primary text-primary-foreground shadow-lg" 
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => setUseLengthOfStay(false)}
                      >
                        Pick Dates
                      </Label>
                      <Switch 
                        checked={useLengthOfStay} 
                        onCheckedChange={setUseLengthOfStay}
                        className="data-[state=checked]:bg-primary"
                      />
                      <Label 
                        className={cn(
                          "px-6 py-3 rounded-xl font-semibold cursor-pointer transition-all duration-300",
                          useLengthOfStay 
                            ? "bg-primary text-primary-foreground shadow-lg" 
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => setUseLengthOfStay(true)}
                      >
                        Set Duration
                      </Label>
                    </div>
                  </div>

                  {!useLengthOfStay ? (
                    <div className="max-w-md mx-auto">
                      <DateRangePicker
                        dateRange={dateRange}
                        onDateRangeChange={handleDateRangeChange}
                        className="w-full"
                      />
                    </div>
                  ) : (
                    <div className="max-w-md mx-auto space-y-4">
                      <div className="bg-white/80 dark:bg-card/80 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-border/20 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <Label className="text-lg font-semibold">Trip Duration</Label>
                          <span className="text-2xl font-bold text-primary">
                            {numberOfNights} {numberOfNights === 1 ? 'night' : 'nights'}
                          </span>
                        </div>
                        <Slider
                          value={[numberOfNights]}
                          onValueChange={(value) => setNumberOfNights(value[0])}
                          max={14}
                          min={1}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-sm text-muted-foreground mt-2">
                          <span>1 night</span>
                          <span>14 nights</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Create Itinerary Button */}
              {canCreateItinerary && (
                <div className="text-center pt-8">
                  <Button
                    onClick={isMultiCity ? createMultiCityItinerary : createSingleCityItinerary}
                    size="lg"
                    className="px-12 py-6 text-lg font-semibold rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
                  >
                    <CalendarDays className="w-6 h-6 mr-3" />
                    Create Your Itinerary
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (!currentItinerary) return null;

    return (
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Modern Trip Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-3xl border border-primary/20 p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
                {currentItinerary.title}
              </h2>
              <div className="flex items-center gap-6 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span className="font-medium">
                    {format(currentItinerary.startDate, 'MMM dd, yyyy')} - {format(currentItinerary.endDate, 'MMM dd, yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <span>{tripDays} {tripDays === 1 ? 'day' : 'days'}</span>
                </div>
                {currentItinerary.locations.length > 0 && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    <span>{currentItinerary.locations.length} {currentItinerary.locations.length === 1 ? 'destination' : 'destinations'}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setIsSaveDialogOpen(true)}
                className="rounded-xl border-2 hover:bg-primary/10"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsShareDialogOpen(true)}
                className="rounded-xl border-2 hover:bg-primary/10"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsExportDialogOpen(true)}
                className="rounded-xl border-2 hover:bg-primary/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <ItineraryMapButton 
                onOpenMap={() => setIsMapOpen(true)}
                className="rounded-xl bg-primary hover:bg-primary/90"
              />
            </div>
          </div>
        </div>

        {/* Trip Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hotels & Flights Section */}
            <div className="bg-white/90 dark:bg-card/90 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-border/20 shadow-xl">
              <div className="p-6 border-b border-border/20">
                <h3 className="text-2xl font-bold text-foreground mb-2">Travel Essentials</h3>
                <p className="text-muted-foreground">Manage your accommodations and transportation</p>
              </div>
              <div className="p-6">
                <HotelFlightSection 
                  currentItinerary={currentItinerary}
                  hotels={hotels}
                  flights={flights}
                  onHotelsChange={setHotels}
                  onFlightsChange={setFlights}
                />
              </div>
            </div>

            {/* Daily Itinerary */}
            <div className="bg-white/90 dark:bg-card/90 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-border/20 shadow-xl">
              <div className="p-6 border-b border-border/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-foreground mb-2">Daily Schedule</h3>
                    <p className="text-muted-foreground">Plan your activities day by day</p>
                  </div>
                  <Button
                    onClick={() => {
                      setSelectedDate(format(currentItinerary.startDate, 'yyyy-MM-dd'));
                      setIsEventDialogOpen(true);
                    }}
                    className="rounded-xl bg-primary hover:bg-primary/90"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Event
                  </Button>
                </div>
              </div>
              <div className="p-6">
                <TripCalendar
                  dateRange={dateRange}
                  events={events}
                  onEventClick={(event) => {
                    setEditingEvent(event);
                    setIsEventDialogOpen(true);
                  }}
                  onDateClick={(date) => {
                    setSelectedDate(format(date, 'yyyy-MM-dd'));
                    setIsEventDialogOpen(true);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Trip Stats */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-6">
              <h4 className="text-lg font-bold text-foreground mb-4">Trip Overview</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-semibold">{tripDays} days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Events</span>
                  <span className="font-semibold">{events.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Hotels</span>
                  <span className="font-semibold">{hotels.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Flights</span>
                  <span className="font-semibold">{flights.length}</span>
                </div>
              </div>
            </div>

            {/* Destinations */}
            {currentItinerary.locations.length > 0 && (
              <div className="bg-white/90 dark:bg-card/90 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-border/20 shadow-lg p-6">
                <h4 className="text-lg font-bold text-foreground mb-4">Destinations</h4>
                <div className="space-y-3">
                  {currentItinerary.locations.map((location, index) => (
                    <div key={location.id} className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{location.name}</p>
                        <p className="text-sm text-muted-foreground">{location.country}</p>
                        {location.startDate && location.endDate && (
                          <p className="text-xs text-primary">
                            {format(location.startDate, 'MMM dd')} - {format(location.endDate, 'MMM dd')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isMobile) {
    return (
      <div className="min-h-screen">
        {/* Mobile Header */}
        <div className="sticky top-0 z-40 backdrop-blur-xl border-b border-border/20 bg-white/80 dark:bg-card/80">
          <div className="px-4 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gradient">
                {hasCreatedItinerary && currentItinerary ? currentItinerary.title : 'Plan Your Trip'}
              </h1>
              {hasCreatedItinerary && currentItinerary && (
                <p className="text-sm text-muted-foreground">
                  {format(currentItinerary.startDate, 'MMM dd')} - {format(currentItinerary.endDate, 'MMM dd')} • {tripDays} days
                </p>
              )}
            </div>
            {hasCreatedItinerary && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSaveDialogOpen(true)}
                  className="rounded-xl"
                >
                  <Save className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsShareDialogOpen(true)}
                  className="rounded-xl"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-6">
          {renderDesktopView()}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-center mb-8">
          <TabsList className="grid grid-cols-2 bg-white/80 dark:bg-card/80 backdrop-blur-xl rounded-2xl p-1 border border-white/20 dark:border-border/20 shadow-xl">
            <TabsTrigger 
              value="builder" 
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
            >
              <CalendarDays className="w-4 h-4" />
              Plan Trip
            </TabsTrigger>
            <TabsTrigger 
              value="saved" 
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
            >
              <BookOpen className="w-4 h-4" />
              Saved Trips
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="builder" className="mt-0">
          {renderDesktopView()}
        </TabsContent>
        
        <TabsContent value="saved" className="mt-0">
          <div className="animate-fade-in-up">
            <SavedItinerariesSection onLoadItinerary={onLoadItinerary} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <EventDialog
        isOpen={isEventDialogOpen}
        onClose={() => {
          setIsEventDialogOpen(false);
          setEditingEvent(null);
          setSelectedDate(null);
        }}
        onSaveEvent={(event) => {
          if (editingEvent) {
            setEvents(prev => prev.map(e => e.id === editingEvent.id ? event : e));
          } else {
            setEvents(prev => [...prev, event]);
          }
        }}
        selectedDate={selectedDate}
        editingEvent={editingEvent}
        locations={currentItinerary?.locations || []}
      />

      <ShareItineraryDialog
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
        itinerary={currentItinerary}
      />

      <ExportItineraryDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        itinerary={currentItinerary}
      />

      <SaveItineraryDialog
        isOpen={isSaveDialogOpen}
        onClose={() => setIsSaveDialogOpen(false)}
        itinerary={currentItinerary}
        onSave={async (title) => {
          if (!currentItinerary || !user) return;
          
          try {
            const itineraryToSave = {
              ...currentItinerary,
              title,
              userId: user.id
            };
            
            if (currentItinerary.id) {
              await updateItinerary(currentItinerary.id, itineraryToSave);
              toast.success('Itinerary updated successfully!');
            } else {
              await saveItinerary(itineraryToSave);
              toast.success('Itinerary saved successfully!');
            }
          } catch (error) {
            console.error('Error saving itinerary:', error);
            toast.error('Failed to save itinerary');
          }
        }}
      />

      {isMapOpen && currentItinerary && (
        <ItineraryMapView
          isOpen={isMapOpen}
          onClose={() => setIsMapOpen(false)}
          itinerary={currentItinerary}
          events={events}
          hotels={hotels}
        />
      )}
    </div>
  );
}
