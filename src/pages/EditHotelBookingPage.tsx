import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Hotel, 
  Calendar, 
  Users, 
  MapPin, 
  X,
  Bed,
  Star
} from 'lucide-react';

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
  const [booking, setBooking] = useState<HotelBooking | null>(null);
  const [editForm, setEditForm] = useState({
    checkIn: '',
    checkOut: '',
    guests: 2,
    rooms: 1,
    roomType: '',
    specialRequests: '',
    confirmationNumber: '',
    totalCost: '',
    notes: '',
  });

  useEffect(() => {
    // Load booking data from sessionStorage
    const storedData = sessionStorage.getItem('editingHotelBooking');
    if (storedData) {
      const bookingData = JSON.parse(storedData);
      setBooking(bookingData);
      setEditForm({
        checkIn: bookingData.checkIn ? new Date(bookingData.checkIn).toISOString().split('T')[0] : '',
        checkOut: bookingData.checkOut ? new Date(bookingData.checkOut).toISOString().split('T')[0] : '',
        guests: bookingData.guests || 2,
        rooms: bookingData.rooms || 1,
        roomType: bookingData.roomType || '',
        specialRequests: bookingData.specialRequests || '',
        confirmationNumber: bookingData.confirmationNumber || '',
        totalCost: bookingData.totalCost || '',
        notes: bookingData.notes || '',
      });
    }
  }, [bookingId]);

  const handleSave = () => {
    if (booking) {
      const updatedBooking = {
        ...booking,
        checkIn: editForm.checkIn ? new Date(editForm.checkIn) : undefined,
        checkOut: editForm.checkOut ? new Date(editForm.checkOut) : undefined,
        guests: editForm.guests,
        rooms: editForm.rooms,
        roomType: editForm.roomType,
        specialRequests: editForm.specialRequests,
        confirmationNumber: editForm.confirmationNumber,
        totalCost: editForm.totalCost,
        notes: editForm.notes,
      };
      
      sessionStorage.setItem('updatedHotelBooking', JSON.stringify(updatedBooking));
    }
    
    navigate('/travel');
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: '2-digit', 
      year: 'numeric' 
    });
  };

  const calculateNights = () => {
    if (!editForm.checkIn || !editForm.checkOut) return 0;
    const checkIn = new Date(editForm.checkIn);
    const checkOut = new Date(editForm.checkOut);
    return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
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
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-background via-background to-background/95 px-6 pt-5 pb-4">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/travel')}
            className="h-8 w-8 p-0 rounded-full"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/travel')}
            className="h-8 w-8 p-0 rounded-full"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight mb-2">Stay Details</h1>
          <p className="text-muted-foreground text-sm">Add details about your hotel stay</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-32">
        {/* Hotel Summary */}
        <Card className="border border-border/20 bg-gradient-to-br from-background via-background to-accent/5 shadow-lg rounded-2xl overflow-hidden mb-8">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                  <Hotel className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg leading-tight tracking-tight mb-1">
                    {booking.hotel.name}
                  </h3>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span className="leading-relaxed">{booking.hotel.address}</span>
                  </div>
                  {booking.hotel.rating && (
                    <Badge variant="secondary" className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/30">
                      <Star className="w-3 h-3 fill-current mr-1" />
                      {booking.hotel.rating}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stay Dates Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold">Stay Dates</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-muted-foreground">Check-in</Label>
              <div className="space-y-2">
                <Input
                  type="date"
                  value={editForm.checkIn}
                  onChange={(e) => setEditForm(f => ({ ...f, checkIn: e.target.value }))}
                  className="text-base"
                />
                {editForm.checkIn && (
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="w-4 h-4" />
                    {formatDate(editForm.checkIn)}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-muted-foreground">Check-out</Label>
              <div className="space-y-2">
                <Input
                  type="date"
                  value={editForm.checkOut}
                  onChange={(e) => setEditForm(f => ({ ...f, checkOut: e.target.value }))}
                  className="text-base"
                />
                {editForm.checkOut && (
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="w-4 h-4" />
                    {formatDate(editForm.checkOut)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {calculateNights() > 0 && (
            <div className="text-center py-4">
              <span className="text-lg font-semibold text-muted-foreground">
                {calculateNights()} night{calculateNights() !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Room Details Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Bed className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-xl font-bold">Room Details</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-muted-foreground">Guests</Label>
              <Input
                type="number"
                min="1"
                value={editForm.guests}
                onChange={(e) => setEditForm(f => ({ ...f, guests: parseInt(e.target.value) || 1 }))}
                className="text-base"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-muted-foreground">Rooms</Label>
              <Input
                type="number"
                min="1"
                value={editForm.rooms}
                onChange={(e) => setEditForm(f => ({ ...f, rooms: parseInt(e.target.value) || 1 }))}
                className="text-base"
              />
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <Label className="text-sm font-medium text-muted-foreground">Room Type</Label>
            <Input
              value={editForm.roomType}
              onChange={(e) => setEditForm(f => ({ ...f, roomType: e.target.value }))}
              placeholder="e.g., Deluxe King, Ocean View Suite"
              className="text-base"
            />
          </div>
        </div>

        {/* Booking Information Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Booking Information</h3>
          
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-muted-foreground">Total Cost</Label>
              <Input
                value={editForm.totalCost}
                onChange={(e) => setEditForm(f => ({ ...f, totalCost: e.target.value }))}
                placeholder="e.g., $500/night or $1,500 total"
                className="text-base"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-muted-foreground">Confirmation Number</Label>
              <Input
                value={editForm.confirmationNumber}
                onChange={(e) => setEditForm(f => ({ ...f, confirmationNumber: e.target.value }))}
                placeholder="Booking confirmation"
                className="text-base"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-muted-foreground">Special Requests</Label>
              <Input
                value={editForm.specialRequests}
                onChange={(e) => setEditForm(f => ({ ...f, specialRequests: e.target.value }))}
                placeholder="e.g., Late check-in, high floor"
                className="text-base"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-muted-foreground">Personal Notes</Label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any personal notes about this booking..."
                className="w-full px-3 py-2 border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring text-base"
                rows={3}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-background border-t border-border/20">
        <div className="flex gap-3 max-w-md mx-auto">
          <Button
            variant="outline"
            onClick={() => navigate('/travel')}
            className="flex-1 h-12 text-base"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 h-12 text-base bg-blue-600 hover:bg-blue-700"
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}