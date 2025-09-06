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
    // Parse the ISO string directly to preserve the timezone information
    // The API returns times like "2024-10-20T23:00-04:00" which includes timezone offset
    const timeFormat = use24HourFormat ? 'HH:mm' : 'h:mm a';
    
    // Extract just the local time part from the ISO string to avoid timezone conversion
    const isoMatch = timeString.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
    if (isoMatch) {
      // Parse as if it's in UTC to avoid any timezone conversion, then format
      const localTimeString = isoMatch[1] + 'Z'; // Add Z to treat as UTC
      const date = new Date(localTimeString);
      return format(date, timeFormat);
    }
    
    // Fallback: try to parse the original string
    return format(new Date(timeString), timeFormat);
  } catch (error) {
    console.error('Error formatting flight time:', error, timeString);
    // Final fallback: extract time manually from ISO string
    try {
      const timeMatch = timeString.match(/T(\d{2}:\d{2})/);
      if (timeMatch) {
        const [, time] = timeMatch;
        if (use24HourFormat) {
          return time;
        } else {
          // Convert to 12-hour format
          const [hours, minutes] = time.split(':').map(Number);
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const displayHours = hours % 12 || 12;
          return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
        }
      }
    } catch (fallbackError) {
      console.error('Fallback time parsing failed:', fallbackError);
    }
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
    <div className="space-y-4">
      {/* Header with route and date info */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-2 hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to search
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">24h</span>
            <Switch
              checked={!use24HourFormat}
              onCheckedChange={(checked) => setUse24HourFormat(!checked)}
              className="data-[state=checked]:bg-primary"
            />
            <span className="text-sm text-muted-foreground">12h</span>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">
              {searchType === 'route' ? 
                `${fromAirport} → ${toAirport}` : 
                `${airline} ${flightNumber}`}
            </div>
            <div className="text-xs text-muted-foreground">
              {departureDate && format(departureDate, 'EEE, MMM dd, yyyy')}
            </div>
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

      {/* Flight results list - Scrollable container for up to 100 results */}
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 scroll-smooth">
        <div className="text-sm text-muted-foreground mb-4 bg-muted/30 px-3 py-2 rounded-lg">
          {flightResults.length > 0 && (
            <span>
              {searchType === 'flight' ? (
                flightResults.some(flight => 
                  flight.itineraries?.[0]?.segments?.[0]?.carrierCode === airline &&
                  flight.itineraries?.[0]?.segments?.[0]?.number === flightNumber
                ) 
                ? `Found flight ${airline} ${flightNumber}`
                : `Flight ${airline} ${flightNumber} not found. Showing ${flightResults.length} alternative flight${flightResults.length !== 1 ? 's' : ''} on similar routes`
              ) : (
                `Showing ${flightResults.length} flight${flightResults.length !== 1 ? 's' : ''} for this route`
              )}
            </span>
          )}
        </div>
        {flightResults.map((flight, index) => (
          <Card key={index} className="border-border/20 bg-gradient-to-r from-card to-card/95 hover:shadow-md transition-all duration-300 cursor-pointer group overflow-hidden">
            <CardContent className="p-5" onClick={() => handleSelectFlight(flight)}>
              {/* Flight Number and Airline Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/10">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Plane className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-foreground">
                      {flight.validatingAirlineCodes?.[0] || 'N/A'} {flight.itineraries?.[0]?.segments?.[0]?.carrierCode || ''}{flight.itineraries?.[0]?.segments?.[0]?.number || 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {getAirlineName(flight.validatingAirlineCodes?.[0] || flight.itineraries?.[0]?.segments?.[0]?.carrierCode || 'N/A')}
                      {flight.itineraries?.[0]?.segments?.[0]?.operating?.carrierCode && 
                        flight.itineraries?.[0]?.segments?.[0]?.operating?.carrierCode !== flight.validatingAirlineCodes?.[0] &&
                        ` • Operated by ${getAirlineName(flight.itineraries[0].segments[0].operating.carrierCode)}`}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Aircraft</div>
                  <div className="text-sm font-medium">{flight.itineraries?.[0]?.segments?.[0]?.aircraft?.code || 'N/A'}</div>
                </div>
              </div>
              
              {/* Flight route and timing */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-8 flex-1">
                  {/* Departure */}
                   <div className="text-center space-y-1">
                     <div className="text-xl font-bold text-foreground tracking-tight">
                       {flight.itineraries?.[0]?.segments?.[0]?.departure?.at ? 
                         formatFlightTime(
                           flight.itineraries[0].segments[0].departure.at,
                           flight.itineraries[0].segments[0].departure.iataCode,
                           use24HourFormat
                         ) : 'N/A'}
                     </div>
                     <div className="text-sm text-muted-foreground font-semibold bg-muted/50 px-2 py-1 rounded-md">
                       {flight.itineraries?.[0]?.segments?.[0]?.departure?.iataCode || fromAirport}
                     </div>
                   </div>
                  
                  {/* Flight path */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
                    <div className="flex flex-col items-center gap-2 px-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
                        <Plane className="h-5 w-5 text-primary transform rotate-90" />
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-full">
                        <Clock className="h-3 w-3" />
                        <span className="font-medium">{flight.itineraries?.[0]?.duration?.replace('PT', '').replace('H', 'h ').replace('M', 'm') || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
                  </div>
                  
                  {/* Arrival */}
                   <div className="text-center space-y-1">
                     <div className="text-xl font-bold text-foreground tracking-tight">
                       {flight.itineraries?.[0]?.segments?.[flight.itineraries[0].segments.length - 1]?.arrival?.at ? 
                         formatFlightTime(
                           flight.itineraries[0].segments[flight.itineraries[0].segments.length - 1].arrival.at,
                           flight.itineraries[0].segments[flight.itineraries[0].segments.length - 1].arrival.iataCode,
                           use24HourFormat
                         ) : 'N/A'}
                     </div>
                     <div className="text-sm text-muted-foreground font-semibold bg-muted/50 px-2 py-1 rounded-md">
                       {flight.itineraries?.[0]?.segments?.[flight.itineraries[0].segments.length - 1]?.arrival?.iataCode || toAirport}
                     </div>
                   </div>
                </div>
              </div>
              
              <Separator className="my-4 bg-border/30" />
              
              {/* Flight details */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-gradient-to-r from-secondary/80 to-secondary/60 text-secondary-foreground font-semibold px-3 py-1">
                    {getAirlineName(flight.validatingAirlineCodes?.[0] || 'N/A')}
                  </Badge>
                  {flight.itineraries?.[0]?.segments?.length > 1 && (
                    <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:bg-amber-900/20">
                      {flight.itineraries[0].segments.length - 1} stop{flight.itineraries[0].segments.length > 2 ? 's' : ''}
                    </Badge>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-3 py-1 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="font-medium">{flight.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin || 'Economy'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-primary group-hover:text-primary/80 transition-colors font-medium">
                  <span>Select flight</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  if (isMobile) {
    console.log('🛩️ Rendering MOBILE version');
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="h-[90vh] bg-background border-border">
          <div className="p-6 h-full flex flex-col">
            <DrawerTitle className="text-2xl font-bold text-foreground mb-6">
              {showResults ? "✈️ Flight Results" : "✈️ Flight Search"}
            </DrawerTitle>
            
            <div className="flex-1 overflow-y-auto">
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