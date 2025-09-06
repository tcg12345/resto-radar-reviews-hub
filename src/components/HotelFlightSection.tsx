import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Hotel, Plane, Plus, MapPin, ExternalLink, Phone, Navigation, Eye, Radar, Star, Camera, Calendar, Users, ChevronDown, ChevronUp, X, Edit3, Trash2, TrendingUp, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RestaurantLocationMap } from '@/components/RestaurantLocationMap';
import { useTripAdvisorApi } from '@/hooks/useTripAdvisorApi';
import { PhotoGallery } from '@/components/PhotoGallery';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HotelSearchDialog } from '@/components/HotelSearchDialog';
import { EnhancedFlightSearchDialog } from '@/components/EnhancedFlightSearchDialog';
import { StayDetails, HotelStayDetailsDialog } from '@/components/HotelStayDetailsDialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { useFlightStats } from '@/hooks/useFlightStats';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
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
  // Additional stay details from booking process
  guests?: number;
  rooms?: number;
  roomType?: string;
  specialRequests?: string;
  confirmationNumber?: string;
  totalCost?: string;
  notes?: string;
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
  price?: string | { currency: string; total: string; base?: string; fees?: string; grandTotal?: string; };
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
  onUpdateHotel?: (hotelId: string, updates: Partial<HotelBooking>) => void;
  itineraryDuration?: number;
  wasCreatedWithLengthOfStay?: boolean;
}
export function HotelFlightSection({
  locations,
  isMultiCity,
  hotels,
  flights,
  onAddHotel,
  onAddFlight,
  onRemoveHotel,
  onRemoveFlight,
  onUpdateHotel,
  itineraryDuration,
  wasCreatedWithLengthOfStay
}: HotelFlightSectionProps) {
  const isMobile = useIsMobile();
  const [isHotelDialogOpen, setIsHotelDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [isFlightDialogOpen, setIsFlightDialogOpen] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<HotelBooking | null>(null);
  const [selectedFlight, setSelectedFlight] = useState<FlightBooking | null>(null);
  const [isHotelDetailsOpen, setIsHotelDetailsOpen] = useState(false);
  const [isFlightDetailsOpen, setIsFlightDetailsOpen] = useState(false);

  // Flight stats hook - called at top level
  const { flightStats, isLoading: isStatsLoading } = useFlightStats({
    carrierCode: selectedFlight?.airline?.split(' ')[0] || '',
    flightNumber: selectedFlight?.flightNumber || '',
    departureAirport: selectedFlight?.departure?.airport || '',
    arrivalAirport: selectedFlight?.arrival?.airport || '',
    enabled: !!(selectedFlight?.airline && selectedFlight?.flightNumber && selectedFlight?.departure?.airport && selectedFlight?.arrival?.airport)
  });
  const [tripAdvisorPhotos, setTripAdvisorPhotos] = useState<any[]>([]);
  const [tripAdvisorReviews, setTripAdvisorReviews] = useState<any[]>([]);
  const [tripAdvisorLocationId, setTripAdvisorLocationId] = useState<string | null>(null);
  const [loadingTripAdvisorData, setLoadingTripAdvisorData] = useState(false);
  const [isPhotoGalleryOpen, setIsPhotoGalleryOpen] = useState(false);
  const [photoGalleryIndex, setPhotoGalleryIndex] = useState(0);
  const [hotelWebsite, setHotelWebsite] = useState<string | null>(null);
  const {
    searchLocations,
    getLocationPhotos,
    getLocationReviews,
    getLocationDetails,
    getBookingOffers
  } = useTripAdvisorApi();
  const [bookingOffers, setBookingOffers] = useState<any[]>([]);
  const [loadingBooking, setLoadingBooking] = useState(false);
  const [checkInDate, setCheckInDate] = useState<string>('');
  const [checkOutDate, setCheckOutDate] = useState<string>('');
  const [guests, setGuests] = useState(2);
  const [isHotelsExpanded, setIsHotelsExpanded] = useState(false);
  const [isFlightsExpanded, setIsFlightsExpanded] = useState(false);
  const [editingHotel, setEditingHotel] = useState<HotelBooking | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    totalCost: "",
    confirmationNumber: "",
    roomType: "",
    specialRequests: "",
    notes: "",
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Helper function to format flight price
  const formatFlightPrice = (price: string | { currency: string; total: string; base?: string; fees?: string; grandTotal?: string; } | undefined) => {
    if (!price) return '';
    if (typeof price === 'string') return price;
    if (typeof price === 'object' && price.currency && price.total) {
      return `${price.currency} ${price.total}`;
    }
    return '';
  };

  function openEdit(booking: HotelBooking) {
    setEditingHotel(booking);
    setShowEditModal(true);
  }

  useEffect(() => {
    if (editingHotel && showEditModal) {
      setEditForm({
        totalCost: editingHotel.totalCost || "",
        confirmationNumber: editingHotel.confirmationNumber || "",
        roomType: editingHotel.roomType || "",
        specialRequests: editingHotel.specialRequests || "",
        notes: editingHotel.notes || "",
      });
    }
  }, [editingHotel, showEditModal]);
  const handleHotelSelect = (stayDetails: StayDetails) => {
    // Convert StayDetails back to the old format for now
    onAddHotel(stayDetails.hotel, undefined, stayDetails.checkIn, stayDetails.checkOut);
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
  const navigate = useNavigate();
  
  const handleHotelCardClick = (booking: HotelBooking) => {
    // Store complete hotel booking data including all stay details
    const hotelDetailsData = {
      ...booking.hotel,
      // Include all the booking details from the stay
      stayDetails: {
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        location: booking.location,
        guests: booking.guests,
        rooms: booking.rooms,
        roomType: booking.roomType,
        specialRequests: booking.specialRequests,
        confirmationNumber: booking.confirmationNumber,
        totalCost: booking.totalCost,
        notes: booking.notes
      }
    };
    sessionStorage.setItem(`hotel_${booking.hotel.id}`, JSON.stringify(hotelDetailsData));
    navigate(`/hotel/${booking.hotel.id}`);
  };
  const handleFlightCardClick = (flight: FlightBooking) => {
    setSelectedFlight(flight);
    setIsFlightDetailsOpen(true);
  };
  const loadTripAdvisorData = async (hotelName: string, hotelAddress: string) => {
    setLoadingTripAdvisorData(true);
    setTripAdvisorPhotos([]);
    setTripAdvisorReviews([]);
    setTripAdvisorLocationId(null);
    setHotelWebsite(null);
    try {
      const searchQuery = `${hotelName} ${hotelAddress}`;

      // Start search immediately
      const searchPromise = searchLocations(searchQuery);

      // Wait for search result
      const locations = await searchPromise;
      if (locations && locations.length > 0) {
        const location = locations[0];
        setTripAdvisorLocationId(location.location_id);

        // Start loading details, photos and reviews in parallel
        const [detailsPromise, photosPromise, reviewsPromise] = [getLocationDetails(location.location_id), getLocationPhotos(location.location_id, 20), getLocationReviews(location.location_id, 10)];

        // Handle details (for website) as soon as they're available
        detailsPromise.then(details => {
          if (details?.website) {
            setHotelWebsite(details.website);
          }
        }).catch(err => console.error('Error loading details:', err));

        // Handle photos as soon as they're available
        photosPromise.then(photos => {
          if (photos) setTripAdvisorPhotos(photos);
        }).catch(err => console.error('Error loading photos:', err));

        // Handle reviews as soon as they're available
        reviewsPromise.then(reviews => {
          if (reviews) setTripAdvisorReviews(reviews);
        }).catch(err => console.error('Error loading reviews:', err));

        // Wait for all to complete before hiding loading
        await Promise.allSettled([detailsPromise, photosPromise, reviewsPromise]);
      }
    } catch (error) {
      console.error('Error loading TripAdvisor data:', error);
    } finally {
      setLoadingTripAdvisorData(false);
    }
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

  const getAirlineWebsite = (airline: string) => {
    const airlineWebsites: { [key: string]: string } = {
      'delta': 'https://www.delta.com',
      'delta air lines': 'https://www.delta.com',
      'american': 'https://www.aa.com',
      'american airlines': 'https://www.aa.com',
      'united': 'https://www.united.com',
      'united airlines': 'https://www.united.com',
      'southwest': 'https://www.southwest.com',
      'southwest airlines': 'https://www.southwest.com',
      'jetblue': 'https://www.jetblue.com',
      'jetblue airways': 'https://www.jetblue.com',
      'alaska': 'https://www.alaskaair.com',
      'alaska airlines': 'https://www.alaskaair.com',
      'spirit': 'https://www.spirit.com',
      'spirit airlines': 'https://www.spirit.com',
      'frontier': 'https://www.flyfrontier.com',
      'frontier airlines': 'https://www.flyfrontier.com',
      'hawaiian': 'https://www.hawaiianairlines.com',
      'hawaiian airlines': 'https://www.hawaiianairlines.com',
      'lufthansa': 'https://www.lufthansa.com',
      'british airways': 'https://www.britishairways.com',
      'air france': 'https://www.airfrance.com',
      'klm': 'https://www.klm.com',
      'emirates': 'https://www.emirates.com',
      'qatar airways': 'https://www.qatarairways.com',
      'singapore airlines': 'https://www.singaporeair.com',
      'cathay pacific': 'https://www.cathaypacific.com',
      'virgin atlantic': 'https://www.virginatlantic.com',
      'virgin america': 'https://www.alaskaair.com',
      'air canada': 'https://www.aircanada.com',
      'westjet': 'https://www.westjet.com'
    };
    
    const normalizedAirline = airline.toLowerCase().trim();
    return airlineWebsites[normalizedAirline] || `https://www.google.com/search?q=${encodeURIComponent(airline + ' official website')}`;
  };
  const handlePhotoClick = (index: number) => {
    setPhotoGalleryIndex(index);
    setIsPhotoGalleryOpen(true);
  };
  const getPhotoUrls = () => {
    return tripAdvisorPhotos.map(photo => photo.images?.large?.url || photo.images?.medium?.url || photo.images?.small?.url || photo.images?.thumbnail?.url).filter(Boolean);
  };
  const content = isMobile ? (
    <div className="space-y-1">
        {/* Hotels Section - Mobile */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-lg backdrop-blur-sm my-4 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between py-2 cursor-pointer" onClick={() => setIsHotelsExpanded(!isHotelsExpanded)}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Hotel className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-lg">Hotels</h3>
                
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Hotel Add button clicked, opening fresh dialog');
                  setDialogKey(prev => prev + 1);
                  setIsHotelDialogOpen(true);
                }} 
                size="sm" 
                className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/20" 
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
              {isHotelsExpanded ? <ChevronUp className="w-6 h-6 text-muted-foreground" /> : <ChevronDown className="w-6 h-6 text-muted-foreground" />}
            </div>
          </div>
          
          {isHotelsExpanded && <div className="pb-4 animate-fade-in">
              {hotels.length > 0 ? <div className="space-y-3">
                  {hotels.map(booking => <div key={booking.id} className="bg-card border border-border rounded-lg p-4 shadow-md hover:shadow-lg transition-all duration-300 group">
                      {/* Header Section */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                            <Hotel className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-foreground text-xl leading-tight tracking-tight mb-2">{booking.hotel.name}</h4>
                            {/* Rating & Details Row */}
                            <div className="flex items-center gap-3">
                              {booking.hotel.rating && (
                                <div className="flex items-center bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-700/30">
                                  <Star className="w-3.5 h-3.5 text-amber-500 fill-current mr-1.5" />
                                  <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">{booking.hotel.rating}</span>
                                </div>
                              )}
                              <Button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleHotelCardClick(booking);
                                }} 
                                size="sm" 
                                variant="ghost" 
                                className="h-7 px-3 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 font-medium"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Details
                              </Button>
                            </div>
                          </div>
                        </div>
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <Button 
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(booking);
                            }}
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full shrink-0"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(booking.id);
                            }}
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Info Section */}
                      <div className="space-y-3 mb-5">
                        {/* Location */}
                        <div className="flex items-start gap-3 pb-2 border-b border-border/10">
                          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                          <span className="text-sm text-muted-foreground leading-relaxed">{booking.hotel.address}</span>
                        </div>
                        
                        {/* Dates */}
                        {(booking.checkIn || booking.checkOut) && (
                          <div className="flex items-center gap-3 pb-2 border-b border-border/10">
                            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="text-sm text-foreground font-medium">
                              {wasCreatedWithLengthOfStay ? (
                                // Day mode - show nights
                                booking.checkIn && booking.checkOut 
                                  ? (() => {
                                      const checkInDate = new Date(booking.checkIn);
                                      const checkOutDate = new Date(booking.checkOut);
                                      const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
                                      const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));
                                      return `${nights} night${nights !== 1 ? 's' : ''}`;
                                    })()
                                  : booking.checkIn 
                                  ? `Check-in: Day ${booking.checkIn}` 
                                  : booking.checkOut 
                                  ? `Check-out: Day ${booking.checkOut}` 
                                  : null
                              ) : (
                                // Date mode - show specific dates
                                booking.checkIn && booking.checkOut 
                                  ? `${formatDate(booking.checkIn)} - ${formatDate(booking.checkOut)}` 
                                  : booking.checkIn 
                                  ? `Check-in: ${formatDate(booking.checkIn)}` 
                                  : booking.checkOut 
                                  ? `Check-out: ${formatDate(booking.checkOut)}` 
                                  : null
                              )}
                            </span>
                          </div>
                        )}
                        
                        {/* Trip Location */}
                        {booking.location && (
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 flex items-center justify-center">
                              <div className="w-2 h-2 bg-primary rounded-full"></div>
                            </div>
                            <Badge variant="outline" className="text-xs font-medium border-border/30">
                              {booking.location}
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                       {/* Action Buttons - 2x2 Grid */}
                       <div className="grid grid-cols-2 gap-3">
                         {/* Book Hotel */}
                         {booking.hotel.bookingUrl && (
                           <Button 
                             size="sm" 
                             onClick={() => window.open(booking.hotel.bookingUrl, '_blank')} 
                             className="h-10 font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-sm hover:shadow-md transition-all"
                           >
                             Book Hotel
                           </Button>
                         )}
                         
                         {/* Directions */}
                         <Button 
                           size="sm" 
                           onClick={() => window.open(getDirectionsUrl(booking.hotel.address), '_blank')} 
                           className="h-10 font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-sm hover:shadow-md transition-all"
                         >
                           <Navigation className="w-4 h-4 mr-2" />
                           Directions
                         </Button>
                         
                         {/* Website */}
                         {booking.hotel.website && (
                           <Button 
                             size="sm" 
                             onClick={() => window.open(booking.hotel.website, '_blank')} 
                             className="h-10 font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-sm hover:shadow-md transition-all"
                           >
                             <ExternalLink className="w-4 h-4 mr-2" />
                             Website
                           </Button>
                         )}
                         
                         {/* Call */}
                         {booking.hotel.phone && (
                           <Button 
                             size="sm" 
                             onClick={() => window.open(`tel:${booking.hotel.phone}`, '_blank')} 
                             className="h-10 font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-sm hover:shadow-md transition-all"
                           >
                             <Phone className="w-4 h-4 mr-2" />
                             Call
                           </Button>
                         )}
                       </div>
                    </div>)}
                </div> : <div className="text-center py-6 text-white/90">
                  <Hotel className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">No hotels added yet</p>
                  <p className="text-xs opacity-75 mt-1">Tap 'Add' to find accommodations</p>
                </div>}
            </div>}
        </div>

        {/* Flights Section - Mobile */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-lg backdrop-blur-sm hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between py-2 cursor-pointer" onClick={() => setIsFlightsExpanded(!isFlightsExpanded)}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Plane className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-lg">Flights</h3>
                <p className="text-muted-foreground text-sm">{flights.length} flight{flights.length !== 1 ? 's' : ''} added</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Flight Add button clicked, opening dialog:', !isFlightDialogOpen);
                  setIsFlightDialogOpen(true);
                }} 
                size="sm" 
                className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/20" 
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
              {isFlightsExpanded ? <ChevronUp className="w-6 h-6 text-muted-foreground" /> : <ChevronDown className="w-6 h-6 text-muted-foreground" />}
            </div>
          </div>
          
          {isFlightsExpanded && <div className="pb-4 animate-fade-in">
              {flights.length > 0 ? <div className="space-y-3">
                  {flights.map(flight => <div key={flight.id} className="bg-card border border-border rounded-lg p-4 shadow-md hover:shadow-lg transition-all duration-300">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-primary/10 shrink-0">
                          <Plane className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-gray-900 dark:text-white text-lg leading-tight">
                                {flight.airline} {flight.flightNumber}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                {flight.price && <div className="flex items-center bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-lg">
                                    <span className="text-xs font-medium text-green-700 dark:text-green-300">💰 {formatFlightPrice(flight.price)}</span>
                                  </div>}
                                <Button onClick={() => handleFlightCardClick(flight)} size="sm" variant="ghost" className="h-6 px-2 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-50">
                                  <Eye className="w-3 h-3 mr-1" />
                                  Details
                                </Button>
                              </div>
                            </div>
                            <Button onClick={() => onRemoveFlight(flight.id)} size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-1">
                              ×
                            </Button>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-center flex-1">
                                  <div className="font-bold text-purple-900 dark:text-purple-100">{flight.departure?.airport || 'N/A'}</div>
                                  <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">{flight.departure?.time || 'N/A'}</div>
                                  <div className="text-xs text-purple-500 dark:text-purple-400">{flight.departure?.date || 'N/A'}</div>
                                </div>
                                <div className="px-3">
                                  <Plane className="w-5 h-5 text-purple-400 rotate-90" />
                                </div>
                                <div className="text-center flex-1">
                                  <div className="font-bold text-purple-900 dark:text-purple-100">{flight.arrival?.airport || 'N/A'}</div>
                                  <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">{flight.arrival?.time || 'N/A'}</div>
                                  <div className="text-xs text-purple-500 dark:text-purple-400">{flight.arrival?.date || 'N/A'}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mt-3">
                            <Button size="sm" variant="outline" onClick={() => window.open(getAirportDirectionsUrl(flight.departure?.airport || ''), '_blank')} className="h-9 text-xs px-3 whitespace-nowrap bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 flex-none w-auto" disabled={!flight.departure?.airport}>
                              <Navigation className="w-3 h-3 mr-1" />
                              To Airport
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => window.open(getFlightTrackingUrl(flight.airline, flight.flightNumber), '_blank')} className="h-9 text-xs px-3 whitespace-nowrap bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 flex-none w-auto">
                              <Radar className="w-3 h-3 mr-1" />
                              Track
                            </Button>
                            {flight.bookingUrl && <Button size="sm" onClick={() => window.open(flight.bookingUrl, '_blank')} className="w-full h-9 text-xs bg-purple-600 hover:bg-purple-700 text-white mt-1">
                                View Booking
                              </Button>}
                          </div>
                        </div>
                      </div>
                    </div>)}
                </div> : <div className="text-center py-6 text-white/90">
                  <Plane className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">No flights added yet</p>
                  <p className="text-xs opacity-75 mt-1">Tap 'Add' to find flights</p>
                </div>}
            </div>}
        </div>
      {/* Details Modals - Mobile */}
      <Dialog 
        open={isHotelDetailsOpen} 
        onOpenChange={(open) => {
          console.log('Hotel Details Dialog onOpenChange called with:', open);
          setIsHotelDetailsOpen(open);
        }}
      >
        <DialogContent overlayClassName="bg-transparent" className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto fixed z-[100] bg-white dark:bg-gray-900 border shadow-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hotel className="w-5 h-5 text-blue-600" />
              {selectedHotel?.hotel.name || 'Hotel Details'}
            </DialogTitle>
            <DialogDescription>
              Hotel booking details and information
            </DialogDescription>
          </DialogHeader>
          {selectedHotel && (
            <div className="space-y-6">
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
              {(selectedHotel.checkIn || selectedHotel.checkOut) && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-sm mb-2 text-blue-900 dark:text-blue-100">Stay Dates</h4>
                  <div className="space-y-1 text-sm">
                    {selectedHotel.checkIn && (
                      <div>
                        Check-in: <span className="font-medium">{formatDate(selectedHotel.checkIn)}</span>
                      </div>
                    )}
                    {selectedHotel.checkOut && (
                      <div>
                        Check-out: <span className="font-medium">{formatDate(selectedHotel.checkOut)}</span>
                      </div>
                    )}
                    {selectedHotel.location && (
                      <div>
                        Location: <span className="font-medium">{selectedHotel.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {selectedHotel.hotel.description && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{selectedHotel.hotel.description}</p>
                </div>
              )}
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
              {tripAdvisorPhotos.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-blue-600" />
                    <h4 className="font-medium text-sm">Photos from TripAdvisor</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                    {tripAdvisorPhotos.slice(0, 12).map((photo, index) => (
                      <div
                        key={photo.id || index}
                        className="relative aspect-video rounded-lg overflow-hidden bg-muted cursor-pointer group"
                        onClick={() => handlePhotoClick(index)}
                      >
                        <img
                          src={photo.images?.medium?.url || photo.images?.small?.url || photo.images?.thumbnail?.url}
                          alt={photo.caption || 'Hotel photo'}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {photo.caption && (
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white p-1">
                            <p className="text-xs truncate">{photo.caption}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {tripAdvisorReviews.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <h4 className="font-medium text-sm">Reviews from TripAdvisor</h4>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {tripAdvisorReviews.slice(0, 6).map((review, index) => (
                      <div key={review.id || index} className="p-2 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`${i < review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'} w-3 h-3`} />
                              ))}
                            </div>
                            <span className="text-xs font-medium">{review.user?.username}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{new Date(review.published_date).toLocaleDateString()}</span>
                        </div>
                        {review.title && <h5 className="font-medium text-xs mb-1">{review.title}</h5>}
                        <p className="text-xs text-muted-foreground line-clamp-3">{review.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {tripAdvisorLocationId && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-600" />
                    <h4 className="font-medium text-sm">Book This Hotel</h4>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="checkin" className="text-xs">Check-in</Label>
                        <Input id="checkin" type="date" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} className="h-8 text-xs" min={new Date().toISOString().split('T')[0]} />
                      </div>
                      <div>
                        <Label htmlFor="checkout" className="text-xs">Check-out</Label>
                        <Input id="checkout" type="date" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} className="h-8 text-xs" min={checkInDate || new Date().toISOString().split('T')[0]} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <Label htmlFor="guests" className="text-xs">Guests</Label>
                        <Select value={guests.toString()} onValueChange={(value) => setGuests(parseInt(value))}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6].map((num) => (
                              <SelectItem key={num} value={num.toString()}>
                                {num} Guest{num > 1 ? 's' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        size="sm"
                        onClick={async () => {
                          if (!checkInDate || !checkOutDate || !tripAdvisorLocationId) {
                            alert('Please select check-in and check-out dates');
                            return;
                          }
                          setLoadingBooking(true);
                          try {
                            const offers = await getBookingOffers(tripAdvisorLocationId, checkInDate, checkOutDate, guests);
                            setBookingOffers(offers || []);
                          } catch (error) {
                            console.error('Error fetching booking offers:', error);
                            alert('Unable to fetch booking offers at the moment');
                          } finally {
                            setLoadingBooking(false);
                          }
                        }}
                        disabled={loadingBooking || !checkInDate || !checkOutDate}
                        className="mt-4"
                      >
                        {loadingBooking ? (
                          <>
                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <Calendar className="w-3 h-3 mr-1" />
                            Search Deals
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  {bookingOffers.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-green-700 dark:text-green-300">Available Deals</h5>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {bookingOffers.slice(0, 5).map((offer, index) => (
                          <div key={index} className="p-3 bg-white dark:bg-green-950/40 rounded-lg border border-green-200 dark:border-green-800/50">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-medium">{offer.partner_name || 'Booking Partner'}</div>
                                {offer.price && (
                                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                    ${offer.price}
                                    <span className="text-xs text-muted-foreground ml-1">per night</span>
                                  </div>
                                )}
                                {offer.total_price && <div className="text-sm text-muted-foreground">Total: ${offer.total_price}</div>}
                              </div>
                              <Button size="sm" onClick={() => window.open(offer.booking_url || `https://www.tripadvisor.com/Hotel_Review-d${tripAdvisorLocationId}`, '_blank')} className="bg-green-600 hover:bg-green-700">
                                Book Now
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {loadingTripAdvisorData && (
                <div className="flex items-center justify-center py-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    Loading TripAdvisor content...
                  </div>
                </div>
              )}
              {loadingBooking && (
                <div className="flex items-center justify-center py-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                    Searching for booking deals...
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => window.open(getDirectionsUrl(selectedHotel.hotel.address), '_blank')}>
                  <Navigation className="w-4 h-4 mr-2" />
                  Get Directions
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const websiteUrl = hotelWebsite || selectedHotel.hotel.website;
                    if (websiteUrl) {
                      window.open(websiteUrl, '_blank');
                    } else {
                      const searchQuery = encodeURIComponent(`${selectedHotel.hotel.name} ${selectedHotel.hotel.address} official website`);
                      window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
                    }
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {hotelWebsite || selectedHotel.hotel.website ? 'Hotel Website' : 'Find Website'}
                </Button>
                {selectedHotel.hotel.phone && (
                  <Button variant="outline" size="sm" onClick={() => window.open(`tel:${selectedHotel.hotel.phone}`, '_blank')}>
                    <Phone className="w-4 h-4 mr-2" />
                    Call Hotel
                  </Button>
                )}
                {selectedHotel.hotel.bookingUrl && (
                  <Button size="sm" onClick={() => window.open(selectedHotel.hotel.bookingUrl, '_blank')}>
                    Book Now
                  </Button>
                )}
                {tripAdvisorLocationId && (
                  <Button variant="outline" size="sm" onClick={() => window.open(`https://www.tripadvisor.com/Hotel_Review-d${tripAdvisorLocationId}`, '_blank')}>
                    <ExternalLink className="w-4 h-4 mr-1" />
                    TripAdvisor
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Drawer open={isFlightDetailsOpen} onOpenChange={setIsFlightDetailsOpen}>
        <DrawerContent className="h-[80vh] bg-background border-border">
          <div className="flex flex-col h-[80vh]">
            <div className="flex items-center justify-between p-3 border-b border-border/20 bg-gradient-to-r from-purple-50/50 to-blue-50/50 dark:from-purple-950/30 dark:to-blue-950/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                  <Plane className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground leading-tight">
                    {selectedFlight?.airline} {selectedFlight?.flightNumber}
                  </h2>
                  <p className="text-xs text-muted-foreground">Flight Details</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFlightDetailsOpen(false)}
                className="h-8 w-8 p-0 rounded-full hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
             <div className="flex-1 overflow-y-auto p-4">
               {selectedFlight && (
                 <div className="space-y-6">
                  {/* Flight Route Display */}
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                    <div className="flex items-center justify-between">
                      <div className="text-center flex-1">
                        <div className="font-bold text-xl text-purple-900 dark:text-purple-100">
                          {selectedFlight.departure?.time || 'N/A'}
                        </div>
                        <div className="text-sm font-medium text-purple-700 dark:text-purple-300">
                          {selectedFlight.departure?.airport || 'N/A'}
                        </div>
                        <div className="text-xs text-purple-600 dark:text-purple-400">
                          {selectedFlight.departure?.date || 'N/A'}
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col items-center mx-6">
                        <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">
                          Flight
                        </div>
                        <Plane className="w-6 h-6 text-purple-600 mb-1 transform rotate-90" />
                        <div className="w-full h-px bg-gradient-to-r from-purple-300 to-blue-300"></div>
                        <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                          {selectedFlight.flightNumber}
                        </div>
                      </div>
                      <div className="text-center flex-1">
                        <div className="font-bold text-xl text-purple-900 dark:text-purple-100">
                          {selectedFlight.arrival?.time || 'N/A'}
                        </div>
                        <div className="text-sm font-medium text-purple-700 dark:text-purple-300">
                          {selectedFlight.arrival?.airport || 'N/A'}
                        </div>
                        <div className="text-xs text-purple-600 dark:text-purple-400">
                          {selectedFlight.arrival?.date || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Flight Details */}
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Flight Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Airline:</span>
                            <span className="text-sm font-medium">{selectedFlight.airline}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Flight Number:</span>
                            <span className="text-sm font-mono font-medium">{selectedFlight.flightNumber}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Departure:</span>
                            <span className="text-sm">{selectedFlight.departure?.time} - {selectedFlight.departure?.airport}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Arrival:</span>
                            <span className="text-sm">{selectedFlight.arrival?.time} - {selectedFlight.arrival?.airport}</span>
                          </div>
                        </div>
                      </div>
                      {selectedFlight.price && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Price:</span>
                            <span className="text-lg font-bold text-green-600 dark:text-green-400">
                              {formatFlightPrice(selectedFlight.price)}
                            </span>
                          </div>
                        </div>
                      )}
                     </div>
                   </div>

                   {/* On-Time Performance */}
                   {flightStats && (
                     <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-700">
                       <div className="flex items-center gap-2 mb-3">
                         <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                         <h4 className="font-semibold text-green-900 dark:text-green-100">On-Time Performance</h4>
                       </div>
                       
                       <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                         <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                           <div className="flex items-center justify-center gap-1 mb-1">
                             {flightStats.onTimePerformance.onTimePercentage >= 80 ? (
                               <CheckCircle className="w-4 h-4 text-green-600" />
                             ) : flightStats.onTimePerformance.onTimePercentage >= 70 ? (
                               <AlertCircle className="w-4 h-4 text-yellow-600" />
                             ) : (
                               <AlertCircle className="w-4 h-4 text-red-600" />
                             )}
                             <span className="text-xs text-gray-600 dark:text-gray-400">On Time</span>
                           </div>
                           <div className={`text-lg font-bold ${
                             flightStats.onTimePerformance.onTimePercentage >= 80 
                               ? 'text-green-700 dark:text-green-300'
                               : flightStats.onTimePerformance.onTimePercentage >= 70
                               ? 'text-yellow-700 dark:text-yellow-300'
                               : 'text-red-700 dark:text-red-300'
                           }`}>
                             {flightStats.onTimePerformance.onTimePercentage}%
                           </div>
                         </div>
                         
                         <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                           <div className="flex items-center justify-center gap-1 mb-1">
                             <Info className="w-4 h-4 text-blue-600" />
                             <span className="text-xs text-gray-600 dark:text-gray-400">Avg Delay</span>
                           </div>
                           <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                             {flightStats.onTimePerformance.averageDelayMinutes}m
                           </div>
                         </div>
                         
                         <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                           <div className="flex items-center justify-center gap-1 mb-1">
                             <Star className="w-4 h-4 text-purple-600" />
                             <span className="text-xs text-gray-600 dark:text-gray-400">Rating</span>
                           </div>
                           <div className="text-sm font-bold text-purple-700 dark:text-purple-300">
                             {flightStats.onTimePerformance.reliability}
                           </div>
                         </div>
                       </div>
                       
                       <div className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600 pt-2">
                         <div className="flex justify-between items-center">
                           <span>Cancellation Rate: {flightStats.onTimePerformance.cancellationRate}%</span>
                           <span>Data: Last 12 months</span>
                         </div>
                       </div>
                     </div>
                   )}
                   
                   {isStatsLoading && (
                     <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                       <div className="flex items-center gap-2">
                         <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                         <span className="text-sm text-gray-600 dark:text-gray-400">Loading flight performance data...</span>
                       </div>
                     </div>
                   )}

                   {/* Action Buttons */}
                  <div className="flex flex-col gap-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.open(getAirportDirectionsUrl(selectedFlight.departure?.airport || ''), '_blank')} 
                      disabled={!selectedFlight.departure?.airport}
                      className="w-full"
                    >
                      <Navigation className="w-4 h-4 mr-2" />
                      Directions to Airport
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.open(getFlightTrackingUrl(selectedFlight.airline, selectedFlight.flightNumber), '_blank')}
                      className="w-full"
                    >
                      <Radar className="w-4 h-4 mr-2" />
                      Track Flight
                    </Button>
                     <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.open(getAirlineWebsite(selectedFlight.airline), '_blank')}
                      className="w-full"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Airline Website
                    </Button>
                    {selectedFlight.bookingUrl && (
                      <Button 
                        size="sm" 
                        onClick={() => window.open(selectedFlight.bookingUrl, '_blank')}
                        className="w-full"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Booking
                      </Button>
                    )}
                   </div>
                 </div>
               )}
             </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Hotel & Flight Search Dialogs - Mobile */}
      <HotelSearchDialog
        key={dialogKey}
        isOpen={isHotelDialogOpen}
        onClose={() => setIsHotelDialogOpen(false)}
        onSelect={handleHotelSelect}
        locations={locations}
        isMultiCity={isMultiCity}
        itineraryStartDate={locations[0]?.startDate}
        itineraryEndDate={locations[0]?.endDate}
        itineraryDuration={itineraryDuration}
        wasCreatedWithLengthOfStay={wasCreatedWithLengthOfStay}
      />

      <EnhancedFlightSearchDialog
        isOpen={isFlightDialogOpen}
        onClose={() => setIsFlightDialogOpen(false)}
        onSelect={handleFlightSelect}
        locations={locations}
      />
     </div>
  ) : (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:contents">
      {/* Hotels Section - Desktop */}
      <div className="lg:contents">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800/30 lg:rounded-lg lg:border lg:shadow-sm rounded-none border-0 border-t border-b shadow-none relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen lg:left-auto lg:right-auto lg:ml-0 lg:mr-0 lg:w-auto mb-6">
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
              <Button onClick={() => setIsHotelDialogOpen(true)} size="sm" variant="outline" className="h-8 text-xs border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/50">
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>
            
            {hotels.length > 0 ? <div className="space-y-3 max-h-48 overflow-y-auto">
                {hotels.map(booking => <div key={booking.id} className="flex items-start justify-between p-3 bg-white/60 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-800/50 cursor-pointer hover:bg-white/80 dark:hover:bg-blue-950/60 transition-colors" onClick={() => handleHotelCardClick(booking)}>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100">{booking.hotel.name}</h4>
                        {booking.hotel.rating && <Badge variant="secondary" className="text-xs px-2 py-1">
                            ⭐ {booking.hotel.rating}
                          </Badge>}
                        <Badge variant="outline" className="text-xs">
                          <Eye className="w-3 h-3 mr-1" />
                          Click for details
                        </Badge>
                      </div>
                      
                      <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                        {booking.hotel.address}
                      </p>
                      
                      {(booking.checkIn || booking.checkOut) && <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                          {booking.checkIn && booking.checkOut ? `📅 ${formatDate(booking.checkIn)} - ${formatDate(booking.checkOut)}` : booking.checkIn ? `📅 Check-in: ${formatDate(booking.checkIn)}` : booking.checkOut ? `📅 Check-out: ${formatDate(booking.checkOut)}` : null}
                        </div>}
                      
                      {booking.location && <Badge variant="outline" className="text-xs">
                          📍 {booking.location}
                        </Badge>}

                      {/* Quick Action Buttons */}
                      <div className="flex items-center gap-1 pt-1" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" onClick={() => window.open(getDirectionsUrl(booking.hotel.address), '_blank')} className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400">
                          <Navigation className="w-3 h-3 mr-1" />
                          Directions
                        </Button>
                        {booking.hotel.website && <Button size="sm" variant="ghost" onClick={() => window.open(booking.hotel.website, '_blank')} className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Website
                          </Button>}
                        {booking.hotel.phone && <Button size="sm" variant="ghost" onClick={() => window.open(`tel:${booking.hotel.phone}`, '_blank')} className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400">
                            <Phone className="w-3 h-3 mr-1" />
                            Call
                          </Button>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-3" onClick={e => e.stopPropagation()}>
                      {booking.hotel.bookingUrl && <Button size="sm" variant="outline" onClick={() => window.open(booking.hotel.bookingUrl, '_blank')} className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 border-blue-300 dark:border-blue-700">
                          Book Hotel
                        </Button>}
                      <Button size="sm" variant="ghost" onClick={() => onRemoveHotel(booking.id)} className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                        Remove
                      </Button>
                    </div>
                  </div>)}
              </div> : <div className="text-center py-4 text-blue-600 dark:text-blue-400">
                <Hotel className="w-6 h-6 mx-auto mb-1 opacity-50" />
                <p className="text-xs">No hotels added</p>
              </div>}
          </CardContent>
        </Card>
      </div>

      {/* Flights Section */}
      <div className="lg:contents">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800/30 lg:rounded-lg lg:border lg:shadow-sm rounded-none border-0 border-t border-b shadow-none relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen lg:left-auto lg:right-auto lg:ml-0 lg:mr-0 lg:w-auto">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Plane className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-purple-900 dark:text-purple-100">Flights</h3>
                  <p className="text-xs text-purple-700 dark:text-purple-300">Transportation</p>
                </div>
              </div>
              <Button onClick={() => setIsFlightDialogOpen(true)} size="sm" variant="outline" className="h-8 text-xs border-purple-300 text-purple-700 hover:bg-purple-100 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-900/50">
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>
            
            {flights.length > 0 ? <div className="space-y-3 max-h-48 overflow-y-auto">
                {flights.map(flight => <div key={flight.id} className="flex items-start justify-between p-3 bg-white/60 dark:bg-purple-950/40 rounded-lg border border-purple-200 dark:border-purple-800/50 cursor-pointer hover:bg-white/80 dark:hover:bg-purple-950/60 transition-colors" onClick={() => handleFlightCardClick(flight)}>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm text-purple-900 dark:text-purple-100">
                          {flight.airline} {flight.flightNumber}
                        </h4>
                        {flight.price && <Badge variant="secondary" className="text-xs px-2 py-1">
                            💰 {formatFlightPrice(flight.price)}
                          </Badge>}
                        <Badge variant="outline" className="text-xs">
                          <Eye className="w-3 h-3 mr-1" />
                          Click for details
                        </Badge>
                      </div>
                      
                      <div className="text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded">
                        ✈️ {flight.departure?.airport || 'N/A'} → {flight.arrival?.airport || 'N/A'}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-purple-700 dark:text-purple-300">
                        <div>
                          <span className="font-medium">Departure:</span> {flight.departure?.time || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Arrival:</span> {flight.arrival?.time || 'N/A'}
                        </div>
                      </div>
                      
                      {flight.departure?.date && <div className="text-xs text-purple-600 dark:text-purple-400">
                          📅 {flight.departure.date}
                          {flight.arrival?.date && flight.arrival.date !== flight.departure.date && ` → ${flight.arrival.date}`}
                        </div>}

                      {/* Quick Action Buttons */}
                      <div className="flex items-center gap-1 pt-1" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" onClick={() => window.open(getAirportDirectionsUrl(flight.departure?.airport || ''), '_blank')} className="h-6 px-2 text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400" disabled={!flight.departure?.airport}>
                          <Navigation className="w-3 h-3 mr-1" />
                          To Airport
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => window.open(getFlightTrackingUrl(flight.airline, flight.flightNumber), '_blank')} className="h-6 px-2 text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400">
                          <Radar className="w-3 h-3 mr-1" />
                          Track
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => window.open(getAirlineWebsite(flight.airline), '_blank')} className="h-6 px-2 text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Airline
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-3" onClick={e => e.stopPropagation()}>
                      {flight.bookingUrl && <Button size="sm" variant="outline" onClick={() => window.open(flight.bookingUrl, '_blank')} className="text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200 border-purple-300 dark:border-purple-700">
                          Book Flight
                        </Button>}
                      <Button size="sm" variant="ghost" onClick={() => onRemoveFlight(flight.id)} className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                        Remove
                      </Button>
                    </div>
                  </div>)}
              </div> : <div className="text-center py-4 text-purple-600 dark:text-purple-400">
                <Plane className="w-6 h-6 mx-auto mb-1 opacity-50" />
                <p className="text-xs">No flights added</p>
              </div>}
          </CardContent>
        </Card>
      </div>

      {/* Hotel Search Dialog */}
      <HotelSearchDialog 
        key={dialogKey}
        isOpen={isHotelDialogOpen} 
        onClose={() => {
          console.log('Hotel dialog onClose called');
          setIsHotelDialogOpen(false);
        }} 
        onSelect={handleHotelSelect} 
        locations={locations} 
        isMultiCity={isMultiCity}
        itineraryStartDate={locations[0]?.startDate}
        itineraryEndDate={locations[0]?.endDate}
        itineraryDuration={itineraryDuration}
        wasCreatedWithLengthOfStay={wasCreatedWithLengthOfStay}
      />

      {/* Flight Search Dialog */}
      <EnhancedFlightSearchDialog isOpen={isFlightDialogOpen} onClose={() => setIsFlightDialogOpen(false)} onSelect={handleFlightSelect} locations={locations} />

      {/* Edit Hotel Modal - BRIGHT RED TEST VERSION */}
      {(() => {
        console.log('Checking modal render conditions:', {showEditModal, editingHotel: !!editingHotel});
        return showEditModal && editingHotel ? (
          <div 
            style={{ 
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'red',
              zIndex: 999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div 
              style={{
                backgroundColor: 'white',
                border: '10px solid blue',
                padding: '20px',
                borderRadius: '10px',
                width: '90%',
                maxWidth: '500px',
                fontSize: '20px',
                color: 'black'
              }}
            >
              <h2 style={{color: 'black', fontSize: '24px', marginBottom: '20px'}}>
                🎉 EDIT MODAL IS WORKING! 🎉
              </h2>
              <p style={{color: 'black', marginBottom: '10px'}}>
                Hotel: {editingHotel.hotel.name}
              </p>
              <p style={{color: 'black', marginBottom: '20px'}}>
                Check-in: {editingHotel.checkIn ? new Date(editingHotel.checkIn).toLocaleDateString() : 'Not set'}
              </p>
              
              <button 
                onClick={() => {
                  console.log('Close button clicked!');
                  setShowEditModal(false);
                }}
                style={{
                  backgroundColor: 'blue',
                  color: 'white',
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '5px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                CLOSE MODAL
              </button>
            </div>
          </div>
        ) : null;
      })()}

      {/* Hotel Details Modal */}
      <Dialog 
        open={isHotelDetailsOpen} 
        onOpenChange={(open) => {
          console.log('Hotel Details Dialog onOpenChange called with:', open);
          setIsHotelDetailsOpen(open);
        }}
      >
        <DialogContent overlayClassName="bg-transparent" className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto fixed z-[100] bg-white dark:bg-gray-900 border shadow-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hotel className="w-5 h-5 text-blue-600" />
              {selectedHotel?.hotel.name || 'Hotel Details'}
            </DialogTitle>
            <DialogDescription>
              Hotel booking details and information
            </DialogDescription>
          </DialogHeader>
          
          {selectedHotel && <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{selectedHotel.hotel.address}</span>
                </div>
                
                {selectedHotel.hotel.rating && <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Rating:</span>
                    <Badge variant="secondary">⭐ {selectedHotel.hotel.rating}</Badge>
                  </div>}
                
                {selectedHotel.hotel.priceRange && <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Price Range:</span>
                    <Badge variant="outline">{selectedHotel.hotel.priceRange}</Badge>
                  </div>}
              </div>

              {/* Stay Dates */}
              {(selectedHotel.checkIn || selectedHotel.checkOut) && <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-sm mb-2 text-blue-900 dark:text-blue-100">Stay Dates</h4>
                  <div className="space-y-1 text-sm">
                    {selectedHotel.checkIn && <div>Check-in: <span className="font-medium">{formatDate(selectedHotel.checkIn)}</span></div>}
                    {selectedHotel.checkOut && <div>Check-out: <span className="font-medium">{formatDate(selectedHotel.checkOut)}</span></div>}
                    {selectedHotel.location && <div>Location: <span className="font-medium">{selectedHotel.location}</span></div>}
                  </div>
                </div>}

              {/* Description */}
              {selectedHotel.hotel.description && <div>
                  <h4 className="font-medium text-sm mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedHotel.hotel.description}
                  </p>
                </div>}

              {/* Amenities */}
              {selectedHotel.hotel.amenities && selectedHotel.hotel.amenities.length > 0 && <div>
                  <h4 className="font-medium text-sm mb-2">Amenities</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedHotel.hotel.amenities.map((amenity, index) => <Badge key={index} variant="outline" className="text-xs">
                        {amenity}
                      </Badge>)}
                  </div>
                </div>}

              {/* TripAdvisor Photos */}
              {tripAdvisorPhotos.length > 0 && <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-blue-600" />
                    <h4 className="font-medium text-sm">Photos from TripAdvisor</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                    {tripAdvisorPhotos.slice(0, 12).map((photo, index) => <div key={photo.id || index} className="relative aspect-video rounded-lg overflow-hidden bg-muted cursor-pointer group" onClick={() => handlePhotoClick(index)}>
                        <img src={photo.images?.medium?.url || photo.images?.small?.url || photo.images?.thumbnail?.url} alt={photo.caption || 'Hotel photo'} className="w-full h-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {photo.caption && <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white p-1">
                            <p className="text-xs truncate">{photo.caption}</p>
                          </div>}
                      </div>)}
                  </div>
                </div>}

              {/* TripAdvisor Reviews */}
              {tripAdvisorReviews.length > 0 && <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <h4 className="font-medium text-sm">Reviews from TripAdvisor</h4>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {tripAdvisorReviews.slice(0, 6).map((review, index) => <div key={review.id || index} className="p-2 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} />)}
                            </div>
                            <span className="text-xs font-medium">{review.user?.username}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.published_date).toLocaleDateString()}
                          </span>
                        </div>
                        {review.title && <h5 className="font-medium text-xs mb-1">{review.title}</h5>}
                        <p className="text-xs text-muted-foreground line-clamp-3">{review.text}</p>
                      </div>)}
                  </div>
                </div>}

              {/* Hotel Booking from TripAdvisor */}
              {tripAdvisorLocationId && <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-600" />
                    <h4 className="font-medium text-sm">Book This Hotel</h4>
                  </div>
                  
                  {/* Booking Search Form */}
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="checkin" className="text-xs">Check-in</Label>
                        <Input id="checkin" type="date" value={checkInDate} onChange={e => setCheckInDate(e.target.value)} className="h-8 text-xs" min={new Date().toISOString().split('T')[0]} />
                      </div>
                      <div>
                        <Label htmlFor="checkout" className="text-xs">Check-out</Label>
                        <Input id="checkout" type="date" value={checkOutDate} onChange={e => setCheckOutDate(e.target.value)} className="h-8 text-xs" min={checkInDate || new Date().toISOString().split('T')[0]} />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <Label htmlFor="guests" className="text-xs">Guests</Label>
                        <Select value={guests.toString()} onValueChange={value => setGuests(parseInt(value))}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6].map(num => <SelectItem key={num} value={num.toString()}>
                                {num} Guest{num > 1 ? 's' : ''}
                              </SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Button size="sm" onClick={async () => {
                  if (!checkInDate || !checkOutDate || !tripAdvisorLocationId) {
                    alert('Please select check-in and check-out dates');
                    return;
                  }
                  setLoadingBooking(true);
                  try {
                    const offers = await getBookingOffers(tripAdvisorLocationId, checkInDate, checkOutDate, guests);
                    setBookingOffers(offers || []);
                  } catch (error) {
                    console.error('Error fetching booking offers:', error);
                    alert('Unable to fetch booking offers at the moment');
                  } finally {
                    setLoadingBooking(false);
                  }
                }} disabled={loadingBooking || !checkInDate || !checkOutDate} className="mt-4">
                        {loadingBooking ? <>
                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1" />
                            Searching...
                          </> : <>
                            <Calendar className="w-3 h-3 mr-1" />
                            Search Deals
                          </>}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Booking Offers */}
                  {bookingOffers.length > 0 && <div className="space-y-2">
                      <h5 className="text-sm font-medium text-green-700 dark:text-green-300">Available Deals</h5>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {bookingOffers.slice(0, 5).map((offer, index) => <div key={index} className="p-3 bg-white dark:bg-green-950/40 rounded-lg border border-green-200 dark:border-green-800/50">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-medium">{offer.partner_name || 'Booking Partner'}</div>
                                {offer.price && <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                    ${offer.price}
                                    <span className="text-xs text-muted-foreground ml-1">per night</span>
                                  </div>}
                                {offer.total_price && <div className="text-sm text-muted-foreground">
                                    Total: ${offer.total_price}
                                  </div>}
                              </div>
                              <Button size="sm" onClick={() => window.open(offer.booking_url || `https://www.tripadvisor.com/Hotel_Review-d${tripAdvisorLocationId}`, '_blank')} className="bg-green-600 hover:bg-green-700">
                                Book Now
                              </Button>
                            </div>
                          </div>)}
                      </div>
                    </div>}
                </div>}

              {/* Loading state for TripAdvisor data */}
              {loadingTripAdvisorData && <div className="flex items-center justify-center py-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    Loading TripAdvisor content...
                  </div>
                </div>}

              {/* Loading state for booking offers */}
              {loadingBooking && <div className="flex items-center justify-center py-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                    Searching for booking deals...
                  </div>
                </div>}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => window.open(getDirectionsUrl(selectedHotel.hotel.address), '_blank')}>
                  <Navigation className="w-4 h-4 mr-2" />
                  Get Directions
                </Button>
                 
                {/* Hotel Website - prioritize TripAdvisor, then hotel data, or fallback to Google search */}
                <Button variant="outline" size="sm" onClick={() => {
              const websiteUrl = hotelWebsite || selectedHotel.hotel.website;
              if (websiteUrl) {
                window.open(websiteUrl, '_blank');
              } else {
                // Fallback to Google search for hotel website
                const searchQuery = encodeURIComponent(`${selectedHotel.hotel.name} ${selectedHotel.hotel.address} official website`);
                window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
              }
            }}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {hotelWebsite || selectedHotel.hotel.website ? 'Hotel Website' : 'Find Website'}
                </Button>
                
                {selectedHotel.hotel.phone && <Button variant="outline" size="sm" onClick={() => window.open(`tel:${selectedHotel.hotel.phone}`, '_blank')}>
                    <Phone className="w-4 h-4 mr-2" />
                    Call Hotel
                  </Button>}
                
                {selectedHotel.hotel.bookingUrl && <Button size="sm" onClick={() => window.open(selectedHotel.hotel.bookingUrl, '_blank')}>
                    Book Now
                  </Button>}

                {tripAdvisorLocationId && <Button variant="outline" size="sm" onClick={() => window.open(`https://www.tripadvisor.com/Hotel_Review-d${tripAdvisorLocationId}`, '_blank')}>
                    <ExternalLink className="w-4 h-4 mr-1" />
                    TripAdvisor
                  </Button>}
              </div>
            </div>}
        </DialogContent>
      </Dialog>

      {/* Flight Details Modal */}
      <Dialog open={isFlightDetailsOpen} onOpenChange={setIsFlightDetailsOpen}>
        <DialogContent className="w-[80vw] h-[80vh] max-w-none bg-card border-border overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-purple-600" />
              {selectedFlight?.airline} {selectedFlight?.flightNumber}
            </DialogTitle>
            <DialogDescription>
              Flight booking details and information
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0">
            {selectedFlight && <div className="space-y-6 p-1">
                {/* Flight Route */}
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <div className="font-bold text-lg">{selectedFlight.departure?.time || 'N/A'}</div>
                      <div className="text-sm text-muted-foreground">{selectedFlight.departure?.airport || 'N/A'}</div>
                      <div className="text-xs text-muted-foreground">{selectedFlight.departure?.date || 'N/A'}</div>
                    </div>
                    <div className="flex-1 flex flex-col items-center mx-4">
                      <Plane className="w-6 h-6 text-purple-600 mb-1" />
                      <div className="w-full h-px bg-purple-300"></div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-lg">{selectedFlight.arrival?.time || 'N/A'}</div>
                      <div className="text-sm text-muted-foreground">{selectedFlight.arrival?.airport || 'N/A'}</div>
                      <div className="text-xs text-muted-foreground">{selectedFlight.arrival?.date || 'N/A'}</div>
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
                  {selectedFlight.price && <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Price:</span>
                      <Badge variant="secondary">{formatFlightPrice(selectedFlight.price)}</Badge>
                    </div>}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.open(getAirportDirectionsUrl(selectedFlight.departure?.airport || ''), '_blank')} disabled={!selectedFlight.departure?.airport}>
                    <Navigation className="w-4 h-4 mr-2" />
                    Directions to Airport
                  </Button>
                  
                  <Button variant="outline" size="sm" onClick={() => window.open(getFlightTrackingUrl(selectedFlight.airline, selectedFlight.flightNumber), '_blank')}>
                    <Radar className="w-4 h-4 mr-2" />
                    Track Flight
                  </Button>
                  
                  <Button variant="outline" size="sm" onClick={() => window.open(getAirlineWebsite(selectedFlight.airline), '_blank')}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Airline Website
                  </Button>
                  
                  {selectedFlight.bookingUrl && <Button size="sm" onClick={() => window.open(selectedFlight.bookingUrl, '_blank')}>
                      Book Now
                    </Button>}
                </div>
              </div>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Gallery Modal */}
      <PhotoGallery photos={getPhotoUrls()} initialIndex={photoGalleryIndex} isOpen={isPhotoGalleryOpen} onClose={() => setIsPhotoGalleryOpen(false)} restaurantName={selectedHotel?.hotel.name} isMobile={isMobile} />
      
      {/* Hotel Search Dialog */}
      <HotelSearchDialog
        key={dialogKey}
        isOpen={isHotelDialogOpen}
        onClose={() => setIsHotelDialogOpen(false)}
        onSelect={handleHotelSelect}
        locations={locations}
        isMultiCity={isMultiCity}
        itineraryStartDate={locations[0]?.startDate}
        itineraryEndDate={locations[0]?.endDate}
        itineraryDuration={itineraryDuration}
        wasCreatedWithLengthOfStay={wasCreatedWithLengthOfStay}
      />

      {/* Flight Search Dialog */}
      <EnhancedFlightSearchDialog
        isOpen={isFlightDialogOpen}
        onClose={() => setIsFlightDialogOpen(false)}
        onSelect={handleFlightSelect}
        locations={locations}
      />
      
      {/* SIMPLE EDIT MODAL - COMPLETELY NEW APPROACH */}
      {showEditModal && editingHotel && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
        >
          <div 
            className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit Hotel Details</h2>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setEditingHotel(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Hotel</label>
                <p className="text-sm text-gray-600">{editingHotel.hotel.name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Total Cost</label>
                <input 
                  type="text"
                  defaultValue={editingHotel.totalCost || ''}
                  placeholder="e.g., $500/night"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  id="totalCost"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Confirmation Number</label>
                <input 
                  type="text"
                  defaultValue={editingHotel.confirmationNumber || ''}
                  placeholder="Booking confirmation"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  id="confirmationNumber"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Room Type</label>
                <input 
                  type="text"
                  defaultValue={editingHotel.roomType || ''}
                  placeholder="e.g., Deluxe King"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  id="roomType"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Special Requests</label>
                <textarea 
                  defaultValue={editingHotel.specialRequests || ''}
                  placeholder="Any special requests..."
                  className="w-full p-2 border border-gray-300 rounded-md"
                  rows={2}
                  id="specialRequests"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea 
                  defaultValue={editingHotel.notes || ''}
                  placeholder="Personal notes..."
                  className="w-full p-2 border border-gray-300 rounded-md"
                  rows={2}
                  id="notes"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => {
                  // Get values from inputs
                  const totalCost = (document.getElementById('totalCost') as HTMLInputElement)?.value || '';
                  const confirmationNumber = (document.getElementById('confirmationNumber') as HTMLInputElement)?.value || '';
                  const roomType = (document.getElementById('roomType') as HTMLInputElement)?.value || '';
                  const specialRequests = (document.getElementById('specialRequests') as HTMLTextAreaElement)?.value || '';
                  const notes = (document.getElementById('notes') as HTMLTextAreaElement)?.value || '';
                  
                  console.log('Saving hotel updates:', { totalCost, confirmationNumber, roomType, specialRequests, notes });
                  
                  if (onUpdateHotel) {
                    onUpdateHotel(editingHotel.id, {
                      totalCost,
                      confirmationNumber,
                      roomType,
                      specialRequests,
                      notes
                    });
                  }
                  
                  setShowEditModal(false);
                  setEditingHotel(null);
                }}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
              >
                Save Changes
              </button>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setEditingHotel(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {content}
      {/* EDIT HOTEL DIALOG — always in the tree */}
      {editingHotel && (
        <HotelStayDetailsDialog
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingHotel(null);
          }}
          onConfirm={(stayDetails) => {
            if (onUpdateHotel) {
              onUpdateHotel(editingHotel.id, {
                checkIn: stayDetails.checkIn,
                checkOut: stayDetails.checkOut,
                guests: stayDetails.guests,
                rooms: stayDetails.rooms,
                roomType: stayDetails.roomType,
                confirmationNumber: stayDetails.confirmationNumber,
                totalCost: stayDetails.totalCost,
                specialRequests: stayDetails.specialRequests,
                notes: stayDetails.notes,
              });
            }
            setShowEditModal(false);
            setEditingHotel(null);
          }}
          hotel={editingHotel.hotel}
          checkInDate={editingHotel.checkIn ? new Date(editingHotel.checkIn) : undefined}
          checkOutDate={editingHotel.checkOut ? new Date(editingHotel.checkOut) : undefined}
          selectedLocation={editingHotel.location}
          isEditMode={true}
          existingBookingData={{
            guests: editingHotel.guests,
            rooms: editingHotel.rooms,
            roomType: editingHotel.roomType,
            specialRequests: editingHotel.specialRequests,
            confirmationNumber: editingHotel.confirmationNumber,
            totalCost: editingHotel.totalCost,
            notes: editingHotel.notes,
          }}
          wasCreatedWithLengthOfStay={wasCreatedWithLengthOfStay}
          itineraryDuration={itineraryDuration}
          itineraryStartDate={locations[0]?.startDate}
          itineraryEndDate={locations[locations.length - 1]?.endDate}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Hotel Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this hotel booking? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmId) {
                  onRemoveHotel(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}