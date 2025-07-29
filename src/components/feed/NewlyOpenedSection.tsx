import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Plus, ArrowRight, Utensils, Heart } from 'lucide-react';
import { LazyImage } from '@/components/LazyImage';

interface NewRestaurant {
  id: string;
  name: string;
  cuisine: string;
  city: string;
  address: string;
  photos: string[];
  opening_date: string;
  price_range?: number;
  distance?: string;
}

interface NewlyOpenedSectionProps {
  restaurants: NewRestaurant[];
  onRestaurantClick: (id: string) => void;
  onAddToWishlist: (id: string) => void;
  onViewAll: () => void;
}

export function NewlyOpenedSection({ 
  restaurants, 
  onRestaurantClick, 
  onAddToWishlist,
  onViewAll 
}: NewlyOpenedSectionProps) {
  const formatOpeningDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-900/10 dark:to-emerald-900/10 border border-green-200/50 dark:border-green-800/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg text-foreground">
                Just Opened 🍽️
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Fresh new spots to explore
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300">
            <Plus className="h-3 w-3 mr-1" />
            New
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid gap-4">
          {restaurants.slice(0, 2).map((restaurant) => (
            <div
              key={restaurant.id}
              className="flex gap-4 p-4 rounded-xl bg-background/60 border border-border/30 hover:bg-background/80 hover:border-border/60 cursor-pointer transition-all duration-200 group"
              onClick={() => onRestaurantClick(restaurant.id)}
            >
              {/* Restaurant Image */}
              <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                {restaurant.photos?.[0] ? (
                  <LazyImage
                    src={restaurant.photos[0]}
                    alt={restaurant.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-green-200/50 to-emerald-200/50 dark:from-green-800/50 dark:to-emerald-800/50 flex items-center justify-center">
                    <Utensils className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                )}
              </div>

              {/* Restaurant Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-foreground truncate group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                    {restaurant.name}
                  </h4>
                  <Badge variant="outline" className="ml-2 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300">
                    NEW
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground mb-2">
                  {restaurant.cuisine} • {restaurant.city}
                </p>
                
                <div className="flex items-center gap-1 text-muted-foreground mb-2">
                  <MapPin className="h-3 w-3" />
                  <span className="text-xs truncate">{restaurant.address}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <Calendar className="h-3 w-3" />
                      <span className="text-xs font-medium">
                        Opened {formatOpeningDate(restaurant.opening_date)}
                      </span>
                    </div>
                    {restaurant.price_range && (
                      <Badge variant="outline" className="text-xs h-5">
                        {'$'.repeat(restaurant.price_range)}
                      </Badge>
                    )}
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToWishlist(restaurant.id);
                    }}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-green-600 dark:hover:text-green-400 transition-colors"
                  >
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button 
          variant="outline" 
          className="w-full mt-4 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20"
          onClick={onViewAll}
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          See All New Openings
        </Button>
      </CardContent>
    </Card>
  );
}