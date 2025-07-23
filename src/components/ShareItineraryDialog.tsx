import { useState } from 'react';
import { Share2, Copy, Mail, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Itinerary } from '@/components/ItineraryBuilder';

interface ShareItineraryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itinerary: Itinerary | null;
}

export function ShareItineraryDialog({ isOpen, onClose, itinerary }: ShareItineraryDialogProps) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  if (!itinerary) return null;

  const generateShareText = () => {
    const startDate = format(itinerary.startDate, 'MMMM do, yyyy');
    const endDate = format(itinerary.endDate, 'MMMM do, yyyy');
    
    let shareText = `🗓️ ${itinerary.title}\n`;
    shareText += `📅 ${startDate} - ${endDate}\n\n`;
    
    if (itinerary.events.length > 0) {
      const eventsByDate = itinerary.events.reduce((acc, event) => {
        if (!acc[event.date]) acc[event.date] = [];
        acc[event.date].push(event);
        return acc;
      }, {} as Record<string, typeof itinerary.events>);

      Object.entries(eventsByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([date, events]) => {
          const formattedDate = format(new Date(date), 'EEEE, MMMM do');
          shareText += `📍 ${formattedDate}\n`;
          
          events
            .sort((a, b) => a.time.localeCompare(b.time))
            .forEach(event => {
              shareText += `   ${event.time} - ${event.title}`;
              if (event.restaurantData) {
                shareText += ` 🍽️\n   📍 ${event.restaurantData.address}`;
              }
              shareText += '\n';
            });
          shareText += '\n';
        });
    }
    
    return shareText;
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateShareText());
      toast.success('Itinerary copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Trip Itinerary: ${itinerary.title}`);
    const body = encodeURIComponent(
      (message ? message + '\n\n' : '') + generateShareText()
    );
    const mailto = `mailto:${email}?subject=${subject}&body=${body}`;
    
    window.open(mailto, '_blank');
    toast.success('Email app opened');
  };

  const handleSMSShare = () => {
    const text = encodeURIComponent(
      (message ? message + '\n\n' : '') + generateShareText()
    );
    const sms = `sms:?body=${text}`;
    
    window.open(sms, '_blank');
    toast.success('SMS app opened');
  };

  const handleSocialShare = () => {
    if (navigator.share) {
      navigator.share({
        title: itinerary.title,
        text: generateShareText(),
      }).catch(error => {
        console.error('Error sharing:', error);
        handleCopyToClipboard();
      });
    } else {
      handleCopyToClipboard();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Itinerary
          </DialogTitle>
          <DialogDescription>
            Share your trip itinerary with friends and family
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview</CardTitle>
              <CardDescription>
                This is how your itinerary will look when shared
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg">
                <pre className="text-sm whitespace-pre-wrap font-sans text-foreground">
                  {generateShareText()}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Share Options */}
          <div className="space-y-4">
            <h3 className="font-medium">Share Options</h3>
            
            {/* Quick Share Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleCopyToClipboard}
                className="flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy to Clipboard
              </Button>
              <Button
                variant="outline"
                onClick={handleSocialShare}
                className="flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
              <Button
                variant="outline"
                onClick={handleSMSShare}
                className="flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Send SMS
              </Button>
            </div>

            {/* Email Share */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter recipient's email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="message">Personal Message (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Add a personal message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>
              
              <Button
                onClick={handleEmailShare}
                disabled={!email.trim()}
                className="w-full flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Send Email
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}