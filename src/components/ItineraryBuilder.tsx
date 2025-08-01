import { useState, useEffect } from 'react';
import { addDays, format, startOfDay, differenceInDays, eachDayOfInterval } from 'date-fns';
import { Calendar, Plus, Download, Share2, Save, CalendarDays, MapPin, X, CalendarIcon, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
        };
      }
    } catch (error) {
      console.error('Error loading persisted state:', error);
    }
    return null;
  };

  const persistedState = loadPersistedState();
  
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

  // Persist state to localStorage whenever key state changes
  useEffect(() => {
    const stateToSave = {
      dateRange,
      currentItinerary,
      events,
      hotels,
      flights,
      locations,
      isMultiCity,
      hasCreatedItinerary,
    };
    localStorage.setItem('currentItineraryBuilder', JSON.stringify(stateToSave));
  }, [dateRange, currentItinerary, events, hotels, flights, locations, isMultiCity, hasCreatedItinerary]);

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
    if (!locations.every(loc => loc.startDate && loc.endDate)) return;
    
    // Calculate overall trip dates from all locations
    const allStartDates = locations.map(loc => loc.startDate!);
    const allEndDates = locations.map(loc => loc.endDate!);
    const overallStart = new Date(Math.min(...allStartDates.map(d => d.getTime())));
    const overallEnd = new Date(Math.max(...allEndDates.map(d => d.getTime())));
    
    const locationNames = locations.map(loc => loc.name).join(' → ');
    const title = `Multi-City: ${locationNames}`;
    
    const newItinerary: Itinerary = {
      title,
      startDate: overallStart,
      endDate: overallEnd,
      locations,
      isMultiCity: true,
      events: [],
      hotels: [],
      flights: [],
      userId: user?.id,
    };
    setCurrentItinerary(newItinerary);
    setDateRange({ start: overallStart, end: overallEnd });
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
    setLocations(prev => prev.map(loc => 
      loc.id === locationId 
        ? { ...loc, startDate: startDate || undefined, endDate: endDate || undefined }
        : loc
    ));
  };

  // Removed auto-creation - now requires manual button click

  const canCreateItinerary = isMultiCity 
    ? locations.length > 0 && locations.every(loc => loc.startDate && loc.endDate)
    : dateRange.start && dateRange.end && locations.length > 0;

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
                              <div className="flex items-center gap-2">
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
                    <div className="max-w-md mx-auto">
                      <DateRangePicker
                        startDate={dateRange.start}
                        endDate={dateRange.end}
                        onDateRangeChange={handleDateRangeChange}
                      />
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
                        if (dateRange.start && dateRange.end && locations.length > 0) {
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
                        <span>{format(dateRange.start, 'MMM do')} - {format(dateRange.end, 'MMM do')}</span>
                        <span className="text-xs">({tripDays} {tripDays === 1 ? 'day' : 'days'})</span>
                      </div>
                    ) : (
                      'Dates not set'
                    )}
                  </div>
                  <div className="sm:ml-auto">
                    <DateRangePicker
                      startDate={dateRange.start}
                      endDate={dateRange.end}
                      onDateRangeChange={handleDateRangeChange}
                    />
                  </div>
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
                  }}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Start New Itinerary
                </Button>
              </div>
            </CardContent>
          </Card>

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