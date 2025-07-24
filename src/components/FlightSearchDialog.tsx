import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Search, Plane, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAmadeusApi, AmadeusCity } from '@/hooks/useAmadeusApi';
import { AmadeusCitySearch } from '@/components/AmadeusCitySearch';
import { toast } from 'sonner';

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
}

export function FlightSearchDialog({ isOpen, onClose, onSelect, selectedDate }: FlightSearchDialogProps) {
  const [departureAirport, setDepartureAirport] = useState('');
  const [arrivalAirport, setArrivalAirport] = useState('');
  const [departureCity, setDepartureCity] = useState<AmadeusCity | null>(null);
  const [arrivalCity, setArrivalCity] = useState<AmadeusCity | null>(null);
  const [flightNumber, setFlightNumber] = useState('');
  const [airline, setAirline] = useState('');
  const [flightType, setFlightType] = useState<'nonstop' | 'onestop' | 'any'>('any');
  const [flights, setFlights] = useState<Flight[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { searchFlights } = useAmadeusApi();

  const handleSearch = async () => {
    // Extract IATA codes from selected cities or use direct input
    const originCode = departureCity?.iataCode || departureAirport.match(/\(([A-Z]{3})\)/)?.[1] || departureAirport.toUpperCase();
    const destinationCode = arrivalCity?.iataCode || arrivalAirport.match(/\(([A-Z]{3})\)/)?.[1] || arrivalAirport.toUpperCase();
    
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
      };

      const results = await searchFlights(searchParams);
      setFlights(results);

      if (results.length === 0) {
        toast.info('No flights found for the specified criteria');
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
    });
    onClose();
  };

  const handleClose = () => {
    setDepartureAirport('');
    setArrivalAirport('');
    setDepartureCity(null);
    setArrivalCity(null);
    setFlightNumber('');
    setAirline('');
    setFlightType('any');
    setFlights([]);
    onClose();
  };

  const formattedDate = selectedDate ? format(parseISO(selectedDate), 'EEEE, MMMM do') : '';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="w-5 h-5" />
            Search Flights
          </DialogTitle>
          <DialogDescription>
            {formattedDate && `Search flights for ${formattedDate}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Form */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="departure">Departure Airport *</Label>
              <AmadeusCitySearch
                value={departureAirport}
                onChange={setDepartureAirport}
                onCitySelect={setDepartureCity}
                placeholder="e.g., New York, JFK, London"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="arrival">Arrival Airport *</Label>
              <AmadeusCitySearch
                value={arrivalAirport}
                onChange={setArrivalAirport}
                onCitySelect={setArrivalCity}
                placeholder="e.g., Paris, CDG, Tokyo"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="flightNumber">Flight Number (Optional)</Label>
              <Input
                id="flightNumber"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
                placeholder="e.g., AA123, BA456"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="airline">Airline (Optional)</Label>
              <Input
                id="airline"
                value={airline}
                onChange={(e) => setAirline(e.target.value)}
                placeholder="e.g., American, British Airways"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="flightType">Flight Type</Label>
            <Select value={flightType} onValueChange={(value: 'nonstop' | 'onestop' | 'any') => setFlightType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select flight type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any (Nonstop + One Stop)</SelectItem>
                <SelectItem value="nonstop">Nonstop Only</SelectItem>
                <SelectItem value="onestop">One Stop Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSearch}
            disabled={isSearching || !departureAirport || !arrivalAirport}
            className="w-full flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            {isSearching ? 'Searching...' : 'Search Flights'}
          </Button>

          {/* Search Results */}
          {flights.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Available Flights</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {flights.map((flight) => (
                  <Card key={flight.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-base flex items-center gap-2">
                            {flight.airline} {flight.flightNumber}
                            <Badge variant="outline">{flight.duration}</Badge>
                            {flight.stops === 0 ? (
                              <Badge variant="secondary">Nonstop</Badge>
                            ) : (
                              <Badge variant="outline">1 Stop in {flight.stopLocations?.[0]}</Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {flight.departure.airport} → {flight.arrival.airport}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {flight.departure.time} - {flight.arrival.time}
                            </span>
                          </CardDescription>
                        </div>
                        {flight.price && (
                          <Badge variant="secondary">{flight.price}</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Button
                        size="sm"
                        onClick={() => handleFlightSelect(flight)}
                        className="w-full"
                      >
                        Select Flight
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}