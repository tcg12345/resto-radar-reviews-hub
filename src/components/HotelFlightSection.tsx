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
  checkIn?: Date | string;
  checkOut?: Date | string;
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

  // Helper function to safely format dates
  const formatDate = (date: Date | string | undefined | null) => {
    if (!date) return '';
    try {
      let dateObj: Date;
      
      if (typeof date === 'string') {
        // Handle various string formats
        dateObj = new Date(date);
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        return '';
      }
      
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        console.error('Invalid date:', date);
        return '';
      }
      
      return dateObj.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error, 'Original date:', date);
      return '';
    }
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
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {hotels.map((booking) => (
                <div key={booking.id} className="flex items-start justify-between p-3 bg-white/60 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-800/50">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100">{booking.hotel.name}</h4>
                      {booking.hotel.rating && (
                        <Badge variant="secondary" className="text-xs px-2 py-1">
                          ⭐ {booking.hotel.rating}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                      {booking.hotel.address}
                    </p>
                    
                    {(booking.checkIn || booking.checkOut) && (
                      <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                        {booking.checkIn && booking.checkOut ? (
                          `📅 ${formatDate(booking.checkIn)} - ${formatDate(booking.checkOut)}`
                        ) : booking.checkIn ? (
                          `📅 Check-in: ${formatDate(booking.checkIn)}`
                        ) : booking.checkOut ? (
                          `📅 Check-out: ${formatDate(booking.checkOut)}`
                        ) : null}
                      </div>
                    )}
                    
                    {booking.location && (
                      <Badge variant="outline" className="text-xs">
                        📍 {booking.location}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-3">
                    {booking.hotel.bookingUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(booking.hotel.bookingUrl, '_blank')}
                        className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 border-blue-300 dark:border-blue-700"
                      >
                        Book Hotel
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRemoveHotel(booking.id)}
                      className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Remove
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
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {flights.map((flight) => (
                <div key={flight.id} className="flex items-start justify-between p-3 bg-white/60 dark:bg-purple-950/40 rounded-lg border border-purple-200 dark:border-purple-800/50">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm text-purple-900 dark:text-purple-100">
                        {flight.airline} {flight.flightNumber}
                      </h4>
                      {flight.price && (
                        <Badge variant="secondary" className="text-xs px-2 py-1">
                          💰 {flight.price}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded">
                      ✈️ {flight.departure.airport} → {flight.arrival.airport}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-purple-700 dark:text-purple-300">
                      <div>
                        <span className="font-medium">Departure:</span> {flight.departure.time}
                      </div>
                      <div>
                        <span className="font-medium">Arrival:</span> {flight.arrival.time}
                      </div>
                    </div>
                    
                    {flight.departure.date && (
                      <div className="text-xs text-purple-600 dark:text-purple-400">
                        📅 {flight.departure.date}
                        {flight.arrival.date && flight.arrival.date !== flight.departure.date && (
                          ` → ${flight.arrival.date}`
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-3">
                    {flight.bookingUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(flight.bookingUrl, '_blank')}
                        className="text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200 border-purple-300 dark:border-purple-700"
                      >
                        Book Flight
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRemoveFlight(flight.id)}
                      className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Remove
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