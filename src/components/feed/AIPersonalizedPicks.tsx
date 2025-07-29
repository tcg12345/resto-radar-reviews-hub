import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Star, MapPin, ArrowRight, Bot, Utensils } from 'lucide-react';
import { LazyImage } from '@/components/LazyImage';

interface PersonalizedRestaurant {
  id: string;
  name: string;
  cuisine: string;
  city: string;
  rating: number;
  photos: string[];
  match_score: number;
  reason: string;
  price_range?: number;
  distance?: string;
}

interface AIPersonalizedPicksProps {
  restaurants: PersonalizedRestaurant[];
  onRestaurantClick: (id: string) => void;
  onViewAll: () => void;
}

export function AIPersonalizedPicks({ 
  restaurants, 
  onRestaurantClick, 
  onViewAll 
}: AIPersonalizedPicksProps) {
  return (
    <Card className="bg-gradient-to-br from-purple-50/50 to-indigo-50/50 dark:from-purple-900/10 dark:to-indigo-900/10 border border-purple-200/50 dark:border-purple-800/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg text-foreground">
                Places You Might Love 🍣
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                AI-curated just for you
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300">
            <Bot className="h-3 w-3 mr-1" />
            AI Picks
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {restaurants.slice(0, 3).map((restaurant) => (
          <div
            key={restaurant.id}
            className="flex gap-4 p-4 rounded-xl bg-background/60 border border-border/30 hover:bg-background/80 hover:border-border/60 cursor-pointer transition-all duration-200 group"
            onClick={() => onRestaurantClick(restaurant.id)}
          >
            {/* Restaurant Image */}
            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
              {restaurant.photos?.[0] ? (
                <LazyImage
                  src={restaurant.photos[0]}
                  alt={restaurant.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-200/50 to-indigo-200/50 dark:from-purple-800/50 dark:to-indigo-800/50 flex items-center justify-center">
                  <Utensils className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              )}
            </div>

            {/* Restaurant Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-foreground truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  {restaurant.name}
                </h4>
                <div className="ml-2 px-2 py-1 bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40 rounded-full">
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                    {restaurant.match_score}% match
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground mb-2">
                {restaurant.cuisine} • {restaurant.city}
              </p>
              
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-medium">{restaurant.rating}</span>
                </div>
                {restaurant.price_range && (
                  <Badge variant="outline" className="text-xs h-5">
                    {'$'.repeat(restaurant.price_range)}
                  </Badge>
                )}
                {restaurant.distance && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="text-xs">{restaurant.distance}</span>
                  </div>
                )}
              </div>

              {/* AI Reason */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-2 border border-purple-200/50 dark:border-purple-800/50">
                <div className="flex items-center gap-1 mb-1">
                  <Bot className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Why you might like this</span>
                </div>
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  {restaurant.reason}
                </p>
              </div>
            </div>
          </div>
        ))}

        <Button 
          className="w-full mt-4 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white"
          onClick={onViewAll}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Discover More AI Recommendations
        </Button>
      </CardContent>
    </Card>
  );
}