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

export function ReservationWidget({ restaurant, className }: ReservationWidgetProps) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [partySize, setPartySize] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate time slots (6 PM - 10 PM in 30-minute intervals)
  const timeSlots = [
    '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', 
    '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM'
  ];

  // Generate party size options
  const partySizes = Array.from({ length: 12 }, (_, i) => i + 1);

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
      const { error } = await supabase
        .from('reservations')
        .insert({
          restaurant_id: restaurant.id,
          restaurant_name: restaurant.name,
          user_id: user.id,
          reservation_date: selectedDate.toISOString().split('T')[0], // Format as date
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
      <CardContent className="space-y-6">
        {/* Quick Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {restaurant.opentable_id && (
            <Button 
              onClick={handleOpenTableRedirect}
              className="flex items-center gap-2 flex-1"
            >
              <ExternalLink className="h-4 w-4" />
              Book on OpenTable
            </Button>
          )}
          
          {restaurant.phone_number && (
            <Button 
              onClick={handlePhoneCall}
              variant="outline"
              className="flex items-center gap-2 flex-1"
            >
              <Phone className="h-4 w-4" />
              Call Restaurant
            </Button>
          )}
        </div>

        {/* Reservation Form */}
        <div className="border-t pt-6">
          <h4 className="font-semibold mb-4">Or request a reservation</h4>
          
          <form onSubmit={handleReservationSubmit} className="space-y-4">
            {/* Date Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
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
                  <PopoverContent className="w-auto p-0" align="start">
                    <DatePicker
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time Selection */}
              <div className="space-y-2">
                <Label htmlFor="time">Time *</Label>
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
                <Label htmlFor="party-size">Party Size *</Label>
                <Select value={partySize} onValueChange={setPartySize}>
                  <SelectTrigger>
                    <Users className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="# of guests" />
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
            </div>

            {/* Customer Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Enter your phone number"
              />
            </div>

            {/* Special Requests */}
            <div className="space-y-2">
              <Label htmlFor="requests">Special Requests</Label>
              <Textarea
                id="requests"
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="Any special requests or dietary restrictions?"
                rows={3}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Request Reservation'}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground mt-4">
            * Reservation requests are sent to the restaurant for confirmation. 
            You will be contacted within 24 hours to confirm your reservation.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}