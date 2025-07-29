import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, Star, MapPin, Heart, Share2, ArrowRight } from 'lucide-react';
import { LazyImage } from '@/components/LazyImage';

interface RestaurantOfTheDayProps {
  restaurant: {
    id: string;
    name: string;
    cuisine: string;
    city: string;
    address: string;
    rating: number;
    photos: string[];
    description: string;
    price_range?: number;
    michelin_stars?: number;
    featured_reason: string;
  };
  onRestaurantClick: (id: string) => void;
  onAddToWishlist: (id: string) => void;
  onShare: (id: string) => void;
}

export function RestaurantOfTheDay({ 
  restaurant, 
  onRestaurantClick, 
  onAddToWishlist,
  onShare 
}: RestaurantOfTheDayProps) {
  return (
    <Card className="bg-gradient-to-br from-amber-50/80 to-yellow-50/80 dark:from-amber-900/20 dark:to-yellow-900/20 border-2 border-amber-200/50 dark:border-amber-800/50 shadow-lg">
      <CardContent className="p-0">
        {/* Header Badge */}
        <div className="flex items-center justify-center p-4 bg-gradient-to-r from-amber-500 to-yellow-500">
          <div className="flex items-center gap-2 text-white">
            <Award className="h-5 w-5" />
            <span className="font-bold text-lg">Restaurant of the Day</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {/* Image */}
          <div className="relative mb-6">
            <div 
              className="w-full h-64 rounded-xl overflow-hidden bg-gradient-to-br from-amber-200/50 to-yellow-200/50 dark:from-amber-800/50 dark:to-yellow-800/50 cursor-pointer"
              onClick={() => onRestaurantClick(restaurant.id)}
            >
              {restaurant.photos?.[0] ? (
                <LazyImage
                  src={restaurant.photos[0]}
                  alt={restaurant.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Award className="h-16 w-16 text-amber-600/50 dark:text-amber-400/50" />
                </div>
              )}
            </div>
            
            {/* Floating badges */}
            <div className="absolute top-4 left-4 flex gap-2">
              {restaurant.michelin_stars && (
                <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">
                  {restaurant.michelin_stars}⭐ Michelin
                </Badge>
              )}
              {restaurant.price_range && (
                <Badge variant="secondary" className="bg-white/90 text-amber-700">
                  {'$'.repeat(restaurant.price_range)}
                </Badge>
              )}
            </div>
          </div>

          {/* Restaurant Info */}
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {restaurant.name}
              </h2>
              <p className="text-lg text-muted-foreground">
                {restaurant.cuisine} • {restaurant.city}
              </p>
            </div>

            {/* Rating and Location */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 rounded-full">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-bold text-yellow-700 dark:text-yellow-300">
                  {restaurant.rating}
                </span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">{restaurant.address}</span>
              </div>
            </div>

            {/* Description */}
            <div className="bg-gradient-to-br from-white/60 to-amber-50/60 dark:from-white/5 dark:to-amber-900/10 rounded-lg p-4 border border-amber-200/30 dark:border-amber-800/30">
              <p className="text-foreground leading-relaxed">
                {restaurant.description}
              </p>
            </div>

            {/* Featured Reason */}
            <div className="bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-1">
                <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="font-semibold text-amber-700 dark:text-amber-300 text-sm">
                  Why it's featured today
                </span>
              </div>
              <p className="text-amber-600 dark:text-amber-400 text-sm">
                {restaurant.featured_reason}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button 
                className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white"
                onClick={() => onRestaurantClick(restaurant.id)}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                View Details
              </Button>
              <Button 
                variant="outline"
                onClick={() => onAddToWishlist(restaurant.id)}
                className="border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              >
                <Heart className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline"
                onClick={() => onShare(restaurant.id)}
                className="border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}