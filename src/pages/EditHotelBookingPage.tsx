import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Hotel, Calendar, Users, DollarSign, FileText } from 'lucide-react';

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
    // Load booking data from sessionStorage or API
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
      // Store updated data back to sessionStorage
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
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/travel')}
              className="shrink-0"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Trip
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Edit Hotel Booking</h1>
              <p className="text-muted-foreground">{booking.hotel.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Hotel Summary */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hotel className="w-5 h-5" />
                  Hotel Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h3 className="font-semibold">{booking.hotel.name}</h3>
                  <p className="text-sm text-muted-foreground">{booking.hotel.address}</p>
                </div>
                {booking.hotel.rating && (
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium">Rating:</span>
                    <span className="text-sm">⭐ {booking.hotel.rating}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Edit Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Booking Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Dates */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="checkIn" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Check-in Date
                    </Label>
                    <Input
                      id="checkIn"
                      type="date"
                      value={editForm.checkIn}
                      onChange={(e) => setEditForm(f => ({ ...f, checkIn: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="checkOut" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Check-out Date
                    </Label>
                    <Input
                      id="checkOut"
                      type="date"
                      value={editForm.checkOut}
                      onChange={(e) => setEditForm(f => ({ ...f, checkOut: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Guests & Rooms */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="guests" className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Guests
                    </Label>
                    <Input
                      id="guests"
                      type="number"
                      min="1"
                      value={editForm.guests}
                      onChange={(e) => setEditForm(f => ({ ...f, guests: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rooms">Rooms</Label>
                    <Input
                      id="rooms"
                      type="number"
                      min="1"
                      value={editForm.rooms}
                      onChange={(e) => setEditForm(f => ({ ...f, rooms: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                </div>

                {/* Room Type */}
                <div className="space-y-2">
                  <Label htmlFor="roomType">Room Type</Label>
                  <Input
                    id="roomType"
                    value={editForm.roomType}
                    onChange={(e) => setEditForm(f => ({ ...f, roomType: e.target.value }))}
                    placeholder="e.g., Deluxe King, Ocean View Suite"
                  />
                </div>

                {/* Financial Details */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="totalCost" className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Total Cost
                    </Label>
                    <Input
                      id="totalCost"
                      value={editForm.totalCost}
                      onChange={(e) => setEditForm(f => ({ ...f, totalCost: e.target.value }))}
                      placeholder="e.g., $500/night or $1,500 total"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmationNumber">Confirmation Number</Label>
                    <Input
                      id="confirmationNumber"
                      value={editForm.confirmationNumber}
                      onChange={(e) => setEditForm(f => ({ ...f, confirmationNumber: e.target.value }))}
                      placeholder="Booking confirmation"
                    />
                  </div>
                </div>

                {/* Special Requests */}
                <div className="space-y-2">
                  <Label htmlFor="specialRequests">Special Requests</Label>
                  <Input
                    id="specialRequests"
                    value={editForm.specialRequests}
                    onChange={(e) => setEditForm(f => ({ ...f, specialRequests: e.target.value }))}
                    placeholder="e.g., Late check-in, high floor, quiet room"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Personal Notes
                  </Label>
                  <textarea
                    id="notes"
                    value={editForm.notes}
                    onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Any personal notes about this booking..."
                    className="w-full px-3 py-2 border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    rows={3}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button onClick={handleSave} className="flex-1">
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/travel')}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}