import { useState } from 'react';
import { Calendar, Clock, Users, Phone, Mail, User, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as DatePicker } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
interface Restaurant {
  id: string;
  name: string;
  phone_number?: string;
  website?: string;
  opentable_id?: string;
  resy_url?: string;
}
interface ReservationWidgetProps {
  restaurant: Restaurant;
  className?: string;
}
export function ReservationWidget({
  restaurant,
  className
}: ReservationWidgetProps) {
  const {
    user
  } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [partySize, setPartySize] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate time slots (6 PM - 10 PM in 30-minute intervals)
  const timeSlots = ['6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM'];

  // Generate party size options
  const partySizes = Array.from({
    length: 12
  }, (_, i) => i + 1);
  const handleReservationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !partySize || !customerName || !customerEmail) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!user) {
      toast.error('Please sign in to make a reservation');
      return;
    }
    setIsSubmitting(true);
    try {
      // Save reservation to database
      const {
        error
      } = await supabase.from('reservations').insert({
        restaurant_id: restaurant.id,
        restaurant_name: restaurant.name,
        user_id: user.id,
        reservation_date: selectedDate.toISOString().split('T')[0],
        // Format as date
        reservation_time: selectedTime,
        party_size: parseInt(partySize),
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        special_requests: specialRequests || null,
        status: 'pending'
      });
      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      toast.success('Reservation request sent! The restaurant will contact you to confirm.');

      // Reset form
      setSelectedDate(undefined);
      setSelectedTime('');
      setPartySize('');
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setSpecialRequests('');
    } catch (error: any) {
      console.error('Error submitting reservation:', error);
      toast.error('Failed to submit reservation: ' + (error.message || 'Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleOpenTableRedirect = () => {
    if (restaurant.opentable_id) {
      // Redirect to OpenTable with restaurant ID
      window.open(`https://www.opentable.com/r/${restaurant.opentable_id}`, '_blank');
    } else if (restaurant.website) {
      // Fallback to restaurant website
      window.open(restaurant.website, '_blank');
    } else {
      toast.info('Please call the restaurant directly to make a reservation');
    }
  };
  const handlePhoneCall = () => {
    if (restaurant.phone_number) {
      window.location.href = `tel:${restaurant.phone_number}`;
    } else {
      toast.info('Phone number not available');
    }
  };
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Make a Reservation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Action Buttons */}
        <div className="flex gap-2 mb-4">
          {restaurant.opentable_id && (
            <Button 
              onClick={handleOpenTableRedirect}
              className="flex-1 flex items-center gap-2"
              variant="outline"
            >
              <ExternalLink className="h-4 w-4" />
              OpenTable
            </Button>
          )}
          {restaurant.phone_number && (
            <Button 
              onClick={handlePhoneCall}
              className="flex-1 flex items-center gap-2"
              variant="outline"
            >
              <Phone className="h-4 w-4" />
              Call
            </Button>
          )}
        </div>

        {/* Reservation Form */}
        <form onSubmit={handleReservationSubmit} className="space-y-4">
          {/* Date Selection */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <DatePicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <Label htmlFor="time">Time</Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger>
                <Clock className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Party Size */}
          <div className="space-y-2">
            <Label htmlFor="party-size">Party Size</Label>
            <Select value={partySize} onValueChange={setPartySize}>
              <SelectTrigger>
                <Users className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Number of guests" />
              </SelectTrigger>
              <SelectContent>
                {partySizes.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size} {size === 1 ? 'guest' : 'guests'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Customer Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your full name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requests">Special Requests</Label>
              <Textarea
                id="requests"
                placeholder="Any dietary restrictions, special occasions, or other requests..."
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Request Reservation'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}