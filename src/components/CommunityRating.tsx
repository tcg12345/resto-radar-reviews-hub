import React from 'react';
import { Star, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CommunityStats } from '@/hooks/useRestaurantReviews';
import { CommunityRatingSkeleton } from '@/components/skeletons/CommunityRatingSkeleton';

interface CommunityRatingProps {
  stats: CommunityStats | null;
  isLoading?: boolean;
}

export function CommunityRating({ stats, isLoading }: CommunityRatingProps) {
  // Debug logging
  console.log('CommunityRating - stats:', stats);
  console.log('CommunityRating - isLoading:', isLoading);
  
  if (isLoading) {
    return <CommunityRatingSkeleton />;
  }

  if (!isLoading && (!stats || stats.totalReviews === 0)) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No community reviews yet</p>
            <p className="text-xs">Be the first to share your experience!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600 dark:text-green-400';
    if (rating >= 6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getDistributionWidth = (count: number) => {
    const maxCount = Math.max(...Object.values(stats.ratingDistribution));
    return maxCount > 0 ? (count / maxCount) * 100 : 0;
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Community Rating</h3>
            <Badge variant="outline" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              {stats.totalReviews} review{stats.totalReviews !== 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Average Rating */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className={`text-2xl font-bold ${getRatingColor(stats.averageRating)}`}>
                {stats.averageRating.toFixed(1)}
              </div>
              <div className="flex items-center">
                <Star className="h-4 w-4 fill-current text-yellow-500" />
                <span className="text-xs text-muted-foreground ml-1">
                  out of 10
                </span>
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="flex-1 space-y-1">
              {Object.entries(stats.ratingDistribution)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([range, count]) => (
                <div key={range} className="flex items-center gap-2 text-xs">
                  <span className="w-8 text-muted-foreground">{range}</span>
                  <div className="flex-1 bg-muted rounded-full h-1.5">
                    <div 
                      className="bg-primary rounded-full h-1.5 transition-all duration-300"
                      style={{ width: `${getDistributionWidth(count)}%` }}
                    />
                  </div>
                  <span className="w-4 text-muted-foreground text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span>
              Based on {stats.totalReviews} user review{stats.totalReviews !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}