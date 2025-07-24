import { useState, useEffect } from 'react';
import { addDays, format, startOfDay, differenceInDays } from 'date-fns';
import { Calendar, Plus, Download, Share2, Save, CalendarDays, MapPin, X, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker } from '@/components/DateRangePicker';
import { TripCalendar } from '@/components/TripCalendar';
import { EventDialog } from '@/components/EventDialog';
import { ShareItineraryDialog } from '@/components/ShareItineraryDialog';
import { ExportItineraryDialog } from '@/components/ExportItineraryDialog';
import { SaveItineraryDialog } from '@/components/SaveItineraryDialog';
import { AmadeusCitySearch } from '@/components/AmadeusCitySearch';
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
  type: 'restaurant' | 'activity' | 'flight' | 'hotel' | 'other';
  restaurantData?: {
    name: string;
    address: string;
    placeId?: string;
    phone?: string;
    website?: string;
  };
  flightData?: {
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
    duration?: string;
    price?: string;
    bookingUrl?: string;
  };
  hotelData?: {
    name: string;
    address: string;
    rating?: number;
    priceRange?: string;
    amenities?: string[];
    website?: string;
    bookingUrl?: string;
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

export interface Itinerary {
  id?: string;
  title: string;
  startDate: Date;
  endDate: Date;
  locations: TripLocation[];
  isMultiCity: boolean;
  events: ItineraryEvent[];
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function ItineraryBuilder() {
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
      locations,
      isMultiCity,
      hasCreatedItinerary,
    };
    localStorage.setItem('currentItineraryBuilder', JSON.stringify(stateToSave));
  }, [dateRange, currentItinerary, events, locations, isMultiCity, hasCreatedItinerary]);

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

  const handleSaveEvent = (eventData: Omit<ItineraryEvent, 'id'>) => {
    if (editingEvent) {
      // Update existing event
      setEvents(prev => prev.map(event => 
        event.id === editingEvent.id 
          ? { ...eventData, id: editingEvent.id }
          : event
      ));
      toast.success('Event updated successfully');
    } else {
      // Add new event
      const newEvent: ItineraryEvent = {
        ...eventData,
        id: crypto.randomUUID(),
      };
      setEvents(prev => [...prev, newEvent]);
      toast.success('Event added successfully');
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

  // Update current itinerary events when events change
  useEffect(() => {
    if (currentItinerary) {
      setCurrentItinerary(prev => prev ? { ...prev, events } : null);
    }
  }, [events]);

  if (!hasCreatedItinerary) {
    return (
      <div className="space-y-6">
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with date range and actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {currentItinerary?.title}
              </CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  {dateRange.start && dateRange.end ? (
                    <>
                      {format(dateRange.start, 'MMM do')} - {format(dateRange.end, 'MMM do')} 
                      ({tripDays} {tripDays === 1 ? 'day' : 'days'})
                    </>
                  ) : (
                    'Dates not set'
                  )}
                </span>
                {currentItinerary?.isMultiCity && (
                  <Badge variant="outline">Multi-city</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {currentItinerary?.locations.map((location, index) => (
                  <Badge key={location.id} variant="secondary" className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {location.name}
                    {location.iataCode && ` (${location.iataCode})`}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <DateRangePicker
                startDate={dateRange.start}
                endDate={dateRange.end}
                onDateRangeChange={handleDateRangeChange}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSaveDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Itinerary
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsShareDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExportDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export PDF
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