import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { AirportSearch } from '@/components/AirportSearch';
import { useIsMobile } from '@/hooks/useIsMobile';
import { supabase } from '@/integrations/supabase/client';
import { CalendarIcon, ArrowLeft, Plane, Clock, ArrowRight, ChevronDown, Search } from 'lucide-react';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { cn } from '@/lib/utils';
import { getAirlineOptions, getAirlineName } from '@/data/airlines';

interface TripLocation {
  id: string;
  name: string;
  country: string;
  state?: string;
  startDate?: Date;
  endDate?: Date;
}

interface EnhancedFlightSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (flight: any) => void;
  locations: TripLocation[];
}

// Helper function to get timezone for airport IATA code
const getAirportTimezone = (iataCode: string): string => {
  const timezones: Record<string, string> = {
    // North America
    'JFK': 'America/New_York', 'LGA': 'America/New_York', 'EWR': 'America/New_York',
    'LAX': 'America/Los_Angeles', 'SFO': 'America/Los_Angeles', 'SAN': 'America/Los_Angeles',
    'ORD': 'America/Chicago', 'DFW': 'America/Chicago', 'IAH': 'America/Chicago',
    'ATL': 'America/New_York', 'MIA': 'America/New_York', 'BOS': 'America/New_York',
    'SEA': 'America/Los_Angeles', 'DEN': 'America/Denver', 'PHX': 'America/Phoenix',
    'LAS': 'America/Los_Angeles', 'MCO': 'America/New_York', 'CLT': 'America/New_York',
    'MSP': 'America/Chicago', 'DTW': 'America/New_York', 'PHL': 'America/New_York',
    'BWI': 'America/New_York', 'DCA': 'America/New_York', 'IAD': 'America/New_York',
    'YYZ': 'America/Toronto', 'YVR': 'America/Vancouver', 'YUL': 'America/Montreal',
    
    // Europe
    'LHR': 'Europe/London', 'LGW': 'Europe/London', 'STN': 'Europe/London',
    'CDG': 'Europe/Paris', 'ORY': 'Europe/Paris',
    'FRA': 'Europe/Berlin', 'MUC': 'Europe/Berlin',
    'AMS': 'Europe/Amsterdam',
    'BCN': 'Europe/Madrid', 'MAD': 'Europe/Madrid',
    'FCO': 'Europe/Rome', 'MXP': 'Europe/Rome',
    'VIE': 'Europe/Vienna',
    'ZUR': 'Europe/Zurich',
    'CPH': 'Europe/Copenhagen',
    'ARN': 'Europe/Stockholm',
    'HEL': 'Europe/Helsinki',
    'OSL': 'Europe/Oslo',
    'DUB': 'Europe/Dublin',
    'BRU': 'Europe/Brussels',
    'LIS': 'Europe/Lisbon',
    'ATH': 'Europe/Athens',
    'IST': 'Europe/Istanbul',
    
    // Asia Pacific
    'NRT': 'Asia/Tokyo', 'HND': 'Asia/Tokyo',
    'ICN': 'Asia/Seoul',
    'PVG': 'Asia/Shanghai', 'PEK': 'Asia/Shanghai',
    'HKG': 'Asia/Hong_Kong',
    'SIN': 'Asia/Singapore',
    'BKK': 'Asia/Bangkok',
    'KUL': 'Asia/Kuala_Lumpur',
    'CGK': 'Asia/Jakarta',
    'MNL': 'Asia/Manila',
    'TPE': 'Asia/Taipei',
    'BOM': 'Asia/Kolkata', 'DEL': 'Asia/Kolkata',
    'SYD': 'Australia/Sydney', 'MEL': 'Australia/Melbourne',
    'AKL': 'Pacific/Auckland',
    
    // Middle East & Africa
    'DXB': 'Asia/Dubai', 'AUH': 'Asia/Dubai',
    'DOH': 'Asia/Qatar',
    'JNB': 'Africa/Johannesburg',
    'CAI': 'Africa/Cairo',
    'ADD': 'Africa/Addis_Ababa',
    'NBO': 'Africa/Nairobi',
    
    // South America
    'GRU': 'America/Sao_Paulo', 'GIG': 'America/Sao_Paulo',
    'EZE': 'America/Argentina/Buenos_Aires',
    'SCL': 'America/Santiago',
    'BOG': 'America/Bogota',
    'LIM': 'America/Lima',
    'PTY': 'America/Panama',
    'MEX': 'America/Mexico_City'
  };
  
  return timezones[iataCode] || 'UTC';
};

