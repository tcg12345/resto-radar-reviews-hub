import { useState, useEffect } from 'react';
import { format, parseISO, addDays, startOfDay } from 'date-fns';
import { 
  Search, 
  Plane, 
  Clock, 
  MapPin, 
  Filter, 
  ArrowRight, 
  Users, 
  Star, 
  ArrowLeft, 
  X, 
  Calendar, 
  DollarSign,
  Info,
  Wifi,
  Utensils,
  Luggage,
  Monitor,
  Zap,
  ArrowUpDown,
  Plus,
  Minus,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
import { useEnhancedAmadeusApi, type EnhancedFlightOffer, type PriceCalendar } from '@/hooks/useEnhancedAmadeusApi';
import { AirportSearch } from '@/components/AirportSearch';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';

interface LocationSuggestion {
  id: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

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

interface TravelersConfig {
  adults: number;
  children: number;
  infants: number;
}

export function EnhancedFlightSearchDialog({ isOpen, onClose, onSelect, locations }: EnhancedFlightSearchDialogProps) {
  const [departureAirport, setDepartureAirport] = useState('');
  const [arrivalAirport, setArrivalAirport] = useState('');
  const [departureDate, setDepartureDate] = useState<string>('');
  const [returnDate, setReturnDate] = useState<string>('');
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [travelers, setTravelers] = useState<TravelersConfig>({ adults: 1, children: 0, infants: 0 });
  const [travelClass, setTravelClass] = useState<'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST'>('ECONOMY');
  const [nonStop, setNonStop] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number | undefined>();
  const [currency, setCurrency] = useState('USD');
  
  const [flights, setFlights] = useState<EnhancedFlightOffer[]>([]);
  const [priceCalendar, setPriceCalendar] = useState<PriceCalendar[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showPriceCalendar, setShowPriceCalendar] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<EnhancedFlightOffer | null>(null);
  
  const isMobile = useIsMobile();
  const [showFilters, setShowFilters] = useState(!isMobile);
  const [activeTab, setActiveTab] = useState('search');
  
  const { 
    searchFlights, 
    getFlightPriceCalendar, 
    getAirportInfo, 
    getAirlineInfo,
    searchLocations 
  } = useEnhancedAmadeusApi();

  const handleSearch = async () => {
    const originCode = departureAirport.match(/\(([A-Z]{3})\)/)?.[1] || departureAirport.slice(-3).toUpperCase();
    const destinationCode = arrivalAirport.match(/\(([A-Z]{3})\)/)?.[1] || arrivalAirport.slice(-3).toUpperCase();
    
    if (!originCode || !destinationCode || !departureDate) {
      toast.error('Please select departure and arrival airports and date');
      return;
    }

    if (originCode.length !== 3 || destinationCode.length !== 3) {
      toast.error('Please select valid airports with IATA codes');
      return;
    }

    setIsSearching(true);
    try {
      const searchParams = {
        origin: originCode,
        destination: destinationCode,
        departureDate,
        returnDate: isRoundTrip ? returnDate : undefined,
        adults: travelers.adults,
        children: travelers.children,
        infants: travelers.infants,
        travelClass,
        nonStop,
        maxPrice,
        currency,
        max: 20
      };

      const results = await searchFlights(searchParams);
      setFlights(results.data);

      if (results.data.length === 0) {
        toast.info('No flights found for the specified criteria');
      } else {
        toast.success(`Found ${results.data.length} flights`);
        setShowResults(true);
        setActiveTab('results');
      }
    } catch (error) {
      console.error('Error searching flights:', error);
      toast.error('Failed to search flights. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleGetPriceCalendar = async () => {
    const originCode = departureAirport.match(/\(([A-Z]{3})\)/)?.[1] || departureAirport.slice(-3).toUpperCase();
    const destinationCode = arrivalAirport.match(/\(([A-Z]{3})\)/)?.[1] || arrivalAirport.slice(-3).toUpperCase();
    
    if (!originCode || !destinationCode || !departureDate) {
      toast.error('Please select airports and departure date first');
      return;
    }

    try {
      const calendar = await getFlightPriceCalendar({
        origin: originCode,
        destination: destinationCode,
        departureDate,
        oneWay: !isRoundTrip
      });
      
      setPriceCalendar(calendar);
      setShowPriceCalendar(true);
      setActiveTab('calendar');
      
      if (calendar.length === 0) {
        toast.info('Price calendar not available for this route');
      }
    } catch (error) {
      console.error('Error getting price calendar:', error);
      toast.error('Failed to get price calendar');
    }
  };

  const handleFlightSelect = (flight: EnhancedFlightOffer) => {
    onSelect({
      flightNumber: flight.flightNumber,
      airline: flight.airline,
      departure: flight.departure,
      arrival: flight.arrival,
      duration: flight.duration,
      price: `${flight.price.currency} ${flight.price.total}`,
      stops: flight.stops,
      cabin: flight.cabin,
      aircraft: flight.aircraft,
      operatedBy: flight.operatedBy,
      fareType: flight.fareType,
      includedBaggage: flight.includedBaggage,
    });
    handleClose();
    toast.success('Flight added to your itinerary!');
  };

  const handleFlightDetails = (flight: EnhancedFlightOffer) => {
    setSelectedFlight(flight);
    setActiveTab('details');
  };

  const updateTravelers = (type: keyof TravelersConfig, increment: boolean) => {
    setTravelers(prev => {
      const current = prev[type];
      const newValue = increment ? current + 1 : Math.max(0, current - 1);
      
      // Ensure at least 1 adult
      if (type === 'adults' && newValue < 1) return prev;
      
      return { ...prev, [type]: newValue };
    });
  };

  const getTotalTravelers = () => travelers.adults + travelers.children + travelers.infants;

  const handleClose = () => {
    setDepartureAirport('');
    setArrivalAirport('');
    setDepartureDate('');
    setReturnDate('');
    setIsRoundTrip(false);
    setTravelers({ adults: 1, children: 0, infants: 0 });
    setTravelClass('ECONOMY');
    setNonStop(false);
    setMaxPrice(undefined);
    setFlights([]);
    setPriceCalendar([]);
    setShowResults(false);
    setShowPriceCalendar(false);
    setSelectedFlight(null);
    setActiveTab('search');
    onClose();
  };

  const formatDuration = (duration: string) => {
    const match = duration.match(/PT(\d+H)?(\d+M)?/);
    if (!match) return duration;
    
    const hours = match[1] ? match[1].replace('H', 'h ') : '';
    const minutes = match[2] ? match[2].replace('M', 'm') : '';
    return hours + minutes;
  };

  const getCabinIcon = (cabin: string) => {
    switch (cabin) {
      case 'FIRST': return <Star className="w-4 h-4 text-yellow-500" />;
      case 'BUSINESS': return <Monitor className="w-4 h-4 text-blue-500" />;
      case 'PREMIUM_ECONOMY': return <Plus className="w-4 h-4 text-green-500" />;
      default: return <Users className="w-4 h-4 text-gray-500" />;
    }
  };

  const getClassColor = (cabin: string) => {
    switch (cabin) {
      case 'FIRST': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'BUSINESS': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PREMIUM_ECONOMY': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const FlightCard = ({ flight }: { flight: EnhancedFlightOffer }) => (
    <Card className="p-4 hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-primary">
      <div className="space-y-4">
        {/* Flight Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Plane className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{flight.flightNumber}</h3>
              <p className="text-sm text-muted-foreground">{flight.airline}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{flight.price.currency} {flight.price.total}</p>
            <p className="text-xs text-muted-foreground">per person</p>
          </div>
        </div>

        {/* Route and Time */}
        <div className="flex items-center justify-between">
          <div className="text-center">
            <p className="text-xl font-bold">{flight.departure.time}</p>
            <p className="text-sm font-medium">{flight.departure.airport}</p>
            <p className="text-xs text-muted-foreground">{flight.departure.date}</p>
            {flight.departure.terminal && (
              <p className="text-xs text-blue-600">Terminal {flight.departure.terminal}</p>
            )}
          </div>

          <div className="flex-1 mx-4">
            <div className="flex items-center justify-center">
              <div className="flex-1 h-px bg-border"></div>
              <div className="mx-2 text-xs bg-muted rounded-full px-2 py-1">
                {formatDuration(flight.duration)}
              </div>
              <div className="flex-1 h-px bg-border"></div>
            </div>
            <div className="text-center mt-1">
              {flight.stops === 0 ? (
                <Badge variant="secondary" className="text-xs">Direct</Badge>
              ) : (
                <Badge variant="outline" className="text-xs">{flight.stops} stop{flight.stops > 1 ? 's' : ''}</Badge>
              )}
            </div>
          </div>

          <div className="text-center">
            <p className="text-xl font-bold">{flight.arrival.time}</p>
            <p className="text-sm font-medium">{flight.arrival.airport}</p>
            <p className="text-xs text-muted-foreground">{flight.arrival.date}</p>
            {flight.arrival.terminal && (
              <p className="text-xs text-blue-600">Terminal {flight.arrival.terminal}</p>
            )}
          </div>
        </div>

        {/* Flight Details */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              {getCabinIcon(flight.cabin)}
              <span className={cn("px-2 py-1 rounded-md text-xs font-medium border", getClassColor(flight.cabin))}>
                {flight.cabin.replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Plane className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{flight.aircraft}</span>
            </div>
            <div className="flex items-center gap-1">
              <Luggage className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{flight.includedBaggage.quantity} bag</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleFlightDetails(flight)}
              className="text-xs"
            >
              <Info className="w-3 h-3 mr-1" />
              Details
            </Button>
            <Button 
              size="sm"
              onClick={() => handleFlightSelect(flight)}
              className="text-xs"
            >
              Select Flight
            </Button>
          </div>
        </div>

        {/* Additional Info */}
        {flight.operatedBy && flight.operatedBy !== flight.airline && (
          <p className="text-xs text-muted-foreground">Operated by {flight.operatedBy}</p>
        )}
      </div>
    </Card>
  );

  const PriceCalendarCard = ({ priceData }: { priceData: PriceCalendar }) => (
    <Card className="p-3 hover:shadow-md transition-all cursor-pointer">
      <div className="text-center space-y-2">
        <p className="text-sm font-medium">{format(parseISO(priceData.departureDate), 'MMM dd')}</p>
        <p className="text-lg font-bold text-primary">{priceData.price.currency} {priceData.price.total}</p>
        <div className="flex items-center justify-center gap-1">
          <TrendingDown className="w-3 h-3 text-green-500" />
          <span className="text-xs text-green-600">Best Price</span>
        </div>
      </div>
    </Card>
  );

  const FlightDetailsView = () => {
    if (!selectedFlight) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setActiveTab('results')}
            className="h-9 w-9 rounded-full"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h3 className="text-lg font-semibold">Flight Details</h3>
            <p className="text-sm text-muted-foreground">{selectedFlight.flightNumber}</p>
          </div>
        </div>

        <Card className="p-6">
          <div className="space-y-6">
            {/* Price Breakdown */}
            <div>
              <h4 className="font-semibold mb-3">Price Breakdown</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Base Fare</span>
                  <span>{selectedFlight.price.currency} {selectedFlight.price.base}</span>
                </div>
                {selectedFlight.price.fees?.map((fee, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{fee.type}</span>
                    <span>{selectedFlight.price.currency} {fee.amount}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{selectedFlight.price.currency} {selectedFlight.price.total}</span>
                </div>
              </div>
            </div>

            {/* Included Services */}
            <div>
              <h4 className="font-semibold mb-3">Included Services</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Luggage className="w-4 h-4 text-green-500" />
                  <span className="text-sm">{selectedFlight.includedBaggage.quantity} Checked Bag</span>
                </div>
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Meal Service</span>
                </div>
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Entertainment</span>
                </div>
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">WiFi Available</span>
                </div>
              </div>
            </div>

            {/* Fare Type */}
            <div>
              <h4 className="font-semibold mb-3">Fare Information</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{selectedFlight.fareType.join(', ')}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Booking Class: <span className="font-medium">{selectedFlight.bookingClass}</span>
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Button 
          onClick={() => handleFlightSelect(selectedFlight)}
          className="w-full h-12 text-base font-semibold"
        >
          Select This Flight
        </Button>
      </div>
    );
  };

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={handleClose}>
        <DrawerContent className="h-[90vh] bg-background/95 backdrop-blur">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <DrawerTitle className="text-lg font-semibold">Enhanced Flight Search</DrawerTitle>
                <DrawerDescription className="text-sm text-muted-foreground">
                  Find flights with detailed information and pricing
                </DrawerDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-4 mx-4 mt-2">
                <TabsTrigger value="search" className="text-xs">Search</TabsTrigger>
                <TabsTrigger value="calendar" className="text-xs">Calendar</TabsTrigger>
                <TabsTrigger value="results" className="text-xs">Results</TabsTrigger>
                <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-hidden">
                <TabsContent value="search" className="h-full flex flex-col">
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Trip Type */}
                    <Card className="p-4">
                      <div className="flex items-center gap-4">
                        <Label className="text-sm font-medium">Trip Type:</Label>
                        <div className="flex gap-2">
                          <Button
                            variant={!isRoundTrip ? "default" : "outline"}
                            size="sm"
                            onClick={() => setIsRoundTrip(false)}
                          >
                            One Way
                          </Button>
                          <Button
                            variant={isRoundTrip ? "default" : "outline"}
                            size="sm"
                            onClick={() => setIsRoundTrip(true)}
                          >
                            Round Trip
                          </Button>
                        </div>
                      </div>
                    </Card>

                    {/* Route */}
                    <Card className="p-4 space-y-4">
                      <Label className="text-sm font-semibold">Route</Label>
                      <div className="space-y-3">
                        <AirportSearch
                          value={departureAirport}
                          onChange={setDepartureAirport}
                          placeholder="From (Airport or City)"
                        />
                        <div className="flex justify-center">
                          <Button variant="ghost" size="icon" className="rounded-full">
                            <ArrowUpDown className="w-4 h-4" />
                          </Button>
                        </div>
                        <AirportSearch
                          value={arrivalAirport}
                          onChange={setArrivalAirport}
                          placeholder="To (Airport or City)"
                        />
                      </div>
                    </Card>

                    {/* Dates */}
                    <Card className="p-4 space-y-4">
                      <Label className="text-sm font-semibold">Travel Dates</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Departure</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !departureDate && "text-muted-foreground"
                                )}
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                {departureDate ? format(new Date(departureDate), "PPP") : "Select departure date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={departureDate ? new Date(departureDate) : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    setDepartureDate(format(date, 'yyyy-MM-dd'));
                                  }
                                }}
                                disabled={(date) =>
                                  date < new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        {isRoundTrip && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Return</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !returnDate && "text-muted-foreground"
                                  )}
                                >
                                  <Calendar className="mr-2 h-4 w-4" />
                                  {returnDate ? format(new Date(returnDate), "PPP") : "Select return date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                  mode="single"
                                  selected={returnDate ? new Date(returnDate) : undefined}
                                  onSelect={(date) => {
                                    if (date) {
                                      setReturnDate(format(date, 'yyyy-MM-dd'));
                                    }
                                  }}
                                  disabled={(date) =>
                                    date < new Date(departureDate || new Date()) || date < new Date("1900-01-01")
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        )}
                      </div>
                    </Card>

                    {/* Travelers */}
                    <Card className="p-4 space-y-4">
                      <Label className="text-sm font-semibold">Travelers ({getTotalTravelers()})</Label>
                      <div className="space-y-3">
                        {(['adults', 'children', 'infants'] as const).map((type) => (
                          <div key={type} className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium capitalize">{type}</p>
                              <p className="text-xs text-muted-foreground">
                                {type === 'adults' && '12+ years'}
                                {type === 'children' && '2-11 years'}
                                {type === 'infants' && 'Under 2 years'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateTravelers(type, false)}
                                disabled={travelers[type] === 0 || (type === 'adults' && travelers[type] === 1)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-8 text-center">{travelers[type]}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateTravelers(type, true)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>

                    {/* Class & Options */}
                    <Card className="p-4 space-y-4">
                      <Label className="text-sm font-semibold">Preferences</Label>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Travel Class</Label>
                          <Select value={travelClass} onValueChange={(value: any) => setTravelClass(value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ECONOMY">Economy</SelectItem>
                              <SelectItem value="PREMIUM_ECONOMY">Premium Economy</SelectItem>
                              <SelectItem value="BUSINESS">Business</SelectItem>
                              <SelectItem value="FIRST">First Class</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Direct flights only</Label>
                          <Button
                            variant={nonStop ? "default" : "outline"}
                            size="sm"
                            onClick={() => setNonStop(!nonStop)}
                          >
                            {nonStop ? "Yes" : "No"}
                          </Button>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Max Price ({currency})</Label>
                          <Input
                            type="number"
                            placeholder="Optional"
                            value={maxPrice || ''}
                            onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Fixed Search Actions at Bottom */}
                  <div className="border-t bg-background p-4 space-y-2">
                    <Button
                      onClick={handleSearch}
                      disabled={isSearching || !departureAirport || !arrivalAirport || !departureDate}
                      className="w-full h-12"
                    >
                      {isSearching ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent mr-2" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-2" />
                          Search Flights
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleGetPriceCalendar}
                      disabled={!departureAirport || !arrivalAirport || !departureDate}
                      className="w-full"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      View Price Calendar
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="calendar" className="h-full overflow-y-auto p-4">
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold">Price Calendar</h3>
                      <p className="text-sm text-muted-foreground">Find the best prices around your travel dates</p>
                    </div>
                    
                    {priceCalendar.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {priceCalendar.map((priceData, index) => (
                          <PriceCalendarCard key={index} priceData={priceData} />
                        ))}
                      </div>
                    ) : (
                      <Card className="p-8 text-center">
                        <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No price calendar data available</p>
                        <Button 
                          variant="outline" 
                          className="mt-4"
                          onClick={handleGetPriceCalendar}
                        >
                          Try Again
                        </Button>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="results" className="h-full overflow-y-auto p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">{flights.length} Flights Found</h3>
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab('search')}>
                        <Filter className="w-4 h-4 mr-2" />
                        Filter
                      </Button>
                    </div>
                    
                    {flights.length > 0 ? (
                      <div className="space-y-4">
                        {flights.map((flight) => (
                          <FlightCard key={flight.id} flight={flight} />
                        ))}
                      </div>
                    ) : (
                      <Card className="p-8 text-center">
                        <Plane className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No flights found</p>
                        <Button 
                          variant="outline" 
                          className="mt-4"
                          onClick={() => setActiveTab('search')}
                        >
                          Modify Search
                        </Button>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="details" className="h-full overflow-y-auto p-4">
                  <FlightDetailsView />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop version would follow similar pattern but with Dialog instead of Drawer
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Enhanced Flight Search</DialogTitle>
          <DialogDescription>
            Find flights with detailed information and pricing using Amadeus
          </DialogDescription>
        </DialogHeader>
        
        {/* Desktop content would be similar but laid out for larger screens */}
        <div className="text-center p-8">
          <p className="text-muted-foreground">Desktop version coming soon. Please use mobile view for now.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}