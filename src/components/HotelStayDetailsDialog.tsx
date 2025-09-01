import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, MapPin, Users, Clock, Bed, Car, Coffee, X, ArrowLeft } from 'lucide-react';
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
}

export interface StayDetails {
  hotel: HotelType;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  rooms: number;
  roomType?: string;
  specialRequests?: string;
  confirmationNumber?: string;
  totalCost?: string;
  notes?: string;
}

export function HotelStayDetailsDialog({
  isOpen,
  onClose,
  onConfirm,
  hotel,
  checkInDate,
  checkOutDate,
  selectedLocation
}: HotelStayDetailsDialogProps) {
  const [checkIn, setCheckIn] = useState<Date>(checkInDate || new Date());
  const [checkOut, setCheckOut] = useState<Date>(checkOutDate || new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);
  const [roomType, setRoomType] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [notes, setNotes] = useState('');
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);

  const isMobile = useIsMobile();

  const handleConfirm = () => {
    if (!checkIn || !checkOut) {
      toast.error('Please select check-in and check-out dates');
      return;
    }

    if (checkOut <= checkIn) {
      toast.error('Check-out date must be after check-in date');
      return;
    }

    const stayDetails: StayDetails = {
      hotel,
      checkIn,
      checkOut,
      guests,
      rooms,
      roomType: roomType || undefined,
      specialRequests: specialRequests || undefined,
      confirmationNumber: confirmationNumber || undefined,
      totalCost: totalCost || undefined,
      notes: notes || undefined,
    };

    onConfirm(stayDetails);
    toast.success('Hotel stay added to your itinerary!');
    handleClose();
  };

  const handleClose = () => {
    setCheckIn(checkInDate || new Date());
    setCheckOut(checkOutDate || new Date(Date.now() + 24 * 60 * 60 * 1000));
    setGuests(2);
    setRooms(1);
    setRoomType('');
    setSpecialRequests('');
    setConfirmationNumber('');
    setTotalCost('');
    setNotes('');
    onClose();
  };

  const handleCheckInSelect = (date: Date | undefined) => {
    if (date) {
      setCheckIn(date);
      setIsCheckInOpen(false);
      // If check-out is before or equal to check-in, adjust it
      if (checkOut <= date) {
        setCheckOut(new Date(date.getTime() + 24 * 60 * 60 * 1000));
      }
    }
  };

  const handleCheckOutSelect = (date: Date | undefined) => {
    if (date) {
      setCheckOut(date);
      setIsCheckOutOpen(false);
    }
  };

  const nights = checkIn && checkOut ? Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  const formContent = (
    <div className="space-y-6">
      {/* Hotel Summary */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{hotel.name}</CardTitle>
              <CardDescription className="flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />
                {hotel.address}
              </CardDescription>
            </div>
            {hotel.rating && (
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                ⭐ {hotel.rating}
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Dates */}
      <Card className="p-4 bg-muted/5 border-muted/20 shadow-sm">
        <div className="space-y-4">
          <Label className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Calendar className="w-4 h-4 text-primary" />
            Stay Dates
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-medium">Check-in</Label>
              <Popover open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-background border-border/30",
                      !checkIn && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-3 w-3" />
                    {checkIn ? format(checkIn, "MMM dd, yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={checkIn}
                    onSelect={handleCheckInSelect}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-medium">Check-out</Label>
              <Popover open={isCheckOutOpen} onOpenChange={setIsCheckOutOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-background border-border/30",
                      !checkOut && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-3 w-3" />
                    {checkOut ? format(checkOut, "MMM dd, yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={checkOut}
                    onSelect={handleCheckOutSelect}
                    initialFocus
                    disabled={(date) => checkIn ? date <= checkIn : false}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {nights > 0 && (
            <div className="text-sm text-muted-foreground bg-primary/5 rounded-lg p-2 text-center">
              {nights} night{nights !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </Card>

      {/* Room Details */}
      <Card className="p-4 bg-muted/5 border-muted/20 shadow-sm">
        <div className="space-y-4">
          <Label className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Bed className="w-4 h-4 text-primary" />
            Room Details
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-medium">Guests</Label>
              <Select value={guests.toString()} onValueChange={(value) => setGuests(parseInt(value))}>
                <SelectTrigger className="bg-background border-border/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} Guest{num !== 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-medium">Rooms</Label>
              <Select value={rooms.toString()} onValueChange={(value) => setRooms(parseInt(value))}>
                <SelectTrigger className="bg-background border-border/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} Room{num !== 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground font-medium">Room Type (Optional)</Label>
            <Input
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              placeholder="Standard, Deluxe, Suite..."
              className="bg-background border-border/30"
            />
          </div>
        </div>
      </Card>

      {/* Booking Information */}
      <Card className="p-4 bg-muted/5 border-muted/20 shadow-sm">
        <div className="space-y-4">
          <Label className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Clock className="w-4 h-4 text-primary" />
            Booking Information
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-medium">Confirmation Number</Label>
              <Input
                value={confirmationNumber}
                onChange={(e) => setConfirmationNumber(e.target.value)}
                placeholder="ABC123456"
                className="bg-background border-border/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-medium">Total Cost</Label>
              <Input
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
                placeholder="$500"
                className="bg-background border-border/30"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Additional Information */}
      <Card className="p-4 bg-muted/5 border-muted/20 shadow-sm">
        <div className="space-y-4">
          <Label className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Coffee className="w-4 h-4 text-primary" />
            Additional Information
          </Label>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-medium">Special Requests</Label>
              <Textarea
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="Late check-in, room preferences, accessibility needs..."
                rows={2}
                className="bg-background border-border/30 resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-medium">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes about your stay..."
                rows={2}
                className="bg-background border-border/30 resize-none"
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={handleClose}>
        <DrawerContent className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-0">
          <div className="w-full h-[90vh] flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-gradient-to-b from-background via-background to-background/95 px-6 pt-5 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="space-y-1">
                  <DrawerTitle className="text-xl font-bold text-foreground">Stay Details</DrawerTitle>
                  <DrawerDescription className="text-sm text-muted-foreground font-medium">
                    Add details about your hotel stay
                  </DrawerDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8 rounded-full bg-muted/30 hover:bg-muted/50">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6">
              {formContent}
            </div>

            {/* Sticky Bottom Actions */}
            <div className="sticky bottom-0 bg-gradient-to-t from-background via-background to-background/95 p-6 border-t border-border/20">
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleConfirm}
                  className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
                >
                  Add to Itinerary
                </Button>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Stay Details</DialogTitle>
          <DialogDescription>
            Add details about your hotel stay
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          {formContent}
        </div>

        <div className="flex gap-3 pt-4 border-t border-border/20">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
          >
            Add to Itinerary
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}