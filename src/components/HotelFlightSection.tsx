import { useState } from 'react';
import { Hotel, Plane, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* Hotels Section */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                <Hotel className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-100">Hotels</h3>
                <p className="text-xs text-blue-700 dark:text-blue-300">Accommodations</p>
              </div>
            </div>
            <Button
              onClick={() => setIsHotelDialogOpen(true)}
              size="sm"
              variant="outline"
              className="h-8 text-xs border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/50"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </div>
          
          {hotels.length > 0 ? (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {hotels.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-2 bg-white/60 dark:bg-blue-950/40 rounded-md border border-blue-200 dark:border-blue-800/50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-xs text-blue-900 dark:text-blue-100 truncate">{booking.hotel.name}</p>
                      {booking.hotel.rating && (
                        <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                          ⭐ {booking.hotel.rating}
                        </Badge>
                      )}
                    </div>
                    {(booking.checkIn || booking.checkOut) && (
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        {booking.checkIn && booking.checkOut ? (
                          `${booking.checkIn.toLocaleDateString()} - ${booking.checkOut.toLocaleDateString()}`
                        ) : booking.checkIn ? (
                          `Check-in: ${booking.checkIn.toLocaleDateString()}`
                        ) : booking.checkOut ? (
                          `Check-out: ${booking.checkOut.toLocaleDateString()}`
                        ) : null}
                      </p>
                    )}
                    {booking.location && (
                      <Badge variant="outline" className="text-xs h-4 mt-1">
                        {booking.location}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {booking.hotel.bookingUrl && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(booking.hotel.bookingUrl, '_blank')}
                        className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                      >
                        Book
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRemoveHotel(booking.id)}
                      className="h-6 px-2 text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-blue-600 dark:text-blue-400">
              <Hotel className="w-6 h-6 mx-auto mb-1 opacity-50" />
              <p className="text-xs">No hotels added</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Flights Section */}
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                <Plane className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-purple-900 dark:text-purple-100">Flights</h3>
                <p className="text-xs text-purple-700 dark:text-purple-300">Transportation</p>
              </div>
            </div>
            <Button
              onClick={() => setIsFlightDialogOpen(true)}
              size="sm"
              variant="outline"
              className="h-8 text-xs border-purple-300 text-purple-700 hover:bg-purple-100 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-900/50"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </div>
          
          {flights.length > 0 ? (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {flights.map((flight) => (
                <div key={flight.id} className="flex items-center justify-between p-2 bg-white/60 dark:bg-purple-950/40 rounded-md border border-purple-200 dark:border-purple-800/50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-xs text-purple-900 dark:text-purple-100 truncate">
                        {flight.airline} {flight.flightNumber}
                      </p>
                      {flight.price && (
                        <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                          {flight.price}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-purple-600 dark:text-purple-400 truncate">
                      {flight.departure.airport} → {flight.arrival.airport}
                    </p>
                    <p className="text-xs text-purple-500 dark:text-purple-400">
                      {flight.departure.time} | {flight.arrival.time}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {flight.bookingUrl && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(flight.bookingUrl, '_blank')}
                        className="h-6 px-2 text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200"
                      >
                        Book
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRemoveFlight(flight.id)}
                      className="h-6 px-2 text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-purple-600 dark:text-purple-400">
              <Plane className="w-6 h-6 mx-auto mb-1 opacity-50" />
              <p className="text-xs">No flights added</p>
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