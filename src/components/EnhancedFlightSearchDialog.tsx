import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AirportSearch } from '@/components/AirportSearch';
import { useIsMobile } from '@/hooks/useIsMobile';
import { supabase } from '@/integrations/supabase/client';
import { CalendarIcon, ArrowLeft, Plane, Clock, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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

export function EnhancedFlightSearchDialog({ isOpen, onClose, onSelect, locations }: EnhancedFlightSearchDialogProps) {
  console.log('🛩️ EnhancedFlightSearchDialog DEFINITELY RENDERING - isOpen:', isOpen);
  console.log('🛩️ Locations:', locations);
  
  const [departureDate, setDepartureDate] = useState<Date>();
  const [fromAirport, setFromAirport] = useState<string>("");
  const [toAirport, setToAirport] = useState<string>("");
  const [passengers, setPassengers] = useState<string>("1");
  const [showResults, setShowResults] = useState(false);
  const [flightResults, setFlightResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isMobile = useIsMobile();

  const handleSearch = async () => {
    if (!fromAirport || !toAirport || !departureDate) {
      alert('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('amadeus-enhanced-flight-api', {
        body: {
          endpoint: 'searchFlights',
          originLocationCode: fromAirport,
          destinationLocationCode: toAirport,
          departureDate: format(departureDate, 'yyyy-MM-dd'),
          adults: parseInt(passengers),
          currencyCode: 'USD',
          max: 20
        }
      });

      if (error) {
        throw error;
      }

      if (data?.data) {
        setFlightResults(data.data);
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
            Back
          </Button>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-foreground">
            {fromAirport} → {toAirport}
          </div>
          <div className="text-xs text-muted-foreground">
            {departureDate && format(departureDate, 'EEE, MMM dd, yyyy')}
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
              We couldn't find any flights for this route on {departureDate && format(new Date(departureDate), 'MMM dd, yyyy')}.
            </p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search criteria or check if the airport codes are correct.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Flight results list */}
      <div className="space-y-3">
        {flightResults.map((flight, index) => (
          <Card key={index} className="border-border bg-card hover:shadow-lg transition-all duration-200 cursor-pointer group">
            <CardContent className="p-6" onClick={() => handleSelectFlight(flight)}>
              {/* Flight route and timing */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-6 flex-1">
                  {/* Departure */}
                  <div className="text-center">
                    <div className="text-lg font-bold text-foreground">
                      {flight.itineraries?.[0]?.segments?.[0]?.departure?.at ? 
                        format(new Date(flight.itineraries[0].segments[0].departure.at), 'HH:mm') : 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">
                      {flight.itineraries?.[0]?.segments?.[0]?.departure?.iataCode || fromAirport}
                    </div>
                  </div>
                  
                  {/* Flight path */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex-1 border-t-2 border-dashed border-muted"></div>
                    <div className="flex flex-col items-center gap-1 px-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Plane className="h-4 w-4 text-primary transform rotate-90" />
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span className="font-medium">{flight.itineraries?.[0]?.duration || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="flex-1 border-t-2 border-dashed border-muted"></div>
                  </div>
                  
                  {/* Arrival */}
                  <div className="text-center">
                    <div className="text-lg font-bold text-foreground">
                      {flight.itineraries?.[0]?.segments?.[flight.itineraries[0].segments.length - 1]?.arrival?.at ? 
                        format(new Date(flight.itineraries[0].segments[flight.itineraries[0].segments.length - 1].arrival.at), 'HH:mm') : 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">
                      {flight.itineraries?.[0]?.segments?.[flight.itineraries[0].segments.length - 1]?.arrival?.iataCode || toAirport}
                    </div>
                  </div>
                </div>
                
                {/* Price */}
                <div className="text-right ml-6">
                  <div className="text-2xl font-bold text-primary">
                    ${flight.price?.total || 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {flight.price?.currency || 'USD'}
                  </div>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              {/* Flight details */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-secondary/80 text-secondary-foreground">
                    {flight.validatingAirlineCodes?.[0] || 'N/A'}
                  </Badge>
                  {flight.itineraries?.[0]?.segments?.length > 1 && (
                    <Badge variant="outline" className="border-muted-foreground/20">
                      {flight.itineraries[0].segments.length - 1} stop{flight.itineraries[0].segments.length > 2 ? 's' : ''}
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {flight.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin || 'Economy'}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  Select flight →
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
                  <div className="space-y-4">
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
                      <label className="block text-sm font-medium text-muted-foreground mb-2">Departure Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full h-12 justify-start text-left font-normal",
                              !departureDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {departureDate ? format(departureDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={departureDate}
                            onSelect={setDepartureDate}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Button 
                      onClick={handleSearch}
                      className="w-full h-12"
                      disabled={!fromAirport || !toAirport || !departureDate || isLoading}
                    >
                      {isLoading ? "Searching..." : "✈️ Search Flights"}
                    </Button>
                    
                    <Button 
                      onClick={onClose}
                      variant="outline"
                      className="w-full"
                    >
                      Cancel
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

  // Desktop version
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
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Departure Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-12 justify-start text-left font-normal",
                        !departureDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {departureDate ? format(departureDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={departureDate}
                      onSelect={setDepartureDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-3">
                <Button 
                  onClick={handleSearch}
                  className="w-full h-12"
                  disabled={!fromAirport || !toAirport || !departureDate || isLoading}
                >
                  {isLoading ? "Searching..." : "✈️ Search Flights"}
                </Button>
                
                <Button 
                  onClick={onClose}
                  variant="outline"
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}