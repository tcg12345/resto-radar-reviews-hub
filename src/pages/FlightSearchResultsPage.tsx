import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Plane, Clock, MapPin, Calendar as CalendarIcon, DollarSign, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface FlightOffer {
  id: string;
  price: {
    total: string;
    currency: string;
  };
  itineraries: Array<{
    duration: string;
    segments: Array<{
      departure: {
        iataCode: string;
        at: string;
      };
      arrival: {
        iataCode: string;
        at: string;
      };
      carrierCode: string;
      number: string;
      aircraft: {
        code: string;
      };
      duration: string;
    }>;
  }>;
  travelerPricings: Array<{
    travelerId: string;
    fareOption: string;
    travelerType: string;
    price: {
      total: string;
      currency: string;
    };
  }>;
  validatingAirlineCodes: string[];
}

export default function FlightSearchResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [flights, setFlights] = useState<FlightOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [activeTab, setActiveTab] = useState('results');
  
  const fromAirport = searchParams.get('from');
  const toAirport = searchParams.get('to');
  const departureDate = searchParams.get('date');
  const passengers = searchParams.get('passengers') || '1';

  // Search for flights using Amadeus API
  useEffect(() => {
    const searchFlights = async () => {
      if (!fromAirport || !toAirport || !departureDate) return;
      
      setIsLoading(true);
      try {
        console.log('🛩️ Searching flights with params:', { 
          fromAirport, 
          toAirport, 
          departureDate, 
          passengers 
        });
        
        const { data, error } = await supabase.functions.invoke('amadeus-enhanced-flight-api', {
          body: {
            endpoint: 'searchFlights',
            originLocationCode: fromAirport,
            destinationLocationCode: toAirport,
            departureDate: departureDate,
            adults: parseInt(passengers),
            currencyCode: 'USD',
            max: 20 // Request more results
          }
        });

        console.log('✈️ Flight search response:', { data, error });

        if (error) {
          console.error('❌ Error searching flights:', error);
          setFlights([]);
        } else if (data?.data && Array.isArray(data.data)) {
          console.log('✅ Found flights:', data.data.length);
          setFlights(data.data);
        } else if (data?.flights && Array.isArray(data.flights)) {
          console.log('✅ Found flights (alternate format):', data.flights.length);
          setFlights(data.flights);
        } else {
          console.log('⚠️ No flights found in response, using empty array');
          console.log('Response structure:', data);
          setFlights([]);
        }
      } catch (error) {
        console.error('💥 Flight search failed:', error);
        setFlights([]);
      } finally {
        setIsLoading(false);
      }
    };

    searchFlights();
  }, [fromAirport, toAirport, departureDate, passengers]);

  const formatDuration = (duration: string) => {
    const match = duration.match(/PT(\d+H)?(\d+M)?/);
    if (!match) return duration;
    
    const hours = match[1]?.replace('H', '') || '0';
    const minutes = match[2]?.replace('M', '') || '0';
    
    return `${hours}h ${minutes}m`;
  };

  const formatTime = (dateTime: string) => {
    return format(new Date(dateTime), 'HH:mm');
  };

  const formatDate = (dateTime: string) => {
    return format(new Date(dateTime), 'MMM dd');
  };

  const getAirlineName = (code: string) => {
    const airlines: { [key: string]: string } = {
      'AA': 'American Airlines',
      'UA': 'United Airlines',
      'DL': 'Delta Air Lines',
      'WN': 'Southwest Airlines',
      'BA': 'British Airways',
      'LH': 'Lufthansa',
      'AF': 'Air France',
      'KL': 'KLM',
      'EK': 'Emirates',
      'QR': 'Qatar Airways'
    };
    return airlines[code] || code;
  };

  const FlightCard = ({ flight }: { flight: FlightOffer }) => {
    const segment = flight.itineraries[0]?.segments[0];
    if (!segment) return null;

    return (
      <Card className="mb-4 hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{formatTime(segment.departure.at)}</div>
                <div className="text-sm text-muted-foreground">{segment.departure.iataCode}</div>
                <div className="text-xs text-muted-foreground">{formatDate(segment.departure.at)}</div>
              </div>
              
              <div className="flex flex-col items-center space-y-2 flex-1 max-w-40">
                <div className="text-sm text-muted-foreground">{formatDuration(segment.duration)}</div>
                <div className="w-full h-px bg-border relative">
                  <Plane className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-primary bg-background" />
                </div>
                <div className="text-xs text-muted-foreground">Direct</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold">{formatTime(segment.arrival.at)}</div>
                <div className="text-sm text-muted-foreground">{segment.arrival.iataCode}</div>
                <div className="text-xs text-muted-foreground">{formatDate(segment.arrival.at)}</div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">${flight.price.total}</div>
              <div className="text-sm text-muted-foreground">per person</div>
              <Badge variant="secondary" className="mt-2">
                {getAirlineName(segment.carrierCode)} {segment.number}
              </Badge>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDuration(flight.itineraries[0].duration)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {flight.travelerPricings[0]?.fareOption || 'Economy'}
              </span>
            </div>
            
            <Button>Select Flight</Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/travel')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Flight Search Results</h1>
                <div className="text-sm text-muted-foreground">
                  {fromAirport} → {toAirport} • {departureDate && format(new Date(departureDate), 'MMM dd, yyyy')} • {passengers} passenger{parseInt(passengers) > 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="results">Flight Results</TabsTrigger>
            <TabsTrigger value="calendar">Price Calendar</TabsTrigger>
            <TabsTrigger value="details">Flight Details</TabsTrigger>
            <TabsTrigger value="amenities">Amenities</TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Available Flights</h2>
              <div className="text-sm text-muted-foreground">
                {flights.length} flights found
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6">
                          <Skeleton className="h-16 w-20" />
                          <Skeleton className="h-8 w-40" />
                          <Skeleton className="h-16 w-20" />
                        </div>
                        <div className="text-right space-y-2">
                          <Skeleton className="h-8 w-20" />
                          <Skeleton className="h-6 w-16" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : flights.length > 0 ? (
              <div className="space-y-4">
                {flights.map((flight) => (
                  <FlightCard key={flight.id} flight={flight} />
                ))}
              </div>
            ) : (
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
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => navigate('/travel')}
                  >
                    Search Again
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  Price Calendar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-4">Select Different Dates</h3>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="rounded-md border"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-4">Price Trends</h3>
                    <div className="space-y-3">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                        <div key={day} className="flex items-center justify-between p-3 border rounded-lg">
                          <span className="font-medium">{day}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={index % 3 === 0 ? 'default' : 'secondary'}>
                              ${(250 + index * 25).toFixed(0)}
                            </Badge>
                            {index % 3 === 0 && <span className="text-xs text-green-600">Best Price</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Route Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-4">Departure Airport</h3>
                    <div className="space-y-2">
                      <div className="text-2xl font-bold">{fromAirport}</div>
                      <div className="text-muted-foreground">Departure details would be shown here</div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-4">Arrival Airport</h3>
                    <div className="space-y-2">
                      <div className="text-2xl font-bold">{toAirport}</div>
                      <div className="text-muted-foreground">Arrival details would be shown here</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="amenities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Amenities & Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    'Wi-Fi Available',
                    'In-flight Entertainment',
                    'Meal Service',
                    'Extra Legroom',
                    'Power Outlets',
                    'Baggage Included'
                  ].map((amenity) => (
                    <div key={amenity} className="flex items-center space-x-2 p-3 border rounded-lg">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}