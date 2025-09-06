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

interface FlightSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (flight: any) => void;
  locations?: any[];
}

interface FlightOffer {
  id: string;
  source: string;
  instantTicketingRequired: boolean;
  nonHomogeneous: boolean;
  oneWay: boolean;
  lastTicketingDate: string;
  numberOfBookableSeats: number;
  itineraries: Array<{
    duration: string;
    segments: Array<{
      departure: {
        iataCode: string;
        terminal?: string;
        at: string;
      };
      arrival: {
        iataCode: string;
        terminal?: string;
        at: string;
      };
      carrierCode: string;
      number: string;
      aircraft: {
        code: string;
      };
      operating?: {
        carrierCode: string;
      };
      duration: string;
      id: string;
      numberOfStops: number;
      blacklistedInEU: boolean;
    }>;
  }>;
  price: {
    currency: string;
    total: string;
    base: string;
    fees: Array<{
      amount: string;
      type: string;
    }>;
    grandTotal: string;
  };
  pricingOptions: {
    fareType: string[];
    includedCheckedBagsOnly: boolean;
  };
  validatingAirlineCodes: string[];
  travelerPricings: Array<{
    travelerId: string;
    fareOption: string;
    travelerType: string;
    price: {
      currency: string;
      total: string;
      base: string;
    };
    fareDetailsBySegment: Array<{
      segmentId: string;
      cabin: string;
      fareBasis: string;
      brandedFare?: string;
      class: string;
      includedCheckedBags: {
        quantity: number;
      };
    }>;
  }>;
  dictionaries?: {
    locations?: Record<string, { cityCode: string; countryCode: string }>;
    aircraft?: Record<string, string>;
    currencies?: Record<string, string>;
    carriers?: Record<string, string>;
  };
}

