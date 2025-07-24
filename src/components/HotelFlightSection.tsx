import { useState } from 'react';
import { Hotel, Plane, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HotelSearchDialog } from '@/components/HotelSearchDialog';
import { FlightSearchDialog } from '@/components/FlightSearchDialog';
import { Hotel as HotelType } from '@/hooks/useGooglePlacesHotelSearch';

interface TripLocation {
  id: string;
  name: string;
  country: string;
  state?: string;
  startDate?: Date;
  endDate?: Date;
}

interface HotelBooking {
  id: string;
  hotel: HotelType;
  checkIn?: Date;
  checkOut?: Date;
  location?: string;
}

interface FlightBooking {
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
  price?: string;
  bookingUrl?: string;
}

interface HotelFlightSectionProps {
  locations: TripLocation[];
  isMultiCity: boolean;
  hotels: HotelBooking[];
  flights: FlightBooking[];
  onAddHotel: (hotel: HotelType, location?: string, checkIn?: Date, checkOut?: Date) => void;
  onAddFlight: (flight: any) => void;
  onRemoveHotel: (hotelId: string) => void;
  onRemoveFlight: (flightId: string) => void;
}

export function HotelFlightSection({ 
  locations, 
  isMultiCity, 
  hotels, 
  flights, 
  onAddHotel, 
  onAddFlight, 
  onRemoveHotel, 
  onRemoveFlight 
}: HotelFlightSectionProps) {
  const [isHotelDialogOpen, setIsHotelDialogOpen] = useState(false);
  const [isFlightDialogOpen, setIsFlightDialogOpen] = useState(false);

  const handleHotelSelect = (hotel: HotelType, location?: string, checkIn?: Date, checkOut?: Date) => {
    onAddHotel(hotel, location, checkIn, checkOut);
  };

  const handleFlightSelect = (flight: any) => {
    onAddFlight(flight);
  };

  return (
    <div className="space-y-4">
      {/* Hotels Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Hotel className="w-5 h-5" />
                Hotels
              </CardTitle>
              <CardDescription>
                Book accommodations for your trip
              </CardDescription>
            </div>
            <Button
              onClick={() => setIsHotelDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Hotel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {hotels.length > 0 ? (
            <div className="space-y-3">
              {hotels.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{booking.hotel.name}</h4>
                      {booking.hotel.rating && (
                        <Badge variant="secondary" className="text-xs">
                          ⭐ {booking.hotel.rating}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {booking.hotel.address}
                    </p>
                    {(booking.checkIn || booking.checkOut) && (
                      <div className="text-sm text-muted-foreground">
                        {booking.checkIn && booking.checkOut ? (
                          `${booking.checkIn.toLocaleDateString()} - ${booking.checkOut.toLocaleDateString()}`
                        ) : booking.checkIn ? (
                          `Check-in: ${booking.checkIn.toLocaleDateString()}`
                        ) : booking.checkOut ? (
                          `Check-out: ${booking.checkOut.toLocaleDateString()}`
                        ) : null}
                      </div>
                    )}
                    {booking.location && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {booking.location}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {booking.hotel.bookingUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(booking.hotel.bookingUrl, '_blank')}
                      >
                        Book
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRemoveHotel(booking.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Hotel className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No hotels added yet</p>
              <p className="text-sm">Click "Add Hotel" to search for accommodations</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Flights Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Plane className="w-5 h-5" />
                Flights
              </CardTitle>
              <CardDescription>
                Book flights for your trip
              </CardDescription>
            </div>
            <Button
              onClick={() => setIsFlightDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Flight
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {flights.length > 0 ? (
            <div className="space-y-3">
              {flights.map((flight) => (
                <div key={flight.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{flight.airline} {flight.flightNumber}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {flight.departure.airport} → {flight.arrival.airport}
                    </p>
                    <div className="text-sm text-muted-foreground">
                      Departs: {flight.departure.time} | Arrives: {flight.arrival.time}
                    </div>
                    {flight.price && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {flight.price}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {flight.bookingUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(flight.bookingUrl, '_blank')}
                      >
                        Book
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRemoveFlight(flight.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Plane className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No flights added yet</p>
              <p className="text-sm">Click "Add Flight" to search for flights</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hotel Search Dialog */}
      <HotelSearchDialog
        isOpen={isHotelDialogOpen}
        onClose={() => setIsHotelDialogOpen(false)}
        onSelect={handleHotelSelect}
        locations={locations}
        isMultiCity={isMultiCity}
      />

      {/* Flight Search Dialog */}
      <FlightSearchDialog
        isOpen={isFlightDialogOpen}
        onClose={() => setIsFlightDialogOpen(false)}
        onSelect={handleFlightSelect}
        locations={locations}
      />
    </div>
  );
}