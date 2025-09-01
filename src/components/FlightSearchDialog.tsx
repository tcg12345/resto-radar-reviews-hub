import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Search, Plane, Clock, MapPin, Filter, ArrowRight, Users, Star, ArrowLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAmadeusApi } from '@/hooks/useAmadeusApi';
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

interface FlightSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (flight: any) => void;
  locations: TripLocation[];
}

interface Flight {
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
  duration?: string;
  price?: string;
  stops?: number;
  stopLocations?: string[];
  bookingUrl?: string;
}

export function FlightSearchDialog({ isOpen, onClose, onSelect, locations }: FlightSearchDialogProps) {
  const [departureAirport, setDepartureAirport] = useState('');
  const [arrivalAirport, setArrivalAirport] = useState('');
  const [departureCity, setDepartureCity] = useState<LocationSuggestion | null>(null);
  const [arrivalCity, setArrivalCity] = useState<LocationSuggestion | null>(null);
  const [flightNumber, setFlightNumber] = useState('');
  const [airline, setAirline] = useState('');
  const [flightType, setFlightType] = useState<'nonstop' | 'onestop' | 'any'>('any');
  const [departureTimeFrom, setDepartureTimeFrom] = useState('');
  const [departureTimeTo, setDepartureTimeTo] = useState('');
  const [flights, setFlights] = useState<Flight[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showResults, setShowResults] = useState(false);
  
  const isMobile = useIsMobile();
  const [showFilters, setShowFilters] = useState(!isMobile);
  
  const { searchFlights } = useAmadeusApi();

  const handleSearch = async () => {
    const originCode = departureAirport.match(/\(([A-Z]{3})\)/)?.[1] || departureAirport.slice(-3).toUpperCase();
    const destinationCode = arrivalAirport.match(/\(([A-Z]{3})\)/)?.[1] || arrivalAirport.slice(-3).toUpperCase();
    
    if (!originCode || !destinationCode || !selectedDate) {
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
        departureDate: selectedDate,
        flightNumber: flightNumber || undefined,
        airline: airline || undefined,
        flightType: flightType,
        departureTimeFrom: departureTimeFrom || undefined,
        departureTimeTo: departureTimeTo || undefined,
      };

      const results = await searchFlights(searchParams);
      setFlights(results);

      if (results.length === 0) {
        toast.info('No flights found for the specified criteria');
      } else {
        toast.success(`Found ${results.length} flights`);
        setShowResults(true); // Show results popup
      }
    } catch (error) {
      console.error('Error searching flights:', error);
      toast.error('Failed to search flights. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleFlightSelect = (flight: Flight) => {
    onSelect({
      flightNumber: flight.flightNumber,
      airline: flight.airline,
      departure: flight.departure,
      arrival: flight.arrival,
      duration: flight.duration,
      price: flight.price,
      bookingUrl: flight.bookingUrl,
    });
    handleClose();
    toast.success('Flight added to your itinerary!');
  };

  const handleClose = () => {
    setDepartureAirport('');
    setArrivalAirport('');
    setDepartureCity(null);
    setArrivalCity(null);
    setFlightNumber('');
    setAirline('');
    setFlightType('any');
    setDepartureTimeFrom('');
    setDepartureTimeTo('');
    setSelectedDate('');
    setFlights([]);
    setShowResults(false);
    onClose();
  };

  const formattedDate = selectedDate ? format(parseISO(selectedDate), 'EEEE, MMMM do, yyyy') : '';

if (isMobile) {
  return (
    <>
      {/* Main Search Drawer */}
      <Drawer open={isOpen && !showResults} onOpenChange={handleClose}>
        <DrawerContent className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-0">
          <div className="w-full h-[85vh] flex flex-col">
            {/* Header Section */}
            <div className="sticky top-0 z-10 bg-gradient-to-b from-background via-background to-background/95 px-6 pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="space-y-1">
                  <DrawerTitle className="text-xl font-bold text-foreground">Flight Search</DrawerTitle>
                  <DrawerDescription className="text-sm text-muted-foreground font-medium">Find and book flights for your trip</DrawerDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8 rounded-full bg-muted/30 hover:bg-muted/50 transition-colors">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Prominent Search Section */}
              <div className="space-y-4">
                {/* Route Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <Plane className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <AirportSearch
                      value={departureAirport}
                      onChange={setDepartureAirport}
                      placeholder="From"
                      className="pl-10 h-12 rounded-2xl border-2 border-border/20 bg-muted/10 shadow-sm focus:shadow-md transition-all"
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <AirportSearch
                      value={arrivalAirport}
                      onChange={setArrivalAirport}
                      placeholder="To"
                      className="pl-10 h-12 rounded-2xl border-2 border-border/20 bg-muted/10 shadow-sm focus:shadow-md transition-all"
                    />
                  </div>
                </div>
                
                {/* Date and Search */}
                <div className="flex gap-3">
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="flex-1 h-12 rounded-2xl border-2 border-border/20 bg-muted/10 shadow-sm focus:shadow-md transition-all"
                  />
                  <Button
                    onClick={handleSearch}
                    disabled={isSearching || !departureAirport || !arrivalAirport}
                    size="icon"
                    className="h-12 w-12 rounded-2xl bg-primary hover:bg-primary/90 shadow-sm"
                  >
                    <Search className="w-5 h-5" />
                  </Button>
                </div>
                
                {/* Filter Toggle */}
                <div className="flex justify-center">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowFilters(!showFilters)}
                    className="rounded-full px-4 bg-muted/20 border-muted hover:bg-muted/40 transition-colors"
                  >
                    {showFilters ? "Hide filters" : "Show filters"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6">
              {/* Filter Cards */}
              <div className={cn("space-y-4 pb-6", showFilters ? "block" : "hidden")}>
                {/* Route Details Card */}
                <Card className="p-4 bg-muted/5 border-muted/20 shadow-sm">
                  <div className="space-y-4">
                    <Label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                      <Plane className="w-4 h-4 text-primary" />
                      Flight Route
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-medium">From</Label>
                        <AirportSearch
                          value={departureAirport}
                          onChange={setDepartureAirport}
                          placeholder="New York (JFK)..."
                          className="bg-background border-border/30 focus:border-primary/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-medium">To</Label>
                        <AirportSearch
                          value={arrivalAirport}
                          onChange={setArrivalAirport}
                          placeholder="Paris (CDG)..."
                          className="bg-background border-border/30 focus:border-primary/50"
                        />
                      </div>
                    </div>
                  </div>
                </Card>
                
                {/* Flight Details Card */}
                <Card className="p-4 bg-muted/5 border-muted/20 shadow-sm">
                  <div className="space-y-4">
                    <Label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                      <Filter className="w-4 h-4 text-primary" />
                      Flight Preferences
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-medium">Departure Date</Label>
                        <Input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="bg-background border-border/30 focus:border-primary/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-medium">Flight Type</Label>
                        <Select value={flightType} onValueChange={(value: 'nonstop' | 'onestop' | 'any') => setFlightType(value)}>
                          <SelectTrigger className="bg-background border-border/30 focus:border-primary/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any Flight</SelectItem>
                            <SelectItem value="nonstop">Nonstop Only</SelectItem>
                            <SelectItem value="onestop">One Stop</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Advanced Options Card */}
                <Card className="p-4 bg-muted/5 border-muted/20 shadow-sm">
                  <div className="space-y-4">
                    <Label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                      <Clock className="w-4 h-4 text-primary" />
                      Advanced Options
                    </Label>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-medium">Flight Number (Optional)</Label>
                        <Input
                          value={flightNumber}
                          onChange={(e) => setFlightNumber(e.target.value)}
                          placeholder="AA123, BA456..."
                          className="bg-background border-border/30 focus:border-primary/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-medium">Airline (Optional)</Label>
                        <Input
                          value={airline}
                          onChange={(e) => setAirline(e.target.value)}
                          placeholder="American, British Airways..."
                          className="bg-background border-border/30 focus:border-primary/50"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground font-medium">Depart After</Label>
                          <Input
                            type="time"
                            value={departureTimeFrom}
                            onChange={(e) => setDepartureTimeFrom(e.target.value)}
                            className="bg-background border-border/30 focus:border-primary/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground font-medium">Depart Before</Label>
                          <Input
                            type="time"
                            value={departureTimeTo}
                            onChange={(e) => setDepartureTimeTo(e.target.value)}
                            className="bg-background border-border/30 focus:border-primary/50"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Sticky Bottom CTA */}
            <div className="sticky bottom-0 bg-gradient-to-t from-background via-background to-background/95 p-6 border-t border-border/20">
              <Button
                onClick={handleSearch}
                disabled={isSearching || !departureAirport || !arrivalAirport || !selectedDate}
                className="w-full h-12 text-base font-semibold rounded-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all"
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
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Results Drawer */}
      <Drawer open={showResults} onOpenChange={() => setShowResults(false)}>
        <DrawerContent className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-0">
          <div className="w-full">
            <div className="sticky top-0 z-10 border-b border-border/50 bg-gradient-to-b from-background/95 via-background to-background/80 px-5 pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowResults(false)}
                    className="h-9 w-9 rounded-full bg-muted/50 hover:bg-muted"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="space-y-0.5">
                    <DrawerTitle className="text-base font-semibold flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-primary/10">
                        <Plane className="w-4 h-4 text-primary" />
                      </div>
                      {flights.length} Available Flights
                    </DrawerTitle>
                    <DrawerDescription className="text-xs text-muted-foreground">
                      {departureAirport} → {arrivalAirport}{formattedDate ? ` on ${formattedDate}` : ''}
                    </DrawerDescription>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClose} className="h-9 w-9 rounded-full bg-muted/50 hover:bg-muted">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
              {/* Results Content */}
              <div className="flex-1 overflow-y-auto pt-2">
                {flights.length > 0 ? (
                  <div className="space-y-3">
                    {flights.map((flight) => (
                      <Card key={flight.id} className="group cursor-pointer border-2 border-transparent hover:border-primary/30 transition-all duration-300 hover:shadow-lg bg-gradient-to-r from-card to-card/90">
                        <CardContent className={cn("p-6", isMobile && "p-4")}>
                          <div className="flex items-center justify-between mb-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-3 flex-wrap">
                                <Badge variant="outline" className="font-mono text-sm px-3 py-1">
                                  {flight.flightNumber}
                                </Badge>
                                <span className={cn("font-semibold text-lg", isMobile && "text-base")}>{flight.airline}</span>
                                {flight.stops === 0 ? (
                                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                    <Star className="w-3 h-3 mr-1" />
                                    Nonstop
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                                    1 Stop • {flight.stopLocations?.[0]}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {flight.price && (
                              <Badge variant="secondary" className={cn("text-lg px-4 py-2 font-bold", isMobile && "text-sm px-2 py-1")}>
                                {flight.price}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center justify-between mb-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="text-center">
                                  <div className={cn("text-2xl font-bold", isMobile && "text-lg")}>{flight.departure.time}</div>
                                  <div className="text-sm text-muted-foreground font-medium">{flight.departure.airport}</div>
                                </div>
                                <div className={cn("flex-1 flex flex-col items-center mx-6", isMobile && "mx-3")}>
                                  <div className="text-sm text-muted-foreground mb-1">{flight.duration}</div>
                                  <div className="flex items-center w-full">
                                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                                    <div className="flex-1 h-px bg-gradient-to-r from-primary via-primary/50 to-primary relative">
                                      <ArrowRight className="absolute right-0 top-1/2 transform -translate-y-1/2 w-4 h-4 text-primary" />
                                    </div>
                                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className={cn("text-2xl font-bold", isMobile && "text-lg")}>{flight.arrival.time}</div>
                                  <div className="text-sm text-muted-foreground font-medium">{flight.arrival.airport}</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className={cn("flex items-center justify-between", isMobile && "flex-col gap-3")}>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                Departs {flight.departure.date}
                              </span>
                              {flight.arrival.date !== flight.departure.date && (
                                <span>Arrives {flight.arrival.date}</span>
                              )}
                            </div>
                            <Button
                              onClick={() => handleFlightSelect(flight)}
                              className={cn("bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md group-hover:shadow-lg transition-all", isMobile && "w-full")}
                            >
                              Select This Flight
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Plane className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No flights found</p>
                    <Button variant="outline" onClick={() => setShowResults(false)} className="mt-4">
                      Search Again
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

return (
    <>
      {/* Main Search Dialog */}
      <Dialog open={isOpen && !showResults} onOpenChange={handleClose}>
        <DialogContent 
          className={cn(
            "sm:max-w-[900px] overflow-hidden flex flex-col bg-gradient-to-br from-background to-accent/20",
            isMobile ? "h-[75vh] max-h-[75vh] p-3 rounded-2xl" : "max-h-[90vh] p-6"
          )}
        >
          <DialogHeader className={cn(isMobile ? "space-y-1 pb-2" : "space-y-3 pb-4")}>
            <div className="flex items-center justify-between">
              <DialogTitle className={cn("flex items-center gap-3", isMobile ? "text-lg" : "text-2xl")}>
                <div className="p-2 rounded-xl bg-primary/10">
                  <Plane className="w-6 h-6 text-primary" />
                </div>
                Flight Search
              </DialogTitle>
              <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
            {!isMobile && (
              <DialogDescription className="text-lg">
                Find and book flights for your trip
              </DialogDescription>
            )}
          </DialogHeader>

        {/* Compact Mobile Search Bar */}
        {isMobile && (
          <div className="space-y-2 border-b pb-3">
            <div className="grid grid-cols-2 gap-2">
              <AirportSearch
                value={departureAirport}
                onChange={setDepartureAirport}
                placeholder="From..."
                className="h-10"
              />
              <AirportSearch
                value={arrivalAirport}
                onChange={setArrivalAirport}
                placeholder="To..."
                className="h-10"
              />
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-10"
              />
              <Button
                onClick={handleSearch}
                disabled={isSearching || !departureAirport || !arrivalAirport}
                className="h-10 px-4"
              >
                <Search className="w-4 h-4 mr-1" />
                Go
              </Button>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                {showFilters ? "Hide filters" : "Show filters"}
              </Button>
            </div>
          </div>
        )}

        {/* Desktop & Mobile Filters */}
        <div className={cn("space-y-6", isMobile ? (showFilters ? "border-b pb-3" : "hidden") : "border-b pb-6")}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                From
              </Label>
              <AirportSearch
                value={departureAirport}
                onChange={setDepartureAirport}
                placeholder="New York (JFK), London (LHR)..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                To
              </Label>
              <AirportSearch
                value={arrivalAirport}
                onChange={setArrivalAirport}
                placeholder="Paris (CDG), Tokyo (NRT)..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Departure Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-background/60"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Flight Type
              </Label>
              <Select value={flightType} onValueChange={(value: 'nonstop' | 'onestop' | 'any') => setFlightType(value)}>
                <SelectTrigger className="bg-background/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Flight</SelectItem>
                  <SelectItem value="nonstop">Nonstop Only</SelectItem>
                  <SelectItem value="onestop">One Stop</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Flight Number (Optional)</Label>
              <Input
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
                placeholder="AA123, BA456..."
                className="bg-background/60"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Airline (Optional)</Label>
              <Input
                value={airline}
                onChange={(e) => setAirline(e.target.value)}
                placeholder="American, British Airways..."
                className="bg-background/60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Departure Time From
              </Label>
              <Input
                type="time"
                value={departureTimeFrom}
                onChange={(e) => setDepartureTimeFrom(e.target.value)}
                className="bg-background/60"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Departure Time To
              </Label>
              <Input
                type="time"
                value={departureTimeTo}
                onChange={(e) => setDepartureTimeTo(e.target.value)}
                className="bg-background/60"
              />
            </div>
          </div>

          {!isMobile && (
            <Button
              onClick={handleSearch}
              disabled={isSearching || !departureAirport || !arrivalAirport}
              className="w-full h-12 text-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
            >
              <Search className="w-5 h-5 mr-2" />
              {isSearching ? 'Searching Flights...' : 'Search Flights'}
            </Button>
          )}
        </div>
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={showResults} onOpenChange={() => setShowResults(false)}>
        <DialogContent
          className={cn(
            "sm:max-w-[900px] overflow-hidden flex flex-col bg-gradient-to-br from-background to-accent/20",
            isMobile ? "h-[80vh] max-h-[80vh] p-3 rounded-2xl" : "max-h-[90vh] p-6"
          )}
        >
          <DialogHeader className={cn(isMobile ? "space-y-1 pb-2" : "space-y-3 pb-4")}>
            <div className="flex items-center justify-between">
              <DialogTitle className={cn("flex items-center gap-3", isMobile ? "text-lg" : "text-2xl")}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowResults(false)}
                  className="h-8 w-8 p-0 mr-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="p-2 rounded-xl bg-primary/10">
                  <Plane className="w-6 h-6 text-primary" />
                </div>
                {flights.length} Available Flights
              </DialogTitle>
              <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
            {!isMobile && (
              <DialogDescription className="text-lg">
                {departureAirport} → {arrivalAirport} on {formattedDate}
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Results Content */}
          <div className="flex-1 overflow-y-auto pt-2">
            {flights.length > 0 ? (
              <div className="space-y-3">
                {flights.map((flight) => (
                  <Card key={flight.id} className="group cursor-pointer border-2 border-transparent hover:border-primary/30 transition-all duration-300 hover:shadow-lg bg-gradient-to-r from-card to-card/90">
                    <CardContent className={cn("p-6", isMobile && "p-4")}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge variant="outline" className="font-mono text-sm px-3 py-1">
                              {flight.flightNumber}
                            </Badge>
                            <span className={cn("font-semibold text-lg", isMobile && "text-base")}>{flight.airline}</span>
                            {flight.stops === 0 ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                <Star className="w-3 h-3 mr-1" />
                                Nonstop
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-orange-600 border-orange-300">
                                1 Stop • {flight.stopLocations?.[0]}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {flight.price && (
                          <Badge variant="secondary" className={cn("text-lg px-4 py-2 font-bold", isMobile && "text-sm px-2 py-1")}>
                            {flight.price}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between mb-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-center">
                              <div className={cn("text-2xl font-bold", isMobile && "text-lg")}>{flight.departure.time}</div>
                              <div className="text-sm text-muted-foreground font-medium">{flight.departure.airport}</div>
                            </div>
                            <div className={cn("flex-1 flex flex-col items-center mx-6", isMobile && "mx-3")}>
                              <div className="text-sm text-muted-foreground mb-1">{flight.duration}</div>
                              <div className="flex items-center w-full">
                                <div className="w-2 h-2 rounded-full bg-primary"></div>
                                <div className="flex-1 h-px bg-gradient-to-r from-primary via-primary/50 to-primary relative">
                                  <ArrowRight className="absolute right-0 top-1/2 transform -translate-y-1/2 w-4 h-4 text-primary" />
                                </div>
                                <div className="w-2 h-2 rounded-full bg-primary"></div>
                              </div>
                            </div>
                            <div className="text-center">
                              <div className={cn("text-2xl font-bold", isMobile && "text-lg")}>{flight.arrival.time}</div>
                              <div className="text-sm text-muted-foreground font-medium">{flight.arrival.airport}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className={cn("flex items-center justify-between", isMobile && "flex-col gap-3")}>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Departs {flight.departure.date}
                          </span>
                          {flight.arrival.date !== flight.departure.date && (
                            <span>Arrives {flight.arrival.date}</span>
                          )}
                        </div>
                        <Button
                          onClick={() => handleFlightSelect(flight)}
                          className={cn("bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md group-hover:shadow-lg transition-all", isMobile && "w-full")}
                        >
                          Select This Flight
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Plane className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No flights found</p>
                <Button variant="outline" onClick={() => setShowResults(false)} className="mt-4">
                  Search Again
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}