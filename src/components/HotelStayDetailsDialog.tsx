import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, MapPin, Users, Clock, Bed, Car, Coffee, X, ArrowLeft, Star, Hotel, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Hotel as HotelType } from '@/hooks/useGooglePlacesHotelSearch';

interface TripLocation {
  id: string;
  name: string;
  country: string;
  state?: string;
  startDate?: Date;
  endDate?: Date;
}

interface HotelStayDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stayDetails: StayDetails) => void;
  hotel: HotelType;
  checkInDate?: Date;
  checkOutDate?: Date;
  selectedLocation?: string;
  existingBookingData?: {
    guests?: number;
    rooms?: number;
    roomType?: string;
    specialRequests?: string;
    confirmationNumber?: string;
    totalCost?: string;
    notes?: string;
  };
  isEditMode?: boolean;
  // New props for itinerary context
  itineraryStartDate?: Date;
  itineraryEndDate?: Date;
  itineraryDuration?: number; // Total days of the itinerary
  wasCreatedWithLengthOfStay?: boolean; // Flag to determine if we should use day selectors
}

export interface StayDetails {
  hotel: HotelType;
  checkIn?: Date;
  checkOut?: Date;
  guests: number;
  rooms: number;
  roomType?: string;
  specialRequests?: string;
  confirmationNumber?: string;
  totalCost?: string;
  notes?: string;
  location?: string;
}

