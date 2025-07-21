import { Restaurant } from '@/types/restaurant';

/**
 * Generate a reservation URL for a restaurant
 * Uses Google Maps "Reserve a Table" integration or falls back to search
 */
export function generateReservationUrl(restaurant: Restaurant): string | null {
  console.log('Generating reservation URL for:', restaurant.name);
  console.log('Restaurant reservable:', restaurant.reservable);
  console.log('Restaurant reservationUrl:', restaurant.reservationUrl);
  console.log('Restaurant website:', restaurant.website);
  
  // If restaurant already has a reservation URL, use it (this is the direct booking link from AI)
  if (restaurant.reservationUrl) {
    console.log('Using direct reservation URL from AI:', restaurant.reservationUrl);
    return restaurant.reservationUrl;
  }

  // For known reservation platforms, try to use the website if it's a direct booking link
  if (restaurant.website) {
    const website = restaurant.website.toLowerCase();
    
    // Check if the website itself is a direct booking link from reservation platforms
    if (website.includes('opentable.com/r/') || 
        website.includes('resy.com/cities/') || 
        website.includes('exploretock.com/') ||
        website.includes('sevenrooms.com/reservations/')) {
      console.log('Using website as direct reservation link:', restaurant.website);
      return restaurant.website;
    }
    
    // OpenTable direct booking (if homepage, don't use it)
    if (website.includes('opentable.com') && !website.endsWith('opentable.com/') && !website.endsWith('opentable.com')) {
      return restaurant.website;
    }
    
    // Resy direct booking (if homepage, don't use it)  
    if (website.includes('resy.com') && !website.endsWith('resy.com/') && !website.endsWith('resy.com')) {
      return restaurant.website;
    }
  }

  // If restaurant is marked as reservable but no direct link, generate Google Maps search
  if (restaurant.reservable === true) {
    const restaurantQuery = encodeURIComponent(`${restaurant.name} ${restaurant.address} reservations`);
    console.log('Falling back to Google Maps for reservations:', restaurantQuery);
    return `https://www.google.com/maps/search/${restaurantQuery}`;
  }

  // For restaurants that might support reservations (based on detection logic), generate Google Maps search
  if (detectReservationCapability(restaurant)) {
    const restaurantQuery = encodeURIComponent(`${restaurant.name} ${restaurant.address} reservation`);
    console.log('Using detection logic for reservation search:', restaurantQuery);
    return `https://www.google.com/maps/search/${restaurantQuery}`;
  }

  console.log('No reservation option found for restaurant:', restaurant.name);

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