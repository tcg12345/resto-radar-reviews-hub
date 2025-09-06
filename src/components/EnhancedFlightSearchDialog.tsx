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
import { CalendarIcon, ArrowLeft, Plane, Clock, ArrowRight, ChevronDown, Search, X } from 'lucide-react';
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
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
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

  // Define a mapping of city codes to airports (multi-airport cities)
  const cityAirportsMap: Record<string, string[]> = {
    NYC: ["JFK", "LGA", "EWR"],
    LON: ["LHR", "LGW", "STN", "LTN"],
    PAR: ["CDG", "ORY"],
    MIL: ["MXP", "LIN"],
    ROM: ["FCO", "CIA"],
    BER: ["BER"],
    WAS: ["IAD", "DCA", "BWI"],
    CHI: ["ORD", "MDW"],
    BAY: ["SFO", "OAK", "SJC"],
    LA: ["LAX", "BUR", "LGB"],
    MIA: ["MIA", "FLL", "PBI"],
    HOU: ["IAH", "HOU"],
    DAL: ["DFW", "DAL"],
    TYO: ["NRT", "HND"],
    OSA: ["KIX", "ITM"],
    SEL: ["ICN", "GMP"],
    BJS: ["PEK", "PKX"],
    SHA: ["PVG", "SHA"],
  };

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
            const departCode = firstSegment?.departure?.iataCode;
            const arriveCode = lastSegment?.arrival?.iataCode;
            
            // Consider city groups - if search code is a city, match any airport in that city
            const originMatches = cityAirportsMap[fromAirport]?.includes(departCode) || departCode === fromAirport;
            const destMatches = cityAirportsMap[toAirport]?.includes(arriveCode) || arriveCode === toAirport;
            
            return originMatches && destMatches;
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
                        {getAirlineName(flight.itineraries?.[0]?.segments?.[0]?.carrierCode || 'N/A')}
                        {flight.itineraries?.[0]?.segments?.[0]?.operating?.carrierCode && 
                          flight.itineraries?.[0]?.segments?.[0]?.operating?.carrierCode !== flight.itineraries?.[0]?.segments?.[0]?.carrierCode && (
                          <span> • Operated by {getAirlineName(flight.itineraries[0].segments[0].operating.carrierCode)}</span>
                        )}
                      </div>
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
        <DrawerContent className="max-h-[90vh] bg-background border-border">
          <div className="flex flex-col max-h-[90vh]">
            {!showResults && (
              <div className="flex items-center justify-between p-4 pb-3">
                <DrawerTitle className="text-xl font-bold text-foreground">
                  ✈️ Flight Search
                </DrawerTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            <div className="flex-1 overflow-y-auto min-h-0 bg-[#0A0A0A]">
              {showResults ? renderFlightResults() : (
                <div className="px-3 pt-1 pb-24 space-y-3">
                  {/* Modern Segmented Control Toggle */}
                  <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-1 shadow-premium border border-border/50">
                    <div className="flex">
                      <button
                        onClick={() => setSearchType('route')}
                        className={cn(
                          "flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 hover-scale",
                          searchType === 'route' 
                            ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 scale-105" 
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        )}
                      >
                        By Route
                      </button>
                      <button
                        onClick={() => setSearchType('flight')}
                        className={cn(
                          "flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 hover-scale",
                          searchType === 'flight' 
                            ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 scale-105" 
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        )}
                      >
                        By Flight #
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {searchType === 'route' ? (
                      <>
                        {/* From Airport Card */}
                        <div 
                          className="glass-card rounded-2xl p-4 border border-border/50 shadow-premium transition-all duration-200 hover:shadow-premium-glow focus-within:border-primary/50 focus-within:shadow-premium-glow cursor-pointer"
                          onClick={() => {
                            const input = document.querySelector('[placeholder="Choose departure airport"]') as HTMLInputElement;
                            input?.focus();
                          }}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Plane className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">FROM</label>
                          </div>
                          <AirportSearch
                            value={fromAirport}
                            onChange={setFromAirport}
                            onAirportSelect={(airport) => {
                              setFromAirport(airport.iataCode);
                            }}
                            placeholder="Choose departure airport"
                            className="w-full bg-transparent border-none text-foreground text-base placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0"
                          />
                          {!fromAirport && (
                            <p className="text-xs text-muted-foreground/70 mt-2">Choose departure airport</p>
                          )}
                        </div>

                        {/* To Airport Card */}
                        <div 
                          className="glass-card rounded-2xl p-4 border border-border/50 shadow-premium transition-all duration-200 hover:shadow-premium-glow focus-within:border-primary/50 focus-within:shadow-premium-glow cursor-pointer"
                          onClick={() => {
                            const input = document.querySelector('[placeholder="Choose destination airport"]') as HTMLInputElement;
                            input?.focus();
                          }}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Plane className="h-3.5 w-3.5 text-primary rotate-90" />
                            </div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">TO</label>
                          </div>
                          <AirportSearch
                            value={toAirport}
                            onChange={setToAirport}
                            onAirportSelect={(airport) => {
                              setToAirport(airport.iataCode);
                            }}
                            placeholder="Choose destination airport"
                            className="w-full bg-transparent border-none text-foreground text-base placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0"
                          />
                          {!toAirport && (
                            <p className="text-xs text-muted-foreground/70 mt-2">Choose destination airport</p>
                          )}
                        </div>

                        {/* Date & Passengers Row */}
                        <div className="grid grid-cols-2 gap-3">
                          {/* Departure Date Card */}
                          <div 
                            className="glass-card rounded-2xl p-4 border border-border/50 shadow-premium transition-all duration-200 hover:shadow-premium-glow focus-within:border-primary/50 cursor-pointer"
                            onClick={() => setIsCalendarOpen(true)}
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                                <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                              </div>
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">DATE</label>
                            </div>
                            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                              <PopoverTrigger asChild>
                                <button className="w-full text-left hover-scale transition-transform duration-200">
                                  <div className="text-base text-foreground font-medium">
                                    {departureDate ? format(departureDate, "MMM dd") : "Select date"}
                                  </div>
                                  {!departureDate && (
                                    <p className="text-xs text-muted-foreground/70 mt-2">Choose departure date</p>
                                  )}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 bg-card border-border shadow-premium" align="start">
                                <Calendar
                                  mode="single"
                                  selected={departureDate}
                                  onSelect={(date) => {
                                    setDepartureDate(date);
                                    setIsCalendarOpen(false);
                                  }}
                                  initialFocus
                                  className="bg-card text-foreground"
                                />
                              </PopoverContent>
                            </Popover>
                          </div>

                          {/* Passengers Card */}
                          <div className="glass-card rounded-2xl p-4 border border-border/50 shadow-premium transition-all duration-200 hover:shadow-premium-glow focus-within:border-primary/50 cursor-pointer">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Search className="h-3.5 w-3.5 text-primary" />
                              </div>
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">PASSENGERS</label>
                            </div>
                            <Select value={passengers} onValueChange={setPassengers}>
                              <SelectTrigger className="w-full bg-transparent border-none text-foreground text-base p-0 h-auto focus:ring-0 hover-scale transition-transform duration-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-card border-border text-foreground shadow-premium z-50">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                  <SelectItem key={num} value={num.toString()} className="text-foreground focus:bg-muted focus:text-foreground">
                                    {num} passenger{num > 1 ? 's' : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Stops Card */}
                        <div className="glass-card rounded-2xl p-4 border border-border/50 shadow-premium transition-all duration-200 hover:shadow-premium-glow focus-within:border-primary/50">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                              <ArrowRight className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">STOPS</label>
                          </div>
                          <Select value={stops} onValueChange={setStops}>
                            <SelectTrigger className="w-full bg-transparent border-none text-foreground text-base p-0 h-auto focus:ring-0 hover-scale transition-transform duration-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border text-foreground shadow-premium z-50">
                              <SelectItem value="all" className="text-foreground focus:bg-muted focus:text-foreground">All flights</SelectItem>
                              <SelectItem value="nonstop" className="text-foreground focus:bg-muted focus:text-foreground">Nonstop only</SelectItem>
                              <SelectItem value="onestop" className="text-foreground focus:bg-muted focus:text-foreground">1 stop max</SelectItem>
                              <SelectItem value="twostops" className="text-foreground focus:bg-muted focus:text-foreground">2 stops max</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Airline Filter Card */}
                        <div 
                          className="glass-card rounded-2xl p-4 border border-border/50 shadow-premium transition-all duration-200 hover:shadow-premium-glow focus-within:border-primary/50 cursor-pointer"
                          onClick={() => setShowAirlineFilter(!showAirlineFilter)}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Plane className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">AIRLINES</label>
                          </div>
                          <div className="relative airline-filter-container">
                            <button
                              onClick={() => setShowAirlineFilter(!showAirlineFilter)}
                              className="w-full flex items-center justify-between text-left hover-scale transition-transform duration-200"
                            >
                              <div className="text-base text-foreground">
                                {selectedAirlines.length === 0 ? (
                                  <span>All airlines</span>
                                ) : (
                                  <div className="flex flex-wrap gap-1">
                                    {selectedAirlines.slice(0, 2).map((code) => (
                                      <span key={code} className="inline-block bg-primary/20 text-primary text-xs px-2 py-1 rounded-full">
                                        {code}
                                      </span>
                                    ))}
                                    {selectedAirlines.length > 2 && (
                                      <span className="text-xs text-muted-foreground">+{selectedAirlines.length - 2}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            </button>
                            {selectedAirlines.length === 0 && (
                              <p className="text-xs text-muted-foreground/70 mt-2">No airlines selected</p>
                            )}
                            {showAirlineFilter && (
                              <div className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-border rounded-xl shadow-premium z-50 max-h-60 overflow-y-auto">
                                <div className="p-3 space-y-2">
                                  <div className="relative mb-3">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                      type="text"
                                      placeholder="Search airlines..."
                                      className="w-full pl-10 pr-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                    <label key={airline.code} className="airline-option flex items-center gap-3 p-2 hover:bg-[#2A2A2A] rounded-lg cursor-pointer transition-colors">
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
                                        className="rounded border-[#2A2A2A] bg-[#0A0A0A] text-blue-500 focus:ring-blue-500"
                                      />
                                      <div className="flex-1 flex items-center justify-between">
                                        <span className="airline-name text-sm text-gray-100">{airline.name}</span>
                                        <span className="airline-code text-xs text-gray-400 font-mono">{airline.code}</span>
                                      </div>
                                    </label>
                                  ))}
                                  {selectedAirlines.length > 0 && (
                                    <div className="border-t border-[#2A2A2A] pt-3 mt-3">
                                      <button
                                        onClick={() => setSelectedAirlines([])}
                                        className="w-full text-sm text-red-400 hover:text-red-300 transition-colors"
                                      >
                                        Clear All
                                      </button>
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
                        {/* Airline Card */}
                        <div className="glass-card rounded-2xl p-4 border border-border/50 shadow-premium transition-all duration-200 hover:shadow-premium-glow focus-within:border-primary/50 focus-within:shadow-premium-glow">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Plane className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">AIRLINE</label>
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              value={airline}
                              onChange={(e) => {
                                setAirline(e.target.value);
                                setShowAirlineDropdown(e.target.value.length > 0);
                              }}
                              onFocus={() => setShowAirlineDropdown(airline.length > 0)}
                              onBlur={() => setTimeout(() => setShowAirlineDropdown(false), 200)}
                              placeholder="Search by name or code"
                              className="w-full bg-transparent border-none text-foreground text-base placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0"
                            />
                            {!airline && (
                              <p className="text-xs text-muted-foreground/70 mt-2">Search by name or code</p>
                            )}
                            {showAirlineDropdown && airline.length > 0 && (
                              <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                                {getAirlineOptions()
                                  .filter((option) => 
                                    option.name.toLowerCase().includes(airline.toLowerCase()) ||
                                    option.code.toLowerCase().includes(airline.toLowerCase())
                                  )
                                  .slice(0, 8)
                                  .map((option) => (
                                  <button
                                    key={option.code}
                                    type="button"
                                    onClick={() => {
                                      setAirline(option.code);
                                      setShowAirlineDropdown(false);
                                    }}
                                    className="w-full px-4 py-3 text-left hover:bg-[#2A2A2A] transition-colors flex items-center justify-between border-b border-[#2A2A2A]/50 last:border-b-0"
                                  >
                                    <span className="text-sm text-gray-100">{option.name}</span>
                                    <span className="text-xs text-gray-400 font-mono bg-[#0A0A0A] px-2 py-1 rounded">{option.code}</span>
                                  </button>
                                ))}
                                {getAirlineOptions()
                                  .filter((option) => 
                                    option.name.toLowerCase().includes(airline.toLowerCase()) ||
                                    option.code.toLowerCase().includes(airline.toLowerCase())
                                  ).length === 0 && (
                                  <div className="px-4 py-3 text-sm text-gray-500">No airlines found</div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Flight Number Card */}
                        <div className="glass-card rounded-2xl p-4 border border-border/50 shadow-premium transition-all duration-200 hover:shadow-premium-glow focus-within:border-primary/50 focus-within:shadow-premium-glow">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Search className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">FLIGHT NUMBER</label>
                          </div>
                          <input
                            type="text"
                            value={flightNumber}
                            onChange={(e) => setFlightNumber(e.target.value)}
                            placeholder="e.g., 123, 1847"
                            className="w-full bg-transparent border-none text-foreground text-base placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0"
                          />
                          {!flightNumber && (
                            <p className="text-xs text-muted-foreground/70 mt-2">Enter flight number</p>
                          )}
                        </div>

                        {/* Date Card */}
                        <div className="glass-card rounded-2xl p-4 border border-border/50 shadow-premium transition-all duration-200 hover:shadow-premium-glow focus-within:border-primary/50">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                              <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">DATE</label>
                          </div>
                          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                            <PopoverTrigger asChild>
                              <button className="w-full text-left">
                                <div className="text-base text-gray-100">
                                  {departureDate ? format(departureDate, "MMM dd, yyyy") : "Select departure date"}
                                </div>
                                {!departureDate && (
                                  <p className="text-xs text-gray-500 mt-1">Choose departure date</p>
                                )}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-[#1A1A1A] border-[#2A2A2A]" align="start">
                              <Calendar
                                mode="single"
                                selected={departureDate}
                                onSelect={(date) => {
                                  setDepartureDate(date);
                                  setIsCalendarOpen(false);
                                }}
                                initialFocus
                                className="bg-[#1A1A1A] text-gray-100"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              
              {/* Truly Sticky Search Button */}
              {!showResults && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A] to-transparent">
                  <div className="max-w-md mx-auto">
                    <button 
                      onClick={handleSearch} 
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-base font-medium py-3 rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                      {isLoading ? 'Searching...' : 'Search Flights'}
                    </button>
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
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
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
                        onSelect={(date) => {
                          setDepartureDate(date);
                          setIsCalendarOpen(false);
                        }}
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
                  <div className="col-span-2">
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