// Helper function to format flight time with proper timezone
const formatFlightTime = (timeString: string, airportCode: string, use24HourFormat: boolean): string => {
  if (!timeString) return 'N/A';
  
  try {
    // The API returns times in ISO format with timezone offset like "2024-10-20T21:52-07:00"
    // We want to display the local time at the airport (21:52 in this example)
    const timeFormat = use24HourFormat ? 'HH:mm' : 'h:mm a';
    
    // Extract the local time portion before the timezone offset
    const timeMatch = timeString.match(/T(\d{2}:\d{2})/);
    if (timeMatch) {
      const [, timeOnly] = timeMatch;
      const [hours, minutes] = timeOnly.split(':').map(Number);
      
      if (use24HourFormat) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      } else {
        // Convert to 12-hour format
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
      }
    }
    
    // Fallback: try to parse as regular date if no timezone info
    const date = new Date(timeString);
    return format(date, timeFormat);
  } catch (error) {
    console.error('Error formatting flight time:', error, timeString);
    return 'N/A';
  }
};

export function EnhancedFlightSearchDialog({ isOpen, onClose, onSelect, locations }: EnhancedFlightSearchDialogProps) {
  console.log('🛩️ EnhancedFlightSearchDialog DEFINITELY RENDERING - isOpen:', isOpen);
  console.log('🛩️ Locations:', locations);
  
  const [departureDate, setDepartureDate] = useState<Date>();
  const [fromAirport, setFromAirport] = useState<string>("");
  const [toAirport, setToAirport] = useState<string>("");
  const [passengers, setPassengers] = useState<string>("1");
  const [flightNumber, setFlightNumber] = useState<string>("");
  const [airline, setAirline] = useState<string>("");
  const [searchType, setSearchType] = useState<'route' | 'flight'>('route');
  const [stops, setStops] = useState<string>('all');
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [flightResults, setFlightResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAirlineDropdown, setShowAirlineDropdown] = useState(false);
  const [showAirlineFilter, setShowAirlineFilter] = useState(false);
  const [use24HourFormat, setUse24HourFormat] = useState(true);
  
  const isMobile = useIsMobile();

  // Close airline filter when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.airline-filter-container')) {
        setShowAirlineFilter(false);
      }
    };

    if (showAirlineFilter) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAirlineFilter]);

  const handleSearch = async () => {
    if (searchType === 'route' && (!fromAirport || !toAirport || !departureDate)) {
      alert('Please fill in origin, destination, and departure date for route search');
      return;
    }
    
    if (searchType === 'flight' && (!flightNumber || !airline || !departureDate)) {
      alert('Please fill in flight number, airline, and departure date for flight search');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      let requestBody;
      
      if (searchType === 'flight') {
        // Search by specific flight number and airline
        requestBody = {
          endpoint: 'flight-status',
          carrierCode: airline,
          flightNumber: flightNumber,
          scheduledDepartureDate: format(departureDate, 'yyyy-MM-dd')
        };
      } else {
        // Search by route (origin/destination)
        requestBody = {
          endpoint: 'searchFlights',
          originLocationCode: fromAirport,
          destinationLocationCode: toAirport,
          departureDate: format(departureDate, 'yyyy-MM-dd'),
          adults: parseInt(passengers),
          currencyCode: 'USD',
          max: 100,
          nonStop: stops === 'nonstop' ? true : undefined,
          includedAirlineCodes: selectedAirlines.length > 0 ? selectedAirlines : undefined
        };
      }

      const { data, error } = await supabase.functions.invoke('amadeus-enhanced-flight-api', {
        body: requestBody
      });

      if (error) {
        throw error;
      }

      if (data?.data) {
        let filteredResults = data.data;
        
        // Validate flight routes match search criteria
        if (searchType === 'route') {
          filteredResults = data.data.filter((flight: any) => {
            const segments = flight.itineraries?.[0]?.segments || [];
            if (segments.length === 0) return false;
            
            const firstSegment = segments[0];
            const lastSegment = segments[segments.length - 1];
            
            // Check if flight actually departs from and arrives at the searched airports
            const departureMatch = firstSegment?.departure?.iataCode === fromAirport;
            const arrivalMatch = lastSegment?.arrival?.iataCode === toAirport;
            
            return departureMatch && arrivalMatch;
          });
          
          // Filter by stops if not "all"
          if (stops !== 'all') {
            filteredResults = filteredResults.filter((flight: any) => {
              const segments = flight.itineraries?.[0]?.segments || [];
              const stopCount = segments.length - 1;
              
              switch (stops) {
                case 'nonstop': return stopCount === 0;
                case 'onestop': return stopCount === 1;
                case 'twostops': return stopCount === 2;
                default: return true;
              }
            });
          }
        } else if (searchType === 'flight') {
          // For specific flight searches, validate the flight number and airline match
          filteredResults = data.data.filter((flight: any) => {
            const segments = flight.itineraries?.[0]?.segments || [];
            if (segments.length === 0) return false;
            
            const firstSegment = segments[0];
            const carrierMatch = firstSegment?.carrierCode === airline;
            const flightNumberMatch = firstSegment?.number === flightNumber;
            
            return carrierMatch && flightNumberMatch;
          });
        }
        
        // Filter by selected airlines if any are selected
        if (selectedAirlines.length > 0) {
          filteredResults = filteredResults.filter((flight: any) => {
            const segments = flight.itineraries?.[0]?.segments || [];
            const validatingAirlines = flight.validatingAirlineCodes || [];
            
            // Get all possible airline codes for this flight
            const marketingAirlines = segments.map((segment: any) => segment.carrierCode);
            const operatingAirlines = segments.map((segment: any) => segment.operating?.carrierCode).filter(Boolean);
            
            // Combine all airline codes (marketing, operating, validating)
            const allAirlineCodes = [...new Set([...marketingAirlines, ...operatingAirlines, ...validatingAirlines])];
            
            // Check if any of the flight's airline codes match the selected airlines
            return allAirlineCodes.some((airlineCode: string) => 
              selectedAirlines.includes(airlineCode)
            );
          });
        }
        
        // Log flight data for debugging
        console.log('Raw flight data:', filteredResults.slice(0, 2));
        filteredResults.forEach((flight, index) => {
          const segments = flight.itineraries?.[0]?.segments || [];
          console.log(`Flight ${index}:`, {
            flightNumber: `${segments[0]?.carrierCode}${segments[0]?.number}`,
            departure: segments[0]?.departure,
            arrival: segments[segments.length - 1]?.arrival,
            segments: segments.length
          });
        });
        
        setFlightResults(filteredResults);
        setShowResults(true);
      } else {
        setFlightResults([]);
        setShowResults(true);
      }
    } catch (error) {
      console.error('Flight search error:', error);
      setError('Failed to search flights. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setShowResults(false);
    setFlightResults([]);
    setError(null);
  };

  const handleSelectFlight = (flight: any) => {
    onSelect(flight);
    onClose();
  };
  
  const renderFlightResults = () => (
    <div className="flex flex-col h-full">
      {/* Compact sticky header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border/20 p-3">
        <div className="flex items-center justify-between">
          {/* Left: Back Button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          {/* Center: Route & Date */}
          <div className="text-center flex-1 mx-3">
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <span className="text-base font-bold text-foreground">
                {searchType === 'route' ? fromAirport : airline}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-primary" />
              <span className="text-base font-bold text-foreground">
                {searchType === 'route' ? toAirport : flightNumber}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {departureDate && format(departureDate, 'MMM dd, yyyy (EEE)')}
            </div>
          </div>

          {/* Right: Time Format Toggle */}
          <div className="flex bg-muted rounded-full p-0.5 border border-border/30">
            <button
              onClick={() => setUse24HourFormat(true)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-full transition-all duration-200 min-h-[44px] min-w-[44px] ${
                use24HourFormat 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              24h
            </button>
            <button
              onClick={() => setUse24HourFormat(false)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-full transition-all duration-200 min-h-[44px] min-w-[44px] ${
                !use24HourFormat 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              12h
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm mb-4">
          <div className="flex items-center gap-2">
            <Plane className="h-4 w-4" />
            {error}
          </div>
        </div>
      )}

      {/* No results state */}
      {flightResults.length === 0 && !error && (
        <Card className="border-border bg-card">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Plane className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">No flights found</h3>
            <p className="text-muted-foreground mb-4">
              {searchType === 'route' ? 
                `We couldn't find any flights for this route on ${departureDate && format(new Date(departureDate), 'MMM dd, yyyy')}.` :
                `Flight ${airline} ${flightNumber} was not found for ${departureDate && format(new Date(departureDate), 'MMM dd, yyyy')}.`}
            </p>
            <p className="text-sm text-muted-foreground">
              {searchType === 'route' ? 
                'Try adjusting your search criteria or check if the details are correct.' :
                'The flight may not operate on this date, or the flight number might be incorrect. Alternative flights on similar routes are shown above if available.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Scrollable flight results */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {flightResults.length > 0 && (
          <div className="text-sm text-muted-foreground mb-3 bg-muted/30 px-3 py-2 rounded-lg mx-1">
            {searchType === 'flight' ? (
              flightResults.some(flight => 
                flight.itineraries?.[0]?.segments?.[0]?.carrierCode === airline &&
                flight.itineraries?.[0]?.segments?.[0]?.number === flightNumber
              ) 
              ? `Found flight ${airline} ${flightNumber}`
              : `Flight ${airline} ${flightNumber} not found. Showing ${flightResults.length} alternative flight${flightResults.length !== 1 ? 's' : ''}`
            ) : (
              `Showing ${flightResults.length} flight${flightResults.length !== 1 ? 's' : ''} for this route`
            )}
          </div>
        )}
        <div className="space-y-3">
          {flightResults.map((flight, index) => (
            <Card key={index} className="border border-border/30 bg-card hover:shadow-md transition-all duration-200 cursor-pointer group overflow-hidden rounded-xl">
              <CardContent className="p-0" onClick={() => handleSelectFlight(flight)}>
                {/* Top row: Flight info and select button */}
                <div className="flex items-center justify-between p-4 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                      <Plane className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-sm font-bold text-foreground">
                        {flight.itineraries?.[0]?.segments?.[0]?.carrierCode || ''}{flight.itineraries?.[0]?.segments?.[0]?.number || 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getAirlineName(flight.validatingAirlineCodes?.[0] || flight.itineraries?.[0]?.segments?.[0]?.carrierCode || 'N/A')}
                        {flight.itineraries?.[0]?.segments?.[0]?.operating?.carrierCode && 
                          flight.itineraries?.[0]?.segments?.[0]?.operating?.carrierCode !== flight.validatingAirlineCodes?.[0] && (
                          <span> • Operated by {getAirlineName(flight.itineraries[0].segments[0].operating.carrierCode)}</span>
                        )}
                      </div>
                      {flight.itineraries?.[0]?.segments?.[0]?.aircraft?.code && (
                        <div className="text-xs text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-md inline-block">
                          ✈️ {flight.itineraries[0].segments[0].aircraft.code}
                        </div>
                      )}
                    </div>
                  </div>
                  <button className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors min-h-[44px]">
                    Select →
                  </button>
                </div>
                
                {/* Second row: Flight times and route */}
                <div className="px-4 pb-4">
                  <div className="flex items-center justify-between">
                    {/* Departure */}
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground">
                        {flight.itineraries?.[0]?.segments?.[0]?.departure?.at ? 
                          formatFlightTime(
                            flight.itineraries[0].segments[0].departure.at,
                            flight.itineraries[0].segments[0].departure.iataCode,
                            use24HourFormat
                          ) : 'N/A'}
                      </div>
                      <div className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-md mt-1">
                        {flight.itineraries?.[0]?.segments?.[0]?.departure?.iataCode || fromAirport}
                      </div>
                    </div>
                    
                    {/* Duration */}
                    <div className="text-center px-4">
                      <div className="text-xs text-muted-foreground mb-1">
                        {flight.itineraries?.[0]?.duration?.replace('PT', '').replace('H', 'h ').replace('M', 'm') || 'N/A'}
                      </div>
                      <div className="h-0.5 bg-border rounded-full relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full"></div>
                      </div>
                      {flight.itineraries?.[0]?.segments?.length > 1 && (
                        <div className="text-xs text-amber-600 mt-1 font-medium">
                          {flight.itineraries[0].segments.length - 1} stop{flight.itineraries[0].segments.length > 2 ? 's' : ''}
                        </div>
                      )}
                    </div>
                    
                    {/* Arrival */}
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground">
                        {flight.itineraries?.[0]?.segments?.[flight.itineraries[0].segments.length - 1]?.arrival?.at ? 
                          formatFlightTime(
                            flight.itineraries[0].segments[flight.itineraries[0].segments.length - 1].arrival.at,
                            flight.itineraries[0].segments[flight.itineraries[0].segments.length - 1].arrival.iataCode,
                            use24HourFormat
                          ) : 'N/A'}
                      </div>
                      <div className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-md mt-1">
                        {flight.itineraries?.[0]?.segments?.[flight.itineraries[0].segments.length - 1]?.arrival?.iataCode || toAirport}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    console.log('🛩️ Rendering MOBILE version');
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="h-[90vh] bg-background border-border overflow-x-hidden">
          <div className="h-full flex flex-col overflow-x-hidden">
            {!showResults && (
              <DrawerTitle className="text-xl font-bold text-foreground p-4 pb-3">
                ✈️ Flight Search
              </DrawerTitle>
            )}
            
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {showResults ? renderFlightResults() : (
                <div className="p-4 space-y-6">
                  {/* Search Type Toggle */}
                  <div className="flex bg-muted rounded-lg p-1">
                    <button
                      onClick={() => setSearchType('route')}
                      className={cn(
                        "flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                        searchType === 'route' 
                          ? "bg-background text-foreground shadow-sm" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Search by Route
                    </button>
                    <button
                      onClick={() => setSearchType('flight')}
                      className={cn(
                        "flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                        searchType === 'flight' 
                          ? "bg-background text-foreground shadow-sm" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Search by Flight Number
                    </button>
                  </div>

                  <div className="space-y-4">
                    {searchType === 'route' ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-2">From Airport</label>
                          <AirportSearch
                            value={fromAirport}
                            onChange={setFromAirport}
                            onAirportSelect={(airport) => {
                              setFromAirport(airport.iataCode);
                            }}
                            placeholder="Search departure airport..."
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-2">To Airport</label>
                          <AirportSearch
                            value={toAirport}
                            onChange={setToAirport}
                            onAirportSelect={(airport) => {
                              setToAirport(airport.iataCode);
                            }}
                            placeholder="Search destination airport..."
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-2">Passengers</label>
                          <Select value={passengers} onValueChange={setPassengers}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-background border border-border z-50">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                <SelectItem key={num} value={num.toString()}>
                                  {num} passenger{num > 1 ? 's' : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-2">Stops</label>
                          <Select value={stops} onValueChange={setStops}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-background border border-border z-50">
                              <SelectItem value="all">All flights</SelectItem>
                              <SelectItem value="nonstop">Nonstop only</SelectItem>
                              <SelectItem value="onestop">1 stop max</SelectItem>
                              <SelectItem value="twostops">2 stops max</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-2">Airline Filter</label>
                          <div className="relative airline-filter-container">
                            <Button
                              variant="outline"
                              onClick={() => setShowAirlineFilter(!showAirlineFilter)}
                              className="w-full justify-between"
                            >
                              <span className="text-sm">
                                {selectedAirlines.length === 0 
                                  ? "All airlines" 
                                  : `${selectedAirlines.length} selected`}
                              </span>
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            {showAirlineFilter && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                                <div className="p-2 space-y-1">
                                  <div className="relative mb-2">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                    <input
                                      type="text"
                                      placeholder="Search airlines..."
                                      className="w-full pl-7 pr-2 py-1 text-xs border border-border rounded bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                      onChange={(e) => {
                                        const searchTerm = e.target.value.toLowerCase();
                                        const filteredAirlines = getAirlineOptions().filter(airline => 
                                          airline.name.toLowerCase().includes(searchTerm) ||
                                          airline.code.toLowerCase().includes(searchTerm)
                                        );
                                        e.target.parentElement?.parentElement?.setAttribute('data-search', searchTerm);
                                        e.target.parentElement?.parentElement?.querySelectorAll('.airline-option').forEach((option: any) => {
                                          const airlineName = option.querySelector('.airline-name')?.textContent?.toLowerCase() || '';
                                          const airlineCode = option.querySelector('.airline-code')?.textContent?.toLowerCase() || '';
                                          if (airlineName.includes(searchTerm) || airlineCode.includes(searchTerm)) {
                                            option.style.display = '';
                                          } else {
                                            option.style.display = 'none';
                                          }
                                        });
                                      }}
                                    />
                                  </div>
                                  {getAirlineOptions().map((airline) => (
                                    <label key={airline.code} className="airline-option flex items-center gap-2 p-2 hover:bg-muted rounded-sm cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={selectedAirlines.includes(airline.code)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedAirlines([...selectedAirlines, airline.code]);
                                          } else {
                                            setSelectedAirlines(selectedAirlines.filter(code => code !== airline.code));
                                          }
                                        }}
                                        className="rounded border-border"
                                      />
                                      <div className="flex-1 flex items-center justify-between">
                                        <span className="airline-name text-sm text-foreground">{airline.name}</span>
                                        <span className="airline-code text-xs text-muted-foreground font-mono">{airline.code}</span>
                                      </div>
                                    </label>
                                  ))}
                                  {selectedAirlines.length > 0 && (
                                    <div className="border-t border-border pt-2 mt-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedAirlines([])}
                                        className="w-full text-xs"
                                      >
                                        Clear All
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-2">Airline</label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                              type="text"
                              value={airline}
                              onChange={(e) => {
                                setAirline(e.target.value);
                                setShowAirlineDropdown(e.target.value.length > 0);
                              }}
                              onFocus={() => setShowAirlineDropdown(airline.length > 0)}
                              onBlur={() => setTimeout(() => setShowAirlineDropdown(false), 200)}
                              placeholder="Search by name or code (e.g., British Airways, BA)"
                              className="w-full pl-10 pr-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                            {showAirlineDropdown && airline.length > 0 && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                                {getAirlineOptions()
                                  .filter((option) => 
                                    option.name.toLowerCase().includes(airline.toLowerCase()) ||
                                    option.code.toLowerCase().includes(airline.toLowerCase())
                                  )
                                  .slice(0, 10)
                                  .map((option) => (
                                  <button
                                    key={option.code}
                                    type="button"
                                    onClick={() => {
                                      setAirline(option.code);
                                      setShowAirlineDropdown(false);
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-muted transition-colors flex items-center justify-between border-b border-border/20 last:border-b-0"
                                  >
                                    <span className="text-sm text-foreground">{option.name}</span>
                                    <span className="text-xs text-muted-foreground font-mono">{option.code}</span>
                                  </button>
                                ))}
                                {getAirlineOptions()
                                  .filter((option) => 
                                    option.name.toLowerCase().includes(airline.toLowerCase()) ||
                                    option.code.toLowerCase().includes(airline.toLowerCase())
                                  ).length === 0 && (
                                  <div className="px-3 py-2 text-sm text-muted-foreground">No airlines found</div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-2">Flight Number</label>
                          <input
                            type="text"
                            value={flightNumber}
                            onChange={(e) => setFlightNumber(e.target.value)}
                            placeholder="e.g., 123, 1847"
                            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                        </div>
                      </>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">Departure Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {departureDate ? format(departureDate, "PPP") : "Select departure date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={departureDate}
                            onSelect={setDepartureDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  
                  <div className="sticky bottom-0 bg-background pt-4 pb-4 border-t border-border/10 mx-4">
                    <Button 
                      onClick={handleSearch} 
                      className="w-full" 
                      disabled={isLoading}
                    >
                      {isLoading ? 'Searching...' : 'Search Flights'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  console.log('🛩️ Rendering DESKTOP version');
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-card border-border max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            {showResults ? "✈️ Flight Results" : "✈️ Flight Search"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[70vh]">
          {showResults ? renderFlightResults() : (
            <div className="space-y-6">
              {/* Search Type Toggle */}
              <div className="flex bg-muted rounded-lg p-1">
                <button
                  onClick={() => setSearchType('route')}
                  className={cn(
                    "flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                    searchType === 'route' 
                      ? "bg-background text-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Search by Route
                </button>
                <button
                  onClick={() => setSearchType('flight')}
                  className={cn(
                    "flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                    searchType === 'flight' 
                      ? "bg-background text-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Search by Flight Number
                </button>
              </div>

              {searchType === 'route' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">From Airport</label>
                    <AirportSearch
                      value={fromAirport}
                      onChange={setFromAirport}
                      onAirportSelect={(airport) => {
                        setFromAirport(airport.iataCode);
                      }}
                      placeholder="Search departure airport..."
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">To Airport</label>
                    <AirportSearch
                      value={toAirport}
                      onChange={setToAirport}
                      onAirportSelect={(airport) => {
                        setToAirport(airport.iataCode);
                      }}
                      placeholder="Search destination airport..."
                      className="w-full"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Airline</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={airline}
                        onChange={(e) => {
                          setAirline(e.target.value);
                          setShowAirlineDropdown(e.target.value.length > 0);
                        }}
                        onFocus={() => setShowAirlineDropdown(airline.length > 0)}
                        onBlur={() => setTimeout(() => setShowAirlineDropdown(false), 200)}
                        placeholder="Search by name or code (e.g., British Airways, BA)"
                        className="w-full pl-10 pr-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      {showAirlineDropdown && airline.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                          {getAirlineOptions()
                            .filter((option) => 
                              option.name.toLowerCase().includes(airline.toLowerCase()) ||
                              option.code.toLowerCase().includes(airline.toLowerCase())
                            )
                            .slice(0, 10)
                            .map((option) => (
                            <button
                              key={option.code}
                              type="button"
                              onClick={() => {
                                setAirline(option.code);
                                setShowAirlineDropdown(false);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-muted transition-colors flex items-center justify-between border-b border-border/20 last:border-b-0"
                            >
                              <span className="text-sm text-foreground">{option.name}</span>
                              <span className="text-xs text-muted-foreground font-mono">{option.code}</span>
                            </button>
                          ))}
                          {getAirlineOptions()
                            .filter((option) => 
                              option.name.toLowerCase().includes(airline.toLowerCase()) ||
                              option.code.toLowerCase().includes(airline.toLowerCase())
                            ).length === 0 && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">No airlines found</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Flight Number</label>
                    <input
                      type="text"
                      value={flightNumber}
                      onChange={(e) => setFlightNumber(e.target.value)}
                      placeholder="e.g., 123, 1847"
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Departure Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {departureDate ? format(departureDate, "PPP") : "Select departure date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={departureDate}
                        onSelect={setDepartureDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Passengers</label>
                    <Select value={passengers} onValueChange={setPassengers}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border z-50">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} passenger{num > 1 ? 's' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Stops</label>
                    <Select value={stops} onValueChange={setStops}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border z-50">
                        <SelectItem value="all">All flights</SelectItem>
                        <SelectItem value="nonstop">Nonstop only</SelectItem>
                        <SelectItem value="onestop">1 stop max</SelectItem>
                        <SelectItem value="twostops">2 stops max</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Airline Filter</label>
                    <div className="relative airline-filter-container">
                      <Button
                        variant="outline"
                        onClick={() => setShowAirlineFilter(!showAirlineFilter)}
                        className="w-full justify-between"
                      >
                        <span className="text-sm">
                          {selectedAirlines.length === 0 
                            ? "All airlines" 
                            : `${selectedAirlines.length} selected`}
                        </span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      {showAirlineFilter && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                          <div className="p-2 space-y-1">
                            <div className="relative mb-2">
                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                              <input
                                type="text"
                                placeholder="Search airlines..."
                                className="w-full pl-7 pr-2 py-1 text-xs border border-border rounded bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                onChange={(e) => {
                                  const searchTerm = e.target.value.toLowerCase();
                                  e.target.parentElement?.parentElement?.querySelectorAll('.airline-option').forEach((option: any) => {
                                    const airlineName = option.querySelector('.airline-name')?.textContent?.toLowerCase() || '';
                                    const airlineCode = option.querySelector('.airline-code')?.textContent?.toLowerCase() || '';
                                    if (airlineName.includes(searchTerm) || airlineCode.includes(searchTerm)) {
                                      option.style.display = '';
                                    } else {
                                      option.style.display = 'none';
                                    }
                                  });
                                }}
                              />
                            </div>
                            {getAirlineOptions().map((airline) => (
                              <label key={airline.code} className="airline-option flex items-center gap-2 p-2 hover:bg-muted rounded-sm cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedAirlines.includes(airline.code)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedAirlines([...selectedAirlines, airline.code]);
                                    } else {
                                      setSelectedAirlines(selectedAirlines.filter(code => code !== airline.code));
                                    }
                                  }}
                                  className="rounded border-border"
                                />
                                <div className="flex-1 flex items-center justify-between">
                                  <span className="airline-name text-sm text-foreground">{airline.name}</span>
                                  <span className="airline-code text-xs text-muted-foreground font-mono">{airline.code}</span>
                                </div>
                              </label>
                            ))}
                            {selectedAirlines.length > 0 && (
                              <div className="border-t border-border pt-2 mt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedAirlines([])}
                                  className="w-full text-xs"
                                >
                                  Clear All
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="sticky bottom-0 bg-background pt-4 pb-2 border-t border-border/10">
                <Button 
                  onClick={handleSearch} 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Searching...' : 'Search Flights'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}