import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Star, Users } from 'lucide-react';

interface FriendRatingDisplayProps {
  friendRating?: number;
  friendName?: string;
  communityAverageRating?: number;
  totalCommunityReviews?: number;
}

export function FriendRatingDisplay({
  friendRating,
  friendName,
  communityAverageRating,
  totalCommunityReviews
}: FriendRatingDisplayProps) {
  return (
    <div className="flex items-center gap-4">
      {/* Friend's Rating */}
      {friendRating && friendName && (
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center mb-2">
            <div className="text-center">
              <div className="text-lg font-bold text-primary">{friendRating}</div>
              <div className="text-xs text-primary/70">
                <Star className="h-3 w-3 inline" />
              </div>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {friendName}
          </Badge>
        </div>
      )}

      {/* Community Average Rating */}
      {communityAverageRating && totalCommunityReviews && (
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-muted border-2 border-border flex items-center justify-center mb-2">
            <div className="text-center">
              <div className="text-lg font-bold">{communityAverageRating.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">
                <Users className="h-3 w-3 inline" />
              </div>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {totalCommunityReviews} reviews
          </Badge>
        </div>
      )}
    </div>
  );
}