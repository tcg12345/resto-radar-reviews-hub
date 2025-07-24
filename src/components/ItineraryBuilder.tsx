import { useState, useEffect } from 'react';
import { addDays, format, startOfDay, differenceInDays } from 'date-fns';
import { Calendar, Plus, Download, Share2, Save, CalendarDays, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
import { AmadeusCity } from '@/hooks/useAmadeusApi';

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
    checkInDate: string;
    checkOutDate: string;
    guests: number;
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
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [currentItinerary, setCurrentItinerary] = useState<Itinerary | null>(null);
  const [events, setEvents] = useState<ItineraryEvent[]>([]);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<ItineraryEvent | null>(null);
  const [locations, setLocations] = useState<TripLocation[]>([]);
  const [isMultiCity, setIsMultiCity] = useState(false);
  const [currentLocationSearch, setCurrentLocationSearch] = useState('');

  const tripDays = dateRange.start && dateRange.end 
    ? differenceInDays(dateRange.end, dateRange.start) + 1 
    : 0;

  const handleDateRangeChange = (start: Date | null, end: Date | null) => {
    setDateRange({ start, end });
    if (start && end && locations.length > 0) {
      // Clear events that are outside the new date range
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');
      setEvents(prev => prev.filter(event => event.date >= startStr && event.date <= endStr));
      
      // Create itinerary title with locations
      const locationNames = locations.map(loc => loc.name).join(' → ');
      const title = isMultiCity 
        ? `Multi-City: ${locationNames}`
        : `${locationNames} Trip`;
      
      // Create new itinerary
      const newItinerary: Itinerary = {
        title,
        startDate: start,
        endDate: end,
        locations,
        isMultiCity,
        events: [],
        userId: user?.id,
      };
      setCurrentItinerary(newItinerary);
    }
  };

  const handleLocationSelect = (city: AmadeusCity) => {
    const newLocation: TripLocation = {
      id: city.id,
      name: city.name,
      iataCode: city.iataCode,
      country: city.address.countryName,
      state: city.address.stateCode,
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

  const canCreateItinerary = dateRange.start && dateRange.end && locations.length > 0;

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

  if (!canCreateItinerary) {
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
                  placeholder={isMultiCity ? "Add another city or airport..." : "Enter city or airport name"}
                  className="max-w-md mx-auto"
                />
              </div>

              {/* Selected locations */}
              {locations.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {locations.map((location, index) => (
                    <Badge key={location.id} variant="secondary" className="flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      {location.name}
                      {location.iataCode && ` (${location.iataCode})`}
                      <button
                        onClick={() => removeLocation(location.id)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Date selection */}
            {locations.length > 0 && (
              <div className="text-center">
                <h3 className="font-medium mb-2">Select travel dates</h3>
                <DateRangePicker
                  startDate={dateRange.start}
                  endDate={dateRange.end}
                  onDateRangeChange={handleDateRangeChange}
                />
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
                  {format(dateRange.start!, 'MMM do')} - {format(dateRange.end!, 'MMM do')} 
                  ({tripDays} {tripDays === 1 ? 'day' : 'days'})
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
          </div>
        </CardContent>
      </Card>

      {/* Trip Calendar */}
      <TripCalendar
        startDate={dateRange.start}
        endDate={dateRange.end}
        events={events}
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