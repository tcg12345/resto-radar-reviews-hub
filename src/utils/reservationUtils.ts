import { Restaurant } from '@/types/restaurant';

/**
 * Generate a reservation URL for a restaurant
 * Uses Google Maps "Reserve a Table" integration or falls back to search
 */
export function generateReservationUrl(restaurant: Restaurant): string | null {
  // If restaurant already has a reservation URL, use it
  if (restaurant.reservationUrl) {
    return restaurant.reservationUrl;
  }

  // If restaurant is marked as reservable, generate Google Maps reservation link
  if (restaurant.reservable) {
    const restaurantQuery = encodeURIComponent(`${restaurant.name} ${restaurant.address}`);
    return `https://www.google.com/maps/search/${restaurantQuery}`;
  }

  // For known reservation platforms, try to generate direct links
  if (restaurant.website) {
    const website = restaurant.website.toLowerCase();
    
    // OpenTable direct booking
    if (website.includes('opentable.com')) {
      return restaurant.website;
    }
    
    // Resy direct booking
    if (website.includes('resy.com')) {
      return restaurant.website;
    }
    
    // Restaurant website might have reservation capability
    if (restaurant.reservable !== false) {
      // Generate Google Maps link with reservation focus
      const restaurantQuery = encodeURIComponent(`${restaurant.name} ${restaurant.address} reservation`);
      return `https://www.google.com/maps/search/${restaurantQuery}`;
    }
  }

  return null;
}

/**
 * Check if a restaurant likely supports reservations based on various indicators
 */
export function detectReservationCapability(restaurant: Restaurant): boolean {
  // Explicit reservation info
  if (restaurant.reservable === true || restaurant.reservationUrl) {
    return true;
  }

  if (restaurant.reservable === false) {
    return false;
  }

  // Check website for reservation platforms
  if (restaurant.website) {
    const website = restaurant.website.toLowerCase();
    if (website.includes('opentable.com') || 
        website.includes('resy.com') || 
        website.includes('booking') ||
        website.includes('reservation')) {
      return true;
    }
  }

  // Check if it's a fine dining restaurant (more likely to take reservations)
  if (restaurant.priceRange && restaurant.priceRange >= 3) {
    return true;
  }

  // Check if it has Michelin stars (definitely takes reservations)
  if (restaurant.michelinStars && restaurant.michelinStars > 0) {
    return true;
  }

  // High-rated restaurants often take reservations
  if (restaurant.rating && restaurant.rating >= 4.5) {
    return true;
  }

  return false;
}

/**
 * Get reservation platform name from URL
 */
export function getReservationPlatform(url: string): string {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('opentable.com')) {
    return 'OpenTable';
  }
  
  if (lowerUrl.includes('resy.com')) {
    return 'Resy';
  }
  
  if (lowerUrl.includes('yelp.com')) {
    return 'Yelp';
  }
  
  if (lowerUrl.includes('google.com/maps')) {
    return 'Google Maps';
  }
  
  return 'Restaurant Website';
}