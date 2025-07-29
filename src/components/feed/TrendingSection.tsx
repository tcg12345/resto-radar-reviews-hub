import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, MapPin, Star, ArrowRight, Flame } from 'lucide-react';
import { LazyImage } from '@/components/LazyImage';

interface TrendingRestaurant {
  id: string;
  name: string;
  cuisine: string;
  city: string;
  rating: number;
  photos: string[];
  trending_score: number;
  price_range?: number;
}

interface TrendingSectionProps {
  location: string;
  restaurants: TrendingRestaurant[];
  onRestaurantClick: (id: string) => void;
  onViewAll: () => void;
}

export function TrendingSection({ 
  location, 
  restaurants, 
  onRestaurantClick, 
  onViewAll 
}: TrendingSectionProps) {
  return (
    <Card className="bg-gradient-to-br from-orange-50/50 to-red-50/50 dark:from-orange-900/10 dark:to-red-900/10 border border-orange-200/50 dark:border-orange-800/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Flame className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg text-foreground">
                Hot in {location} 🔥
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Trending this week
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300">
            <TrendingUp className="h-3 w-3 mr-1" />
            Trending
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {restaurants.slice(0, 3).map((restaurant, index) => (
          <div
            key={restaurant.id}
            className="flex items-center gap-4 p-3 rounded-lg bg-background/60 border border-border/30 hover:bg-background/80 hover:border-border/60 cursor-pointer transition-all duration-200 group"
            onClick={() => onRestaurantClick(restaurant.id)}
          >
            {/* Ranking */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">#{index + 1}</span>
            </div>

            {/* Restaurant Image */}
            <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
              {restaurant.photos?.[0] ? (
                <LazyImage
                  src={restaurant.photos[0]}
                  alt={restaurant.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary/60" />
                </div>
              )}
            </div>

            {/* Restaurant Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {restaurant.name}
              </h4>
              <p className="text-sm text-muted-foreground truncate">
                {restaurant.cuisine} • {restaurant.city}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-medium">{restaurant.rating}</span>
                </div>
                {restaurant.price_range && (
                  <Badge variant="outline" className="text-xs h-5">
                    {'$'.repeat(restaurant.price_range)}
                  </Badge>
                )}
              </div>
            </div>

            {/* Trending Score */}
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Trending</div>
              <div className="text-sm font-bold text-orange-600 dark:text-orange-400">
                +{restaurant.trending_score}%
              </div>
            </div>
          </div>
        ))}

        <Button 
          variant="outline" 
          className="w-full mt-4 border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-900/20"
          onClick={onViewAll}
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          View All Trending in {location}
        </Button>
      </CardContent>
    </Card>
  );
}