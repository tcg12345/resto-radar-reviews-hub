export interface CategoryRating {
  food: number;
  service: number;
  atmosphere: number;
}

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  city: string;
  country?: string;
  cuisine: string;
  rating?: number;
  reviewCount?: number;
  googleMapsUrl?: string;
  website?: string;
  phone_number?: string;
  openingHours?: string;
  reservable?: boolean;
  reservationUrl?: string;
  categoryRatings?: CategoryRating;
  useWeightedRating?: boolean;
  priceRange?: number; // 1-4 dollar signs
  michelinStars?: number; // 1-3 Michelin stars
  photos: string[];
  photoCaptions?: string[];
  notes?: string;
  dateVisited?: string;
  latitude?: number;
  longitude?: number;
  isWishlist: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface RestaurantFormData {
  name: string;
  address: string;
  city: string;
  country?: string;
  cuisine: string;
  rating?: number;
  categoryRatings?: CategoryRating;
  useWeightedRating?: boolean;
  priceRange?: number; // 1-4 dollar signs
  michelinStars?: number; // 1-3 Michelin stars
  photos: File[];
  photoCaptions?: string[];
  notes?: string;
  dateVisited?: string;
  isWishlist: boolean;
  removedPhotoIndexes?: number[];
  phone_number?: string;
}