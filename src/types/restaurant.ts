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
  cuisine: string;
  rating?: number; // Calculated weighted average
  categoryRatings?: CategoryRating;
  photos: string[];
  notes?: string;
  dateVisited?: string;
  latitude?: number;
  longitude?: number;
  isWishlist: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantFormData {
  name: string;
  address: string;
  city: string;
  cuisine: string;
  rating?: number;
  categoryRatings?: CategoryRating;
  photos: File[];
  notes?: string;
  dateVisited?: string;
  isWishlist: boolean;
}