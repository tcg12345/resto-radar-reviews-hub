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
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Search
        </Button>
      </div>

      <div className="text-sm text-muted-foreground mb-4">
        {fromAirport} → {toAirport} on {departureDate && format(departureDate, 'MMM dd, yyyy')}
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {error}
        </div>
      )}

      {flightResults.length === 0 && !error && (
        <Card>
          <CardContent className="p-8 text-center">
            <Plane className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No flights found</h3>
            <p className="text-muted-foreground mb-4">
              We couldn't find any flights for {fromAirport} → {toAirport} on {departureDate && format(new Date(departureDate), 'MMM dd, yyyy')}.
            </p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search criteria, dates, or check if the airport codes are correct.
            </p>
          </CardContent>
        </Card>
      )}

      {flightResults.map((flight, index) => (
        <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4" onClick={() => handleSelectFlight(flight)}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="font-semibold text-lg">{flight.itineraries?.[0]?.segments?.[0]?.departure?.at ? format(new Date(flight.itineraries[0].segments[0].departure.at), 'HH:mm') : 'N/A'}</div>
                  <div className="text-sm text-muted-foreground">{flight.itineraries?.[0]?.segments?.[0]?.departure?.iataCode || fromAirport}</div>
                </div>
                
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex-1 border-t border-muted"></div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {flight.itineraries?.[0]?.duration || 'N/A'}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                  </div>
                  <div className="flex-1 border-t border-muted"></div>
                </div>
                
                <div className="text-center">
                  <div className="font-semibold text-lg">{flight.itineraries?.[0]?.segments?.[flight.itineraries[0].segments.length - 1]?.arrival?.at ? format(new Date(flight.itineraries[0].segments[flight.itineraries[0].segments.length - 1].arrival.at), 'HH:mm') : 'N/A'}</div>
                  <div className="text-sm text-muted-foreground">{flight.itineraries?.[0]?.segments?.[flight.itineraries[0].segments.length - 1]?.arrival?.iataCode || toAirport}</div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  ${flight.price?.total || 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {flight.price?.currency || 'USD'}
                </div>
              </div>
            </div>
            
            <Separator className="my-3" />
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {flight.validatingAirlineCodes?.[0] || 'N/A'}
                </Badge>
                {flight.itineraries?.[0]?.segments?.length > 1 && (
                  <Badge variant="outline">
                    {flight.itineraries[0].segments.length - 1} stop{flight.itineraries[0].segments.length > 2 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <div className="text-muted-foreground">
                {flight.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin || 'Economy'}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
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