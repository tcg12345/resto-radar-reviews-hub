import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, differenceInCalendarDays, isAfter } from "date-fns";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  ArrowLeft, 
  Hotel, 
  Calendar as CalendarIcon, 
  MapPin, 
  X,
  Star
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";

interface HotelBooking {
  id: string;
  hotel: {
    id: string;
    name: string;
    address: string;
    rating?: number;
  };
  checkIn?: Date | string;
  checkOut?: Date | string;
  guests?: number;
  rooms?: number;
  roomType?: string;
  specialRequests?: string;
  confirmationNumber?: string;
  totalCost?: string;
  notes?: string;
}

export default function EditHotelBookingPage() {
  const navigate = useNavigate();
  const { bookingId } = useParams();
  const isMobile = useIsMobile();
  const [booking, setBooking] = useState<HotelBooking | null>(null);
  
  // Form state using Date objects like the original dialog
  const [checkIn, setCheckIn] = useState<Date | undefined>();
  const [checkOut, setCheckOut] = useState<Date | undefined>();
  const [guests, setGuests] = useState<number>(2);
  const [rooms, setRooms] = useState<number>(1);
  const [roomType, setRoomType] = useState<string>("");
  const [confirmationNumber, setConfirmationNumber] = useState<string>("");
  const [totalCost, setTotalCost] = useState<string>("");
  const [specialRequests, setSpecialRequests] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [openCI, setOpenCI] = useState(false);
  const [openCO, setOpenCO] = useState(false);

  useEffect(() => {
    // Load booking data from sessionStorage
    const storedData = sessionStorage.getItem('editingHotelBooking');
    if (storedData) {
      const bookingData = JSON.parse(storedData);
      setBooking(bookingData);
      
      // Set form state from booking data
      setCheckIn(bookingData.checkIn ? new Date(bookingData.checkIn) : undefined);
      setCheckOut(bookingData.checkOut ? new Date(bookingData.checkOut) : undefined);
      setGuests(bookingData.guests || 2);
      setRooms(bookingData.rooms || 1);
      setRoomType(bookingData.roomType || '');
      setSpecialRequests(bookingData.specialRequests || '');
      setConfirmationNumber(bookingData.confirmationNumber || '');
      setTotalCost(bookingData.totalCost || '');
      setNotes(bookingData.notes || '');
    }
  }, [bookingId]);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const diff = differenceInCalendarDays(checkOut, checkIn);
    return diff > 0 ? diff : 0;
  }, [checkIn, checkOut]);

  const ratingColor = (rating?: number) => {
    if (!rating) return "bg-muted text-foreground/80";
    if (rating >= 4.5) return "bg-blue-600/15 text-blue-200 border-blue-500/40";
    if (rating >= 4.0) return "bg-blue-600/10 text-blue-200 border-blue-500/30";
    return "bg-muted text-foreground/80";
  };

  const handleSave = () => {
    if (booking) {
      const updatedBooking = {
        ...booking,
        checkIn: checkIn,
        checkOut: checkOut,
        guests,
        rooms,
        roomType,
        specialRequests,
        confirmationNumber,
        totalCost,
        notes,
      };
      
      sessionStorage.setItem('updatedHotelBooking', JSON.stringify(updatedBooking));
    }
    
    navigate('/travel');
  };

  if (!booking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Hotel className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading booking details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
      {/* Top bar */}
      <div className="sticky top-0 z-10 px-6 pt-5 pb-4 bg-gradient-to-b from-background via-background to-background/80">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">Stay Details</h1>
            <p className="text-sm text-muted-foreground">
              Add details about your hotel stay
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-muted/30" onClick={() => navigate('/travel')}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="px-6 pb-24 pt-2 overflow-y-auto">
        {/* Hotel summary */}
        <Card className="mb-5 bg-muted/10 border-border/30 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2 min-w-0">
                <h3 className="text-xl font-extrabold leading-6">{booking.hotel.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="line-clamp-2">{booking.hotel.address}</span>
                </div>
              </div>
              {booking.hotel.rating && (
                <Badge className={cn("border px-3 py-1.5 text-sm font-semibold rounded-full", ratingColor(booking.hotel.rating))}>
                  <Star className="w-3.5 h-3.5 mr-1 fill-current" />
                  {booking.hotel.rating}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stay Dates */}
        <section className="mb-5 rounded-2xl border border-border/30 bg-muted/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CalendarIcon className="w-4 h-4 text-primary" />
            <h4 className="font-semibold">Stay Dates</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Check-in */}
            <div className="space-y-2">
              <Label>Check-in</Label>
              <Popover open={openCI} onOpenChange={setOpenCI}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !checkIn && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkIn ? format(checkIn, "PP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={checkIn}
                    onSelect={(d) => {
                      setCheckIn(d);
                      setOpenCI(false);
                      // auto-fix checkout if before/eq check-in
                      if (d && checkOut && !isAfter(checkOut, d)) setCheckOut(undefined);
                    }}
                    initialFocus
                    className="p-2 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Check-out */}
            <div className="space-y-2">
              <Label>Check-out</Label>
              <Popover open={openCO} onOpenChange={setOpenCO}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !checkOut && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkOut ? format(checkOut, "PP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={checkOut}
                    onSelect={(d) => {
                      setCheckOut(d);
                      setOpenCO(false);
                    }}
                    disabled={(date) => (checkIn ? !isAfter(date, checkIn) : false)}
                    initialFocus
                    className="p-2 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="mt-4">
            <div className="rounded-xl bg-muted/10 px-4 py-2 text-center text-muted-foreground font-medium">
              {nights > 0 ? `${nights} night${nights > 1 ? "s" : ""}` : "Select valid dates"}
            </div>
          </div>
        </section>

        {/* Room Details */}
        <section className="mb-5 rounded-2xl border border-border/30 bg-muted/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-primary">🛏️</span>
            <h4 className="font-semibold">Room Details</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Guests</Label>
              <Select value={String(guests)} onValueChange={(v) => setGuests(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Guests" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} Guest{n > 1 ? "s" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Rooms</Label>
              <Select value={String(rooms)} onValueChange={(v) => setRooms(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Rooms" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} Room{n > 1 ? "s" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Room Type (Optional)</Label>
              <Input
                placeholder="Standard, Deluxe, Suite..."
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Booking Information */}
        <section className="mb-5 rounded-2xl border border-border/30 bg-muted/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-primary">🕒</span>
            <h4 className="font-semibold">Booking Information</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Confirmation Number</Label>
              <Input
                placeholder="ABC123456"
                value={confirmationNumber}
                onChange={(e) => setConfirmationNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Total Cost</Label>
              <Input placeholder="$500" value={totalCost} onChange={(e) => setTotalCost(e.target.value)} />
            </div>
          </div>
        </section>

        {/* Additional Information */}
        <section className="mb-2 rounded-2xl border border-border/30 bg-muted/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-primary">🍹</span>
            <h4 className="font-semibold">Additional Information</h4>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Special Requests</Label>
              <Input
                placeholder="Late check-in, room preferences, accessibility needs..."
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                placeholder="Any additional notes about your stay..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </section>
      </div>

      {/* Sticky footer */}
      <div className="pointer-events-auto sticky bottom-0 z-10 bg-gradient-to-t from-background via-background to-background/60 px-6 py-4 border-t border-border/30">
        <div className={cn("flex gap-3", isMobile ? "flex-col-reverse" : "")}>
          <Button
            variant="outline"
            className={cn("h-11 w-full", !isMobile && "max-w-[220px]")}
            onClick={() => navigate('/travel')}
          >
            Cancel
          </Button>
          <Button
            className="h-11 w-full"
            onClick={handleSave}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}