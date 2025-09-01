import { useState } from 'react';
import { Mail, User, MessageSquare, Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HotelEmailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  hotel: {
    name: string;
    email?: string;
    address: string;
    stayDetails?: {
      checkIn?: string | Date;
      checkOut?: string | Date;
      guests?: number;
    };
  };
}

export function HotelEmailDialog({ isOpen, onClose, hotel }: HotelEmailDialogProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSendEmail = async () => {
    if (!customerName.trim() || !customerEmail.trim() || !subject.trim() || !message.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (!hotel.email) {
      toast({
        title: "Hotel Email Not Available",
        description: "The hotel's email address is not available at the moment.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.functions.invoke('send-hotel-email', {
        body: {
          hotelName: hotel.name,
          hotelEmail: hotel.email,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          subject: subject.trim(),
          message: message.trim(),
          hotelAddress: hotel.address,
          checkInDate: hotel.stayDetails?.checkIn,
          checkOutDate: hotel.stayDetails?.checkOut,
          guests: hotel.stayDetails?.guests,
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Email Sent Successfully!",
        description: `Your message has been sent to ${hotel.name}. You'll receive a confirmation email shortly.`,
      });

      // Reset form
      setCustomerName('');
      setCustomerEmail('');
      setSubject('');
      setMessage('');
      onClose();
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: "Failed to Send Email",
        description: error.message || "There was an error sending your email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Contact {hotel.name}
          </DialogTitle>
          <DialogDescription>
            Send an email inquiry directly to the hotel. They will respond to your email address.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Customer Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="w-4 h-4" />
              Your Information
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label htmlFor="customerName">Your Name *</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter your full name"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="customerEmail">Your Email *</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Stay Details (if available) */}
          {hotel.stayDetails && (hotel.stayDetails.checkIn || hotel.stayDetails.checkOut || hotel.stayDetails.guests) && (
            <div className="bg-muted/30 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="w-4 h-4" />
                Your Stay Details
              </div>
              {hotel.stayDetails.checkIn && (
                <p className="text-sm text-muted-foreground">
                  Check-in: {new Date(hotel.stayDetails.checkIn).toLocaleDateString()}
                </p>
              )}
              {hotel.stayDetails.checkOut && (
                <p className="text-sm text-muted-foreground">
                  Check-out: {new Date(hotel.stayDetails.checkOut).toLocaleDateString()}
                </p>
              )}
              {hotel.stayDetails.guests && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {hotel.stayDetails.guests} guest{hotel.stayDetails.guests !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          {/* Message */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MessageSquare className="w-4 h-4" />
              Your Message
            </div>
            
            <div>
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Room inquiry, Special request, etc."
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message to the hotel..."
                rows={5}
                className="mt-1 resize-none"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSendEmail} disabled={isLoading}>
            {isLoading ? "Sending..." : "Send Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}