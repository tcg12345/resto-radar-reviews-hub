import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Search, Plane, Clock, MapPin, Filter, ArrowRight, Users, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAmadeusApi } from '@/hooks/useAmadeusApi';
import { AmadeusCitySearch } from '@/components/AmadeusCitySearch';

import { toast } from 'sonner';

interface LocationSuggestion {
  id: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface FlightSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (flight: any) => void;
  selectedDate: string | null;
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

export function FlightSearchDialog({ isOpen, onClose, onSelect, selectedDate }: FlightSearchDialogProps) {
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
    setFlights([]);
    onClose();
  };

  const formattedDate = selectedDate ? format(parseISO(selectedDate), 'EEEE, MMMM do, yyyy') : '';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[95vh] overflow-hidden flex flex-col bg-gradient-to-br from-background to-accent/20">
        <DialogHeader className="space-y-3 pb-4">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 rounded-xl bg-primary/10">
              <Plane className="w-6 h-6 text-primary" />
            </div>
            Flight Search
          </DialogTitle>
          <DialogDescription className="text-lg">
            {formattedDate && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                Searching flights for {formattedDate}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Search Form */}
        <div className="space-y-6 border-b pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                From
              </Label>
              <AmadeusCitySearch
                value={departureAirport}
                onChange={setDepartureAirport}
                onCitySelect={setDepartureCity}
                placeholder="New York (JFK), London (LHR)..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                To
              </Label>
              <AmadeusCitySearch
                value={arrivalAirport}
                onChange={setArrivalAirport}
                onCitySelect={setArrivalCity}
                placeholder="Paris (CDG), Tokyo (NRT)..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <Button
            onClick={handleSearch}
            disabled={isSearching || !departureAirport || !arrivalAirport}
            className="w-full h-12 text-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
          >
            <Search className="w-5 h-5 mr-2" />
            {isSearching ? 'Searching Flights...' : 'Search Flights'}
          </Button>
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto">
          {flights.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  {flights.length} Available Flights
                </h3>
                <Badge variant="secondary" className="px-3 py-1">
                  {departureAirport} → {arrivalAirport}
                </Badge>
              </div>
              
              <div className="space-y-3">
                {flights.map((flight) => (
                  <Card key={flight.id} className="group cursor-pointer border-2 border-transparent hover:border-primary/30 transition-all duration-300 hover:shadow-lg bg-gradient-to-r from-card to-card/90">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="font-mono text-sm px-3 py-1">
                              {flight.flightNumber}
                            </Badge>
                            <span className="font-semibold text-lg">{flight.airline}</span>
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
                          <Badge variant="secondary" className="text-lg px-4 py-2 font-bold">
                            {flight.price}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between mb-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-center">
                              <div className="text-2xl font-bold">{flight.departure.time}</div>
                              <div className="text-sm text-muted-foreground font-medium">{flight.departure.airport}</div>
                            </div>
                            <div className="flex-1 flex flex-col items-center mx-6">
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
                              <div className="text-2xl font-bold">{flight.arrival.time}</div>
                              <div className="text-sm text-muted-foreground font-medium">{flight.arrival.airport}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator className="my-4" />

                      <div className="flex items-center justify-between">
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
                          className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md group-hover:shadow-lg transition-all"
                        >
                          Select This Flight
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : !isSearching && (
            <div className="text-center py-12 text-muted-foreground">
              <Plane className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Enter your travel details and search for flights</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}