export function HotelStayDetailsDialog({
  isOpen,
  onClose,
  onConfirm,
  hotel,
  checkInDate,
  checkOutDate,
  selectedLocation,
  existingBookingData,
  isEditMode = false,
  itineraryStartDate,
  itineraryEndDate,
  itineraryDuration,
  wasCreatedWithLengthOfStay = false
}: HotelStayDetailsDialogProps) {
  const isMobile = useIsMobile();
  
  // Form state
  const [checkIn, setCheckIn] = useState<Date | undefined>(checkInDate || undefined);
  const [checkOut, setCheckOut] = useState<Date | undefined>(checkOutDate || undefined);
  const [guests, setGuests] = useState(existingBookingData?.guests || 2);
  const [rooms, setRooms] = useState(existingBookingData?.rooms || 1);
  const [roomType, setRoomType] = useState(existingBookingData?.roomType || '');
  const [specialRequests, setSpecialRequests] = useState(existingBookingData?.specialRequests || '');
  const [confirmationNumber, setConfirmationNumber] = useState(existingBookingData?.confirmationNumber || '');
  const [totalCost, setTotalCost] = useState(existingBookingData?.totalCost || '');
  const [notes, setNotes] = useState(existingBookingData?.notes || '');

  // Calendar states
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);

  // Day-based selection for itineraries with length of stay
  const [checkInDay, setCheckInDay] = useState(1);
  const [checkOutDay, setCheckOutDay] = useState(2);

  // Reset form when dialog opens/closes or hotel changes
  useEffect(() => {
    if (isOpen) {
      setCheckIn(checkInDate || undefined);
      setCheckOut(checkOutDate || undefined);
      setGuests(existingBookingData?.guests || 2);
      setRooms(existingBookingData?.rooms || 1);
      setRoomType(existingBookingData?.roomType || '');
      setSpecialRequests(existingBookingData?.specialRequests || '');
      setConfirmationNumber(existingBookingData?.confirmationNumber || '');
      setTotalCost(existingBookingData?.totalCost || '');
      setNotes(existingBookingData?.notes || '');
    }
  }, [isOpen, hotel.id, checkInDate, checkOutDate, existingBookingData]);

  const handleClose = () => {
    onClose();
  };

  const handleCheckInSelect = (date: Date | undefined) => {
    setCheckIn(date);
    setIsCheckInOpen(false);
    
    // If check-out is before or same as new check-in, adjust it
    if (date && checkOut && checkOut <= date) {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      setCheckOut(nextDay);
    }
  };

  const handleCheckOutSelect = (date: Date | undefined) => {
    setCheckOut(date);
    setIsCheckOutOpen(false);
  };

  const handleConfirm = () => {
    // Validation
    if (wasCreatedWithLengthOfStay) {
      // For day-based selection, we don't need to validate specific dates
    } else {
      if (!checkIn || !checkOut) {
        toast.error('Please select both check-in and check-out dates');
        return;
      }
      
      if (checkOut <= checkIn) {
        toast.error('Check-out date must be after check-in date');
        return;
      }

      // Validate dates are within itinerary range if provided
      if (!validateDateRange()) {
        return;
      }
    }

    const stayDetails: StayDetails = {
      hotel,
      checkIn: wasCreatedWithLengthOfStay ? undefined : checkIn,
      checkOut: wasCreatedWithLengthOfStay ? undefined : checkOut,
      guests,
      rooms,
      roomType: roomType.trim() || undefined,
      specialRequests: specialRequests.trim() || undefined,
      confirmationNumber: confirmationNumber.trim() || undefined,
      totalCost: totalCost.trim() || undefined,
      notes: notes.trim() || undefined,
      location: selectedLocation
    };

    onConfirm(stayDetails);
    handleClose();
  };

  const validateDateRange = (): boolean => {
    if (!itineraryStartDate || !itineraryEndDate || !checkIn || !checkOut) {
      return true; // No validation needed if dates aren't provided
    }
    
    if (checkIn < itineraryStartDate || checkIn > itineraryEndDate) {
      toast.error('Check-in date must be within the itinerary date range');
      return false;
    }
    if (checkOut < itineraryStartDate || checkOut > itineraryEndDate) {
      toast.error('Check-out date must be within the itinerary date range');
      return false;
    }
    return true;
  };

  const formContent = (
    <div className="space-y-4">
      {/* Hotel Info Section */}
      <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Hotel className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">HOTEL</h3>
            <p className="text-sm text-muted-foreground">Booking details</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="bg-background/60 rounded-xl p-4 border border-border/30">
            <h4 className="font-bold text-foreground text-lg mb-2">{hotel.name}</h4>
            <p className="text-sm text-muted-foreground mb-3">{hotel.address}</p>
            {hotel.rating && (
              <div className="inline-flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-lg">
                <Star className="w-4 h-4 fill-current text-primary" />
                <span className="font-semibold text-sm text-primary">{hotel.rating}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dates Section */}
      <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500/10 rounded-xl">
            <Calendar className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">DATE</h3>
            <p className="text-sm text-muted-foreground">Stay period</p>
          </div>
        </div>

        {wasCreatedWithLengthOfStay ? (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Number of Nights</div>
              <Select value={(checkOutDay - checkInDay).toString()} onValueChange={(value) => {
                const nights = parseInt(value);
                setCheckOutDay(checkInDay + nights);
              }}>
                <SelectTrigger className="h-14 bg-background/60 border-border/30 rounded-xl text-left">
                  <SelectValue placeholder="Select number of nights" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: Math.max(1, (itineraryDuration || 7) - checkInDay + 1) }, (_, i) => i + 1).map((nights) => (
                    <SelectItem key={nights} value={nights.toString()}>
                      {nights} night{nights > 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Starting Day</div>
              <Select value={checkInDay.toString()} onValueChange={(value) => {
                const day = parseInt(value);
                setCheckInDay(day);
                // Keep the same number of nights, but adjust if it goes beyond itinerary duration
                const currentNights = checkOutDay - checkInDay;
                const newCheckOut = day + currentNights;
                if (newCheckOut <= (itineraryDuration || 7)) {
                  setCheckOutDay(newCheckOut);
                } else {
                  setCheckOutDay(day + 1); // Default to 1 night if it would exceed duration
                }
              }}>
                <SelectTrigger className="h-14 bg-background/60 border-border/30 rounded-xl text-left">
                  <SelectValue placeholder="Select starting day" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: itineraryDuration || 7 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      Day {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Check-in</div>
              <Popover open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-14 w-full justify-start text-left font-normal bg-background/60 border-border/30 rounded-xl hover:bg-background/80"
                  >
                    <Calendar className="mr-3 h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {checkIn ? format(checkIn, "MMM dd, yyyy") : "Choose check-in date"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={checkIn}
                    onSelect={handleCheckInSelect}
                    initialFocus
                    disabled={(date) => {
                      const startDate = itineraryStartDate ? new Date(itineraryStartDate) : null;
                      const endDate = itineraryEndDate ? new Date(itineraryEndDate) : null;
                      if (startDate && date < startDate) return true;
                      if (endDate && date > endDate) return true;
                      return false;
                    }}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Check-out</div>
              <Popover open={isCheckOutOpen} onOpenChange={setIsCheckOutOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-14 w-full justify-start text-left font-normal bg-background/60 border-border/30 rounded-xl hover:bg-background/80"
                  >
                    <Calendar className="mr-3 h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {checkOut ? format(checkOut, "MMM dd, yyyy") : "Choose check-out date"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={checkOut}
                    onSelect={handleCheckOutSelect}
                    initialFocus
                    disabled={(date) => {
                      if (!checkIn) return true;
                      if (date <= checkIn) return true;
                      const startDate = itineraryStartDate ? new Date(itineraryStartDate) : null;
                      const endDate = itineraryEndDate ? new Date(itineraryEndDate) : null;
                      if (startDate && date < startDate) return true;
                      if (endDate && date > endDate) return true;
                      return false;
                    }}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}
      </div>

      {/* Guests Section */}
      <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-500/10 rounded-xl">
            <Users className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">GUESTS</h3>
            <p className="text-sm text-muted-foreground">Number of guests</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Guests</div>
            <Select value={guests.toString()} onValueChange={(value) => setGuests(parseInt(value))}>
              <SelectTrigger className="h-14 bg-background/60 border-border/30 rounded-xl text-left">
                <SelectValue placeholder="Number of guests" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} guest{num > 1 ? 's' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Rooms</div>
            <Select value={rooms.toString()} onValueChange={(value) => setRooms(parseInt(value))}>
              <SelectTrigger className="h-14 bg-background/60 border-border/30 rounded-xl text-left">
                <SelectValue placeholder="Number of rooms" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} room{num > 1 ? 's' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Additional Details Section */}
      <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-500/10 rounded-xl">
            <FileText className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">DETAILS</h3>
            <p className="text-sm text-muted-foreground">Booking information</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Room Type</div>
            <Input
              placeholder="e.g., Deluxe King, Suite..."
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              className="h-14 bg-background/60 border-border/30 rounded-xl placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Total Cost</div>
            <Input
              placeholder="e.g., $200/night, $800 total..."
              value={totalCost}
              onChange={(e) => setTotalCost(e.target.value)}
              className="h-14 bg-background/60 border-border/30 rounded-xl placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Confirmation Number</div>
            <Input
              placeholder="Booking confirmation number..."
              value={confirmationNumber}
              onChange={(e) => setConfirmationNumber(e.target.value)}
              className="h-14 bg-background/60 border-border/30 rounded-xl placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Notes</div>
            <Textarea
              placeholder="Special requests, notes, or additional information..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px] bg-background/60 border-border/30 rounded-xl placeholder:text-muted-foreground/60 resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={handleClose}>
        <DrawerContent className="h-[80vh] bg-background border-border">
          <div className="flex flex-col h-[80vh]">
            {/* Header - matching flight search style */}
            <div className="flex items-center justify-between p-4 pb-3">
              <div className="space-y-1">
                 <DrawerTitle className="text-xl font-bold text-foreground">{isEditMode ? '✏️ Edit Stay Details' : '🏨 Stay Details'}</DrawerTitle>
                 <div className="text-sm text-muted-foreground font-medium">
                   {isEditMode ? 'Update your hotel booking information' : 'Add details about your hotel stay'}
                 </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Scrollable Content - matching flight search background */}
            <div className="flex-1 overflow-y-auto min-h-0 bg-[#0A0A0A]">
              <div className="px-4 pt-4 pb-24 space-y-6">
                {formContent}
              </div>
            </div>

            {/* Action Buttons - Fixed at bottom matching flight search style */}
            <div className="p-4 bg-background border-t border-border">
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                 <Button 
                   onClick={handleConfirm}
                   className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
                 >
                   {isEditMode ? 'Save Changes' : 'Add to Itinerary'}
                 </Button>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose} modal>
      <DialogContent className="sm:max-w-[600px] h-[85vh] flex flex-col z-[9999] fixed bg-background" style={{ zIndex: 9999 }}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEditMode ? 'Edit Stay Details' : 'Stay Details'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update your hotel booking information' : 'Add details about your hotel stay'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2">
          {formContent}
        </div>
        
        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="flex-1">
            {isEditMode ? 'Save Changes' : 'Add to Itinerary'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}