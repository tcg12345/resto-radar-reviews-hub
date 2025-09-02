export interface FeedItem {
  id: string;
  type: 'friend-review' | 'friend-rating' | 'expert-review' | 'expert-rating';
  user_id: string;
  username?: string;
  name?: string;
  avatar_url?: string;
  restaurant_name: string;
  restaurant_address?: string;
  city?: string;
  country?: string;
  cuisine?: string;
  overall_rating?: number;
  rating?: number;
  price_range?: number;
  michelin_stars?: number;
  review_text?: string;
  notes?: string;
  photos?: string[];
  photo_captions?: string[];
  photo_dish_names?: string[];
  created_at: string;
  date_visited?: string;
  place_id?: string;
  google_place_id?: string;
  website?: string;
  phone_number?: string;
  latitude?: number;
  longitude?: number;
}

export interface FilterChip {
  id: string;
  label: string;
  type: 'cuisine' | 'city' | 'rating' | 'price';
  value: string;
  count: number;
}

export interface ProfilePreview {
  id: string;
  username: string;
  name?: string;
  avatar_url?: string;
  isExpert: boolean;
  recentActivityCount: number;
}