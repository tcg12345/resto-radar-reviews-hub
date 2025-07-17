export interface Restaurant {
  id: string;
  name: string;
  address: string;
  city: string;
  cuisine: string;
  rating?: number;
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
  photos: File[];
  notes?: string;
  dateVisited?: string;
  isWishlist: boolean;
}