import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Restaurant } from '@/types/restaurant';
import { generateReservationUrl, detectReservationCapability, getReservationPlatform } from '@/utils/reservationUtils';

interface ReservationButtonProps {
  restaurant: Restaurant;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function ReservationButton({ 
  restaurant, 
  variant = "outline", 
  size = "sm",
  className = ""
}: ReservationButtonProps) {
  // Check if restaurant supports reservations
  const supportsReservations = detectReservationCapability(restaurant);
  
  if (!supportsReservations) {
    return null;
  }

  const handleReservation = () => {
    console.log('ReservationButton clicked for restaurant:', restaurant.name);
    console.log('Restaurant data:', restaurant);
    
    const reservationUrl = generateReservationUrl(restaurant);
    console.log('Generated reservation URL:', reservationUrl);
    
    if (reservationUrl) {
      console.log('Opening reservation URL:', reservationUrl);
      window.open(reservationUrl, '_blank', 'noopener,noreferrer');
    } else {
      console.log('No reservation URL could be generated for this restaurant');
    }
  };

  // Get platform name for button text
  const reservationUrl = generateReservationUrl(restaurant);
  const platform = reservationUrl ? getReservationPlatform(reservationUrl) : 'Reserve';
  const buttonText = platform === 'Google Maps' ? 'Reserve Table' : `Reserve on ${platform}`;

  return (
    <Button
      variant={variant}
      size={size}
      className={`${className} ${size === 'sm' ? 'h-7 px-2 text-xs' : ''}`}
      onClick={handleReservation}
    >
      <Calendar className={`${size === 'sm' ? 'mr-1 h-3 w-3' : 'mr-2 h-4 w-4'}`} />
      {size === 'sm' ? 'Reserve' : buttonText}
    </Button>
  );
}