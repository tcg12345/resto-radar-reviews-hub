import { useState } from 'react';
import { Hotel, Plane, Plus, MapPin, ExternalLink, Phone, Navigation, Eye, Radar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HotelSearchDialog } from '@/components/HotelSearchDialog';
import { FlightSearchDialog } from '@/components/FlightSearchDialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [selectedHotel, setSelectedHotel] = useState<HotelBooking | null>(null);
  const [selectedFlight, setSelectedFlight] = useState<FlightBooking | null>(null);
  const [isHotelDetailsOpen, setIsHotelDetailsOpen] = useState(false);
  const [isFlightDetailsOpen, setIsFlightDetailsOpen] = useState(false);

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

  const handleHotelCardClick = (booking: HotelBooking) => {
    setSelectedHotel(booking);
    setIsHotelDetailsOpen(true);
  };

  const handleFlightCardClick = (flight: FlightBooking) => {
    setSelectedFlight(flight);
    setIsFlightDetailsOpen(true);
  };

  const getDirectionsUrl = (address: string) => {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  };

  const getAirportDirectionsUrl = (airportCode: string) => {
    return `https://www.google.com/maps/dir/?api=1&destination=${airportCode}+Airport`;
  };

  const getFlightTrackingUrl = (airline: string, flightNumber: string) => {
    return `https://www.flightradar24.com/data/flights/${airline}${flightNumber}`;
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
                <div 
                  key={booking.id} 
                  className="flex items-start justify-between p-3 bg-white/60 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-800/50 cursor-pointer hover:bg-white/80 dark:hover:bg-blue-950/60 transition-colors"
                  onClick={() => handleHotelCardClick(booking)}
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100">{booking.hotel.name}</h4>
                      {booking.hotel.rating && (
                        <Badge variant="secondary" className="text-xs px-2 py-1">
                          ⭐ {booking.hotel.rating}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        <Eye className="w-3 h-3 mr-1" />
                        Click for details
                      </Badge>
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

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(getDirectionsUrl(booking.hotel.address), '_blank')}
                        className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
                      >
                        <Navigation className="w-3 h-3 mr-1" />
                        Directions
                      </Button>
                      {booking.hotel.website && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(booking.hotel.website, '_blank')}
                          className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Website
                        </Button>
                      )}
                      {booking.hotel.phone && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(`tel:${booking.hotel.phone}`, '_blank')}
                          className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
                        >
                          <Phone className="w-3 h-3 mr-1" />
                          Call
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-3" onClick={(e) => e.stopPropagation()}>
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
                <div 
                  key={flight.id} 
                  className="flex items-start justify-between p-3 bg-white/60 dark:bg-purple-950/40 rounded-lg border border-purple-200 dark:border-purple-800/50 cursor-pointer hover:bg-white/80 dark:hover:bg-purple-950/60 transition-colors"
                  onClick={() => handleFlightCardClick(flight)}
                >
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
                      <Badge variant="outline" className="text-xs">
                        <Eye className="w-3 h-3 mr-1" />
                        Click for details
                      </Badge>
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

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(getAirportDirectionsUrl(flight.departure.airport), '_blank')}
                        className="h-6 px-2 text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400"
                      >
                        <Navigation className="w-3 h-3 mr-1" />
                        To Airport
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(getFlightTrackingUrl(flight.airline, flight.flightNumber), '_blank')}
                        className="h-6 px-2 text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400"
                      >
                        <Radar className="w-3 h-3 mr-1" />
                        Track
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(`https://www.${flight.airline.toLowerCase().replace(' ', '')}.com`, '_blank')}
                        className="h-6 px-2 text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Airline
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-3" onClick={(e) => e.stopPropagation()}>
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

      {/* Hotel Details Modal */}
      <Dialog open={isHotelDetailsOpen} onOpenChange={setIsHotelDetailsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hotel className="w-5 h-5 text-blue-600" />
              {selectedHotel?.hotel.name}
            </DialogTitle>
            <DialogDescription>
              Hotel booking details and information
            </DialogDescription>
          </DialogHeader>
          
          {selectedHotel && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{selectedHotel.hotel.address}</span>
                </div>
                
                {selectedHotel.hotel.rating && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Rating:</span>
                    <Badge variant="secondary">⭐ {selectedHotel.hotel.rating}</Badge>
                  </div>
                )}
                
                {selectedHotel.hotel.priceRange && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Price Range:</span>
                    <Badge variant="outline">{selectedHotel.hotel.priceRange}</Badge>
                  </div>
                )}
              </div>

              {/* Stay Dates */}
              {(selectedHotel.checkIn || selectedHotel.checkOut) && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-sm mb-2 text-blue-900 dark:text-blue-100">Stay Dates</h4>
                  <div className="space-y-1 text-sm">
                    {selectedHotel.checkIn && (
                      <div>Check-in: <span className="font-medium">{formatDate(selectedHotel.checkIn)}</span></div>
                    )}
                    {selectedHotel.checkOut && (
                      <div>Check-out: <span className="font-medium">{formatDate(selectedHotel.checkOut)}</span></div>
                    )}
                    {selectedHotel.location && (
                      <div>Location: <span className="font-medium">{selectedHotel.location}</span></div>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedHotel.hotel.description && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedHotel.hotel.description}
                  </p>
                </div>
              )}

              {/* Amenities */}
              {selectedHotel.hotel.amenities && selectedHotel.hotel.amenities.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Amenities</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedHotel.hotel.amenities.map((amenity, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(getDirectionsUrl(selectedHotel.hotel.address), '_blank')}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Get Directions
                </Button>
                
                {selectedHotel.hotel.website && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(selectedHotel.hotel.website, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Visit Website
                  </Button>
                )}
                
                {selectedHotel.hotel.phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`tel:${selectedHotel.hotel.phone}`, '_blank')}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Call Hotel
                  </Button>
                )}
                
                {selectedHotel.hotel.bookingUrl && (
                  <Button
                    size="sm"
                    onClick={() => window.open(selectedHotel.hotel.bookingUrl, '_blank')}
                  >
                    Book Now
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Flight Details Modal */}
      <Dialog open={isFlightDetailsOpen} onOpenChange={setIsFlightDetailsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-purple-600" />
              {selectedFlight?.airline} {selectedFlight?.flightNumber}
            </DialogTitle>
            <DialogDescription>
              Flight booking details and information
            </DialogDescription>
          </DialogHeader>
          
          {selectedFlight && (
            <div className="space-y-6">
              {/* Flight Route */}
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <div className="font-bold text-lg">{selectedFlight.departure.time}</div>
                    <div className="text-sm text-muted-foreground">{selectedFlight.departure.airport}</div>
                    <div className="text-xs text-muted-foreground">{selectedFlight.departure.date}</div>
                  </div>
                  <div className="flex-1 flex flex-col items-center mx-4">
                    <Plane className="w-6 h-6 text-purple-600 mb-1" />
                    <div className="w-full h-px bg-purple-300"></div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-lg">{selectedFlight.arrival.time}</div>
                    <div className="text-sm text-muted-foreground">{selectedFlight.arrival.airport}</div>
                    <div className="text-xs text-muted-foreground">{selectedFlight.arrival.date}</div>
                  </div>
                </div>
              </div>

              {/* Flight Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Airline:</span>
                  <span className="text-sm">{selectedFlight.airline}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Flight Number:</span>
                  <span className="text-sm font-mono">{selectedFlight.flightNumber}</span>
                </div>
                {selectedFlight.price && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Price:</span>
                    <Badge variant="secondary">{selectedFlight.price}</Badge>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(getAirportDirectionsUrl(selectedFlight.departure.airport), '_blank')}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Directions to Airport
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(getFlightTrackingUrl(selectedFlight.airline, selectedFlight.flightNumber), '_blank')}
                >
                  <Radar className="w-4 h-4 mr-2" />
                  Track Flight
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://www.${selectedFlight.airline.toLowerCase().replace(' ', '')}.com`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Airline Website
                </Button>
                
                {selectedFlight.bookingUrl && (
                  <Button
                    size="sm"
                    onClick={() => window.open(selectedFlight.bookingUrl, '_blank')}
                  >
                    Book Now
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}