export function EnhancedFlightSearchDialog({ isOpen, onClose }: FlightSearchDialogProps) {
  const [searchType, setSearchType] = useState<'route' | 'flight'>('route');
  const [fromAirport, setFromAirport] = useState('');
  const [toAirport, setToAirport] = useState('');
  const [departureDate, setDepartureDate] = useState<Date | undefined>();
  const [returnDate, setReturnDate] = useState<Date | undefined>();
  const [passengers, setPassengers] = useState('1');
  const [airline, setAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [flightResults, setFlightResults] = useState<FlightOffer[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stops, setStops] = useState('all');
  const [currentTimeZone, setCurrentTimeZone] = useState('UTC');
  const [airlineSearchTerm, setAirlineSearchTerm] = useState('');
  const [showAirlineDropdown, setShowAirlineDropdown] = useState(false);
  const [showAirlineFilter, setShowAirlineFilter] = useState(false);
  const [use24HourFormat, setUse24HourFormat] = useState(true);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const isMobile = useIsMobile();

  // Close dropdown when clicking outside
  useEffect(() => {
    if (showAirlineFilter) {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (!target.closest('.airline-filter-container')) {
          setShowAirlineFilter(false);
        }
      };
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
      
      if (searchType === 'route') {
        requestBody = {
          originLocationCode: fromAirport,
          destinationLocationCode: toAirport,
          departureDate: format(departureDate!, 'yyyy-MM-dd'),
          adults: parseInt(passengers),
          max: 250,
          nonStop: stops === 'nonstop' ? true : undefined
        };
      } else {
        requestBody = {
          flightNumber: flightNumber,
          scheduledDepartureDate: format(departureDate!, 'yyyy-MM-dd'),
          airlineCode: airline
        };
      }

      console.log('Flight search request:', requestBody);

      const { data, error: searchError } = await supabase.functions.invoke('amadeus-enhanced-flight-api', {
        body: requestBody
      });

      console.log('Flight search response:', { data, error: searchError });

      if (searchError) {
        console.error('Error searching flights:', searchError);
        throw new Error(searchError.message || 'Flight search failed');
      }

      if (data?.data) {
        let filteredResults = data.data;
        if (searchType === 'route') {
          // Filter for route searches with city groups
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

        // Filter by airline if specified (for route searches)
        if (searchType === 'route' && airline) {
          filteredResults = filteredResults.filter((flight: any) => {
            const segments = flight.itineraries?.[0]?.segments || [];
            return segments.some((segment: any) => 
              segment.carrierCode === airline || 
              segment.operating?.carrierCode === airline
            );
          });
        }
        
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

  const formatFlightTime = (datetime: string, timeZone?: string) => {
    try {
      const date = new Date(datetime);
      const tz = timeZone || currentTimeZone;
      
      if (use24HourFormat) {
        return formatInTimeZone(date, tz, 'HH:mm');
      } else {
        return formatInTimeZone(date, tz, 'h:mm a');
      }
    } catch (error) {
      console.error('Error formatting time:', error);
      return new Date(datetime).toLocaleTimeString();
    }
  };

  const formatFlightDate = (datetime: string) => {
    try {
      return format(new Date(datetime), 'MMM dd');
    } catch (error) {
      console.error('Error formatting date:', error);
      return new Date(datetime).toLocaleDateString();
    }
  };

  const calculateDuration = (duration: string) => {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return duration;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  const getAirlineLogo = (carrierCode: string): string => {
    return `https://www.gstatic.com/flights/airline_logos/70px/${carrierCode}.png`;
  };

  const renderFlightResults = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-muted-foreground">Searching for flights...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="text-center">
            <p className="text-destructive font-medium">Error searching flights</p>
            <p className="text-muted-foreground text-sm mt-1">{error}</p>
          </div>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Search
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button onClick={handleBack} variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              {flightResults.length} flight{flightResults.length !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>

        {flightResults.length === 0 ? (
          <div className="text-center py-12">
            <Plane className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground">No flights found</p>
            <p className="text-muted-foreground">Try adjusting your search criteria</p>
          </div>
        ) : (
          <div className="space-y-3">
            {flightResults.map((flight, index) => {
              const segment = flight.itineraries[0]?.segments[0];
              const lastSegment = flight.itineraries[0]?.segments[flight.itineraries[0].segments.length - 1];
              
              if (!segment || !lastSegment) return null;

              const stopCount = flight.itineraries[0].segments.length - 1;

              return (
                <Card key={flight.id || index} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="flex-shrink-0">
                          <img
                            src={getAirlineLogo(segment.carrierCode)}
                            alt={segment.carrierCode}
                            className="w-8 h-8 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>

                        <div className="flex-1 grid grid-cols-3 gap-4 items-center">
                          <div className="text-center">
                            <div className="font-mono text-lg font-bold">
                              {formatFlightTime(segment.departure.at)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {segment.departure.iataCode}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatFlightDate(segment.departure.at)}
                            </div>
                          </div>

                          <div className="text-center">
                            <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                              <div className="text-xs">
                                {calculateDuration(flight.itineraries[0].duration)}
                              </div>
                            </div>
                            <div className="flex items-center justify-center my-1">
                              <div className="w-16 h-px bg-border"></div>
                              <ArrowRight className="w-4 h-4 mx-2" />
                              <div className="w-16 h-px bg-border"></div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {stopCount === 0 ? 'Nonstop' : `${stopCount} stop${stopCount > 1 ? 's' : ''}`}
                            </div>
                          </div>

                          <div className="text-center">
                            <div className="font-mono text-lg font-bold">
                              {formatFlightTime(lastSegment.arrival.at)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {lastSegment.arrival.iataCode}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatFlightDate(lastSegment.arrival.at)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-right ml-4">
                        <div className="text-lg font-bold text-primary">
                          {flight.price.currency} {flight.price.total}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {segment.carrierCode} {segment.number}
                        </div>
                      </div>
                    </div>

                    {flight.itineraries[0].segments.length > 1 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs text-muted-foreground">
                          <strong>Segments:</strong> {flight.itineraries[0].segments.map((seg: any, i: number) => 
                            `${seg.departure.iataCode}-${seg.arrival.iataCode}`
                          ).join(', ')}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (isMobile) {
    console.log('🛩️ Rendering MOBILE version');
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-h-[95vh] bg-slate-900 border-slate-700">
          <div className="flex flex-col h-[95vh]">
            {/* Compact Sticky Header */}
            <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 h-14 bg-slate-900/95 backdrop-blur-md border-b border-slate-700 shadow-lg">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 px-3 rounded-full bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 text-sm"
              >
                <X className="h-4 w-4 mr-1.5" />
                Close
              </Button>
              <h2 className="text-base font-semibold text-slate-100 tracking-tight">Flight Search</h2>
              <div className="w-16"></div> {/* Spacer for center alignment */}
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-0 bg-gradient-to-b from-slate-900 to-slate-950">
              {showResults ? renderFlightResults() : (
                <div className="p-6 space-y-6">
                  {/* Premium Mode Toggle with Smooth Transitions */}
                  <div className="relative bg-slate-800/30 backdrop-blur-xl rounded-2xl p-1.5 border border-slate-700/50 shadow-xl">
                    <div className="flex relative">
                      <button
                        onClick={() => setSearchType('route')}
                        className={cn(
                          "flex-1 relative z-10 px-6 py-3.5 rounded-xl text-sm font-semibold tracking-tight transition-all duration-300 ease-in-out",
                          searchType === 'route'
                            ? "text-white"
                            : "text-slate-400 hover:text-slate-200"
                        )}
                      >
                        <div className="flex items-center justify-center space-x-2">
                          <Plane className="h-4 w-4" />
                          <span>By Route</span>
                        </div>
                      </button>
                      <button
                        onClick={() => setSearchType('flight')}
                        className={cn(
                          "flex-1 relative z-10 px-6 py-3.5 rounded-xl text-sm font-semibold tracking-tight transition-all duration-300 ease-in-out",
                          searchType === 'flight'
                            ? "text-white"
                            : "text-slate-400 hover:text-slate-200"
                        )}
                      >
                        <div className="flex items-center justify-center space-x-2">
                          <Search className="h-4 w-4" />
                          <span>By Number</span>
                        </div>
                      </button>
                      {/* Sliding indicator */}
                      <div 
                        className={cn(
                          "absolute top-1.5 bottom-1.5 w-1/2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/25 transition-transform duration-300 ease-in-out",
                          searchType === 'flight' && "translate-x-full"
                        )}
                      />
                    </div>
                  </div>

                  {/* Animated Form Content */}
                  <div 
                    key={searchType}
                    className="animate-fade-in space-y-5"
                  >
                    {searchType === 'route' ? (
                      <>
                        {/* Route Section Header */}
                        <div className="text-center pb-2">
                          <h3 className="text-lg font-semibold text-slate-100 mb-1">Flight Route Search</h3>
                          <p className="text-sm text-slate-400">Find flights between airports</p>
                        </div>

                        {/* From & To Airport Cards */}
                        <div className="space-y-4">
                          <div className="group relative bg-slate-800/50 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/30 shadow-lg hover:shadow-xl hover:border-slate-600/50 transition-all duration-300">
                            <label className="flex items-center space-x-2 text-xs font-medium text-slate-400 mb-4 tracking-wide uppercase">
                              <Plane className="h-3.5 w-3.5 opacity-60" />
                              <span>Departure Airport</span>
                            </label>
                            <div className="relative">
                              <AirportSearch
                                value={fromAirport}
                                onChange={setFromAirport}
                                placeholder="Search departure airport..."
                                className="w-full bg-transparent border-0 text-slate-100 placeholder:text-slate-500 focus:ring-0 text-base font-medium p-0 focus:outline-none"
                              />
                              {!fromAirport && (
                                <p className="text-xs text-slate-500 mt-3 flex items-center space-x-1">
                                  <span className="w-1 h-1 bg-slate-500 rounded-full opacity-60"></span>
                                  <span>Choose your departure city or airport</span>
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="group relative bg-slate-800/50 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/30 shadow-lg hover:shadow-xl hover:border-slate-600/50 transition-all duration-300">
                            <label className="flex items-center space-x-2 text-xs font-medium text-slate-400 mb-4 tracking-wide uppercase">
                              <Plane className="h-3.5 w-3.5 opacity-60 rotate-90" />
                              <span>Arrival Airport</span>
                            </label>
                            <div className="relative">
                              <AirportSearch
                                value={toAirport}
                                onChange={setToAirport}
                                placeholder="Search arrival airport..."
                                className="w-full bg-transparent border-0 text-slate-100 placeholder:text-slate-500 focus:ring-0 text-base font-medium p-0 focus:outline-none"
                              />
                              {!toAirport && (
                                <p className="text-xs text-slate-500 mt-3 flex items-center space-x-1">
                                  <span className="w-1 h-1 bg-slate-500 rounded-full opacity-60"></span>
                                  <span>Choose your destination city or airport</span>
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Route Direction Indicator */}
                          <div className="flex justify-center -my-2 relative z-10">
                            <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-full p-2 shadow-lg">
                              <ArrowRight className="h-4 w-4 text-slate-400" />
                            </div>
                          </div>
                        </div>

                        {/* Date Selection */}
                        <div className="group relative bg-slate-800/50 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/30 shadow-lg hover:shadow-xl hover:border-slate-600/50 transition-all duration-300">
                          <label className="flex items-center space-x-2 text-xs font-medium text-slate-400 mb-4 tracking-wide uppercase">
                            <CalendarIcon className="h-3.5 w-3.5 opacity-60" />
                            <span>Departure Date</span>
                          </label>
                          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                            <PopoverTrigger asChild>
                              <div className="cursor-pointer">
                                <div className={cn(
                                  "text-base font-medium transition-colors duration-200",
                                  departureDate ? "text-slate-100" : "text-slate-500"
                                )}>
                                  {departureDate ? format(departureDate, "EEEE, MMMM dd, yyyy") : "Select your departure date"}
                                </div>
                                {!departureDate && (
                                  <p className="text-xs text-slate-500 mt-3 flex items-center space-x-1">
                                    <span className="w-1 h-1 bg-slate-500 rounded-full opacity-60"></span>
                                    <span>Tap to open calendar</span>
                                  </p>
                                )}
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-slate-800/95 backdrop-blur-xl border-slate-700/50 shadow-2xl" align="start">
                              <Calendar
                                mode="single"
                                selected={departureDate}
                                onSelect={(date) => {
                                  setDepartureDate(date);
                                  setIsCalendarOpen(false);
                                }}
                                initialFocus
                                className="pointer-events-auto bg-slate-800/95 text-slate-100"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Passengers & Stops Grid */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="group relative bg-slate-800/50 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/30 shadow-lg hover:shadow-xl hover:border-slate-600/50 transition-all duration-300">
                            <label className="flex items-center space-x-2 text-xs font-medium text-slate-400 mb-4 tracking-wide uppercase">
                              <ArrowRight className="h-3.5 w-3.5 opacity-60" />
                              <span>Passengers</span>
                            </label>
                            <Select value={passengers} onValueChange={setPassengers}>
                              <SelectTrigger className="bg-transparent border-0 text-slate-100 focus:ring-0 p-0 h-auto text-base font-medium">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800/95 backdrop-blur-xl border-slate-700/50 shadow-2xl">
                                <SelectItem value="1" className="text-slate-100 hover:bg-slate-700/50">1 Adult</SelectItem>
                                <SelectItem value="2" className="text-slate-100 hover:bg-slate-700/50">2 Adults</SelectItem>
                                <SelectItem value="3" className="text-slate-100 hover:bg-slate-700/50">3 Adults</SelectItem>
                                <SelectItem value="4" className="text-slate-100 hover:bg-slate-700/50">4 Adults</SelectItem>
                                <SelectItem value="5" className="text-slate-100 hover:bg-slate-700/50">5+ Adults</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="group relative bg-slate-800/50 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/30 shadow-lg hover:shadow-xl hover:border-slate-600/50 transition-all duration-300">
                            <label className="flex items-center space-x-2 text-xs font-medium text-slate-400 mb-4 tracking-wide uppercase">
                              <Clock className="h-3.5 w-3.5 opacity-60" />
                              <span>Stops</span>
                            </label>
                            <Select value={stops} onValueChange={setStops}>
                              <SelectTrigger className="bg-transparent border-0 text-slate-100 focus:ring-0 p-0 h-auto text-base font-medium">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800/95 backdrop-blur-xl border-slate-700/50 shadow-2xl">
                                <SelectItem value="all" className="text-slate-100 hover:bg-slate-700/50">Any stops</SelectItem>
                                <SelectItem value="nonstop" className="text-slate-100 hover:bg-slate-700/50">Nonstop only</SelectItem>
                                <SelectItem value="onestop" className="text-slate-100 hover:bg-slate-700/50">1 stop max</SelectItem>
                                <SelectItem value="twostops" className="text-slate-100 hover:bg-slate-700/50">2+ stops</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Airline Preference */}
                        <div className="group relative bg-slate-800/50 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/30 shadow-lg hover:shadow-xl hover:border-slate-600/50 transition-all duration-300">
                          <label className="flex items-center space-x-2 text-xs font-medium text-slate-400 mb-4 tracking-wide uppercase">
                            <Plane className="h-3.5 w-3.5 opacity-60" />
                            <span>Airline Preference</span>
                          </label>
                          <div className="relative">
                            <Button
                              variant="ghost"
                              onClick={() => setShowAirlineFilter(!showAirlineFilter)}
                              className="w-full justify-between bg-transparent hover:bg-slate-700/30 text-slate-100 p-0 h-auto text-base font-medium"
                            >
                              <span>
                                {airline ? getAirlineName(airline) : (
                                  <span className="text-slate-500">Any airline</span>
                                )}
                              </span>
                              <ChevronDown className={cn(
                                "h-4 w-4 text-slate-400 transition-transform duration-300",
                                showAirlineFilter && "rotate-180"
                              )} />
                            </Button>
                            
                            {showAirlineFilter && (
                              <div className="absolute top-full left-0 right-0 mt-3 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl max-h-48 overflow-y-auto z-50 animate-fade-in">
                                <div className="p-3 border-b border-slate-700/50">
                                  <input
                                    type="text"
                                    placeholder="Search airlines..."
                                    value={airlineSearchTerm}
                                    onChange={(e) => setAirlineSearchTerm(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-slate-100 placeholder:text-slate-400 text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                                  />
                                </div>
                                {getAirlineOptions()
                                  .filter((option) => 
                                    option.name.toLowerCase().includes(airlineSearchTerm.toLowerCase()) ||
                                    option.code.toLowerCase().includes(airlineSearchTerm.toLowerCase())
                                  )
                                  .map((option) => (
                                    <button
                                      key={option.code}
                                      onClick={() => {
                                        setAirline(option.code);
                                        setShowAirlineFilter(false);
                                        setAirlineSearchTerm('');
                                      }}
                                      className="w-full px-4 py-3 text-left hover:bg-slate-700/50 flex items-center justify-between transition-all duration-200 group"
                                    >
                                      <span className="text-sm text-slate-100 group-hover:text-white">{option.name}</span>
                                      <span className="text-xs text-slate-400 font-mono group-hover:text-slate-300">{option.code}</span>
                                    </button>
                                  ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Flight Number Section Header */}
                        <div className="text-center pb-2">
                          <h3 className="text-lg font-semibold text-slate-100 mb-1">Flight Number Search</h3>
                          <p className="text-sm text-slate-400">Track specific flights by number</p>
                        </div>

                        {/* Airline & Flight Number Group */}
                        <div className="space-y-4">
                          <div className="group relative bg-slate-800/50 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/30 shadow-lg hover:shadow-xl hover:border-slate-600/50 transition-all duration-300">
                            <label className="flex items-center space-x-2 text-xs font-medium text-slate-400 mb-4 tracking-wide uppercase">
                              <Plane className="h-3.5 w-3.5 opacity-60" />
                              <span>Airline</span>
                            </label>
                            <input
                              type="text"
                              value={airline}
                              onChange={(e) => setAirline(e.target.value.toUpperCase())}
                              placeholder="Enter airline code (e.g. AA, UA, DL)"
                              className="w-full bg-transparent border-0 text-slate-100 placeholder:text-slate-500 focus:ring-0 text-base font-medium p-0 outline-none"
                            />
                            {!airline && (
                              <p className="text-xs text-slate-500 mt-3 flex items-center space-x-1">
                                <span className="w-1 h-1 bg-slate-500 rounded-full opacity-60"></span>
                                <span>Enter two-letter airline code</span>
                              </p>
                            )}
                          </div>

                          <div className="group relative bg-slate-800/50 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/30 shadow-lg hover:shadow-xl hover:border-slate-600/50 transition-all duration-300">
                            <label className="flex items-center space-x-2 text-xs font-medium text-slate-400 mb-4 tracking-wide uppercase">
                              <Search className="h-3.5 w-3.5 opacity-60" />
                              <span>Flight Number</span>
                            </label>
                            <input
                              type="text"
                              value={flightNumber}
                              onChange={(e) => setFlightNumber(e.target.value)}
                              placeholder="Enter flight number (e.g. 1234)"
                              className="w-full bg-transparent border-0 text-slate-100 placeholder:text-slate-500 focus:ring-0 text-base font-medium p-0 outline-none"
                            />
                            {!flightNumber && (
                              <p className="text-xs text-slate-500 mt-3 flex items-center space-x-1">
                                <span className="w-1 h-1 bg-slate-500 rounded-full opacity-60"></span>
                                <span>Enter the flight number digits</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Flight Date */}
                        <div className="group relative bg-slate-800/50 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/30 shadow-lg hover:shadow-xl hover:border-slate-600/50 transition-all duration-300">
                          <label className="flex items-center space-x-2 text-xs font-medium text-slate-400 mb-4 tracking-wide uppercase">
                            <CalendarIcon className="h-3.5 w-3.5 opacity-60" />
                            <span>Flight Date</span>
                          </label>
                          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                            <PopoverTrigger asChild>
                              <div className="cursor-pointer">
                                <div className={cn(
                                  "text-base font-medium transition-colors duration-200",
                                  departureDate ? "text-slate-100" : "text-slate-500"
                                )}>
                                  {departureDate ? format(departureDate, "EEEE, MMMM dd, yyyy") : "Select flight date"}
                                </div>
                                {!departureDate && (
                                  <p className="text-xs text-slate-500 mt-3 flex items-center space-x-1">
                                    <span className="w-1 h-1 bg-slate-500 rounded-full opacity-60"></span>
                                    <span>Tap to open calendar</span>
                                  </p>
                                )}
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-slate-800/95 backdrop-blur-xl border-slate-700/50 shadow-2xl" align="start">
                              <Calendar
                                mode="single"
                                selected={departureDate}
                                onSelect={(date) => {
                                  setDepartureDate(date);
                                  setIsCalendarOpen(false);
                                }}
                                initialFocus
                                className="pointer-events-auto bg-slate-800/95 text-slate-100"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Bottom Spacer for Sticky Button */}
                  <div className="h-20"></div>
                </div>
              )}
            </div>
            
            {/* Premium Sticky Search Button */}
            {!showResults && (
              <div className="sticky bottom-0 z-50 bg-gradient-to-t from-slate-950 via-slate-900/95 to-transparent pt-6 pb-4 px-4 backdrop-blur-xl">
                <div className="relative">
                  {/* Glow effect behind button */}
                  <div className="absolute -top-1 -left-1 -right-1 -bottom-1 bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-3xl blur opacity-75"></div>
                  
                  <Button
                    onClick={handleSearch}
                    disabled={isLoading || (searchType === 'route' && (!fromAirport || !toAirport || !departureDate)) || (searchType === 'flight' && (!flightNumber || !airline || !departureDate))}
                    className={cn(
                      "relative w-full h-14 rounded-2xl font-bold text-lg tracking-tight transition-all duration-300 ease-out shadow-2xl border border-blue-500/20",
                      isLoading || (searchType === 'route' && (!fromAirport || !toAirport || !departureDate)) || (searchType === 'flight' && (!flightNumber || !airline || !departureDate))
                        ? "bg-slate-700/80 text-slate-400 shadow-slate-900/50 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-blue-500/30 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98]"
                    )}
                  >
                    <div className="flex items-center justify-center space-x-3">
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          <span>Searching Flights...</span>
                        </>
                      ) : (
                        <>
                          <Search className="h-5 w-5" />
                          <span>Search Flights</span>
                        </>
                      )}
                    </div>
                  </Button>
                </div>
              </div>
            )}
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
                    "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors",
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
                    "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors",
                    searchType === 'flight'
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Search by Flight Number
                </button>
              </div>
              
              {searchType === 'route' ? (
                <>
                  {/* From and To sections */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">From</label>
                      <AirportSearch
                        value={fromAirport}
                        onChange={setFromAirport}
                        placeholder="Enter departure airport"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">To</label>
                      <AirportSearch
                        value={toAirport}
                        onChange={setToAirport}
                        placeholder="Enter arrival airport"
                        className="w-full"
                      />
                    </div>
                  </div>
                
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
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">Passengers</label>
                      <Select value={passengers} onValueChange={setPassengers}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Adult</SelectItem>
                          <SelectItem value="2">2 Adults</SelectItem>
                          <SelectItem value="3">3 Adults</SelectItem>
                          <SelectItem value="4">4 Adults</SelectItem>
                          <SelectItem value="5">5+ Adults</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">Stops</label>
                      <Select value={stops} onValueChange={setStops}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any stops</SelectItem>
                          <SelectItem value="nonstop">Nonstop</SelectItem>
                          <SelectItem value="onestop">1 stop</SelectItem>
                          <SelectItem value="twostops">2+ stops</SelectItem>
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
                          <span>{airline ? getAirlineName(airline) : "Select airline"}</span>
                          <ChevronDown className={cn(
                            "h-4 w-4 transition-transform",
                            showAirlineFilter && "rotate-180"
                          )} />
                        </Button>
                        
                        {showAirlineFilter && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto z-50">
                            <div className="p-3 border-b">
                              <input
                                type="text"
                                placeholder="Search airlines..."
                                value={airlineSearchTerm}
                                onChange={(e) => setAirlineSearchTerm(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                              />
                            </div>
                            {getAirlineOptions()
                              .filter((option) => 
                                option.name.toLowerCase().includes(airlineSearchTerm.toLowerCase()) ||
                                option.code.toLowerCase().includes(airlineSearchTerm.toLowerCase())
                              )
                              .map((option) => (
                                <button
                                  key={option.code}
                                  onClick={() => {
                                    setAirline(option.code);
                                    setShowAirlineFilter(false);
                                    setAirlineSearchTerm('');
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-muted flex items-center justify-between"
                                >
                                  <span className="text-sm text-foreground">{option.name}</span>
                                  <span className="text-xs text-muted-foreground font-mono">{option.code}</span>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">Airline</label>
                      <input
                        type="text"
                        value={airline}
                        onChange={(e) => setAirline(e.target.value.toUpperCase())}
                        placeholder="Enter airline code (e.g. AA, UA)"
                        className="w-full px-3 py-2 border border-border rounded-md bg-background"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">Flight Number</label>
                      <input
                        type="text"
                        value={flightNumber}
                        onChange={(e) => setFlightNumber(e.target.value)}
                        placeholder="Enter flight number"
                        className="w-full px-3 py-2 border border-border rounded-md bg-background"
                      />
                    </div>
                  </div>
                  
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
                </>
              )}

              <Button
                onClick={handleSearch}
                disabled={isLoading || (searchType === 'route' && (!fromAirport || !toAirport || !departureDate)) || (searchType === 'flight' && (!flightNumber || !airline || !departureDate))}
                className="w-full"
              >
                {isLoading ? "Searching..." : "Search Flights"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}