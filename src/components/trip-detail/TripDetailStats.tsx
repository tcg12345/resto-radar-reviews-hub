import { Star, MapPin, Calendar, TrendingUp, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PlaceRating } from '@/hooks/useTrips';

interface TripDetailStatsProps {
  ratings: PlaceRating[];
}

export function TripDetailStats({ ratings }: TripDetailStatsProps) {
  const totalPlaces = ratings.length;
  const restaurantCount = ratings.filter(r => r.place_type === 'restaurant').length;
  const attractionCount = ratings.filter(r => r.place_type === 'attraction').length;
  const hotelCount = ratings.filter(r => r.place_type === 'hotel').length;
  
  const avgRating = totalPlaces > 0 
    ? ratings.reduce((acc, r) => acc + (r.overall_rating || 0), 0) / totalPlaces
    : 0;
    
  const ratedPlaces = ratings.filter(r => r.overall_rating && r.overall_rating > 0).length;
  const highRatedPlaces = ratings.filter(r => r.overall_rating && r.overall_rating >= 4).length;

  const stats = [
    {
      label: 'Total Places',
      value: totalPlaces,
      subtext: `${ratedPlaces} rated`,
      icon: MapPin,
      color: 'text-blue-600 bg-blue-50'
    },
    {
      label: 'Avg Rating',
      value: avgRating > 0 ? avgRating.toFixed(1) : '—',
      subtext: `${highRatedPlaces} excellent`,
      icon: Star,
      color: 'text-yellow-600 bg-yellow-50'
    },
    {
      label: 'Restaurants',
      value: restaurantCount,
      subtext: totalPlaces > 0 ? `${Math.round((restaurantCount / totalPlaces) * 100)}%` : '0%',
      icon: Users,
      color: 'text-green-600 bg-green-50'
    },
    {
      label: 'Attractions',
      value: attractionCount,
      subtext: totalPlaces > 0 ? `${Math.round((attractionCount / totalPlaces) * 100)}%` : '0%',
      icon: TrendingUp,
      color: 'text-purple-600 bg-purple-50'
    }
  ];

  if (totalPlaces === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p className="text-sm">Start adding places to see your trip statistics</p>
      </div>
    );
  }

  return (
    <div className="bg-background rounded-lg border border-border/50 p-3">
      <div className="flex items-center justify-between gap-2">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="flex items-center gap-2 min-w-0 flex-1">
              <div className={`p-1 rounded ${stat.color}`}>
                <Icon className="w-3 h-3" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-muted-foreground">{stat.label}</div>
                <div className="text-sm font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.subtext}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}